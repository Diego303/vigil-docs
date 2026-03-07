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
    cli.py                        # Comandos Click (scan, deps, tests, init, rules)
    config/
      __init__.py
      schema.py                   # Modelos Pydantic v2 para configuracion
      loader.py                   # Carga y merge de config (YAML + CLI)
      rules.py                    # Catalogo de 26 reglas (RULES_V0)
    core/
      __init__.py
      finding.py                  # Severity, Category, Location, Finding
      engine.py                   # ScanEngine, ScanResult
      file_collector.py           # Descubrimiento de archivos
      rule_registry.py            # RuleRegistry para acceso a reglas
    analyzers/
      __init__.py
      base.py                     # BaseAnalyzer Protocol
      deps/                       # CAT-01: Dependency Analyzer
        __init__.py
        analyzer.py               # DependencyAnalyzer (DEP-001..007)
        parsers.py                # Parsers para requirements.txt, pyproject.toml, package.json
        registry_client.py        # Cliente HTTP para PyPI/npm con cache local
        similarity.py             # Levenshtein + corpus de paquetes populares
      auth/                       # CAT-02: Auth Analyzer
        __init__.py
        analyzer.py               # AuthAnalyzer (AUTH-001..007)
        endpoint_detector.py      # Deteccion de endpoints HTTP (FastAPI/Flask/Express)
        middleware_checker.py     # Verificacion de auth middleware
        patterns.py               # Regex para JWT, CORS, cookies, passwords
      secrets/                    # CAT-03: Secrets Analyzer
        __init__.py
        analyzer.py               # SecretsAnalyzer (SEC-001..006)
        placeholder_detector.py   # Deteccion de placeholders y assignments
        entropy.py                # Calculo de Shannon entropy
        env_tracer.py             # Tracing de valores desde .env.example
      tests/                      # CAT-06: Test Quality Analyzer
        __init__.py
        analyzer.py               # TestQualityAnalyzer (TEST-001..006)
        assert_checker.py         # Extraccion de funciones test, conteo de assertions
        mock_checker.py           # Deteccion de mock mirrors
        coverage_heuristics.py    # Identificacion de archivos de test y frameworks
    reports/
      __init__.py
      formatter.py                # BaseFormatter Protocol + factory
      human.py                    # Formato terminal con colores
      json_fmt.py                 # Formato JSON estructurado
      junit.py                    # Formato JUnit XML
      sarif.py                    # Formato SARIF 2.1.0
      summary.py                  # Generador de resumen (conteos)
    logging/
      __init__.py
      setup.py                    # Configuracion de structlog
  tests/
    conftest.py                   # Fixtures globales
    test_cli.py                   # Tests del CLI
    test_cli_edge_cases.py        # Edge cases del CLI
    test_integration.py           # Tests de integracion end-to-end
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
        test_parsers.py           # Tests de parsers de dependencias
        test_parsers_qa.py        # QA: edge cases (markers, BOM, CRLF, Unicode)
        test_registry_client.py   # Tests del cliente de registries
        test_registry_client_qa.py # QA: cache, sanitize, response parsing
        test_similarity.py        # Tests de deteccion de typosquatting
        test_similarity_qa.py     # QA: corpus integrity, false positives, PEP 503
        test_analyzer.py          # Tests del DependencyAnalyzer
        test_analyzer_qa.py       # QA: false positives/negatives, boundaries
        test_integration_qa.py    # QA: engine+analyzer, CLI+deps, regression
      test_auth/
        test_analyzer.py          # Tests del AuthAnalyzer
        test_endpoint_detector.py # Tests de deteccion de endpoints
        test_middleware_checker.py # Tests de verificacion de auth middleware
        test_patterns.py          # Tests de patrones regex (JWT, CORS, cookies)
        test_qa_regression.py     # QA: edge cases y regresiones
      test_secrets/
        test_analyzer.py          # Tests del SecretsAnalyzer
        test_placeholder_detector.py # Tests de deteccion de placeholders
        test_entropy.py           # Tests de calculo de Shannon entropy
        test_env_tracer.py        # Tests de tracing de .env.example
        test_qa_regression.py     # QA: edge cases y regresiones
      test_tests/
        test_analyzer.py          # Tests del TestQualityAnalyzer
        test_assert_checker.py    # Tests de extraccion y conteo de assertions
        test_mock_checker.py      # Tests de deteccion de mock mirrors
        test_coverage_heuristics.py # Tests de identificacion de archivos test
        test_qa_regression.py     # QA: edge cases y regresiones (81 tests)
    fixtures/                     # Archivos de prueba
      deps/                       # Fixtures de dependencias
        valid_project/            #   Proyecto con deps legitimas
        hallucinated_deps/        #   Deps alucinadas/inventadas
        npm_project/              #   Proyecto npm con deps inventadas
        clean_project/            #   Proyecto limpio (sin findings)
        vulnerable_project/       #   Mix de deps legitimas y sospechosas
        edge_cases/               #   Empty, comments-only, markers, URLs, malformed
      auth/                       # Fixtures de auth
        insecure_fastapi.py       #   FastAPI sin auth middleware
        insecure_flask.py         #   Flask sin auth
        insecure_express.js       #   Express sin auth
        secure_app.py             #   App con auth correcta (sin findings)
        edge_cases.py             #   Casos borde
      secrets/                    # Fixtures de secrets
        insecure_secrets.py       #   Secrets hardcodeados (Python)
        insecure_secrets.js       #   Secrets hardcodeados (JavaScript)
        .env.example              #   Ejemplo de .env.example
        copies_env_example.py     #   Codigo que copia valores de .env.example
        secure_code.py            #   Codigo seguro (sin findings)
      tests/                      # Fixtures de test quality
        vulnerable_tests.py       #   Tests Python con problemas (sin assertions, triviales, catch-all)
        vulnerable_tests.js       #   Tests JavaScript con problemas
        clean_tests.py            #   Tests Python correctos (sin findings)
        clean_tests.js            #   Tests JavaScript correctos (sin findings)
        edge_cases_python.py      #   Casos borde Python (async, single-line, nested)
        edge_cases_js.js          #   Casos borde JavaScript (async, describe, nested)
        npm_tests.test.js         #   Tests npm/jest con problemas mixtos
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

