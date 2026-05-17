import sys
import gc
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import numpy as np
import cv2
import torch
import torch.nn as nn
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel
from torchvision import models, transforms

from auth_schemas import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from config import ACCESS_TOKEN_EXPIRE_MINUTES, JWT_SECRET_KEY, MODELS_DIR, ENVIRONMENT
from database import close_mongo_connection, connect_to_mongo, get_users_collection
from debug_utils import save_debug_image
from image_utils import process_image_to_array
from security import create_access_token, decode_access_token, hash_password, verify_password
from translation import mtsd_ukrainian_signs

try:
    from ultralytics import YOLO
except Exception:
    YOLO = None

# Налаштування логування
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {DEVICE}")
torch.set_grad_enabled(False)

# Ініціалізація FastAPI
app = FastAPI(
    title="EasyRoad API",
    description="API for crack detection and traffic sign classification",
    version="1.0.0",
    redirect_slashes=False,
)

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


def _fuse_yolo_model(model) -> None:
    try:
        if (
            hasattr(model, "model")
            and model.model is not None
            and hasattr(model.model, "fuse")
        ):
            model.model.fuse()
    except Exception as e:
        logger.warning(f"Could not fuse YOLO model: {e}")


def _cleanup_inference_memory() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


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
bearer_scheme = HTTPBearer(auto_error=False)


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _to_user_public(user_doc: dict) -> UserPublic:
    return UserPublic(
        id=user_doc["_id"],
        email=user_doc["email"],
        username=user_doc.get("username"),
        is_active=bool(user_doc.get("is_active", True)),
        created_at=user_doc["created_at"],
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_access_token(credentials.credentials)
    subject = payload.get("sub") if payload else None
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = await get_users_collection().find_one({"_id": subject})
    if user is None or not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return user


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
            _fuse_yolo_model(crack_detector)
            models_status["cracks_detector"] = True
            logger.info("✓ Cracks detector (YOLO11) loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load cracks detector: {e}")
            models_status["cracks_detector"] = False

    # 2. ЗАВАНТАЖЕННЯ ОФІЦІЙНОЇ GOOGLE OPENIMAGES МОДЕЛІ
    try:
        if YOLO is None:
            raise ImportError("ultralytics не встановлено")

        sign_detector = YOLO(MODELS_DIR / "yolov8s-oiv7.pt")
        _fuse_yolo_model(sign_detector)
        models_status["sign_detector"] = True
        logger.info("✓ Google OpenImages Traffic Sign detector loaded successfully")
    except Exception as e:
        logger.warning(f"Could not load sign detector: {e}")
        models_status["sign_detector"] = False

    # 3. Завантаження твого класифікатора знаків (ResNet50)
    signs_path = MODELS_DIR / "signs_classificator.pth"
    if signs_path.exists():
        try:
            checkpoint = torch.load(signs_path, map_location="cpu", weights_only=False)
            state_dict = (
                checkpoint["model_state"]
                if isinstance(checkpoint, dict) and "model_state" in checkpoint
                else checkpoint
            )
            dynamic_labels = (
                checkpoint.get("labels", None) if isinstance(checkpoint, dict) else None
            )

            num_classes = (
                state_dict["fc.1.bias"].shape[0]
                if "fc.1.bias" in state_dict
                else state_dict["fc.bias"].shape[0]
            )

            model = models.resnet50(weights=None)
            num_ftrs = model.fc.in_features
            model.fc = nn.Sequential(nn.Dropout(0.3), nn.Linear(num_ftrs, num_classes)) # type: ignore

            model.load_state_dict(state_dict)
            model.to(DEVICE)
            model.eval()

            signs_classifier = model
            models_status["signs_classifier"] = True
            logger.info("✓ Signs classifier (ResNet50) loaded successfully!")
        except Exception as e:
            logger.warning(f"Could not load signs classifier: {e}")
            models_status["signs_classifier"] = False

    logger.info(f"Статус моделей: {models_status}")


def detect_cracks(
    image: np.ndarray, source_name: Optional[str] = None
) -> tuple[list[Detection], float]:
    if not models_status["cracks_detector"] or crack_detector is None:
        raise HTTPException(
            status_code=503,
            detail="Детектор тріщин не ініціалізовано. Перевірте логі версій пакета ultralytics.",
        )

    try:
        save_debug_image(
            image,
            source_name=source_name,
            model_name="cracks",
            stage="input",
        )

        results = crack_detector.predict(source=image, device=DEVICE, verbose=True)
        detections = []
        debug_image = image.copy()

        for result in results:
            boxes = result.boxes
            if boxes is None or len(boxes) == 0:
                logger.info("No cracks detected in the image.")
                continue
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

        save_debug_image(
            debug_image,
            source_name=source_name,
            model_name="cracks",
            stage="annotated",
        )
        return detections, 0.0
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Помилка детекції тріщин: {str(e)}"
        )
    finally:
        _cleanup_inference_memory()


