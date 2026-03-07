---
title: "CLI Reference"
description: "All commands, flags, and options available in the command-line interface."
order: 3
icon: "M4 17l6-6-6-6 M12 19h8"
---

# CLI Reference

vigil runs from the command line. All subcommands, options, and examples are documented below.

## General usage

```bash
vigil [OPTIONS] COMMAND [ARGS]
```

### Global options

| Option | Description |
|--------|-------------|
| `--version` | Show the vigil version |
| `--help` | Show general help |

---

## `vigil scan`

Main command. Scans code looking for security issues specific to AI-generated code.

### Syntax

```bash
vigil scan [PATHS...] [OPTIONS]
```

If no paths are specified, scans the current directory (`.`).

### Options

| Option | Short form | Type | Default | Description |
|--------|------------|------|---------|-------------|
| `--config` | `-c` | PATH | Auto-detect | Path to the `.vigil.yaml` file |
| `--format` | `-f` | `human\|json\|junit\|sarif` | `human` | Output format |
| `--output` | `-o` | PATH | stdout | File to write the report to |
| `--fail-on` | | `critical\|high\|medium\|low` | `high` | Minimum severity to fail (exit 1) |
| `--category` | `-C` | multiple | all | Only run specific categories |
| `--rule` | `-r` | multiple | all | Only run specific rules |
| `--exclude-rule` | `-R` | multiple | none | Exclude specific rules |
| `--language` | `-l` | `python\|javascript` | all | Only scan specific languages |
| `--offline` | | flag | false | Do not make HTTP requests to registries |
| `--changed-only` | | flag | false | Only scan files changed since the last commit |
| `--verbose` | `-v` | flag | false | Detailed output with debug logs |
| `--quiet` | `-q` | flag | false | Only show findings, no summary |

### Examples

```bash
# Scan basico
vigil scan src/

# Scan de multiples directorios
vigil scan src/ lib/ app/

# Solo dependencias y secrets
vigil scan src/ -C dependency -C secrets

# Solo una regla especifica
vigil scan src/ -r DEP-001

# Excluir reglas que no aplican a tu proyecto
vigil scan src/ -R AUTH-003 -R TEST-004

# Solo Python
vigil scan src/ -l python

# Generar reporte SARIF para GitHub Code Scanning
vigil scan src/ -f sarif -o vigil.sarif

# Generar reporte JSON
vigil scan src/ -f json -o report.json

# Generar reporte JUnit para CI dashboards
vigil scan src/ -f junit -o report.xml

# Fallar solo con findings critical
vigil scan src/ --fail-on critical

# Fallar desde medium en adelante
vigil scan src/ --fail-on medium

# Sin HTTP requests (solo checks estaticos)
vigil scan src/ --offline

# Solo archivos cambiados (ideal para pre-commit)
vigil scan --changed-only

# Con archivo de config personalizado
vigil scan src/ -c mi-vigil.yaml

# Output detallado para debugging
vigil scan src/ -v

# Guardar reporte en archivo Y mostrar en terminal (solo formato human)
vigil scan src/ -o report.txt
```

### Output behavior

- **`human` format**: If `--output` is specified, the report is written to the file AND displayed in the terminal.
- **`json`, `junit`, `sarif` formats**: If `--output` is specified, the report is only written to the file. Otherwise, it goes to stdout.
- **`--verbose`**: Debug logs go to stderr. Findings go to stdout. They are never mixed.

---

## `vigil deps`

Specialized subcommand for analyzing dependencies. Runs only the rules in the `dependency` category.

### Syntax

```bash
vigil deps [PATH] [OPTIONS]
```

### Options

| Option | Short form | Type | Default | Description |
|--------|------------|------|---------|-------------|
| `--verify / --no-verify` | | flag | `--verify` | Verify package existence in the registry |
| `--format` | `-f` | `human\|json` | `human` | Output format |
| `--offline` | | flag | false | Do not make HTTP requests |
| `--verbose` | `-v` | flag | false | Detailed output |

### Examples

