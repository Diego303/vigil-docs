---
title: "Architecture"
description: "Internal structure, engine flow, analyzer protocol, and design decisions."
order: 11
icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5"
---

# Architecture

This document describes the internal structure of vigil, the analysis engine flow, and the analyzer protocol.

## Project structure

```
vigil-cli/
  src/vigil/
    __init__.py                   # __version__
    cli.py                        # Click commands (scan, deps, tests, init, rules)
    config/
      __init__.py
      schema.py                   # Pydantic v2 models for configuration
      loader.py                   # Config loading and merge (YAML + CLI)
      rules.py                    # Catalog of 26 rules (RULES_V0)
    core/
      __init__.py
      finding.py                  # Severity, Category, Location, Finding
      engine.py                   # ScanEngine, ScanResult
      file_collector.py           # File discovery
      rule_registry.py            # RuleRegistry for rule access
    analyzers/
      __init__.py
      base.py                     # BaseAnalyzer Protocol
      deps/                       # CAT-01: Dependency Analyzer
        __init__.py
        analyzer.py               # DependencyAnalyzer (DEP-001..007)
        parsers.py                # Parsers for requirements.txt, pyproject.toml, package.json
        registry_client.py        # HTTP client for PyPI/npm with local cache
        similarity.py             # Levenshtein + popular packages corpus
      auth/                       # CAT-02: Auth Analyzer
        __init__.py
        analyzer.py               # AuthAnalyzer (AUTH-001..007)
        endpoint_detector.py      # HTTP endpoint detection (FastAPI/Flask/Express)
        middleware_checker.py     # Auth middleware verification
        patterns.py               # Regex for JWT, CORS, cookies, passwords
      secrets/                    # CAT-03: Secrets Analyzer
        __init__.py
        analyzer.py               # SecretsAnalyzer (SEC-001..006)
        placeholder_detector.py   # Placeholder and assignment detection
        entropy.py                # Shannon entropy calculation
        env_tracer.py             # Value tracing from .env.example
    reports/
      __init__.py
      formatter.py                # BaseFormatter Protocol + factory
      human.py                    # Terminal format with colors
      json_fmt.py                 # Structured JSON format
      junit.py                    # JUnit XML format
      sarif.py                    # SARIF 2.1.0 format
      summary.py                  # Summary generator (counts)
    logging/
      __init__.py
      setup.py                    # structlog configuration
  tests/
    conftest.py                   # Global fixtures
    test_cli.py                   # CLI tests
    test_cli_edge_cases.py        # CLI edge cases
    test_integration.py           # End-to-end integration tests
    test_core/                    # Core tests
    test_config/                  # Configuration tests
    test_reports/                 # Formatter tests
    test_analyzers/
      test_deps/                  # DependencyAnalyzer tests
      test_auth/                  # AuthAnalyzer tests
      test_secrets/               # SecretsAnalyzer tests
    fixtures/                     # Test files
      deps/                       # Dependency fixtures
      auth/                       # Auth fixtures
      secrets/                    # Secrets fixtures
```

---

## Data models

### Severity

String enum with 5 levels, ordered from highest to lowest criticality:

```python
class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"
```

### Category

String enum with 4 analysis categories:

```python
class Category(str, Enum):
    DEPENDENCY = "dependency"
    AUTH = "auth"
    SECRETS = "secrets"
    TEST_QUALITY = "test-quality"
```

### Location

Dataclass indicating where the issue was found:

```python
@dataclass
class Location:
    file: str
    line: int | None = None
    column: int | None = None
    end_line: int | None = None
    snippet: str | None = None
```

### Finding

Dataclass representing an individual finding:

```python
@dataclass
class Finding:
    rule_id: str
    category: Category
    severity: Severity
    message: str
    location: Location
    suggestion: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_blocking(self) -> bool:
        return self.severity in (Severity.CRITICAL, Severity.HIGH)
```

---

## Engine flow

The `ScanEngine` is the central orchestrator. Its `run()` method executes the complete pipeline:

```
                    run(paths)
                       |
            +----------v-----------+
            |  1. Collect files    |
            |  (file_collector)    |
            +----------+-----------+
                       |
            +----------v-----------+
            |  2. Run analyzers    |
            |  (for each analyzer) |
            +----------+-----------+
                       |
            +----------v-----------+
            |  3. Apply overrides  |
            |  (rule_overrides)    |
            +----------+-----------+
                       |
            +----------v-----------+
            |  4. Sort findings    |
            |  (by severity)       |
            +----------+-----------+
                       |
                       v
                  ScanResult
```

