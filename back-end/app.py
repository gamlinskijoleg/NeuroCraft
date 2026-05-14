"""
FastAPI server for image processing with crack detection and sign classification models.
"""

import numpy as np
import cv2
import torch
import torch.nn as nn
import uuid

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
import io
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print(f"Using device: {'cuda' if torch.cuda.is_available() else 'cpu'}")
# Select GPU when available, otherwise fall back to CPU.
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize FastAPI app
app = FastAPI(
    title="EasyRoad API",
    description="API for crack detection and traffic sign classification",
    version="1.0.0",
    redirect_slashes=False,
)

# Paths
MODELS_DIR = Path("./models")
MODELS_DIR.mkdir(exist_ok=True)

# Path for debugging crops
DEBUG_DIR = Path("./debug_crops")
DEBUG_DIR.mkdir(exist_ok=True)

# Model classes
CRACK_CLASSES = [
    "Поздовжня тріщина",
    "Поперечна тріщина",
    "Сітчаста тріщина",
    "Яма",
    "Ремонт",
    "D44",
    "Інше",
    "Люк",
]

GTSRB_CLASSES = {
    0: "Обмеження швидкості (20км/год)",
    1: "Обмеження швидкості (30км/год)",
    2: "Обмеження швидкості (50км/год)",
    3: "Обмеження швидкості (60км/год)",
    4: "Обмеження швидкості (70км/год)",
    5: "Обмеження швидкості (80км/год)",
    6: "Кінець обмеження швидкості (80км/год)",
    7: "Обмеження швидкості (100км/год)",
    8: "Обмеження швидкості (120км/год)",
    9: "Обгін заборонено",
    10: "Обгін заборонено для транспорту понад 3.5 тонн",
    11: "Перехрестя з другорядною дорогою",
    12: "Головна дорога",
    13: "Поступіться дорогою",
    14: "Стоп",
    15: "Рух заборонено",
    16: "Рух транспорту понад 3.5 тонн заборонено",
    17: "В'їзд заборонено",
    18: "Увага",
    19: "Небезпечний поворот ліворуч",
    20: "Небезпечний поворот праворуч",
    21: "Подвійний поворот",
    22: "Нерівна дорога",
    23: "Слизька дорога",
    24: "Звуження дороги праворуч",
    25: "Дорожні роботи",
    26: "Світлофор",
    27: "Пішохідний перехід",
    28: "Діти",
    29: "Велосипедисти",
    30: "Обережно, ожеледиця",
    31: "Дикі тварини",
    32: "Кінець всіх обмежень",
    33: "Поворот праворуч",
    34: "Поворот ліворуч",
    35: "Рух прямо",
    36: "Рух прямо або праворуч",
    37: "Рух прямо або ліворуч",
    38: "Об'їзд праворуч",
    39: "Об'їзд ліворуч",
    40: "Круговий рух",
    41: "Кінець заборони обгону",
    42: "Кінець заборони обгону для транспорту понад 3.5 тонн",
}


class SignsCNN(nn.Module):
    def __init__(self, num_classes=43):
        super().__init__()

        self.features = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 4 * 4, 256),
            nn.ReLU(),
            nn.Linear(256, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        return self.classifier(x)


# Response models
class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: Optional[dict] = None  # {x1, y1, x2, y2}


class ProcessingResult(BaseModel):
    success: bool
    message: str
    detections: list[Detection] = []
    model_used: str
    processing_time: float


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict


# Global model variables
models_status = {
    "cracks_detector": False,
    "sign_detector": False,  # ДОДАНО
    "signs_classifier": False,
}

crack_detector = None
sign_detector = None  # ДОДАНО
signs_classifier = None


def load_models():
    """Load all models on startup"""
    global crack_detector, signs_classifier, sign_detector

    import sys

    logger.info(f"PYTHON EXEC: {sys.executable}")
    logger.info(f"Using device: {DEVICE}")

    try:
        # Load crack detector (YOLOv8 via ultralytics preferred)
        cracks_path = MODELS_DIR / "cracks.pt"
        if cracks_path.exists():
            try:
                if YOLO is None:
                    raise ImportError("ultralytics is not installed")
                crack_detector = YOLO(str(cracks_path))
                models_status["cracks_detector"] = True
                logger.info("✓ Cracks detector loaded via ultralytics.YOLO")
            except Exception as e:
                logger.warning(
                    f"Could not load cracks detector with ultralytics.YOLO: {e}"
                )
                models_status["cracks_detector"] = False
        else:
            models_status["cracks_detector"] = False
            logger.warning(
                "ultralytics is not installed; cannot load cracks detector. Install via 'pip install ultralytics'."
            )

        # --- ДОДАНО: Завантаження YOLO детектора для знаків (Етап 1) ---
        try:
            if YOLO is None:
                raise ImportError("ultralytics is not installed")
            # Для тесту використовуємо базову модель.
            # Пізніше заміниш на MODELS_DIR / "yolov8_signs.pt"
            sign_detector = YOLO("yolov8n.pt")
            models_status["sign_detector"] = True
            logger.info("✓ Sign detector (YOLO) loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load sign detector: {e}")
            models_status["sign_detector"] = False
        # ---------------------------------------------------------------

        # Load signs classifier (PyTorch)
        signs_path = MODELS_DIR / "signs_classificator.pth"

        if signs_path.exists():
            try:
                model = SignsCNN()
                state_dict = torch.load(signs_path, map_location="cpu")
                model.load_state_dict(state_dict)
                model.to(DEVICE)
                model.eval()

                signs_classifier = model
                models_status["signs_classifier"] = True

                logger.info("✓ Signs classifier loaded successfully")

            except Exception as e:
                logger.warning(f"Could not load signs classifier: {e}")
                models_status["signs_classifier"] = False

        logger.info(f"Models status: {models_status}")

    except Exception as e:
        logger.error(f"Error loading models: {e}")


async def process_image_to_array(
    file: UploadFile, max_dimension: int = 1024
) -> np.ndarray:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))

    # Resize efficiently using PIL before doing any matrix math
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

    # Now convert the much smaller image to a numpy array
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    return image_cv


