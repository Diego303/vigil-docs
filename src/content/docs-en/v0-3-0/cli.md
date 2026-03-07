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

Main command. Scans code for security issues specific to AI-generated code.

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
# Basic scan
vigil scan src/

# Scan multiple directories
vigil scan src/ lib/ app/

# Dependencies and secrets only
vigil scan src/ -C dependency -C secrets

# Only a specific rule
vigil scan src/ -r DEP-001

# Exclude rules that don't apply to your project
vigil scan src/ -R AUTH-003 -R TEST-004

# Python only
vigil scan src/ -l python

# Generate SARIF report for GitHub Code Scanning
vigil scan src/ -f sarif -o vigil.sarif

# Generate JSON report
vigil scan src/ -f json -o report.json

# Generate JUnit report for CI dashboards
vigil scan src/ -f junit -o report.xml

# Fail only with critical findings
vigil scan src/ --fail-on critical

# Fail from medium and above
vigil scan src/ --fail-on medium

# No HTTP requests (static checks only)
vigil scan src/ --offline

# Changed files only (ideal for pre-commit)
vigil scan --changed-only

# With a custom config file
vigil scan src/ -c my-vigil.yaml

# Detailed output for debugging
vigil scan src/ -v

# Save report to file AND display in terminal (human format only)
vigil scan src/ -o report.txt
```

### Output behavior

- **`human` format**: If `--output` is specified, the report is written to the file AND displayed in the terminal.
- **`json`, `junit`, `sarif` formats**: If `--output` is specified, the report is only written to the file. If not, it is displayed on stdout.
- **`--verbose`**: Debug logs go to stderr. Findings go to stdout. They are never mixed.

---

## `vigil deps`

Specialized subcommand for analyzing dependencies. Only runs rules from the `dependency` category.

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
# Verify dependencies of the current project
vigil deps

# Verify a specific project
vigil deps /path/to/project

# Static checks only, without verifying registries
vigil deps --no-verify

# JSON output
vigil deps -f json
```

### Files analyzed

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

Specialized subcommand for analyzing test quality. Only runs rules from the `test-quality` category.

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
# Analyze the default tests directory
vigil tests

# Analyze a specific directory
vigil tests tests/ spec/

# Require at least 2 assertions per test
vigil tests --min-assertions 2

# JSON output
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
# Generate config with defaults
vigil init

# Generate strict config
vigil init --strategy strict

# Generate config in another directory
vigil init /path/to/project

# Overwrite existing config
vigil init --force
```

---

## `vigil rules`

Lists all available rules with their descriptions, severities, and standard references.

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
# Use in a CI script
vigil scan src/ --fail-on high
if [ $? -eq 1 ]; then
    echo "vigil found security issues"
    exit 1
fi

# Use with logical operators
vigil scan src/ && echo "Clean" || echo "Findings found"
```

---

## Alternative invocation

vigil can also be run as a Python module:

```bash
python -m vigil scan src/
python -m vigil --help
```

This is useful when `vigil` is not in the PATH or when working with multiple virtual environments.