Using `str, Enum` allows direct comparison with strings and serialization to JSON without conversion.

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

Dataclass that indicates where the issue was found:

```python
@dataclass
class Location:
    file: str                    # Ruta al archivo
    line: int | None = None      # Linea (1-based)
    column: int | None = None    # Columna (1-based)
    end_line: int | None = None  # Linea final (para rangos)
    snippet: str | None = None   # Fragmento de codigo
```

### Finding

Dataclass that represents an individual finding:

```python
@dataclass
class Finding:
    rule_id: str                        # "DEP-001", "AUTH-005"
    category: Category                  # Category.DEPENDENCY
    severity: Severity                  # Severity.CRITICAL
    message: str                        # Descripcion del problema
    location: Location                  # Donde se encontro
    suggestion: str | None = None       # Como corregirlo
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
- Excludes patterns configured by path component (not by substring).
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

Findings are sorted by descending severity (CRITICAL first, INFO last) using `SEVERITY_SORT_ORDER`.

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

- **`name`**: Unique analyzer name (e.g., `"dependency"`, `"auth"`).
- **`category`**: Category of findings it generates.
- **`analyze()`**: Receives the list of files and configuration, returns findings.

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
        # ... logica de analisis ...
        return findings
```

No inheritance is required -- only satisfying the Protocol (structural typing).

### Analyzer registration

In `cli.py`, analyzers are registered via `_register_analyzers(engine)` before running the scan:

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

This function is called in the `scan`, `deps`, and `tests` commands.

---

## DependencyAnalyzer

The first analyzer implemented. Detects hallucinated dependencies, typosquatting, suspiciously new packages, nonexistent versions, and packages without a source repository.