### Step 1: Collect files

`file_collector.collect_files()` receives the user's paths and returns a list of files to scan:

- Recursively traverses directories with `os.walk()` and **in-place pruning** of excluded directories.
- Filters by language extensions (`LANGUAGE_EXTENSIONS`).
- Excludes configured patterns by path component.
- Always includes dependency files (`requirements.txt`, `package.json`, etc.) regardless of the language filter.
- Deduplicates while preserving order.

### Step 2: Run analyzers

For each registered analyzer:

1. Checks whether it should run (`_should_run()`): respects `--category` and `--rule` filters.
2. Calls `analyzer.analyze(files, config)`.
3. Collects the returned findings.
4. Catches exceptions per analyzer (a failed analyzer does not stop the others).

### Step 3: Apply overrides

`_apply_rule_overrides()` processes the `rules:` section of the configuration:

- If a rule has `enabled: false`, its findings are removed.
- If a rule has `severity: "low"`, the finding's severity is modified.
- If a rule is in `exclude_rules` (from `--exclude-rule`), it is removed.

### Step 4: Sort

Findings are sorted by descending severity (CRITICAL first, INFO last).

---

## Analyzer protocol

Each analyzer implements the `BaseAnalyzer` protocol:

```python
class BaseAnalyzer(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def category(self) -> Category: ...

    def analyze(self, files: list[str], config: ScanConfig) -> list[Finding]: ...
```

### Rules for implementing an analyzer

1. **Deterministic**: The same input always produces the same output.
2. **No side effects**: Does not modify files, does not write to stdout.
3. **Internal error handling**: If a file cannot be read, the analyzer ignores it and continues.
4. **Logging to stderr**: Use `structlog` for debug/info logs.
5. **Respect configuration**: Read thresholds and options from `ScanConfig`.

No inheritance is required -- only satisfying the Protocol (structural typing).

---

## Configuration system

### Three layers with progressive merge

```
Defaults (schema.py) < YAML file (.vigil.yaml) < CLI flags
```

1. **Defaults**: Defined as default values in Pydantic models.
2. **YAML**: Loaded with `pyyaml` and validated with Pydantic.
3. **CLI**: Click flags that override specific fields.

---

## Rule catalog

The 26 rules are defined in `config/rules.py` as `RuleDefinition` instances:

```python
@dataclass
class RuleDefinition:
    id: str
    name: str
    description: str
    category: Category
    default_severity: Severity
    enabled_by_default: bool = True
    languages: list[str] | None = None
    owasp_ref: str | None = None
    cwe_ref: str | None = None
```

### RuleRegistry

Provides indexed access to the catalog:

- `registry.get("DEP-001")` -- get a rule by ID.
- `registry.all()` -- all rules.
- `registry.by_category(Category.AUTH)` -- rules in a category.
- `registry.by_severity(Severity.CRITICAL)` -- rules of a severity.
- `registry.enabled_rules(overrides)` -- enabled rules after applying overrides.

---

## Formatters

### Protocol

```python
class BaseFormatter(Protocol):
    def format(self, result: ScanResult) -> str: ...
```

### Factory

`get_formatter(format_name)` returns the correct class:

```python
"human"  -> HumanFormatter
"json"   -> JsonFormatter
"junit"  -> JunitFormatter
"sarif"  -> SarifFormatter
```

---

## Logging

vigil uses `structlog` for structured logging:

- **Verbose mode** (`-v`): Level DEBUG, with timestamps and key-value pairs.
- **Normal mode**: Level WARNING, minimalist output.
- **Output always to stderr**: Logs never go to stdout.

---

## Design decisions

### Why Protocol and not ABC

`typing.Protocol` (structural typing) is used for flexibility, trivial testing, and decoupling.

### Why dataclasses and not Pydantic for Finding

`Finding`, `Location`, and `RuleDefinition` are internal models that do not need validation. Pydantic is reserved for user configuration.

### Why structlog

Structured logging (key-value) facilitates parsing and filtering. Clear separation of output (stdout) vs logs (stderr).

### Why not async

vigil V0 is synchronous. Most operations are fast filesystem I/O. HTTP requests use synchronous `httpx`. Simplicity facilitates debugging and testing.

---

## External dependencies

| Dependency | Purpose |
|------------|---------|
| `click>=8.1` | CLI framework |
| `pydantic>=2.0` | Configuration validation |
| `httpx>=0.27` | HTTP client for registries |
| `structlog>=24.1` | Structured logging |
| `pyyaml>=6.0` | YAML parser |
