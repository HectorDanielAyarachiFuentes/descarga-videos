# Python Companion Backend Rules (yt-dlp Engine)

Reglas y arquitectura para el backend local complementario en Python ubicado en la raíz (`gui_server.py`) con el ejecutable raíz `run_companion.bat`.

---

## 1. Contexto del Servidor Companion

- **Lenguaje:** Python 3.9+.
- **Punto de Entrada:** `gui_server.py` (lanzado con `run_companion.bat`).
- **Núcleo de Descarga:** `yt-dlp` local integrado directamente en `sys.path`.
- **Detección Multimedia:** `imageio_ffmpeg` o binarios de FFmpeg del sistema operativo para muxing de audio/video (DASH 1080p, 1440p, 4K) y extracción a MP3.

---

## 2. Contrato de la API HTTP (REST + CORS)

El servidor corre por defecto en `http://127.0.0.1:5000` (con auto-búsqueda hasta 5009).

| Ruta | Método | Descripción |
| :--- | :--- | :--- |
| `/api/status`, `/api/companion/status` | GET | Retorna estado del companion, versión de yt-dlp, disponibilidad de FFmpeg y ruta de descargas. |
| `/api/info?url=<URL>` | GET | Extrae metadatos, resoluciones disponibles, y parsea plataformas BBB sin descargar. |
| `/api/download` | POST | Inicia hilo de descarga asíncrono con yt-dlp. Parámetros: `{ url, format_type, quality, title, thumbnail }`. |
| `/api/progress` | GET | Reporta porcentaje, velocidad actual, ETA y nombre de archivo de la descarga activa. |
| `/api/history` | GET | Lista los últimos 20 archivos completados o detectados en la carpeta de descargas. |
| `/api/diagnostics` | GET | Lista en orden cronológico inverso los últimos eventos y fallos capturados por `ErrorLogger`. |
| `/api/open-folder` | POST | Abre el explorador de archivos nativo de Windows posicionado en el archivo o carpeta de descarga. |
| `/api/upload-cookies` | POST | Almacena `cookies.txt` para descargas de cuentas autenticadas. |

---

## 3. Reglas de Concurrencia y Estabilidad

1. **Thread-Safety:**
   - Todos los accesos al diccionario `downloads` en `DownloadManager` y a la lista `entries` en `ErrorLogger` deben estar protegidos por `self.lock`.
2. **CORS Obrigatario:**
   - Toda respuesta JSON debe emitir `Access-Control-Allow-Origin: *` y soportar `do_OPTIONS` con `Access-Control-Allow-Methods` y `Access-Control-Allow-Headers`.
3. **Manejo de Excepciones:**
   - Si yt-dlp falla con un extractor web estándar debido a protecciones o bots (ej: YouTube), `try_extract` debe reintentar automáticamente con clientes alternativos (`ios`, `android`).
   - Cada fallo de descarga debe reportarse a `ErrorLogger.log("ERROR", ...)` con detalles estructurados.
