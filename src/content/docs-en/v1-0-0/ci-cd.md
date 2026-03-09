---
title: "CI/CD Integration"
description: "GitHub Actions, GitLab CI, Azure DevOps, pre-commit hooks, and quality gates."
order: 7
icon: "M17 1l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 23l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3"
---

vigil is designed to integrate easily into CI/CD pipelines. Its deterministic exit codes, multiple output formats, and offline mode make it ideal for automation.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | No findings above the threshold |
| `1` | Findings found above the threshold |
| `2` | Execution error |

The threshold is configured with `--fail-on` (default: `high`).

---

## GitHub Actions

### Basic scan

```yaml
name: vigil Security Scan

on:
  push:
    branches: [main]
  pull_request:

jobs:
  vigil:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install vigil
        run: pip install vigil-ai-cli

      - name: Run vigil
        run: vigil scan src/ --fail-on high
```

### With SARIF report (GitHub Code Scanning)

```yaml
name: vigil SARIF

on:
  push:
    branches: [main]
  pull_request:

jobs:
  vigil:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install vigil
        run: pip install vigil-ai-cli

      - name: Run vigil
        run: vigil scan src/ -f sarif -o vigil.sarif
        continue-on-error: true

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: vigil.sarif
```

Findings appear in the **Security > Code scanning alerts** tab of the repository.

### With dependency cache

```yaml
      - name: Cache vigil registry
        uses: actions/cache@v4
        with:
          path: ~/.cache/vigil/registry/
          key: vigil-registry-${{ hashFiles('**/requirements*.txt', '**/package.json') }}
          restore-keys: |
            vigil-registry-
```

### Only changed files in PR

```yaml
      - name: Run vigil on changed files
        run: vigil scan --changed-only --fail-on high
```

### Recommended complete workflow

```yaml
name: vigil

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Cache pip
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: pip-vigil-${{ hashFiles('pyproject.toml') }}

      - name: Cache vigil registry
        uses: actions/cache@v4
        with:
          path: ~/.cache/vigil/registry/
          key: vigil-registry-${{ hashFiles('**/requirements*.txt', '**/package.json') }}
          restore-keys: vigil-registry-

      - name: Install vigil
        run: pip install vigil-ai-cli

      - name: Security scan
        run: vigil scan src/ -f sarif -o vigil.sarif --fail-on high
        continue-on-error: true

      - name: Upload SARIF
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: vigil.sarif

      - name: Check exit code
        run: vigil scan src/ --fail-on high --quiet
```

---

## GitLab CI

### Basic scan

```yaml
vigil:
  image: python:3.12-slim
  stage: test
  script:
    - pip install vigil-ai-cli
    - vigil scan src/ --fail-on high
```

### With JUnit report

```yaml
vigil:
  image: python:3.12-slim
  stage: test
  script:
    - pip install vigil-ai-cli
    - vigil scan src/ -f junit -o report.xml --fail-on high
  artifacts:
    reports:
      junit: report.xml
    when: always
```

Findings appear in the merge request as failed tests in the **Tests** tab.

### With JSON report as artifact

```yaml
vigil:
  image: python:3.12-slim
  stage: test
  script:
    - pip install vigil-ai-cli
    - vigil scan src/ -f json -o vigil-report.json
  artifacts:
    paths:
      - vigil-report.json
    when: always
  allow_failure:
    exit_codes:
      - 1
```

### Complete pipeline

```yaml
stages:
  - test

vigil-full:
  image: python:3.12-slim
  stage: test
  script:
    - pip install vigil-ai-cli
    - vigil scan src/ -f junit -o report.xml
    - vigil scan src/ -f json -o report.json
  artifacts:
    reports:
      junit: report.xml
    paths:
      - report.json
    when: always
  cache:
    key: vigil-registry
    paths:
      - ~/.cache/vigil/registry/
```

---

## Azure DevOps

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '3.12'

  - script: pip install vigil-ai-cli
    displayName: 'Install vigil'

  - script: vigil scan src/ -f junit -o $(Build.ArtifactStagingDirectory)/vigil-report.xml
    displayName: 'Run vigil'
    continueOnError: true

  - task: PublishTestResults@2
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: '**/vigil-report.xml'
    condition: always()
```

---

## Pre-commit hooks

### With pre-commit framework

Create or edit `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: vigil
        name: vigil security scan
        entry: vigil scan --changed-only --fail-on high --quiet
        language: python
        additional_dependencies: ['vigil-ai-cli']
        always_run: true
        pass_filenames: false
```

Install:

```bash
pip install pre-commit
pre-commit install
```

Now vigil runs automatically before each commit, scanning only the changed files.

### Manual git hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
set -e

# Only scan changed files for speed
vigil scan --changed-only --fail-on high --quiet

if [ $? -eq 1 ]; then
    echo ""
    echo "vigil found security issues. Fix them before committing."
    echo "Run 'vigil scan --changed-only' to see the details."
    exit 1
fi
```

```bash
chmod +x .git/hooks/pre-commit
```

### Pre-commit recommendations

- Use `--changed-only` to keep the scan fast (only staged files).
- Use `--quiet` to reduce output in the normal flow.
- Use `--offline` if you don't want the hook to depend on internet connectivity.
- Configure `--fail-on critical` if the full scan is too strict for the local development flow.

---

## Quality gates

### Strategy by environment

```bash
# Local development (pre-commit): only block critical
vigil scan --changed-only --fail-on critical --quiet

# PR / merge request: block high and above
vigil scan src/ --fail-on high

# Release / production: block from medium
vigil scan src/ --fail-on medium --config .vigil.strict.yaml
```

### With dedicated config files

```
project/
  .vigil.yaml              # Default config (standard)
  .vigil.strict.yaml       # Config for production CI
  .vigil.dev.yaml          # Config for local development
```

```bash
# CI
vigil scan src/ --config .vigil.strict.yaml

# Local
vigil scan src/ --config .vigil.dev.yaml
```

### Progressive fail-on

An effective strategy is to start relaxed and gradually raise the bar:

1. **Week 1**: `--fail-on critical` — only block hallucinated dependencies and critical secrets.
2. **Week 2**: `--fail-on high` — add endpoints without auth, open CORS.
3. **Week 3**: `--fail-on medium` — add insecure cookies, trivial tests.

This prevents vigil from blocking the team when first introduced.

---

## Offline mode

In environments without internet access (isolated runners, air-gapped environments):

```bash
vigil scan src/ --offline
```

In offline mode, vigil:
- Does not make HTTP requests to PyPI or npm.
- Runs all static checks that don't require a network.
- **Does run:** DEP-003 (typosquatting by name similarity — doesn't require a network), and all static analyzers (AUTH-001..007, SEC-001..006, TEST-001..006).
- **Does not run:** DEP-001 (nonexistent package), DEP-002 (new package), DEP-005 (no source repo), DEP-007 (nonexistent version).

This is useful for:
- CI runners without internet access.
- Corporate environments with restrictive proxies.
- Runs where speed is critical (no network latency).

---

## Integration with other tools

### With tox

```ini
# tox.ini
[testenv:security]
deps = vigil-ai-cli
commands = vigil scan src/ --fail-on high
```

### With Makefile

```makefile
.PHONY: security
security:
	vigil scan src/ --fail-on high

.PHONY: security-report
security-report:
	vigil scan src/ -f json -o reports/vigil.json
	vigil scan src/ -f sarif -o reports/vigil.sarif
```

### With nox (Python)

```python
# noxfile.py
import nox

@nox.session
def security(session):
    session.install("vigil-ai-cli")
    session.run("vigil", "scan", "src/", "--fail-on", "high")
```
