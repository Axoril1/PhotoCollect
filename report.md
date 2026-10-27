# PhotoCollect: SaaS Product Audit & Technical Report (Version 1.1)

This report provides a reverse-engineering, product audit, code quality assessment, and stabilization roadmap for **PhotoCollect**.

---

## 1. Executive Summary

PhotoCollect is a private event photo collection platform built to solve guest upload friction through a zero-app, QR-code-driven browser upload flow.
*   **Visual Polish:** The landing page utilizes premium typography, layout tokens, and GSAP scroll animations.
*   **Current State:** The product is a high-fidelity visual prototype. It is not ready for production because of critical backend crash bugs (e.g., zip exports), wide-open CORS policies, static file exposures, and a local disk storage architecture that prevents scaling.
*   **Strategic Objective:** Stabilize the core loop, secure guest uploads, migrate storage to the cloud, and establish billing logic for launch without expanding scope or adding unnecessary features.

---

## 2. Architecture Review

The application uses a standard **MERN (MongoDB, Express, React, Node.js)** pattern.

*   **Frontend Routing:** Managed in `App.jsx` via `react-router-dom` with routes for event creation (`/`) and guest galleries (`/event/:slug`).
*   **Monolithic Controller Logic:** Express controllers handle database queries, local folder generation, image sizing, and raw compression streaming. The lack of a service layer makes unit testing difficult.
*   **Scale Risk:** Session rate limits are stored in local server memory. Uploaded files are written directly to the server's local disk, which prevents horizontal cluster scaling and creates data loss risks.

---

## 3. Product Review

Evaluation of the user experience across primary personas and product surfaces (rated 1–10):

### 3.1 Persona Perspectives
*   **Wedding Agency (6/10):** Appreciates the premium look, but needs branding customization and reliable high-res ZIP downloads.
*   **Photographer (4/10):** The platform lacks portfolio proofing features and original-quality RAW file deliveries, and is vulnerable to image scraping.
*   **Event Planner (7/10):** Appreciates the fast event generation and QR sharing features, but requires multi-user dashboard controls.
*   **Guest Uploader (8/10):** The app-free browser upload flow provides a clean, low-friction mobile experience.
*   **Organizer (7/10):** Simple dashboard controls make tracking event progress easy.

### 3.2 Product Surface Scores

| Category | Score | Description |
| :--- | :---: | :--- |
| **Ease of Use** | **8 / 10** | Very low friction for guests scanning the QR code to upload photos. |
| **Speed** | **7 / 10** | Fast loading in local environments, but the 5-second polling interval adds latency. |
| **Trust** | **5 / 10** | Lacks clear privacy policies, HTTPS enforcement hints, or secure gallery guarantees. |
| **Professionalism** | **8 / 10** | Modern design, typography, and scroll reveal animations. |
| **Mobile Experience** | **5 / 10** | Desktop links disappear on mobile layouts without a mobile navigation menu. |
| **Accessibility** | **3 / 10** | Overlays and viewer modals lack keyboard focus traps, ARIA roles, or Escape key listeners. |
| **Conversion** | **7 / 10** | Clear calls-to-action on the landing page, but lacks structured pricing models. |
| **Landing Page** | **9 / 10** | Visually polished layouts, font systems, and marquee displays. |
| **Dashboard** | **7 / 10** | Simple, clear event tracking cards, though loading times degrade as event counts grow. |
| **Gallery** | **8 / 10** | Clean, fast image loading grid. |
| **Sharing** | **6 / 10** | Copy link and sharing buttons are prone to parameter resolution errors. |
| **Downloads** | **2 / 10** | ZIP exports crash the server, and browser pop-up blockers trigger during bulk downloads. |

---

## 4. UX Review

Reviewing visitor, registry, and organizer paths reveals several friction points:
*   **Mobile Layout Navigation:** Main header links (`Workflow`, `Features`, `Story`, `Start`) disappear on screens narrower than 920px without a hamburger menu or alternate nav drawer.
*   **Modal Focus Management:** The QR sharing modal and photo viewer overlays do not capture focus or listen for keyboard exit calls (`Escape`), violating standard accessibility guidelines.
*   **Bulk Image Downloads:** Selecting multiple gallery items triggers separate serial download requests with a hardcoded `400ms` delay. This triggers browser pop-up blockers, frustrating users.
*   **Testimonial Slider:** The review slider on the landing page requires manual button clicks and lacks auto-rotation.
*   **Empty and Loading States:** The loading skeletons display blank blocks without transitions because the CSS shimmer keyframes were left undefined in the styles.

---

## 5. Technical Review (Code Quality & Technical Debt)

