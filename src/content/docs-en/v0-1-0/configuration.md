---
title: "Configuration"
description: "Complete reference for .vigil.yaml and CLI flags."
order: 3
icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
---

# Configuration

Vigil is configured via a `.vigil.yaml` file at the root of your project, CLI flags, or environment variables. CLI flags always take priority over the configuration file, and environment variables take priority over both.

## Initialization

Generate a configuration file with default values:

```bash
vigil init
# ✓ Created .vigil.yaml
```

## Complete Configuration File

```yaml
# .vigil.yaml — Full Vigil configuration
version: "1"

# Scan options
scan:
  # Directories to scan
  paths:
    - src/
    - lib/
    - app/

  # Exclusion patterns (glob)
  exclude:
    - "**/__pycache__/**"
    - "**/node_modules/**"
    - "**/.venv/**"
    - "**/dist/**"
    - "**/build/**"
    - "**/*.min.js"

  # File extensions to analyze
  extensions:
    - .py
    - .js
    - .ts
    - .jsx
    - .tsx

# Individual rule configuration
rules:
  # Dependencies
  DEP-001:
    enabled: true
    severity: critical
    options:
      registries:
        - pypi
        - npm
        - crates.io
      cache_ttl: 3600          # Verification cache (seconds)

  DEP-002:
    enabled: true
    severity: warning
    options:
      max_age_days: 30         # Minimum age in days

  # Security
  SEC-001:
    enabled: true
    severity: critical
    options:
      sensitive_paths:         # Sensitive path patterns
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
      entropy_threshold: 3.5   # Minimum entropy threshold
      patterns:                # Additional placeholder patterns
        - "your-.*-here"
        - "TODO"
        - "CHANGEME"
        - "example"

  # Tests
  TEST-001:
    enabled: true
    severity: warning
    options:
      min_asserts: 1           # Minimum asserts per test

  TEST-002:
    enabled: false             # Disabled by default
    severity: info

# Output options
output:
  format: human                # human | json | sarif
  colors: true                 # Colorize terminal output
  verbose: false               # Show scanned files
  quiet: false                 # Only show errors
```

## CLI Flags

### `scan` command

```bash
vigil scan [PATH...] [OPTIONS]
```

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--format` | `string` | `human` | Output format: `human`, `json`, `sarif` |
| `--output` | `path` | `stdout` | Output file path |
| `--changed-only` | `flag` | `false` | Only scan files with Git changes |
| `--severity` | `string` | `info` | Minimum severity: `info`, `warning`, `critical` |
| `--config` | `path` | `.vigil.yaml` | Configuration file path |
| `--no-colors` | `flag` | `false` | Disable colored output |
| `--verbose` | `flag` | `false` | Show each scanned file |
| `--quiet` | `flag` | `false` | Only show critical findings |
| `--ignore` | `string[]` | `[]` | Rules to ignore (e.g. `--ignore DEP-002`) |
| `--fail-on` | `string` | `critical` | Minimum severity for exit code 1 |

### `rules` command

```bash
vigil rules [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `--format json` | List rules in JSON format |
| `--enabled-only` | Only show enabled rules |

### `init` command

```bash
vigil init [OPTIONS]
```

| Flag | Description |
|------|-------------|
| `--force` | Overwrite existing file |
| `--minimal` | Generate minimal configuration |

## Environment Variables

All options can be configured via environment variables with the `VIGIL_` prefix:

| Variable | Equivalent |
|----------|------------|
| `VIGIL_FORMAT` | `--format` |
| `VIGIL_SEVERITY` | `--severity` |
| `VIGIL_CONFIG` | `--config` |
| `VIGIL_NO_COLORS` | `--no-colors` |
| `VIGIL_QUIET` | `--quiet` |

Example:

```bash
export VIGIL_FORMAT=json
export VIGIL_SEVERITY=warning
vigil scan src/
# Equivalent to: vigil scan src/ --format json --severity warning
```

## Usage Examples

### Python project with FastAPI

```yaml
# .vigil.yaml
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

### Monorepo with Node.js and Python

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

### CI/CD: Critical errors only

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

## Precedence Order

Configuration resolves with the following priority (highest to lowest):

1. CLI flags (`--format json`)
2. Environment variables (`VIGIL_FORMAT=json`)
3. Configuration file (`.vigil.yaml`)
4. Internal defaults

## Validation

Vigil validates the configuration file at the start of every scan. If there are format errors or invalid values, a descriptive error is shown:

```bash
$ vigil scan src/
✗ Error in .vigil.yaml:
  › Line 15: Value 'extreme' is not valid for severity.
  › Accepted values: info, warning, critical
```
