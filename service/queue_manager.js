/**
 * Enhanced Persistence & Task Queue Manager for Manifest V3 Service Worker
 * Includes Speed Boost (Higher Parallel Streams) & Real-time ETA ETA calculation
 */

const STORAGE_KEY_QUEUES = "vdh_download_queues";
const STORAGE_KEY_SETTINGS = "vdh_settings";

export class DownloadQueueManager {
  constructor() {
    this.queue = [];
    this.activeDownloads = new Map();
    this.maxConcurrent = 6; // High performance download concurrency
    this.isInitialized = false;
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
      console.log("[VDH QueueManager] Initialized high-speed queue:", this.queue.length);
    } catch (err) {
      console.error("[VDH QueueManager] Initialization failed:", err);
    }
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
        speed_mbps: item.speed_mbps
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
      extension: task.extension || "mp4",
      strategy: task.strategy || "hls",
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
        current.lastBytes = progress.fetched_bytes_count || 0;
      }

      const fetchedBytes = progress.fetched_bytes_count || current.progress.fetched_bytes || 0;
      const percentVal = progress.percent?.value || current.progress.percent?.value || 0;
      
      // Calculate speed (MB/s) and ETA (seconds)
      const timeDiff = (now - current.lastTime) / 1000;
      if (timeDiff >= 0.8) {
        const bytesDiff = fetchedBytes - current.lastBytes;
        const bytesPerSec = bytesDiff / timeDiff;
        current.speed_mbps = (bytesPerSec / (1024 * 1024)).toFixed(2);
        
        if (percentVal > 0 && percentVal < 100) {
          const totalEstimatedBytes = (fetchedBytes / percentVal) * 100;
          const remainingBytes = totalEstimatedBytes - fetchedBytes;
          if (bytesPerSec > 0) {
            current.eta_seconds = Math.ceil(remainingBytes / bytesPerSec);
          }
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
  }

  async getStatus() {
    await this.init();
    return {
      active: Array.from(this.activeDownloads.values()),
      queued: this.queue,
      maxConcurrent: this.maxConcurrent
    };
  }
}

export const queueManager = new DownloadQueueManager();
