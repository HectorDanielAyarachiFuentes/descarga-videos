/**
 * Enhanced Persistence & Task Queue Manager for Manifest V3 Service Worker
 * Includes Speed Boost (Higher Parallel Streams) & Real-time ETA ETA calculation
 */

import { companionClient } from "./companion_client.js";

const STORAGE_KEY_QUEUES = "vdh_download_queues";
const STORAGE_KEY_SETTINGS = "vdh_settings";

export class DownloadQueueManager {
  constructor() {
    this.queue = [];
    this.activeDownloads = new Map();
    this.maxConcurrent = 6; // High performance download concurrency
    this.isInitialized = false;
    this.companionPoller = null;
  }

  async init() {
    if (this.isInitialized) return;
    try {
      const stored = await chrome.storage.local.get([STORAGE_KEY_QUEUES, STORAGE_KEY_SETTINGS]);
      if (stored[STORAGE_KEY_QUEUES]) {
        this.queue = stored[STORAGE_KEY_QUEUES].queue || [];
        const savedActive = stored[STORAGE_KEY_QUEUES].active || [];
        for (const task of savedActive) {
          if (!this.queue.some(t => t.download_id === task.download_id)) {
            task.status = "interrupted";
            this.queue.unshift(task);
          }
        }
      }
      if (stored[STORAGE_KEY_SETTINGS]?.maxConcurrent) {
        this.maxConcurrent = Math.max(stored[STORAGE_KEY_SETTINGS].maxConcurrent, 6);
      }
      this.isInitialized = true;
      await this.persist();

      // Start companion heartbeat
      companionClient.startHeartbeat(10000, (online, res) => {
        console.log(`[QueueManager] Companion Server ${online ? "Conectado" : "Desconectado"}:`, res);
      });

      // Register runtime message listener for companion actions
      this._registerMessageListeners();

      console.log("[VDH QueueManager] Initialized high-speed queue with Companion support:", this.queue.length);
    } catch (err) {
      console.error("[VDH QueueManager] Initialization failed:", err);
    }
  }

  _registerMessageListeners() {
    if (this._hasRegisteredMessages) return;
    this._hasRegisteredMessages = true;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || !message.type) return false;

      if (message.type === "COMPANION_CHECK") {
        companionClient.checkConnection().then(res => sendResponse(res));
        return true;
      }

      if (message.type === "COMPANION_EXTRACT") {
        companionClient.extractInfo(message.url)
          .then(data => sendResponse({ success: true, data }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (message.type === "COMPANION_DOWNLOAD") {
        this.enqueue({
          url: message.url,
          title: message.title || "yt-dlp Download",
          strategy: "companion",
          format_type: message.format_type || "video",
          quality: message.quality || "best",
          thumbnail: message.thumbnail || ""
        }).then(dl_id => sendResponse({ success: true, download_id: dl_id }))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      }

      if (message.type === "COMPANION_DIAGNOSTICS") {
        companionClient.getDiagnostics().then(data => sendResponse(data));
        return true;
      }

      if (message.type === "COMPANION_OPEN_FOLDER") {
        companionClient.openFolder(message.path).then(res => sendResponse(res));
        return true;
      }

      if (message.type === "COMPANION_STATUS") {
        this.getUnifiedStatus().then(status => sendResponse(status));
        return true;
      }
    });
  }

  async persist() {
    try {
      const activeList = Array.from(this.activeDownloads.values()).map(item => ({
        download_id: item.download_id,
        url: item.url,
        title: item.title,
        status: item.status,
        progress: item.progress,
        eta_seconds: item.eta_seconds,
        speed_mbps: item.speed_mbps,
        strategy: item.strategy
      }));

      await chrome.storage.local.set({
        [STORAGE_KEY_QUEUES]: {
          queue: this.queue,
          active: activeList,
          lastUpdated: Date.now()
        }
      });
    } catch (err) {
      console.error("[VDH QueueManager] Persist failed:", err);
    }
  }

