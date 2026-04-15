from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import get_settings

settings = get_settings()


def save_profile_image(file: UploadFile, empresa_id: str) -> str:
    base_path = Path(settings.media_root)
    rel_dir = Path(f"tenant_{empresa_id}") / "fotos_perfil"
    target_dir = base_path / rel_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "").suffix.lower() or ".jpg"
    name = f"{uuid4().hex}{suffix}"
    target_path = target_dir / name

    with target_path.open("wb") as out:
        out.write(file.file.read())

    return str((rel_dir / name).as_posix())
