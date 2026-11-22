"""Calls the hosted Roboflow segmentation workflow. Inference runs on Roboflow's servers."""
import numpy as np
from inference_sdk import InferenceConfiguration, InferenceHTTPClient

from app.config import settings

_client = InferenceHTTPClient(
    api_url=settings.roboflow_api_url,
    api_key=settings.roboflow_api_key,
).configure(InferenceConfiguration(api_key_transport="header"))


def segment(image_bgr: np.ndarray) -> list[dict]:
    """Returns raw predictions: x, y, width, height, confidence, class, rle_mask."""
    result = _client.run_workflow(
        workspace_name=settings.roboflow_workspace,
        workflow_id=settings.roboflow_workflow_id,
        images={"image": image_bgr},
        parameters={"classes": settings.roboflow_classes},
        use_cache=True,
    )
    return result[0]["predictions"]["predictions"]