### Internal architecture

```
DependencyAnalyzer.analyze(files, config)
    |
    v
[1. _extract_roots(files)]  -->  Directorios raiz unicos
    |
    v
[2. find_and_parse_all(root)]  -->  Lista de DeclaredDependency
    |                                (parsers: req.txt, pyproject.toml, package.json)
    v
[3. _deduplicate_deps()]  -->  Deps unicos por nombre+ecosystem
    |
    v
[4. load_popular_packages()]  -->  Corpus para typosquatting
    |
    +---> [5a. _check_registries()]  -->  DEP-001, DEP-002, DEP-005, DEP-007
    |         |                           (solo si online + verify_registry)
    |         v
    |     RegistryClient.check(name, ecosystem)
    |         |
    |         +---> Cache hit? return cached
    |         +---> HTTP GET PyPI/npm -> PackageInfo -> cache
    |
    +---> [5b. find_similar_popular()]  -->  DEP-003 (siempre, no requiere red)
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
|------|-----------------|-------------|
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

### Three layers with progressive merge

```
Defaults (schema.py) < Archivo YAML (.vigil.yaml) < Flags CLI
```

1. **Defaults**: Defined as default values in Pydantic models (`ScanConfig`, `DepsConfig`, etc.).
2. **YAML**: Loaded with `pyyaml` and validated with Pydantic.
3. **CLI**: Click flags that override specific fields.

### Loader

`load_config()` in `config/loader.py`:

1. Searches for the config file (manual with `--config`, or auto-detection by traversing up the directory tree).
2. Parses the YAML.
3. Creates a `ScanConfig` instance with the YAML values.
4. Applies CLI overrides on top of the instance.
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
    description: str                     # Descripcion larga
    category: Category                   # Category.DEPENDENCY
    default_severity: Severity           # Severity.CRITICAL
    enabled_by_default: bool = True
    languages: list[str] | None = None   # None = todos
    owasp_ref: str | None = None         # "LLM03"
    cwe_ref: str | None = None           # "CWE-829"
```

### RuleRegistry

Provides indexed access to the catalog:

- `registry.get("DEP-001")` -- get a rule by ID.
- `registry.all()` -- all rules.
- `registry.by_category(Category.AUTH)` -- rules in a category.
- `registry.by_severity(Severity.CRITICAL)` -- rules of a given severity.
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
ScanResult -> Formatter.format() -> string -> stdout o archivo
```

The CLI decides where to send the output:
- Without `--output`: stdout.
- With `--output`: writes to a file (and also to stdout for human format).

---

## Logging

### structlog

vigil uses `structlog` for structured logging:

- **Verbose mode** (`-v`): Level DEBUG, with timestamps and key-value pairs.
- **Normal mode**: Level WARNING, minimal output.
- **Output always to stderr**: Logs never go to stdout. This allows `vigil scan -f json | jq` without contaminating the JSON with logs.

### Verbose log example

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
| `pyyaml>=6.0` | YAML parser | Configuration file loading |

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

- **Flexibility**: Analyzers do not need to inherit from a base class.
- **Testing**: It is trivial to create fakes/mocks that satisfy the protocol.
- **Decoupling**: Modules do not depend on the base class.

### Why dataclasses and not Pydantic for Finding

- `Finding`, `Location`, and `RuleDefinition` are **internal data models** that do not need validation.
- Pydantic is reserved for **user configuration** where validation is critical.
- Dataclasses are lighter and faster for data created internally.

### Why structlog

- Structured logging (key-value) facilitates parsing and filtering.
- Clear separation of output (stdout) vs logs (stderr).
- Centralized configuration with processors.

### Why not async

vigil V0 is synchronous. The reasons:

- Most operations are filesystem I/O, which is fast.
- HTTP requests to the registry can be done with synchronous `httpx`.
- The simplicity of synchronous code makes debugging and testing easier.
- It can be migrated to async in future versions if performance requires it.
