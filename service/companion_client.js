/**
 * Companion Client for Firefox Extension
 * Bridges the WebExtension with the local Python yt-dlp Companion Server (gui_server.py)
 */

export class CompanionClient {
  constructor(basePort = 5000) {
    this.basePort = basePort;
    this.currentPort = basePort;
    this.isOnline = false;
    this.lastStatus = null;
    this.lastError = null;
    this.scanInterval = null;
    this.portRange = [5000, 5001, 5002, 5003, 5004, 5005];
  }

  getBaseUrl() {
    return `http://127.0.0.1:${this.currentPort}`;
  }

  /**
   * Pings the companion server across candidate ports
   */
  async checkConnection(timeoutMs = 1500) {
    for (const port of this.portRange) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const resp = await fetch(`http://127.0.0.1:${port}/api/status`, {
          method: "GET",
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (resp.ok) {
          const data = await resp.json();
          this.currentPort = port;
          this.isOnline = true;
          this.lastStatus = data;
          this.lastError = null;
          return { online: true, port, data };
        }
      } catch (err) {
        // Continue checking next candidate port
      }
    }

    this.isOnline = false;
    this.lastStatus = null;
    return { online: false, error: "Companion offline or unreachable" };
  }

  /**
   * Starts periodic background heartbeat
   */
  startHeartbeat(intervalMs = 10000, onStatusChange = null) {
    if (this.scanInterval) clearInterval(this.scanInterval);
    const check = async () => {
      const prev = this.isOnline;
      const res = await this.checkConnection();
      if (prev !== this.isOnline && onStatusChange) {
        onStatusChange(this.isOnline, res);
      }
    };
    check();
    this.scanInterval = setInterval(check, intervalMs);
  }

  stopHeartbeat() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Request video metadata & stream analysis via yt-dlp
   */
  async extractInfo(videoUrl) {
    const conn = await this.checkConnection();
    if (!conn.online) {
      throw new Error("El motor companion yt-dlp no está conectado. Inicia run_companion.bat.");
    }

    try {
      const resp = await fetch(`${this.getBaseUrl()}/api/info?url=${encodeURIComponent(videoUrl)}`);
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `Error HTTP ${resp.status} al consultar metadatos.`);
      }
      return await resp.json();
    } catch (err) {
      this.lastError = err.message;
      throw err;
    }
  }

  /**
   * Sends a download request to the local yt-dlp engine
   */
  async requestDownload({ url, format_type = "video", quality = "best", title = "", thumbnail = "" }) {
    const conn = await this.checkConnection();
    if (!conn.online) {
      throw new Error("El motor companion yt-dlp no está conectado. Inicia run_companion.bat.");
    }

    try {
      const resp = await fetch(`${this.getBaseUrl()}/api/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format_type, quality, title, thumbnail })
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `Error HTTP ${resp.status} al iniciar descarga.`);
      }
      return await resp.json();
    } catch (err) {
      this.lastError = err.message;
      throw err;
    }
  }

  /**
   * Retrieves active download progress
   */
  async getProgress() {
    if (!this.isOnline) return { status: "idle", companion_online: false };
    try {
      const resp = await fetch(`${this.getBaseUrl()}/api/progress`);
      if (!resp.ok) return { status: "idle" };
      return await resp.json();
    } catch (err) {
      return { status: "idle", error: err.message };
    }
  }

  /**
   * Retrieves download history
   */
  async getHistory() {
    if (!this.isOnline) return [];
    try {
      const resp = await fetch(`${this.getBaseUrl()}/api/history`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.history || [];
    } catch (err) {
      return [];
    }
  }

  /**
   * Retrieves error logs and system diagnostics from companion
   */
  async getDiagnostics() {
    const conn = await this.checkConnection();
    if (!conn.online) {
      return { status: "offline", entries: [], error: "Companion offline" };
    }
    try {
      const resp = await fetch(`${this.getBaseUrl()}/api/diagnostics`);
      if (!resp.ok) return { status: "error", entries: [] };
      return await resp.json();
    } catch (err) {
      return { status: "error", entries: [], error: err.message };
    }
  }

  /**
   * Open the destination directory in OS file explorer
   */
  async openFolder(path = null) {
    if (!this.isOnline) return { error: "Companion offline" };
    try {
      const resp = await fetch(`${this.getBaseUrl()}/api/open-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });
      return await resp.json();
    } catch (err) {
      return { error: err.message };
    }
  }
}

export const companionClient = new CompanionClient();
