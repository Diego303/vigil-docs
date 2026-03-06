---
title: "Architecture"
description: "Internal structure, engine flow, analyzer protocol, and design decisions."
order: 11
icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5"
---

# Architecture

This document describes vigil's internal structure, the analysis engine flow, and the analyzer protocol.

## Project structure

```
vigil-cli/
  src/vigil/
    __init__.py                   # __version__
    cli.py                        # Click commands (scan, deps, tests, init, rules)
    config/
      __init__.py
      schema.py                   # Pydantic v2 models for configuration
      loader.py                   # Config loading and merging (YAML + CLI)
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
        similarity.py             # Levenshtein + popular package corpus
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
    test_core/
      test_finding.py
      test_engine.py
      test_file_collector.py
    test_config/
      test_schema.py
      test_loader.py
      test_rules.py
    test_reports/
      test_formatters.py
    test_analyzers/
      test_deps/
        test_parsers.py           # Dependency parser tests
        test_parsers_qa.py        # QA: edge cases (markers, BOM, CRLF, Unicode)
        test_registry_client.py   # Registry client tests
        test_registry_client_qa.py # QA: cache, sanitize, response parsing
        test_similarity.py        # Typosquatting detection tests
        test_similarity_qa.py     # QA: corpus integrity, false positives, PEP 503
        test_analyzer.py          # DependencyAnalyzer tests
        test_analyzer_qa.py       # QA: false positives/negatives, boundaries
        test_integration_qa.py    # QA: engine+analyzer, CLI+deps, regression
    fixtures/                     # Test files
      deps/                       # Dependency fixtures
        valid_project/            #   Project with legitimate deps
        hallucinated_deps/        #   Hallucinated/invented deps
        npm_project/              #   npm project with invented deps
        clean_project/            #   Clean project (no findings)
        vulnerable_project/       #   Mix of legitimate and suspicious deps
        edge_cases/               #   Empty, comments-only, markers, URLs, malformed
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

Using `str, Enum` allows direct comparison with strings and JSON serialization without conversion.

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

Dataclass that indicates where the problem was found:

```python
@dataclass
class Location:
    file: str                    # File path
    line: int | None = None      # Line (1-based)
    column: int | None = None    # Column (1-based)
    end_line: int | None = None  # End line (for ranges)
    snippet: str | None = None   # Code snippet
```

### Finding

Dataclass that represents an individual finding:

```python
@dataclass
class Finding:
    rule_id: str                        # "DEP-001", "AUTH-005"
    category: Category                  # Category.DEPENDENCY
    severity: Severity                  # Severity.CRITICAL
    message: str                        # Problem description
    location: Location                  # Where it was found
    suggestion: str | None = None       # How to fix it
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def is_blocking(self) -> bool:
        return self.severity in (Severity.CRITICAL, Severity.HIGH)
```

The `is_blocking` property determines whether the finding should block a merge (by default, CRITICAL and HIGH are blocking).

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

- Traverses directories recursively with `os.walk()` and **in-place pruning** of excluded directories (`dirnames[:] = [...]`). This avoids traversing `.venv/`, `node_modules/`, etc., which is critical for performance (a typical `.venv/` contains thousands of files).
- Filters by language extensions (`LANGUAGE_EXTENSIONS`).
- Excludes configured patterns by path component (not by substring).
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

Findings are sorted by severity in descending order (CRITICAL first, INFO last) using `SEVERITY_SORT_ORDER`.

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

### Contract

- **`name`**: Unique name of the analyzer (e.g., `"dependency"`, `"auth"`).
- **`category`**: Category of findings it generates.
- **`analyze()`**: Receives the list of files and the configuration, returns findings.

### Rules for implementing an analyzer

1. **Deterministic**: The same input always produces the same output.
2. **No side effects**: Does not modify files, does not write to stdout.
3. **Internal error handling**: If a file cannot be read, the analyzer ignores it and continues.
4. **Logging to stderr**: Use `structlog` for debug/info logs.
5. **Respect configuration**: Read thresholds and options from `ScanConfig`.

### Implementation example

```python
from vigil.analyzers.base import BaseAnalyzer
from vigil.config.schema import ScanConfig
from vigil.core.finding import Category, Finding, Location, Severity

class DependencyAnalyzer:
    @property
    def name(self) -> str:
        return "dependency"

    @property
    def category(self) -> Category:
        return Category.DEPENDENCY

    def analyze(self, files: list[str], config: ScanConfig) -> list[Finding]:
        findings: list[Finding] = []
        # ... analysis logic ...
        return findings
```

No inheritance is required — only satisfying the Protocol (structural typing).

### Analyzer registration

In `cli.py`, analyzers are registered via `_register_analyzers(engine)` before running the scan:

```python
def _register_analyzers(engine: ScanEngine) -> None:
    from vigil.analyzers.deps import DependencyAnalyzer
    engine.register_analyzer(DependencyAnalyzer())
```

This function is invoked in the `scan`, `deps`, and `tests` commands.

---

## DependencyAnalyzer

The first implemented analyzer. It detects hallucinated dependencies, typosquatting, suspicious new packages, non-existent versions, and packages without a source repository.

### Internal architecture

```
DependencyAnalyzer.analyze(files, config)
    |
    v
[1. _extract_roots(files)]  -->  Unique root directories
    |
    v
[2. find_and_parse_all(root)]  -->  List of DeclaredDependency
    |                                (parsers: req.txt, pyproject.toml, package.json)
    v
[3. _deduplicate_deps()]  -->  Unique deps by name+ecosystem
    |
    v
