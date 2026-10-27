import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import api, { AUTH_TOKEN_KEY, AUTH_USER_KEY } from '../api/axios.js'
import { signInWithGoogle } from '../api/firebase.js'

gsap.registerPlugin(ScrollTrigger)

const galleryTiles = [
  { label: 'First dance', tone: 'tile-warm', size: 'large' },
  { label: 'Table seven', tone: 'tile-sky', size: 'small' },
  { label: 'Ceremony', tone: 'tile-forest', size: 'medium' },
  { label: 'Friends', tone: 'tile-rose', size: 'small' },
  { label: 'After party', tone: 'tile-amber', size: 'medium' },
  { label: 'Family', tone: 'tile-ink', size: 'small' },
]

const storySteps = [
  {
    kicker: '01',
    title: 'Generate the QR',
    copy: 'Define a private event, set an expiry window, and customize access in under 60 seconds.',
  },
  {
    kicker: '02',
    title: 'Guests scan & upload',
    copy: 'Attendees scan the QR code and select photos from their roll directly in their mobile browser. No app install, no signup.',
  },
  {
    kicker: '03',
    title: 'Download the archive',
    copy: 'Get one consolidated, high-res gallery and download all photos as a single compressed ZIP with one click.',
  },
]

const testimonials = [
  {
    quote: "PhotoCollect made our wedding gallery so simple. No guest had to download an app, and we got 600+ high-quality photos by morning!",
    author: "Sarah M.",
    role: "Bride, June 2026"
  },
  {
    quote: "As a professional photographer, I offer PhotoCollect as a guest candid add-on. Clients love having one centralized place for guest perspectives.",
    author: "Marcus L.",
    role: "Lead Photographer, Studio Luxe"
  },
  {
    quote: "Our historic venue now has PhotoCollect QR plaques at the entrance. It's a frictionless way for hosts to capture memory lane.",
    author: "Elena R.",
    role: "General Manager, Villa Rose Events"
  }
]

const demoSamples = [
  { url: 'https://picsum.photos/seed/wedding1/400/400', name: 'Couple Dance' },
  { url: 'https://picsum.photos/seed/wedding2/400/400', name: 'Cheering Table' },
  { url: 'https://picsum.photos/seed/wedding3/400/400', name: 'Toast Speeches' },
  { url: 'https://picsum.photos/seed/wedding4/400/400', name: 'Cake Cutting' },
  { url: 'https://picsum.photos/seed/wedding5/400/400', name: 'Sparkler Exit' }
]

const faqData = [
  {
    q: "Do guests need to install an app to upload photos?",
    a: "Absolutely not. Guests scan the QR code at your event and upload photos directly from their default mobile browser (Safari, Chrome, etc.). There are no downloads, logins, or email signups required for guests."
  },
  {
    q: "Are the photos saved in original high-resolution quality?",
    a: "Yes. Unlike messaging apps (such as WhatsApp or Telegram) which heavily compress and resize files, PhotoCollect retains the original file resolution and metadata of every photo uploaded, ready for prints."
  },
  {
    q: "What happens when an event expires?",
    a: "Once an event reaches its expiration date (or is closed by the organizer), the guest upload link is deactivated. The photos are safely stored for the duration of your plan before being securely purged."
  },
  {
    q: "Can I password-protect my event gallery?",
    a: "Yes. You can add an optional password gate to your event. Guests will be prompted to enter the password on their phones before they can view or upload to the gallery."
  },
  {
    q: "Is there a limit on how many photos can be uploaded?",
    a: "Free events include up to 50 photos. One-time Event Passes support unlimited photo uploads (up to 2,000 files), and Pro subscriptions support unlimited active events with up to 10,000 photos per event."
  }
]

