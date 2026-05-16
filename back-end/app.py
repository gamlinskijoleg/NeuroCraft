import sys
import io
import uuid
import logging
from pathlib import Path
from typing import Optional

import numpy as np
import cv2
import torch
import torch.nn as nn
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from torchvision import models, transforms

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

# Налаштування логування
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

print(f"Using device: {'cuda' if torch.cuda.is_available() else 'cpu'}")
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Ініціалізація FastAPI
app = FastAPI(
    title="EasyRoad API",
    description="API for crack detection and traffic sign classification",
    version="1.0.0",
    redirect_slashes=False,
)

# Папки
MODELS_DIR = Path("./models")
MODELS_DIR.mkdir(exist_ok=True)

DEBUG_DIR = Path("./debug_crops")
DEBUG_DIR.mkdir(exist_ok=True)

# Класи
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

# Валідаційні трансформації для класифікатора (копіюємо логіку тренування без аугментацій)
sign_transforms = transforms.Compose(
    [
        transforms.Resize((128, 128)),  # Змінено на 128 згідно з тренуванням
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)

# Словник назв класів буде завантажено динамічно з файлу моделі,
# але залишаємо цей як резервний (запобіжник)
GTSRB_CLASSES_BACKUP = {i: f"Клас {i}" for i in range(200)}
dynamic_labels = None


# Моделі Pydantic
class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: Optional[dict] = None


class ProcessingResult(BaseModel):
    success: bool
    message: str
    detections: list[Detection] = []
    model_used: str
    processing_time: float


class HealthResponse(BaseModel):
    status: str
    models_loaded: dict


class RoadMarker(BaseModel):
    id: str
    latitude: float
    longitude: float
    title: str
    description: str
    severity: int = 1


models_status = {
    "cracks_detector": False,
    "sign_detector": False,
    "signs_classifier": False,
}

crack_detector = None
sign_detector = None
signs_classifier = None


def load_models():
    """Завантаження моделей при старті сервера"""
    global crack_detector, signs_classifier, sign_detector, dynamic_labels

    logger.info(f"PYTHON EXEC: {sys.executable}")
    logger.info(f"Using device: {DEVICE}")

    # 1. Завантаження детектора тріщин (YOLO11)
    cracks_path = MODELS_DIR / "cracks.pt"
    if cracks_path.exists():
        try:
            if YOLO is None:
                raise ImportError("ultralytics не встановлено")
            crack_detector = YOLO(str(cracks_path))
            models_status["cracks_detector"] = True
            logger.info("✓ Cracks detector (YOLO11) loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load cracks detector: {e}")
            logger.warning(
                "УВАГА: Оновіть ultralytics до >= 8.3.50 у вашому requirements.txt"
            )
            models_status["cracks_detector"] = False
    else:
        logger.warning(f"Файл cracks.pt відсутній у {cracks_path}")
        models_status["cracks_detector"] = False

    # 2. Завантаження детектора знаків (Базова YOLO для пошуку об'єктів)
    try:
        if YOLO is None:
            raise ImportError("ultralytics не встановлено")
        sign_detector = YOLO(MODELS_DIR / "yolov8n.pt")
        models_status["sign_detector"] = True
        logger.info("✓ Sign detector (YOLO) loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load sign detector: {e}")
        models_status["sign_detector"] = False

    # 3. Завантаження класифікатора знаків (ResNet50 з вашого навчання)
    signs_path = MODELS_DIR / "signs_classificator.pth"  # або "mtsd_perfect_model.pth"
    if signs_path.exists():
        try:
            # Завантажуємо файл збереження
            checkpoint = torch.load(signs_path, map_location="cpu", weights_only=False)

            if isinstance(checkpoint, dict) and "model_state" in checkpoint:
                state_dict = checkpoint["model_state"]
                dynamic_labels = checkpoint.get("labels", None)
                logger.info(
                    f"✓ Знайдено метадані моделі. Кількість класів: {len(dynamic_labels) if dynamic_labels else 'невідомо'}"
                )
            else:
                state_dict = checkpoint
                logger.warning(
                    "Попередження: у файлі .pth немає словника метаданих, завантажено чистий state_dict"
                )

            # Динамічно визначаємо кількість вихідних класів
            # Останній шар ResNet50 називається fc.bias, беремо його розмірність
            num_classes = (
                state_dict["fc.1.bias"].shape[0]
                if "fc.1.bias" in state_dict
                else state_dict["fc.bias"].shape[0]
            )

            # Будуємо ТОЧНО таку ж архітектуру, як у скрипті навчання:
            # ResNet50 -> Dropout(0.3) -> Linear(num_ftrs, len_classes)
            model = models.resnet50(weights=None)
            num_ftrs = model.fc.in_features
            model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(num_ftrs, num_classes))

            # Завантажуємо ваги у правильну архітектуру
            model.load_state_dict(state_dict)
            model.to(DEVICE)
            model.eval()

            signs_classifier = model
            models_status["signs_classifier"] = True
            logger.info("✓ Signs classifier (ResNet50) loaded successfully!")
        except Exception as e:
            logger.warning(f"Could not load signs classifier: {e}")
            models_status["signs_classifier"] = False
    else:
        logger.warning(f"Файл класифікатора відсутній у {signs_path}")
        models_status["signs_classifier"] = False

    logger.info(f"Статус моделей: {models_status}")


async def process_image_to_array(
    file: UploadFile, max_dimension: int = 1024
) -> np.ndarray:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    return image_cv