def detect_cracks(image: np.ndarray) -> tuple[list[Detection], float]:
    """Detect cracks using YOLOv8 model"""
    if not models_status["cracks_detector"] or crack_detector is None:
        raise HTTPException(status_code=503, detail="Детектор тріщин не завантажено")

    try:
        results = crack_detector.predict(source=image, device=DEVICE, verbose=True)
        detections = []

        # Create debug image with all detections
        debug_image = image.copy()

        for result in results:
            boxes = result.boxes
            logger.info(f"YOLO crack detector found {len(boxes)} objects")
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = box.conf[0].item()
                class_id = int(box.cls[0].item())
                class_name = (
                    CRACK_CLASSES[class_id]
                    if class_id < len(CRACK_CLASSES)
                    else f"Class {class_id}"
                )

                logger.info(
                    f"Detection: {class_name} with confidence {confidence:.3f} at bbox [{x1:.1f}, {y1:.1f}, {x2:.1f}, {y2:.1f}]"
                )

                detections.append(
                    Detection(
                        class_name=class_name,
                        confidence=confidence,
                        bbox={"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    )
                )

                # Draw bounding box on debug image
                cv2.rectangle(
                    debug_image, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2
                )
                # Draw label with class name and confidence
                label = f"{class_name}: {confidence:.2f}"
                cv2.putText(
                    debug_image,
                    label,
                    (int(x1), int(y1) - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (0, 255, 0),
                    2,
                )

        # Save debug image if there are detections
        if detections:
            debug_path = DEBUG_DIR / f"cracks_debug_{uuid.uuid4().hex}.jpg"
            cv2.imwrite(str(debug_path), debug_image)
            logger.info(
                f"Saved debug image with {len(detections)} detections to {debug_path}"
            )
        else:
            logger.info("No crack detections found in this image")

        return detections, 0.0

    except Exception as e:
        logger.error(f"Error in crack detection: {e}")
        raise HTTPException(
            status_code=500, detail=f"Помилка при виявленні тріщин: {str(e)}"
        )


def classify_signs(image: np.ndarray) -> tuple[list[Detection], float]:
    if not models_status["signs_classifier"] or signs_classifier is None:
        raise HTTPException(
            status_code=503, detail="Класифікатор знаків не завантажено"
        )
    if not models_status["sign_detector"] or sign_detector is None:
        raise HTTPException(status_code=503, detail="Детектор знаків не завантажено")

    CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.5

    try:
        detections = []

        # Create debug image with all detections
        debug_image = image.copy()

        # Вмикаємо verbose=True, щоб у консолі бекенду було видно лог YOLO
        yolo_results = sign_detector.predict(source=image, device=DEVICE, verbose=True)

        for result in yolo_results:
            logger.info(f"YOLO found {len(result.boxes)} objects!")

            for box in result.boxes:
                class_id_yolo = int(box.cls[0].item())
                if class_id_yolo != 11:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

                margin = 10
                h, w = image.shape[:2]
                crop_y1, crop_y2 = max(0, y1 - margin), min(h, y2 + margin)
                crop_x1, crop_x2 = max(0, x1 - margin), min(w, x2 + margin)

                sign_crop = image[crop_y1:crop_y2, crop_x1:crop_x2]

                if (
                    sign_crop.size == 0
                    or sign_crop.shape[0] < 10
                    or sign_crop.shape[1] < 10
                ):
                    continue

                # CNN Класифікація
                image_resized = cv2.resize(sign_crop, (32, 32))
                image_rgb = cv2.cvtColor(image_resized, cv2.COLOR_BGR2RGB)

                debug_path = DEBUG_DIR / f"sign_crop_{uuid.uuid4().hex}.png"
                Image.fromarray(image_rgb).save(debug_path)
                logger.info(f"Saved sign classifier input to {debug_path}")

                image_tensor = (
                    torch.from_numpy(image_rgb).float().permute(2, 0, 1).unsqueeze(0)
                    / 255.0
                )
                image_tensor = (image_tensor - 0.5) / 0.5
                image_tensor = image_tensor.to(DEVICE)

                with torch.no_grad():
                    output = signs_classifier(image_tensor)

                probabilities = torch.softmax(output, dim=1)[0]
                confidence, class_id = torch.max(probabilities, dim=0)
                class_id_int = int(class_id.item())
                confidence_value = confidence.item()

                if confidence_value >= CLASSIFICATION_CONFIDENCE_THRESHOLD:
                    class_name = GTSRB_CLASSES.get(
                        class_id_int, f"Невідомий клас {class_id_int}"
                    )
                else:
                    class_name = "Невідомий знак"

                detections.append(
                    Detection(
                        class_name=class_name,
                        confidence=confidence_value,
                        bbox={"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    )
                )

                # Draw bounding box on debug image
                cv2.rectangle(debug_image, (x1, y1), (x2, y2), (255, 0, 0), 2)
                # Draw label with class name and confidence
                label = f"{class_name}: {confidence_value:.2f}"
                cv2.putText(
                    debug_image,
                    label,
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 0, 0),
                    2,
                )

        # Save debug image if there are detections
        if detections:
            debug_path = DEBUG_DIR / f"signs_debug_{uuid.uuid4().hex}.jpg"
            cv2.imwrite(str(debug_path), debug_image)
            logger.info(
                f"Saved debug image with {len(detections)} detections to {debug_path}"
            )

        return detections, 0.0

    except Exception as e:
        logger.error(f"Error in sign classification: {e}")
        raise HTTPException(
            status_code=500, detail=f"Помилка при класифікації знаків: {str(e)}"
        )


# Routes


@app.on_event("startup")
async def startup_event():
    """Load models on startup"""
    logger.info("Starting up... Loading models...")
    load_models()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(status="healthy", models_loaded=models_status)


@app.post("/detect/cracks", response_model=ProcessingResult)
async def detect_cracks_endpoint(file: UploadFile = File(...)):
    """
    Detect cracks in road image

    Upload an image and get crack detection results with coordinates
    """
    try:
        image = await process_image_to_array(file)
        detections, proc_time = detect_cracks(image)

        return ProcessingResult(
            success=True,
            message=f"Знайдено {len(detections)} тріщин",
            detections=detections,
            model_used="YOLOv8 Crack Detector",
            processing_time=proc_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(
            status_code=500, detail=f"Помилка обробки зображення: {str(e)}"
        )


@app.post("/classify/signs", response_model=ProcessingResult)
async def classify_signs_endpoint(file: UploadFile = File(...)):
    """
    Classify traffic signs in image

    Upload an image and get traffic sign classification results
    """
    try:
        image = await process_image_to_array(file)
        detections, proc_time = classify_signs(image)

        return ProcessingResult(
            success=True,
            message=f"Знайдено та класифіковано {len(detections)} знаків",
            detections=detections,
            model_used="GTSRB Signs Classifier",
            processing_time=proc_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(
            status_code=500, detail=f"Помилка обробки зображення: {str(e)}"
        )


@app.post("/process/all", response_model=dict)
async def process_all_models(file: UploadFile = File(...)):
    """
    Run all models on the image

    Upload an image and get results from all available models
    """
    try:
        image = await process_image_to_array(file)
        results = {}

        # Crack detection
        try:
            cracks, _ = detect_cracks(image)
            results["cracks"] = {
                "success": True,
                "detections": cracks,
                "model": "YOLOv8 Crack Detector",
            }
        except Exception as e:
            results["cracks"] = {"success": False, "error": str(e)}

        # Signs classification
        try:
            signs, _ = classify_signs(image)
            results["signs"] = {
                "success": True,
                "detections": signs,
                "model": "GTSRB Signs Classifier",
            }
        except HTTPException as e:
            results["signs"] = {"success": False, "error": e.detail}
        except Exception as e:
            results["signs"] = {"success": False, "error": str(e) or repr(e)}

        return {"success": True, "message": "Обробка завершена", "results": results}

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(
            status_code=500, detail=f"Помилка обробки зображення: {str(e)}"
        )


@app.get("/")
async def root():
    """Root endpoint with API documentation link"""
    return {
        "message": "EasyRoad API - Crack Detection & Traffic Sign Classification",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "detect_cracks": "/detect/cracks",
            "classify_signs": "/classify/signs",
            "process_all": "/process/all",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
