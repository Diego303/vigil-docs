---
title: "Primeros Pasos"
description: "Guía rápida para instalar y ejecutar Sentinel por primera vez."
order: 1
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---

# Primeros Pasos

Sentinel es un security scanner determinista diseñado específicamente para código generado por agentes de Inteligencia Artificial. A diferencia de herramientas como Semgrep o Bandit, Sentinel se centra en detectar patrones exclusivos del código generado por LLMs: dependencias alucinadas, tests vacíos y configuraciones de seguridad permisivas.

Esta guía te llevará desde cero hasta tu primer scan en menos de 5 minutos.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Python 3.9** o superior
- **pip** actualizado (`pip install --upgrade pip`)
- **Git** (opcional, necesario para `--changed-only`)
- Acceso a la terminal de tu sistema operativo

Puedes verificar tu versión de Python con:

```bash
python --version
# Python 3.11.4
```

## Instalación Rápida

Instala Sentinel directamente desde PyPI:

```bash
pip install sentinel-ai
```

Verifica que la instalación fue exitosa:

```bash
sentinel --version
# sentinel v0.1.0

sentinel --help
# Usage: sentinel [OPTIONS] COMMAND [ARGS]...
#
# Commands:
#   scan     Escanea un directorio en busca de vulnerabilidades
#   init     Crea un archivo .sentinel.yaml con la configuración por defecto
#   rules    Lista todas las reglas disponibles
#   version  Muestra la versión actual
```

## Tu Primer Scan

### Scan básico

Ejecuta Sentinel sobre tu directorio de código fuente:

```bash
sentinel scan src/
```

Sentinel analizará recursivamente todos los archivos soportados (`.py`, `.js`, `.ts`, `requirements.txt`, `package.json`, etc.) y mostrará un reporte en formato legible.

### Ejemplo de salida

```bash
$ sentinel scan src/ --format human

◇ Sentinel v0.1.0 — Analizando 42 archivos...
==================================================

[CRÍTICO] DEP-001: Dependency Hallucination
  › Archivo: requirements.txt:14
  › Paquete: 'fastapi-auth-middleware' NO EXISTE en PyPI.
  › Riesgo: Alto potencial de Slopsquatting.
  › Sugerencia: Verifica el nombre del paquete o elimínalo.

[ALERTA] TEST-001: Test Theater Detected
  › Archivo: tests/test_auth.py:22
  › Función: 'test_verify_token' pasa pero no contiene asserts válidos.
  › Sugerencia: Añade al menos un assert que valide el resultado.

[ALERTA] SEC-002: Permissive CORS
  › Archivo: src/main.py:8
  › Detalle: allow_origins=["*"] permite acceso desde cualquier dominio.
  › Sugerencia: Restringe los orígenes a dominios conocidos.

==================================================
✗ Scan fallido: 3 problemas encontrados en 1.4s
  › 1 crítico, 2 alertas, 0 info
```

### Interpretar los resultados

Cada hallazgo incluye:

| Campo | Descripción |
|-------|-------------|
| **Severidad** | `[CRÍTICO]`, `[ALERTA]` o `[INFO]` |
| **Regla** | Identificador único (ej. `DEP-001`) |
| **Archivo** | Ubicación exacta con número de línea |
| **Detalle** | Descripción del problema encontrado |
| **Sugerencia** | Acción recomendada para resolverlo |

## Formatos de Salida

Sentinel soporta tres formatos de salida para adaptarse a diferentes flujos de trabajo:

| Formato | Flag | Uso típico |
|---------|------|------------|
| Human | `--format human` | Lectura directa en terminal |
| JSON | `--format json` | Integración con scripts y pipelines |
| SARIF | `--format sarif` | GitHub Code Scanning y IDEs |

### Exportar a JSON

```bash
sentinel scan src/ --format json --output report.json
```

```json
{
  "version": "0.1.0",
  "scan": {
    "files_scanned": 42,
    "duration_ms": 1400,
    "status": "fail"
  },
  "findings": [
    {
      "rule": "DEP-001",
      "severity": "critical",
      "file": "requirements.txt",
      "line": 14,
      "message": "Package 'fastapi-auth-middleware' does not exist on PyPI",
      "suggestion": "Verify the package name or remove it"
    }
  ]
}
```

### Exportar a SARIF (GitHub)

```bash
sentinel scan src/ --format sarif --output report.sarif
```

Puedes subir el reporte SARIF directamente a GitHub Code Scanning:

```yaml
# .github/workflows/sentinel.yml
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: report.sarif
```

## Inicializar Configuración

Para crear un archivo `.sentinel.yaml` con la configuración por defecto:

```bash
sentinel init
# ✓ Creado .sentinel.yaml con configuración por defecto
```

Esto generará un archivo preconfigurado que puedes personalizar según las necesidades de tu proyecto.

## Integración con Pre-commit

Añade Sentinel como hook de pre-commit para escanear automáticamente cada commit:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/Diego303/sentinel-cli
    rev: v0.1.0
    hooks:
      - id: sentinel
        args: [scan, --changed-only, --severity, warning]
```

La flag `--changed-only` asegura que solo se escanean los archivos modificados en el commit, manteniendo el hook rápido.

## Siguiente Paso

- Consulta la guía de [Instalación](/sentinel-docs/docs/v0-1-0/installation/) para métodos alternativos
- Personaliza las reglas en [Configuración](/sentinel-docs/docs/v0-1-0/configuration/)
- Explora el catálogo completo de [Reglas](/sentinel-docs/docs/v0-1-0/rules/)
