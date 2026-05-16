import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def env_truthy(name: str) -> bool:
    return os.getenv(name, "false").strip().lower() in {"1", "true", "yes", "on"}


ENVIRONMENT = os.getenv("ENVIRONMENT", "production").strip().lower()
SAVE_DEBUG_ARTIFACTS = env_truthy("SAVE_DEBUG_CROPS") or ENVIRONMENT in {
    "local",
    "development",
    "dev",
    "debug",
}

MODELS_DIR = Path(os.getenv("MODELS_DIR", "./models"))
DEBUG_DIR = Path(os.getenv("DEBUG_CROPS_DIR", "./debug_crops"))

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "neurocraft")

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

MODELS_DIR.mkdir(exist_ok=True)

if SAVE_DEBUG_ARTIFACTS:
    DEBUG_DIR.mkdir(exist_ok=True)
