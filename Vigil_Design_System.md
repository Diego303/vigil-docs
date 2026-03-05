Sistema de Diseño: "Vigil"

Guía de Estilos y Arquitectura Visual para Web y Documentación

1. Concepto Core y Filosofía Visual

La estética de Vigil se define como Brutalismo de Auditoría (Audit Brutalism).

No es un IDE oscuro (Intake) ni un manual de arquitectura cálido (Architect). Representa un informe de inspección técnica, un documento de conformidad y una auditoría de seguridad implacable.

Sensaciones: Autoridad, alerta, claridad quirúrgica, inmutabilidad, rigor técnico.

Elementos clave: Blancos rotos verdosos (papel continuo de impresora matricial), tintas verde oscuro casi negras, acentos verde esmeralda brillante, sombras duras sin difuminar, y ausencia total de curvas (0px border-radius).

2. Paleta de Colores (Tokens)

La paleta abandona los grises neutrales en favor de una escala de verdes técnicos que evocan fósforo de monitores antiguos y sellos de aprobación.

2.1 Fondos y Superficies (Papeles de Auditoría)

Paper (Fondo principal): #F4F7F5

Uso: Background del <body>. Un gris/verde extremadamente sutil que reduce la fatiga visual frente al blanco puro y simula papel de informe técnico.

Surface (Elevación): #FFFFFF

Uso: Tarjetas, modales, bloques de código, áreas de contenido destacadas. Destaca sobre el fondo Paper mediante sombras duras.

Lines/Grid (Cuadrículas): #E2E8E4

Uso: El color de la cuadrícula de fondo y los patrones de rayado (hatching).

2.2 Tintas (Texto y Estructura)

Ink (Tinta principal): #022C22 (Emerald 950 en Tailwind)

Uso: Texto principal, titulares (h1-h6), bordes gruesos estructurales (2px), iconos, sombras brutalistas. Es un verde tan oscuro que funciona como negro, dando un carácter único al texto.

Ink Light (Tinta secundaria): #064E3B (Emerald 900)

Uso: Párrafos de lectura larga, metadatos, textos secundarios y placeholders.

2.3 Acentos Semánticos (Marcadores)

Accent (Verde Técnico): #10B981 (Emerald 500)

Uso: Color de marca, selecciones de texto (::selection), decoraciones, indicadores de "Todo Correcto" (Pass/OK), hover en botones.

Alert (Rojo Vulnerabilidad): #EF4444 (Red 500)

Uso: Exclusivo para advertencias de seguridad, vulnerabilidades detectadas, fallos de auditoría (slopsquatting, etc.).

3. Tipografía

El sistema utiliza tres familias de Google Fonts con roles estrictamente delimitados.

3.1 Titulares e Identidad (Headings)

Familia: Space Grotesk (sans-serif)

Pesos: Regular (400), SemiBold (600), Bold (700).

Estilo: Generalmente en uppercase (mayúsculas) para rótulos y botones, con tracking ajustado (tracking-tight).

Uso: Exclusivo para H1, H2, H3, nombres de componentes principales y llamadas a la acción. Aporta un carácter de "ingeniería moderna".

3.2 Lectura y Documentación (Body)

Familia: Inter (sans-serif)

Pesos: Light (300), Regular (400), Medium (500), SemiBold (600).

Uso: Todo el texto de párrafos de documentación, descripciones de reglas de linteo, explicaciones largas. Maximiza la legibilidad.

3.3 Datos y Código (Monospace)

Familia: JetBrains Mono (monospace)

Pesos: Regular (400), Medium (500), Bold (700).

Uso: Fragmentos de código, comandos CLI (vigil scan), identificadores de reglas (ej. [DEP-001]), etiquetas de estado y navegación secundaria.

4. Lenguaje Visual y Texturas (VFX)

Vigil utiliza texturas para estructurar la información sin recurrir a contenedores pesados.

4.1 La Cuadrícula de Auditoría (Grid Pattern)

Un patrón de fondo que simula papel milimetrado. Se aplica al body.

CSS: linear-gradient de líneas de 1px color #E2E8E4 cada 40px.

4.2 Sombreado de Trama (Hatch Pattern)

Patrón de líneas diagonales a 45 grados.

