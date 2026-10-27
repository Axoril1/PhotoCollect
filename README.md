# PhotoCollect Reverse-Engineering Report

## Executive Summary

PhotoCollect is a focused event photo collection SaaS built around a simple loop: an organizer creates a private event, shares a QR code or link, guests upload photos without needing an account, and the organizer exports the gallery later.

The product is coherent, polished, and intentionally narrow. It is not a general SaaS platform. The codebase shows a strong MVP for event memory capture with organizer auth, guest access control, upload handling, thumbnails, gallery polling, and ZIP exports. The biggest missing areas are billing, analytics, team/workspace features, notifications, search, and deeper production hardening.

## Product Overview

| Dimension | Inference |
|---|---|
| Product category | Private event photo collection SaaS |
| Core user | Event organizer |
| Secondary user | Guest uploader |
| Primary value | Collect guest photos without app installs or accounts |
| Business model | Freemium / tiered SaaS scaffolded, not fully monetized |
| Architecture | React/Vite frontend, Express/Mongoose backend, local file uploads |

Relevant code anchors:

- [client/src/App.jsx](client/src/App.jsx)
- [client/src/pages/CreateEventPage.jsx](client/src/pages/CreateEventPage.jsx)
- [client/src/pages/EventGalleryPage.jsx](client/src/pages/EventGalleryPage.jsx)
- [server/index.js](server/index.js)

## Feature Inventory

| Feature | Purpose | Notes |
|---|---|---|
| Organizer registration/login | Creates authenticated owner accounts | JWT auth with bcrypt hashing |
| Landing page marketing | Explains the product and converts visitors | Strong premium visual treatment |
| Event creation | Creates a private upload collection | Generates QR and public event URL |
| Guest password gate | Restricts event access | Password is hashed on the server |
| QR / link sharing | Distributes event entry point | Browser share, WhatsApp, email, clipboard |
| Organizer console | Manages created events | List, QR, close action, share options |
| Guest upload flow | Lets guests submit photos | No account required |
| Live gallery polling | Refreshes new uploads | Polls every 5 seconds |
| Photo viewer modal | Opens full-size media | Client-side overlay |
| Download all photos | Exports originals as ZIP | Server-side archive stream |
| Select and download | Exports chosen photos | Client-side selection flow |
| Close event | Stops new uploads | Owner-only action |
| Expiry window | Limits event lifespan | Prevents stale access |

## User Flows

### Organizer flow

1. Visitor lands on the homepage.
2. Organizer registers or logs in.
3. Organizer creates an event.
4. The app generates a share URL and QR code.
5. Organizer shares the event with guests.
6. Organizer watches the gallery populate.
7. Organizer exports or closes the event.

### Guest flow

1. Guest opens the event URL or scans the QR code.
2. If needed, guest enters the event password.
3. Guest uploads one or more photos.
4. Guest browses the live gallery.
5. Guest downloads selected images if needed.

## Screen Map

| Surface | Purpose | Notes |
|---|---|---|
| Landing / auth page | Marketing + onboarding | Hero section, testimonials, auth panel, feature narrative |
| Organizer console | Event management | Create event, share QR, close event, view event list |
| Guest password gate | Access control | Shown when the event is protected |
| Guest gallery | Photo browsing and upload | Polling-based live gallery |
| Photo viewer modal | Full-size inspection | Image detail and download actions |
| QR share modal | Sharing | Copy link, WhatsApp, email, QR image |

## Backend Architecture

The backend is a classic Express API with Mongoose models and file-based storage.

| Layer | Stack |
|---|---|
| Web server | Express 5 |
| Database | MongoDB Atlas with Mongoose |
| Authentication | JWT bearer tokens |
| Upload handling | Multer disk storage |
| Image processing | Sharp |
| QR generation | qrcode |
| ZIP export | Archiver |
| Rate limiting | express-rate-limit |
| Storage | Local filesystem under server/uploads |

The API is split into auth, event, and photo routes. Static uploads are served directly by the server.

## Data Model

| Collection | Key fields | Notes |
|---|---|---|
| User | name, email, passwordHash, plan, role | Organizer identity and plan scaffold |
| Event | name, slug, ownerId, password, expiresAt, isClosed, uploadLimit | Owns the gallery and access rules |
| Photo | eventId, filename, originalName, originalUrl, thumbnailUrl | Media metadata and links |

