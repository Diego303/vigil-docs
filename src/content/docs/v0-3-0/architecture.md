---
title: "Arquitectura"
description: "Estructura interna, flujo del engine, protocolo de analyzers y decisiones de diseno."
order: 11
icon: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5"
---

# Arquitectura

Este documento describe la estructura interna de vigil, el flujo del motor de analisis, y el protocolo de analyzers.

## Estructura del proyecto

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
    test_core/                    # Tests del core
    test_config/                  # Tests de configuracion
    test_reports/                 # Tests de formateadores
    test_analyzers/
      test_deps/                  # Tests del DependencyAnalyzer
      test_auth/                  # Tests del AuthAnalyzer
      test_secrets/               # Tests del SecretsAnalyzer
    fixtures/                     # Archivos de prueba
      deps/                       # Fixtures de dependencias
      auth/                       # Fixtures de auth
      secrets/                    # Fixtures de secrets
```

---

## Modelos de datos

### Severity

Enum string con 5 niveles, ordenados de mayor a menor criticidad:

```python
class Severity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"
```

### Category

Enum string con 4 categorias de analisis:

```python
class Category(str, Enum):
    DEPENDENCY = "dependency"
    AUTH = "auth"
    SECRETS = "secrets"
    TEST_QUALITY = "test-quality"
```

### Location

Dataclass que indica donde se encontro el problema:

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

Dataclass que representa un hallazgo individual:

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

## Flujo del motor

El `ScanEngine` es el orquestador central. Su metodo `run()` ejecuta el pipeline completo:

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

### Paso 1: Recopilar archivos

`file_collector.collect_files()` recibe las rutas del usuario y retorna una lista de archivos a escanear:

- Recorre directorios recursivamente con `os.walk()` y **pruning in-place** de directorios excluidos.
- Filtra por extensiones de lenguaje (`LANGUAGE_EXTENSIONS`).
- Excluye patrones configurados por componente de path.
- Siempre incluye archivos de dependencias (`requirements.txt`, `package.json`, etc.) independientemente del filtro de lenguaje.
- Deduplica preservando el orden.

### Paso 2: Ejecutar analyzers

Para cada analyzer registrado:

1. Verifica si debe ejecutarse (`_should_run()`): respeta filtros de `--category` y `--rule`.
2. Llama a `analyzer.analyze(files, config)`.
3. Recopila los findings retornados.
4. Captura excepciones por analyzer (un analyzer fallido no detiene a los demas).

### Paso 3: Aplicar overrides

`_apply_rule_overrides()` procesa la seccion `rules:` de la configuracion:

- Si una regla tiene `enabled: false`, sus findings se eliminan.
- Si una regla tiene `severity: "low"`, la severidad del finding se modifica.
- Si una regla esta en `exclude_rules` (de `--exclude-rule`), se elimina.

### Paso 4: Ordenar

Los findings se ordenan por severidad descendente (CRITICAL primero, INFO ultimo).

---

## Protocolo de analyzers

Cada analyzer implementa el protocolo `BaseAnalyzer`:

```python
class BaseAnalyzer(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def category(self) -> Category: ...

    def analyze(self, files: list[str], config: ScanConfig) -> list[Finding]: ...
```

### Reglas para implementar un analyzer

1. **Determinista**: El mismo input siempre produce el mismo output.
2. **Sin efectos secundarios**: No modifica archivos, no escribe a stdout.
3. **Manejo de errores interno**: Si un archivo no se puede leer, el analyzer lo ignora y continua.
4. **Logging a stderr**: Usar `structlog` para logs de debug/info.
5. **Respetar la configuracion**: Leer thresholds y opciones de `ScanConfig`.

No se requiere herencia — solo satisfacer el Protocol (structural typing).

---

## Sistema de configuracion

### Tres capas con merge progresivo

```
Defaults (schema.py) < Archivo YAML (.vigil.yaml) < Flags CLI
```

1. **Defaults**: Definidos como valores por defecto en los modelos Pydantic.
2. **YAML**: Cargado con `pyyaml` y validado con Pydantic.
3. **CLI**: Flags de Click que sobreescriben campos especificos.

---

## Catalogo de reglas

Las 26 reglas estan definidas en `config/rules.py` como instancias de `RuleDefinition`:

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

Provee acceso indexado al catalogo:

- `registry.get("DEP-001")` — obtener una regla por ID.
- `registry.all()` — todas las reglas.
- `registry.by_category(Category.AUTH)` — reglas de una categoria.
- `registry.by_severity(Severity.CRITICAL)` — reglas de una severidad.
- `registry.enabled_rules(overrides)` — reglas habilitadas despues de aplicar overrides.

---

## Formateadores

### Protocolo

```python
class BaseFormatter(Protocol):
    def format(self, result: ScanResult) -> str: ...
```

### Factory

`get_formatter(format_name)` retorna la clase correcta:

```python
"human"  -> HumanFormatter
"json"   -> JsonFormatter
"junit"  -> JunitFormatter
"sarif"  -> SarifFormatter
```

---

## Logging

vigil usa `structlog` para logging estructurado:

- **Verbose mode** (`-v`): Level DEBUG, con timestamps y key-value pairs.
- **Normal mode**: Level WARNING, output minimalista.
- **Output siempre a stderr**: Los logs nunca van a stdout.

---

## Decisiones de diseno

### Por que Protocol y no ABC

Se usa `typing.Protocol` (structural typing) para flexibilidad, testing trivial y desacoplamiento.

### Por que dataclasses y no Pydantic para Finding

`Finding`, `Location`, y `RuleDefinition` son modelos internos que no necesitan validacion. Pydantic se reserva para la configuracion del usuario.

### Por que structlog

Logging estructurado (key-value) facilita parsing y filtrado. Separacion clara de output (stdout) vs logs (stderr).

### Por que no async

vigil V0 es sincrono. La mayoria de operaciones son I/O de filesystem rapido. Las HTTP requests usan `httpx` sincrono. La simplicidad facilita debugging y testing.

---

## Dependencias externas

| Dependencia | Proposito |
|-------------|-----------|
| `click>=8.1` | CLI framework |
| `pydantic>=2.0` | Validacion de configuracion |
| `httpx>=0.27` | HTTP client para registries |
| `structlog>=24.1` | Logging estructurado |
| `pyyaml>=6.0` | Parser YAML |
