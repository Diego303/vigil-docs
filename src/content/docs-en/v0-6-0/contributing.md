---
title: "Contributing"
description: "Guide to contributing to the project, development setup, and testing."
order: 14
icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
---

Guide for contributing to vigil's development.

## Development setup

### Requirements

- Python 3.12 or higher
- git
- pip

### Clone and configure

```bash
git clone https://github.com/org/vigil.git
cd vigil

# Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate    # Linux/macOS
# .venv\Scripts\activate     # Windows

# Install in development mode with dev dependencies
pip install -e ".[dev]"

# Verify installation
vigil --version
```

### Verify everything works

```bash
# Run tests
pytest

# Run vigil
vigil scan src/
vigil rules
```

---

## Project structure

```
src/vigil/
  cli.py              # Click commands
  config/             # Configuration (schema, loader, rules)
  core/               # Models and engine (finding, engine, file_collector)
  analyzers/          # Analyzers (detection logic)
    base.py           #   BaseAnalyzer Protocol
    deps/             #   DependencyAnalyzer (parsers, registry, similarity)
    auth/             #   AuthAnalyzer (endpoints, middleware, patterns)
    secrets/          #   SecretsAnalyzer (placeholders, entropy, env tracing)
    tests/            #   TestQualityAnalyzer (assertions, mocks, coverage heuristics)
  reports/            # Output formatters
  logging/            # structlog setup
tests/
  test_cli.py         # CLI tests
  test_cli_edge_cases.py # CLI edge cases
  test_integration.py # Basic integration tests
  test_integration_e2e.py # End-to-end tests with real fixtures
  test_changed_only.py # Tests for _get_changed_files()
  test_main_module.py # Tests for python -m vigil and BaseAnalyzer protocol
  test_fase5_qa.py    # PHASE 5 QA regression tests
  test_core/          # Core tests
  test_config/        # Configuration tests
  test_reports/       # Formatter tests
  test_analyzers/     # Analyzer tests
    test_deps/        #   DependencyAnalyzer tests
    test_auth/        #   AuthAnalyzer tests
    test_secrets/     #   SecretsAnalyzer tests
    test_tests/       #   TestQualityAnalyzer tests
  fixtures/           # Test files
    deps/             #   Dependency fixtures
    auth/             #   Auth fixtures
    secrets/          #   Secrets fixtures
    tests/            #   Test quality fixtures
    integration/      #   End-to-end fixtures
      insecure_project/ # AI-generated project with vulnerabilities
      clean_project/    # Clean project (no findings)
docs/                 # Documentation
```

---

## Code conventions

### Python

- **Version**: Python 3.12+. Use `str | None` instead of `Optional[str]`.
- **Type hints**: All public functions must have complete type hints.
- **Linter**: ruff with target `py312` and line-length 100.
- **Formatter**: ruff format.

```bash
# Lint
ruff check src/ tests/

# Format
ruff format src/ tests/
```

### Naming

- Classes: `PascalCase` (`ScanEngine`, `HumanFormatter`).
- Functions and variables: `snake_case` (`collect_files`, `rule_id`).
- Constants: `UPPER_SNAKE_CASE` (`SEVERITY_SORT_ORDER`, `LANGUAGE_EXTENSIONS`).
- Files: `snake_case.py`.

### Imports

Order: stdlib, third-party, local. Ruff handles ordering.

```python
import json
from pathlib import Path

import structlog
from pydantic import BaseModel

from vigil.core.finding import Finding, Severity
```

### Logging

- Always use `structlog`. Never `print()`.
- Logs go to stderr (never to stdout).
- Messages as snake_case keys: `logger.info("files_collected", count=42)`.

### Models

- **Pydantic v2**: For user configuration (requires validation).
- **dataclasses**: For internal models (Finding, Location, RuleDefinition).
- **Protocol**: For interfaces (BaseAnalyzer, BaseFormatter).

---

## How to implement an analyzer

Analyzers are vigil's detection logic. Each analyzer implements the `BaseAnalyzer` protocol.

