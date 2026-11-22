import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is not set. Copy .env.example to .env and fill it in.")
    return value


class Settings:
    roboflow_api_key = _required("ROBOFLOW_API_KEY")
    roboflow_api_url = os.getenv("ROBOFLOW_API_URL", "https://serverless.roboflow.com")
    roboflow_workspace = _required("ROBOFLOW_WORKSPACE")
    roboflow_workflow_id = _required("ROBOFLOW_WORKFLOW_ID")
    roboflow_classes = os.getenv("ROBOFLOW_CLASSES", "mealworm")

    conf_threshold = float(os.getenv("CONF_THRESHOLD", "0.4"))
    marker_mm = float(os.getenv("MARKER_MM", "20"))
    # Images are downscaled before upload: faster calls, fewer bytes, same detections.
    max_image_side = int(os.getenv("MAX_IMAGE_SIDE", "1280"))
    cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:4000").split(",") if o.strip()]

    model_version = f"roboflow:{roboflow_workspace}/{roboflow_workflow_id}"


settings = Settings()
