# Agent Guidelines & Repository Rules (`AGENTS.md`)

Directrices de desarrollo, arquitectura y flujos obligatorios para agentes de IA que trabajen en este repositorio unificado (**Descarga Videos** + **yt-dlp Companion Engine**).

---

## 1. Visión General del Proyecto Unificado

Este proyecto fusiona dos mundos complementarios para ofrecer la máxima potencia de descarga multimedia:

1. **Frontend / Extensión Firefox (`descarga-videos`):**
   - Extensión WebExtension Manifest V3 nativa para Gecko (`browser_specific_settings.gecko`).
   - Captura y detección de video en pestañas (YouTube, Vimeo, Facebook, Instagram, Kick, BigBlueButton, etc.).
   - Interfaz con diseño ultra-premium en `content/` (`sidebar.html`, `popup.html`, `theme_premium.css`).
   - Gestor de colas y persistencia en `service/queue_manager.js`.
   - Componente visual de estado y diagnóstico en tiempo real (`content/companion_ui.js`).

2. **Backend / Motor yt-dlp Companion (`Nueva carpeta/`):**
   - Servidor HTTP local multihilo en Python (`Nueva carpeta/gui_server.py`), con ejecutable raíz `run_companion.bat`.
   - Núcleo de extracción universal con `yt-dlp` y ensamblaje de streams de alta calidad (1080p, 1440p, 4K 60fps) mediante FFmpeg.
   - API REST con soporte completo CORS (`GET/POST/OPTIONS`) en `http://127.0.0.1:5000`.
   - Módulo de registro y diagnóstico de errores en memoria (`ErrorLogger` y `/api/diagnostics`).

3. **Puente de Integración:**
   - `service/companion_client.js`: Cliente de comunicación asíncrona con auto-detección y latido (heartbeat).
   - Enrutamiento inteligente de tareas en `queue_manager.js`: Si una descarga requiere yt-dlp (o el usuario elige modo avanzado), se delega automáticamente al companion.

---

## 2. Estructura de Directorios

```
descarga-videos/
├── .agents/
│   └── rules/
│       ├── gitnexus.md            # Guía de comandos e impacto con GitNexus
│       ├── firefox-extension.md   # Estándares WebExtension MV3 para Firefox
│       ├── companion-backend.md   # Reglas del servidor Python yt-dlp
│       └── error-tracking.md      # Procedimientos de diagnóstico y trazado
├── _locales/                      # Mensajes de internacionalización
├── bitmaps/                       # Iconos y logotipos de la extensión
├── content/                       # Vistas HTML, CSS premium y componentes UI
│   ├── theme_premium.css          # Tokens de diseño, glassmorphism y estilos
│   ├── companion_ui.js            # Banner de estado y visor de diagnóstico
│   ├── sidebar.html / popup.html  # Paneles principales
│   └── panel.js                   # Lógica central de renderizado
├── injected/                      # Content scripts inyectados en páginas objetivo
├── service/                       # Service Worker y gestores de fondo
│   ├── main.js                    # Punto de entrada del worker
│   ├── queue_manager.js           # Cola de descargas de alta concurrencia
│   └── companion_client.js        # Cliente HTTP hacia el companion local
├── Nueva carpeta/                 # Servidor y motor yt-dlp
│   ├── gui_server.py              # Servidor HTTP con API REST y ErrorLogger
│   ├── run_gui.bat                # Script de inicio local
│   ├── yt_dlp/                    # Biblioteca completa yt-dlp
│   └── web_ui/                    # Interfaz web complementaria
├── manifest.json                  # Manifiesto V3 de la extensión de Firefox
├── run_companion.bat              # Lanzador raíz del servidor companion
└── AGENTS.md                      # Este documento
```

---

## 3. Integración Obligatoria con GitNexus

Este repositorio utiliza **GitNexus** como Knowledge Graph de código para analizar dependencias, flujos y prevenir errores antes de editar código.

### 3.1 Comandos Clave

```bash
# Búsqueda de conceptos o flujos
node "Nueva carpeta\.gitnexus\run.cjs" query "<concepto>"

# Contexto de un símbolo (llamadores y llamados)
node "Nueva carpeta\.gitnexus\run.cjs" context <Simbolo>

# Blast Radius (Análisis de impacto antes de editar)
node "Nueva carpeta\.gitnexus\run.cjs" impact <Simbolo> --direction upstream

# Trazado de ruta entre componentes (ej: JS frontend a Python backend)
node "Nueva carpeta\.gitnexus\run.cjs" trace <Origen> <Destino>

# Verificación de cambios git antes de confirmar
node "Nueva carpeta\.gitnexus\run.cjs" detect-changes
node "Nueva carpeta\.gitnexus\run.cjs" check
```

---

## 4. Flujo de Trabajo para Detección y Resolución de Errores

1. **Revisar Diagnóstico en Vivo:**
   - En la extensión: hacer clic en el botón `🩺` (Diagnóstico) para inspeccionar eventos en tiempo real.
   - En el backend: consultar `http://127.0.0.1:5000/api/diagnostics`.
2. **Inspeccionar Impacto con GitNexus:**
   - Antes de modificar funciones compartidas o esquemas de mensajes, ejecutar `gitnexus impact <Simbolo>`.
3. **Validación de Sintaxis:**
   - Python: `python -m py_compile "Nueva carpeta\gui_server.py"`.
   - JavaScript: verificar carga limpia sin advertencias de sintaxis.
4. **Verificación de Diff:**
   - Ejecutar `gitnexus detect-changes` para asegurar que las modificaciones no alteren flujos no deseados.

---

## 5. Checklist Obligatorio para el Agente

- [ ] ¿Se preservaron las firmas y contratos de datos entre la extensión y el companion?
- [ ] ¿Se validó el radio de impacto con GitNexus (`impact`) antes de editar funciones críticas?
- [ ] ¿Se respetaron los tokens de diseño de `content/theme_premium.css`?
- [ ] ¿Se comprobó la compilación de Python (`py_compile`) y la carga de módulos ES en Firefox?
- [ ] ¿Se ejecutó `gitnexus detect-changes` para validar los cambios?

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **descarga-videos** (45612 symbols, 114039 relationships, 1051 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/descarga-videos/context` | Codebase overview, check index freshness |
| `gitnexus://repo/descarga-videos/clusters` | All functional areas |
| `gitnexus://repo/descarga-videos/processes` | All execution flows |
| `gitnexus://repo/descarga-videos/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
