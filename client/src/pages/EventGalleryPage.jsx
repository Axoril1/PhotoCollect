import { useCallback, useState, useEffect, useRef, useLayoutEffect, memo, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { gsap } from 'gsap'
import api from '../api/axios.js'
import UploadManager from '../services/UploadManager.js'
import useSocket from '../services/socket/useSocket.js'
import socketClient from '../services/socket/socketClient.js'

const getApiBase = () => {
  let url = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (!url.endsWith('/api') && !url.endsWith('/api/')) {
    url = url.endsWith('/') ? `${url}api` : `${url}/api`;
  }
  return url;
};
const API_BASE = getApiBase();
const POLL_INTERVAL_MS = 5000
const EVENT_PASSWORD_PREFIX = 'photocollect.eventPassword.'
const ImageCard = memo(({ photo, selectMode, isSelected, onClick, onDownload, isFeatured, isFavorite }) => {
  const [loaded, setLoaded] = useState(false);
  const heights = ['h-48', 'h-64', 'h-80', 'h-56', 'h-72'];
  const charCodeSum = photo._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const heightClass = heights[charCodeSum % heights.length];

  return (
    <div
      onClick={onClick}
      className={`masonry-item relative cursor-pointer rounded-2xl overflow-hidden bg-paper border border-forest/10 shadow-xs hover:shadow-md transition-all duration-300 group gallery-card ${
        isSelected ? 'ring-4 ring-amber ring-offset-2 scale-[0.98]' : ''
      }`}
      style={{ breakInside: 'avoid', marginBottom: '16px' }}
    >
      {/* Shimmer Skeleton Placeholder */}
      {!loaded && (
        <div className={`w-full ${heightClass} bg-gradient-to-r from-forest/5 via-forest/10 to-forest/5 animate-pulse flex items-center justify-center`}>
          <svg className="text-forest/20 animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      )}

      {/* Image */}
      <img
        src={photo.thumbnailUrl}
        alt={`Uploaded by ${photo.uploaderName}`}
        onLoad={() => setLoaded(true)}
        className={`w-full h-auto object-cover transition-all duration-500 group-hover:scale-102 ${
          loaded ? 'opacity-100' : 'opacity-0 absolute'
        }`}
        loading="lazy"
      />

      {/* Badges (Favorite & Featured indicators) */}
      {loaded && (isFavorite || isFeatured) && (
        <div className="absolute top-3 left-3 flex gap-1 z-10">
          {isFavorite && (
            <span className="bg-red-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
              ❤️
            </span>
          )}
          {isFeatured && (
            <span className="bg-amber/90 text-forest text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
              ⭐
            </span>
          )}
        </div>
      )}

      {/* Single download trigger on hover */}
      {!selectMode && loaded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(photo);
          }}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-paper/95 text-forest border border-forest/10 hover:bg-forest hover:text-paper flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow z-10 cursor-pointer"
          title="Download photo"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      )}

      {/* Checkbox overlay in selectMode */}
      {selectMode && (
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 z-10 flex items-center justify-center transition-all ${
          isSelected ? 'bg-amber border-amber text-paper shadow' : 'bg-paper/85 border-forest/30'
        }`}>
          {isSelected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}

      {/* Info overlay on hover */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between text-white pointer-events-none">
        <span className="text-[10px] font-semibold truncate max-w-[120px]">
          by {photo.uploaderName || 'Guest'}
        </span>
        {photo.sizeBytes && (
          <span className="text-[8px] font-mono opacity-80">
            {(photo.sizeBytes / (1024 * 1024)).toFixed(2)} MB
          </span>
        )}
      </div>
    </div>
  );
});

function EventGalleryPage() {
  const { slug } = useParams()
  const fileInputRef = useRef(null)
  const galleryRef = useRef(null)
  const touchStartRef = useRef(0)
  const welcomeRef = useRef(null)

  const [event, setEvent] = useState(null)
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState('welcome')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadSuccessBatch, setUploadSuccessBatch] = useState(null)
  const [requiresPassword, setRequiresPassword] = useState(false)

  const uploadManager = useMemo(() => new UploadManager({
    concurrency: 3,
    maxLongEdge: 3000,
    quality: 0.82,
    minSizeToCompress: 1.5 * 1024 * 1024, // 1.5MB
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
    maxRetries: 3
  }), [])
  const [uploadState, setUploadState] = useState({
    queue: [],
    isPaused: false,
    isOnline: true,
    connectionType: 'good',
    stats: { totalTime: 0, originalBytes: 0, compressedBytes: 0, savedBytes: 0, startTime: null, endTime: null, successCount: 0 },
    activeUploadsCount: 0
  })

  const [ariaAnnouncement, setAriaAnnouncement] = useState('')
  const lastStateRef = useRef(null)

  useEffect(() => {
    const unsubscribe = uploadManager.subscribe((state) => {
      setUploadState(state)
    })
    return () => {
      unsubscribe()
      uploadManager.destroy()
    }
  }, [uploadManager])

  // Screen reader / ARIA Announcement Listener
  useEffect(() => {
    if (!uploadState.queue.length) return

    const active = uploadState.queue.filter(q => ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(q.status)).length
    const completed = uploadState.queue.filter(q => q.status === 'completed').length
    const failed = uploadState.queue.filter(q => q.status === 'failed').length

    let msg = ''
    if (lastStateRef.current) {
      if (uploadState.isOnline === false && lastStateRef.current.isOnline === true) {
        msg = 'Connection lost. Uploads paused.'
      } else if (uploadState.isOnline === true && lastStateRef.current.isOnline === false) {
        msg = 'Connection restored. Uploads resuming.'
      } else if (active === 0 && lastStateRef.current.active > 0) {
        msg = `All uploads completed. ${completed} photos successfully uploaded, ${failed} failed.`
      } else if (failed > lastStateRef.current.failed) {
        msg = 'A photo upload failed.'
      }
    }

    if (msg) {
      setAriaAnnouncement(msg)
    }

    lastStateRef.current = {
      active,
      completed,
      failed,
      isOnline: uploadState.isOnline
    }
  }, [uploadState.queue, uploadState.isOnline])

  const lastSuccessCount = useRef(0)
  useEffect(() => {
    if (uploadState.stats.successCount > lastSuccessCount.current) {
      lastSuccessCount.current = uploadState.stats.successCount
      loadPhotos()
      loadEvent()
    }
  }, [uploadState.stats.successCount, loadPhotos, loadEvent])

  const addFilesToQueue = useCallback(async (files) => {
    if (files.length === 0) return

    setViewMode('gallery')
    const { duplicateNames } = await uploadManager.enqueue(files, slug, accessPassword)
    if (duplicateNames && duplicateNames.length > 0) {
      showToast(`Skipped ${duplicateNames.length} duplicate photo(s).`, 'info')
    }
  }, [uploadManager, slug, accessPassword])

  // Windows paste and drag-drop events
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault()
    }

    const handleDragEnter = (e) => {
      e.preventDefault()
      if (e.dataTransfer.types.includes('Files') && !event?.isClosed) {
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false)
      }
    }

    const handleWindowDrop = (e) => {
      e.preventDefault()
      setIsDragging(false)
      if (event?.isClosed) return

      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))
      addFilesToQueue(files)
    }

    const handlePaste = (e) => {
      if (event?.isClosed) return
      const files = Array.from(e.clipboardData.files).filter(file => file.type.startsWith('image/'))
      addFilesToQueue(files)
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('dragenter', handleDragEnter)
    window.addEventListener('dragleave', handleDragLeave)
    window.addEventListener('drop', handleWindowDrop)
    window.addEventListener('paste', handlePaste)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('dragenter', handleDragEnter)
      window.removeEventListener('dragleave', handleDragLeave)
      window.removeEventListener('drop', handleWindowDrop)
      window.removeEventListener('paste', handlePaste)
    }
  }, [event, addFilesToQueue])

  // Batch completion celebration listener
  useEffect(() => {
    if (uploadState.queue.length === 0) return

    const active = uploadState.queue.some(item => 
      ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(item.status)
    )

    if (!active && uploadState.queue.length > 0) {
      const completedCount = uploadState.queue.filter(q => q.status === 'completed').length
      const failedCount = uploadState.queue.filter(q => q.status === 'failed').length

      if (completedCount > 0) {
        setUploadSuccessBatch({
          count: completedCount,
          totalTime: uploadState.stats.totalTime,
          savedBytes: uploadState.stats.savedBytes,
          originalBytes: uploadState.stats.originalBytes,
          compressedBytes: uploadState.stats.compressedBytes
        })
      }
      
      if (failedCount === 0) {
        uploadState.queue.forEach(item => {
          if (item.previewUrl) {
            try { URL.revokeObjectURL(item.previewUrl) } catch {}
          }
        })
        uploadManager.cancelAll()
      } else {
        uploadManager.clearCompleted()
        showToast(`${failedCount} photo(s) failed to upload. Review the queue.`, 'error')
      }
    }
  }, [uploadState.queue, uploadState.stats, uploadManager])
  const [passwordInput, setPasswordInput] = useState('')
  const [accessPassword, setAccessPassword] = useState('')
  const [checkingPassword, setCheckingPassword] = useState(false)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [viewerPhoto, setViewerPhoto] = useState(null)
  const [downloadingSelected, setDownloadingSelected] = useState(false)
  const [downloadingPhoto, setDownloadingPhoto] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [shareToast, setShareToast] = useState('idle')

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState('')
  const [orientationFilter, setOrientationFilter] = useState('all') // 'all' | 'landscape' | 'portrait' | 'square'
  const [dateFilter, setDateFilter] = useState('all') // 'all' | 'today' | 'this_week'
  const [sortOrder, setSortOrder] = useState('newest') // 'newest' | 'oldest'

  // Fullscreen Viewer & Interaction Mock States
  const [zoomLevel, setZoomLevel] = useState(1)
  const [imageDim, setImageDim] = useState(null)
  const [isViewerInfoOpen, setIsViewerInfoOpen] = useState(false)
  const [activeMockFavorite, setActiveMockFavorite] = useState(new Set())
  const [mockComments, setMockComments] = useState({})
  const [newMockCommentText, setNewMockCommentText] = useState('')
  const [slideShowMode, setSlideShowMode] = useState(false)
  const [mockFeaturedIds, setMockFeaturedIds] = useState(new Set())
  const [toast, setToast] = useState({ message: '', type: 'success' })

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 3000)
  }

  // Upload queue managed by UploadManager

  const loadEvent = useCallback(async () => {
    try {
      const res = await api.get(`/events/${slug}`)
      setEvent(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Event not found')
    } finally {
      setLoading(false)
    }
  }, [slug])

  const loadPhotos = useCallback(async () => {
    try {
      const res = await api.get(`/photos/${slug}`, {
        headers: accessPassword ? { 'x-event-password': accessPassword } : {},
      })
      setPhotos(res.data.photos)
    } catch (err) {
      if (err.response?.data?.requiresPassword) {
        setRequiresPassword(true)
        setPhotos([])
        return
      }
      console.error('Failed to load photos', err)
    }
  }, [accessPassword, slug])

  useEffect(() => {
    setLoading(true)
    setEvent(null)
    setAccessPassword(localStorage.getItem(`${EVENT_PASSWORD_PREFIX}${slug}`) || '')
    setPasswordInput('')
    setRequiresPassword(false)
    setPhotos([])
    loadEvent()
  }, [loadEvent, slug])

  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const { connectionStatus, presenceStats, activityFeed, joinEventRoom, reportUploading, reportDownload } = useSocket();

  // Joint socket room joining (Phase 3 & 11)
  useEffect(() => {
    if (event) {
      const nickname = localStorage.getItem('photocollect.nickname') || '';
      joinEventRoom(slug, accessPassword, nickname);
    }
  }, [event, slug, accessPassword, joinEventRoom]);

  // Report upload state to presence tracking (Phase 7)
  useEffect(() => {
    const isCurrentlyUploading = uploadState.queue.some(item => 
      ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(item.status)
    );
    reportUploading(isCurrentlyUploading);
  }, [uploadState.queue, reportUploading]);

  // Real-time Socket Event Handlers (Phase 4, 5, 8, 9, 11)
  useEffect(() => {
    if (!event) return undefined;

    const onPhotoUploaded = (payload) => {
      // Append the new photos intelligently, avoiding duplicates (Phase 4)
      setPhotos((prevPhotos) => {
        const existingIds = new Set(prevPhotos.map(p => p._id));
        const uniqueNewPhotos = payload.photos.filter(p => !existingIds.has(p._id));
        if (uniqueNewPhotos.length === 0) return prevPhotos;
        return [...uniqueNewPhotos, ...prevPhotos];
      });

      // Display toast notification (Phase 8)
      showToast(`${payload.uploaderName} uploaded ${payload.photos.length} photo${payload.photos.length > 1 ? 's' : ''}!`, 'success');
      setAriaAnnouncement(`New photos uploaded by ${payload.uploaderName}`);
    };

    const onEventClosed = () => {
      setEvent((prevEvent) => {
        if (!prevEvent) return prevEvent;
        return {
          ...prevEvent,
          isClosed: true,
        };
      });
      showToast("This event has been closed to new uploads.", "error");
      setAriaAnnouncement("This event has been closed to new uploads.");
    };

    const unsubscribePhotoUploaded = socketClient.on("photo_uploaded", onPhotoUploaded);
    const unsubscribeEventClosed = socketClient.on("event_closed", onEventClosed);

    return () => {
      unsubscribePhotoUploaded();
      unsubscribeEventClosed();
    };
  }, [event, showToast]);

  // Connection toasts listener (Phase 8 & 9)
  const lastConnectionStatus = useRef(connectionStatus);
  useEffect(() => {
    if (connectionStatus !== lastConnectionStatus.current) {
      if (connectionStatus === 'connected' && lastConnectionStatus.current !== 'disconnected') {
        showToast("Connection restored. Live feed active.", "success");
        setAriaAnnouncement("Connection restored. Live feed active.");
      } else if (connectionStatus === 'reconnecting') {
        showToast("Reconnecting to live feed...", "info");
        setAriaAnnouncement("Reconnecting to live feed.");
      } else if (connectionStatus === 'offline') {
        showToast("Connection lost. HTTP polling fallback active.", "error");
        setAriaAnnouncement("Connection lost. HTTP polling fallback active.");
      }
      lastConnectionStatus.current = connectionStatus;
    }
  }, [connectionStatus, showToast]);

  // Collapsible Escape key close listener (Phase 10 & 12)
  useEffect(() => {
    if (!isActivityOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsActivityOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActivityOpen]);

  // Relative time helper (Phase 5)
  const getRelativeTimeString = (dateStr) => {
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now - past;
      if (diffMs < 5000) return "Just now";
      const diffSecs = Math.floor(diffMs / 1000);
      if (diffSecs < 60) return `${diffSecs}s ago`;
      const diffMins = Math.floor(diffSecs / 60);
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return past.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return "";
    }
  };

  // Synchronization Polling fallback mechanism (Phase 1)
  useEffect(() => {
    if (!event) return undefined;
    if (event.hasPassword && !accessPassword) {
      setRequiresPassword(true);
      return undefined;
    }

    setRequiresPassword(false);
    
    // Only use polling if socket is not connected (self-healing fallback)
    if (connectionStatus !== 'connected') {
      loadPhotos();
      const interval = setInterval(() => {
        loadPhotos();
      }, POLL_INTERVAL_MS);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [accessPassword, event, connectionStatus, loadPhotos]);

  // Reset zoom & measure image dimensions on open
  useEffect(() => {
    if (!viewerPhoto) {
      setImageDim(null)
      setZoomLevel(1)
      setIsViewerInfoOpen(false)
      return
    }
    const img = new Image()
    img.src = viewerPhoto.originalUrl
    img.onload = () => {
      setImageDim({ width: img.naturalWidth, height: img.naturalHeight })
    }
  }, [viewerPhoto])

  useLayoutEffect(() => {
    if (viewMode !== 'welcome' || !welcomeRef.current) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.welcome-animate',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power3.out',
        }
      )
    }, welcomeRef)

    return () => ctx.revert()
  }, [viewMode])

  // GSAP Entrance reveal on photos list load
  useLayoutEffect(() => {
    if (photos.length === 0 || !galleryRef.current || viewMode !== 'gallery') return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gallery-card',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          stagger: 0.04,
          duration: 0.7,
          ease: 'power3.out',
        }
      )
    }, galleryRef)

    return () => ctx.revert()
  }, [photos.length, viewMode])

  const getPhotoOrientation = (photo) => {
    const charCodeSum = photo._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const val = charCodeSum % 3;
    if (val === 0) return 'landscape';
    if (val === 1) return 'portrait';
    return 'square';
  };

  const getFilteredPhotos = useCallback(() => {
    let result = [...photos];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => (p.uploaderName || '').toLowerCase().includes(q) || 
             (p.originalName || '').toLowerCase().includes(q)
      );
    }

    if (orientationFilter !== 'all') {
      result = result.filter(p => getPhotoOrientation(p) === orientationFilter);
    }

    if (dateFilter === 'today') {
      const today = new Date().toDateString();
      result = result.filter(p => new Date(p.createdAt).toDateString() === today);
    } else if (dateFilter === 'this_week') {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(p => new Date(p.createdAt) >= oneWeekAgo);
    }

    if (sortOrder === 'oldest') {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  }, [photos, searchQuery, orientationFilter, dateFilter, sortOrder]);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete the ${selectedIds.size} selected photos?`)) return;

    setLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => api.delete(`/photos/${id}`)));
      showToast('Selected photos deleted successfully!', 'success');
      setSelectedIds(new Set());
      setSelectMode(false);
      await loadPhotos();
    } catch (err) {
      setError('Failed to delete some selected photos');
    } finally {
      setLoading(false);
    }
  };

  const handleMockFavorite = (photo) => {
    setActiveMockFavorite(prev => {
      const next = new Set(prev);
      if (next.has(photo._id)) {
        next.delete(photo._id);
        showToast('Removed from favorites', 'info');
      } else {
        next.add(photo._id);
        showToast('Added to favorites! ❤️', 'success');
      }
      return next;
    });
  };

  const handleMockFeatured = (photo) => {
    setMockFeaturedIds(prev => {
      const next = new Set(prev);
      if (next.has(photo._id)) {
        next.delete(photo._id);
        showToast('Removed from featured photos', 'info');
      } else {
        next.add(photo._id);
        showToast('Marked as featured! ⭐', 'success');
      }
      return next;
    });
  };

  const handleCopyLinkShare = (photo) => {
    navigator.clipboard.writeText(photo.originalUrl)
      .then(() => showToast('Photo link copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy photo link.', 'error'));
  };

  const handleNativeShare = async (photo) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Photo from ${event?.name || 'Event'}`,
          text: `Check out this photo shared by ${photo.uploaderName || 'Guest'}:`,
          url: photo.originalUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLinkShare(photo);
        }
      }
    } else {
      handleCopyLinkShare(photo);
    }
  };

  const handleNextPhoto = useCallback((e) => {
    if (e) e.stopPropagation()
    if (!viewerPhoto) return
    const filtered = getFilteredPhotos()
    if (filtered.length === 0) return
    const idx = filtered.findIndex((p) => p._id === viewerPhoto._id)
    if (idx !== -1 && idx < filtered.length - 1) {
      setViewerPhoto(filtered[idx + 1])
    }
  }, [getFilteredPhotos, viewerPhoto])

  const handlePrevPhoto = useCallback((e) => {
    if (e) e.stopPropagation()
    if (!viewerPhoto) return
    const filtered = getFilteredPhotos()
    if (filtered.length === 0) return
    const idx = filtered.findIndex((p) => p._id === viewerPhoto._id)
    if (idx > 0) {
      setViewerPhoto(filtered[idx - 1])
    }
  }, [getFilteredPhotos, viewerPhoto])

  // Keydown keyboard listeners (ArrowLeft, ArrowRight, Escape, Zoom keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setViewerPhoto(null)
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto()
      } else if (e.key === 'ArrowLeft') {
        handlePrevPhoto()
      } else if (e.key === '=' || e.key === '+') {
        setZoomLevel(prev => Math.min(3, prev + 0.5))
      } else if (e.key === '-') {
        setZoomLevel(prev => Math.max(1, prev - 0.5))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNextPhoto, handlePrevPhoto])

  // Slideshow play timer
  useEffect(() => {
    if (!slideShowMode || !viewerPhoto) return undefined;
    const timer = setInterval(() => {
      const filtered = getFilteredPhotos();
      if (filtered.length === 0) return;
      const idx = filtered.findIndex((p) => p._id === viewerPhoto._id);
      if (idx !== -1 && idx < filtered.length - 1) {
        setViewerPhoto(filtered[idx + 1]);
      } else {
        setViewerPhoto(filtered[0]);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [slideShowMode, viewerPhoto, getFilteredPhotos])

  // Swipe handlers for mobile photo viewer touch interactions
  const handleTouchStart = (e) => {
    touchStartRef.current = e.changedTouches[0].clientX
  }

  const handleTouchEnd = (e) => {
    const diffX = e.changedTouches[0].clientX - touchStartRef.current
    if (Math.abs(diffX) > 60) {
      if (diffX > 0) {
        handlePrevPhoto()
      } else {
        handleNextPhoto()
      }
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return
    addFilesToQueue(files)
    e.target.value = ''
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setCheckingPassword(true)

    try {
      const res = await api.post(`/events/${slug}/verify-password`, {
        password: passwordInput,
      })

      if (!res.data.valid) {
        setError('That password did not match this event')
        return
      }

      localStorage.setItem(`${EVENT_PASSWORD_PREFIX}${slug}`, passwordInput)
      setAccessPassword(passwordInput)
      setRequiresPassword(false)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not verify password')
    } finally {
      setCheckingPassword(false)
    }
  }

  const handlePhotoTap = (photo) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(photo._id)) {
          next.delete(photo._id)
        } else {
          next.add(photo._id)
        }
        return next
      })
    } else {
      setViewerPhoto(photo)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  const handleDownloadSelected = async () => {
    if (selectedIds.size === 0) return
    reportDownload();
    setDownloadingSelected(true)
    try {
      const selectedPhotos = photos.filter((p) => selectedIds.has(p._id))

      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i]
        const res = await fetch(photo.originalUrl)
        const blob = await res.blob()
        const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
        const blobUrl = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = photo.originalName || `photo-${i + 1}.${ext}`
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(blobUrl)

        if (i < selectedPhotos.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 400))
        }
      }
    } catch {
      setError('Failed to download selected photos')
    } finally {
      setDownloadingSelected(false)
    }
  }

  const handleDownloadAll = async () => {
    reportDownload();
    setDownloadingAll(true)
    try {
      const canTryShare = typeof navigator.share === 'function' && typeof navigator.canShare === 'function'

      if (canTryShare) {
        try {
          const files = await Promise.all(
            photos.map(async (photo, i) => {
              const res = await fetch(photo.originalUrl)
              const blob = await res.blob()
              const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
              return new File([blob], photo.originalName || `photo-${i + 1}.${ext}`, { type: blob.type })
            })
          )

          if (navigator.canShare({ files })) {
            await navigator.share({
              files,
              title: `${event.name} photos`,
            })
            return
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            return
          }
          console.error('Share failed, falling back to zip:', shareErr)
        }
      }

      const res = await fetch(downloadAllUrl, {
        headers: accessPassword ? { 'x-event-password': accessPassword } : {},
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `${event.name}_photos.zip`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      setError('Failed to download all photos')
    } finally {
      setDownloadingAll(false)
    }
  }

  const handleDownloadSinglePhoto = async (photo) => {
    reportDownload();
    setDownloadingPhoto(true)
    try {
      const res = await fetch(photo.originalUrl)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = photo.originalName || 'photo.jpg'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      setError('Failed to download photo')
    } finally {
      setDownloadingPhoto(false)
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = `${event?.name || 'PhotoCollect'} Gallery`
    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if (err.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareToast('copied')
      setTimeout(() => setShareToast('idle'), 2000)
    } catch {
      setError('Could not copy link to clipboard')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-mist flex flex-col font-sans text-ink">
        {/* Cover Skeleton */}
        <div className="relative w-full h-[45vh] min-h-[300px] bg-forest/5 animate-pulse flex flex-col justify-end p-6 gap-3">
          <div className="h-4 w-24 bg-forest/10 rounded"></div>
          <div className="h-10 w-2/3 bg-forest/10 rounded"></div>
          <div className="h-4 w-40 bg-forest/10 rounded"></div>
        </div>

        {/* Content Skeleton */}
        <div className="flex-1 max-w-xl w-full mx-auto px-6 py-8 flex flex-col gap-6 animate-pulse">
          {/* Welcome Card Skeleton */}
          <div className="bg-paper p-6 rounded-2xl border border-forest/5 flex flex-col gap-3">
            <div className="h-6 w-32 bg-forest/10 rounded"></div>
            <div className="h-4 w-full bg-forest/5 rounded"></div>
            <div className="h-4 w-5/6 bg-forest/5 rounded"></div>
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-paper p-4 rounded-xl border border-forest/5 flex flex-col items-center gap-2">
                <div className="h-8 w-12 bg-forest/10 rounded"></div>
                <div className="h-3 w-16 bg-forest/5 rounded"></div>
              </div>
            ))}
          </div>

          {/* CTA Skeleton */}
          <div className="flex flex-col gap-3 mt-auto">
            <div className="h-14 w-full bg-forest/10 rounded-xl"></div>
            <div className="h-12 w-full bg-forest/5 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center p-6 text-center">
        <div>
          <p className="font-display font-bold text-2xl text-red-700">{error}</p>
          <Link to="/" className="mt-4 inline-flex button-secondary">Return home</Link>
        </div>
      </div>
    )
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-mist flex items-center justify-center p-6">
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm rounded-3xl border border-forest/10 bg-paper p-8 shadow-2xl">
          <p className="font-mono text-xs tracking-wider text-sky font-bold">PRIVATE EVENT</p>
          <h1 className="mt-2 font-display font-extrabold text-3xl text-forest leading-none">{event?.name || 'Event gallery'}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/70">
            Enter the guest password to view and upload photos.
          </p>
          <label className="mt-6 block">
            <span className="mb-2 block text-xs font-bold text-forest/70 uppercase tracking-wider">Guest password</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full rounded-xl border border-forest/20 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-forest focus:ring-4 focus:ring-forest/5 transition-all"
              autoFocus
            />
          </label>
          {error && <p className="mt-3 text-red-600 text-xs font-bold">{error}</p>}
          <button
            type="submit"
            disabled={checkingPassword || !passwordInput}
            className="mt-6 w-full bg-forest text-paper font-semibold text-sm py-3.5 rounded-xl disabled:opacity-50 hover:bg-forest/90 active:scale-[0.98] transition-all"
          >
            {checkingPassword ? 'Checking...' : 'Open gallery'}
          </button>
        </form>
      </div>
    )
  }

  const downloadAllUrl = `${API_BASE}/photos/${slug}/download`
  
  // Calculate aggregate queue progress from uploadState
  const uploadingItems = uploadState.queue.filter((q) => ['waiting', 'compressing', 'ready', 'uploading', 'retrying'].includes(q.status))
  const completedItemsCount = uploadState.queue.filter((q) => q.status === 'completed').length
  const totalQueueItems = uploadState.queue.length
  
  const batchProgress = totalQueueItems > 0 
    ? (uploadState.queue.reduce((acc, q) => acc + q.progress, 0) / totalQueueItems) 
    : 0

  // Next and Prev variables for Photo Viewer
  const currentPhotoIdx = viewerPhoto ? photos.findIndex((p) => p._id === viewerPhoto._id) : -1
  const hasNext = currentPhotoIdx !== -1 && currentPhotoIdx < photos.length - 1
  const hasPrev = currentPhotoIdx > 0

  if (viewMode === 'welcome' && event) {
    const fallbackCover = "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop"
    
    // Statistics calculations
    const photoCount = photos.length
    const contributorsCount = new Set(photos.map(p => p.uploaderName || 'Guest')).size
    
    // Expiry calculation
    let timeRemainingStr = "Always open"
    if (event.expiresAt) {
      const diffMs = new Date(event.expiresAt) - new Date()
      if (diffMs > 0) {
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
        timeRemainingStr = `${diffDays} day${diffDays > 1 ? 's' : ''} left`
      } else {
        timeRemainingStr = "Expired"
      }
    }

    const brandAccent = event.branding?.accentColor || '#1e3a24';
    const brandFont = event.branding?.fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", serif' :
                      event.branding?.fontFamily === 'display' ? '"Outfit", sans-serif' :
                      'Inter, system-ui, -apple-system, sans-serif';

    const coverSrc = event.branding?.coverImage || event.coverImage || fallbackCover;

    return (
      <div ref={welcomeRef} className="min-h-screen bg-mist flex flex-col font-brand text-ink pb-12">
        <style>{`
          :root {
            --pc-brand-accent: ${brandAccent};
          }
          .bg-forest {
            background-color: var(--pc-brand-accent) !important;
          }
          .text-forest {
            color: var(--pc-brand-accent) !important;
          }
          .border-forest {
            border-color: var(--pc-brand-accent) !important;
          }
          .bg-forest\\/5 {
            background-color: ${brandAccent}0d !important;
          }
          .bg-forest\\/10 {
            background-color: ${brandAccent}1a !important;
          }
          .border-forest\\/5 {
            border-color: ${brandAccent}0d !important;
          }
          .border-forest\\/10 {
            border-color: ${brandAccent}1a !important;
          }
          .border-forest\\/20 {
            border-color: ${brandAccent}33 !important;
          }
          .font-brand {
            font-family: ${brandFont} !important;
          }
          body {
            font-family: ${brandFont};
          }
        `}</style>

        {/* Cover Section */}
        <div className="relative w-full h-[45vh] min-h-[300px] overflow-hidden shadow-md welcome-animate">
          <img 
            src={coverSrc} 
            alt={event.name} 
            className="w-full h-full object-cover"
            loading="eager"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-mist via-ink/20 to-ink/45"></div>
          
          {/* Event Metadata */}
          <div className="absolute bottom-6 left-6 right-6 text-paper flex flex-col gap-1.5 drop-shadow">
            <span className="text-xs uppercase tracking-widest font-mono text-amber font-bold">Event Invitation</span>
            <h1 className="font-display font-extrabold text-3xl leading-tight text-white">{event.name}</h1>
            {event.date && (
              <p className="text-xs font-mono text-paper/85">
                {new Date(event.date).toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="flex-1 max-w-xl w-full mx-auto px-6 py-8 flex flex-col justify-between gap-8">
          {/* Welcome Message */}
          <div className="bg-paper p-6 rounded-2xl border border-forest/5 shadow-sm welcome-animate">
            <h2 className="text-lg font-bold font-display text-forest mb-2">
              {event.branding?.welcomeTitle || "Hello & Welcome!"}
            </h2>
            <p className="text-sm leading-relaxed text-ink/75">
              {event.branding?.welcomeMessage || event.welcomeMessage || `We're thrilled to have you here! Help us preserve every beautiful moment of "${event.name}". Share your snapshots directly from your phone and feel free to explore the shared memories.`}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-forest/70 font-mono">
              <span className="font-bold">✨ Quick Tip:</span> 
              <span>Select multiple photos from your library to upload at once.</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 welcome-animate">
            <div className="bg-paper p-4 rounded-xl border border-forest/5 text-center shadow-xs">
              <span className="block text-2xl font-extrabold text-forest">{photoCount}</span>
              <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Photos</span>
            </div>
            <div className="bg-paper p-4 rounded-xl border border-forest/5 text-center shadow-xs">
              <span className="block text-2xl font-extrabold text-forest">{contributorsCount}</span>
              <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Contributors</span>
            </div>
            <div className="bg-paper p-4 rounded-xl border border-forest/5 text-center shadow-xs">
              <span className="block text-sm font-extrabold text-forest truncate py-1" title={timeRemainingStr}>
                {timeRemainingStr}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Validity</span>
            </div>
          </div>

          {/* Organizer branding if available */}
          <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-forest/10">
            <div className="flex items-center justify-center gap-3 text-ink/65 welcome-animate">
              {event.branding?.logo ? (
                <img src={event.branding.logo} className="w-8 h-8 rounded-full object-contain border border-forest/10 shadow-xs" alt="logo" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-forest text-paper flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                  {(event.branding?.organizerName || event.organizerName || event.name || "E").charAt(0)}
                </div>
              )}
              <div className="text-left">
                <span className="block text-[9px] text-ink/40 uppercase tracking-widest font-mono">Hosted By</span>
                <span className="text-xs font-semibold text-forest">{event.branding?.organizerName || event.organizerName || "Guest Organizer"}</span>
              </div>
            </div>
            
            {/* Social links row */}
            {(event.branding?.organizerWebsite || event.branding?.organizerInstagram || event.branding?.organizerEmail) && (
              <div className="flex justify-center gap-4 text-xs font-semibold text-forest/75 mt-2">
                {event.branding?.organizerWebsite && (
                  <a href={event.branding.organizerWebsite.startsWith('http') ? event.branding.organizerWebsite : `https://${event.branding.organizerWebsite}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                    🌐 Website
                  </a>
                )}
                {event.branding?.organizerInstagram && (
                  <a href={`https://instagram.com/${event.branding.organizerInstagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                    📸 Instagram
                  </a>
                )}
                {event.branding?.organizerEmail && (
                  <a href={`mailto:${event.branding.organizerEmail}`} className="hover:underline flex items-center gap-1">
                    ✉️ Contact
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sticky CTA footer dock on mobile scroll */}
          <div className="flex flex-col gap-3 mt-auto sticky bottom-6 z-10 w-full bg-mist/85 backdrop-blur-md p-3 rounded-2xl border border-forest/5 shadow-lg md:relative md:bottom-0 md:bg-transparent md:backdrop-blur-none md:p-0 md:border-none md:shadow-none welcome-animate">
            <button
              onClick={() => {
                fileInputRef.current.click();
              }}
              disabled={event.isClosed}
              className="w-full bg-forest text-paper font-semibold text-base py-4 rounded-xl shadow-md hover:bg-forest/90 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {event.branding?.customButtonText || "Upload Photos"}
            </button>

            <button
              onClick={() => {
                setViewMode('gallery');
              }}
              className="w-full border border-forest/20 text-forest bg-paper/50 font-semibold text-sm py-3.5 rounded-xl hover:border-forest transition-all active:scale-[0.98] cursor-pointer"
            >
              Browse Gallery
            </button>
          </div>
        </div>

        {/* Hidden File Input Reference for mobile camera triggers */}
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    );
  }

  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem('photocollect.user'))
    } catch {
      return null
    }
  }
  const loggedInUser = getStoredUser();
  const isOrganizer = loggedInUser && event && event.ownerId === loggedInUser._id;

  const brandAccent = event?.branding?.accentColor || '#1e3a24';
  const brandFont = event?.branding?.fontFamily === 'serif' ? 'Georgia, Cambria, "Times New Roman", serif' :
                    event?.branding?.fontFamily === 'display' ? '"Outfit", sans-serif' :
                    'Inter, system-ui, -apple-system, sans-serif';

  return (
    <div className="min-h-screen bg-mist px-6 py-12 pb-36 font-brand">
      <style>{`
        :root {
          --pc-brand-accent: ${brandAccent};
        }
        .bg-forest {
          background-color: var(--pc-brand-accent) !important;
        }
        .text-forest {
          color: var(--pc-brand-accent) !important;
        }
        .border-forest {
          border-color: var(--pc-brand-accent) !important;
        }
        .bg-forest\\/5 {
          background-color: ${brandAccent}0d !important;
        }
        .bg-forest\\/10 {
          background-color: ${brandAccent}1a !important;
        }
        .border-forest\\/5 {
          border-color: ${brandAccent}0d !important;
        }
        .border-forest\\/10 {
          border-color: ${brandAccent}1a !important;
        }
        .border-forest\\/20 {
          border-color: ${brandAccent}33 !important;
        }
        .font-brand {
          font-family: ${brandFont} !important;
        }
        body {
          font-family: ${brandFont};
        }
        .masonry-grid {
          column-count: 2;
          column-gap: 16px;
        }
        @media (min-width: 640px) {
          .masonry-grid {
            column-count: 3;
          }
        }
        @media (min-width: 1024px) {
          .masonry-grid {
            column-count: 5;
          }
        }
      `}</style>
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-forest/10 pb-8 mb-8">
          <div>
            <Link to="/" className="text-xs font-mono text-sky font-bold hover:underline mb-2 block">← Return to PhotoCollect</Link>
            <h1 className="font-display font-extrabold text-4xl text-forest leading-tight">{event.name}</h1>
            <p className="font-mono text-xs text-sky font-bold mt-2">
              {photos.length} photos · {event.isClosed ? 'gallery closed' : 'live upload stream'}
            </p>

            {/* Real-time Connection & Presence Widget (Phase 5, 7, 9) */}
            {connectionStatus === 'connected' && (
              <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] font-semibold text-ink/65 bg-paper px-3 py-1.5 rounded-full border border-forest/10 w-fit font-mono shadow-inner animate-fade-in" role="status" aria-live="polite">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
                <span className="text-forest/30">|</span>
                <span>👀 {presenceStats.currentlyViewing} viewing</span>
                {presenceStats.currentlyUploading > 0 && (
                  <>
                    <span className="text-forest/30">|</span>
                    <span className="text-emerald-700 animate-pulse">⏳ {presenceStats.currentlyUploading} uploading</span>
                  </>
                )}
                {presenceStats.recentlyActive > 0 && (
                  <>
                    <span className="text-forest/30">|</span>
                    <span>⚡ {presenceStats.recentlyActive} active</span>
                  </>
                )}
              </div>
            )}
            
            {connectionStatus === 'reconnecting' && (
              <div className="flex items-center gap-1.5 mt-3 text-[10px] font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 w-fit font-mono animate-pulse" role="status" aria-live="polite">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                Reconnecting to live feed...
              </div>
            )}

            {connectionStatus === 'offline' && (
              <div className="flex items-center gap-1.5 mt-3 text-[10px] font-semibold text-red-800 bg-red-50 px-3 py-1.5 rounded-full border border-red-200 w-fit font-mono" role="status" aria-live="polite">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                Offline mode (Polling active)
              </div>
            )}
          </div>
          
          <button
            onClick={toggleSelectMode}
            className={`self-start md:self-center flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-full border transition-all active:scale-95 cursor-pointer ${
              selectMode
                ? 'bg-forest text-paper border-forest'
                : 'bg-paper text-forest border-forest/20 hover:border-forest'
            }`}
          >
            {selectMode ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Cancel Selection
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Select Photos
              </>
            )}
          </button>
        </header>

        {/* Organizer Live Dashboard Panel (Phase 6 & 7) */}
        {isOrganizer && (
          <div className="bg-paper p-6 rounded-2xl border border-forest/10 shadow-sm mb-6 animate-fade-in welcome-animate">
            <h3 className="font-display font-extrabold text-sm text-forest mb-4 flex items-center gap-2">
              📊 Live Event Dashboard
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-mist p-3.5 rounded-xl text-center">
                <span className="block text-xl font-extrabold text-forest">{photos.length}</span>
                <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Photos Uploaded</span>
              </div>
              <div className="bg-mist p-3.5 rounded-xl text-center">
                <span className="block text-xl font-extrabold text-forest">{presenceStats.currentlyViewing}</span>
                <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Guests Online</span>
              </div>
              <div className="bg-mist p-3.5 rounded-xl text-center">
                <span className="block text-xl font-extrabold text-forest">
                  {(photos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0) / (1024 * 1024)).toFixed(1)} MB
                </span>
                <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Storage Used</span>
              </div>
              <div className="bg-mist p-3.5 rounded-xl text-center">
                <span className="block text-xl font-extrabold text-forest">
                  {photos.filter(p => new Date(p.createdAt).toDateString() === new Date().toDateString()).length}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-ink/50 font-bold">Uploads Today</span>
              </div>
            </div>
            {/* Live Presence sub-bar */}
            <div className="mt-4 pt-3 border-t border-forest/5 flex flex-wrap justify-between items-center text-[10px] text-ink/50 font-mono gap-2">
              <div className="flex gap-3">
                <span>Currently Viewing: <strong className="text-forest">{presenceStats.currentlyViewing}</strong></span>
                <span>Currently Uploading: <strong className="text-emerald-700">{presenceStats.currentlyUploading}</strong></span>
                <span>Recently Active: <strong className="text-forest">{presenceStats.recentlyActive}</strong></span>
              </div>
              {photos.length > 0 && (
                <span>
                  Recent Upload: <strong className="text-forest">{photos[0].uploaderName}</strong> ({getRelativeTimeString(photos[0].createdAt)})
                </span>
              )}
            </div>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
        />

        {error && <p className="text-red-600 text-xs font-bold mb-6 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

        {/* Search, Filter & Sort Controls Toolbar */}
        {photos.length > 0 && (
          <div className="bg-paper p-4 rounded-2xl border border-forest/10 shadow-xs mb-6 flex flex-col md:flex-row gap-3 items-center justify-between animate-fade-in">
            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search uploader or file..."
                className="w-full pl-9 pr-4 py-2 border border-forest/15 rounded-xl text-xs bg-mist focus:border-forest outline-none transition-all font-semibold"
              />
              <svg className="absolute left-3 top-2.5 text-forest/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Filter controls row */}
            <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
              {/* Orientation */}
              <select
                value={orientationFilter}
                onChange={(e) => setOrientationFilter(e.target.value)}
                className="border border-forest/15 rounded-xl text-xs bg-mist px-3 py-2 text-forest/80 focus:border-forest outline-none font-semibold cursor-pointer"
              >
                <option value="all">All Shapes</option>
                <option value="landscape">Landscape 🌅</option>
                <option value="portrait">Portrait 📱</option>
                <option value="square">Square 🟦</option>
              </select>

              {/* Time period */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="border border-forest/15 rounded-xl text-xs bg-mist px-3 py-2 text-forest/80 focus:border-forest outline-none font-semibold cursor-pointer"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
              </select>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                className="border border-forest/15 hover:border-forest text-forest bg-paper rounded-xl text-xs px-3.5 py-2 font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                {sortOrder === 'newest' ? 'Newest First ↓' : 'Oldest First ↑'}
              </button>
            </div>
          </div>
        )}

        {/* Gallery Masonry Layout Grid */}
        {getFilteredPhotos().length > 0 ? (
          <div ref={galleryRef} className="masonry-grid animate-fade-in" style={{ columnGap: '16px' }}>
            {getFilteredPhotos().map((photo) => {
              const isSelected = selectedIds.has(photo._id);
              const isFavorite = activeMockFavorite.has(photo._id);
              const isFeatured = mockFeaturedIds.has(photo._id);

              return (
                <ImageCard
                  key={photo._id}
                  photo={photo}
                  selectMode={selectMode}
                  isSelected={isSelected}
                  isFavorite={isFavorite}
                  isFeatured={isFeatured}
                  onClick={() => handlePhotoTap(photo)}
                  onDownload={handleDownloadSinglePhoto}
                  isOrganizer={isOrganizer}
                />
              );
            })}
          </div>
        ) : (
          /* Empty States rendering */
          photos.length === 0 ? (
            <div className="text-center py-20 bg-paper/40 rounded-3xl border border-dashed border-forest/10 flex flex-col items-center gap-4 welcome-animate">
              <div className="w-16 h-16 rounded-full bg-forest/5 flex items-center justify-center text-3xl shadow-inner">
                📸
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl text-forest">No Photos Yet</h3>
                <p className="text-xs text-ink/65 mt-1 max-w-xs leading-relaxed">
                  Be the first to share your memories! Upload high-quality photos from your device to preserve the moments.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current.click()}
                disabled={event.isClosed}
                className="bg-forest text-paper font-semibold text-xs py-3 px-6 rounded-xl hover:bg-forest/90 cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-2 mt-2 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload Memories
              </button>
            </div>
          ) : (
            <div className="text-center py-16 bg-paper/20 rounded-3xl border border-dashed border-forest/10 flex flex-col items-center gap-2 animate-fade-in">
              <div className="w-12 h-12 rounded-full bg-forest/5 flex items-center justify-center text-xl">
                🔍
              </div>
              <h3 className="font-display font-bold text-sm text-forest">No Matching Photos</h3>
              <p className="text-xs text-ink/55 max-w-xs leading-relaxed">
                Adjust your filters or query to find guest snapshots.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setOrientationFilter('all');
                  setDateFilter('all');
                }}
                className="text-xs text-sky font-semibold font-mono underline hover:text-sky/80 mt-2 cursor-pointer"
              >
                Reset Search Filters
              </button>
            </div>
          )
        )}

        {/* Floating Bulk Actions Bar for Organizers */}
        {selectMode && (
          <div className="fixed bottom-6 left-4 right-4 z-40 max-w-xl mx-auto bg-paper/95 border border-forest/10 rounded-2xl shadow-2xl backdrop-blur-md p-4 animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left w-full sm:w-auto">
              <p className="text-xs font-bold text-forest">{selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected</p>
              <p className="text-[9px] text-ink/40 font-mono">Bulk Management Workspace</p>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-end w-full sm:w-auto">
              <button
                onClick={() => {
                  const filtered = getFilteredPhotos();
                  setSelectedIds(new Set(filtered.map(p => p._id)));
                }}
                className="border border-forest/10 hover:border-forest text-forest bg-paper text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="border border-forest/10 hover:border-forest text-forest bg-paper text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handleDownloadSelected}
                disabled={selectedIds.size === 0 || downloadingSelected}
                className="bg-forest text-paper text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer hover:bg-forest/90 disabled:opacity-50"
              >
                {downloadingSelected ? 'Preparing ZIP...' : 'Download Selected'}
              </button>
              {isOrganizer && (
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="bg-red-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer hover:bg-red-700"
                >
                  Delete Selected
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Asynchronous Upload Queue Status Box */}
      {/* Premium Upload Dashboard Drawer (Google/Apple Photos Style) */}
      {totalQueueItems > 0 && (
        <div 
          className="fixed bottom-28 left-4 right-4 z-40 max-w-lg mx-auto bg-paper/95 border border-forest/10 rounded-2xl shadow-2xl backdrop-blur-md p-4 animate-fade-in welcome-animate"
          role="region"
          aria-label="Upload queue manager"
        >
          {/* SR Only Live Region */}
          <div className="sr-only" aria-live="polite" role="status">
            {ariaAnnouncement}
          </div>

          {/* Offline Warning Banner */}
          {!uploadState.isOnline && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[11px] font-mono flex items-center gap-2">
              <span className="animate-pulse text-xs">⚠️</span>
              <span>Network Offline. Uploads are paused and will resume automatically.</span>
            </div>
          )}

          {/* Slow Connection Banner */}
          {uploadState.isOnline && uploadState.connectionType === 'slow' && (
            <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-[11px] font-mono flex items-center gap-2">
              <span>📶</span>
              <span>Slow network connection. Queue optimization is active.</span>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-forest/5 mb-3">
            <div>
              <h4 className="text-sm font-bold text-forest font-display">
                {uploadingItems.length > 0
                  ? `Uploading ${uploadingItems.length} photo${uploadingItems.length > 1 ? 's' : ''}...`
                  : 'All uploads complete!'}
              </h4>
              <p className="text-[9px] text-ink/50 uppercase tracking-widest font-mono mt-0.5">
                Batch Progress: {completedItemsCount} / {totalQueueItems}
              </p>
            </div>
            {/* Status badge */}
            <span className="px-2.5 py-1 rounded-full bg-forest/5 text-forest text-xs font-semibold font-mono">
              {uploadingItems.length > 0 ? `${Math.round(batchProgress)}%` : 'Ready'}
            </span>
          </div>

          {/* Queue Actions */}
          <div className="flex gap-2 mb-3">
            {uploadState.isPaused ? (
              <button 
                onClick={() => uploadManager.resumeQueue()}
                className="flex-1 py-1.5 bg-forest text-paper text-[10px] rounded-lg font-bold hover:bg-forest/90 transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-forest"
                aria-label="Resume upload queue"
              >
                ▶ Resume Queue
              </button>
            ) : (
              <button 
                onClick={() => uploadManager.pauseQueue()}
                className="flex-1 py-1.5 border border-forest/20 text-forest text-[10px] rounded-lg font-bold hover:bg-forest/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-forest"
                aria-label="Pause upload queue"
              >
                ⏸ Pause Queue
              </button>
            )}
            <button 
              onClick={() => uploadManager.cancelAll()}
              className="py-1.5 px-3 bg-red-50 text-red-700 hover:bg-red-100 text-[10px] rounded-lg font-bold transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Cancel all uploads"
            >
              Cancel All
            </button>
          </div>

          {/* Batch Progress Bar */}
          <div className="w-full h-1.5 bg-forest/5 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-forest transition-all duration-300 ease-out"
              style={{ width: `${batchProgress}%` }}
            ></div>
          </div>

          {/* Image Previews Vertical List Cards */}
          <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
            {uploadState.queue.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 bg-paper p-2.5 rounded-xl border border-forest/5 shadow-xs"
              >
                {/* Local thumbnail preview */}
                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-mist flex-shrink-0 border border-forest/5">
                  {item.previewUrl ? (
                    <img 
                      src={item.previewUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-forest/40">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      </svg>
                    </div>
                  )}
                  {item.status === 'completed' && (
                    <div className="absolute inset-0 bg-emerald-700/60 flex items-center justify-center text-paper font-bold text-xs animate-fade-in">
                      ✓
                    </div>
                  )}
                </div>

                {/* Progress details */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-forest truncate block" title={item.name}>
                      {item.name}
                    </span>
                    <span className="text-[9px] font-mono text-forest/70 font-semibold flex-shrink-0">
                      {item.status === 'uploading' && item.speed ? `${item.speed} · ` : ''}
                      {item.statusText} 
                      {['uploading', 'compressing'].includes(item.status) ? ` (${item.progress}%)` : ''}
                    </span>
                  </div>

                  {/* Compressed Size indicator */}
                  <div className="text-[9px] text-ink/40 font-mono mb-1">
                    {item.status !== 'waiting' && item.status !== 'compressing' && item.compressedSize < item.originalSize ? (
                      <span>
                        {(item.originalSize / (1024 * 1024)).toFixed(1)}MB → <strong className="text-emerald-700">{(item.compressedSize / (1024 * 1024)).toFixed(1)}MB</strong>
                      </span>
                    ) : (
                      <span>{(item.originalSize / (1024 * 1024)).toFixed(1)}MB</span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 bg-forest/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        item.status === 'failed' ? 'bg-red-500' : 
                        item.status === 'completed' ? 'bg-emerald-600' : 
                        item.status === 'compressing' ? 'bg-emerald-400 animate-pulse' : 
                        item.status === 'retrying' ? 'bg-amber-500 animate-pulse' : 
                        'bg-forest'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    ></div>
                  </div>
                  
                  {item.error && (
                    <p className="text-[9px] text-red-600 truncate mt-0.5" title={item.error}>
                      ⚠️ {item.error}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {item.status === 'failed' && (
                    <button 
                      onClick={() => uploadManager.retryItem(item.id)}
                      className="p-1 rounded bg-forest/5 text-forest hover:bg-forest/10 cursor-pointer focus:outline-none focus:ring-1 focus:ring-forest"
                      title="Retry upload"
                      aria-label={`Retry upload for ${item.name}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                    </button>
                  )}
                  {['waiting', 'compressing', 'ready', 'uploading', 'retrying', 'failed'].includes(item.status) && (
                    <button 
                      onClick={() => uploadManager.cancelUpload(item.id)}
                      className="p-1 rounded bg-red-50 text-red-700 hover:bg-red-100 cursor-pointer focus:outline-none focus:ring-1 focus:ring-red-500"
                      title="Cancel upload"
                      aria-label={`Cancel upload for ${item.name}`}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Glassmorphic Floating Action Dock (Optimized Touch Targets for Mobile) */}
      <div className="fixed bottom-6 left-0 right-0 mx-auto z-40 w-[calc(100%-32px)] max-w-md bg-paper/90 border border-forest/10 rounded-2xl shadow-xl backdrop-blur-md p-3 flex gap-2">
        {!selectMode ? (
          <>
            <button
              onClick={() => fileInputRef.current.click()}
              disabled={uploadingItems.length > 0 || event.isClosed}
              className="flex-2 bg-forest text-paper font-semibold text-sm py-4 rounded-xl disabled:opacity-50 hover:bg-forest/90 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {uploadingItems.length > 0 ? 'Uploading...' : event.isClosed ? 'Gallery Closed' : 'Share Photos'}
            </button>

            {photos.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="flex-1 border border-forest/20 text-forest bg-paper/50 font-semibold text-sm py-4 rounded-xl disabled:opacity-50 hover:border-forest transition-all active:scale-[0.98] cursor-pointer"
              >
                {downloadingAll ? 'Preparing...' : 'Download All'}
              </button>
            )}

            <button
              onClick={handleShare}
              className="border border-forest/20 text-forest bg-paper/50 font-semibold text-sm py-4 px-4 rounded-xl hover:border-forest transition-all active:scale-[0.98] flex items-center justify-center gap-1.5 cursor-pointer"
              title="Share Gallery Link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              {shareToast === 'copied' ? 'Copied!' : ''}
            </button>
          </>
        ) : (
          <button
            onClick={handleDownloadSelected}
            disabled={selectedIds.size === 0 || downloadingSelected}
            className="w-full bg-forest text-paper font-semibold text-sm py-4 rounded-xl disabled:opacity-50 hover:bg-forest/90 transition-all active:scale-[0.98] cursor-pointer"
          >
            {downloadingSelected ? 'Downloading...' : `Download Selected (${selectedIds.size})`}
          </button>
        )}
      </div>

      {/* Photo Viewer Modal (With swiping + Arrow navigation keys + metadata drawer) */}
      {/* Premium Fullscreen Photo Viewer Modal */}
      {viewerPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setViewerPhoto(null)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="fixed inset-0 bg-ink/98 z-50 flex flex-col md:flex-row overflow-hidden select-none animate-fade-in"
        >
          {/* Main Viewing Pane */}
          <div className="flex-1 relative flex flex-col items-center justify-center p-4">
            
            {/* Top Navigation Toolbar */}
            <div className="absolute top-4 left-4 right-4 flex flex-wrap gap-2 items-center justify-between z-30" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewerPhoto(null)}
                  className="px-3.5 py-2 rounded-xl bg-paper/10 hover:bg-paper/20 text-paper font-semibold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                  aria-label="Close viewer"
                >
                  ✕ Close
                </button>
                <div className="px-3 py-1.5 rounded-lg bg-paper/5 font-mono text-paper/70 text-[10px]">
                  {currentPhotoIdx + 1} / {getFilteredPhotos().length}
                </div>
              </div>

              {/* Zoom and Play Controls */}
              <div className="flex items-center gap-1.5 bg-paper/5 p-1 rounded-xl">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))}
                  disabled={zoomLevel === 1}
                  className="px-2 py-1 rounded text-paper font-bold text-xs hover:bg-paper/10 disabled:opacity-30 cursor-pointer"
                  title="Zoom Out"
                >
                  ー
                </button>
                <span className="text-paper/85 font-mono text-[9px] font-bold px-1 min-w-[32px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.5))}
                  disabled={zoomLevel === 3}
                  className="px-2 py-1 rounded text-paper font-bold text-xs hover:bg-paper/10 disabled:opacity-30 cursor-pointer"
                  title="Zoom In"
                >
                  ＋
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="px-2 py-1 rounded text-paper/70 text-[9px] font-semibold hover:bg-paper/10 cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Toolbar Buttons Row */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSlideShowMode(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-[10px] transition-all cursor-pointer ${
                    slideShowMode ? 'bg-amber text-forest' : 'bg-paper/10 hover:bg-paper/20 text-paper'
                  }`}
                >
                  {slideShowMode ? '■ Stop Slideshow' : '▶ Slideshow'}
                </button>
                <button
                  onClick={() => handleMockFavorite(viewerPhoto)}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-[10px] transition-all cursor-pointer ${
                    activeMockFavorite.has(viewerPhoto._id) ? 'bg-red-500 text-white' : 'bg-paper/10 hover:bg-paper/20 text-paper'
                  }`}
                >
                  {activeMockFavorite.has(viewerPhoto._id) ? '❤️ Favorited' : '🤍 Favorite'}
                </button>
                <button
                  onClick={() => handleMockFeatured(viewerPhoto)}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-[10px] transition-all cursor-pointer ${
                    mockFeaturedIds.has(viewerPhoto._id) ? 'bg-amber text-forest' : 'bg-paper/10 hover:bg-paper/20 text-paper'
                  }`}
                >
                  {mockFeaturedIds.has(viewerPhoto._id) ? '⭐ Featured' : '☆ Feature'}
                </button>
                <button
                  onClick={() => setIsViewerInfoOpen(prev => !prev)}
                  className={`px-3 py-1.5 rounded-xl font-semibold text-[10px] transition-all cursor-pointer ${
                    isViewerInfoOpen ? 'bg-forest text-paper border border-forest/15' : 'bg-paper/10 hover:bg-paper/20 text-paper'
                  }`}
                >
                  ℹ Info
                </button>
              </div>
            </div>

            {/* Left and Right Nav Chevrons */}
            {hasPrev && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-6 w-12 h-12 rounded-full bg-paper/15 hover:bg-paper/25 text-paper flex items-center justify-center transition-all z-20 cursor-pointer hidden md:flex"
                aria-label="Previous photo"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {hasNext && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-6 w-12 h-12 rounded-full bg-paper/15 hover:bg-paper/25 text-paper flex items-center justify-center transition-all z-20 cursor-pointer hidden md:flex"
                aria-label="Next photo"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}

            {/* Center zoomable image frame */}
            <div 
              className="relative max-w-full max-h-[75vh] flex items-center justify-center overflow-hidden" 
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={viewerPhoto.originalUrl}
                alt={viewerPhoto.originalName || 'Event memory'}
                onDoubleClick={() => setZoomLevel(prev => prev > 1 ? 1 : 2.5)}
                onClick={() => setZoomLevel(prev => prev > 1 ? 1 : 1.5)}
                style={{ 
                  transform: `scale(${zoomLevel})`, 
                  transition: 'transform 0.25s ease-out', 
                  cursor: zoomLevel > 1 ? 'zoom-out' : 'zoom-in',
                  imageRendering: 'auto'
                }}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl animate-fade-in"
              />
            </div>

            {/* Micro Caption */}
            <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
              <span className="bg-black/60 text-paper/90 px-3 py-1.5 rounded-full text-[10px] font-mono">
                by {viewerPhoto.uploaderName || 'Guest'} · Double click to zoom
              </span>
            </div>

          </div>

          {/* Right Column: Sliding metadata panel drawer */}
          {isViewerInfoOpen && (
            <div 
              onClick={e => e.stopPropagation()}
              className="w-full md:w-80 bg-paper border-l border-forest/10 p-6 flex flex-col justify-between overflow-y-auto animate-slide-in relative z-40 text-left h-[50vh] md:h-full flex-shrink-0"
            >
              <div className="flex flex-col gap-5">
                <div className="pb-3 border-b border-forest/10 flex justify-between items-center">
                  <div>
                    <span className="text-[8px] font-mono font-bold text-sky uppercase tracking-widest">Metadata Panel</span>
                    <h4 className="font-display font-extrabold text-base text-forest mt-0.5">Photo Details</h4>
                  </div>
                  <button 
                    onClick={() => setIsViewerInfoOpen(false)}
                    className="text-forest/60 hover:text-forest text-xs font-bold font-mono"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Metadata Fields */}
                <div className="flex flex-col gap-3 font-brand">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">Filename</span>
                    <span className="text-xs font-semibold text-forest break-all">{viewerPhoto.originalName || viewerPhoto.filename}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">Contributor</span>
                      <span className="text-xs font-semibold text-forest truncate block">{viewerPhoto.uploaderName || 'Guest'}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">File Size</span>
                      <span className="text-xs font-semibold text-forest font-mono">
                        {viewerPhoto.sizeBytes ? `${(viewerPhoto.sizeBytes / (1024 * 1024)).toFixed(2)} MB` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">Dimensions</span>
                      <span className="text-xs font-semibold text-forest font-mono">
                        {imageDim ? `${imageDim.width} × ${imageDim.height} px` : 'Loading...'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">Downloads</span>
                      <span className="text-xs font-semibold text-forest font-mono">0 (mock)</span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">Upload Time</span>
                    <span className="text-xs font-semibold text-forest font-mono">{new Date(viewerPhoto.createdAt).toLocaleString()}</span>
                  </div>

                  {/* Future-Ready Mocks Section */}
                  <div className="mt-2 pt-3 border-t border-forest/5 flex flex-col gap-2">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">📍 Shot Location (Mock)</span>
                      <span className="text-[10px] font-semibold text-forest/70">Central Park, New York</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">📸 Camera Details (Mock)</span>
                      <span className="text-[10px] font-semibold text-forest/70">iPhone 15 Pro, 24mm f/1.78</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">🏷 AI Semantic Tags (Mock)</span>
                      <span className="text-[9px] font-mono font-bold text-forest bg-forest/5 px-2 py-0.5 rounded-full inline-block mt-1 mr-1">#celebration</span>
                      <span className="text-[9px] font-mono font-bold text-forest bg-forest/5 px-2 py-0.5 rounded-full inline-block mt-1">#candid</span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-ink/40 font-mono font-bold">😊 Faces Detected (Mock)</span>
                      <span className="text-[10px] font-semibold text-forest/70">2 faces matched</span>
                    </div>
                  </div>
                </div>

                {/* Live Comments mockup block */}
                <div className="mt-2 pt-3 border-t border-forest/10 text-left">
                  <h5 className="text-[9px] font-mono font-bold uppercase tracking-wider text-forest font-mono">Comments Feed</h5>
                  <div className="flex flex-col gap-2 mt-2 max-h-24 overflow-y-auto pr-1">
                    {(mockComments[viewerPhoto._id] || [
                      { uploader: 'John Doe', text: 'This is an amazing shot!' },
                      { uploader: 'Sarah M.', text: 'Absolutely beautiful!' }
                    ]).map((c, i) => (
                      <div key={i} className="text-[10px] leading-snug">
                        <span className="font-bold text-forest">{c.uploader}: </span>
                        <span className="text-ink/80">{c.text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-2.5">
                    <input
                      type="text"
                      value={newMockCommentText}
                      onChange={(e) => setNewMockCommentText(e.target.value)}
                      placeholder="Add comment..."
                      className="flex-1 border border-forest/15 px-2.5 py-1.5 rounded-lg text-[10px] outline-none focus:border-forest bg-mist text-ink font-semibold animate-fade-in"
                    />
                    <button
                      onClick={() => {
                        if (!newMockCommentText.trim()) return;
                        const newComment = { uploader: 'You', text: newMockCommentText.trim() };
                        setMockComments(prev => ({
                          ...prev,
                          [viewerPhoto._id]: [...(prev[viewerPhoto._id] || [{ uploader: 'John Doe', text: 'This is an amazing shot!' }, { uploader: 'Sarah M.', text: 'Absolutely beautiful!' }]), newComment]
                        }));
                        setNewMockCommentText('');
                      }}
                      className="bg-forest text-paper px-3 py-1 rounded-lg text-[9px] font-semibold active:scale-95 transition-all cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-forest/10 flex flex-col gap-2 mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadSinglePhoto(viewerPhoto)}
                    className="flex-1 bg-forest text-paper font-semibold text-xs py-2.5 rounded-xl hover:bg-forest/90 cursor-pointer active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    Download Original
                  </button>
                  <button
                    onClick={() => handleNativeShare(viewerPhoto)}
                    className="flex-1 border border-forest/10 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl cursor-pointer active:scale-95 transition-all bg-paper text-center flex items-center justify-center gap-1"
                  >
                    Share link
                  </button>
                </div>
                {isOrganizer && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this photo?')) {
                        try {
                          await api.delete(`/photos/${viewerPhoto._id}`);
                          showToast('Photo deleted successfully!', 'success');
                          setViewerPhoto(null);
                          await loadPhotos();
                        } catch {
                          alert('Failed to delete photo');
                        }
                      }
                    }}
                    className="w-full bg-red-600 text-white font-semibold text-xs py-2.5 rounded-xl hover:bg-red-700 cursor-pointer active:scale-95 transition-all text-center"
                  >
                    Delete Photo (Organizer)
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      )}
      {/* Celebration Success Modal */}
      {uploadSuccessBatch && (
        <div className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="success-title">
          <div className="bg-paper p-8 rounded-3xl text-center max-w-sm w-full shadow-2xl border border-forest/10 welcome-animate flex flex-col items-center">
            {/* Success Animation Illustration */}
            <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 shadow-inner animate-bounce">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            
            <h3 id="success-title" className="font-display font-extrabold text-3xl text-forest leading-none">Upload Success!</h3>
            <p className="text-sm text-ink/75 mt-4 leading-relaxed">
              Thank you! Your photos have been added to the event. 
              You contributed <span className="font-bold text-forest">{uploadSuccessBatch.count} photos</span> to <strong>{event?.name}</strong>.
            </p>

            {uploadSuccessBatch.totalTime !== undefined && (
              <p className="text-xs text-ink/65 mt-2 font-medium">
                ⏱️ Total upload time: <span className="font-bold text-forest">{uploadSuccessBatch.totalTime} seconds</span>
              </p>
            )}

            {uploadSuccessBatch.savedBytes !== undefined && uploadSuccessBatch.savedBytes > 0 && (
              <div className="mt-4 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-mono w-full leading-normal">
                ⚡ Client-side compression saved <strong>{((uploadSuccessBatch.savedBytes) / (1024 * 1024)).toFixed(1)} MB</strong> of mobile data ({Math.round((uploadSuccessBatch.savedBytes / uploadSuccessBatch.originalBytes) * 100)}% smaller).
              </div>
            )}

            <div className="flex flex-col gap-3 w-full mt-8">
              <button
                onClick={() => {
                  setUploadSuccessBatch(null)
                  setViewMode('gallery')
                }}
                className="w-full bg-forest text-paper font-semibold text-sm py-4 rounded-xl hover:bg-forest/90 active:scale-[0.98] transition-all cursor-pointer shadow focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
              >
                View Gallery
              </button>
              <button
                onClick={() => {
                  setUploadSuccessBatch(null)
                  fileInputRef.current.click()
                }}
                className="w-full border border-forest/20 text-forest bg-paper/50 font-semibold text-sm py-3.5 rounded-xl hover:border-forest transition-all active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
              >
                Upload More
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Full Screen Overlay */}
      {isDragging && (
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setIsDragging(false)}
          className="fixed inset-0 bg-forest/20 backdrop-blur-md z-50 flex items-center justify-center p-6 pointer-events-auto border-4 border-dashed border-forest"
          style={{ transition: 'opacity 0.2s ease-in-out' }}
        >
          <div className="bg-paper p-8 rounded-3xl text-center max-w-sm shadow-2xl border border-forest/10 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-forest/10 text-forest flex items-center justify-center mx-auto mb-4 animate-bounce">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3 className="font-display font-extrabold text-2xl text-forest">Drop to Upload</h3>
            <p className="text-sm text-ink/70 mt-2">Release your photos here to instantly add them to your event gallery.</p>
          </div>
        </div>
      )}
        {/* Floating circular button for Live Activity Feed (Phase 5) */}
        <button
          onClick={() => setIsActivityOpen(!isActivityOpen)}
          className="fixed bottom-24 right-6 z-40 w-12 h-12 bg-forest text-paper rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border border-forest/10 focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2"
          aria-label="Toggle live activity feed"
          title="Live Activity Feed"
        >
          <span className="relative">
            🔔
            {activityFeed.length > 0 && (
              <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-[8px] font-bold rounded-full flex items-center justify-center animate-bounce text-white">
                {activityFeed.length}
              </span>
            )}
          </span>
        </button>

        {/* Live Activity Feed Slide-Over Drawer (Phase 5 & 10 & 12) */}
        {isActivityOpen && (
          <div 
            className="fixed inset-0 z-50 overflow-hidden" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="activity-feed-title"
          >
            {/* Backdrop */}
            <div 
              onClick={() => setIsActivityOpen(false)}
              className="absolute inset-0 bg-ink/40 backdrop-blur-xs transition-opacity"
            />

            <div className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-xs bg-paper border-l border-forest/10 shadow-2xl p-6 flex flex-col h-full animate-slide-in welcome-animate">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-forest/10 mb-4">
                  <h3 id="activity-feed-title" className="font-display font-extrabold text-lg text-forest flex items-center gap-2">
                    🔔 Live Activity
                  </h3>
                  <button 
                    onClick={() => setIsActivityOpen(false)}
                    className="p-1.5 rounded-lg bg-mist hover:bg-forest/5 text-forest/70 hover:text-forest transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest"
                    aria-label="Close activity feed"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Feed List */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-thin">
                  {activityFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-ink/40 py-10 gap-2">
                      <span className="text-3xl">🤫</span>
                      <p className="text-xs font-semibold">No activity yet. Share photos to get the party started!</p>
                    </div>
                  ) : (
                    activityFeed.map((activity) => {
                      const avatarLetter = (activity.userName || "G").charAt(0).toUpperCase();
                      const relativeTime = getRelativeTimeString(activity.timestamp);
                      return (
                        <div 
                          key={activity.id || Math.random()} 
                          className="flex gap-3 bg-mist/40 p-3 rounded-xl border border-forest/5 animate-fade-in items-start"
                        >
                          <div className="w-8 h-8 rounded-full bg-forest/10 text-forest font-bold text-xs uppercase flex items-center justify-center flex-shrink-0 shadow-inner">
                            {avatarLetter}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-ink font-semibold leading-snug break-words">
                              {activity.text}
                            </p>
                            <span className="text-[9px] font-mono text-ink/40 mt-1 block">
                              {relativeTime}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Floating toast message overlay */}
      {toast.message && (
        <div className={`fixed bottom-6 right-6 z-55 px-5 py-3 rounded-xl shadow-lg border text-xs font-mono font-bold flex items-center gap-3 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          toast.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{toast.type === 'error' ? '⚡' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}

export default EventGalleryPage
