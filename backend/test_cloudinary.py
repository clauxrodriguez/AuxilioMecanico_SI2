#!/usr/bin/env python
"""
Script para diagnosticar problemas con Cloudinary en el backend
Ejecutar desde: backend/
"""

import os
import sys
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

print("=" * 60)
print("DIAGNÓSTICO DE CLOUDINARY")
print("=" * 60)

# 1. Verificar variables de entorno
print("\n1. Verificando variables de entorno:")
cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
api_key = os.environ.get("CLOUDINARY_API_KEY")
api_secret = os.environ.get("CLOUDINARY_API_SECRET")

print(f"   CLOUDINARY_CLOUD_NAME: {'✓' if cloud_name else '✗'} {cloud_name if cloud_name else 'NO CONFIGURADO'}")
print(f"   CLOUDINARY_API_KEY: {'✓' if api_key else '✗'} {api_key[:10]}..." if api_key else "   CLOUDINARY_API_KEY: ✗ NO CONFIGURADO")
print(f"   CLOUDINARY_API_SECRET: {'✓' if api_secret else '✗'} {api_secret[:10]}..." if api_secret else "   CLOUDINARY_API_SECRET: ✗ NO CONFIGURADO")

if not all([cloud_name, api_key, api_secret]):
    print("\n✗ ERROR: Faltan variables de entorno. Configura .env correctamente.")
    sys.exit(1)

# 2. Intentar importar cloudinary
print("\n2. Verificando módulo cloudinary:")
try:
    import cloudinary
    import cloudinary.uploader
    print("   ✓ cloudinary importado correctamente")
except ImportError as e:
    print(f"   ✗ ERROR: No se puede importar cloudinary: {e}")
    print("   Solución: pip install cloudinary")
    sys.exit(1)

# 3. Configurar cloudinary
print("\n3. Configurando cloudinary:")
cloudinary.config(
    cloud_name=cloud_name,
    api_key=api_key,
    api_secret=api_secret,
    secure=True,
)
print(f"   ✓ Configurado con cloud_name={cloud_name}")

# 4. Probar conexión
print("\n4. Probando conexión a Cloudinary:")
try:
    # Crear archivo de prueba
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Test file for Cloudinary upload")
        test_file = f.name
    
    print(f"   Archivo de prueba: {test_file}")
    
    # Intentar subir
    print("   Uploadando a Cloudinary...")
    result = cloudinary.uploader.upload(
        test_file,
        folder="test_auxiliomecanico",
        resource_type="auto"
    )
    
    print(f"   ✓ Upload exitoso!")
    print(f"   URL: {result.get('secure_url')}")
    print(f"   Public ID: {result.get('public_id')}")
    
    # Limpiar
    os.unlink(test_file)
    
except Exception as e:
    print(f"   ✗ ERROR en upload: {e}")
    print(f"   Tipo de error: {type(e).__name__}")
    print("\n   Posibles causas:")
    print("   - API Key o Secret inválidos")
    print("   - Credenciales expiradas")
    print("   - Problema de conexión de red")
    sys.exit(1)

# 5. Verificar carpeta media local
print("\n5. Verificando carpeta de almacenamiento local:")
media_root = os.environ.get("MEDIA_ROOT", "backendnew/media")
print(f"   MEDIA_ROOT: {media_root}")

if not os.path.exists(media_root):
    print(f"   ⚠ Carpeta no existe. Creando...")
    os.makedirs(media_root, exist_ok=True)
    print(f"   ✓ Carpeta creada")
else:
    print(f"   ✓ Carpeta existe")

print("\n" + "=" * 60)
print("✓ DIAGNÓSTICO COMPLETADO EXITOSAMENTE")
print("=" * 60)
print("\nLa configuración de Cloudinary está correcta.")
print("Ya puedes subir evidencias desde la app.")
