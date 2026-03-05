---
title: "Reglas"
description: "Catálogo completo de reglas de detección: DEP, SEC, TEST."
order: 4
icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2 M9 5h6 M9 14l2 2 4-4"
---

# Reglas de Detección

Vigil organiza sus reglas en tres categorías principales. Cada regla tiene un identificador único, una severidad asignada y opciones de configuración.

Las categorías están diseñadas para cubrir los vectores de ataque más comunes introducidos por código generado con IA:

| Categoría | Prefijo | Enfoque |
|-----------|---------|---------|
| **Dependencias** | `DEP-` | Paquetes alucinados, typosquatting |
| **Seguridad** | `SEC-` | Permisos excesivos, secretos expuestos |
| **Tests** | `TEST-` | Tests falsos, cobertura artificial |

---

## DEP — Dependencias

Reglas que verifican la existencia y legitimidad de las dependencias del proyecto. Estas reglas son la defensa principal contra **slopsquatting**.

### DEP-001: Dependency Hallucination

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Critical |
| **Autocorrección** | No |
| **Archivos** | `requirements.txt`, `package.json`, `Cargo.toml`, `go.mod` |

**Descripción**: Detecta paquetes que no existen en el registry correspondiente. Los LLMs frecuentemente inventan nombres de paquetes que suenan plausibles pero no existen. Un atacante puede registrar ese nombre en el registry y ejecutar código arbitrario en la máquina del desarrollador.

**Ejemplo de código vulnerable**:

```python
# requirements.txt — generado por un LLM
flask==3.0.0
flask-sqlalchemy==3.1.1
fastapi-auth-middleware==1.0.0    # ← NO EXISTE en PyPI
python-jwt-validator==2.3.0       # ← NO EXISTE en PyPI
requests==2.31.0
```

**Salida de Vigil**:

```bash
[CRÍTICO] DEP-001: Dependency Hallucination
  › Archivo: requirements.txt:3
  › Paquete: 'fastapi-auth-middleware' NO EXISTE en PyPI.
  › Riesgo: Slopsquatting — un atacante puede registrar este nombre.
  › Sugerencia: Verifica el nombre correcto. ¿Quisiste decir 'fastapi-users'?

[CRÍTICO] DEP-001: Dependency Hallucination
  › Archivo: requirements.txt:4
  › Paquete: 'python-jwt-validator' NO EXISTE en PyPI.
  › Sugerencia: Alternativas reales: 'PyJWT', 'python-jose', 'authlib'.
```

**Configuración**:

```yaml
rules:
  DEP-001:
    enabled: true
    severity: critical
    options:
      registries: [pypi, npm, crates.io]  # Registries a verificar
      cache_ttl: 3600                      # Cache en segundos
      suggest_alternatives: true           # Sugerir paquetes similares
```

---

### DEP-002: New Package Alert

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Warning |
| **Autocorrección** | No |
| **Archivos** | `requirements.txt`, `package.json`, `Cargo.toml` |

**Descripción**: Alerta sobre dependencias que fueron publicadas hace menos de 30 días. Los paquetes nuevos tienen mayor riesgo de ser maliciosos, especialmente si tienen nombres similares a paquetes populares.

**Ejemplo de detección**:

```bash
[ALERTA] DEP-002: New Package Alert
  › Archivo: package.json:12
  › Paquete: 'react-auth-helper' publicado hace 3 días en npm.
  › Descargas totales: 47
  › Sugerencia: Verifica manualmente el paquete antes de usarlo.
```

**Configuración**:

```yaml
rules:
  DEP-002:
    enabled: true
    severity: warning
    options:
      max_age_days: 30        # Alertar si el paquete tiene menos de N días
      min_downloads: 100      # Umbral mínimo de descargas
```

---

## SEC — Seguridad

Reglas que detectan configuraciones de seguridad deficientes introducidas por código generado con IA. Los LLMs tienden a priorizar que el código "funcione" sobre que sea seguro.

### SEC-001: Over-Permission

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Critical |
| **Autocorrección** | No |
| **Archivos** | `.py`, `.js`, `.ts` |

**Descripción**: Detecta endpoints HTTP sensibles (admin, pagos, gestión de usuarios) que no tienen middleware de autenticación o autorización.

**Ejemplo de código vulnerable**:

```python
# src/routes.py — generado por IA sin protección
from fastapi import FastAPI

app = FastAPI()

@app.get("/api/users")
async def list_users():                    # ← Sin middleware Auth
    return db.get_all_users()

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int):       # ← Sin middleware Auth
    return db.delete_user(user_id)

@app.get("/api/admin/settings")
async def admin_settings():               # ← Sin middleware Auth
    return db.get_settings()
```

**Código corregido**:

```python
from fastapi import FastAPI, Depends
from app.auth import require_auth, require_admin

app = FastAPI()

@app.get("/api/users")
async def list_users(user=Depends(require_auth)):
    return db.get_all_users()

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, user=Depends(require_admin)):
    return db.delete_user(user_id)
```

**Configuración**:

```yaml
rules:
  SEC-001:
    enabled: true
    options:
      sensitive_paths:
        - "/api/admin/*"
        - "/api/users/*"
        - "/api/payments/*"
        - "/api/settings/*"
```

---

### SEC-002: Permissive CORS

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Warning |
| **Autocorrección** | No |
| **Archivos** | `.py`, `.js`, `.ts` |