An audit of the codebase reveals several areas of technical debt:

*   **Dead Code:** 
    *   `client/src/App.css` contains unused scaffolding code from the default Vite template.
    *   `CreateEventPage.jsx` defines a `handleShare` logic block (lines 286-304) that is never called.
*   **Duplicate Logic:** 
    *   Color variables are defined twice—once within the Tailwind `@theme` configuration and again under the standard CSS `:root` selector.
    *   `EventGalleryPage.jsx` re-declares API base URL resolution logic rather than using the configured axios wrapper.
*   **Monolithic Page Components:** Both `CreateEventPage.jsx` (859 lines) and `EventGalleryPage.jsx` (554 lines) manage state, layouts, database CRUD calls, and animation wrappers within a single file.
*   **Code Smells:** 
    *   Synchronous filesystem calls (`fs.existsSync`, `fs.unlinkSync`) block Node's single-threaded event loop.
    *   Inline validation logic is used throughout rather than centralized schema middleware.
*   **Potential Bugs:** 
    *   Importing `ZipArchive` from `archiver` incorrectly causes server crashes on ZIP downloads.
    *   React click events pass the browser synthetic event to share functions instead of event metadata, resulting in invalid sharing URLs.

---

## 6. Security Review

*   **Open CORS Policies (`index.js` L22):** The server allows requests from any origin by default. This must be restricted to the frontend client URL in production.
*   **Unsecured Static Media Routes (`index.js` L26):** Serving `/uploads` statically allows public access to raw images. Anyone who guesses or scrapes a nanoid filename can view photos, bypassing the guest password lock.
*   **Plaintext Password Transit:** Guest passwords are sent in custom headers (`x-event-password`) during gallery requests. Without enforced HTTPS routing, these headers are vulnerable to interception.
*   **Unverified File Upload Pipelines:** The backend checks image formats using only the client-supplied HTTP `Content-Type` header, which can be easily spoofed.
*   **Hardcoded Development Secrets:** The server uses a static fallback secret (`"photocollect-dev-secret-change-me"`) for JWT signing, creating a security risk if the environment is misconfigured.

---

## 7. Performance Review

*   **N+1 Query Overhead:** The dashboard controller (`getMyEvents`) executes database count queries and generates QR code data URLs sequentially for each event card in a loop.
*   **Excessive Compression Overhead:** ZIP exports are configured with maximum compression (`level: 9`). Compressing JPEGs at this level is CPU-intensive and unnecessary since JPEGs are already compressed.
*   **High-Volume Database Polling:** Guest galleries poll the backend database every 5 seconds to load new images. Under heavy traffic, this will create resource bottlenecks.
*   **No Media Caching:** Static image files are served directly from the application server, consuming bandwidth that should be managed by a CDN.

---

## 8. Production Readiness Score

We rate launch readiness across the following criteria:

*   **HTTPS Enforcement:** **4 / 10** (No dedicated SSL certificate setup, but TLS routing is delegated to Render proxy; security headers are active via Helmet).
*   **Storage Architecture:** **5 / 10** (Supports cloud storage provider configurations like Cloudflare R2 / AWS S3, though local disk fallback is present).
*   **Logging & Monitoring:** **4 / 10** (Basic console logging; has active API health status endpoint `/api/health`).
*   **Secrets Management:** **7 / 10** (Utilizes standard `.env` validation loops; secure session keys are loaded dynamically).
*   **CORS & Routing:** **9 / 10** (CORS is locked down to `CLIENT_URL`; client contains self-healing path prefix resolution; routing and rate limits are fully functional).
*   **Performance & Caching:** **4 / 10** (Polling duration remains at 5 seconds; no CDNs or Redis caches configured yet).

$$\textbf{Launch Readiness Score: } \mathbf{5.5 / 10}$$

*Verdict: Partially ready. Critical stability bugs (routing mismatches, ZIP export crashes, CORS vulnerability) have been resolved. Next focus should be full S3/R2 migration and database query caching.*

---

## 9. Competitive Position

A comparison of PhotoCollect against leading QR photo platforms:

*   **Current Strengths:**
    *   Premium, polished landing page visual design.
    *   A simple, app-free guest upload path.
    *   An organic growth engine driven by guest interactions.
*   **Weaknesses:**
    *   Local disk storage dependencies prevent horizontal scaling.
    *   ZIP download routes are unstable and prone to crashing.
    *   Static asset directories are publicly exposed.
*   **Missing Opportunities:**
    *   Offline photo queueing for venues with poor Wi-Fi connectivity.
    *   A single, unified gallery view for both guest uploads and photographer assets.
