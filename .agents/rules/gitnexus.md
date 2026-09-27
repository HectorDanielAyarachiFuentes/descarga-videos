# GitNexus Agent Rules — Code Intelligence & Error Tracking

Guía obligatoria para agentes de IA que desarrollen o depuren en este espacio de trabajo unificado (**Descarga Videos** WebExtension + **yt-dlp Companion Engine**).

---

## 1. Comandos Esenciales de GitNexus

| Propósito | Comando CLI | Herramienta MCP |
| :--- | :--- | :--- |
| **Búsqueda de flujos** | `node .gitnexus/run.cjs query "<concepto>"` | `gitnexus_query` |
| **Contexto 360° de símbolo** | `node .gitnexus/run.cjs context <símbolo>` | `gitnexus_context` |
| **Análisis de radio de impacto** | `node .gitnexus/run.cjs impact <símbolo> --direction upstream` | `gitnexus_impact` |
| **Trazar rutas entre capas** | `node .gitnexus/run.cjs trace <origen> <destino>` | `gitnexus_trace` |
| **Mapear cambios git y diffs** | `node .gitnexus/run.cjs detect-changes` | `gitnexus_detect_changes` |
| **Chequeos de integridad** | `node .gitnexus/run.cjs check` | `gitnexus_check` |
| **Reindexar proyecto completo** | `node .gitnexus/run.cjs analyze` | `gitnexus_analyze` |

---

## 2. Metodología para Diagnóstico y Resolución de Errores con GitNexus

Cuando se detecte o reporte un error en la aplicación (frontend de Firefox o backend yt-dlp):

1. **Localizar el punto de fallo:**
   - Si el error proviene de la UI/Sidebar de la extensión, consultar el contexto del handler en `content/companion_ui.js` o `service/queue_manager.js`.
   - Si el error proviene del backend (FFmpeg, descarga, extracción de URL), consultar `ErrorLogger`, `WebUIHandler` o `run_download_thread` en `gui_server.py`.

2. **Trazar la ruta de ejecución (Tracing):**
   ```bash
   node .gitnexus/run.cjs trace "companionClient" "run_download_thread"
   ```
   Esto revela todos los saltos: mensaje `runtime.sendMessage` -> listener en `DownloadQueueManager` -> llamada HTTP `fetch('/api/download')` -> `WebUIHandler.do_POST` -> `run_download_thread` -> `yt_dlp.YoutubeDL`.

3. **Verificar impacto antes de aplicar un fix (Blast Radius):**
   - Antes de modificar funciones compartidas o esquemas de datos:
   ```bash
   node .gitnexus/run.cjs impact <NombreFuncionOClase> --direction upstream
   ```
   - Si el nivel de riesgo (`risk`) es **HIGH** o **CRITICAL**, se deben revisar exhaustivamente todos los llamadores antes de guardar el cambio.

4. **Validación post-edición:**
   - Tras corregir el error, ejecutar:
   ```bash
   node .gitnexus/run.cjs detect-changes
   ```
   - Confirmar que los únicos símbolos y flujos afectados son los previstos y que no se introducen regresiones.

---

## 3. Reglas Estrictas (Never / Always)

- **SIEMPRE** comprobar `impact` antes de renombrar o alterar firmas de métodos compartidos (ej: `requestDownload`, `updateProgress`, `do_POST`).
- **NUNCA** sustituir búsquedas de texto plano por análisis del grafo de dependencias en refactorizaciones de componentes críticos.
- **NUNCA** ignorar advertencias de riesgo alto en GitNexus.
