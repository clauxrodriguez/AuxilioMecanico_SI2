# 🔍 GUÍA RÁPIDA DE VERIFICACIÓN FCM

## 1️⃣ VERIFICAR CONFIGURACIÓN DEL BACKEND

### PowerShell:
```powershell
# Verificar que las credenciales existen
Test-Path "backend/auxiliomecanico-f0789-firebase-adminsdk-fbsvc-64671a09f7.json"
# Resultado esperado: True

# Verificar variables de entorno
Get-Content "backend/.env" | Select-String "FIREBASE_CREDENTIALS_PATH"
# Resultado esperado: FIREBASE_CREDENTIALS_PATH=...
```

---

## 2️⃣ INICIAR BACKEND Y EJECUTAR TEST

```powershell
cd backend

# Activar entorno virtual
. .venv\Scripts\Activate.ps1

# Instalar dependencias si falta algo
pip install firebase-admin

# Ejecutar test manual de FCM
python test_fcm_manual.py
```

**Esperado:**
```
✅ Firebase Initialization: PASSED
✅ FCM Tokens in Database: PASSED (o al menos no error)
✅ Send Test Notification: PASSED (si hay tokens)
```

---

## 3️⃣ MONITOREAR LOGS DEL BACKEND

Mientras el backend está corriendo:

```powershell
# Terminal 2 - Flutter
cd mobile
flutter run -v
```

**Buscar en logs:**
```
[NotificationService] ✅ FCM Token obtenido exitosamente
[NotificationService] 🔑 Token: eXOd...
[AuthProvider] FCM token enviado al backend
```

Si ves esto en Flutter, el token se guardó correctamente.

---

## 4️⃣ VERIFICAR EN BASE DE DATOS

```sql
-- Conectarse a la base de datos
SELECT id, fcm_token, disponible 
FROM empleado 
WHERE fcm_token IS NOT NULL 
LIMIT 5;

-- Deberías ver empleados con sus tokens guardados
```

---

## 5️⃣ CREAR INCIDENTE DE PRUEBA

### Opción A: Con cURL

```bash
# Reemplazar <JWT_TOKEN> con un token válido
curl -X POST "http://localhost:8001/api/incidentes/" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "Llanta pinchada",
    "descripcion": "Prueba de notificación FCM",
    "vehiculo_id": 1,
    "prioridad": "media",
    "latitud": 4.7110,
    "longitud": -74.0721
  }'
```

### Opción B: Con Postman
1. POST: `http://localhost:8001/api/incidentes/`
2. Headers: `Authorization: Bearer <TOKEN>`
3. Body (JSON):
```json
{
  "tipo": "Prueba FCM",
  "descripcion": "Notificación de prueba",
  "vehiculo_id": 1,
  "prioridad": "alta",
  "latitud": 4.7,
  "longitud": -74.0
}
```

---

## 6️⃣ MONITOREAR NOTIFICACIÓN

**En logs del backend, deberías ver:**
```
✅ FCM: Encontrados 2 técnicos disponibles para notificar del incidente 15
📤 FCM: Enviando notificación a empleado X (token: eXOd...)
✅ FCM: Notificación enviada exitosamente a empleado X
```

**En dispositivo Flutter/Angular:**
- Debería aparecer notificación emergente
- Hacer click debe abrir detalles del incidente

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### ❌ "FIREBASE_CREDENTIALS_PATH not configured"

**Solución:**
```powershell
# Verificar .env tiene la línea:
Get-Content backend/.env | Select-String FIREBASE_CREDENTIALS_PATH

# Si no existe, agregar:
Add-Content backend/.env "`nFIREBASE_CREDENTIALS_PATH=backend/auxiliomecanico-f0789-firebase-adminsdk-fbsvc-64671a09f7.json"
```

---

### ❌ "No available technicians with FCM token found"

**Solución:**
1. Verificar que el empleado/cliente tiene token guardado en BD
2. Verificar que `disponible = True` para empleados
3. Ejecutar login nuevamente en Flutter para obtener token

---

### ❌ Token en logs de Flutter pero no en BD

**Causa:** El endpoint PATCH /api/auth/fcm-token devuelve error

**Solución:**
1. Verificar que el usuario está autenticado (JWT válido)
2. Ver logs del backend:
   ```
   ❌ FCM: Usuario X no asociado a cliente ni empleado
   ```
3. Asegurar que el usuario tiene registro en tabla `cliente` o `empleado`

---

## 📊 VERIFICACIÓN RÁPIDA DE ESTADO

```sql
-- 1. ¿Hay técnicos con tokens?
SELECT COUNT(*) as tech_with_tokens FROM empleado WHERE fcm_token IS NOT NULL;

-- 2. ¿Hay técnicos disponibles con tokens?
SELECT COUNT(*) as available_tech 
FROM empleado 
WHERE fcm_token IS NOT NULL AND disponible = True;

-- 3. ¿Hay clientes con tokens?
SELECT COUNT(*) as clients_with_tokens FROM cliente WHERE fcm_token IS NOT NULL;

-- 4. Últimos incidentes creados
SELECT id, tipo, estado, fecha_creacion 
FROM incidente 
ORDER BY id DESC 
LIMIT 10;
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] `backend/.env` tiene `FIREBASE_CREDENTIALS_PATH` configurado
- [ ] Archivo de credenciales existe en la ruta indicada
- [ ] Backend iniciado: `uvicorn app.main:app --reload`
- [ ] Flutter login exitoso
- [ ] Logs muestran "✅ FCM Token obtenido exitosamente"
- [ ] Token guardado en BD (verificado con SQL)
- [ ] Técnico tiene `disponible = True`
- [ ] Crear incidente desde cliente
- [ ] Backend logs muestran "✅ FCM: Notificación enviada exitosamente"
- [ ] Notificación recibida en dispositivo/navegador
- [ ] Click en notificación abre detalles del incidente

---

## 🎯 FLUJO ESPERADO COMPLETO

```
1. Login en Flutter/Angular
   ↓
2. Obtener FCM token (NotificationService.getToken())
   ↓
3. Enviar token al backend (PATCH /api/auth/fcm-token)
   ↓
4. Backend guarda en empleado.fcm_token o cliente.fcm_token
   ↓
5. Cliente crea incidente (POST /api/incidentes/)
   ↓
6. Backend busca técnicos disponibles con fcm_token
   ↓
7. Para cada técnico, envía notificación con firebase_admin.messaging.send()
   ↓
8. Firebase Cloud Messaging entrega notificación
   ↓
9. Dispositivo recibe notificación emergente
   ↓
10. Usuario hace click
   ↓
11. App abre detalles del incidente
```

---

**ÚLTIMA ACTUALIZACIÓN:** 29 de abril de 2026