Uso: Se utiliza para indicar áreas de "procesamiento", fondos de terminales emuladas o zonas de peligro. Actúa como relleno visual sin saturar de color sólido.

4.3 Marcas de Corte (Crop Marks)

El elemento visual más distintivo de Vigil. En lugar de cajas cerradas, las secciones críticas (como el Hero o bloques de advertencia) se enmarcan con esquinas abiertas simulando marcas de registro de imprenta.

Construcción: Ángulos de 12x12px con bordes de 2px de grosor (#022C22) posicionados en las esquinas (top: -6px, left: -6px, etc.).

4.4 Sombras Brutalistas y Bordes

Bordes: Todo contenedor interactivo lleva un borde sólido de 2px border-[#022C22]. Cero redondeo (rounded-none).

Sombra Base: Desplazamiento rígido a la derecha y abajo.

box-shadow: 4px 4px 0px 0px #022C22;

Interacción (Botones/Tarjetas): Al hacer hover o active, el elemento se traslada físicamente en X e Y para "aplastar" la sombra.

Hover: translate(2px, 2px) con sombra de 2px.

Active: translate(4px, 4px) con sombra de 0px.

5. Componentes Clave (UI Kit)

5.1 Botones (Tech Buttons)

Primario: Fondo Ink, Texto Surface, borde Ink 2px, sombra brutalista de 4px. Letra Space Grotesk, Bold, Uppercase. Al hacer hover, el fondo puede cambiar a Accent.

Secundario/Tags: Fondo Surface o Paper, borde Ink 2px. Letra JetBrains Mono. Uso para copiar al portapapeles o tags de categorías.

5.2 Iconografía e Identidad

El Rombo Hueco (◇): Es el símbolo principal. Se usa tipográficamente (como viñeta en listas o separador) y vectorialmente (polygon).

Ticks y Cruces: Se evitan los iconos de FontAwesome. Se prefieren los caracteres tipográficos (✔, ✗) estilizados con colores Accent y Alert, o SVGs de trazos rígidos y esquinas cuadradas.

5.3 Bloques de Código y Terminal

Para la documentación de una CLI, los bloques de código son cruciales.

Cabecera: Fondo Surface, borde inferior de 2px. Texto en JetBrains Mono, indicando "Terminal" o el nombre del archivo. Tres cuadrados macizos reemplazan los "puntitos" estilo Mac.

Cuerpo: Fondo Surface o fondo con Hatch Pattern. La fuente del código debe diferenciar claramente los prompts de usuario ($ en color Accent) de los outputs del sistema (en color Ink Light). Las alertas rojas destacan fuertemente en este entorno claro.

5.4 Tarjetas de Reglas (Rule Cards)

En la documentación, las reglas (ej. CAT-01) se presentan como tarjetas de inspección.

Estructura: Fondo Surface, borde 2px, sombra brutalista.

Etiqueta (Badge): Un bloque sólido en la esquina superior derecha con fondo Ink y texto blanco en Mono, anclado a los bordes superior y derecho.

6. Recomendaciones para el Sitio de Documentación (Astro/Starlight)

Si vas a montar la documentación oficial de Vigil:

Reemplazo de Defaults: Si usas un framework de docs (como Starlight o Docusaurus), sobrescribe inmediatamente las variables de border-radius a 0. Elimina los degradados y sombras suaves por defecto.

Tablas de Auditoría: Las tablas en Markdown deben renderizarse con bordes de 2px en las celdas de cabecera (TH) y bordes de 1px en las celdas de cuerpo (TD). Usa tipografía Mono para columnas de "Reglas" o "IDs".

Admonitions (Callouts): - Nota/Info: Caja con borde Ink, fondo Surface, viñeta de rombo (◇).

Warning/Peligro: Caja con borde Alert (Rojo), fondo blanco, sombra roja brutalista (box-shadow: 4px 4px 0px 0px #EF4444).

Layout Lateral (Sidebar): El menú de navegación izquierdo debe ser muy limpio. Tipografía JetBrains Mono en tamaño pequeño, con un borde derecho de 2px separándolo del contenido principal. El enlace activo debe tener un fondo de color Accent o estar enmarcado con corchetes [ enlace ].