export default function LandingPage({ onAuthSuccess }) {
  const [authMode, setAuthMode] = useState('register')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [error, setError] = useState('')
  
  const [activeStep, setActiveStep] = useState(0)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  // Interactive Demo Simulator States
  const [demoUploaded, setDemoUploaded] = useState([])
  const [isDemoUploading, setIsDemoUploading] = useState(false)
  const [currentDemoIdx, setCurrentDemoIdx] = useState(0)

  // FAQ state
  const [openFaq, setOpenFaq] = useState(null)

  const landingRef = useRef(null)

  // Auto-rotating Testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [])

  // GSAP Animations
  useLayoutEffect(() => {
    if (!landingRef.current) return undefined

    const ctx = gsap.context(() => {
      // Set initial states
      gsap.set('.hero-reveal', { y: 34, opacity: 0 })
      gsap.set('.photo-tile', { y: 40, opacity: 0, scale: 0.9 })
      gsap.set('.qr-ticket', { x: 30, opacity: 0, rotate: 10 })

      // Intro timeline
      gsap
        .timeline({ defaults: { ease: 'power4.out', duration: 1.1 } })
        .to('.hero-reveal', {
          y: 0,
          opacity: 1,
          stagger: 0.08,
        })
        .to(
          '.photo-tile',
          {
            y: 0,
            opacity: 1,
            scale: 1,
            stagger: 0.06,
          },
          '-=0.7',
        )
        .to(
          '.qr-ticket',
          {
            x: 0,
            opacity: 1,
            rotate: -6,
            duration: 0.9,
            ease: 'back.out(1.5)',
          },
          '-=0.8',
        )

      // Hero parallax scroll
      gsap.to('.phone-shell', {
        yPercent: -12,
        ease: 'none',
        scrollTrigger: {
          trigger: '.landing-hero',
          start: 'top top',
          end: 'bottom top',
          scrub: 0.5,
        },
      })

      // Word by word narrative reveal
      gsap.to('.reveal-word', {
        opacity: 1,
        stagger: 0.06,
        ease: 'none',
        scrollTrigger: {
          trigger: '.scroll-reveal-paragraph',
          start: 'top 82%',
          end: 'bottom 52%',
          scrub: 0.5,
        }
      })

      // General scroll reveals
      gsap.utils.toArray('.scroll-reveal').forEach((item) => {
        gsap.fromTo(
          item,
          { y: 36, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: item,
              start: 'top 82%',
              toggleActions: 'play none none none',
            },
          },
        )
      })

      // Accordion entrance staggers
      gsap.fromTo(
        '.accordion-panel',
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: '.accordion-wrapper',
            start: 'top 82%',
          }
        }
      )
    }, landingRef)

    return () => ctx.revert()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setError('')
    setLoadingAuth(true)

    try {
      const payload =
        authMode === 'register'
          ? authForm
          : { email: authForm.email, password: authForm.password }
      const res = await api.post(`/auth/${authMode}`, payload)
      onAuthSuccess(res.data.accessToken, res.data.user)
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your inputs.')
    } finally {
      setLoadingAuth(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError('')
    setLoadingAuth(true)
    try {
      const { idToken } = await signInWithGoogle()
      const res = await api.post('/auth/google', { idToken })
      onAuthSuccess(res.data.accessToken, res.data.user)
    } catch (err) {
      console.error("[GoogleAuth] Error:", err)
      if (err.response?.data) {
        console.error("[GoogleAuth] Server Response:", err.response.data)
      }
      const errMsg = err.response?.data?.error || err.message || 'Google Authentication failed.'
      if (err.code === 'auth/popup-closed-by-user' || errMsg.includes('popup-closed-by-user')) {
        setError('Google sign-in popup was closed before completion.')
      } else {
        // If there's a detailed error from the server, append it for visual assistance
        const details = err.response?.data?.details;
        setError(details ? `${errMsg} (${details})` : errMsg)
      }
    } finally {
      setLoadingAuth(false)
    }
  }

  // Interactive Upload Simulator Actions
  const handleSimulateUpload = () => {
    if (isDemoUploading) return
    setIsDemoUploading(true)

    // Simulate 900ms progress delay
    setTimeout(() => {
      const currentPhoto = demoSamples[currentDemoIdx]
      setDemoUploaded((prev) => [currentPhoto, ...prev])
      setCurrentDemoIdx((prev) => (prev + 1) % demoSamples.length)
      setIsDemoUploading(false)
    }, 900)
  }

  return (
    <div ref={landingRef} className="site-shell">
      <header className="site-nav">
        <a href="#top" className="brand-lockup" aria-label="PhotoCollect home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark">PC</span>
          <span>PhotoCollect</span>
        </a>
        <button 
          className={`nav-toggle ${menuOpen ? 'active' : ''}`} 
          onClick={() => setMenuOpen(!menuOpen)} 
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span className="hamburger-box">
            <span className="hamburger-inner"></span>
          </span>
        </button>
        <nav className={`nav-links ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          <a href="#workflow" onClick={() => setMenuOpen(false)}>Workflow</a>
          <a href="#demo" onClick={() => setMenuOpen(false)}>Live Demo</a>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a>
          <a href="#start" className="nav-action-btn" onClick={() => setMenuOpen(false)}>Start Free</a>
        </nav>
      </header>

      <main id="top">
        {/* HERO SECTION */}
        <section className="landing-hero">
          <div className="hero-copy">
            <p className="eyebrow hero-reveal">App-Free Guest Galleries</p>
            <h1 className="hero-title hero-reveal">Collect every guest photo. No app downloads required.</h1>
            <p className="hero-subtitle hero-reveal">
              Let your guests upload their candid wedding and event photos in original quality directly from their mobile browsers. Just scan, upload, and download the gallery.
            </p>
            <div className="hero-actions hero-reveal">
              <a href="#start" className="button-primary">Create a Free Event</a>
              <a href="#demo" className="button-secondary">Try Live Simulator</a>
            </div>
            <div className="hero-metrics hero-reveal" aria-label="Product highlights">
              <span><strong>60 sec</strong> setup</span>
              <span><strong>Private</strong> access code</span>
              <span><strong>Bulk</strong> ZIP exports</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="Animated product preview">
            <div className="phone-shell">
              <div className="phone-top">
                <span>Rina and Sami</span>
                <span>Live</span>
              </div>
              <div className="photo-grid-preview">
                {galleryTiles.map((tile) => (
                  <div key={tile.label} className={`photo-tile ${tile.tone} ${tile.size}`}>
                    <span>{tile.label}</span>
                  </div>
                ))}
              </div>
              <div className="upload-bar">
                <span>Guest upload link</span>
                <strong>Ready</strong>
              </div>
            </div>
            <div className="qr-ticket">
              <div className="qr-mark" aria-hidden="true">
                {Array.from({ length: 25 }).map((_, index) => (
                  <span key={index} />
                ))}
              </div>
              <p>Scan to upload</p>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF ROW */}
        <section className="social-proof-bar scroll-reveal">
          <p className="eyebrow">Trusted by independent coordinators & planners at</p>
          <div className="social-logo-row">
            <span>Marriott Events</span>
            <span>Villa Rose Planners</span>
            <span>Luxe Weddings Co.</span>
            <span>Gala Collective</span>
            <span>Studio Seven</span>
          </div>
        </section>

        {/* SCRUBBING TEXT BAND */}
        <section className="section-band" id="story">
          <div className="scroll-reveal-paragraph">
            {`Memories shouldn't be scattered across group chats, lost in expired links, or trapped on guests' camera rolls. PhotoCollect gives you one private portal to gather every angle of the celebration. Direct. Private. Instant.`.split(' ').map((word, i) => (
              <span key={i} className="reveal-word">{word}</span>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="workflow" className="section-band">
          <div className="section-heading scroll-reveal">
            <p className="eyebrow">The calm workflow</p>
            <h2>From QR to complete gallery without the follow-up chase.</h2>
          </div>
          
          <div className="accordion-wrapper">
            {storySteps.map((step, index) => (
              <div
                key={step.title}
                className={`accordion-panel ${activeStep === index ? 'active' : ''}`}
                onMouseEnter={() => setActiveStep(index)}
              >
                <div className="accordion-header">
                  <span className="accordion-number">{step.kicker}</span>
                  <h3 className="accordion-title">{step.title}</h3>
                </div>
                <div className="accordion-body">
                  <p>{step.copy}</p>
                  <div className="accordion-illustration">
                    <img
                      src={`https://picsum.photos/seed/${['setup', 'share', 'download'][index]}/800/600`}
                      alt={step.title}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INTERACTIVE DEMO SIMULATOR */}
        <section id="demo" className="section-band bg-mist/30 py-20 border-y border-forest/5">
          <div className="max-w-6xl mx-auto px-4">
            <div className="section-heading text-center max-w-2xl mx-auto mb-16 scroll-reveal">
              <p className="eyebrow">Interactive Simulator</p>
              <h2>See the live upload speed for yourself</h2>
              <p className="text-forest/70 mt-3 text-sm">Click the upload trigger on the mock phone to simulate a guest submitting a picture and watch it appear in the organizer gallery instantly.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Column: Mock Guest Phone */}
              <div className="lg:col-span-5 flex justify-center scroll-reveal">
                <div className="mock-phone-shell border-2 border-forest/20 rounded-[36px] bg-paper p-4 w-full max-w-[340px] shadow-lg flex flex-col justify-between">
                  <div className="mock-phone-screen border border-forest/10 rounded-[28px] overflow-hidden flex-1 flex flex-col bg-paper relative min-h-[380px]">
                    <div className="bg-forest text-paper p-4 text-center">
                      <p className="text-xs font-mono tracking-widest uppercase">Guest Upload View</p>
                      <h4 className="font-display font-bold text-md mt-1">Submit Photos</h4>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-mist flex items-center justify-center mb-4 border border-forest/10 shadow-inner">
                        <svg className="w-8 h-8 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs text-forest/70 font-body mb-6">Simulate guest selecting photos from mobile roll.</p>
                      
                      <button 
                        onClick={handleSimulateUpload} 
                        disabled={isDemoUploading}
                        className="bg-forest text-paper font-mono text-xs px-6 py-3 rounded-full hover:bg-forest/90 transition-all font-bold active:scale-[0.98] cursor-pointer"
                      >
                        {isDemoUploading ? 'Uploading to cloud...' : 'Simulate Photo Upload'}
                      </button>
                    </div>

                    {isDemoUploading && (
                      <div className="absolute inset-0 bg-paper/80 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-[11px] font-mono text-forest">Uploading sample...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Organizer Live Gallery Grid */}
              <div className="lg:col-span-7 flex flex-col scroll-reveal">
                <div className="flex-1 border border-forest/15 rounded-2xl bg-paper p-6 shadow-sm flex flex-col min-h-[400px]">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-forest/10">
                    <div>
                      <p className="text-[10px] font-mono text-sky uppercase tracking-wider">Event Dashboard</p>
                      <h3 className="font-display font-bold text-xl text-forest mt-0.5">Wedding Live Gallery</h3>
                    </div>
                    <span className="bg-forest/10 px-3 py-1 rounded-full text-[10px] font-mono text-forest font-bold animate-pulse">Live Polling</span>
                  </div>

                  {demoUploaded.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-forest/15 rounded-xl p-8 text-center bg-mist/10">
                      <p className="text-sm font-body text-forest/60">No photos uploaded yet in this simulator.</p>
                      <p className="text-xs font-mono text-forest/40 mt-1">Click the simulated phone button on the left to begin.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] pr-2">
                      {demoUploaded.map((img, idx) => (
                        <div key={idx} className="relative rounded-lg overflow-hidden aspect-square border border-forest/10 shadow-sm animate-fade-in group">
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-forest/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[9px] font-mono text-paper">{img.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TRADITIONAL SOLUTIONS COMPARISON TABLE */}
        <section className="section-band max-w-4xl mx-auto px-4 py-24 scroll-reveal">
          <div className="section-heading text-center max-w-xl mx-auto mb-16">
            <p className="eyebrow">Frictionless Alternative</p>
            <h2>Why shared drives and messaging lists fall short</h2>
          </div>

          <div className="overflow-x-auto border border-forest/15 rounded-2xl bg-paper shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-forest/15 bg-mist/20 font-mono text-[10px] uppercase text-forest/60 tracking-wider">
                  <th className="p-4">Sharing Dimension</th>
                  <th className="p-4">PhotoCollect</th>
                  <th className="p-4">Google Drive</th>
                  <th className="p-4">iCloud Albums</th>
                  <th className="p-4">WhatsApp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-forest/10 font-body text-forest">
                <tr>
                  <td className="p-4 font-semibold">No App Installs</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                  <td className="p-4 text-forest/70">✓ Yes</td>
                  <td className="p-4 text-rose-800">✗ Apple only</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">No Guest Signups</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                  <td className="p-4 text-rose-800">✗ Requires Gmail</td>
                  <td className="p-4 text-rose-800">✗ Requires iCloud</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">Original Resolution</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                  <td className="p-4 text-rose-800">✗ Compressed</td>
                  <td className="p-4 text-rose-800">✗ Heavy Compression</td>
                </tr>
                <tr>
                  <td className="p-4 font-semibold">One-Click ZIP Download</td>
                  <td className="p-4 text-emerald-800 font-bold">✓ Yes</td>
                  <td className="p-4 text-rose-800">✗ Folder sorting needed</td>
                  <td className="p-4 text-rose-800">✗ Export manually</td>
                  <td className="p-4 text-rose-800">✗ Save file-by-file</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* FEATURES BENTO GRID */}
        <section id="features" className="feature-section">
          <div className="section-heading scroll-reveal">
            <p className="eyebrow">Product Capabilities</p>
            <h2>A premium front door, backed by ownership and access controls.</h2>
          </div>
          
          <div className="bento-grid">
            <div className="bento-card col-span-12 md:col-span-7 scroll-reveal">
              <div>
                <h3>Built for private events</h3>
                <p>Password gates, owner controls, close-upload actions, and expiring links. Keep guest uploads protected within your chosen audience.</p>
              </div>
              <div className="card-visual">
                <div className="flex gap-2">
                  <span className="bg-forest/10 px-3 py-1 rounded-full text-xs font-mono text-forest">Password protection</span>
                  <span className="bg-forest/10 px-3 py-1 rounded-full text-xs font-mono text-forest">Custom expiration</span>
                </div>
              </div>
            </div>

            <div className="bento-card col-span-12 md:col-span-5 scroll-reveal">
              <div>
                <h3>Guest-first upload flow</h3>
                <p>No guest accounts, no app install, no group chat chaos after the party. Just scan and drag/select photos directly.</p>
              </div>
            </div>

            <div className="bento-card col-span-12 md:col-span-5 scroll-reveal">
              <div>
                <h3>SaaS-ready foundation</h3>
                <p>Organizer accounts, upload limits, and ownership are already part of the flow. Expandable for venues and agencies.</p>
              </div>
            </div>

            <div className="bento-card col-span-12 md:col-span-7 scroll-reveal">
              <div>
                <h3>Real-time gallery stream</h3>
                <p>Watch uploads arrive live. Fully responsive grid makes it simple to stream or download galleries at any point.</p>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                <img src="https://picsum.photos/seed/wedding1/180/180" className="rounded-lg aspect-square object-cover" alt="Event candids" loading="lazy" />
                <img src="https://picsum.photos/seed/festival2/180/180" className="rounded-lg aspect-square object-cover" alt="Event candids" loading="lazy" />
                <img src="https://picsum.photos/seed/party3/180/180" className="rounded-lg aspect-square object-cover" alt="Event candids" loading="lazy" />
                <img src="https://picsum.photos/seed/concert4/180/180" className="rounded-lg aspect-square object-cover" alt="Event candids" loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        {/* TRANSPARENT PRICING TIERS */}
        <section id="pricing" className="section-band py-24 scroll-reveal">
          <div className="max-w-6xl mx-auto px-4">
            <div className="section-heading text-center max-w-xl mx-auto mb-16">
              <p className="eyebrow">Simple Tiers</p>
              <h2>Transparent pricing for every scale</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
              {/* Free Plan */}
              <div className="border border-forest/15 rounded-2xl bg-paper p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="font-display font-bold text-lg text-forest">Free Tier</h3>
                  <p className="text-xs text-forest/70 font-body mt-2">Test the photo collection flow with small events.</p>
                  <div className="my-6">
                    <span className="font-display font-bold text-4xl text-forest">$0</span>
                    <span className="text-xs font-mono text-forest/60"> / event</span>
                  </div>
                  <ul className="text-xs font-body text-forest/90 space-y-3 border-t border-forest/10 pt-6">
                    <li className="flex items-center gap-2">✓ Up to 50 photo uploads</li>
                    <li className="flex items-center gap-2">✓ 7-day gallery availability</li>
                    <li className="flex items-center gap-2">✓ Dynamic QR generation</li>
                    <li className="flex items-center gap-2">✓ Basic password protection</li>
                    <li className="flex items-center gap-2 text-forest/40">✗ White-label templates</li>
                  </ul>
                </div>
                <a href="#start" className="button-secondary full mt-8">Start Free</a>
              </div>

              {/* Event Pass (Recommended) */}
              <div className="border-2 border-amber rounded-2xl bg-paper p-8 flex flex-col justify-between shadow-md relative transform scale-[1.02]">
                <div className="absolute top-0 right-8 -translate-y-1/2 bg-amber text-paper font-mono text-[9px] font-bold tracking-widest px-3 py-1 rounded-full uppercase">Best for Weddings</div>
                <div>
                  <h3 className="font-display font-bold text-lg text-forest">Event Pass</h3>
                  <p className="text-xs text-forest/70 font-body mt-2">A single, comprehensive license for your big day.</p>
                  <div className="my-6">
                    <span className="font-display font-bold text-4xl text-forest">$39</span>
                    <span className="text-xs font-mono text-forest/60"> / one-time</span>
                  </div>
                  <ul className="text-xs font-body text-forest/90 space-y-3 border-t border-forest/10 pt-6">
                    <li className="flex items-center gap-2">✓ Unlimited photo uploads</li>
                    <li className="flex items-center gap-2">✓ 1-year gallery storage</li>
                    <li className="flex items-center gap-2">✓ Original high-resolution ZIP exports</li>
                    <li className="flex items-center gap-2">✓ No PhotoCollect branding</li>
                    <li className="flex items-center gap-2">✓ Priority email support</li>
                  </ul>
                </div>
                <a href="#start" className="button-primary full mt-8">Buy Event Pass</a>
              </div>

              {/* Pro Subscription */}
              <div className="border border-forest/15 rounded-2xl bg-paper p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <h3 className="font-display font-bold text-lg text-forest">Pro Plan</h3>
                  <p className="text-xs text-forest/70 font-body mt-2">For planners, venues, and professional agencies.</p>
                  <div className="my-6">
                    <span className="font-display font-bold text-4xl text-forest">$79</span>
                    <span className="text-xs font-mono text-forest/60"> / month</span>
                  </div>
                  <ul className="text-xs font-body text-forest/90 space-y-3 border-t border-forest/10 pt-6">
                    <li className="flex items-center gap-2">✓ Unlimited active events</li>
                    <li className="flex items-center gap-2">✓ Up to 10,000 photos per event</li>
                    <li className="flex items-center gap-2">✓ 100% white-label custom subdomains</li>
                    <li className="flex items-center gap-2">✓ Core download analytics</li>
                    <li className="flex items-center gap-2">✓ SLA support</li>
                  </ul>
                </div>
                <a href="#start" className="button-secondary full mt-8">Subscribe Pro</a>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL SLIDER */}
        <section className="testimonial-section">
          <div className="testimonial-container">
            <div className="testimonial-heading scroll-reveal">
              <p className="eyebrow" style={{ color: 'var(--pc-amber)' }}>Testimonials</p>
              <h2>Loved by hosts and planners alike.</h2>
            </div>
            <div className="testimonial-slider">
              <div>
                <div className="testimonial-quote text-forest font-display">
                  "{testimonials[activeTestimonial].quote}"
                </div>
                <div className="testimonial-author mt-6">
                  <div className="author-avatar w-12 h-12 rounded-full overflow-hidden border border-forest/15 shadow-sm">
                    <img src={`https://picsum.photos/seed/user-${activeTestimonial}/100/100`} alt={testimonials[activeTestimonial].author} className="w-full h-full object-cover" />
                  </div>
                  <div className="author-meta">
                    <h4 className="font-display font-bold text-sm text-forest">{testimonials[activeTestimonial].author}</h4>
                    <p className="text-xs font-body text-forest/60">{testimonials[activeTestimonial].role}</p>
                  </div>
                </div>
              </div>
              <div className="testimonial-nav">
                <button className="testimonial-btn" onClick={() => setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)} aria-label="Previous testimonial">←</button>
                <button className="testimonial-btn" onClick={() => setActiveTestimonial((prev) => (prev + 1) % testimonials.length)} aria-label="Next testimonial">→</button>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ ACCORDION SECTION */}
        <section className="section-band max-w-3xl mx-auto px-4 py-20 scroll-reveal">
          <div className="section-heading text-center max-w-xl mx-auto mb-16">
            <p className="eyebrow">Got Questions?</p>
            <h2>Frequently Asked Questions</h2>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, idx) => {
              const isOpen = openFaq === idx
              return (
                <div key={idx} className="border border-forest/15 rounded-xl bg-paper overflow-hidden transition-all shadow-sm">
                  <button 
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left font-display font-bold text-sm text-forest flex justify-between items-center hover:bg-mist/10 focus:outline-none transition-colors"
                  >
                    <span>{faq.q}</span>
                    <span className="font-mono text-sm">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 border-t border-forest/5 text-xs text-forest/80 font-body leading-relaxed animate-fade-in">
                      {faq.a}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* CONVERSION PANEL */}
        <section id="start" className="conversion-section">
          <div className="conversion-copy scroll-reveal">
            <p className="eyebrow">Start the loop</p>
            <h2>Create an organizer account and launch a private event QR.</h2>
            <p className="mt-4 leading-relaxed">
              No credit card required. Unlock your private dashboard, generate custom event cards, download high-res ZIP archives, and keep memories safe.
            </p>
            <div className="mt-8 flex flex-col gap-4 max-w-sm border-t border-forest/10 pt-6">
              <div className="flex items-center gap-3 text-xs text-forest/85">
                <span className="text-emerald-800 font-bold">✓</span> No credit card required to start
              </div>
              <div className="flex items-center gap-3 text-xs text-forest/85">
                <span className="text-emerald-800 font-bold">✓</span> Up to 50 uploads free
              </div>
              <div className="flex items-center gap-3 text-xs text-forest/85">
                <span className="text-emerald-800 font-bold">✓</span> Secure password protection options
              </div>
            </div>
          </div>

          <section className="auth-panel scroll-reveal" aria-label="Organizer account">
            <div className="auth-tabs">
              {['register', 'login'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setAuthMode(mode)
                    setError('')
                  }}
                  className={authMode === mode ? 'active' : ''}
                >
                  {mode === 'register' ? 'Create account' : 'Sign in'}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} className="auth-form">
              {authMode === 'register' && (
                <label>
                  <span>Name</span>
                  <input
                    type="text"
                    value={authForm.name}
                    onChange={(e) => setAuthForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Sarah Miller"
                    required
                  />
                </label>
              )}

              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="sarah@example.com"
                  required
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  required
                />
              </label>

              {error && <p className="form-error">{error}</p>}

              <button type="submit" disabled={loadingAuth} className="button-primary full">
                {loadingAuth ? 'Please wait...' : authMode === 'register' ? 'Create organizer account' : 'Sign in'}
              </button>

              <div className="auth-divider" style={{
                display: 'flex',
                alignItems: 'center',
                textAlign: 'center',
                margin: '16px 0',
                color: '#94a3b8',
                fontSize: '0.8rem'
              }}>
                <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }}></div>
                <span style={{ padding: '0 8px' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: '#cbd5e1' }}></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loadingAuth}
                className="button-secondary full flex items-center justify-center gap-2"
                style={{
                  background: 'transparent',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  marginTop: '12px',
                  width: '100%',
                  transition: 'background-color 0.2s'
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.99 5.99 0 0 1 7.99 12.5a5.99 5.99 0 0 1 6.002-6.012c1.377 0 2.63.508 3.587 1.348l3.1-3.1C18.825 3.01 15.65 1.5 11.992 1.5 5.92 1.5 1 6.42 1 12.5s4.92 11 10.992 11c6.73 0 11.233-4.728 11.233-11.455 0-.746-.08-1.32-.178-1.76H12.24Z" />
                </svg>
                Continue with Google
              </button>
            </form>
          </section>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-logo">PhotoCollect</div>
          <div className="footer-links">
            <a href="#workflow">Workflow</a>
            <a href="#demo">Live Demo</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
