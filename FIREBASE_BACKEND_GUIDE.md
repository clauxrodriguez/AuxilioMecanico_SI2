# Enviar Notificaciones de Firebase desde el Backend

Este documento explica cómo enviar notificaciones de Firebase Cloud Messaging desde el backend FastAPI.

## Instalación de dependencias

```bash
pip install firebase-admin
```

## Configurar Firebase Admin SDK

1. Ve a **Firebase Console** → **Configuración del proyecto** → **Cuentas de servicio**
2. Haz clic en **Generar nueva clave privada**
3. Se descargará un archivo JSON `serviceAccountKey.json`
4. Guarda este archivo en `backend/firebase-service-account.json` (NO commitear a git)

## Crear servicio de notificaciones

Crear archivo `backend/app/services/firebase_service.py`:

```python
import json
import firebase_admin
from firebase_admin import credentials, messaging
from app.core.config import settings
from pathlib import Path

class FirebaseService:
    _app = None

    @classmethod
    def initialize(cls):
        """Inicializar Firebase Admin SDK"""
        if not cls._app:
            cred_path = Path(__file__).parent.parent.parent / "firebase-service-account.json"
            if not cred_path.exists():
                raise FileNotFoundError(f"Firebase service account file not found: {cred_path}")
            
            cred = credentials.Certificate(str(cred_path))
            cls._app = firebase_admin.initialize_app(cred)
            print("[Firebase] Admin SDK initialized")

    @classmethod
    def send_message(
        cls,
        fcm_token: str,
        title: str,
        body: str,
        data: dict = None,
        webpush_options: dict = None,
    ) -> str:
        """
        Enviar mensaje a un dispositivo específico
        
        Args:
            fcm_token: Token FCM del usuario
            title: Título de la notificación
            body: Cuerpo del mensaje
            data: Datos adicionales (dict)
            webpush_options: Opciones específicas para web
        
        Returns:
            message_id: ID del mensaje enviado
        """
        if not cls._app:
            cls.initialize()

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                webpush=messaging.WebpushConfig(
                    headers={"TTL": "86400"},  # 24 horas
                    notification=messaging.WebpushNotification(
                        title=title,
                        body=body,
                        icon="/assets/icon.png",
                    ),
                    **(webpush_options or {})
                ),
                token=fcm_token,
            )

            message_id = messaging.send(message)
            print(f"[Firebase] Message sent successfully: {message_id}")
            return message_id
        except Exception as e:
            print(f"[Firebase] Error sending message: {e}")
            raise

    @classmethod
    def send_to_topic(
        cls,
        topic: str,
        title: str,
        body: str,
        data: dict = None,
    ) -> str:
        """
        Enviar mensaje a un tópico (múltiples usuarios)
        
        Args:
            topic: Nombre del tópico (ej: "incidentes_asignados")
            title: Título de la notificación
            body: Cuerpo del mensaje
            data: Datos adicionales
        
        Returns:
            message_id: ID del mensaje enviado
        """
        if not cls._app:
            cls.initialize()

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                data=data or {},
                topic=topic,
            )

            message_id = messaging.send(message)
            print(f"[Firebase] Topic message sent: {message_id}")
            return message_id
        except Exception as e:
            print(f"[Firebase] Error sending topic message: {e}")
            raise

    @classmethod
    def subscribe_to_topic(cls, fcm_token: str, topic: str) -> None:
        """
        Suscribir un token a un tópico
        """
        if not cls._app:
            cls.initialize()

        try:
            messaging.make_topic_management_response(
                messaging.topic_mgt.make_subscribe_to_topic_response(
                    messaging.send(
                        messaging.Message(
                            token=fcm_token,
                            webpush=messaging.WebpushConfig(
                                fcm_options=messaging.WebpushFcmOptions(
                                    link="/app/incidentes"
                                )
                            ),
                        ),
                        topic=topic,
                    )
                )
            )
            print(f"[Firebase] Token subscribed to topic: {topic}")
        except Exception as e:
            print(f"[Firebase] Error subscribing to topic: {e}")
```

## Uso en routers

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Incidente
from app.services.firebase_service import FirebaseService

router = APIRouter()

@router.post("/api/incidentes/{incidente_id}/notify")
def notify_incident_assigned(
    incidente_id: int,
    empleado_id: int,
    db: Session = Depends(get_db)
):
    """Notificar a un empleado que fue asignado a un incidente"""
    
    incidente = db.get(Incidente, incidente_id)
    if not incidente:
        raise HTTPException(status_code=404, detail="Incidente no encontrado")
    
    empleado = db.get(User, empleado_id)
    if not empleado or not empleado.fcm_token:
        raise HTTPException(status_code=404, detail="Empleado o token FCM no encontrado")
    
    try:
        FirebaseService.initialize()
        message_id = FirebaseService.send_message(
            fcm_token=empleado.fcm_token,
            title="Nueva Solicitud Asignada",
            body=f"Incidente {incidente_id}: {incidente.tipo}",
            data={
                "incidente_id": str(incidente_id),
                "tipo": incidente.tipo,
            }
        )
        return {"message": "Notificación enviada", "message_id": message_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

## Ejemplo: Notificar cuando se asigna un incidente

En el servicio de incidentes:

```python
from app.services.firebase_service import FirebaseService

def assign_incidente(db: Session, incidente_id: int, empleado_id: int):
    """Asignar incidente a un empleado y notificarlo"""
    
    incidente = db.get(Incidente, incidente_id)
    empleado = db.get(User, empleado_id)
    
    if not empleado.fcm_token:
        print(f"[Warning] Empleado {empleado_id} no tiene FCM token")
        return
    
    try:
        FirebaseService.send_message(
            fcm_token=empleado.fcm_token,
            title=f"Nuevo incidente: {incidente.tipo}",
            body=f"Ubicación: {incidente.latitud}, {incidente.longitud}",
            data={
                "incidente_id": str(incidente_id),
                "tipo": incidente.tipo,
                "prioridad": str(incidente.prioridad),
            }
        )
    except Exception as e:
        print(f"[Error] No se pudo enviar notificación: {e}")
```

## Datos comunes a enviar

```python
data = {
    "incidente_id": "123",        # ID del incidente
    "tipo": "pinchazo",           # Tipo de incidente
    "prioridad": "5",             # Nivel de prioridad (1-5)
    "latitud": "-17.783737",      # Ubicación
    "longitud": "-63.182103",
    "cliente_nombre": "Juan Pérez", # Información del cliente
    "telefono": "123456789",
}
```

## Notas importantes

- ⚠️ **NUNCA commitear** `firebase-service-account.json` a git
- ✅ Usar variables de entorno para valores sensibles
- ✅ Validar que el token FCM existe antes de enviar
- ✅ Usar try/except para no romper el flujo si hay error en Firebase
- ✅ Registrar los envíos de notificaciones para debugging
