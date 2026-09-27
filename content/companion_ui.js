/**
 * Companion UI Bridge & Diagnostics Component for Firefox Extension
 * Provides visual status, yt-dlp controls, and detailed error tracking.
 */

export class CompanionUI {
  constructor() {
    this.container = null;
    this.statusDot = null;
    this.statusText = null;
    this.badgePill = null;
    this.diagPanel = null;
    this.diagVisible = false;
  }

  mount(targetElement = document.body) {
    if (document.getElementById("companion-status-bar")) return;

    const bar = document.createElement("div");
    bar.id = "companion-status-bar";
    bar.className = "companion-status-bar";
    bar.innerHTML = `
      <div class="companion-status-left">
        <span class="status-dot" id="companion-dot"></span>
        <span style="font-weight:600;" id="companion-label">yt-dlp Companion:</span>
        <span class="companion-badge-pill offline" id="companion-badge">Detectando...</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button id="companion-folder-btn" title="Abrir carpeta de descargas" style="padding:3px 8px; font-size:0.75rem; background:rgba(255,255,255,0.1) !important;">📁</button>
        <button id="companion-diag-btn" title="Ver diagnóstico y errores" style="padding:3px 8px; font-size:0.75rem; background:rgba(255,255,255,0.1) !important;">🩺</button>
      </div>
    `;

    // Diagnostics overlay panel
    const diag = document.createElement("div");
    diag.id = "companion-diagnostics-panel";
    diag.className = "diagnostics-panel";
    diag.style.display = "none";
    diag.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
        <strong style="color:#38bdf8;">🩺 Diagnóstico & Errores en Vivo</strong>
        <span id="close-diag-btn" style="cursor:pointer; color:#94a3b8;">✕</span>
      </div>
      <div id="diagnostics-logs-content" style="display:flex; flex-direction:column; gap:4px;">
        <div style="color:#94a3b8;">Consultando estado del servidor y cola...</div>
      </div>
    `;

    if (targetElement.firstChild) {
      targetElement.insertBefore(bar, targetElement.firstChild);
      targetElement.insertBefore(diag, bar.nextSibling);
    } else {
      targetElement.appendChild(bar);
      targetElement.appendChild(diag);
    }

    this.container = bar;
    this.statusDot = bar.querySelector("#companion-dot");
    this.statusText = bar.querySelector("#companion-label");
    this.badgePill = bar.querySelector("#companion-badge");
    this.diagPanel = diag;

    // Listeners
    bar.querySelector("#companion-folder-btn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "COMPANION_OPEN_FOLDER" });
    });

    bar.querySelector("#companion-diag-btn")?.addEventListener("click", () => {
      this.toggleDiagnostics();
    });

    diag.querySelector("#close-diag-btn")?.addEventListener("click", () => {
      this.toggleDiagnostics(false);
    });

    this.pollStatus();
    setInterval(() => this.pollStatus(), 8000);
  }

  async pollStatus() {
    try {
      chrome.runtime.sendMessage({ type: "COMPANION_CHECK" }, (resp) => {
        if (chrome.runtime.lastError || !resp || !resp.online) {
          this.setOffline();
        } else {
          this.setOnline(resp.data);
        }
      });
    } catch {
      this.setOffline();
    }
  }

  setOnline(info) {
    if (this.statusDot) {
      this.statusDot.className = "status-dot online";
    }
    if (this.badgePill) {
      this.badgePill.className = "companion-badge-pill online";
      const ffmpeg = info?.ffmpeg_available ? "FFmpeg OK" : "Sin FFmpeg";
      this.badgePill.textContent = `En Línea (${ffmpeg})`;
    }
  }

  setOffline() {
    if (this.statusDot) {
      this.statusDot.className = "status-dot";
    }
    if (this.badgePill) {
      this.badgePill.className = "companion-badge-pill offline";
      this.badgePill.textContent = "Desconectado";
      this.badgePill.title = "Ejecuta run_companion.bat en la raíz del proyecto para activar el motor yt-dlp.";
    }
  }

  toggleDiagnostics(forceState = null) {
    this.diagVisible = forceState !== null ? forceState : !this.diagVisible;
    if (this.diagPanel) {
      this.diagPanel.style.display = this.diagVisible ? "block" : "none";
      if (this.diagVisible) {
        this.refreshDiagnostics();
      }
    }
  }

  refreshDiagnostics() {
    const container = document.getElementById("diagnostics-logs-content");
    if (!container) return;

    container.innerHTML = `<div style="color:#94a3b8;">Cargando diagnóstico...</div>`;

    chrome.runtime.sendMessage({ type: "COMPANION_DIAGNOSTICS" }, (resp) => {
      if (!resp || resp.status === "offline" || !resp.entries) {
        container.innerHTML = `
          <div class="log-entry warn">
            <span>[AVISO]</span>
            <span>El servidor Companion no responde en 127.0.0.1:5000.</span>
          </div>
          <div style="color:#94a3b8; font-size:0.75rem; margin-top:4px;">
            Inicia <code>run_companion.bat</code> para habilitar logs avanzados de yt-dlp y descargas de alta resolución.
          </div>
        `;
        return;
      }

      if (resp.entries.length === 0) {
        container.innerHTML = `
          <div class="log-entry success">
            <span>[OK]</span>
            <span>Servidor Companion activo sin errores registrados.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = resp.entries.map(e => `
        <div class="log-entry ${e.level.toLowerCase()}">
          <span style="opacity:0.6;">[${e.time_str || ''}]</span>
          <strong>[${e.level}]</strong>
          <span>${e.message}</span>
        </div>
      `).join("");
    });
  }
}

// Auto mount if in DOM context
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const ui = new CompanionUI();
    ui.mount();
  });
}
