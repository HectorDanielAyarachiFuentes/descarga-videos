# Descarga Videos + yt-dlp Companion Engine 🚀

Plataforma unificada de captura y descarga multimedia de alto rendimiento para **Mozilla Firefox** potenciada por el motor nativo **yt-dlp** y **FFmpeg**.

---

## 🌟 Características Principales

- **Frontend / Extensión Firefox WebExtension MV3:**
  - Detección automática e instantánea de streams en pestañas activas (YouTube, Vimeo, Facebook, Instagram, Kick, BigBlueButton, etc.).
  - Interfaz de usuario moderna con diseño Glassmorphism y temas oscuro/claro premium.
  - Cola de descargas concurrente con reintentos automáticos y persistencia en navegador.
  - Panel de diagnóstico en tiempo real con monitoreo de eventos y salud del servicio.

- **Backend / Companion Engine (Python + yt-dlp):**
  - Servidor HTTP local multi-hilo (`gui_server.py`) con API REST y soporte completo CORS.
  - Descargas de máxima calidad: Streams DASH 1080p, 1440p, 4K 60fps ensamblados con FFmpeg.
  - Conversión ultra-rápida a audio MP3 (320kbps / 256kbps / 192kbps) con preservación de metadatos.
  - Soporte especializado para aulas virtuales y BigBlueButton (UNCOMA, Moodle, grabaciones con webcams + presentación).
  - Web UI de escritorio independiente (`web_ui/` y `run_gui.bat`).

---

## 🚀 Inicio Rápido

### 1. Iniciar el Servidor Companion (yt-dlp)
Para habilitar la descarga de videos de alta calidad o plataformas protegidas, inicia el companion en Windows:

```cmd
run_companion.bat
```

*El servidor iniciará en `http://127.0.0.1:5000` con CORS habilitado para comunicarse con la extensión.*

### 2. Cargar la Extensión en Firefox
1. Abre Firefox y navega a `about:debugging#/runtime/this-firefox`.
2. Haz clic en **Cargar complemento temporal...**.
3. Selecciona el archivo `manifest.json` en la raíz de esta carpeta.
4. El icono de **Descarga Videos** aparecerá en tu barra de herramientas.

---

## 📁 Estructura del Proyecto

```
descarga-videos/
├── manifest.json            # Manifiesto WebExtension MV3 para Firefox
├── content/                 # Interfaz visual de la extensión (Sidebar, Popup, estilos)
├── service/                 # Service Worker, gestor de colas y cliente companion
├── injected/                # Scripts inyectados para detección en páginas
├── bitmaps/                 # Iconos y activos gráficos
├── _locales/                # Soporte multi-idioma (i18n)
│
├── gui_server.py            # Servidor HTTP Companion con API REST y ErrorLogger
├── yt_dlp/                  # Núcleo y extractores del motor yt-dlp
├── web_ui/                  # Interfaz gráfica web para uso independiente
├── run_companion.bat        # Lanzador para el modo Companion (Extensión + yt-dlp)
├── run_gui.bat              # Lanzador para la interfaz web de escritorio
├── cookies.txt              # Archivo opcional de cookies para sitios autenticados
└── AGENTS.md                # Directrices para agentes de IA y GitNexus
```

---

## 🛠️ Requisitos

- **Python 3.9+** (con `imageio_ffmpeg` o FFmpeg instalado en el sistema).
- **Mozilla Firefox** (versión reciente compatible con Manifest V3).
