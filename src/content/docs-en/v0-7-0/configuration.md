---
title: "Configuration"
description: ".vigil.yaml file, strategies, overrides, and config merge."
order: 4
icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
---

vigil is configured through a YAML file, CLI flags, or a combination of both. The configuration follows a three-layer model with progressive merging.

## Precedence order

```
Defaults (code) < YAML file (.vigil.yaml) < CLI flags
```

CLI flags always have the highest priority. This allows having a base configuration file for the team and making specific adjustments per execution.

## Configuration file

### Creation

```bash
# Generate with defaults
vigil init

# Generate with strict strategy
vigil init --strategy strict

# Generate in a specific directory
vigil init /path/to/project
```

### Supported names

vigil automatically looks for these files, in this order:

1. `.vigil.yaml`
2. `.vigil.yml`
3. `vigil.yaml`
4. `vigil.yml`

The search starts in the current directory and goes up the directory tree to the root. This allows having a configuration file at the monorepo root that applies to all subprojects.

### Specifying an explicit path

```bash
vigil scan src/ --config /path/to/my-config.yaml
```

---

## Complete reference

### General configuration

```yaml
# Directories to include in the scan
include:
  - "src/"
  - "lib/"
  - "app/"

# Directories and patterns to exclude
exclude:
  - "node_modules/"
  - ".venv/"
  - "__pycache__/"
  - ".git/"
  - "dist/"
  - "build/"
  - ".tox/"
  - ".mypy_cache/"

# Test directories (used by the `vigil tests` subcommand)
test_dirs:
  - "tests/"
  - "test/"
  - "__tests__/"

# Minimum severity to fail with exit code 1
# Options: critical, high, medium, low
fail_on: "high"

# Languages to scan
# Options: python, javascript
languages:
  - python
  - javascript
```

### Dependencies (`deps`)

Configuration for the dependency analyzer (CAT-01).

```yaml
deps:
  # Verify package existence in PyPI/npm via HTTP
  verify_registry: true

  # Minimum age in days to consider a package safe
  # Packages newer than this trigger DEP-002
  min_age_days: 30

  # Minimum weekly downloads to consider a package safe
  # Packages with fewer downloads trigger DEP-004
  min_weekly_downloads: 100

  # Similarity threshold for typosquatting detection (0.0 to 1.0)
  # Higher values = fewer false positives, more false negatives
  # 0.85 is a good balance
  similarity_threshold: 0.85

  # Cache TTL for registry responses (in hours)
  # Avoids making the same HTTP request twice in 24 hours
  cache_ttl_hours: 24

  # Offline mode: do not make any HTTP requests
  # Only runs static checks (similarity, undeclared imports)
  offline_mode: false

  # Path to a custom popular packages file (JSON)
  # By default uses the bundled corpus in data/
  # popular_packages_file: "/path/to/my-packages.json"
```

### Authentication (`auth`)

Configuration for the authentication patterns analyzer (CAT-02).

```yaml
auth:
  # Maximum lifetime in hours for a JWT
  # Tokens with longer lifetime trigger AUTH-003
  max_token_lifetime_hours: 24

  # Require authentication on mutating endpoints (PUT, DELETE, PATCH)
  # If true, mutating endpoints without auth middleware trigger AUTH-002
  require_auth_on_mutating: true

  # Allow CORS with localhost in development mode
  # If true, `cors(origin: 'http://localhost:*')` does not trigger AUTH-005
  cors_allow_localhost: true
```

### Secrets (`secrets`)

Configuration for the secrets and credentials analyzer (CAT-03).

```yaml
secrets:
  # Minimum Shannon entropy (bits/character) to consider a string as a secret
  # Typical values: < 3.0 = placeholder, > 4.5 = real secret
  min_entropy: 3.0

  # Compare values in code with those from .env.example
  # If a value in code matches one from .env.example, triggers SEC-006
  check_env_example: true

  # Regex patterns for known placeholders
  # If a value assigned to a sensitive variable matches these patterns, triggers SEC-001
  # The default includes 30 patterns (see schema.py for the full list)
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
  # Minimum assertions required per test function
  # Tests with fewer assertions trigger TEST-001
  min_assertions_per_test: 1

  # Detect trivial assertions (assert True, assert x is not None)
  detect_trivial_asserts: true

  # Detect mocks that exactly replicate the implementation
  detect_mock_mirrors: true
```

### Output

```yaml
output:
  # Output format: human, json, junit, sarif
  format: "human"

  # Output file (null = stdout)
  output_file: null

  # Use ANSI colors in the terminal
  colors: true

  # Detailed output
  verbose: false

  # Show fix suggestions
  show_suggestions: true
```

---

## Rule overrides

You can disable individual rules or change their severity.

```yaml
rules:
  # Disable a rule completely
  AUTH-003:
    enabled: false

  # Change the severity of a rule
  DEP-004:
    severity: "low"

  # Combine: enable with a different severity
  TEST-002:
    enabled: true
    severity: "high"
```

### Common overrides

```yaml
rules:
  # If your project intentionally uses long-lived tokens
  AUTH-003:
    enabled: false

  # If you have internal dependencies with few downloads
  DEP-004:
    severity: "low"

  # If you allow open CORS in development
  AUTH-005:
    severity: "medium"

  # If your tests use a custom framework without standard assertions
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
project/
  .vigil.yaml            # Team base config (committed)
  .vigil.strict.yaml     # Config for production
  .vigil.dev.yaml        # Config for local development
```

```bash
# Local development
vigil scan src/

# CI pipeline for production
vigil scan src/ --config .vigil.strict.yaml
```

---

## Environment variables

vigil does not read environment variables directly for its configuration. All configuration is done via YAML or CLI flags. This is intentional to keep the tool deterministic and avoid unexpected behavior.

If you need dynamic configuration, you can generate the YAML file as part of your pipeline:

```bash
# Example: generate config dynamically based on the environment
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

### Clearing the cache

```bash
rm -rf ~/.cache/vigil/registry/
```

### Disabling the cache

There is no explicit option to disable it. You can use `cache_ttl_hours: 0` to force fresh requests on each run, or `--offline` to not make requests at all.