### Step 1: Create the module

For analyzers with multiple components, create a subpackage:

```bash
# Example: secrets analyzer
mkdir -p src/vigil/analyzers/secrets
touch src/vigil/analyzers/secrets/__init__.py
touch src/vigil/analyzers/secrets/analyzer.py
```

For simple analyzers, a single file is sufficient.

### Step 2: Implement the protocol

Reference: see `src/vigil/analyzers/deps/analyzer.py` for a complete example.

```python
"""Secrets and credentials analyzer."""

import structlog

from vigil.config.schema import ScanConfig
from vigil.core.finding import Category, Finding, Location, Severity

logger = structlog.get_logger()


class SecretsAnalyzer:
    """Detects hardcoded secrets and placeholders."""

    @property
    def name(self) -> str:
        return "secrets"

    @property
    def category(self) -> Category:
        return Category.SECRETS

    def analyze(self, files: list[str], config: ScanConfig) -> list[Finding]:
        findings: list[Finding] = []

        for file_path in files:
            if not file_path.endswith(".py"):
                continue
            try:
                with open(file_path) as f:
                    content = f.read()
                findings.extend(self._check_file(file_path, content, config))
            except OSError:
                logger.warning("file_read_error", file=file_path)

        return findings

    def _check_file(
        self, file_path: str, content: str, config: ScanConfig
    ) -> list[Finding]:
        findings: list[Finding] = []
        # ... implement checks ...
        return findings
```

### Step 3: Register in the engine

In `cli.py`, add the analyzer to `_register_analyzers()`:

```python
def _register_analyzers(engine: ScanEngine) -> None:
    from vigil.analyzers.deps import DependencyAnalyzer
    from vigil.analyzers.auth import AuthAnalyzer
    from vigil.analyzers.secrets import SecretsAnalyzer
    from vigil.analyzers.tests import TestQualityAnalyzer

    engine.register_analyzer(DependencyAnalyzer())
    engine.register_analyzer(AuthAnalyzer())
    engine.register_analyzer(SecretsAnalyzer())
    engine.register_analyzer(TestQualityAnalyzer())
```

### Step 4: Write tests

```python
# tests/test_analyzers/test_secrets/test_analyzer.py
from vigil.analyzers.secrets import SecretsAnalyzer
from vigil.config.schema import ScanConfig


def test_detects_placeholder_secret(tmp_path):
    # Create test file
    test_file = tmp_path / "app.py"
    test_file.write_text('SECRET_KEY = "your-api-key-here"\n')

    analyzer = SecretsAnalyzer()
    config = ScanConfig()
    findings = analyzer.analyze([str(test_file)], config)

    assert len(findings) == 1
    assert findings[0].rule_id == "SEC-001"
    assert findings[0].severity.value == "critical"
```

### Analyzer rules

1. **Deterministic**: Same input = same output. No randomness.
2. **No side effects**: Do not modify files, do not write to stdout.
3. **Robust**: Catch I/O errors per file, not per complete scan.
4. **Efficient**: Read each file only once, use early returns.
5. **Configurable**: Respect thresholds and options from `ScanConfig`.

---

## How to add a rule

### Step 1: Define in the catalog

In `src/vigil/config/rules.py`, add to the `RULES_V0` list:

```python
RuleDefinition(
    id="SEC-007",
    name="My new rule",
    description="Description of what this rule detects.",
    category=Category.SECRETS,
    default_severity=Severity.HIGH,
    owasp_ref="LLM02",
    cwe_ref="CWE-798",
),
```

### Step 2: Implement the detection

In the corresponding analyzer, add the logic that creates a `Finding` with `rule_id="SEC-007"`.

### Step 3: Add tests

- Positive test: vulnerable code is detected.
- Negative test: secure code does not generate findings.
- Configuration test: the rule respects overrides.

### Step 4: Document

Add the rule to [rules](/vigil-docs/en/docs/v0-6-0/rules/) with:
- Severity and OWASP/CWE references.
- What it detects.
- Vulnerable code example.
- How to fix it.

