---
title: "Analyzers"
description: "Technical reference for implemented analyzers: DependencyAnalyzer and pending analyzers."
order: 10
icon: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35"
---

# Analyzers

vigil uses a modular analyzer system. Each analyzer focuses on a detection category and produces findings independently. This document describes the implemented analyzers.

For the general analyzer architecture (protocol, registration, flow), see [Architecture](/vigil-docs/en/docs/v0-2-0/architecture/).

---

## DependencyAnalyzer (CAT-01)

**Module:** `src/vigil/analyzers/deps/`
**Category:** `dependency`
**Active rules:** DEP-001, DEP-002, DEP-003, DEP-005, DEP-007

Detects hallucinated dependencies (slopsquatting), typosquatting, suspicious packages, nonexistent versions, and packages without a source repository.

### Supported dependency files

| File | Ecosystem | Parser |
|------|-----------|--------|
| `requirements.txt` | PyPI | `parse_requirements_txt()` |
| `requirements-dev.txt`, `requirements-*.txt` | PyPI | `parse_requirements_txt()` |
| `pyproject.toml` (`[project.dependencies]`, `[project.optional-dependencies]`) | PyPI | `parse_pyproject_toml()` |
| `package.json` (`dependencies`, `devDependencies`) | npm | `parse_package_json()` |

Files are discovered automatically with `find_and_parse_all()`, which traverses the directory tree while skipping `.venv/`, `node_modules/`, `.git/`, etc.

### Implemented rules

#### DEP-001 — Hallucinated dependency (CRITICAL)

Verifies that each declared package exists in the public registry (PyPI or npm). If it does not exist, it is very likely a name hallucinated by the AI agent.

```
# requirements.txt
flask==3.0.0
python-jwt-utils==1.0.0    # Does NOT exist on PyPI -> DEP-001 CRITICAL
```

**Requires network:** Yes. Skipped in `--offline` mode.

#### DEP-002 — Suspiciously new dependency (HIGH)

Checks the package creation date. If it was created less than `deps.min_age_days` days ago (default: 30), it may be a malicious package registered as part of a slopsquatting attack.

**Requires network:** Yes. Skipped in `--offline` mode.

#### DEP-003 — Typosquatting candidate (HIGH)

Compares each dependency name against a corpus of popular packages using normalized Levenshtein distance. If the similarity is >= `deps.similarity_threshold` (default: 0.85), it is a typosquatting candidate.

```
# requirements.txt
requets==2.31.0     # Similarity 0.875 with "requests" -> DEP-003 HIGH
```

**Requires network:** No. Works in `--offline` mode.

**Normalization:** For PyPI, hyphens (`-`), underscores (`_`), and dots (`.`) are treated as equivalent (PEP 503). `my-package`, `my_package`, and `my.package` are normalized to the same name before comparison.

**Corpus:** A built-in corpus of ~100 PyPI packages and ~70 npm packages is used as a fallback. When the files `data/popular_pypi.json` and `data/popular_npm.json` are generated (PHASE 6), those will be used instead.

#### DEP-005 — No source repository (MEDIUM)

Verifies that the package has a source code repository linked in its metadata. Packages without a repository are harder to audit.

**Requires network:** Yes. Skipped in `--offline` mode.

#### DEP-007 — Nonexistent version (CRITICAL)

Verifies that the exact pinned version exists in the registry. Only applies to exact versions (`==1.2.3` in PyPI, `1.2.3` without prefix in npm).

```
# requirements.txt
flask==99.0.0     # Version does not exist -> DEP-007 CRITICAL
```

**Requires network:** Yes. Skipped in `--offline` mode.

### Deferred rules

| Rule | Reason | Estimate |
|------|--------|----------|
| DEP-004 (unpopular) | Requires download statistics API, not available in basic PyPI/npm metadata | V1 or PHASE 6 |
| DEP-006 (missing import) | Requires AST import parser, out of scope for V0 (regex-based) | V1 |

### Analysis flow

1. **Discovery**: `find_and_parse_all()` traverses directories with `os.walk()` + pruning, looking for dependency files.
2. **Parsing**: Each file is parsed into a list of `DeclaredDependency` with name, version, source file, line, and ecosystem.
3. **Deduplication**: Duplicates are removed by name+ecosystem (e.g., same package in `requirements.txt` and `pyproject.toml`).
4. **Registry verification** (if online): For each unique package, PyPI/npm is queried via `RegistryClient`. DEP-001, DEP-002, DEP-005, DEP-007 are applied.
5. **Similarity verification** (always): For each unique package, popular packages with similar names are searched. DEP-003 is applied.

### Registry Client

The `RegistryClient` handles HTTP queries to PyPI and npm:

- **Disk cache:** `~/.cache/vigil/registry/` with individual JSON files per package.
- **Configurable TTL:** Default 24 hours (`deps.cache_ttl_hours`).
- **Lazy init:** The httpx client is created only when the first request is made.
- **Context manager:** Supports `with RegistryClient() as client:` for automatic cleanup.
- **Resilience:** Network errors assume the package exists (avoids false positives on unstable connections).

```bash
# Clear cache
rm -rf ~/.cache/vigil/registry/

# Force fresh requests
# (set cache_ttl_hours: 0 in .vigil.yaml)
```

### Relevant configuration

```yaml
deps:
  # Verify against registries (false = static checks only)
  verify_registry: true

  # Minimum age in days (DEP-002)
  min_age_days: 30

  # Similarity threshold for typosquatting (DEP-003)
  # 0.85 = catches 1-character typos in names of 8+ characters
  similarity_threshold: 0.85

  # Registry cache TTL
  cache_ttl_hours: 24

  # Offline mode (no HTTP)
  offline_mode: false
```

### Offline mode

With `--offline` or `deps.offline_mode: true`:

| Rule | Behavior |
|------|----------|
| DEP-001 | **Skipped** (requires registry verification) |
| DEP-002 | **Skipped** (requires creation date from registry) |
| DEP-003 | **Active** (local comparison against corpus) |
| DEP-005 | **Skipped** (requires registry metadata) |
| DEP-007 | **Skipped** (requires version list from registry) |

---

## Pending analyzers

### AuthAnalyzer (CAT-02) — PHASE 2

Will detect insecure authentication patterns in FastAPI, Flask, and Express via regex:
- Endpoints without auth middleware (AUTH-001, AUTH-002)
- CORS with `*` (AUTH-005)
- JWT with hardcoded secrets (AUTH-004)
- Cookies without security flags (AUTH-006)
- Non timing-safe password comparison (AUTH-007)

### SecretsAnalyzer (CAT-03) — PHASE 2

Will detect secrets and credentials in code:
- Placeholders copied from docs/examples (SEC-001)
- Secrets with low entropy (SEC-002)
- Connection strings with credentials (SEC-003)
- Environment variables with sensitive defaults (SEC-004)
- Secret files outside .gitignore (SEC-005)
- Values copied from .env.example (SEC-006)

### TestQualityAnalyzer (CAT-06) — PHASE 3

Will detect tests that provide false coverage:
- Tests without assertions (TEST-001)
- Trivial assertions (TEST-002)
- Generic exception catching in tests (TEST-003)
- Tests skipped without reason (TEST-004)
- API tests without status code verification (TEST-005)
- Mocks that replicate the implementation (TEST-006)
