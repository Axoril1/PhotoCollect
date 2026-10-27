import { compressImage } from './CompressionService';
import { validateFile, checkDuplicates } from './ValidationService';
import { isTransientError, getBackoffDelay } from './RetryService';
import networkMonitor from './NetworkMonitor';
import axios from 'axios';
import api from '../api/axios';

class UploadManager {
  constructor(config = {}) {
    // Configurable thresholds (Phase 2, 3, 6)
    this.config = {
      concurrency: config.concurrency || 3,
      maxLongEdge: config.maxLongEdge || 3000,
      quality: config.quality || 0.82,
      minSizeToCompress: config.minSizeToCompress || 1.5 * 1024 * 1024, // 1.5MB
      maxSizeBytes: config.maxSizeBytes || 50 * 1024 * 1024, // 50MB
      allowedTypes: config.allowedTypes || ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/jpg'],
      minWidth: config.minWidth || 100,
      minHeight: config.minHeight || 100,
      maxRetries: config.maxRetries || 3,
    };

    this.queue = [];
    this.listeners = new Set();
    this.concurrency = this.config.concurrency;
    this.isPaused = false;
    this.networkState = { isOnline: true, connectionType: 'good' };
    this.abortControllers = new Map(); // itemId -> AbortController
    this.retryTimers = new Map(); // itemId -> setTimeout ID
    this.isCompressing = false; // Sequential compression flag

    // Overall stats for the current batch
    this.stats = {
      totalTime: 0,
      originalBytes: 0,
      compressedBytes: 0,
      savedBytes: 0,
      startTime: null,
      endTime: null,
      successCount: 0,
    };

    // Subscribing to network changes
    this.unsubscribeNetwork = networkMonitor.subscribe((state) => {
      const wasOffline = !this.networkState.isOnline;
      this.networkState = state;
      
      if (state.isOnline) {
        if (wasOffline) {
          // Auto-resume queue when connection returns
          this.resumeQueue();
        } else {
          this.processQueue();
        }
      } else {
        // Pauses execution loop while offline and aborts active uploads
        this.abortActiveUploadsDueToOffline();
      }
    });
  }

  // Configure concurrency dynamically
  setConcurrency(value) {
    this.concurrency = Math.max(1, value);
    this.processQueue();
  }

