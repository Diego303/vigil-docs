export type Lang = 'es' | 'en';
export const defaultLang: Lang = 'es';

export const ui = {
  es: {
    layout: {
      title: 'Vigil | Security Scanner para Código de IA',
      description: 'El primer security scanner determinista dise\u00F1ado para c\u00F3digo generado por agentes de IA.',
    },
    nav: {
      problem: '/problema',
      features: '/caracter\u00EDsticas',
      docs: '/documentaci\u00F3n',
      github: 'GITHUB',
    },
    hero: {
      status: 'Status: Pre-Release v1.0',
      titleLine1: 'Tu IA escribe c\u00F3digo',
      titleHighlight: 'r\u00E1pido.',
      titleLine2: 'Tambi\u00E9n vulnerabilidades.',
      description: 'Vigil es el primer security scanner determinista dise\u00F1ado para c\u00F3digo generado por agentes de Inteligencia Artificial. Detecta slopsquatting, alucinaciones y falsos tests en segundos.',
      installCmd: 'pip install vigil-ai',
      githubBtn: 'Github',
      tagline: 'Sin telemetr\u00EDa. Sin costes de API. Open Source.',
      terminalTitle: 'Terminal \u2014 vigil scan',
      terminalLines: [
        { type: 'prompt', text: 'vigil scan src/ --format human' },
        { type: 'info', text: '\u25C7 Vigil V1.0 - Analizando 42 archivos...' },
        { type: 'separator', text: '==================================================' },
        { type: 'critical', text: '[CR\u00CDTICO] DEP-001: Dependency Hallucination' },
        { type: 'detail', text: '\u203A Archivo: requirements.txt:14' },
        { type: 'detail', text: "\u203A Paquete: 'fastapi-auth-middleware' NO EXISTE en PyPI." },
        { type: 'detail', text: '\u203A Riesgo: Alto potencial de Slopsquatting (Ejecuci\u00F3n de c\u00F3digo arbitrario).' },
        { type: 'alert', text: '[ALERTA] TEST-001: Test Theater Detected' },
        { type: 'detail', text: '\u203A Archivo: tests/test_auth.py:22' },
        { type: 'detail', text: "\u203A Funci\u00F3n: 'test_verify_token' pasa pero no contiene asserts v\u00E1lidos." },
        { type: 'separator', text: '==================================================' },
        { type: 'fail', text: '\u2717 Scan fallido: 2 problemas encontrados en 1.2s' },
      ],
    },
    problem: {
      title: 'El Gap que Semgrep no cubre',
      subtitle: 'Las herramientas tradicionales buscan CVEs en c\u00F3digo humano. Los agentes de IA introducen un nuevo vector de ataque de 0-days que los scanners actuales ignoran.',
      stats: [
        {
          stat: '20%',
          title: 'Dependencias Falsas',
          description: 'De los paquetes recomendados por LLMs no existen en ning\u00FAn registry. Son alucinaciones esperando ser secuestradas por un atacante.',
        },
        {
          stat: '45%',
          title: 'C\u00F3digo Vulnerable',
          description: 'Del c\u00F3digo generado por IA contiene fallos de seguridad como over-permission, CORS desactivado o asserts vac\u00EDos en tests.',
        },
        {
          stat: '100%',
          title: 'Riesgo de Slopsquatting',
          description: 'Los nombres alucinados son repetibles. Atacantes registran esos paquetes en npm o PyPI para inyectar malware directo a tu m\u00E1quina local.',
        },
      ],
    },
    features: {
      title: 'Capacidades del Linter',
      cards: [
        {
          badge: 'CAT-01',
          title: 'Dependency Hallucination',
          description: 'Verifica la existencia real de dependencias. Bloquea el vector de ataque Slopsquatting verificando repositorios de npm, PyPI y crates.io en tiempo real.',
          items: ['Detecta paquetes que no existen', 'Alerta sobre paquetes < 30 d\u00EDas de vida', 'Previene typosquatting avanzado'],
        },
        {
          badge: 'CAT-06',
          title: 'Detecci\u00F3n de "Test Theater"',
          description: 'Los LLMs a menudo generan tests que elevan el coverage pero no prueban nada. Vigil lee la sem\u00E1ntica del test.',
          items: ['Identifica funciones de test sin asserts', 'Detecta mocks que replican la implementaci\u00F3n', 'Alerta sobre aserciones in\u00FAtiles (ej. is_not_None)'],
        },
        {
          badge: 'CAT-02',
          title: 'Over-Permission & Auth Gaps',
          description: 'Las IAs priorizan que el c\u00F3digo "funcione" sobre que sea seguro, abriendo endpoints y desactivando CORS para evitar errores.',
          items: ['Endpoints sensibles sin middleware Auth', 'CORS configurado de forma permisiva (*)', 'Archivos con permisos 777'],
        },
        {
          badge: 'CAT-03',
          title: 'Secrets & Placeholders',
          description: 'Evita que secretos harcodeados o valores de ejemplo (copiados de .env.example) lleguen a tu entorno de producci\u00F3n.',
          items: ['Valores como "sk-your-key-here" o "TODO"', 'JWT Secrets d\u00E9biles o por defecto', 'Credenciales est\u00E1ticas con baja entrop\u00EDa'],
        },
      ],
    },
    integration: {
      title: 'Integraci\u00F3n sin fricci\u00F3n',
      subtitle: 'Vigil es una CLI pura. Se integra en tu pipeline existente en minutos y genera reportes en formatos est\u00E1ndar.',
      precommit: 'Pre-commit Hook',
      cicd: 'CI/CD (SARIF Export)',
      architect: 'Architect Quality Gate',
    },
    cta: {
      title: 'Asegura tu c\u00F3digo hoy',
      description: 'Instala ruff para estilo. Instala Semgrep para CVEs.\nInstala Vigil para alucinaciones de IA.',
      docsBtn: 'Leer Documentaci\u00F3n',
    },
    footer: {
      copyright: '2026 Vigil Project Security. Hecho con Claude Code',
    },
    docsHub: {
      title: 'Documentaci\u00F3n',
      subtitle: 'Explora las gu\u00EDas y referencia t\u00E9cnica de Vigil',
      searchPlaceholder: 'Buscar en la documentaci\u00F3n...',
      versionLabel: 'Versi\u00F3n',
      noResults: 'No se encontraron resultados.',
    },
    sidebar: {
      backToDocs: 'Volver a Docs',
      tableOfContents: 'Contenido',
    },
  },
  en: {
    layout: {
      title: 'Vigil | Security Scanner for AI Code',
      description: 'The first deterministic security scanner designed for AI-generated code.',
    },
    nav: {
      problem: '/problem',
      features: '/features',
      docs: '/documentation',
      github: 'GITHUB',
    },
    hero: {
      status: 'Status: Pre-Release v1.0',
      titleLine1: 'Your AI writes code',
      titleHighlight: 'fast.',
      titleLine2: 'Also vulnerabilities.',
      description: 'Vigil is the first deterministic security scanner designed for AI-generated code. It detects slopsquatting, hallucinations, and fake tests in seconds.',
      installCmd: 'pip install vigil-ai',
      githubBtn: 'Github',
      tagline: 'No telemetry. No API costs. Open Source.',
      terminalTitle: 'Terminal \u2014 vigil scan',
      terminalLines: [
        { type: 'prompt', text: 'vigil scan src/ --format human' },
        { type: 'info', text: '\u25C7 Vigil V1.0 - Scanning 42 files...' },
        { type: 'separator', text: '==================================================' },
        { type: 'critical', text: '[CRITICAL] DEP-001: Dependency Hallucination' },
        { type: 'detail', text: '\u203A File: requirements.txt:14' },
        { type: 'detail', text: "\u203A Package: 'fastapi-auth-middleware' DOES NOT EXIST on PyPI." },
        { type: 'detail', text: '\u203A Risk: High potential for Slopsquatting (Arbitrary code execution).' },
        { type: 'alert', text: '[ALERT] TEST-001: Test Theater Detected' },
        { type: 'detail', text: '\u203A File: tests/test_auth.py:22' },
        { type: 'detail', text: "\u203A Function: 'test_verify_token' passes but contains no valid asserts." },
        { type: 'separator', text: '==================================================' },
        { type: 'fail', text: '\u2717 Scan failed: 2 issues found in 1.2s' },
      ],
    },
    problem: {
      title: 'The Gap Semgrep Doesn\'t Cover',
      subtitle: 'Traditional tools look for CVEs in human code. AI agents introduce a new 0-day attack vector that current scanners ignore.',
      stats: [
        {
          stat: '20%',
          title: 'Fake Dependencies',
          description: 'Of packages recommended by LLMs don\'t exist in any registry. They\'re hallucinations waiting to be hijacked by an attacker.',
        },
        {
          stat: '45%',
          title: 'Vulnerable Code',
          description: 'Of AI-generated code contains security flaws like over-permission, disabled CORS, or empty asserts in tests.',
        },
        {
          stat: '100%',
          title: 'Slopsquatting Risk',
          description: 'Hallucinated names are repeatable. Attackers register those packages on npm or PyPI to inject malware directly into your machine.',
        },
      ],
    },
    features: {
      title: 'Linter Capabilities',
      cards: [
        {
          badge: 'CAT-01',
          title: 'Dependency Hallucination',
          description: 'Verifies real existence of dependencies. Blocks the Slopsquatting attack vector by checking npm, PyPI, and crates.io repositories in real time.',
          items: ['Detects non-existent packages', 'Alerts on packages < 30 days old', 'Prevents advanced typosquatting'],
        },
        {
          badge: 'CAT-06',
          title: '"Test Theater" Detection',
          description: 'LLMs often generate tests that increase coverage but test nothing. Vigil reads the semantic meaning of the test.',
          items: ['Identifies test functions without asserts', 'Detects mocks that replicate implementation', 'Alerts on useless assertions (e.g. is_not_None)'],
        },
        {
          badge: 'CAT-02',
          title: 'Over-Permission & Auth Gaps',
          description: 'AIs prioritize making code "work" over making it secure, opening endpoints and disabling CORS to avoid errors.',
          items: ['Sensitive endpoints without Auth middleware', 'Permissively configured CORS (*)', 'Files with 777 permissions'],
        },
        {
          badge: 'CAT-03',
          title: 'Secrets & Placeholders',
          description: 'Prevents hardcoded secrets or example values (copied from .env.example) from reaching your production environment.',
          items: ['Values like "sk-your-key-here" or "TODO"', 'Weak or default JWT Secrets', 'Static credentials with low entropy'],
        },
      ],
    },
    integration: {
      title: 'Frictionless Integration',
      subtitle: 'Vigil is a pure CLI. It integrates into your existing pipeline in minutes and generates reports in standard formats.',
      precommit: 'Pre-commit Hook',
      cicd: 'CI/CD (SARIF Export)',
      architect: 'Architect Quality Gate',
    },
    cta: {
      title: 'Secure your code today',
      description: 'Install ruff for style. Install Semgrep for CVEs.\nInstall Vigil for AI hallucinations.',
      docsBtn: 'Read Documentation',
    },
    footer: {
      copyright: '2026 Vigil Project Security. Made with Claude Code',
    },
    docsHub: {
      title: 'Documentation',
      subtitle: 'Explore Vigil\'s guides and technical reference',
      searchPlaceholder: 'Search documentation...',
      versionLabel: 'Version',
      noResults: 'No results found.',
    },
    sidebar: {
      backToDocs: 'Back to Docs',
      tableOfContents: 'Contents',
    },
  },
} as const;
