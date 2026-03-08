---
title: "Introduccion"
description: "Bienvenido a la documentacion de vigil, el scanner de seguridad para codigo generado por IA."
order: 1
icon: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M4 19.5A2.5 2.5 0 0 0 6.5 21H20V5H6.5A2.5 2.5 0 0 0 4 7.5v12z"
---

# Documentacion de vigil

Bienvenido a la documentacion de **vigil**, el scanner de seguridad para codigo generado por IA.

## Indice

| Documento | Descripcion |
|-----------|-------------|
| [Inicio rapido](/vigil-docs/docs/v0-6-0/getting-started/) | Instalacion, primer scan y conceptos basicos |
| [Referencia CLI](/vigil-docs/docs/v0-6-0/cli/) | Todos los comandos, flags y opciones disponibles |
| [Configuracion](/vigil-docs/docs/v0-6-0/configuration/) | Archivo `.vigil.yaml`, estrategias, overrides y merge de config |
| [Reglas](/vigil-docs/docs/v0-6-0/rules/) | Catalogo completo de las 26 reglas con ejemplos de codigo vulnerable |
| [Formatos de salida](/vigil-docs/docs/v0-6-0/output-formats/) | Human, JSON, JUnit XML y SARIF 2.1.0 |
| [Integracion CI/CD](/vigil-docs/docs/v0-6-0/ci-cd/) | GitHub Actions, GitLab CI, pre-commit hooks y quality gates |
| [Docker](/vigil-docs/docs/v0-6-0/docker/) | Uso en contenedores, Dockerfile de referencia y buenas practicas |
| [Seguridad](/vigil-docs/docs/v0-6-0/security/) | Modelo de amenazas, que detecta vigil, alineacion OWASP y limitaciones |
| [Analizadores](/vigil-docs/docs/v0-6-0/analyzers/) | Referencia tecnica de los analyzers implementados (Dependency, Auth, Secrets, Test Quality) |
| [Arquitectura](/vigil-docs/docs/v0-6-0/architecture/) | Estructura interna, flujo del engine, protocolo de analyzers |
| [Buenas practicas](/vigil-docs/docs/v0-6-0/best-practices/) | Recomendaciones para equipos que usan agentes de IA para generar codigo |
| [Compliance y uso empresarial](/vigil-docs/docs/v0-6-0/compliance/) | Alineacion con OWASP, CRA, SOC 2, ISO 27001, NIST y uso en pipelines empresariales |
| [Contribuir](/vigil-docs/docs/v0-6-0/contributing/) | Guia para contribuir al proyecto, setup de desarrollo y testing |

## Estado del proyecto

vigil esta en desarrollo activo. La version actual (v0.6.0) incluye:

- CLI completa con 5 subcomandos (`scan`, `deps`, `tests`, `init`, `rules`)
- Motor de analisis con soporte para multiples analyzers
- **Dependency Analyzer activo** — detecta paquetes alucinados, typosquatting, versiones inexistentes (DEP-001, DEP-002, DEP-003, DEP-005, DEP-007)
- **Auth Analyzer activo** — detecta endpoints sin auth, CORS permisivo, JWT inseguro, cookies sin flags, timing attacks (AUTH-001 a AUTH-007)
- **Secrets Analyzer activo** — detecta placeholders, secrets de baja entropia, connection strings, env defaults, valores copiados de .env.example (SEC-001 a SEC-004, SEC-006)
- **Test Quality Analyzer activo** — detecta tests sin assertions, assertions triviales, catch-all exceptions, skips sin razon, API tests sin status code, mock mirrors (TEST-001 a TEST-006)
- 26 reglas definidas en 4 categorias (24 implementadas, 2 pendientes)
- 4 formatos de salida (human, JSON, JUnit XML, SARIF 2.1.0)
- Sistema de configuracion con YAML, presets y overrides por CLI
- Suite de integracion end-to-end con fixtures de codigo AI-generated real
- QA exhaustivo: falsos positivos, falsos negativos, edge cases, regresiones
- 1518 tests (99% cobertura en modulo reports)