  // Subscribe to changes in the queue
  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getSnapshot());
    return () => this.listeners.delete(callback);
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Error notifying subscriber:', err);
      }
    }
  }

  getSnapshot() {
    return {
      queue: [...this.queue],
      isPaused: this.isPaused,
      isOnline: this.networkState.isOnline,
      connectionType: this.networkState.connectionType,
      stats: { ...this.stats },
      activeUploadsCount: this.queue.filter(item => item.status === 'uploading').length,
    };
  }

  // Enqueue new files
  async enqueue(files, slug, eventPassword = '') {
    if (!files || files.length === 0) return { enqueuedCount: 0, duplicateNames: [] };

    // Reset statistics if starting a fresh batch
    const active = this.queue.some(item => ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(item.status));
    if (!active) {
      this.stats = {
        totalTime: 0,
        originalBytes: 0,
        compressedBytes: 0,
        savedBytes: 0,
        startTime: Date.now(),
        endTime: null,
        successCount: 0,
      };
    }

    // Filter duplicates
    const { uniqueFiles, duplicates } = checkDuplicates(files, this.queue);

    const newItems = uniqueFiles.map((file, index) => {
      // Lazy preview URL generation to optimize memory usage (Phase 9)
      // Only generate object URLs for the first 5 items; the rest are generated when processed.
      const previewUrl = index < 5 ? URL.createObjectURL(file) : null;
      return {
        id: Math.random().toString(36).substring(2, 11),
        name: file.name,
        file,
        compressedFile: null,
        previewUrl,
        progress: 0,
        status: 'waiting', // waiting, compressing, ready, uploading, processing, completed, retrying, failed, cancelled
        statusText: 'Waiting',
        error: '',
        retryCount: 0,
        speed: '',
        originalSize: file.size,
        compressedSize: file.size,
        slug,
        eventPassword,
      };
    });

    this.queue = [...this.queue, ...newItems];
    this.notify();

    // Trigger processing
    this.processQueue();

    return { enqueuedCount: newItems.length, duplicateNames: duplicates };
  }

  // Pause uploads
  pauseQueue() {
    this.isPaused = true;
    this.notify();
  }

  // Resume uploads
  resumeQueue() {
    this.isPaused = false;
    // Reset any items that were interrupted by network loss
    this.queue.forEach(item => {
      if (item.status === 'retrying' && item.statusText.includes('Offline')) {
        item.status = 'ready';
        item.statusText = 'Ready';
      }
    });
    this.notify();
    this.processQueue();
  }

  // Abort active uploads when connection is lost
  abortActiveUploadsDueToOffline() {
    this.queue.forEach(item => {
      if (item.status === 'uploading') {
        if (this.abortControllers.has(item.id)) {
          this.abortControllers.get(item.id).abort();
          this.abortControllers.delete(item.id);
        }
        item.status = 'retrying';
        item.statusText = 'Offline. Waiting to resume...';
        item.progress = 0;
      }
    });
    this.notify();
  }

  // Retry an individual failed item
  retryItem(itemId) {
    const item = this.queue.find(i => i.id === itemId);
    if (!item) return;

    item.status = 'ready';
    item.statusText = 'Ready';
    item.retryCount = 0;
    item.error = '';
    item.progress = 0;
    this.notify();
    this.processQueue();
  }

  // Cancel a single item
  cancelUpload(itemId) {
    const item = this.queue.find(i => i.id === itemId);
    if (!item) return;

    // Abort ongoing Axios call
    if (this.abortControllers.has(itemId)) {
      this.abortControllers.get(itemId).abort();
      this.abortControllers.delete(itemId);
    }

    // Cancel scheduled retry timer
    if (this.retryTimers.has(itemId)) {
      clearTimeout(this.retryTimers.get(itemId));
      this.retryTimers.delete(itemId);
    }

    // Clean up preview object URL
    if (item.previewUrl) {
      try { URL.revokeObjectURL(item.previewUrl); } catch {}
    }

    // Remove item from queue to keep list clean
    this.queue = this.queue.filter(i => i.id !== itemId);

    this.notify();
    this.processQueue();
  }

  // Filter completed items out of queue view
  clearCompleted() {
    this.queue = this.queue.filter(item => {
      if (item.status === 'completed') {
        if (item.previewUrl) {
          try { URL.revokeObjectURL(item.previewUrl); } catch {}
        }
        return false;
      }
      return true;
    });
    this.notify();
  }

  // Cancel all remaining uploads and clean up all resources
  cancelAll() {
    this.queue.forEach(item => {
      if (item.previewUrl) {
        try { URL.revokeObjectURL(item.previewUrl); } catch {}
      }
      if (this.abortControllers.has(item.id)) {
        this.abortControllers.get(item.id).abort();
        this.abortControllers.delete(item.id);
      }
      if (this.retryTimers.has(item.id)) {
        clearTimeout(this.retryTimers.get(item.id));
        this.retryTimers.delete(item.id);
      }
    });
    this.queue = [];
    this.notify();
  }

  // Central loop orchestrator
  async processQueue() {
    if (this.isPaused) {
      return;
    }

    // 1. Image compression (concurrency = 1)
    // Run sequentially to prevent browser/tab crashing on resource-constrained mobile browsers
    if (!this.isCompressing) {
      const nextToCompress = this.queue.find(item => item.status === 'waiting');
      if (nextToCompress) {
        this.isCompressing = true;
        this.compressItem(nextToCompress);
      }
    }

    // 2. Concurrent uploads (concurrency = this.concurrency)
    // Only upload if online
    if (!this.networkState.isOnline) {
      return;
    }

    const activeUploads = this.queue.filter(item => item.status === 'uploading');
    if (activeUploads.length < this.concurrency) {
      const nextToUpload = this.queue.find(item => item.status === 'ready');
      if (nextToUpload) {
        this.uploadItem(nextToUpload);
        // Recursively trigger to fill concurrent slots
        this.processQueue();
      }
    }
  }

  // Sequence compression
  async compressItem(item) {
    // Generate preview URL lazily if not created yet (Phase 9)
    if (!item.previewUrl && item.file) {
      item.previewUrl = URL.createObjectURL(item.file);
      this.notify();
    }

    item.status = 'compressing';
    item.statusText = 'Compressing';
    this.notify();

    try {
      // Validate file dimensions/integrity using configurable thresholds (Phase 3)
      await validateFile(item.file, {
        maxSizeBytes: this.config.maxSizeBytes,
        allowedTypes: this.config.allowedTypes,
        minWidth: this.config.minWidth,
        minHeight: this.config.minHeight,
      });

      // Perform compression & HEIC conversions using configurable thresholds (Phase 2, 4)
      const compressedFile = await compressImage(item.file, {
        maxLongEdge: this.config.maxLongEdge,
        quality: this.config.quality,
        minSizeToCompress: this.config.minSizeToCompress,
      });

      item.compressedFile = compressedFile;
      item.compressedSize = compressedFile.size;
      item.status = 'ready';
      item.statusText = 'Ready';

      // Update compression metrics
      this.stats.originalBytes += item.originalSize;
      this.stats.compressedBytes += item.compressedSize;
      this.stats.savedBytes = Math.max(0, this.stats.originalBytes - this.stats.compressedBytes);
    } catch (err) {
      item.status = 'failed';
      item.statusText = 'Validation failed';
      item.error = err.message;

      // Do NOT revoke previewUrl so the failed item thumbnail is still visible in the queue panel.
      // It will be revoked once the user cancels it or clears the queue.
    } finally {
      this.isCompressing = false;
      this.notify();
      this.processQueue();
    }
  }

  // Axios uploader with dynamic speed calculation and retries
  async uploadItem(item) {
    item.status = 'uploading';
    item.statusText = 'Uploading';
    item.progress = 0;
    this.notify();

    const controller = new AbortController();
    this.abortControllers.set(item.id, controller);

    const formData = new FormData();
    const fileToUpload = item.compressedFile || item.file;
    formData.append('photos', fileToUpload);
    formData.append('uploaderName', 'Guest');
    if (item.eventPassword) {
      formData.append('eventPassword', item.eventPassword);
    }

    const startTime = Date.now();

    try {
      await api.post(`/photos/${item.slug}`, formData, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(item.eventPassword ? { 'x-event-password': item.eventPassword } : {}),
        },
        onUploadProgress: (progressEvent) => {
          if (item.status !== 'uploading') return;

          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          const elapsedSecs = (Date.now() - startTime) / 1000;
          let speedText = '';
          if (elapsedSecs > 0.1) {
            const kbps = (progressEvent.loaded / 1024) / elapsedSecs;
            speedText = kbps > 1024 
              ? `${(kbps / 1024).toFixed(1)} MB/s` 
              : `${Math.round(kbps)} KB/s`;
          }

          item.progress = progress;
          item.speed = speedText;
          item.statusText = progress === 100 ? 'Processing' : 'Uploading';
          this.notify();
        },
      });

      // Handle success
      item.status = 'completed';
      item.statusText = 'Completed';
      item.progress = 100;
      item.error = '';
      this.stats.successCount += 1;

      this.abortControllers.delete(item.id);

      // Do NOT revoke previewUrl immediately to allow rendering in completion summary or list.
      // It will be revoked once the queue is closed/cleared.

      this.checkBatchCompletion();
    } catch (err) {
      this.abortControllers.delete(item.id);

      if (axios.isCancel(err)) {
        if (!this.networkState.isOnline) {
          item.status = 'retrying';
          item.statusText = 'Offline. Waiting to resume...';
          item.progress = 0;
          this.notify();
          return;
        }
        
        // Manual cancellation removes the item from the queue
        this.queue = this.queue.filter(i => i.id !== item.id);
        this.notify();
        this.processQueue();
        return;
      }

      // Check for transient failure to schedule retries (Phase 6)
      if (isTransientError(err) && item.retryCount < this.config.maxRetries && this.networkState.isOnline) {
        item.retryCount += 1;
        item.status = 'retrying';
        item.progress = 0;

        const delay = getBackoffDelay(item.retryCount);
        item.statusText = `Retrying in ${(delay / 1000).toFixed(0)}s (Attempt ${item.retryCount}/${this.config.maxRetries})`;
        this.notify();

        const timerId = setTimeout(() => {
          this.retryTimers.delete(item.id);
          item.status = 'ready';
          this.notify();
          this.processQueue();
        }, delay);

        this.retryTimers.set(item.id, timerId);
      } else {
        // Non-transient or exceeded retries
        item.status = 'failed';
        item.statusText = 'Failed';
        item.error = err.response?.data?.error || err.message || 'Upload failed';

        this.checkBatchCompletion();
      }
    } finally {
      this.notify();
      this.processQueue();
    }
  }

  // Update batch timing metrics
  checkBatchCompletion() {
    const active = this.queue.some(item => ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(item.status));
    if (!active) {
      this.stats.endTime = Date.now();
      if (this.stats.startTime) {
        this.stats.totalTime = Math.round((this.stats.endTime - this.stats.startTime) / 1000);
      }
    }
  }

  // Clear finished items
  clearFinished() {
    this.queue = this.queue.filter(item => ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(item.status));
    this.notify();
  }

  // Tear down event listeners and abort active requests
  destroy() {
    this.unsubscribeNetwork();
    this.cancelAll();
  }
}

export default UploadManager;
