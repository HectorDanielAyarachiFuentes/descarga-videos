# Error Tracking & Diagnostics Rules

Procedimientos y estándares para la detección, diagnóstico y resolución de errores en el proyecto unificado.

---

## 1. Dónde y Cómo Identificar Errores

### 1.1 Errores en la Extensión de Firefox (Frontend & Service Worker)
- **Consola del Service Worker:** Acceder a `about:debugging#/runtime/this-firefox` en Firefox, buscar **Descarga Videos** y pulsar **Inspeccionar**.
- **Panel de Diagnóstico Integrado:** En el Sidebar o Popup de la extensión, hacer clic en el botón con icono de estetoscopio (`🩺`). Esto abre el visor en vivo que consulta `/api/diagnostics` y el estado de la cola en `chrome.storage.local`.
- **Errores de Red / CORS:** Si las peticiones al companion fallan, verificar en la pestaña **Red (Network)** de las DevTools que el servidor responda con código 200 en las peticiones preflight `OPTIONS`.

### 1.2 Errores en el Motor yt-dlp (Backend Python)
- **Registro Centralizado (`ErrorLogger`):** Todos los eventos, fallos de extracción y errores de descarga se capturan con marca temporal en `error_logger.entries`.
- **Consulta HTTP Directa:**
  ```bash
  curl http://127.0.0.1:5000/api/diagnostics
  ```
  Permite a agentes y desarrolladores inspeccionar los últimos 100 eventos sin reiniciar el servidor.
- **Tipos de Errores Comunes:**
  - `ExtractorError` / `403 Forbidden`: Indica requerimiento de cookies (`cookies.txt`) o necesidad de emular clientes móviles (`ios`, `android`).
  - `FFmpeg not found`: Ocurre cuando `imageio_ffmpeg` o el ejecutable en el sistema no están en PATH.

---

## 2. Diagnóstico Asistido por GitNexus

Para errores cuya causa raíz no sea evidente:

1. **Rastrear el flujo de datos completo:**
   ```bash
   node "Nueva carpeta\.gitnexus\run.cjs" trace "companionClient" "run_download_thread"
   ```
2. **Revisar dependientes antes de parchear:**
   ```bash
   node "Nueva carpeta\.gitnexus\run.cjs" context <SimboloSospechoso>
   ```
3. **Verificar que el fix no cause regresiones:**
   ```bash
   node "Nueva carpeta\.gitnexus\run.cjs" detect-changes
   ```