**Descripción**: Detecta configuraciones CORS con `allow_origins=["*"]` o `Access-Control-Allow-Origin: *`. Esto permite que cualquier sitio web realice peticiones a tu API, abriendo la puerta a ataques CSRF.

**Ejemplo de código vulnerable**:

```python
from fastapi.middleware.cors import CORSMiddleware

# IA genera esto para "que funcione rápido"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # ← Permisivo
    allow_credentials=True,        # ← Peligroso con origins=*
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Código corregido**:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://app.example.com",
        "https://admin.example.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

### SEC-003: Hardcoded Secrets

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Critical |
| **Autocorrección** | No |
| **Archivos** | `.py`, `.js`, `.ts`, `.env`, `.yaml`, `.json` |

**Descripción**: Detecta secretos hardcodeados o valores placeholder que la IA copia de ejemplos y `.env.example` sin reemplazar por variables de entorno.

**Patrones detectados**:

```python
# Todos estos son detectados por SEC-003:

JWT_SECRET = "your-secret-key-here"        # Placeholder
API_KEY = "sk-1234567890abcdef"            # Credencial real
DATABASE_URL = "postgres://user:pass@localhost/db"  # Credencial en URL
SECRET_KEY = "changeme"                     # Valor por defecto
AWS_ACCESS_KEY = "AKIA1234567890EXAMPLE"   # Clave AWS
```

**Código corregido**:

```python
import os

JWT_SECRET = os.environ["JWT_SECRET"]
API_KEY = os.environ["API_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"]
```

**Configuración**:

```yaml
rules:
  SEC-003:
    enabled: true
    options:
      entropy_threshold: 3.5    # Entropía Shannon mínima
      patterns:
        - "your-.*-here"
        - "TODO"
        - "CHANGEME"
        - "example"
        - "placeholder"
```

---

## TEST — Tests

Reglas que detectan tests que no prueban nada real. Los LLMs generan tests que dan la ilusión de cobertura sin validar comportamiento.

### TEST-001: Test Theater

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Warning |
| **Autocorrección** | No |
| **Archivos** | `test_*.py`, `*.test.js`, `*.test.ts`, `*.spec.*` |

**Descripción**: Detecta funciones de test que no contienen asserts válidos. Estos tests siempre pasan, inflando artificialmente las métricas de cobertura.

**Ejemplo de test vacío (detectado)**:

```python
def test_verify_token():
    """Test generated by AI — looks good but tests nothing."""
    token = create_token("user@test.com")
    result = verify_token(token)
    # ← No hay assert. El test siempre pasa.

def test_create_user():
    user = User(name="Test", email="test@test.com")
    assert user is not None      # ← Assert inútil: nunca será None
```

**Test corregido**:

```python
def test_verify_token():
    token = create_token("user@test.com")
    result = verify_token(token)
    assert result.valid is True
    assert result.email == "user@test.com"
    assert result.expires_at > datetime.utcnow()

def test_create_user():
    user = User(name="Test", email="test@test.com")
    assert user.name == "Test"
    assert user.email == "test@test.com"
    assert user.id is not None
```

**Configuración**:

```yaml
rules:
  TEST-001:
    enabled: true
    options:
      min_asserts: 1          # Número mínimo de asserts por test
      ignore_patterns:
        - "test_smoke_*"      # Ignorar smoke tests
```

---

### TEST-002: Mirror Mock

| Propiedad | Valor |
|-----------|-------|
| **Severidad** | Info |
| **Autocorrección** | No |
| **Archivos** | `test_*.py`, `*.test.js`, `*.test.ts` |

**Descripción**: Detecta tests donde el mock replica exactamente la implementación real. Esto crea un test circular que nunca puede fallar.

**Ejemplo de mock espejo (detectado)**:

```python
def calculate_discount(price, percentage):
    return price * (percentage / 100)

# El mock replica la misma lógica — test circular
@patch('app.pricing.calculate_discount')
def test_discount(mock_calc):
    mock_calc.side_effect = lambda p, pct: p * (pct / 100)  # ← Espejo
    result = apply_discount(100, 20)
    assert result == 80   # Siempre pasa porque el mock ES la implementación
```

---

## Tabla Resumen

| Regla | Categoría | Severidad | Descripción | Autofix |
|-------|-----------|-----------|-------------|---------|
| DEP-001 | Dependencias | Critical | Paquete inexistente en registry | No |
| DEP-002 | Dependencias | Warning | Paquete publicado hace < 30 días | No |
| SEC-001 | Seguridad | Critical | Endpoint sensible sin auth | No |
| SEC-002 | Seguridad | Warning | CORS con origins=* | No |
| SEC-003 | Seguridad | Critical | Secretos hardcodeados | No |
| TEST-001 | Tests | Warning | Función test sin asserts válidos | No |
| TEST-002 | Tests | Info | Mock que replica implementación | No |

## Deshabilitar Reglas

### En configuración

```yaml
rules:
  TEST-002:
    enabled: false
```

### En línea de comandos

```bash
vigil scan src/ --ignore DEP-002 --ignore TEST-002
```

### Inline (por archivo)

Añade un comentario para ignorar una línea específica:

```python
JWT_SECRET = "dev-only-secret"  # vigil-ignore: SEC-003
```
