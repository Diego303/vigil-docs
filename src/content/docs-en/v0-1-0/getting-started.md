---
title: "Quick Start"
description: "Installation, first scan, and basic concepts."
order: 2
icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z"
---

# Quick Start

## Prerequisites

- Python 3.12 or higher
- pip (included with Python)
- git (optional, needed for `--changed-only`)

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
# vigil, version 0.1.0
```

## First Scan

Run vigil on your project directory:

```bash
vigil scan src/
```

Example output when no issues are found:

```
  vigil v0.1.0 — scanned 42 files

  No findings.

  -------------------------------------------------
  42 files scanned in 0.5s
  0 findings
```

Example output with findings:

```
  vigil v0.1.0 — scanned 42 files

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

## Basic Concepts

### What is a finding

A **finding** is a security issue detected by vigil. Each finding has:

- **rule_id**: Unique rule identifier (e.g. `DEP-001`, `AUTH-005`)
- **severity**: Severity level (`critical`, `high`, `medium`, `low`, `info`)
- **message**: Description of the detected issue
- **location**: File and line where it was detected
- **suggestion**: Concrete recommendation to fix it

### Severity levels

| Level | Meaning | Exit code |
|-------|---------|-----------|
| `critical` | Must be fixed before merge. Immediate security risk. | 1 |
| `high` | Should be fixed before merge. Significant risk. | 1 |
| `medium` | Should be fixed, not necessarily before merge. | 0* |
| `low` | Informational, good practice. | 0* |
| `info` | Informational only, not an issue. | 0* |

*By default, vigil fails (exit code 1) on `high` or higher findings. This can be changed with `--fail-on`.

### Categories

vigil organizes its rules into categories:

| Category | Prefix | What it detects |
|----------|--------|-----------------|
| Dependency Hallucination | `DEP-` | Non-existent packages, typosquatting, suspiciously new packages |
| Auth & Permission | `AUTH-` | Endpoints without auth, open CORS, insecure JWT, cookies without flags |
| Secrets & Credentials | `SEC-` | Placeholder secrets, hardcoded credentials, connection strings |
| Test Quality | `TEST-` | Tests without asserts, trivial asserts, tests skipped without reason |

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | No findings above the threshold |
| `1` | Findings found above the threshold |
| `2` | Execution error (invalid config, network error, etc.) |

## Next Steps

- Generate a configuration file: `vigil init`
- Explore all rules: `vigil rules`
- Analyze only dependencies: `vigil deps --verify`
- Analyze only test quality: `vigil tests tests/`
- Integrate vigil into your CI/CD: see [CI/CD Integration](/vigil-docs/en/docs/v0-1-0/ci-cd/)
- Check the full CLI reference: see [CLI Reference](/vigil-docs/en/docs/v0-1-0/cli/)
