import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../api/axios.js'
import LandingPage from '../components/LandingPage.jsx'

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USER_KEY))
  } catch {
    return null
  }
}

const THEME_PRESETS = {
  classic: {
    accentColor: '#1e3a24',
    fontFamily: 'serif',
    welcomeTitle: 'Join Our Gallery',
    welcomeMessage: 'Scan the QR code or tap the button below to upload your photos directly to our event gallery.',
    customButtonText: 'Upload Photos',
  },
  wedding: {
    accentColor: '#8a6d3b',
    fontFamily: 'serif',
    welcomeTitle: 'Our Wedding Day',
    welcomeMessage: 'We are so glad you are here. Please share your favorite moments of our special day with us.',
    customButtonText: 'Share Your Photos',
  },
  minimal: {
    accentColor: '#1a1a1a',
    fontFamily: 'sans',
    welcomeTitle: 'Collect Photos',
    welcomeMessage: 'Simple, fast photo collection. Upload your images in seconds.',
    customButtonText: 'Upload Now',
  },
  corporate: {
    accentColor: '#0b3c5d',
    fontFamily: 'sans',
    welcomeTitle: 'Event Summit',
    welcomeMessage: 'Welcome to our annual company summit. Share your event photographs here.',
    customButtonText: 'Submit Photos',
  },
  birthday: {
    accentColor: '#d9534f',
    fontFamily: 'display',
    welcomeTitle: 'Happy Birthday!',
    welcomeMessage: 'Help us celebrate! Upload all the fun snapshots you take today.',
    customButtonText: 'Add to Party Album',
  },
  graduation: {
    accentColor: '#337ab7',
    fontFamily: 'sans',
    welcomeTitle: 'Class of 2026',
    welcomeMessage: 'Congratulations graduates! Post your graduation ceremony and party pics here.',
    customButtonText: 'Upload Graduation Pics',
  }
}

