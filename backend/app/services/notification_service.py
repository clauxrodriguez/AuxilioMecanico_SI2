from __future__ import annotations

import json
import logging
import tempfile
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Empleado, Incidente

logger = logging.getLogger(__name__)


def _init_firebase():
    """
    Initialize Firebase Admin SDK with credentials from environment variables.
    
    Supports two modes:
    1. FIREBASE_CREDENTIALS_JSON: JSON string with service account (preferred, more secure)
    2. FIREBASE_CREDENTIALS_PATH: Path to service account JSON file (legacy support)
    
    Returns firebase app if successful, None otherwise.
    """
    try:
        # Allow multiple calls without reinitializing
        if firebase_admin._apps:
            logger.debug("✅ Firebase already initialized (reusing existing app)")
            return firebase_admin.get_app()
        
        settings = get_settings()
        cred = None
        
        # Priority 1: FIREBASE_CREDENTIALS_JSON (string, more secure for CI/CD)
        if settings.firebase_credentials_json:
            try:
                logger.info("🔐 Firebase: Inicializando desde FIREBASE_CREDENTIALS_JSON (variable de entorno)")
                cred_dict = json.loads(settings.firebase_credentials_json)
                cred = credentials.Certificate(cred_dict)
            except json.JSONDecodeError as e:
                logger.error("❌ FIREBASE_CREDENTIALS_JSON is not valid JSON: %s", str(e))
                return None
            except Exception as e:
                logger.error("❌ Error parsing FIREBASE_CREDENTIALS_JSON: %s", str(e))
                return None
        
        # Priority 2: FIREBASE_CREDENTIALS_PATH (file path)
        elif settings.firebase_credentials_path:
            cred_path = Path(settings.firebase_credentials_path)
            if not cred_path.exists():
                logger.error("❌ FIREBASE_CREDENTIALS_PATH file does not exist: %s", cred_path)
                return None
            
            try:
                logger.info("🔐 Firebase: Cargando credenciales desde archivo: %s", cred_path)
                cred = credentials.Certificate(str(cred_path))
            except Exception as e:
                logger.error("❌ Error loading credentials from file %s: %s", cred_path, str(e))
                return None
        
        else:
            logger.error("❌ Firebase no configurado: define FIREBASE_CREDENTIALS_JSON o FIREBASE_CREDENTIALS_PATH")
            logger.warning("⚠️ FCM notifications will be disabled")
            return None
        
        # Initialize Firebase Admin SDK
        try:
            firebase_admin.initialize_app(cred)
            logger.info("✅ Firebase initialized successfully")
            return firebase_admin.get_app()
        except Exception as e:
            logger.exception("❌ Error initializing Firebase Admin SDK: %s", str(e))
            return None
            
    except Exception as exc:
        logger.exception("❌ Unexpected error initializing Firebase: %s", exc)
        return None


def send_push_notification(token: str, title: str, body: str, data: dict[str, str] | None = None) -> Any:
    app = _init_firebase()
    if not app:
        logger.error("❌ Firebase not initialized; cannot send notification")
        raise RuntimeError("Firebase not initialized")

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        token=token,
    )
    try:
        res = messaging.send(message)
        logger.info("✅ FCM message sent successfully: %s", res)
        return res
    except Exception as exc:
        logger.exception("❌ FCM error sending to token=%s: %s", token[:50], str(exc))
        raise


def notify_new_incident(db: Session, incidente: Incidente) -> None:
    # find available technicians with fcm_token
    try:
        stmt = select(Empleado).where(Empleado.disponible == True).where(Empleado.fcm_token != None)
        results = db.execute(stmt).scalars().all()
        
        if not results:
            logger.warning("⚠️ No available technicians with FCM token found for incident %s", incidente.id)
            return

        logger.info("📢 FCM: Encontrados %d técnicos disponibles para notificar del incidente %s", len(results), incidente.id)

        titulo = "Nueva solicitud de auxilio"
        descripcion_corta = (incidente.tipo or "")
        if incidente.descripcion:
            descripcion_corta = f"{descripcion_corta} - {incidente.descripcion[:60]}" if descripcion_corta else incidente.descripcion[:60]

        data = {
            "incidente_id": str(incidente.id),
            "tipo": incidente.tipo or "",
            "estado": incidente.estado or "",
        }

        for emp in results:
            if not emp.fcm_token:
                continue
            try:
                token_preview = emp.fcm_token[:50] + "..." if len(emp.fcm_token) > 50 else emp.fcm_token
                logger.info("📤 FCM: Enviando notificación a empleado %s (token: %s)", emp.id, token_preview)
                send_push_notification(emp.fcm_token, titulo, descripcion_corta, data)
                logger.info("✅ FCM: Notificación enviada exitosamente a empleado %s", emp.id)
            except Exception as e:
                logger.exception("❌ FCM: Error notificando a empleado %s: %s", emp.id, str(e))
    except Exception as e:
        logger.exception("❌ FCM: Error fatal en notify_new_incident para incidente %s: %s", incidente.id, str(e))