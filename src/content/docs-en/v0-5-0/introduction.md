---
title: "Introduction"
description: "Welcome to the vigil documentation, the security scanner for AI-generated code."
order: 1
icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5A2.5 2.5 0 0 0 6.5 21H20V5H6.5A2.5 2.5 0 0 0 4 7.5v12z"
---

# vigil Documentation

Welcome to the documentation for **vigil**, the security scanner for AI-generated code.

## Table of Contents

| Document | Description |
|----------|-------------|
| [Quick Start](/vigil-docs/en/docs/v0-5-0/getting-started/) | Installation, first scan, and basic concepts |
| [CLI Reference](/vigil-docs/en/docs/v0-5-0/cli/) | All commands, flags, and options available |
| [Configuration](/vigil-docs/en/docs/v0-5-0/configuration/) | `.vigil.yaml` file, strategies, overrides, and config merge |
| [Rules](/vigil-docs/en/docs/v0-5-0/rules/) | Complete catalog of all 26 rules with vulnerable code examples |
| [Output Formats](/vigil-docs/en/docs/v0-5-0/output-formats/) | Human, JSON, JUnit XML, and SARIF 2.1.0 |
| [CI/CD Integration](/vigil-docs/en/docs/v0-5-0/ci-cd/) | GitHub Actions, GitLab CI, pre-commit hooks, and quality gates |
| [Docker](/vigil-docs/en/docs/v0-5-0/docker/) | Container usage, reference Dockerfile, and best practices |
| [Security](/vigil-docs/en/docs/v0-5-0/security/) | Threat model, what vigil detects, OWASP alignment, and limitations |
| [Analyzers](/vigil-docs/en/docs/v0-5-0/analyzers/) | Technical reference for implemented analyzers (Dependency, Auth, Secrets, Test Quality) |
| [Architecture](/vigil-docs/en/docs/v0-5-0/architecture/) | Internal structure, engine flow, analyzer protocol |
| [Best Practices](/vigil-docs/en/docs/v0-5-0/best-practices/) | Recommendations for teams using AI agents to generate code |
| [Compliance and Enterprise Use](/vigil-docs/en/docs/v0-5-0/compliance/) | Alignment with OWASP, CRA, SOC 2, ISO 27001, NIST, and enterprise pipeline usage |
| [Contributing](/vigil-docs/en/docs/v0-5-0/contributing/) | Guide to contributing to the project, development setup, and testing |

## Project Status

vigil is in active development. The current version (v0.5.0) includes:

- Complete CLI with 5 subcommands (`scan`, `deps`, `tests`, `init`, `rules`)
- Analysis engine with support for multiple analyzers
- **Dependency Analyzer active** — detects hallucinated packages, typosquatting, nonexistent versions (DEP-001, DEP-002, DEP-003, DEP-005, DEP-007)
- **Auth Analyzer active** — detects endpoints without auth, permissive CORS, insecure JWT, cookies without flags, timing attacks (AUTH-001 through AUTH-007)
- **Secrets Analyzer active** — detects placeholders, low-entropy secrets, connection strings, env defaults, values copied from .env.example (SEC-001 through SEC-004, SEC-006)
- **Test Quality Analyzer active** — detects tests without assertions, trivial assertions, catch-all exceptions, skips without reason, API tests without status code, mock mirrors (TEST-001 through TEST-006)
- 26 rules defined across 4 categories (24 implemented, 2 pending)
- 4 output formats (human, JSON, JUnit XML, SARIF 2.1.0)
- Configuration system with YAML, presets, and CLI overrides
- 1170 unit tests (~98% coverage)
