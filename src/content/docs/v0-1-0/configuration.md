---
title: "Configuración"
description: "Referencia completa de .sentinel.yaml y flags de CLI."
order: 3
icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
---

# Configuración

Sentinel se configura mediante un archivo `.sentinel.yaml` en la raíz de tu proyecto, flags de línea de comandos o variables de entorno. Los flags de CLI siempre tienen prioridad sobre el archivo de configuración, y las variables de entorno tienen prioridad sobre ambos.

## Inicialización

Genera un archivo de configuración con los valores por defecto:

```bash
sentinel init
# ✓ Creado .sentinel.yaml
```

## Archivo de Configuración Completo

```yaml
# .sentinel.yaml — Configuración completa de Sentinel
version: "1"

# Opciones de escaneo
scan:
  # Directorios a escanear
  paths:
    - src/
    - lib/
    - app/

  # Patrones de exclusión (glob)
  exclude:
    - "**/__pycache__/**"
    - "**/node_modules/**"
    - "**/.venv/**"
    - "**/dist/**"
    - "**/build/**"
    - "**/*.min.js"

  # Extensiones de archivo a analizar
  extensions:
    - .py
    - .js
    - .ts
    - .jsx
    - .tsx

# Configuración de reglas individuales
rules:
  # Dependencias
  DEP-001:
    enabled: true
    severity: critical
    options:
      registries:
        - pypi
        - npm
        - crates.io
      cache_ttl: 3600          # Cache de verificación (segundos)

  DEP-002:
    enabled: true
    severity: warning
    options:
      max_age_days: 30         # Días mínimos de antigüedad

  # Seguridad
  SEC-001:
    enabled: true
    severity: critical
    options:
      sensitive_paths:         # Patrones de rutas sensibles
        - "/admin/*"
        - "/api/users/*"
        - "/api/payments/*"

  SEC-002:
    enabled: true
    severity: warning

  SEC-003:
    enabled: true
    severity: critical
    options:
      entropy_threshold: 3.5   # Umbral mínimo de entropía
      patterns:                # Patrones de placeholder adicionales
        - "your-.*-here"
        - "TODO"
        - "CHANGEME"
        - "example"

  # Tests
  TEST-001:
    enabled: true
    severity: warning
    options:
      min_asserts: 1           # Mínimo de asserts por test

  TEST-002:
    enabled: false             # Deshabilitada por defecto
    severity: info

# Opciones de salida
output:
  format: human                # human | json | sarif
  colors: true                 # Colorear salida en terminal
  verbose: false               # Mostrar archivos escaneados
  quiet: false                 # Solo mostrar errores
```

## Flags de CLI

### Comando `scan`

```bash
sentinel scan [PATH...] [OPTIONS]
```

| Flag | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `--format` | `string` | `human` | Formato de salida: `human`, `json`, `sarif` |
| `--output` | `path` | `stdout` | Ruta del archivo de salida |
| `--changed-only` | `flag` | `false` | Solo escanear archivos con cambios en Git |
| `--severity` | `string` | `info` | Severidad mínima: `info`, `warning`, `critical` |
| `--config` | `path` | `.sentinel.yaml` | Ruta al archivo de configuración |
| `--no-colors` | `flag` | `false` | Deshabilitar colores en la salida |
| `--verbose` | `flag` | `false` | Mostrar cada archivo escaneado |
| `--quiet` | `flag` | `false` | Solo mostrar hallazgos críticos |
| `--ignore` | `string[]` | `[]` | Reglas a ignorar (ej. `--ignore DEP-002`) |
| `--fail-on` | `string` | `critical` | Severidad mínima para exit code 1 |

### Comando `rules`

```bash
sentinel rules [OPTIONS]
```

| Flag | Descripción |
|------|-------------|
| `--format json` | Listar reglas en formato JSON |
| `--enabled-only` | Solo mostrar reglas habilitadas |

### Comando `init`

```bash
sentinel init [OPTIONS]
```

| Flag | Descripción |
|------|-------------|
| `--force` | Sobrescribir archivo existente |
| `--minimal` | Generar configuración mínima |

## Variables de Entorno

Todas las opciones pueden configurarse mediante variables de entorno con el prefijo `SENTINEL_`:

| Variable | Equivale a |
|----------|------------|
| `SENTINEL_FORMAT` | `--format` |
| `SENTINEL_SEVERITY` | `--severity` |
| `SENTINEL_CONFIG` | `--config` |
| `SENTINEL_NO_COLORS` | `--no-colors` |
| `SENTINEL_QUIET` | `--quiet` |

Ejemplo:

```bash
export SENTINEL_FORMAT=json
export SENTINEL_SEVERITY=warning
sentinel scan src/
# Equivale a: sentinel scan src/ --format json --severity warning
```

## Ejemplos de Uso

### Proyecto Python con FastAPI

```yaml
# .sentinel.yaml
version: "1"
scan:
  paths: [app/, tests/]
  exclude: ["**/__pycache__/**"]
rules:
  SEC-001:
    enabled: true
    options:
      sensitive_paths: ["/api/admin/*", "/api/billing/*"]
  SEC-002:
    enabled: true
  DEP-001:
    enabled: true
    options:
      registries: [pypi]
```

### Monorepo con Node.js y Python

```yaml
version: "1"
scan:
  paths:
    - services/api/src/
    - services/frontend/src/
    - packages/
  exclude:
    - "**/node_modules/**"
    - "**/__pycache__/**"
    - "**/dist/**"
rules:
  DEP-001:
    options:
      registries: [pypi, npm]
```

### CI/CD: Solo errores críticos

```yaml
version: "1"
output:
  format: sarif
  quiet: true
rules:
  DEP-002: { enabled: false }
  TEST-002: { enabled: false }
  SEC-002: { severity: info }
```

## Orden de Precedencia

La configuración se resuelve con el siguiente orden de prioridad (de mayor a menor):

1. Flags de CLI (`--format json`)
2. Variables de entorno (`SENTINEL_FORMAT=json`)
3. Archivo de configuración (`.sentinel.yaml`)
4. Valores por defecto internos

## Validación

Sentinel valida el archivo de configuración al inicio de cada scan. Si hay errores de formato o valores inválidos, se muestra un error descriptivo:

```bash
$ sentinel scan src/
✗ Error en .sentinel.yaml:
  › Línea 15: El valor 'extreme' no es válido para severity.
  › Valores aceptados: info, warning, critical
```