*   **Competitive Advantages:**
    *   Clean, modern UX design that stands out against competitors.
    *   A straightforward B2C/B2B pricing model.

---

## 10. Prioritized Improvement Roadmap

Recommendations are prioritized to focus on stability and security, avoiding feature creep:

### P0: Must Fix Before Launch (Critical Security & Stability)
1.  **Fix ZIP Export Crash:** Correct `archiver` imports and lower compression to level 5 to prevent server crashes.
2.  **Lock Down CORS:** Restrict CORS access requests to the configured client domain.
3.  **Generate Secure Fallback Secrets:** Replace static JWT dev keys with dynamically generated in-memory keys.
4.  **Resolve Share Link Parameter Bugs:** Ensure the correct event metadata is passed to sharing utilities.
5.  **Define CSS Keyframe Animations:** Add missing shimmer animation rules to support skeleton loaders.
6.  **Add Responsive Mobile Navigation:** Implement a mobile menu drawer toggle.

### P1: High Priority (Storage & Monetization)
1.  **AWS S3 / Cloudflare R2 Migration:** Refactor the storage layer to stream uploads directly to the cloud.
2.  **Stripe Billing Integration:** Implement Stripe Checkout flows for one-off Event Passes and Pro subscriptions.
3.  **Validate Payloads (Zod):** Integrate input validation schemas to secure Express route parameters.
4.  **Secure Static Directory Routes:** Verify gallery permissions before serving image files.

### P2: Should Improve (UX & Code Refactoring)
1.  **Decompose Frontend Monoliths:** Split `CreateEventPage.jsx` into smaller, focused components.
2.  **Implement Modal Focus Controls:** Add focus trapping and `Escape` key close listeners to overlays.
3.  **Optimize N+1 Queries:** Replace loop queries with MongoDB aggregation pipelines.
4.  **Replace Polling with Sockets:** Transition client-side polling to WebSockets (Socket.io) or Server-Sent Events (SSE).

### P3: Future Ideas (Post-Launch Optimization)
1.  **Redis Caching:** Cache public event metadata to reduce database load.
2.  **Offline Upload Queues:** Queue guest uploads locally when venue connectivity is lost, auto-retrying once online.

---

## 11. Recommended Sprint Plan

```
SPRINT 1: Cloud Storage (W1-W2)  ──>  SPRINT 2: Billing & Validation (W3-W4)
     • Multer S3 / R2 migration            • Stripe checkout integration
     • Asynchronous file utilities         • Zod input validation middleware

SPRINT 3: Refactoring & A11y (W5-W6)  ──> SPRINT 4: WebSockets & Optimization (W7-W8)
     • Split giant page files              • Socket.io event triggers
     • Modal accessibility fixes           • MongoDB aggregation queries
```

---

## 12. Files that should NOT be modified

*   `client/src/index.css` (Except media overrides): The design tokens, CSS custom properties, and fluid typography grid are highly polished and should be preserved.
*   `client/src/App.jsx` & `client/src/main.jsx`: These files contain clean router mappings that do not need to be changed.

---

## 13. Files that should be refactored first

1.  `client/src/pages/CreateEventPage.jsx`: The 850-line monolithic file should be decomposed into smaller components (`Hero`, `Auth`, `Dashboard`, `ShareModal`).
2.  `server/controllers/eventController.js`: The `getMyEvents` route should be optimized to resolve N+1 queries using MongoDB aggregations.
3.  `server/controllers/photoController.js`: Replace all synchronous disk system calls with asynchronous promises.

---

## 14. Quick Wins (High Impact, Low Effort)

*   **Correct Archiver Imports:** Fix the named `ZipArchive` import in `photoController.js` to resolve download crashes.
*   **Define CSS Shimmer Keyframes:** Add missing shimmer rules to `index.css` to fix skeleton loading animations.
*   **Dynamic JWT secrets:** Implement crypto random secret fallbacks in `auth.js` to secure development builds.
*   **Secure CORS Headers:** Apply environment CORS policies in `index.js`.
*   **Resolve Share Button Parameters:** Pass the correct event data to sharing handlers in `CreateEventPage.jsx`.

---

## 15. Big Risks Before Launch

1.  **Local Storage Disk Exhaustion:** If files are kept on local storage, a high-volume event can saturate disk space and crash the application.
2.  **Photo Scrapers (Privacy Leaks):** Serving the `/uploads` directory statically allows unauthorized users to download private event photos if they scrape the filenames.
3.  **Concurrency Bottlenecks:** Simultaneous photo uploads from hundreds of guests can block Node's single-threaded event loop due to synchronous image resizing.
