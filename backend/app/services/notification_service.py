from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.models import Empleado, Incidente, Notificacion, User

logger = logging.getLogger(__name__)


def _store_notification(
    db: Session,
    user_id: int,
    titulo: str,
    mensaje: str,
    tipo: str | None = None,
    data: dict[str, str] | None = None,
) -> None:
    try:
        notification = Notificacion(
            id=str(uuid.uuid4()),
            user_id=user_id,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            data_json=json.dumps(data or {}, ensure_ascii=False),
        )
        db.add(notification)
        db.commit()
    except Exception:
        logger.exception("Error guardando notificación para user_id=%s", user_id)



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
    # notify all administrators (backend-decided) about a new incident
    try:
        # Admins are users with is_staff=True OR Empleado roles that include admin
        # Query Empleado rows that are linked to a User with is_staff True, and also any Empleado rows
        # whose roles include 'admin' (defensive). Additionally, some admins may not be Empleado rows,
        # so also query User table directly and try to resolve an Empleado/Cliente fcm_token.
        from app.db.models import User, Cliente

        titulo = "Nueva solicitud de auxilio"
        descripcion_corta = (incidente.tipo or "")
        if incidente.descripcion:
            descripcion_corta = f"{descripcion_corta} - {incidente.descripcion[:60]}" if descripcion_corta else incidente.descripcion[:60]

        data = {
            "incidente_id": incidente.id,
            "tipo": incidente.tipo or "",
            "estado": incidente.estado or "",
        }

        # First: admins that are Empleado with fcm_token
        stmt_emp = select(Empleado).where(Empleado.fcm_token.isnot(None))
        empleados = db.execute(stmt_emp).scalars().all()
        admin_emps = [e for e in empleados if (e.usuario and getattr(e.usuario, "is_staff", False)) or any((r.nombre or "").lower() == "admin" for r in (e.roles or []))]

        user_ids_sent = set()
        for emp in admin_emps:
            if not emp.usuario_id:
                continue
            if emp.usuario_id not in user_ids_sent:
                _store_notification(db, emp.usuario_id, titulo, descripcion_corta, "incident_created", data)
                user_ids_sent.add(emp.usuario_id)
            if not emp.fcm_token:
                continue
            try:
                send_push_notification(emp.fcm_token, titulo, descripcion_corta, data)
            except Exception:
                logger.exception("Error notificando a empleado admin %s", emp.id)

        # Second: any User rows with is_staff True that weren't covered above
        stmt_users = select(User).where(User.is_staff == True)
        users = db.execute(stmt_users).scalars().all()
        for user in users:
            # try to find an Empleado or Cliente associated
            try:
                emp = db.execute(select(Empleado).where(Empleado.usuario_id == user.id)).scalars().first()
                if emp:
                    if emp.usuario_id not in user_ids_sent:
                        _store_notification(db, emp.usuario_id, titulo, descripcion_corta, "incident_created", data)
                        user_ids_sent.add(emp.usuario_id)
                    if emp.fcm_token:
                        send_push_notification(emp.fcm_token, titulo, descripcion_corta, data)
                    continue

                cli = db.execute(select(Cliente).where(Cliente.usuario_id == user.id)).scalars().first()
                if cli:
                    if cli.usuario_id and cli.usuario_id not in user_ids_sent:
                        _store_notification(db, cli.usuario_id, titulo, descripcion_corta, "incident_created", data)
                        user_ids_sent.add(cli.usuario_id)
                    if cli.fcm_token:
                        send_push_notification(cli.fcm_token, titulo, descripcion_corta, data)
            except Exception:
                logger.exception("Error notificando a user admin %s", getattr(user, "id", None))

        if not user_ids_sent:
            logger.info("No admin FCM tokens found for incident %s", incidente.id)
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

        if empleado.usuario_id:
            _store_notification(db, empleado.usuario_id, titulo, descripcion, "assignment_created", data)

        if empleado.fcm_token:
            try:
                send_push_notification(empleado.fcm_token, titulo, descripcion, data)
            except Exception:
                logger.exception("Error enviando notificación de asignación a empleado %s", empleado.id)
        else:
            logger.info("Empleado %s no tiene fcm_token, no se pudo enviar push", empleado.id)
    except Exception:
        logger.exception("Error en notify_assignment_to_employee")


def notify_assignment_to_client(db: Session, asignacion_id: str) -> None:
    try:
        from app.db.models import AsignacionServicio, Incidente, Cliente

        asign: AsignacionServicio | None = db.get(AsignacionServicio, asignacion_id)
        if not asign:
            logger.warning("Asignacion %s no encontrada para notificar al cliente", asignacion_id)
            return

        incidente: Incidente | None = db.get(Incidente, asign.incidente_id) if asign.incidente_id else None
        if not incidente or not incidente.cliente_id:
            logger.warning("Incidente/cliente no encontrado para asignacion %s", asignacion_id)
            return

        cliente: Cliente | None = db.get(Cliente, incidente.cliente_id)
        if not cliente:
            logger.warning("Cliente %s no encontrado para incidente %s", incidente.cliente_id, incidente.id)
            return

        titulo = "Tu solicitud está en proceso"
        descripcion = f"Tu solicitud {incidente.id} fue asignada y está en proceso"
        data = {"incidente_id": incidente.id, "asignacion_id": asign.id}

        if cliente.usuario_id:
            _store_notification(db, cliente.usuario_id, titulo, descripcion, "assignment_created", data)

        if cliente.fcm_token:
            try:
                send_push_notification(cliente.fcm_token, titulo, descripcion, data)
            except Exception:
                logger.exception("Error enviando notificación de asignación al cliente %s", cliente.id)
        else:
            logger.info("Cliente %s no tiene fcm_token, no se pudo enviar push", cliente.id)
    except Exception:
        logger.exception("Error en notify_assignment_to_client")