def detect_cracks(image: np.ndarray) -> tuple[list[Detection], float]:
    if not models_status["cracks_detector"] or crack_detector is None:
        raise HTTPException(
            status_code=503,
            detail="Детектор тріщин не ініціалізовано. Перевірте логі версій пакета ultralytics.",
        )

    try:
        results = crack_detector.predict(source=image, device=DEVICE, verbose=True)
        detections = []
        debug_image = image.copy()

        for result in results:
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = box.conf[0].item()
                class_id = int(box.cls[0].item())
                class_name = (
                    CRACK_CLASSES[class_id]
                    if class_id < len(CRACK_CLASSES)
                    else f"Клас {class_id}"
                )

                detections.append(
                    Detection(
                        class_name=class_name,
                        confidence=confidence,
                        bbox={"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    )
                )
                cv2.rectangle(
                    debug_image, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2
                )

        if detections:
            cv2.imwrite(str(DEBUG_DIR / f"cracks_{uuid.uuid4().hex}.jpg"), debug_image)
        return detections, 0.0
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Помилка детекції тріщин: {str(e)}"
        )


def classify_signs(image: np.ndarray) -> tuple[list[Detection], float]:
    if not models_status["signs_classifier"] or signs_classifier is None:
        raise HTTPException(
            status_code=503, detail="Класифікатор знаків (ResNet50) не завантажено."
        )
    if not models_status["sign_detector"] or sign_detector is None:
        raise HTTPException(
            status_code=503, detail="Детектор об'єктів знаків не завантажено."
        )

    CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.4

    try:
        detections = []
        debug_image = image.copy()
        yolo_results = sign_detector.predict(source=image, device=DEVICE, verbose=True)

        for result in yolo_results:
            for box in result.boxes:
                class_id_yolo = int(box.cls[0].item())

                # УВАГА: Якщо використовуєте кастомну модель детекції знаків, змініть цей ID!
                # Для стандартної моделі yolov8n.pt ID знаків у COCO датасеті зазвичай немає,
                # переконайтесь що ви детектуєте саме потрібний об'єкт.
                if class_id_yolo != 11:
                    continue

                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                margin = 15
                h, w = image.shape[:2]
                crop_y1, crop_y2 = max(0, y1 - margin), min(h, y2 + margin)
                crop_x1, crop_x2 = max(0, x1 - margin), min(w, x2 + margin)

                sign_crop = image[crop_y1:crop_y2, crop_x1:crop_x2]
                if (
                    sign_crop.size == 0
                    or sign_crop.shape[0] < 15
                    or sign_crop.shape[1] < 15
                ):
                    continue

                # Трансформація кропу під формат ResNet50 (128x128 + Нормалізація ImageNet)
                crop_rgb = cv2.cvtColor(sign_crop, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(crop_rgb)
                image_tensor = sign_transforms(pil_img).unsqueeze(0).to(DEVICE)

                with torch.no_grad():
                    output = signs_classifier(image_tensor)

                probabilities = torch.softmax(output, dim=1)[0]
                confidence, class_id = torch.max(probabilities, dim=0)
                class_id_int = int(class_id.item())
                confidence_value = confidence.item()

                if confidence_value >= CLASSIFICATION_CONFIDENCE_THRESHOLD:
                    if dynamic_labels and class_id_int < len(dynamic_labels):
                        class_name = str(dynamic_labels[class_id_int])
                    else:
                        class_name = GTSRB_CLASSES_BACKUP.get(
                            class_id_int, f"Клас {class_id_int}"
                        )
                else:
                    class_name = "Нерозпізнаний знак"

                detections.append(
                    Detection(
                        class_name=class_name,
                        confidence=confidence_value,
                        bbox={"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    )
                )

                cv2.rectangle(debug_image, (x1, y1), (x2, y2), (255, 0, 0), 2)
                cv2.putText(
                    debug_image,
                    f"{class_name}: {confidence_value:.2f}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 0, 0),
                    2,
                )

        if detections:
            cv2.imwrite(str(DEBUG_DIR / f"signs_{uuid.uuid4().hex}.jpg"), debug_image)

        return detections, 0.0
    except Exception as e:
        logger.error(f"Помилка класифікації знаків: {e}")
        raise HTTPException(
            status_code=500, detail=f"Внутрішня помилка класифікатора: {str(e)}"
        )


@app.on_event("startup")
async def startup_event():
    load_models()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", models_loaded=models_status)


@app.post("/detect/cracks", response_model=ProcessingResult)
async def detect_cracks_endpoint(file: UploadFile = File(...)):
    image = await process_image_to_array(file)
    detections, proc_time = detect_cracks(image)
    return ProcessingResult(
        success=True,
        message=f"Оброблено",
        detections=detections,
        model_used="YOLO11 Crack Detector",
        processing_time=proc_time,
    )


@app.post("/classify/signs", response_model=ProcessingResult)
async def classify_signs_endpoint(file: UploadFile = File(...)):
    image = await process_image_to_array(file)
    detections, proc_time = classify_signs(image)
    return ProcessingResult(
        success=True,
        message=f"Оброблено",
        detections=detections,
        model_used="MTSD ResNet50 Classifier",
        processing_time=proc_time,
    )


@app.post("/process/all", response_model=dict)
async def process_all_models(file: UploadFile = File(...)):
    image = await process_image_to_array(file)
    results = {}
    try:
        cracks, _ = detect_cracks(image)
        results["cracks"] = {"success": True, "detections": cracks}
    except Exception as e:
        results["cracks"] = {"success": False, "error": str(e)}

    try:
        signs, _ = classify_signs(image)
        results["signs"] = {"success": True, "detections": signs}
    except Exception as e:
        results["signs"] = {"success": False, "error": str(e)}

    return {"success": True, "results": results}


@app.get("/")
async def root():
    return {"message": "EasyRoad API Active", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
