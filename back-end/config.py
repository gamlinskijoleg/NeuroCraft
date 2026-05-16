import os
from pathlib import Path


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

MODELS_DIR.mkdir(exist_ok=True)

if SAVE_DEBUG_ARTIFACTS:
    DEBUG_DIR.mkdir(exist_ok=True)