def classify_signs(
    image: np.ndarray, source_name: Optional[str] = None
) -> tuple[list[Detection], float]:
    if not models_status["signs_classifier"] or signs_classifier is None:
        raise HTTPException(
            status_code=503, detail="Класифікатор знаків не завантажено."
        )
    if not models_status["sign_detector"] or sign_detector is None:
        raise HTTPException(
            status_code=503, detail="Детектор об'єктів знаків не завантажено."
        )

    CLASSIFICATION_CONFIDENCE_THRESHOLD = 0.4

    try:
        save_debug_image(
            image,
            source_name=source_name,
            model_name="signs",
            stage="input",
        )

        detections = []
        debug_image = image.copy()

        # Запускаємо детекцію
        yolo_results = sign_detector.predict(source=image, device=DEVICE, verbose=True)
        crop_index = 0

        for result in yolo_results:
            if result.boxes is None or len(result.boxes) == 0:
                logger.info("No signs detected in the image.")
                continue
            for box in result.boxes:
                # Отримуємо ім'я класу, який знайшла YOLO
                class_id = int(box.cls[0].item())
                class_name_yolo = result.names[class_id]

                # Нам потрібні СУТО дорожні знаки. В OpenImages цей клас називається "Traffic sign"
                if class_name_yolo != "Traffic sign":
                    continue

                det_confidence = box.conf[0].item()
                if (
                    det_confidence < 0.20
                ):  # Нижній поріг детекції, щоб не пропускати дрібні знаки
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

                crop_index += 1
                save_debug_image(
                    sign_crop,
                    source_name=source_name,
                    model_name="signs",
                    stage="crop",
                    index=crop_index,
                    details=f"det_{det_confidence:.2f}",
                )

                # Передаємо кроп у твій ResNet50 класифікатор
                crop_rgb = cv2.cvtColor(sign_crop, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(crop_rgb)
                image_tensor = sign_transforms(pil_img).unsqueeze(0).to(DEVICE)

                with torch.no_grad():
                    output = signs_classifier(image_tensor)

                probabilities = torch.softmax(output, dim=1)[0]
                confidence, class_id_resnet = torch.max(probabilities, dim=0)
                class_id_int = int(class_id_resnet.item())
                confidence_value = confidence.item()

                if confidence_value >= CLASSIFICATION_CONFIDENCE_THRESHOLD:
                    class_name = mtsd_ukrainian_signs.get(class_id_int)
                    if class_name is None:
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

        save_debug_image(
            debug_image,
            source_name=source_name,
            model_name="signs",
            stage="annotated",
        )

        return detections, 0.0
    except Exception as e:
        logger.error(f"Помилка класифікації знаків: {e}")
        raise HTTPException(status_code=500, detail=f"Внутрішня помилка: {str(e)}")
    finally:
        _cleanup_inference_memory()


@app.on_event("startup")
async def startup_event():
    if ENVIRONMENT == "production" and JWT_SECRET_KEY == "change-me-in-production":
        raise RuntimeError("Set JWT_SECRET_KEY for production")

    await connect_to_mongo()
    load_models()


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()


@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", models_loaded=models_status)


@app.get("/markers", response_model=list[RoadMarker])
async def get_markers():
    """Return sample bad-road markers for frontend testing"""
    return [
        RoadMarker(
            id="marker-1",
            latitude=50.4501,
            longitude=30.5234,
            title="Pothole",
            description="Sample pothole marker for map testing",
            severity=3,
        ),
        RoadMarker(
            id="marker-2",
            latitude=50.4547,
            longitude=30.5238,
            title="Crack",
            description="Sample crack marker for map testing",
            severity=2,
        ),
        RoadMarker(
            id="marker-3",
            latitude=50.4486,
            longitude=30.5361,
            title="Road Work",
            description="Sample road work marker for map testing",
            severity=1,
        ),
    ]


@app.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_account(payload: RegisterRequest):
    users = get_users_collection()
    now = datetime.now(timezone.utc)
    normalized_email = _normalize_email(str(payload.email))

    existing_user = await users.find_one({"email": normalized_email}, {"_id": 1})
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ця електронна пошта вже зареєстрована",
        )

    user_doc = {
        "_id": str(uuid4()),
        "email": normalized_email,
        "password_hash": hash_password(payload.password),
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    try:
        await users.insert_one(user_doc)
    except DuplicateKeyError as exc:
        logger.warning(
            "Duplicate key while registering %s: %s",
            normalized_email,
            getattr(exc, "details", None) or str(exc),
        )

        duplicate_details = getattr(exc, "details", None) or {}
        key_pattern = (
            duplicate_details.get("keyPattern", {})
            if isinstance(duplicate_details, dict)
            else {}
        )
        if "email" in key_pattern:
            detail = "Ця електронна пошта вже зареєстрована"
        else:
            detail = "Не вдалося створити акаунт через наявний запис"

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
        )

    token = create_access_token(subject=user_doc["_id"])
    return TokenResponse(
        access_token=token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_to_user_public(user_doc),
    )


@app.post("/auth/login", response_model=TokenResponse)
async def login_account(payload: LoginRequest):
    users = get_users_collection()
    identifier = payload.identifier.strip().lower()
    user_doc = await users.find_one({"email": identifier})

    if user_doc is None or not verify_password(
        payload.password, user_doc.get("password_hash", "")
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Невірні облікові дані",
        )

    if not user_doc.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Обліковий запис деактивовано",
        )

    token = create_access_token(subject=user_doc["_id"])
    return TokenResponse(
        access_token=token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_to_user_public(user_doc),
    )


@app.get("/auth/me", response_model=UserPublic)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _to_user_public(current_user)


@app.post("/detect/cracks", response_model=ProcessingResult)
async def detect_cracks_endpoint(file: UploadFile = File(...)):
    image = await process_image_to_array(file)
    detections, proc_time = detect_cracks(image, source_name=file.filename)
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
    detections, proc_time = classify_signs(image, source_name=file.filename)
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
    source_name = file.filename
    results = {}
    try:
        cracks, _ = detect_cracks(image, source_name=source_name)
        results["cracks"] = {"success": True, "detections": cracks}
    except Exception as e:
        results["cracks"] = {"success": False, "error": str(e)}

    try:
        signs, _ = classify_signs(image, source_name=source_name)
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
