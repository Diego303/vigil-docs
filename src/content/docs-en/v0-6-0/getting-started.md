---
title: "Quick Start"
description: "Installation, first scan, and basic concepts."
order: 2
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---

## Prerequisites

- Python 3.12 or higher
- pip (included with Python)
- git (optional, required for `--changed-only`)

## Installation

### From PyPI

```bash
pip install vigil-ai-cli
```

### From source (development)

```bash
git clone https://github.com/Diego303/vigil-cli.git
cd vigil
python3.12 -m venv .venv
source .venv/bin/activate    # Linux/macOS
# .venv\Scripts\activate     # Windows
pip install -e ".[dev]"
```

### Verify installation

```bash
vigil --version
# vigil, version 0.6.0
```

## First scan

Run vigil on your project directory:

```bash
vigil scan src/
```

Example output when there are no issues:

```
  vigil v0.6.0 — scanned 42 files

  No findings.

  -------------------------------------------------
  42 files scanned in 0.5s
  0 findings
```

Example output with findings:

```
  vigil v0.6.0 — scanned 42 files

  X CRITICAL  DEP-001  requirements.txt:14
    Package 'python-jwt-utils' does not exist in pypi.
    This is likely a hallucinated dependency from an AI agent.
    -> Suggestion: Remove 'python-jwt-utils' and find the correct package name.

  X HIGH      AUTH-005  src/main.py:8
    CORS configured with '*' allowing requests from any origin.
    -> Suggestion: Restrict CORS to specific trusted origins.

  -------------------------------------------------
  42 files scanned in 1.2s
  2 findings: 1 critical, 1 high
  analyzers: dependency, auth
```

## Basic concepts

### What is a finding

A **finding** is a security issue detected by vigil. Each finding has:

- **rule_id**: Unique identifier for the rule (e.g., `DEP-001`, `AUTH-005`)
- **severity**: Severity level (`critical`, `high`, `medium`, `low`, `info`)
- **message**: Description of the detected issue
- **location**: File and line where it was detected
- **suggestion**: Concrete recommendation for fixing it

### Severity levels

| Level | Meaning | Exit code |
|-------|---------|-----------|
| `critical` | Must be fixed before merge. Immediate security risk. | 1 |
| `high` | Should be fixed before merge. Significant risk. | 1 |
| `medium` | Should be fixed, not necessarily before merge. | 0* |
| `low` | Informational, good practice. | 0* |
| `info` | Informational only, not a problem. | 0* |

*By default, vigil fails (exit code 1) for findings at `high` or above. This can be changed with `--fail-on`.

### Categories

vigil organizes its rules into categories:

| Category | Prefix | What it detects |
|----------|--------|-----------------|
| Dependency Hallucination | `DEP-` | Packages that don't exist, typosquatting, suspiciously new packages |
| Auth & Permission | `AUTH-` | Endpoints without auth, open CORS, insecure JWT, cookies without flags |
| Secrets & Credentials | `SEC-` | Secret placeholders, hardcoded credentials, connection strings |
| Test Quality | `TEST-` | Tests without asserts, trivial asserts, tests skipped without reason |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No findings above the threshold |
| `1` | Findings found above the threshold |
| `2` | Execution error (invalid config, network error, etc.) |

## What is active now

In the current version (v0.6.0), all four analyzers are fully functional:

### Dependency Analyzer (DEP-001 through DEP-007)
- Detects packages that don't exist in PyPI/npm (slopsquatting)
- Detects names similar to popular packages (typosquatting)
- Verifies that pinned versions exist
- Detects suspiciously new packages and packages without a source repository

### Auth Analyzer (AUTH-001 through AUTH-007)
- Detects endpoints without authentication middleware
- Detects CORS configured with `*`
- Detects JWT with excessive lifetime or hardcoded secret
- Detects cookies without security flags
- Detects non timing-safe password comparison

### Secrets Analyzer (SEC-001 through SEC-006)
- Detects placeholders copied from documentation or `.env.example`
- Detects secrets with low entropy (AI-generated)
- Detects connection strings with embedded credentials
- Detects environment variables with sensitive defaults

### Test Quality Analyzer (TEST-001 through TEST-006)
- Detects tests without assertions (test theater)
- Detects trivial assertions (`assert True`, `toBeTruthy()`)
- Detects catch-all exceptions in tests
- Detects skipped tests without justification
- Detects API tests without status code verification
- Detects mock mirrors (test only verifies that the mock works)

```bash
# Full scan (deps + auth + secrets + tests)
vigil scan src/

# Dependencies only
vigil deps

# Test quality only
vigil tests tests/

# Static checks only (no HTTP)
vigil scan src/ --offline
```

## Next steps

- Generate a configuration file: `vigil init`
- Explore all rules: `vigil rules`
- Analyze dependencies only: `vigil deps --verify`
- Analyze test quality only: `vigil tests tests/`
- Integrate vigil into your CI/CD: see [CI/CD Integration](/vigil-docs/en/docs/v0-6-0/ci-cd/)
- Check the active analyzers: see [Analyzers](/vigil-docs/en/docs/v0-6-0/analyzers/)
- Check the full CLI reference: see [CLI Reference](/vigil-docs/en/docs/v0-6-0/cli/)
