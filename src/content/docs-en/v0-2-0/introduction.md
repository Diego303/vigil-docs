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
| [Quick Start](/vigil-docs/en/docs/v0-2-0/getting-started/) | Installation, first scan, and basic concepts |
| [CLI Reference](/vigil-docs/en/docs/v0-2-0/cli/) | All commands, flags, and options available |
| [Configuration](/vigil-docs/en/docs/v0-2-0/configuration/) | `.vigil.yaml` file, strategies, overrides, and config merge |
| [Rules](/vigil-docs/en/docs/v0-2-0/rules/) | Complete catalog of all 26 rules with vulnerable code examples |
| [Output Formats](/vigil-docs/en/docs/v0-2-0/output-formats/) | Human, JSON, JUnit XML, and SARIF 2.1.0 |
| [CI/CD Integration](/vigil-docs/en/docs/v0-2-0/ci-cd/) | GitHub Actions, GitLab CI, pre-commit hooks, and quality gates |
| [Docker](/vigil-docs/en/docs/v0-2-0/docker/) | Container usage, reference Dockerfile, and best practices |
| [Security](/vigil-docs/en/docs/v0-2-0/security/) | Threat model, what vigil detects, OWASP alignment, and limitations |
| [Analyzers](/vigil-docs/en/docs/v0-2-0/analyzers/) | Technical reference for implemented analyzers (DependencyAnalyzer) |
| [Architecture](/vigil-docs/en/docs/v0-2-0/architecture/) | Internal structure, engine flow, analyzer protocol |
| [Best Practices](/vigil-docs/en/docs/v0-2-0/best-practices/) | Recommendations for teams using AI agents to generate code |
| [Contributing](/vigil-docs/en/docs/v0-2-0/contributing/) | Guide to contributing to the project, development setup, and testing |

## Project Status

vigil is in active development. The current version (v0.2.0) includes:

- Full CLI with 5 subcommands (`scan`, `deps`, `tests`, `init`, `rules`)
- Analysis engine with support for multiple analyzers
- **Dependency Analyzer active** — detects hallucinated packages, typosquatting, nonexistent versions (DEP-001, DEP-002, DEP-003, DEP-005, DEP-007)
- 26 rules defined across 4 categories
- 4 output formats (human, JSON, JUnit XML, SARIF 2.1.0)
- Configuration system with YAML, presets, and CLI overrides
- 632 unit tests (~94% coverage)

The remaining analyzers (Auth, Secrets, Test Quality) are being implemented progressively.
