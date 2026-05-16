import io

import cv2
import numpy as np
from PIL import Image
from fastapi import UploadFile


async def process_image_to_array(
    file: UploadFile, max_dimension: int = 1024
) -> np.ndarray:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    return image_cv