# Firefox Extension Guidelines & Architecture Rules

Directrices y estándares de desarrollo para la extensión de Firefox **Descarga Videos** (Manifest V3 para Gecko).

---

## 1. Contexto de la Extensión

- **Target:** Mozilla Firefox (Gecko engine, versión mínima estricta 115.0+).
- **ID de la extensión:** `descarga-videos@descargavideos.app`.
- **Estructura clave:**
  - `manifest.json`: Manifiesto V3 configurado para Firefox (`browser_specific_settings.gecko`).
  - `service/`: Background service worker (`main.js`), gestor de colas de descarga (`queue_manager.js`), y cliente de enlace con companion (`companion_client.js`).
  - `content/`: UI del Sidebar (`sidebar.html`), Popup (`popup.html`), Estilos de diseño premium (`theme_premium.css`), Componentes (`register_components.js`, `panel.js`) y Banner de control (`companion_ui.js`).
  - `injected/`: Content scripts específicos de plataforma (YouTube, Vimeo, Facebook, Instagram, Kick, Bilibili, etc.).
  - `download_worker/`: Workers dedicados para descargas por fragmentos (HLS / DASH).

---

## 2. Reglas de Desarrollo en WebExtensions

### 2.1 Seguridad y Content Security Policy (CSP)
- Mantener la estricta política de seguridad: `"extension_pages": "script-src 'self' 'wasm-unsafe-eval'"`.
- **PROHIBIDO** el uso de `eval()` con strings arbitrarios, `new Function(untrusted)`, o inyección de scripts externos sin validar.
- Toda comunicación cross-context (content script <-> background) debe pasar por `chrome.runtime.sendMessage` o puertos `Port`.

### 2.2 Comunicación con el Companion Local
- La extensión se comunica con el servidor local en `http://127.0.0.1:5000` mediante llamadas `fetch()`.
- Siempre envolver las peticiones con `AbortController` y timeouts cortos (1.5s max para heartbeats) para evitar bloquear la UI cuando el companion esté offline.
- Fallback elegante: Si el companion está desconectado, la extensión debe operar en modo navegador sin mostrar errores bloqueantes.

### 2.3 Estética y Experiencia de Usuario (UI Design)
- Todas las interfaces (`sidebar.html`, `popup.html`, modales) deben utilizar los tokens de diseño de `theme_premium.css`.
- Paleta basada en modo oscuro futurista (fondo `#0f172a`, tarjetas `#1e293b` con efecto cristal glassmorphism y desenfoque `backdrop-filter: blur(12px)`).
- Micro-animaciones para transiciones, botones con gradiente interactivo (`--accent-gradient`), e indicadores de pulso de estado (`status-dot.online`).
