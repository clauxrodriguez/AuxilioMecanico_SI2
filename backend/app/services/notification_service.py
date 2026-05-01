from __future__ import annotations

import logging
from typing import Any

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Empleado, Incidente

logger = logging.getLogger(__name__)


def _init_firebase():
    try:
        # Allow multiple calls without reinitializing
        if not firebase_admin._apps:
            settings = get_settings()
            cred_path = settings.FIREBASE_CREDENTIALS_PATH or settings.firebase_credentials_path
            # fallback: look for auxiliomecanico.json in repository root or current cwd
            if not cred_path:
                from pathlib import Path

                cwd = Path.cwd()
                candidate = cwd / "auxiliomecanico.json"
                if candidate.exists():
                    cred_path = str(candidate)
                else:
                    # also check package root (two levels up from this file)
                    pkg_root_candidate = Path(__file__).resolve().parents[2] / "auxiliomecanico.json"
                    if pkg_root_candidate.exists():
                        cred_path = str(pkg_root_candidate)

            if not cred_path:
                logger.warning("FIREBASE_CREDENTIALS_PATH not configured and auxiliomecanico.json not found; FCM disabled")
                return None
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        return firebase_admin.get_app()
    except Exception as exc:
        logger.exception("Error initializing Firebase: %s", exc)
        return None


def send_push_notification(token: str, title: str, body: str, data: dict[str, str] | None = None) -> Any:
    app = _init_firebase()
    if not app:
        raise RuntimeError("Firebase not initialized")

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data=data or {},
        token=token,
    )
    try:
        res = messaging.send(message)
        logger.info("FCM sent: %s", res)
        return res
    except Exception:
        logger.exception("Error sending FCM to token=%s", token)
        raise


def notify_new_incident(db: Session, incidente: Incidente) -> None:
    # find available technicians with fcm_token
    try:
        stmt = select(Empleado).where(Empleado.disponible == True).where(Empleado.fcm_token != None)
        results = db.execute(stmt).scalars().all()
        if not results:
            logger.info("No available technicians with FCM token found")
            return

        titulo = "Nueva solicitud de auxilio"
        descripcion_corta = (incidente.tipo or "")
        if incidente.descripcion:
            descripcion_corta = f"{descripcion_corta} - {incidente.descripcion[:60]}" if descripcion_corta else incidente.descripcion[:60]

        data = {
            "incidente_id": incidente.id,
            "tipo": incidente.tipo or "",
            "estado": incidente.estado or "",
        }

        for emp in results:
            if not emp.fcm_token:
                continue
            try:
                send_push_notification(emp.fcm_token, titulo, descripcion_corta, data)
            except Exception:
                logger.exception("Error notificando a empleado %s", emp.id)
    except Exception:
        logger.exception("Error en notify_new_incident")


def notify_assignment_to_employee(db: Session, asignacion_id: str) -> None:
    try:
        # avoid circular import at module top; import here
        from app.db.models import AsignacionServicio, Empleado, Incidente

        asign: AsignacionServicio | None = db.get(AsignacionServicio, asignacion_id)
        if not asign:
            logger.warning("Asignacion %s no encontrada para notificar", asignacion_id)
            return

        empleado: Empleado | None = db.get(Empleado, asign.empleado_id) if asign.empleado_id else None
        if not empleado:
            logger.warning("Empleado %s no existe para asignacion %s", asign.empleado_id, asignacion_id)
            return

        # build message
        titulo = "Nueva asignación"
        descripcion = f"Tienes una nueva asignación (servicio: {asign.servicio_id})"
        data = {"asignacion_id": asign.id, "incidente_id": asign.incidente_id or ""}

        if empleado.fcm_token:
            try:
                send_push_notification(empleado.fcm_token, titulo, descripcion, data)
            except Exception:
                logger.exception("Error enviando notificación de asignación a empleado %s", empleado.id)
        else:
            logger.info("Empleado %s no tiene fcm_token, no se pudo enviar push", empleado.id)
    except Exception:
        logger.exception("Error en notify_assignment_to_employee")