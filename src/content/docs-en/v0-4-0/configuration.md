---
title: "Configuration"
description: ".vigil.yaml file, strategies, overrides, and config merge."
order: 4
icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
---

# Configuration

vigil is configured through a YAML file, CLI flags, or a combination of both. The configuration follows a three-layer model with progressive merge.

## Order of precedence

```
Defaults (code) < YAML file (.vigil.yaml) < CLI flags
```

CLI flags always have the highest priority. This allows having a base configuration file for the team and making per-run adjustments as needed.

## Configuration file

### Creation

```bash
# Generar con defaults
vigil init

# Generar con estrategia estricta
vigil init --strategy strict

# Generar en un directorio especifico
vigil init /ruta/al/proyecto
```

### Supported names

vigil automatically searches for these files, in this order:

1. `.vigil.yaml`
2. `.vigil.yml`
3. `vigil.yaml`
4. `vigil.yml`

The search begins in the current directory and traverses up the directory tree to the root. This allows having a configuration file at the monorepo root that applies to all subprojects.

### Specify an explicit path

```bash
vigil scan src/ --config /ruta/a/mi-config.yaml
```

---

## Full reference

### General configuration

```yaml
# Directorios a incluir en el scan
include:
  - "src/"
  - "lib/"
  - "app/"

# Directorios y patrones a excluir
exclude:
  - "node_modules/"
  - ".venv/"
  - "__pycache__/"
  - ".git/"
  - "dist/"
  - "build/"
  - ".tox/"
  - ".mypy_cache/"

# Directorios de tests (usados por el subcomando `vigil tests`)
test_dirs:
  - "tests/"
  - "test/"
  - "__tests__/"

# Severidad minima para fallar con exit code 1
# Opciones: critical, high, medium, low
fail_on: "high"

# Lenguajes a escanear
# Opciones: python, javascript
languages:
  - python
  - javascript
```

### Dependencies (`deps`)

Configuration for the dependency analyzer (CAT-01).

```yaml
deps:
  # Verificar existencia de paquetes en PyPI/npm via HTTP
  verify_registry: true

  # Minimo de dias de antiguedad para considerar un paquete seguro
  # Paquetes mas nuevos que esto generan DEP-002
  min_age_days: 30

  # Minimo de descargas semanales para considerar un paquete seguro
  # Paquetes con menos descargas generan DEP-004
  min_weekly_downloads: 100

  # Umbral de similitud para deteccion de typosquatting (0.0 a 1.0)
  # Valores mas altos = menos falsos positivos, mas falsos negativos
  # 0.85 es un buen balance
  similarity_threshold: 0.85

  # Tiempo de vida del cache de respuestas del registry (en horas)
  # Evita hacer la misma request HTTP dos veces en 24 horas
  cache_ttl_hours: 24

  # Modo offline: no hacer ninguna request HTTP
  # Solo ejecuta checks estaticos (similaridad, imports sin declarar)
  offline_mode: false

  # Ruta a un archivo personalizado de paquetes populares (JSON)
  # Por defecto usa el corpus bundled en data/
  # popular_packages_file: "/ruta/a/mis-paquetes.json"
```

### Authentication (`auth`)

Configuration for the authentication pattern analyzer (CAT-02).

```yaml
auth:
  # Maximo de horas de lifetime para un JWT
  # Tokens con lifetime mayor generan AUTH-003
  max_token_lifetime_hours: 24

  # Requerir autenticacion en endpoints mutantes (PUT, DELETE, PATCH)
  # Si es true, endpoints mutantes sin auth middleware generan AUTH-002
  require_auth_on_mutating: true

  # Permitir CORS con localhost en modo desarrollo
  # Si es true, `cors(origin: 'http://localhost:*')` no genera AUTH-005
  cors_allow_localhost: true
```

### Secrets (`secrets`)

Configuration for the secrets and credentials analyzer (CAT-03).