  async enqueue(task) {
    await this.init();
    const newTask = {
      download_id: task.download_id || `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: task.url,
      title: task.title || "Video Download",
      extension: task.extension || (task.format_type === "audio" ? "mp3" : "mp4"),
      strategy: task.strategy || "hls",
      format_type: task.format_type || "video",
      quality: task.quality || "best",
      thumbnail: task.thumbnail || "",
      addedAt: Date.now(),
      status: "queued",
      progress: { percent: 0, fetched_bytes: 0 },
      startTime: null,
      lastBytes: 0,
      lastTime: null,
      eta_seconds: null,
      speed_mbps: 0
    };
    this.queue.push(newTask);
    await this.persist();
    this.processNext();
    return newTask.download_id;
  }

  async updateProgress(download_id, progress) {
    if (this.activeDownloads.has(download_id)) {
      const current = this.activeDownloads.get(download_id);
      const now = Date.now();
      
      if (!current.startTime) {
        current.startTime = now;
        current.lastTime = now;
        current.lastBytes = progress.fetched_bytes_count || progress.downloaded_bytes || 0;
      }

      const fetchedBytes = progress.fetched_bytes_count || progress.downloaded_bytes || current.progress.fetched_bytes || 0;
      const percentVal = progress.percent?.value ?? progress.percent ?? current.progress.percent?.value ?? 0;
      
      // Calculate speed and ETA
      const timeDiff = (now - current.lastTime) / 1000;
      if (timeDiff >= 0.8) {
        const bytesDiff = fetchedBytes - current.lastBytes;
        const bytesPerSec = bytesDiff / timeDiff;
        if (progress.speed) {
          current.speed_mbps = progress.speed;
        } else {
          current.speed_mbps = (bytesPerSec / (1024 * 1024)).toFixed(2);
        }
        
        if (progress.eta) {
          current.eta_str = progress.eta;
        } else if (percentVal > 0 && percentVal < 100 && bytesPerSec > 0) {
          const totalEstimatedBytes = (fetchedBytes / percentVal) * 100;
          const remainingBytes = totalEstimatedBytes - fetchedBytes;
          current.eta_seconds = Math.ceil(remainingBytes / bytesPerSec);
        }
        current.lastBytes = fetchedBytes;
        current.lastTime = now;
      }

      current.progress = { ...current.progress, ...progress };
      current.status = progress.status || current.status;
      await this.persist();
    }
  }

  async finishDownload(download_id, success = true, errorReason = null) {
    if (this.activeDownloads.has(download_id)) {
      const finished = this.activeDownloads.get(download_id);
      finished.status = success ? "completed" : "failed";
      finished.errorReason = errorReason;
      finished.eta_seconds = 0;
      this.activeDownloads.delete(download_id);
      await this.persist();
      this.processNext();
    }
  }

  processNext() {
    if (this.activeDownloads.size >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    const nextTask = this.queue.shift();
    nextTask.status = "downloading";
    nextTask.startTime = Date.now();
    this.activeDownloads.set(nextTask.download_id, nextTask);
    this.persist();

    // If strategy is companion, dispatch to yt-dlp backend
    if (nextTask.strategy === "companion") {
      this._executeCompanionTask(nextTask);
    }
  }

  async _executeCompanionTask(task) {
    try {
      await companionClient.requestDownload({
        url: task.url,
        format_type: task.format_type,
        quality: task.quality,
        title: task.title,
        thumbnail: task.thumbnail
      });

      // Poll progress until completion
      const pollTimer = setInterval(async () => {
        try {
          const prog = await companionClient.getProgress();
          if (prog && prog.status) {
            await this.updateProgress(task.download_id, {
              status: prog.status,
              percent: prog.percent || 0,
              speed: prog.speed || "",
              eta: prog.eta || "",
              filename: prog.filename || "",
              output_path: prog.output_path || ""
            });

            if (prog.status === "finished") {
              clearInterval(pollTimer);
              await this.finishDownload(task.download_id, true);
            } else if (prog.status === "error") {
              clearInterval(pollTimer);
              await this.finishDownload(task.download_id, false, prog.error_message || "Error en companion");
            }
          }
        } catch (pollErr) {
          console.warn("[QueueManager] Poll companion error:", pollErr);
        }
      }, 1000);

    } catch (err) {
      console.error("[QueueManager] Failed to dispatch companion download:", err);
      await this.finishDownload(task.download_id, false, err.message);
    }
  }

  async getStatus() {
    await this.init();
    return {
      active: Array.from(this.activeDownloads.values()),
      queued: this.queue,
      maxConcurrent: this.maxConcurrent
    };
  }

  async getUnifiedStatus() {
    await this.init();
    const conn = await companionClient.checkConnection();
    return {
      active: Array.from(this.activeDownloads.values()),
      queued: this.queue,
      maxConcurrent: this.maxConcurrent,
      companion: {
        online: conn.online,
        port: companionClient.currentPort,
        status: companionClient.lastStatus,
        lastError: companionClient.lastError
      }
    };
  }
}

export const queueManager = new DownloadQueueManager();

