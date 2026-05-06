# Guía Rápida: Firebase Cloud Messaging en AuxilioMecanico

## ⚡ RESUMEN RÁPIDO

### Frontend (Angular)
**Lo que pasó:**
- ✅ Se creó `PushNotificationService` que solicita permiso y obtiene token FCM
- ✅ Se creó `ToastService` y `ToastContainerComponent` para mostrar notificaciones
- ✅ Se actualizó `AuthService` para enviar token al backend después del login
- ✅ Se creó `firebase-messaging-sw.js` para manejar notificaciones en background
- ✅ Se actualizó `MainLayoutComponent` para mostrar toasts cuando llegan notificaciones

**Archivos creados:** 6
**Archivos modificados:** 4
**No se rompió nada:** ✅

### Backend (FastAPI)
**Punto de entrada ya existe:**
```python
@router.patch("/fcm-token")
def update_fcm_token(payload: FcmTokenUpdate, ...):
    # Ya implementado en routers/auth.py
```

---

## 📋 CHECKLIST DE CONFIGURACIÓN

### Paso 1: Firebase Console (10 minutos)
- [ ] Ir a [Firebase Console](https://console.firebase.google.com/)
- [ ] Seleccionar o crear proyecto
- [ ] Copiar credenciales de configuración web
- [ ] Generar Web Push VAPID Key en Cloud Messaging

### Paso 2: Frontend (15 minutos)
```bash
cd frontend

# 1. Actualizar environment.ts con credenciales
nano src/environments/environment.ts

# 2. Actualizar push-notification.service.ts con VAPID key
nano src/app/services/push-notification.service.ts

# 3. Actualizar firebase-messaging-sw.js con credenciales
nano src/firebase-messaging-sw.js

# 4. Instalar dependencias
npm install

# 5. Ejecutar
npm start
```

### Paso 3: Backend (30 minutos, opcional)
```bash
cd backend

# 1. Instalar firebase-admin
pip install firebase-admin

# 2. Descargar serviceAccountKey.json de Firebase Console
# Guardar como: backend/firebase-service-account.json

# 3. Crear src/app/services/firebase_service.py
# (Ver archivo FIREBASE_BACKEND_GUIDE.md)

# 4. Usar FirebaseService para enviar notificaciones
```

---

## 🔧 VARIABLES A REEMPLAZAR

### `src/environments/environment.ts`
```typescript
firebase: {
  apiKey: '??? REEMPLAZAR ???',
  authDomain: '??? REEMPLAZAR ???',
  projectId: '??? REEMPLAZAR ???',
  storageBucket: '??? REEMPLAZAR ???',
  messagingSenderId: '??? REEMPLAZAR ???',
  appId: '??? REEMPLAZAR ???',
}
```

### `src/app/services/push-notification.service.ts` (línea ~71)
```typescript
const token = await getToken(this.messaging, {
  vapidKey: '??? REEMPLAZAR CON VAPID KEY ???',
});
```

### `src/firebase-messaging-sw.js` (línea ~3)
```javascript
const firebaseConfig = {
  apiKey: '??? REEMPLAZAR ???',
  authDomain: '??? REEMPLAZAR ???',
  projectId: '??? REEMPLAZAR ???',
  storageBucket: '??? REEMPLAZAR ???',
  messagingSenderId: '??? REEMPLAZAR ???',
  appId: '??? REEMPLAZAR ???',
};
```

---

## ✅ VERIFICACIÓN RÁPIDA

1. **Después de login, en DevTools Console deberías ver:**
   ```
   [PushNotificationService] FCM Token obtained: ...
   [PushNotificationService] FCM token sent to backend successfully
   ```

2. **Service Worker registrado:**
   - F12 → Application → Service Workers → `/firebase-messaging-sw.js` debe estar "activated"

3. **Permiso otorgado:**
   - F12 → Application → Notifications → "Granted"

4. **Token guardado en BD:**
   ```python
   # En el backend
   user = db.get(User, user_id)
   print(user.fcm_token)  # Debe tener un valor
   ```

---

## 📤 ENVIAR NOTIFICACIÓN DE PRUEBA

### Desde Firebase Console:
1. Cloud Messaging → Send test message
2. Título: "Nueva Solicitud"
3. Cuerpo: "Incidente #123 asignado"
4. Datos: `{"incidente_id": "123"}`
5. Enviar a usuario → Seleccionar token

### Desde backend (cuando esté implementado):
```python
from app.services.firebase_service import FirebaseService

FirebaseService.initialize()
FirebaseService.send_message(
    fcm_token=user.fcm_token,
    title="Nueva Solicitud de Auxilio",
    body="Incidente #123",
    data={"incidente_id": "123"}
)
```

---

## 📍 UBICACIÓN DE ARCHIVOS

```
frontend/
├── src/
│   ├── environments/
│   │   └── environment.ts                    [MODIFICADO]
│   ├── app/
│   │   ├── services/
│   │   │   ├── push-notification.service.ts  [NUEVO]
│   │   │   ├── toast.service.ts              [NUEVO]
│   │   │   └── auth/
│   │   │       └── auth.service.ts           [MODIFICADO]
│   │   ├── components/
│   │   │   └── toast-container.component.ts  [NUEVO]
│   │   └── layouts/
│   │       └── main-layout/
│   │           └── main-layout.component.ts  [MODIFICADO]
│   └── firebase-messaging-sw.js              [NUEVO]
├── angular.json                               [MODIFICADO]
├── FIREBASE_SETUP.md                          [DOCUMENTACIÓN]
└── ANGULAR_FIREBASE_CHANGES.md                [DOCUMENTACIÓN]

backend/
├── FIREBASE_BACKEND_GUIDE.md                  [DOCUMENTACIÓN]
├── routers/
│   └── auth.py                                [YA TIENE ENDPOINT]
└── app/
    └── services/
        └── firebase_service.py                [OPCIONAL, NO CREADO YET]
```

---

## 🚀 FLUJO FINAL

```
1. Usuario hace LOGIN
   ↓
2. AuthService pide permiso de notificaciones
   ↓
3. Usuario dice "Permitir"
   ↓
4. Se obtiene FCM token de Firebase
   ↓
5. Se envía a backend: PATCH /api/auth/fcm-token
   ↓
6. Token se guarda en tabla User.fcm_token
   ↓
7. Cuando hay incidente asignado:
   - Backend obtiene token del usuario
   - Envía notificación con Firebase Admin SDK
   - Si app está abierta: aparece TOAST
   - Si app está cerrada: aparece NOTIFICACIÓN del sistema
   ↓
8. Usuario hace click
   ↓
9. Navega a /app/incidentes/{id}
```

---

## ❌ QUÉ NO CAMBIÓ

- `POST /api/token/` ✅ Sigue igual
- Login/Logout ✅ Sin cambios
- Estructura de BD ✅ Sin migraciones nuevas
- Endpoints existentes ✅ Sin cambios
- Funcionalidad de incidentes ✅ Sin cambios
- Empleados, clientes, etc. ✅ Sin cambios

---

## 📝 NOTAS IMPORTANTES

⚠️ **IMPORTANTE:**
- La `firebaseConfig` es **pública** (apiKey es visible en cliente), está bien
- El `serviceAccountKey.json` es **privado**, NUNCA commitear a git
- Actualizar `.gitignore` si creaste `firebase-service-account.json`

---

## 🆘 TROUBLESHOOTING

**P: Service Worker no se registra**
A: Verifica que `firebase-messaging-sw.js` está en `src/` y en `angular.json` assets

**P: FCM token es null**
A: Verifica VAPID key en `push-notification.service.ts` (línea 71)

**P: No llegan notificaciones**
A: Verifica que el token se guardó en BD: `SELECT fcm_token FROM user WHERE id = ?`

**P: Toast no aparece**
A: Verifica que `ToastContainerComponent` está en `MainLayoutComponent`

---

## 📞 SOPORTE

Para más detalles, ver:
- `frontend/FIREBASE_SETUP.md` - Configuración detallada
- `frontend/ANGULAR_FIREBASE_CHANGES.md` - Cambios específicos de Angular
- `FIREBASE_BACKEND_GUIDE.md` - Cómo enviar notificaciones desde backend