---

## Tests

### Running

```bash
# All tests
pytest

# With coverage
pytest --cov=vigil --cov-report=term-missing

# A specific file
pytest tests/test_core/test_engine.py

# A specific test
pytest tests/test_core/test_engine.py::test_engine_no_analyzers

# Verbose
pytest -v
```

### Test structure

- Each module has its corresponding test directory.
- Global fixtures in `tests/conftest.py`.
- Test files in `tests/fixtures/`.

### Test conventions

- Descriptive names: `test_detects_placeholder_secret`, not `test_1`.
- One logical assert per test (can be multiple `assert` statements if they verify the same thing).
- Use pytest's `tmp_path` for temporary files.
- Use fixtures for reusable configurations.
- Do not use mocks except for external I/O (HTTP, filesystem).

### Current coverage

| Module | Tests |
|--------|-------|
| CLI | 53 |
| Core (finding) | 28 |
| Core (engine) | 29 |
| Core (file_collector) | 36 |
| Config (schema) | 25 |
| Config (loader) | 39 |
| Config (rules) | 34 |
| Reports (formatters) | 47 |
| Reports (formatters edge cases) | ~50 |
| Reports (PHASE 4 features) | 77 |
| Reports (PHASE 4 QA) | 89 |
| Analyzers (deps) | 120 |
| Analyzers (deps) QA | 126 |
| Analyzers (auth) | ~130 |
| Analyzers (secrets) | ~130 |
| Analyzers (test-quality) | ~128 |
| Analyzers (test-quality) QA | 81 |
| Integration basic | 14 |
| Integration QA (deps) | 13 |
| Integration (auth+secrets) | ~70 |
| Integration E2E (PHASE 5) | 52 |
| Changed-only (PHASE 5) | 11 |
| Main module + protocol (PHASE 5) | 8 |
| QA regression (PHASE 5) | 111 |
| Logging | 3 |
| **Total** | **1518** |

Overall coverage: **~98%** (99% in reports module)

---

## Pull requests

### Process

1. Create a branch from `develop`: `git checkout -b feature/my-feature develop`
2. Make the changes.
3. Run tests: `pytest`
4. Run linter: `ruff check src/ tests/`
5. Create PR targeting `develop`.

### PR checklist

- [ ] Tests pass: `pytest`
- [ ] Linter passes: `ruff check src/ tests/`
- [ ] Tests were added for the new functionality.
- [ ] Documentation was updated if applicable.
- [ ] CHANGELOG.md was updated.

### Commits

- Clear and descriptive messages in English.
- Use imperative verbs: "Add", "Fix", "Remove", not "Added", "Fixed".
- Useful prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.

```
feat: add secrets analyzer with SEC-001 and SEC-002
fix: handle empty requirements.txt in dependency analyzer
docs: add architecture documentation
test: add tests for SARIF formatter edge cases
```

---

## Development phases

vigil is developed in incremental phases:

| Phase | Description | Status |
|-------|-------------|--------|
| **PHASE 0** | Scaffolding, config, engine, CLI, formatters, rule catalog | Completed (QA done) |
| **PHASE 1** | Dependency analyzer (DEP-001, 002, 003, 005, 007) | Completed (QA done) |
| **PHASE 2** | Auth + Secrets analyzers (AUTH-001..007, SEC-001..006) | Completed (QA done) |
| **PHASE 3** | Test quality analyzer (TEST-001..006) | Completed (QA done) |
| **PHASE 4** | Reports polish (formatters, summary, icons, SARIF 2.1.0) | Completed (QA done) |
| **PHASE 5** | Integration, realistic fixtures, docs, exhaustive QA | Completed (QA done) |
| **PHASE 6** | Popular packages corpus, final polish | Pending |

See `SEGUIMIENTO-V0.md` for the detailed status of each phase.

---

## Contact

- **Issues**: Report bugs and suggest features in the GitHub repository.
- **PRs**: Always welcome. For large changes, open an issue first to discuss the approach.
