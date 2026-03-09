---
title: "FAQ & Troubleshooting"
description: "Frequently asked questions, false positives, performance, encoding, and common issues."
order: 15
icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3 M12 17h.01"
---

Frequently asked questions and solutions to common problems.

---

## General

### Does vigil use AI to detect problems?

No. vigil is **100% deterministic**. It uses static rules, regex, and registry verification. It doesn't make calls to AI APIs, has no inference costs, and the same code always produces the same results.

### What languages does it support?

Python and JavaScript/TypeScript. Supported dependency files are `requirements.txt`, `pyproject.toml`, `package.json`. The auth, secrets, and test quality analyzers analyze `.py`, `.js`, `.ts`, `.jsx`, `.tsx` files.

### Does vigil replace Semgrep/Snyk/SonarQube?

No. vigil detects problems **specific to AI-generated code** that those tools don't cover. It is complementary:

| Problem | vigil | Semgrep | Snyk | Gitleaks |
|---------|-------|---------|------|----------|
| Hallucinated package (doesn't exist) | Yes | No | No | No |
| Typosquatting | Yes | No | Partial | No |
| Placeholder secret (`"changeme"`) | Yes | Partial | No | No |
| Leaked real secret | No | No | No | Yes |
| Known CVE in dependency | No | No | Yes | No |
| SQL injection | No | Yes | No | No |

### How many rules does it have?

26 defined, 24 implemented. The 2 pending ones are DEP-004 (packages with few downloads — requires statistics API) and DEP-006 (imports not declared in dependencies — requires AST import parsing).

---

## Installation and setup

### What Python version do I need?

Python 3.12 or higher. vigil uses `tomllib` from the stdlib (available since 3.11) and `str | None` syntax (available since 3.10), but the official target is 3.12+.

### How do I install in development mode?

```bash
git clone https://github.com/Diego303/vigil-cli.git
cd vigil
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
vigil --version
```

### The `vigil` command is not found after installing

Make sure the virtual environment is activated (`source .venv/bin/activate`) or that pip's scripts directory is in your PATH. Alternative: `python -m vigil`.

---

## Dependencies and registry

### What does vigil do with HTTP requests?

It only makes GET requests to the public APIs of PyPI (`pypi.org/pypi/{name}/json`) and npm (`registry.npmjs.org/{name}`) to verify that packages exist. **It does not send source code or project data** — only package names.

### How do I avoid HTTP requests?

```bash
vigil scan src/ --offline
```

In offline mode, DEP-001, DEP-002, DEP-005, and DEP-007 are skipped (they require the registry). DEP-003 (typosquatting) still works because it uses a local corpus.

### What's the difference between `--offline` and `--no-verify`?

`--offline` disables **all** HTTP requests for the entire scan (applies to all analyzers). `--no-verify` is specific to the `vigil deps` subcommand and only disables existence verification in registries.

In practice, for a `vigil scan`, use `--offline`. For `vigil deps`, you can use either `--no-verify` or `--offline`.

### Does the registry cache take up a lot of space?

No. Each package is cached as an individual JSON file in `~/.cache/vigil/registry/`. A project with 100 dependencies generates ~100 files of ~1-2 KB each.

### How do I clean the cache?

```bash
rm -rf ~/.cache/vigil/registry/
```

### How do I force fresh requests without deleting the cache?

Set `cache_ttl_hours: 0` in `.vigil.yaml`:

```yaml
deps:
  cache_ttl_hours: 0
```

### vigil reports a package as nonexistent but it does exist

Possible causes:
1. **Stale cache**: Clean the cache with `rm -rf ~/.cache/vigil/registry/` and run again.
2. **Temporary network issue**: If the request failed during the scan, vigil assumes the package exists (to avoid false positives). Re-run.
3. **Normalized name**: PyPI treats `my-package`, `my_package`, and `my.package` as equivalent. Verify that the name in your `requirements.txt` matches the official name on pypi.org.

---

## False positives

### AUTH-002 fires on my `/login` endpoint — is it a false positive?

It is **by design**. AUTH-002 detects mutating endpoints (POST/PUT/DELETE) without auth middleware. A POST `/login` has no auth because it's the entry point — but vigil can't distinguish it from a POST `/delete-account` without auth.

**Solution:** Disable AUTH-002 for that case, or reduce its severity:

```yaml
rules:
  AUTH-002:
    severity: "medium"  # Doesn't block CI
```

### AUTH-005 (CORS) fires in development/test files

vigil has a heuristic that suppresses AUTH-005 in files within dev/test directories (`dev/`, `test/`, `tests/`, `local/`, `example/`) or with dev prefixes (`dev_`, `test_`, `local_`). If your file is outside these paths:

```yaml
auth:
  cors_allow_localhost: true  # Suppresses AUTH-005 in dev/test paths
```

Or disable the rule directly:

```yaml
rules:
  AUTH-005:
    enabled: false
```

### SEC-001 detects a value that isn't a placeholder

Placeholder patterns are configurable regex. If a pattern generates false positives in your project, you can customize the list in `.vigil.yaml`:

```yaml
secrets:
  placeholder_patterns:
    - "changeme"
    - "your-.*-here"
    # ... only the patterns you need
```

### TEST-002 (trivial assertion) fires on tests that verify existence

`assert x is not None` is considered trivial if it's the **only** assertion in the test. If your test has additional meaningful assertions, TEST-002 doesn't fire.

If the existence check is intentionally your only assertion:

```yaml
rules:
  TEST-002:
    severity: "low"
```

### How do I suppress a rule for the entire project?

```yaml
# .vigil.yaml
rules:
  RULE-ID:
    enabled: false
```

### How do I change a rule's severity without disabling it?

```yaml
rules:
  AUTH-005:
    severity: "low"  # Still detects but doesn't block with --fail-on high
```

### `--rule` doesn't show findings for a rule disabled in config

Yes, it does. Since v1.0.0, `--rule DEP-001` takes priority over `enabled: false` in `.vigil.yaml`. The CLI flag always wins over the YAML config.

---

## Performance

### The scan is slow with many dependencies

Registry verification (DEP-001, DEP-002, DEP-005, DEP-007) makes one HTTP request per package. For projects with many dependencies:

1. **Use cache**: Subsequent runs are fast (24h TTL by default).
2. **Use `--offline`**: Only runs static checks — instant.
3. **Limit categories**: `vigil scan src/ -C auth -C secrets` if you only need those checks.

### Typosquatting scan (DEP-003) is slow

The corpus has 8400+ packages. For 200+ dependencies, the scan can take ~20 seconds. vigil uses early rejection based on length to optimize, but projects with hundreds of dependencies are inherently slower.

**Mitigation**: In pre-commit hooks, use `--changed-only` to only check modified files.

### Large files or binaries slow down the scan

vigil automatically excludes directories like `.venv/`, `node_modules/`, `.git/`, `dist/`, `build/`, `__pycache__/`. If you have other directories with large files:

```yaml
exclude:
  - "data/"
  - "assets/"
  - "vendor/"
```

---

## Encoding and files

### Does vigil crash with non-UTF8 files?

It shouldn't. Analyzers use `errors="replace"` when reading files, which replaces invalid bytes with the Unicode replacement character. If you find a crash due to encoding, report it as a bug.

### Does vigil analyze binary files?

No. It only analyzes files with known text extensions (`.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.txt`, `.toml`, `.json`, `.yaml`, `.yml`). Binaries, images, and compiled files are ignored.

### Does vigil detect problems in empty files?

No. An empty file generates no findings.

---

## Configuration

### What happens if my `.vigil.yaml` has a syntax error?

vigil reports a clear error and exits with exit code 2:

```
Error: Config file .vigil.yaml: invalid fail_on 'extreme'. Must be one of: critical, high, info, low, medium
```

### What happens if I don't have a `.vigil.yaml`?

vigil works with sensible defaults:
- `fail_on: "high"`
- All analyzers active
- All languages
- Registry verification enabled
- Cache TTL of 24 hours

### Can I have different configs for CI and local development?

Yes. Create multiple files and use `--config`:

```bash
# Local
vigil scan src/

# CI
vigil scan src/ --config .vigil.strict.yaml
```

### What predefined strategies are there?

| Strategy | `fail_on` | `min_age_days` | `max_token_lifetime_hours` |
|----------|-----------|----------------|---------------------------|
| `strict` | `medium` | 60 | 1 |
| `standard` | `high` | 30 | 24 |
| `relaxed` | `critical` | 7 | 72 |

```bash
vigil init --strategy strict
```

---

## CI/CD

### How do I prevent vigil from blocking my pipeline while adopting the tool?

Progressive strategy:

```bash
# Week 1: critical only
vigil scan src/ --fail-on critical

# Week 2: add high
vigil scan src/ --fail-on high

# Week 3: full coverage
vigil scan src/ --fail-on medium
```

### Can I use vigil with GitHub Code Scanning?

Yes. Generate a SARIF report and upload it:

```yaml
- run: vigil scan src/ -f sarif -o vigil.sarif
  continue-on-error: true
- uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: vigil.sarif
```

Findings appear in Security > Code scanning alerts.

### The pre-commit hook is too slow

Use `--changed-only --offline --quiet` to minimize time:

```bash
vigil scan --changed-only --offline --fail-on critical --quiet
```

This only analyzes staged files, doesn't make HTTP requests, and only shows findings.

---

## Exit codes

### What do the exit codes mean?

| Code | Meaning |
|------|---------|
| `0` | No findings above the threshold |
| `1` | Findings found above the threshold |
| `2` | Execution error (invalid config, nonexistent path, etc.) |

### vigil returns exit 1 but I don't see critical findings

The default threshold is `high`, not `critical`. Findings with HIGH severity also cause exit code 1. Use `--fail-on critical` if you only want to block on critical ones.

### vigil returns exit 0 but there are findings in the output

The findings you see are below the configured threshold. For example, with `--fail-on high`, findings with MEDIUM and LOW severity appear in the output but don't cause exit code 1.
