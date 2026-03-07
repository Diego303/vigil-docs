---
title: "Buenas Practicas"
description: "Recomendaciones para equipos que usan agentes de IA para generar codigo."
order: 12
icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
---

# Buenas practicas

Recomendaciones para equipos que usan agentes de IA para generar codigo y quieren mantener estandares de seguridad.

## Regla general

> **Nunca confies ciegamente en el output de un agente de IA.** Trata el codigo generado con el mismo escrutinio que tratarias un pull request de un desarrollador junior que no conoce tu stack.

---

## Dependencias

### Verificar antes de instalar

Antes de ejecutar `pip install` o `npm install` con dependencias sugeridas por un agente:

1. **Buscar el paquete manualmente** en [pypi.org](https://pypi.org) o [npmjs.com](https://npmjs.com).
2. **Verificar el nombre exacto**: Los agentes frecuentemente inventan nombres plausibles que no existen.
3. **Revisar la antiguedad**: Desconfiar de paquetes creados en los ultimos 30 dias.
4. **Revisar las descargas**: Paquetes con menos de 100 descargas semanales merecen escrutinio extra.
5. **Buscar el repositorio fuente**: Paquetes sin repositorio vinculado son sospechosos.

### Ejecutar vigil deps antes de instalar

```bash
# Verificar dependencias ANTES de instalar
vigil deps

# Si hay findings criticos, corregir primero
vigil deps -f json | jq '.findings[] | select(.severity == "critical")'
```

---

## Autenticacion y autorizacion

### Siempre agregar auth middleware

Cuando un agente genera endpoints, **siempre** agregar autenticacion explicitamente.

**Mal (generado por agente):**
```python
@app.delete("/users/{user_id}")
async def delete_user(user_id: int):
    db.delete_user(user_id)
    return {"deleted": user_id}
```

**Bien (corregido):**
```python
@app.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(403)
    db.delete_user(user_id)
    return {"deleted": user_id}
```

### CORS: restringir origenes

```python
# MAL
app.add_middleware(CORSMiddleware, allow_origins=["*"])

# BIEN
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://miapp.com", "https://admin.miapp.com"],
)
```

### JWT: generar secrets reales

```python
# MAL
SECRET_KEY = "supersecret123"

# BIEN
import secrets
SECRET_KEY = os.environ["JWT_SECRET_KEY"]
# Para generar: python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Cookies: activar todos los flags

```python
response.set_cookie(
    "session",
    value=token,
    httponly=True,
    secure=True,
    samesite="lax",
    max_age=3600,
)
```

---

## Secrets y credenciales

### Nunca hardcodear secrets

```python
# MAL
DATABASE_URL = "postgresql://admin:password123@localhost:5432/mydb"
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-not-for-production")

# BIEN
DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ["SECRET_KEY"]
```

### Usar .env con .gitignore

1. Crear `.env.example` con **placeholders** (no valores reales).
2. Crear `.env` con valores reales (nunca commitear).
3. Agregar a `.gitignore`: `.env`, `.env.local`, `.env.production`, `*.pem`, `*.key`, `credentials.json`

---

## Tests

### Exigir assertions reales

```python
# MAL
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})

# BIEN
def test_login():
    response = client.post("/login", json={"user": "admin", "pass": "123"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
```

### Evitar mocks circulares

```python
# MAL
def test_calculate():
    with patch("app.calculate") as mock:
        mock.return_value = 42
        result = app.calculate(6, 7)
        assert result == 42  # No se testo nada real

# BIEN
def test_calculate():
    with patch("app.database.get_multiplier") as mock:
        mock.return_value = 2
        result = app.calculate(6, 7)
        assert result == 26
```

---

## Workflow recomendado

### Para desarrolladores individuales

1. **Pre-commit hook**: `vigil scan --changed-only --fail-on critical --quiet`
2. **Antes de PR**: `vigil scan src/ --fail-on high`
3. **Revision manual**: Leer cada finding y corregir.

### Para equipos

1. **Config compartida**: Commitear `.vigil.yaml` con la config del equipo.
2. **CI obligatorio**: vigil en el pipeline de PR con `--fail-on high`.
3. **Produccion estricta**: Config `strict` para releases.
4. **Documentar excepciones**: Si se desactiva una regla, documentar por que en la config.

### Escalamiento progresivo

| Semana | fail-on | Reglas activas | Objetivo |
|--------|---------|----------------|----------|
| 1 | critical | DEP-001, DEP-007, SEC-001-003 | Solo lo mas grave |
| 2 | high | + AUTH-001, AUTH-002, AUTH-005 | Agregar auth |
| 3 | high | + TEST-001, SEC-004-006 | Agregar tests y secrets |
| 4 | medium | Todas | Cobertura completa |

---

## Prompts mejorados para agentes

Cuando uses un agente de IA, incluir instrucciones de seguridad en el prompt:

- **Dependencias**: "Genera el codigo usando solo paquetes que existan en PyPI. Verifica que los nombres sean correctos."
- **Autenticacion**: "Todos los endpoints deben tener autenticacion. Usa Depends(get_current_user) en FastAPI."
- **Secrets**: "No hardcodees secrets ni valores por defecto. Todas las configuraciones sensibles deben leerse de variables de entorno sin valor por defecto."
- **Tests**: "Cada test debe tener al menos 2 assertions significativas. Siempre verifica el status code en tests de API."

---

## Checklist de revision de codigo generado por IA

- [ ] Ejecutar `vigil scan` y corregir todos los findings.
- [ ] Verificar que todas las dependencias existen en el registry.
- [ ] Confirmar que no hay secrets hardcodeados.
- [ ] Verificar que los endpoints tienen auth middleware.
- [ ] Confirmar que CORS esta restringido a origenes especificos.
- [ ] Verificar que los tests tienen assertions significativas.
- [ ] Revisar que `.env` esta en `.gitignore`.
- [ ] Confirmar que no hay valores copiados de `.env.example`.
