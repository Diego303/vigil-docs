---
title: "Contributing"
description: "Guide to contributing to the project, development setup, and testing."
order: 14
icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
---

# Contributing

Guide to contributing to the development of vigil.

## Development setup

### Requirements

- Python 3.12 or higher
- git
- pip

### Clone and configure

```bash
git clone https://github.com/Diego303/vigil-cli.git
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

### Verify that everything works

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
    deps/             #   DependencyAnalyzer
    auth/             #   AuthAnalyzer
    secrets/          #   SecretsAnalyzer
  reports/            # Output formatters
  logging/            # structlog setup
tests/
  test_cli.py         # CLI tests
  test_core/          # Core tests
  test_config/        # Configuration tests
  test_reports/       # Formatter tests
  test_analyzers/     # Analyzer tests
  fixtures/           # Test files
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

- Classes: `PascalCase`
- Functions and variables: `snake_case`
- Constants: `UPPER_SNAKE_CASE`
- Files: `snake_case.py`

### Models

- **Pydantic v2**: For user configuration (requires validation).
- **dataclasses**: For internal models (Finding, Location, RuleDefinition).
- **Protocol**: For interfaces (BaseAnalyzer, BaseFormatter).

---

## How to implement an analyzer

### Step 1: Create the module

```bash
mkdir -p src/vigil/analyzers/secrets
touch src/vigil/analyzers/secrets/__init__.py
touch src/vigil/analyzers/secrets/analyzer.py
```

### Step 2: Implement the protocol

See `src/vigil/analyzers/deps/analyzer.py` for a complete example.

### Step 3: Register in the engine

In `cli.py`, add the analyzer to `_register_analyzers()`.

### Step 4: Write tests

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

## How to add a rule

1. Define it in `src/vigil/config/rules.py` (`RULES_V0`).
2. Implement the detection in the corresponding analyzer.
3. Add tests (positive, negative, configuration).
4. Document in [Rule Catalog](/vigil-docs/en/docs/v0-3-0/rules/).

---

## Tests

```bash
# All tests
pytest

# With coverage
pytest --cov=vigil --cov-report=term-missing

# A specific test
pytest tests/test_core/test_engine.py::test_engine_no_analyzers

# Verbose
pytest -v
```

### Current coverage

| Module | Tests |
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

Overall coverage: **~98%**

---

## Pull requests

### Process

1. Create a branch from `develop`: `git checkout -b feature/my-feature develop`
2. Make changes.
3. Run tests: `pytest`
4. Run linter: `ruff check src/ tests/`
5. Create PR targeting `develop`.

### PR checklist

- [ ] Tests pass: `pytest`
- [ ] Linter passes: `ruff check src/ tests/`
- [ ] Tests were added for the new functionality.
- [ ] Documentation was updated if applicable.

### Commits

- Clear messages in English, imperative: "Add", "Fix", "Remove".
- Prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`.

---

## Development phases

| Phase | Description | Status |
|-------|-------------|--------|
| **PHASE 0** | Scaffolding, config, engine, CLI, formatters, rule catalog | Completed |
| **PHASE 1** | Dependency analyzer (DEP-001, 002, 003, 005, 007) | Completed |
| **PHASE 2** | Auth + Secrets analyzers (AUTH-001..007, SEC-001..006) | Completed |
| **PHASE 3** | Test quality analyzer (TEST-001..006) | Pending |
| **PHASE 4** | Reports polish | Pending |
| **PHASE 5** | Integration, realistic fixtures, docs | Pending |
| **PHASE 6** | Popular packages corpus, final polish | Pending |