```bash
# Verificar dependencias del proyecto actual
vigil deps

# Verificar un proyecto especifico
vigil deps /ruta/al/proyecto

# Solo checks estaticos, sin verificar registries
vigil deps --no-verify

# Output JSON
vigil deps -f json
```

### What files it analyzes

vigil automatically detects the following dependency files:

| File | Ecosystem |
|------|-----------|
| `requirements.txt` | PyPI (Python) |
| `requirements-dev.txt` | PyPI (Python) |
| `requirements-test.txt` | PyPI (Python) |
| `pyproject.toml` | PyPI (Python) |
| `setup.py` | PyPI (Python) |
| `setup.cfg` | PyPI (Python) |
| `package.json` | npm (JavaScript) |

---

## `vigil tests`

Specialized subcommand for analyzing test quality. Runs only the rules in the `test-quality` category.

### Syntax

```bash
vigil tests [TEST_PATHS...] [OPTIONS]
```

If no paths are specified, analyzes the `tests/` directory.

### Options

| Option | Short form | Type | Default | Description |
|--------|------------|------|---------|-------------|
| `--format` | `-f` | `human\|json` | `human` | Output format |
| `--min-assertions` | | int | `1` | Minimum assertions per test |
| `--verbose` | `-v` | flag | false | Detailed output |

### Examples

```bash
# Analizar directorio de tests por defecto
vigil tests

# Analizar directorio especifico
vigil tests tests/ spec/

# Requerir al menos 2 assertions por test
vigil tests --min-assertions 2

# Output JSON
vigil tests -f json
```

---

## `vigil init`

Generates a `.vigil.yaml` configuration file with sensible defaults.

### Syntax

```bash
vigil init [PATH] [OPTIONS]
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--strategy` | `strict\|standard\|relaxed` | `standard` | Configuration preset |
| `--force` | flag | false | Overwrite existing file |

### Strategies

| Strategy | `fail_on` | `min_age_days` | `max_token_lifetime_hours` | Recommended use |
|----------|-----------|----------------|---------------------------|-----------------|
| `strict` | `medium` | 60 | 1 | Environments with high compliance requirements |
| `standard` | `high` | 30 | 24 | Most projects |
| `relaxed` | `critical` | 7 | 72 | Prototypes or early-stage projects |

### Examples

```bash
# Generar config con defaults
vigil init

# Generar config estricta
vigil init --strategy strict

# Generar config en otro directorio
vigil init /ruta/al/proyecto

# Sobrescribir config existente
vigil init --force
```

---

## `vigil rules`

Lists all available rules with their descriptions, severities, and references to security standards.

### Syntax

```bash
vigil rules
```

### Example output

```
  DEPENDENCY
  ----------------------------------------
  DEP-001    CRITICAL  Hallucinated dependency
                       Package declared as dependency does not exist in the public registry.
                       [OWASP: LLM03, CWE-829]
  DEP-002    HIGH      Suspiciously new dependency
                       Package exists but was published less than 30 days ago.
                       [OWASP: LLM03]
  ...

  AUTH
  ----------------------------------------
  AUTH-001   HIGH      Unprotected sensitive endpoint
                       Endpoint handling sensitive data without authentication middleware.
                       [OWASP: LLM06, CWE-306]
  ...
```

---

## Exit codes

All scan subcommands (`scan`, `deps`, `tests`) use the same exit codes:

| Code | Constant | Meaning |
|------|----------|---------|
| `0` | `SUCCESS` | No findings above the configured threshold |
| `1` | `FINDINGS` | Findings found above the threshold |
| `2` | `ERROR` | Runtime error |

### Usage in scripts

```bash
# Usar en un script de CI
vigil scan src/ --fail-on high
if [ $? -eq 1 ]; then
    echo "vigil encontro problemas de seguridad"
    exit 1
fi

# Usar con operadores logicos
vigil scan src/ && echo "Limpio" || echo "Hay findings"
```

---

## Alternative invocation

vigil can also be run as a Python module:

```bash
python -m vigil scan src/
python -m vigil --help
```

This is useful when `vigil` is not in the PATH or when working with multiple virtual environments.