The schema hints at plan-based monetization, but no real billing infrastructure is implemented.

## API Surface

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/auth/register | Create organizer account |
| POST | /api/auth/login | Login and receive JWT |
| GET | /api/auth/me | Restore current session |
| POST | /api/events | Create event |
| GET | /api/events/mine/list | List organizer events |
| GET | /api/events/:slug | Fetch public event metadata |
| POST | /api/events/:slug/verify-password | Validate guest password |
| PATCH | /api/events/:slug/close | Close event |
| POST | /api/photos/:slug | Upload photos |
| GET | /api/photos/:slug | List gallery photos |
| DELETE | /api/photos/:id | Delete photo |
| GET | /api/photos/:slug/download | Download all photos as ZIP |
| POST | /api/photos/:slug/download-selected | Download selected photos as ZIP |
| GET | /api/health | Health check |

## Authentication and Authorization

- JWT bearer tokens are used for organizer sessions.
- Passwords are hashed with bcrypt.
- Event passwords are hashed and validated separately from organizer auth.
- Event ownership is enforced by ownerId.
- Guests can access open events without an account.
- Owner actions include closing events and deleting photos.

## UX and UI Analysis

The UI is stronger than the backend would suggest. The landing page feels polished and branded, with an editorial tone and premium visual system. The gallery and organizer console are simple enough to be learnable without onboarding.

The main UX gaps are structural:

- Modal behavior needs stronger keyboard/focus handling.
- Gallery items should be more explicit interactive controls.
- Polling is acceptable for MVP use, but not ideal for scale.
- There is no search or filter experience because the gallery is still small-scope.

## Design System

The effective design system lives in [client/src/index.css](client/src/index.css), not in the leftover Vite template stylesheet.

| Element | Inference |
|---|---|
| Typography | Cabinet Grotesk, Space Grotesk, Space Mono |
| Palette | Mist, forest, sky, amber, paper, ink |
| Layout | Wide hero, bento cards, rounded pills, glassmorphism-like surfaces |
| Motion | GSAP-driven landing and scroll motion |

## Missing or Weak Areas

| Area | Status | Why it matters |
|---|---|---|
| Billing and checkout | Missing | Monetization is only scaffolded |
| Analytics | Missing | No funnel or product insight loop |
| Team/workspace model | Missing | No scoped collaboration for venues or photographers |
| Settings page | Missing | No account or event configuration hub |
| Notifications | Missing | No upload or event status alerts |
| Search and filters | Missing | Gallery navigation will degrade as volume grows |
| Realtime updates | Weak | Polling is simple but less efficient |
| Accessibility | Needs work | Modal and keyboard interactions need hardening |
| Security hardening | Needs work | File validation and storage security are basic |

## Monetization Scaffold

The code suggests a freemium model:

- User plan values exist in the schema.
- Events snapshot the current plan.
- Free vs paid upload limits are implied.
- The landing page copy references the foundation for paid plans.

What is missing is the actual payment flow, subscription management, and entitlement enforcement.

## Technical Assessment

The product is a solid MVP with a clean, narrow core.

Strengths:

- Clear product focus.
- Good organizer/guest split.
- Strong landing page presentation.
- Practical media upload and export pipeline.

Risks:

- Local storage for tokens is vulnerable if XSS is introduced.
- Open CORS and shallow file validation reduce production readiness.
- Polling-based refresh will become inefficient at scale.
- Local file storage is likely to become a bottleneck for growth.

## Rebuild Roadmap

| Phase | Scope |
|---|---|
| Phase 1 | Recreate the current MVP faithfully |
| Phase 2 | Add billing, pricing tiers, and usage limits |
| Phase 3 | Add analytics, notifications, settings, and moderation |
| Phase 4 | Add realtime updates, object storage, accessibility, and SEO hardening |

## Conclusion

PhotoCollect is a coherent, narrowly focused event photo collection product with a good MVP and a strong visual landing page. Its core value is clear: let guests upload memories into a private event gallery with almost no friction.

The product is ready to be documented, rebuilt, or extended, but it is not yet a full SaaS platform. The next real step is monetization, analytics, and operational hardening.

Verification: the client build passed successfully with `npm run build`.