---
title: "Contribuir"
description: "Guia para contribuir al proyecto, setup de desarrollo y testing."
order: 14
icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
---

# Contribuir

Guia para contribuir al desarrollo de vigil.

## Setup de desarrollo

### Requisitos

- Python 3.12 o superior
- git
- pip

### Clonar y configurar

```bash
git clone https://github.com/org/vigil.git
cd vigil

# Crear entorno virtual
python3.12 -m venv .venv
source .venv/bin/activate    # Linux/macOS
# .venv\Scripts\activate     # Windows

# Instalar en modo desarrollo con dependencias de dev
pip install -e ".[dev]"

# Verificar instalacion
vigil --version
```

### Verificar que todo funciona

```bash
# Ejecutar tests
pytest

# Ejecutar vigil
vigil scan src/
vigil rules
```

---

## Estructura del proyecto

```
src/vigil/
  cli.py              # Comandos Click
  config/             # Configuracion (schema, loader, rules)
  core/               # Modelos y motor (finding, engine, file_collector)
  analyzers/          # Analyzers (logica de deteccion)
    base.py           #   BaseAnalyzer Protocol
    deps/             #   DependencyAnalyzer
    auth/             #   AuthAnalyzer
    secrets/          #   SecretsAnalyzer
  reports/            # Formateadores de salida
  logging/            # Setup de structlog
tests/
  test_cli.py         # Tests del CLI
  test_core/          # Tests del core
  test_config/        # Tests de configuracion
  test_reports/       # Tests de formateadores
  test_analyzers/     # Tests de analyzers
  fixtures/           # Archivos de prueba
```

---

## Convenciones de codigo

### Python

- **Version**: Python 3.12+. Usar `str | None` en lugar de `Optional[str]`.
- **Type hints**: Todas las funciones publicas deben tener type hints completos.
- **Linter**: ruff con target `py312` y line-length 100.
- **Formatter**: ruff format.

```bash
# Lint
ruff check src/ tests/

# Format
ruff format src/ tests/
```

### Nomenclatura

- Clases: `PascalCase`
- Funciones y variables: `snake_case`
- Constantes: `UPPER_SNAKE_CASE`
- Archivos: `snake_case.py`

### Modelos

- **Pydantic v2**: Para configuracion del usuario (requiere validacion).
- **dataclasses**: Para modelos internos (Finding, Location, RuleDefinition).
- **Protocol**: Para interfaces (BaseAnalyzer, BaseFormatter).

---

## Como implementar un analyzer

### Paso 1: Crear el modulo

```bash
mkdir -p src/vigil/analyzers/secrets
touch src/vigil/analyzers/secrets/__init__.py
touch src/vigil/analyzers/secrets/analyzer.py
```

### Paso 2: Implementar el protocolo

Ver `src/vigil/analyzers/deps/analyzer.py` para un ejemplo completo.

### Paso 3: Registrar en el engine

En `cli.py`, agregar el analyzer a `_register_analyzers()`.

### Paso 4: Escribir tests

```python
def test_detects_placeholder_secret(tmp_path):
    test_file = tmp_path / "app.py"
    test_file.write_text('SECRET_KEY = "your-api-key-here"\n')

    analyzer = SecretsAnalyzer()
    config = ScanConfig()
    findings = analyzer.analyze([str(test_file)], config)

    assert len(findings) == 1
    assert findings[0].rule_id == "SEC-001"
```

---

## Como agregar una regla

1. Definir en `src/vigil/config/rules.py` (`RULES_V0`).
2. Implementar la deteccion en el analyzer correspondiente.
3. Agregar tests (positivo, negativo, configuracion).
4. Documentar en [Catalogo de Reglas](/vigil-docs/docs/v0-3-0/rules/).

---

## Tests

```bash
# Todos los tests
pytest

# Con cobertura
pytest --cov=vigil --cov-report=term-missing

# Un test especifico
pytest tests/test_core/test_engine.py::test_engine_no_analyzers

# Verbose
pytest -v
```

### Cobertura actual

| Modulo | Tests |
|--------|-------|
| CLI | 53 |
| Core (finding, engine, file_collector) | 93 |
| Config (schema, loader, rules) | 98 |
| Reports (formatters) | 47 |
| Analyzers (deps) | 246 |
| Analyzers (auth) | ~130 |
| Analyzers (secrets) | ~130 |
| Integration | ~97 |
| Logging | 3 |
| **Total** | **~961** |

Cobertura global: **~98%**

---

## Pull requests

### Proceso

1. Crear un branch desde `develop`: `git checkout -b feature/mi-feature develop`
2. Hacer los cambios.
3. Ejecutar tests: `pytest`
4. Ejecutar linter: `ruff check src/ tests/`
5. Crear PR hacia `develop`.

### Checklist del PR

- [ ] Los tests pasan: `pytest`
- [ ] El linter pasa: `ruff check src/ tests/`
- [ ] Se agregaron tests para la nueva funcionalidad.
- [ ] La documentacion se actualizo si aplica.

### Commits

- Mensajes claros en ingles, imperativo: "Add", "Fix", "Remove".
- Prefijos: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.

---

## Fases de desarrollo

| Fase | Descripcion | Estado |
|------|-------------|--------|
| **FASE 0** | Scaffolding, config, engine, CLI, formatters, rule catalog | Completada |
| **FASE 1** | Dependency analyzer (DEP-001, 002, 003, 005, 007) | Completada |
| **FASE 2** | Auth + Secrets analyzers (AUTH-001..007, SEC-001..006) | Completada |
| **FASE 3** | Test quality analyzer (TEST-001..006) | Pendiente |
| **FASE 4** | Reports polish | Pendiente |
| **FASE 5** | Integracion, fixtures realistas, docs | Pendiente |
| **FASE 6** | Popular packages corpus, polish final | Pendiente |