```yaml
secrets:
  # Entropia minima de Shannon (bits/caracter) para considerar un string como secret
  # Valores tipicos: < 3.0 = placeholder, > 4.5 = secret real
  min_entropy: 3.0

  # Comparar valores en codigo con los de .env.example
  # Si un valor en codigo coincide con uno de .env.example, genera SEC-006
  check_env_example: true

  # Patrones regex de placeholders conocidos
  # Si un valor asignado a una variable sensible coincide con estos patrones, genera SEC-001
  # El default incluye 30 patrones (ver schema.py para la lista completa)
  placeholder_patterns:
    - "changeme"
    - "your[-_].*[-_]here"
    - "replace[-_]?me"
    - "insert[-_].*[-_]here"
    - "put[-_].*[-_]here"
    - "add[-_].*[-_]here"
    - "TODO"
    - "FIXME"
    - "xxx+"
    - "sk[-_]your.*"
    - "pk[-_]test[-_].*"
    - "sk[-_]test[-_].*"
    - "sk[-_]live[-_]test.*"
    - "secret123"
    - "password123"
    - "supersecret"
    - "mysecret"
    - "my[-_]?secret[-_]?key"
    - "example\\.com"
    - "test[-_]?key"
    - "test[-_]?secret"
    - "dummy[-_]?key"
    - "dummy[-_]?secret"
    - "fake[-_]?key"
    - "fake[-_]?secret"
    - "sample[-_]?key"
    - "sample[-_]?secret"
    - "default[-_]?secret"
    - "default[-_]?key"
    - "placeholder"
```

### Test quality (`tests`)

Configuration for the test quality analyzer (CAT-06).

```yaml
tests:
  # Minimo de assertions requeridas por funcion de test
  # Tests con menos assertions generan TEST-001
  min_assertions_per_test: 1

  # Detectar assertions triviales (assert True, assert x is not None)
  detect_trivial_asserts: true

  # Detectar mocks que replican exactamente la implementacion
  detect_mock_mirrors: true
```

### Output

```yaml
output:
  # Formato de salida: human, json, junit, sarif
  format: "human"

  # Archivo de salida (null = stdout)
  output_file: null

  # Usar colores ANSI en la terminal
  colors: true

  # Output detallado
  verbose: false

  # Mostrar sugerencias de correccion
  show_suggestions: true
```

---

## Rule overrides

You can disable individual rules or change their severity.

```yaml
rules:
  # Deshabilitar una regla completamente
  AUTH-003:
    enabled: false

  # Cambiar la severidad de una regla
  DEP-004:
    severity: "low"

  # Combinar: habilitar con severidad diferente
  TEST-002:
    enabled: true
    severity: "high"
```

### Common overrides

```yaml
rules:
  # Si tu proyecto usa tokens de larga duracion intencionalmente
  AUTH-003:
    enabled: false

  # Si tienes dependencias internas con pocas descargas
  DEP-004:
    severity: "low"

  # Si permites CORS abierto en desarrollo
  AUTH-005:
    severity: "medium"

  # Si tus tests usan un framework custom sin assertions estandar
  TEST-001:
    enabled: false
```

---

## Predefined strategies

### `strict`

For environments with high compliance requirements (SOC 2, ISO 27001, EU CRA).

```yaml
fail_on: "medium"
deps:
  min_age_days: 60
  min_weekly_downloads: 500
auth:
  max_token_lifetime_hours: 1
```

### `standard` (default)

For most projects. Balance between security and practicality.

```yaml
fail_on: "high"
deps:
  min_age_days: 30
  min_weekly_downloads: 100
auth:
  max_token_lifetime_hours: 24
```

### `relaxed`

For prototypes, proofs of concept, or early-stage projects.

```yaml
fail_on: "critical"
deps:
  min_age_days: 7
  min_weekly_downloads: 10
auth:
  max_token_lifetime_hours: 72
```

---

## Per-environment configuration

A common practice is to have multiple configuration files:

```
proyecto/
  .vigil.yaml            # Config base del equipo (commiteada)
  .vigil.strict.yaml     # Config para produccion
  .vigil.dev.yaml        # Config para desarrollo local
```

```bash
# Desarrollo local
vigil scan src/

# Pipeline de CI para produccion
vigil scan src/ --config .vigil.strict.yaml
```

---

## Environment variables

vigil does not read environment variables directly for its configuration. All configuration is done via YAML or CLI flags. This is intentional to keep the tool deterministic and avoid unexpected behavior.

If you need dynamic configuration, you can generate the YAML file as part of your pipeline:

```bash
# Ejemplo: generar config dinamicamente segun el entorno
if [ "$CI" = "true" ]; then
    vigil scan src/ --config .vigil.strict.yaml --fail-on medium
else
    vigil scan src/ --fail-on high
fi
```

---

## Cache

vigil stores a cache of registry responses (PyPI/npm) in:

```
~/.cache/vigil/registry/
```

- The default TTL is 24 hours (configurable with `deps.cache_ttl_hours`).
- Each package is cached individually as a JSON file.
- The cache is shared between runs to avoid repeated requests.

### Clear the cache

```bash
rm -rf ~/.cache/vigil/registry/
```

### Disable the cache

There is no explicit option to disable it. You can use `cache_ttl_hours: 0` to force fresh requests on each run, or `--offline` to make no requests at all.
