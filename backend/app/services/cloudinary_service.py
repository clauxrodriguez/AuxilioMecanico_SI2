import os
import shutil
from pathlib import Path
from typing import Optional

try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_AVAILABLE = True
except ImportError:
    CLOUDINARY_AVAILABLE = False


def configure_cloudinary() -> bool:
    """Configure cloudinary. Returns True if successful, False otherwise."""
    if not CLOUDINARY_AVAILABLE:
        return False
    
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")

    if not all([cloud_name, api_key, api_secret]):
        return False

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )
    return True


def upload_evidence(file_path: str, folder: str) -> str:
    """Upload a file to Cloudinary and return the secure URL.
    
    If Cloudinary is not configured, falls back to local storage.
    Uses resource_type="auto" so images, audio and other files are accepted.
    """
    # Try Cloudinary first
    if configure_cloudinary():
        try:
            result = cloudinary.uploader.upload(file_path, folder=folder, resource_type="auto")
            secure = result.get("secure_url") or result.get("url")
            return secure
        except Exception:
            # Fall back to local storage on Cloudinary failure
            pass
    
    # Fallback: save locally
    return _save_evidence_locally(file_path, folder)


def _save_evidence_locally(file_path: str, folder: str) -> str:
    """Save evidence file locally and return a relative path URL."""
    media_root = os.environ.get("MEDIA_ROOT", "backendnew/media")
    
    # Create folder structure
    dest_folder = Path(media_root) / folder
    dest_folder.mkdir(parents=True, exist_ok=True)
    
    # Copy file
    filename = Path(file_path).name
    dest_path = dest_folder / filename
    shutil.copy2(file_path, dest_path)
    
    # Return relative URL
    relative_path = str(dest_path).replace("\\", "/")
    return f"/media/{folder}/{filename}"
