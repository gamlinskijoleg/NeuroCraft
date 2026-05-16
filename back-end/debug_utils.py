import re
from datetime import datetime
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

from config import DEBUG_DIR, SAVE_DEBUG_ARTIFACTS


def sanitize_debug_segment(value: Optional[str]) -> str:
    if not value:
        return "upload"

    cleaned = Path(value).stem
    cleaned = re.sub(r"[^\w]+", "_", cleaned, flags=re.UNICODE).strip("_")
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned[:60] or "upload"


def save_debug_image(
    image: np.ndarray,
    *,
    source_name: Optional[str],
    model_name: str,
    stage: str,
    index: Optional[int] = None,
    details: Optional[str] = None,
) -> Path:
    if not SAVE_DEBUG_ARTIFACTS:
        return DEBUG_DIR / "disabled.jpg"

    DEBUG_DIR.mkdir(exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    parts = [timestamp, sanitize_debug_segment(source_name), model_name, stage]

    if index is not None:
        parts.append(f"{index:02d}")

    if details:
        parts.append(sanitize_debug_segment(details))

    file_name = "__".join(parts) + ".jpg"
    debug_path = DEBUG_DIR / file_name
    cv2.imwrite(str(debug_path), image)
    return debug_path