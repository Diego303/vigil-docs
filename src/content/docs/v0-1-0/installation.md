---
title: "Instalación"
description: "Requisitos del sistema y métodos de instalación de Sentinel."
order: 2
icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
---

# Instalación

Sentinel se distribuye como un paquete Python estándar sin dependencias nativas. Funciona en cualquier sistema operativo con Python 3.9 o superior.

## Requisitos del Sistema

| Requisito | Mínimo | Recomendado |
|-----------|--------|-------------|
| **Python** | 3.9 | 3.11+ |
| **pip** | 21.0 | Última versión |
| **SO** | Linux, macOS, Windows | Linux / macOS |
| **Memoria** | 256 MB | 512 MB |
| **Disco** | 50 MB | 100 MB |

> **Nota sobre Windows**: Sentinel funciona en Windows, pero se recomienda WSL2 para un rendimiento óptimo y compatibilidad total con hooks de Git.

## Métodos de Instalación

### pip (Recomendado)

El método más directo. Instala Sentinel en tu entorno Python actual:

```bash
pip install sentinel-ai
```

Para instalarlo en un entorno virtual (recomendado para proyectos):

```bash
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

pip install sentinel-ai
```

### pipx (Instalación Global Aislada)

Si quieres Sentinel disponible globalmente sin contaminar tu entorno Python:

```bash
# Instalar pipx si no lo tienes
pip install pipx
pipx ensurepath

# Instalar Sentinel
pipx install sentinel-ai
```

Ventajas de pipx:
- Sentinel queda disponible como comando global
- No interfiere con otros paquetes Python
- Fácil de actualizar y desinstalar

### Desde Código Fuente

Para desarrollo, contribuciones o acceso a features no publicadas:

```bash
git clone https://github.com/Diego303/sentinel-cli.git
cd sentinel
pip install -e ".[dev]"
```

Esto instala Sentinel en modo editable (`-e`) con las dependencias de desarrollo incluidas (pytest, mypy, ruff, etc.).

### Docker

Para entornos CI/CD o si prefieres no instalar Python:

```bash
docker pull ghcr.io/sentinel/sentinel:latest

# Escanear un directorio local
docker run --rm -v $(pwd):/workspace ghcr.io/sentinel/sentinel:latest \
  scan /workspace/src/ --format human
```

## Verificación

Confirma que la instalación fue exitosa ejecutando estos comandos:

```bash
# Verificar versión
sentinel --version
# sentinel v0.1.0

# Verificar que las reglas están cargadas
sentinel rules
# Reglas disponibles: 7
#   DEP-001  Dependency Hallucination     [critical]
#   DEP-002  New Package Alert            [warning]
#   SEC-001  Over-Permission              [critical]
#   SEC-002  Permissive CORS              [warning]
#   SEC-003  Hardcoded Secrets            [critical]
#   TEST-001 Test Theater                 [warning]
#   TEST-002 Mirror Mock                  [info]

# Ejecutar un scan de prueba
sentinel scan . --format human
```

## Actualización

### Actualizar a la última versión

```bash
# Con pip
pip install --upgrade sentinel-ai

# Con pipx
pipx upgrade sentinel-ai

# Con Docker
docker pull ghcr.io/sentinel/sentinel:latest
```

### Fijar una versión específica

En tu `requirements.txt` o `pyproject.toml`:

```
# requirements.txt
sentinel-ai==0.1.0
```

```toml
# pyproject.toml
[project.optional-dependencies]
security = ["sentinel-ai>=0.1.0,<1.0.0"]
```

## Desinstalación

```bash
# Con pip
pip uninstall sentinel-ai

# Con pipx
pipx uninstall sentinel-ai
```

## Solución de Problemas

### `command not found: sentinel`

El binario no está en tu `PATH`. Soluciones:

```bash
# Verificar dónde se instaló
pip show sentinel-ai | grep Location

# Añadir al PATH (Linux/macOS)
export PATH="$HOME/.local/bin:$PATH"
```

### Conflicto de versiones de Python

Si tienes múltiples versiones de Python, asegúrate de usar la correcta:

```bash
# Usar python3 explícitamente
python3 -m pip install sentinel-ai

# Verificar qué Python usa sentinel
which sentinel
sentinel --version
```

### Permisos denegados

```bash
# No uses sudo con pip. Usa --user en su lugar:
pip install --user sentinel-ai

# O mejor aún, usa un entorno virtual:
python -m venv .venv && source .venv/bin/activate
pip install sentinel-ai
```