function CreateEventPage() {
  const [user, setUser] = useState(getStoredUser)
  const [events, setEvents] = useState([])
  const [eventForm, setEventForm] = useState({
    name: '',
    password: '',
    expiresInDays: '30',
  })
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [creating, setCreating] = useState(false)
  const [closingSlug, setClosingSlug] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [shareState, setShareState] = useState('idle')
  const [activeQrEvent, setActiveQrEvent] = useState(null)
  const [toast, setToast] = useState({ message: '', type: '' })
  const [copiedEventSlug, setCopiedEventSlug] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [activeTab, setActiveTab] = useState('events') // 'events' | 'billing' | 'settings' | 'team'

  // Branding Customization States
  const [activeBrandingEvent, setActiveBrandingEvent] = useState(null)
  const [brandingForm, setBrandingForm] = useState({
    coverImage: '',
    logo: '',
    accentColor: '#1e3a24',
    theme: 'classic',
    welcomeTitle: '',
    welcomeMessage: '',
    organizerName: '',
    organizerWebsite: '',
    organizerInstagram: '',
    organizerFacebook: '',
    organizerEmail: '',
    organizerPhone: '',
    footerText: '',
    customButtonText: '',
    galleryLayout: 'grid',
    fontFamily: 'sans'
  })
  const [previewDevice, setPreviewDevice] = useState('mobile') // 'mobile' | 'tablet' | 'desktop'
  const [savingBranding, setSavingBranding] = useState(false)
  const [uploadingAsset, setUploadingAsset] = useState({ logo: false, cover: false })

  const dashboardRef = useRef(null)
  const closeButtonRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast({ message: '', type: '' }), 3000)
  }

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) return

    const restoreSession = async () => {
      try {
        const res = await api.get('/auth/me')
        persistSession(token, res.data.user)
      } catch {
        clearSession()
      }
    }

    restoreSession()
  }, [])

  useEffect(() => {
    if (user) {
      loadEvents()
    }
  }, [user])

  // Escape key handler for accessible modal close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setActiveQrEvent(null);
        setActiveBrandingEvent(null);
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Auto focus modal close button for screen readers
  useEffect(() => {
    if (activeQrEvent && closeButtonRef.current) {
      closeButtonRef.current.focus()
    }
  }, [activeQrEvent])

  useLayoutEffect(() => {
    if (!user || !dashboardRef.current) return undefined

    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.console-reveal',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.05,
          ease: 'power3.out',
        },
      )
    }, dashboardRef)

    return () => ctx.revert()
  }, [user])

  const persistSession = (token, nextUser) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
    setUser(nextUser)
  }

  const clearSession = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setUser(null)
    setEvents([])
    setResult(null)
    showToast('Signed out successfully.', 'info')
  }

  // Handle auth session expiry dynamically from interceptors
  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession()
    }
    window.addEventListener('auth_session_expired', handleSessionExpired)
    return () => window.removeEventListener('auth_session_expired', handleSessionExpired)
  }, [])

  const loadEvents = async () => {
    setLoadingEvents(true)
    try {
      const res = await api.get('/events/mine/list')
      setEvents(res.data.events)
    } catch (err) {
      if (err.response?.status === 401) {
        clearSession()
      } else {
        setError(err.response?.data?.error || 'Could not load your events')
      }
    } finally {
      setLoadingEvents(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!eventForm.name.trim()) {
      setError('Event name is required')
      return
    }

    setError('')
    setCreating(true)
    try {
      const payload = {
        name: eventForm.name,
        password: eventForm.password,
        expiresInDays: Number(eventForm.expiresInDays),
      }
      const res = await api.post('/events', payload)
      setResult(res.data)
      setEventForm({ name: '', password: '', expiresInDays: '30' })
      showToast('Event created successfully!', 'success')
      await loadEvents()
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const handleCloseEvent = async (slug) => {
    if (!window.confirm('Are you sure you want to close this event? Guests will no longer be able to upload photos.')) {
      return
    }
    setClosingSlug(slug)
    setError('')
    try {
      await api.patch(`/events/${slug}/close`)
      showToast('Event collection closed.', 'info')
      await loadEvents()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not close event')
    } finally {
      setClosingSlug('')
    }
  }

  const getShareText = (evt) => `Join "${evt?.name || evt?.event?.name}" and share your photos:`

  const shareWhatsApp = (evt) => {
    const targetUrl = evt?.eventUrl || evt?.event?.eventUrl || `${window.location.origin}/event/${evt?.slug}`
    const url = `https://wa.me/?text=${encodeURIComponent(`${getShareText(evt)} ${targetUrl}`)}`
    window.open(url, '_blank')
  }

  const shareEmail = (evt) => {
    const targetUrl = evt?.eventUrl || evt?.event?.eventUrl || `${window.location.origin}/event/${evt?.slug}`
    const name = evt?.name || evt?.event?.name
    const subject = encodeURIComponent(`You're invited: ${name}`)
    const body = encodeURIComponent(`${getShareText(evt)}\n\n${targetUrl}`)
    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  const handleCopyLink = async (evt) => {
    const targetUrl = evt?.eventUrl || evt?.event?.eventUrl || `${window.location.origin}/event/${evt?.slug}`
    try {
      await navigator.clipboard.writeText(targetUrl)
      setShareState('copied')
      setCopiedEventSlug(evt.slug)
      showToast('Upload link copied to clipboard!', 'success')
      setTimeout(() => {
        setShareState('idle')
        setCopiedEventSlug('')
      }, 2000)
    } catch {
      setShareState('error')
      showToast('Could not copy link.', 'error')
      setTimeout(() => setShareState('idle'), 2000)
    }
  }

  // Download base64 QR as PNG file
  const handleDownloadQr = (evt, qrCodeDataUrl) => {
    const name = evt?.name || evt?.event?.name || 'event'
    const link = document.createElement('a')
    link.href = qrCodeDataUrl
    link.download = `PhotoCollect_QR_${name.replace(/\s+/g, '_')}.png`
    document.body.appendChild(link)
    link.click()
    link.remove()
    showToast('QR Code PNG download started!', 'success')
  }

  // Copy raw QR base64 image data directly into the system clipboard as a binary image
  const handleCopyQrImage = async (qrCodeDataUrl) => {
    try {
      const response = await fetch(qrCodeDataUrl)
      const blob = await response.blob()
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ])
      showToast('QR Image copied! Paste in Canva, Word, or Email.', 'success')
    } catch {
      showToast('Copy image unsupported on this device. Download PNG instead.', 'error')
    }
  }

  // Native share API launcher
  const handleNativeShare = async (evt) => {
    const targetUrl = evt?.eventUrl || evt?.event?.eventUrl || `${window.location.origin}/event/${evt?.slug}`
    const name = evt?.name || evt?.event?.name || 'Event'
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `Join "${name}" gallery and upload your event photos:`,
          url: targetUrl,
        })
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleCopyLink(evt)
        }
      }
    } else {
      handleCopyLink(evt)
    }
  }

  const handleResetComposer = () => {
    setResult(null)
    setEventForm({ name: '', password: '', expiresInDays: '30' })
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleDeleteEventMock = (name) => {
    alert(`"${name}" is protected. Delete functionality is restricted in demo mode. Contact support to delete galleries.`)
  }

  const getFilteredAndSortedEvents = () => {
    let list = [...events]

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(e => e.name.toLowerCase().includes(q))
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      list = list.filter(e => {
        const status = getEventStatus(e)
        return status === statusFilter
      })
    }

    // 3. Sort By
    list.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt) - new Date(a.createdAt)
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt) - new Date(b.createdAt)
      }
      if (sortBy === 'most_photos') {
        return (b.photoCount || 0) - (a.photoCount || 0)
      }
      if (sortBy === 'recently_updated') {
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
      }
      return 0
    })

    return list
  }

  const recentActivities = [
    { id: 1, avatar: '📸', action: 'Guest uploaded 12 photos', time: '10 mins ago', eventName: 'Wedding Celebration' },
    { id: 2, avatar: '🎉', action: 'New gallery created', time: '2 hours ago', eventName: 'Graduation Gala' },
    { id: 3, avatar: '💾', action: 'ZIP archive downloaded', time: 'Yesterday', eventName: 'Anniversary' },
    { id: 4, avatar: '🔒', action: 'Gallery access closed', time: '3 days ago', eventName: 'Birthday Bash' },
  ]

  const getEventStatus = (event) => {
    if (event.isClosed) return 'closed'
    if (event.expiresAt && new Date(event.expiresAt) < new Date()) return 'expired'
    return 'active'
  }

  // Branding Customization Form Toggles
  const handleOpenBranding = (event) => {
    setActiveBrandingEvent(event)
    const brand = event.branding || {}
    setBrandingForm({
      coverImage: brand.coverImage || '',
      logo: brand.logo || '',
      accentColor: brand.accentColor || '#1e3a24',
      theme: brand.theme || 'classic',
      welcomeTitle: brand.welcomeTitle || '',
      welcomeMessage: brand.welcomeMessage || '',
      organizerName: brand.organizerName || event.organizerName || '',
      organizerWebsite: brand.organizerWebsite || '',
      organizerInstagram: brand.organizerInstagram || '',
      organizerFacebook: brand.organizerFacebook || '',
      organizerEmail: brand.organizerEmail || '',
      organizerPhone: brand.organizerPhone || '',
      footerText: brand.footerText || '',
      customButtonText: brand.customButtonText || '',
      galleryLayout: brand.galleryLayout || 'grid',
      fontFamily: brand.fontFamily || 'sans'
    })
  }

  const handleThemeChange = (themeName) => {
    const preset = THEME_PRESETS[themeName] || THEME_PRESETS.classic
    setBrandingForm(prev => ({
      ...prev,
      theme: themeName,
      accentColor: preset.accentColor,
      fontFamily: preset.fontFamily,
      welcomeTitle: preset.welcomeTitle,
      welcomeMessage: preset.welcomeMessage,
      customButtonText: preset.customButtonText
    }))
  }

  const handleAssetUpload = async (e, assetType) => {
    const file = e.target.files[0]
    if (!file) return

    // Limit checks
    if (file.size > 5 * 1024 * 1024) {
      alert("Asset file size must be less than 5MB")
      return
    }

    setUploadingAsset(prev => ({ ...prev, [assetType]: true }))
    const formData = new FormData()
    formData.append('file', file)
    formData.append('assetType', assetType)

    try {
      const res = await api.patch(`/events/${activeBrandingEvent.slug}/branding/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const { url } = res.data
      setBrandingForm(prev => ({
        ...prev,
        [assetType === 'logo' ? 'logo' : 'coverImage']: url
      }))
      showToast(`${assetType === 'logo' ? 'Logo' : 'Cover image'} uploaded successfully!`, 'success')
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed')
    } finally {
      setUploadingAsset(prev => ({ ...prev, [assetType]: false }))
    }
  }

  const handleSaveBranding = async () => {
    setSavingBranding(true)
    try {
      await api.patch(`/events/${activeBrandingEvent.slug}/branding`, {
        branding: brandingForm
      })
      showToast('Branding settings updated!', 'success')
      setActiveBrandingEvent(null)
      await loadEvents()
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed')
    } finally {
      setSavingBranding(false)
    }
  }

  if (!user) {
    return <LandingPage onAuthSuccess={persistSession} />
  }

  // Calculate metrics
  const totalEvents = events.length
  const activeEventsCount = events.filter(e => getEventStatus(e) === 'active').length
  const totalPhotos = events.reduce((sum, item) => sum + (item.photoCount || 0), 0)
  const averagePhotosPerEvent = totalEvents > 0 ? Math.round(totalPhotos / totalEvents) : 0
  const estimatedStorageMB = (totalPhotos * 2.2).toFixed(1)
  const maxStorageMB = 1000 // 1GB
  const percentStorageUsed = Math.min(100, Math.round((estimatedStorageMB / maxStorageMB) * 100))
  const filteredEvents = getFilteredAndSortedEvents()

  // Get current date string
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div ref={dashboardRef} className="min-h-screen bg-mist font-sans text-ink flex flex-col pb-24">
      {/* Top Banner Toast Notification */}
      {toast.message && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg border text-xs font-mono font-bold flex items-center gap-3 animate-fade-in ${
          toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          toast.type === 'info' ? 'bg-sky-50 border-sky-200 text-sky-800' :
          'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{toast.type === 'error' ? '⚡' : '✓'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modern SaaS Ribbon Navigation */}
      <header className="sticky top-0 z-30 w-full bg-paper/95 border-b border-forest/10 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-xs console-reveal">
        <a href="/" className="flex items-center gap-2.5 hover:opacity-90">
          <div className="w-8 h-8 rounded-lg bg-forest text-paper flex items-center justify-center font-bold text-sm shadow-sm">
            PC
          </div>
          <span className="font-display font-extrabold text-lg text-forest tracking-tight">PhotoCollect Console</span>
        </a>

        {/* Global Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-forest/5 p-1 rounded-xl">
          {[
            { id: 'events', label: 'Galleries' },
            { id: 'billing', label: 'Billing & Plan' },
            { id: 'team', label: 'Team Accounts' },
            { id: 'settings', label: 'Console Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id 
                  ? 'bg-paper text-forest shadow-xs' 
                  : 'text-ink/65 hover:text-forest'
              }`}
            >
              {tab.id !== 'events' ? `${tab.label} (SaaS)` : tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('settings')}>
            <div className="w-8 h-8 rounded-full bg-forest/10 text-forest flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              {user.name.charAt(0)}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-forest">{user.name}</span>
          </div>
          <button type="button" onClick={clearSession} className="button-secondary !py-2 !px-4 !min-h-0 text-xs font-semibold cursor-pointer">
            Sign out
          </button>
        </div>
      </header>

      {/* Main SaaS Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        
        {/* SECTION 1: Welcome Header */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-forest/10 console-reveal">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-mono text-sky font-bold">{todayStr}</p>
            <h1 className="font-display font-extrabold text-3xl text-forest mt-1">Good Morning, {user.name.split(' ')[0]}</h1>
            <p className="text-sm text-ink/65 mt-1">Monitor your events, check storage utilization, and manage guest galleries.</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button 
              onClick={handleResetComposer}
              className="bg-forest text-paper font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs hover:bg-forest/90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Event
            </button>
            <button 
              onClick={loadEvents}
              disabled={loadingEvents}
              className="bg-paper border border-forest/10 text-forest font-semibold text-xs py-2.5 px-4 rounded-xl shadow-xs hover:border-forest active:scale-[0.98] transition-all cursor-pointer"
            >
              {loadingEvents ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => showToast("Notifications module coming soon!", "info")}
              className="relative p-2.5 rounded-xl border border-forest/10 hover:border-forest bg-paper transition-all cursor-pointer"
              title="Notifications placeholder"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber animate-pulse border border-paper"></span>
            </button>
          </div>
        </section>

        {activeTab !== 'events' ? (
          /* SaaS Future-Ready Placeholders View */
          <section className="bg-paper border border-forest/10 p-12 rounded-3xl text-center flex flex-col items-center gap-4 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-forest/5 text-forest flex items-center justify-center font-bold text-2xl">
              ⚙️
            </div>
            <h3 className="font-display font-extrabold text-2xl text-forest capitalize">{activeTab} Workspace</h3>
            <p className="text-sm text-ink/65 max-w-md leading-relaxed">
              This module is planned for Sprint 4. The workspace will integrate Stripe subscriptions, multi-user teams, billing quotas, and advanced white-label settings.
            </p>
            <button 
              onClick={() => setActiveTab('events')}
              className="bg-forest text-paper font-semibold text-xs py-2.5 px-6 rounded-xl mt-4 hover:bg-forest/90 cursor-pointer"
            >
              Return to galleries
            </button>
          </section>
        ) : (
          /* Galleries Workspace (Main Structure) */
          <>
            {/* SECTION 2: Overview Metrics */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 console-reveal">
              <div className="bg-paper border border-forest/5 p-5 rounded-2xl shadow-xs hover:shadow transition-all relative overflow-hidden">
                <div className="text-forest/50 bg-forest/5 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  💼
                </div>
                <span className="text-2xl font-extrabold text-forest block">{totalEvents}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-ink/55 block mt-1">Total Galleries</span>
                <span className="text-[9px] text-emerald-700 font-bold font-mono mt-2 block">✓ {activeEventsCount} Active</span>
              </div>

              <div className="bg-paper border border-forest/5 p-5 rounded-2xl shadow-xs hover:shadow transition-all relative overflow-hidden">
                <div className="text-forest/50 bg-forest/5 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  📸
                </div>
                <span className="text-2xl font-extrabold text-forest block">{totalPhotos}</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-ink/55 block mt-1">Photos Uploaded</span>
                <span className="text-[9px] text-sky font-bold font-mono mt-2 block">~{averagePhotosPerEvent} per event</span>
              </div>

              <div className="bg-paper border border-forest/5 p-5 rounded-2xl shadow-xs hover:shadow transition-all relative overflow-hidden">
                <div className="text-forest/50 bg-forest/5 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  💾
                </div>
                <span className="text-2xl font-extrabold text-forest block">{estimatedStorageMB} MB</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-ink/55 block mt-1">Storage Utilized</span>
                <span className="text-[9px] text-amber font-bold font-mono mt-2 block">{percentStorageUsed}% of 1GB limit</span>
              </div>

              <div className="bg-paper border border-forest/5 p-5 rounded-2xl shadow-xs hover:shadow transition-all relative overflow-hidden">
                <div className="text-forest/50 bg-forest/5 w-8 h-8 rounded-lg flex items-center justify-center mb-3">
                  ⚡
                </div>
                <span className="text-2xl font-extrabold text-forest block">Free Mode</span>
                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-ink/55 block mt-1">Monthly Plan</span>
                <span className="text-[9px] text-forest/75 font-semibold font-mono mt-2 block hover:underline cursor-pointer">Upgrade to Pro →</span>
              </div>
            </section>

            {/* Layout Grid: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side: Composer and Events */}
              <div className="lg:col-span-2 flex flex-col gap-8">
                
                {/* Event Composer Box */}
                <section className="bg-paper border border-forest/10 p-6 rounded-3xl shadow-sm console-reveal">
                  {!result ? (
                    <>
                      <span className="text-[9px] font-mono font-bold text-sky uppercase tracking-widest">New Gallery Creator</span>
                      <h2 className="text-xl font-display font-extrabold text-forest mt-1">Generate Guest Collection Link</h2>
                      
                      {error && <p className="text-red-600 text-xs font-bold my-4 bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>}

                      <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <label className="block sm:col-span-2">
                          <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1.5 uppercase tracking-wider">Event Name</span>
                          <input
                            type="text"
                            value={eventForm.name}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="Rina and Sami's Wedding"
                            required
                            className="w-full border border-forest/15 px-4 py-3 rounded-xl bg-mist focus:border-forest outline-none text-sm transition-all focus:ring-4 focus:ring-forest/5"
                          />
                        </label>

                        <label className="block">
                          <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1.5 uppercase tracking-wider">Guest Password (Optional)</span>
                          <input
                            type="password"
                            value={eventForm.password}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Secure code"
                            className="w-full border border-forest/15 px-4 py-3 rounded-xl bg-mist focus:border-forest outline-none text-sm transition-all focus:ring-4 focus:ring-forest/5"
                          />
                        </label>

                        <label className="block">
                          <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1.5 uppercase tracking-wider">Link Expiration</span>
                          <select
                            value={eventForm.expiresInDays}
                            onChange={(e) => setEventForm((prev) => ({ ...prev, expiresInDays: e.target.value }))}
                            className="w-full border border-forest/15 px-4 py-3 rounded-xl bg-mist focus:border-forest outline-none text-sm transition-all"
                          >
                            <option value="7">7 days</option>
                            <option value="30">30 days</option>
                            <option value="90">90 days</option>
                            <option value="365">1 year</option>
                          </select>
                        </label>

                        <button type="submit" disabled={creating} className="sm:col-span-2 bg-forest text-paper font-semibold text-sm py-4 rounded-xl shadow hover:bg-forest/90 transition-all active:scale-[0.98] cursor-pointer mt-2">
                          {creating ? 'Creating...' : 'Generate Live QR & Gallery'}
                        </button>
                      </form>
                    </>
                  ) : (
                    /* Bento Grid Success View */
                    <div className="animate-fade-in flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        ✓
                      </div>
                      <h2 className="text-xl font-display font-extrabold text-forest">{result.event.name} Created</h2>
                      <p className="text-xs text-ink/65 mt-1 max-w-sm">Place this QR code on cards at tables to let guests scan and upload.</p>

                      <div className="bg-mist p-6 rounded-2xl border border-forest/5 flex items-center justify-center my-6 shadow-inner w-56 h-56">
                        <img 
                          src={result.qrCodeDataUrl} 
                          alt="Live QR code" 
                          className="w-full h-full object-contain rounded-lg"
                        />
                      </div>

                      <div className="flex flex-col gap-2 w-full max-w-sm">
                        <button
                          onClick={() => handleCopyLink(result.event)}
                          className="w-full bg-forest text-paper font-semibold text-xs py-3 rounded-xl hover:bg-forest/90 active:scale-[0.98] transition-all cursor-pointer"
                        >
                          {shareState === 'copied' && copiedEventSlug === result.event.slug ? 'Link Copied!' : 'Copy Guest Upload Link'}
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleDownloadQr(result.event, result.qrCodeDataUrl)}
                            className="border border-forest/15 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all bg-paper cursor-pointer"
                          >
                            Download PNG
                          </button>
                          <button
                            onClick={() => handleCopyQrImage(result.qrCodeDataUrl)}
                            className="border border-forest/15 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all bg-paper cursor-pointer"
                          >
                            Copy QR Image
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleNativeShare(result.event)}
                            className="border border-forest/15 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all bg-paper cursor-pointer"
                          >
                            Share Link
                          </button>
                          <Link
                            to={`/event/${result.event.slug}`}
                            className="bg-sky text-paper font-semibold text-xs py-2.5 rounded-xl transition-all text-center flex items-center justify-center"
                          >
                            Open Gallery →
                          </Link>
                        </div>

                        <button
                          onClick={handleResetComposer}
                          className="text-xs text-forest/60 hover:text-forest mt-4 font-mono font-semibold hover:underline"
                        >
                          + Create Another Event
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* SECTION 4: Events List / Grid Area */}
                <section className="flex flex-col gap-4 console-reveal">
                  {/* Search, filters and sort controls */}
                  <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-paper p-4 rounded-2xl border border-forest/5 shadow-xs w-full">
                    {/* Search */}
                    <div className="relative w-full sm:flex-1">
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search galleries..."
                        className="w-full pl-9 pr-4 py-2 border border-forest/15 rounded-xl text-xs bg-mist focus:border-forest focus:ring-4 focus:ring-forest/5 outline-none"
                      />
                      <svg className="absolute left-3.5 top-3 text-forest/40" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>

                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="border border-forest/15 rounded-xl text-xs bg-mist px-3 py-2 text-forest/80 focus:border-forest outline-none w-full sm:w-auto"
                    >
                      <option value="all">All Statuses</option>
                      <option value="active">Active Only</option>
                      <option value="closed">Closed Only</option>
                      <option value="expired">Expired Only</option>
                    </select>

                    {/* Sort selection */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="border border-forest/15 rounded-xl text-xs bg-mist px-3 py-2 text-forest/80 focus:border-forest outline-none w-full sm:w-auto"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="most_photos">Most Photos</option>
                      <option value="recently_updated">Recently Updated</option>
                    </select>
                  </div>

                  {/* List / Grid Display */}
                  {loadingEvents ? (
                    <div className="collection-skeleton bg-paper border border-forest/5 p-8 rounded-3xl h-48 animate-pulse flex flex-col gap-4">
                      <div className="h-6 w-1/3 bg-forest/10 rounded"></div>
                      <div className="h-4 w-full bg-forest/5 rounded"></div>
                      <div className="h-4 w-2/3 bg-forest/5 rounded"></div>
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    /* SECTION 8: Empty State Illustration card */
                    <div className="empty-state border border-dashed border-forest/15 p-12 text-center rounded-3xl bg-forest/5 flex flex-col items-center">
                      <div className="w-14 h-14 rounded-full bg-mist flex items-center justify-center mb-4 border border-forest/5">
                        📂
                      </div>
                      <h3 className="font-display font-bold text-lg text-forest">No Galleries Match Your Filter</h3>
                      <p className="text-xs text-forest/70 font-body max-w-xs mt-2 leading-relaxed">
                        Try adjusting your query/filter settings or build a new event guest QR code.
                      </p>
                      <button 
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="bg-forest text-paper text-xs py-2.5 px-6 rounded-xl mt-5 hover:bg-forest/90 active:scale-[0.98] transition-all cursor-pointer shadow-xs"
                      >
                        Reset Filter
                      </button>
                    </div>
                  ) : (
                    /* Grid of Events */
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredEvents.map((event) => {
                        const status = getEventStatus(event)
                        const percentUsed = Math.min(100, Math.round((event.photoCount / event.uploadLimit) * 100))
                        
                        // Fake thumbnail backdrop fallback
                        const fallbackCardCover = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=400&auto=format&fit=crop"
                        
                        return (
                          <article key={event.id} className="bg-paper border border-forest/10 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                            {/* Card Header Background */}
                            <div className="relative h-28 bg-mist overflow-hidden border-b border-forest/5">
                              <img src={event.branding?.coverImage || fallbackCardCover} alt={event.name} className="w-full h-full object-cover opacity-80 animate-fade-in" />
                              <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/20 to-transparent"></div>
                              <span className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                                status === 'active' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                status === 'expired' ? 'bg-red-50 text-red-800 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200'
                              }`}>
                                {status}
                              </span>
                            </div>

                            {/* Card Details */}
                            <div className="p-5 flex-1 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  {event.branding?.logo && (
                                    <img src={event.branding.logo} className="w-5 h-5 rounded-full object-contain border border-forest/5 flex-shrink-0" alt="Logo" />
                                  )}
                                  <h3 className="font-display font-extrabold text-base text-forest line-clamp-1">{event.name}</h3>
                                </div>
                                <p className="text-[9px] font-mono text-forest/50 mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span>Created: {formatDate(event.createdAt)}</span>
                                  <span>•</span>
                                  <span>Expires: {formatDate(event.expiresAt)}</span>
                                </p>
                              </div>

                              {/* Progress metrics */}
                              <div className="mt-4">
                                <div className="flex justify-between items-center text-[9px] font-mono text-forest/70 mb-1">
                                  <span>Photos: {event.photoCount} / {event.uploadLimit}</span>
                                  <span>{percentUsed}%</span>
                                </div>
                                <div className="w-full bg-forest/5 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className="bg-forest h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${percentUsed}%` }}
                                  />
                                </div>
                              </div>

                              {/* Controls */}
                              <div className="grid grid-cols-3 gap-1.5 mt-5">
                                <button
                                  type="button"
                                  onClick={() => setActiveQrEvent(event)}
                                  className="border border-forest/10 hover:border-forest text-forest font-semibold text-[9px] py-2 rounded-lg transition-all bg-paper cursor-pointer truncate"
                                  title="Share QR"
                                >
                                  Share QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyLink(event)}
                                  className="border border-forest/10 hover:border-forest text-forest font-semibold text-[9px] py-2 rounded-lg transition-all bg-paper cursor-pointer truncate"
                                  title="Copy Link"
                                >
                                  {shareState === 'copied' && copiedEventSlug === event.slug ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenBranding(event)}
                                  className="border border-forest/10 hover:border-forest text-forest font-semibold text-[9px] py-2 rounded-lg transition-all bg-paper cursor-pointer truncate"
                                  title="Customize Branding"
                                >
                                  Branding
                                </button>
                                <Link 
                                  to={`/event/${event.slug}`} 
                                  className="col-span-3 bg-forest text-paper font-semibold text-[10px] py-2.5 rounded-xl hover:bg-forest/90 transition-all text-center flex items-center justify-center shadow-xs"
                                >
                                  View Live Gallery →
                                </Link>
                              </div>

                              {/* Close/Delete Action trigger */}
                              <div className="flex justify-between items-center mt-3 pt-3 border-t border-forest/5">
                                <button
                                  onClick={() => handleDeleteEventMock(event.name)}
                                  className="text-[9px] font-semibold font-mono text-red-500 hover:text-red-700 cursor-pointer"
                                  title="Delete placeholder"
                                >
                                  Delete Event
                                </button>
                                
                                {!event.isClosed && status === 'active' && (
                                  <button
                                    onClick={() => handleCloseEvent(event.slug)}
                                    disabled={closingSlug === event.slug}
                                    className="text-[9px] font-semibold font-mono text-amber hover:text-amber-800 cursor-pointer"
                                  >
                                    {closingSlug === event.slug ? 'Closing...' : 'Close uploads'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Side: Storage info and Activity Feed */}
              <div className="flex flex-col gap-6">
                
                {/* SECTION 6: Storage Visual dashboard panel */}
                <section className="bg-paper border border-forest/10 p-5 rounded-3xl shadow-sm console-reveal flex flex-col gap-4">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-forest leading-none">Console Plan</h3>
                    <p className="text-[10px] text-ink/50 uppercase tracking-widest font-mono mt-1.5">Free Developer Tier</p>
                  </div>

                  {/* Storage Progress */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-forest/75 mb-1.5">
                      <span className="font-semibold">{estimatedStorageMB} MB used</span>
                      <span className="font-mono">{maxStorageMB} MB total</span>
                    </div>
                    <div className="w-full bg-forest/5 h-2 rounded-full overflow-hidden border border-forest/5">
                      <div 
                        className="h-full bg-forest transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${percentStorageUsed}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-ink/60 leading-relaxed mt-2">
                      You are using <span className="font-bold text-forest">{percentStorageUsed}%</span> of your default account storage quota. 
                    </p>
                  </div>

                  <button 
                    onClick={() => showToast("Billing features are under development.", "info")}
                    className="w-full bg-forest text-paper font-semibold text-xs py-3 rounded-xl hover:bg-forest/90 active:scale-[0.98] transition-all cursor-pointer text-center shadow-xs"
                  >
                    Upgrade Storage
                  </button>
                </section>

                {/* SECTION 5: Recent Activity Timeline */}
                <section className="bg-paper border border-forest/10 p-5 rounded-3xl shadow-sm console-reveal flex flex-col gap-4">
                  <div>
                    <h3 className="font-display font-extrabold text-base text-forest leading-none">Recent Activity</h3>
                    <p className="text-[10px] text-ink/50 uppercase tracking-widest font-mono mt-1.5">Live event stream logs</p>
                  </div>

                  <div className="flex flex-col gap-4 mt-2">
                    {recentActivities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-forest/5 flex items-center justify-center text-sm shadow-inner flex-shrink-0">
                          {act.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-forest leading-snug">{act.action}</p>
                          <span className="text-[10px] text-ink/50 mt-0.5 block flex items-center gap-1.5">
                            <span>{act.time}</span>
                            <span>•</span>
                            <span className="truncate max-w-[120px] font-mono text-[9px] text-sky" title={act.eventName}>{act.eventName}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Future modular placeholders */}
                <section className="bg-paper/40 border border-forest/5 p-5 rounded-3xl flex flex-col gap-3 relative opacity-70">
                  <div className="absolute top-4 right-4 bg-amber/10 border border-amber/20 text-amber text-[8px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    SaaS Beta
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-forest tracking-wider font-mono">Developer Features</h4>
                    <p className="text-[10px] text-ink/65 leading-relaxed mt-1">
                      Placeholders for Stripe revenue tabs, automated team rosters, custom subdomains, and AI search tools.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-2 py-1 bg-forest/5 rounded text-[8px] font-semibold text-forest">Revenue (Stripe)</span>
                    <span className="px-2 py-1 bg-forest/5 rounded text-[8px] font-semibold text-forest">Teams Mode</span>
                    <span className="px-2 py-1 bg-forest/5 rounded text-[8px] font-semibold text-forest">AI Insights</span>
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Share QR Dialog Modal */}
      {activeQrEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onClick={() => setActiveQrEvent(null)}
          className="fixed inset-0 bg-ink/90 flex flex-col items-center justify-center z-50 p-4 backdrop-blur-sm"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-paper border border-forest/10 p-8 rounded-3xl max-w-md w-full relative flex flex-col items-center animate-fade-in"
          >
            {/* Close Button */}
            <button
              ref={closeButtonRef}
              onClick={() => setActiveQrEvent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-forest/5 hover:bg-forest/10 text-forest flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest"
              aria-label="Close dialog"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <p className="text-[10px] uppercase tracking-widest font-mono text-sky font-bold">Event Sharing QR</p>
            <h3 id="modal-title" className="font-display font-bold text-2xl text-forest text-center mt-1 mb-6">{activeQrEvent.name}</h3>

            <div className="bg-mist p-4 rounded-2xl shadow-inner mb-6 w-64 h-64 flex items-center justify-center border border-forest/5">
              <img 
                src={activeQrEvent.qrCodeDataUrl} 
                alt={`QR code to upload photos to ${activeQrEvent.name}`} 
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-2 w-full">
              <div className="flex gap-2">
                <button 
                  onClick={() => shareWhatsApp(activeQrEvent)}
                  className="flex-1 border border-forest/10 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all active:scale-[0.98] bg-paper cursor-pointer"
                >
                  WhatsApp
                </button>
                <button 
                  onClick={() => shareEmail(activeQrEvent)}
                  className="flex-1 border border-forest/10 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all active:scale-[0.98] bg-paper cursor-pointer"
                >
                  Email
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleDownloadQr(activeQrEvent, activeQrEvent.qrCodeDataUrl)}
                  className="flex-1 border border-forest/10 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all active:scale-[0.98] bg-paper cursor-pointer"
                >
                  Download PNG
                </button>
                <button 
                  onClick={() => handleCopyQrImage(activeQrEvent.qrCodeDataUrl)}
                  className="flex-1 border border-forest/10 hover:border-forest text-forest font-semibold text-xs py-2.5 rounded-xl transition-all active:scale-[0.98] bg-paper cursor-pointer"
                >
                  Copy QR Image
                </button>
              </div>

              <button 
                onClick={() => handleNativeShare(activeQrEvent)}
                className="w-full bg-forest text-paper font-semibold text-xs py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16 6 12 2 8 6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                {shareState === 'copied' && copiedEventSlug === activeQrEvent.slug ? 'Copied Link!' : 'Share Event Link'}
              </button>
            </div>

            <Link 
              to={`/event/${activeQrEvent.slug}`} 
              className="mt-6 text-xs font-mono text-sky font-bold hover:underline"
              onClick={() => setActiveQrEvent(null)}
            >
              Open guest gallery →
            </Link>
          </div>
        </div>
      )}

      {/* Event Branding & Customization Workspace Overlay */}
      {activeBrandingEvent && (
        <div className="fixed inset-0 bg-ink/80 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-mist border border-forest/10 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col md:flex-row overflow-hidden shadow-2xl welcome-animate animate-fade-in">
            
            {/* Left Column: Branding Control Center */}
            <div className="w-full md:w-1/2 p-6 overflow-y-auto border-r border-forest/10 flex flex-col justify-between bg-paper">
              <div>
                <div className="flex justify-between items-center pb-3 border-b border-forest/10 mb-4">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-sky uppercase tracking-widest">Branding Workspace</span>
                    <h3 className="font-display font-extrabold text-xl text-forest mt-0.5">Customize Identity</h3>
                  </div>
                  <button
                    onClick={() => setActiveBrandingEvent(null)}
                    className="w-8 h-8 rounded-full bg-forest/5 text-forest flex items-center justify-center hover:bg-forest/10 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-4 text-left">
                  {/* Theme Presets */}
                  <label className="block">
                    <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Visual Preset</span>
                    <select
                      value={brandingForm.theme}
                      onChange={(e) => handleThemeChange(e.target.value)}
                      className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none transition-all font-semibold"
                    >
                      <option value="classic">Classic Forest</option>
                      <option value="wedding">Elegant Gold (Wedding)</option>
                      <option value="minimal">Modern Minimalist (Black/Gray)</option>
                      <option value="corporate">Summit Corporate (Blue)</option>
                      <option value="birthday">Bright Festivities (Red)</option>
                      <option value="graduation">Academy Blue (Graduation)</option>
                    </select>
                  </label>

                  {/* Curated Typography */}
                  <label className="block">
                    <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Curated Typography Pair</span>
                    <select
                      value={brandingForm.fontFamily}
                      onChange={(e) => setBrandingForm(prev => ({ ...prev, fontFamily: e.target.value }))}
                      className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none transition-all font-semibold"
                    >
                      <option value="sans">System Sans (Modern & Clean)</option>
                      <option value="serif">Classy Serif (Elegant & Traditional)</option>
                      <option value="display">Geometric Display (Bold & Impactful)</option>
                    </select>
                  </label>

                  {/* Accent Color picker + presets */}
                  <div className="block">
                    <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Accent Theme Color</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-xl border border-forest/15 cursor-pointer bg-transparent overflow-hidden"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: 'Emerald', value: '#10b981' },
                          { name: 'Forest', value: '#1e3a24' },
                          { name: 'Rose', value: '#f43f5e' },
                          { name: 'Blue', value: '#2563eb' },
                          { name: 'Gold', value: '#d97706' },
                          { name: 'Midnight', value: '#0f172a' },
                        ].map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setBrandingForm(prev => ({ ...prev, accentColor: c.value }))}
                            className="w-6 h-6 rounded-full border border-forest/5 transition-all hover:scale-110 active:scale-95 cursor-pointer"
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Cover Image Upload */}
                  <div className="block">
                    <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Cover Banner Image</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => document.getElementById('cover-file-input').click()}
                        disabled={uploadingAsset.cover}
                        className="bg-forest/5 text-forest border border-forest/10 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-forest/10 cursor-pointer active:scale-95 transition-all"
                      >
                        {uploadingAsset.cover ? 'Uploading Cover...' : 'Upload Cover'}
                      </button>
                      <input
                        id="cover-file-input"
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => handleAssetUpload(e, 'cover')}
                        className="hidden"
                      />
                      {brandingForm.coverImage && (
                        <button
                          type="button"
                          onClick={() => setBrandingForm(prev => ({ ...prev, coverImage: '' }))}
                          className="text-red-500 hover:text-red-700 font-mono text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="block">
                    <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Organizer Logo (Transparent PNG)</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => document.getElementById('logo-file-input').click()}
                        disabled={uploadingAsset.logo}
                        className="bg-forest/5 text-forest border border-forest/10 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-forest/10 cursor-pointer active:scale-95 transition-all"
                      >
                        {uploadingAsset.logo ? 'Uploading Logo...' : 'Upload Logo'}
                      </button>
                      <input
                        id="logo-file-input"
                        type="file"
                        accept="image/png"
                        onChange={(e) => handleAssetUpload(e, 'logo')}
                        className="hidden"
                      />
                      {brandingForm.logo && (
                        <button
                          type="button"
                          onClick={() => setBrandingForm(prev => ({ ...prev, logo: '' }))}
                          className="text-red-500 hover:text-red-700 font-mono text-[9px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Welcome Texts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Welcome Heading</span>
                      <input
                        type="text"
                        value={brandingForm.welcomeTitle}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, welcomeTitle: e.target.value }))}
                        placeholder="Hello & Welcome!"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Custom Upload Button Label</span>
                      <input
                        type="text"
                        value={brandingForm.customButtonText}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, customButtonText: e.target.value }))}
                        placeholder="Upload Photos"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold font-semibold">Welcome Subtitle/Message</span>
                      <textarea
                        value={brandingForm.welcomeMessage}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                        placeholder="Help us preserve every beautiful moment..."
                        rows="2"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>
                  </div>

                  {/* Organizer Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Host/Organizer Name</span>
                      <input
                        type="text"
                        value={brandingForm.organizerName}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, organizerName: e.target.value }))}
                        placeholder="Sarah Miller Events"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Contact Email</span>
                      <input
                        type="email"
                        value={brandingForm.organizerEmail}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, organizerEmail: e.target.value }))}
                        placeholder="sarah@example.com"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Website URL</span>
                      <input
                        type="text"
                        value={brandingForm.organizerWebsite}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, organizerWebsite: e.target.value }))}
                        placeholder="https://mysite.com"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-mono font-bold text-forest/70 block mb-1 uppercase tracking-wider font-semibold">Instagram Handle</span>
                      <input
                        type="text"
                        value={brandingForm.organizerInstagram}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, organizerInstagram: e.target.value }))}
                        placeholder="@sarah_events"
                        className="w-full border border-forest/15 px-3 py-2 rounded-xl bg-mist text-xs focus:border-forest outline-none font-semibold"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-forest/10 mt-6 flex-shrink-0">
                <button
                  onClick={() => setActiveBrandingEvent(null)}
                  className="flex-1 border border-forest/15 text-forest font-semibold text-xs py-3 rounded-xl hover:border-forest cursor-pointer active:scale-95 transition-all bg-paper"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBranding}
                  disabled={savingBranding}
                  className="flex-1 bg-forest text-paper font-semibold text-xs py-3 rounded-xl hover:bg-forest/90 cursor-pointer active:scale-95 transition-all shadow-sm"
                >
                  {savingBranding ? 'Saving...' : 'Save Branding'}
                </button>
              </div>
            </div>

            {/* Right Column: Live Device Simulator Preview */}
            <div className="hidden md:flex w-1/2 p-6 flex-col items-center justify-between bg-mist relative">
              <div className="w-full flex justify-between items-center pb-3 border-b border-forest/5 mb-6">
                <span className="text-[10px] font-mono font-bold text-forest/50 uppercase tracking-wider">Real-time Device Preview</span>
                
                {/* Device Selector */}
                <div className="flex gap-1.5 bg-forest/5 p-1 rounded-lg">
                  {[
                    { id: 'mobile', label: '📱 Mobile' },
                    { id: 'tablet', label: '📟 Tablet' },
                    { id: 'desktop', label: '💻 Desktop' },
                  ].map(dev => (
                    <button
                      key={dev.id}
                      onClick={() => setPreviewDevice(dev.id)}
                      className={`px-3 py-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        previewDevice === dev.id 
                          ? 'bg-paper text-forest shadow-xs' 
                          : 'text-ink/65 hover:text-forest'
                      }`}
                    >
                      {dev.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simulator Frame */}
              <div className="flex-1 w-full flex items-center justify-center">
                <div className={`bg-paper border border-forest/15 rounded-3xl shadow-xl overflow-y-auto transition-all duration-300 flex flex-col justify-between ${
                  previewDevice === 'mobile' ? 'w-64 h-[420px] rounded-3xl' :
                  previewDevice === 'tablet' ? 'w-[400px] h-[340px] rounded-2xl' :
                  'w-[460px] h-[280px] rounded-xl'
                }`} style={{
                  fontFamily: brandingForm.fontFamily === 'serif' ? 'Georgia, Cambria, serif' : 
                              brandingForm.fontFamily === 'display' ? 'sans-serif' : 'system-ui, sans-serif'
                }}>
                  {/* Virtual Welcome Page */}
                  <div className="flex-1 flex flex-col">
                    {/* Visual Cover Banner */}
                    <div className="relative h-24 bg-forest/10 overflow-hidden flex-shrink-0">
                      {brandingForm.coverImage ? (
                        <img src={brandingForm.coverImage} className="w-full h-full object-cover" alt="Cover preview" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-forest/30 to-sky/20 flex items-center justify-center text-[10px] text-forest/40 uppercase font-mono">
                          Default Backdrop
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/20 to-transparent"></div>
                    </div>

                    {/* Logo/Host info */}
                    <div className="px-4 py-3 flex items-center gap-2">
                      {brandingForm.logo ? (
                        <img src={brandingForm.logo} className="w-7 h-7 rounded-full object-contain border border-forest/5" alt="Logo preview" />
                      ) : (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-paper font-mono" style={{ backgroundColor: brandingForm.accentColor }}>
                          {(brandingForm.organizerName || activeBrandingEvent.name).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="text-left">
                        <span className="block text-[7px] text-ink/40 uppercase tracking-widest font-mono">Hosted by</span>
                        <span className="text-[10px] font-bold text-forest truncate block max-w-[120px]">{brandingForm.organizerName || activeBrandingEvent.organizerName || 'Guest Organizer'}</span>
                      </div>
                    </div>

                    {/* Title & Body */}
                    <div className="px-4 py-2 text-left flex-1">
                      <h4 className="font-extrabold text-sm text-forest" style={{ color: brandingForm.accentColor }}>
                        {brandingForm.welcomeTitle || 'Hello & Welcome!'}
                      </h4>
                      <p className="text-[9px] leading-relaxed text-ink/75 mt-1">
                        {brandingForm.welcomeMessage || `We're thrilled to have you here! Help us preserve every beautiful moment.`}
                      </p>

                      {/* Mock Social Links */}
                      {(brandingForm.organizerWebsite || brandingForm.organizerInstagram) && (
                        <div className="flex gap-2 mt-2">
                          {brandingForm.organizerWebsite && <span className="text-[8px] text-sky font-semibold underline">🌐 Website</span>}
                          {brandingForm.organizerInstagram && <span className="text-[8px] text-sky font-semibold underline">📸 Instagram</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA Dock */}
                  <div className="p-3 border-t border-forest/5 flex flex-col gap-1.5 bg-mist/30">
                    <button
                      type="button"
                      className="w-full text-paper font-semibold text-[10px] py-2 rounded-lg text-center cursor-default"
                      style={{ backgroundColor: brandingForm.accentColor }}
                    >
                      {brandingForm.customButtonText || 'Upload Photos'}
                    </button>
                    <button
                      type="button"
                      className="w-full border border-forest/10 text-forest font-semibold text-[8px] py-1.5 rounded-lg text-center cursor-default bg-paper"
                      style={{ color: brandingForm.accentColor, borderColor: `${brandingForm.accentColor}25` }}
                    >
                      Browse Gallery
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom Pro features indicator */}
              <div className="w-full pt-4 text-[9px] text-ink/50 uppercase tracking-widest font-mono mt-4">
                💡 Change controls on the left to see instant preview updates.
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default CreateEventPage;