[4. load_popular_packages()]  -->  Corpus for typosquatting
    |
    +---> [5a. _check_registries()]  -->  DEP-001, DEP-002, DEP-005, DEP-007
    |         |                           (only if online + verify_registry)
    |         v
    |     RegistryClient.check(name, ecosystem)
    |         |
    |         +---> Cache hit? return cached
    |         +---> HTTP GET PyPI/npm -> PackageInfo -> cache
    |
    +---> [5b. find_similar_popular()]  -->  DEP-003 (always, no network required)
    |
    v
  list[Finding]
```

### Components

| Module | Responsibility |
|--------|----------------|
| `parsers.py` | Parses requirements.txt, pyproject.toml, package.json into `DeclaredDependency` |
| `registry_client.py` | HTTP client for PyPI/npm with disk cache (`~/.cache/vigil/registry/`) |
| `similarity.py` | Levenshtein distance, PEP 503 normalization, popular package corpus |
| `analyzer.py` | Orchestrates parsers + registry + similarity, generates findings |

### Implemented rules

| Rule | Requires network | Description |
|------|------------------|-------------|
| DEP-001 | Yes | Package does not exist in registry |
| DEP-002 | Yes | Package created less than N days ago |
| DEP-003 | No | Name similar to popular package |
| DEP-005 | Yes | No source repository |
| DEP-007 | Yes | Pinned version does not exist |

### Deferred rules (V1)

| Rule | Reason |
|------|--------|
| DEP-004 | Requires download statistics API |
| DEP-006 | Requires AST import parser |

---

## Configuration system

### Three layers with progressive merging

```
Defaults (schema.py) < YAML file (.vigil.yaml) < CLI flags
```

1. **Defaults**: Defined as default values in Pydantic models (`ScanConfig`, `DepsConfig`, etc.).
2. **YAML**: Loaded with `pyyaml` and validated with Pydantic.
3. **CLI**: Click flags that override specific fields.

### Loader

`load_config()` in `config/loader.py`:

1. Finds the config file (manual with `--config`, or auto-detection by walking up the directory tree).
2. Parses the YAML.
3. Creates a `ScanConfig` instance with the YAML values.
4. Applies CLI overrides on the instance.
5. Returns the final configuration.

### Validation

Pydantic v2 automatically validates:
- Data types (`min_age_days` is int, not string).
- Valid values (`fail_on` is one of critical/high/medium/low).
- Nested models (`deps`, `auth`, `secrets`, `tests`, `output`).

---

## Rule catalog

The 26 rules are defined in `config/rules.py` as `RuleDefinition` instances:

```python
@dataclass
class RuleDefinition:
    id: str                              # "DEP-001"
    name: str                            # "Hallucinated dependency"
    description: str                     # Long description
    category: Category                   # Category.DEPENDENCY
    default_severity: Severity           # Severity.CRITICAL
    enabled_by_default: bool = True
    languages: list[str] | None = None   # None = all
    owasp_ref: str | None = None         # "LLM03"
    cwe_ref: str | None = None           # "CWE-829"
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

`get_formatter(format_name)` returns the correct class with lazy import:

```python
"human"  -> HumanFormatter
"json"   -> JsonFormatter
"junit"  -> JunitFormatter
"sarif"  -> SarifFormatter
```

### Output flow

```
ScanResult -> Formatter.format() -> string -> stdout or file
```

The CLI decides where to send the output:
- Without `--output`: stdout.
- With `--output`: writes to file (and also to stdout for human format).

---

## Logging

### structlog

vigil uses `structlog` for structured logging:

- **Verbose mode** (`-v`): Level DEBUG, with timestamps and key-value pairs.
- **Normal mode**: Level WARNING, minimalist output.
- **Output always to stderr**: Logs never go to stdout. This allows `vigil scan -f json | jq` without contaminating the JSON with logs.

### Example logs in verbose mode

```
2024-01-15 10:30:00 [info] files_collected count=42
2024-01-15 10:30:00 [info] analyzer_start name=dependency
2024-01-15 10:30:01 [info] analyzer_done name=dependency findings=2
```

---

## External dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `click>=8.1` | CLI framework | Subcommands, options, automatic help |
| `pydantic>=2.0` | Validation | Configuration models with validation |
| `httpx>=0.27` | HTTP client | Requests to PyPI/npm (async-capable) |
| `structlog>=24.1` | Logging | Structured logging to stderr |
| `pyyaml>=6.0` | YAML parser | Loading configuration files |

### Development dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `pytest>=8.0` | Testing | Test framework |
| `pytest-cov>=5.0` | Coverage | Test coverage reporting |
| `ruff>=0.4` | Linting | Python linter and formatter |

---

## Design decisions

### Why Protocol and not ABC

`typing.Protocol` (structural typing) is used instead of `abc.ABC` (nominal typing) for:

- **Flexibility**: Analyzers don't need to inherit from a base class.
- **Testing**: It's trivial to create fakes/mocks that satisfy the protocol.
- **Decoupling**: Modules don't depend on the base class.

### Why dataclasses and not Pydantic for Finding

- `Finding`, `Location`, and `RuleDefinition` are **internal data models** that don't need validation.
- Pydantic is reserved for **user configuration** where validation is critical.
- Dataclasses are lighter and faster for data that is created internally.

### Why structlog

- Structured logging (key-value) facilitates parsing and filtering.
- Clear separation of output (stdout) vs logs (stderr).
- Centralized configuration with processors.

### Why not async

vigil V0 is synchronous. The reasons:

- Most operations are filesystem I/O, which is fast.
- HTTP requests to the registry can be made with synchronous `httpx`.
- The simplicity of synchronous code facilitates debugging and testing.
- It can be migrated to async in future versions if performance requires it.
