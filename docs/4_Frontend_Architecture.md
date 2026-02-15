# Frontend Architecture

> React 18 + Vite 5.1 — All routes, page components, shared components, state management, and visual effects.

```mermaid
flowchart TB
    subgraph ENTRY["📦 Entry Point"]
        MAIN["main.jsx<br/>ReactDOM.createRoot()<br/>imports: App.jsx, index.css"]
        APP["App.jsx<br/>BrowserRouter<br/>AuthProvider wrapper<br/>Suspense + lazy loading"]
    end

    MAIN --> APP

    subgraph ROUTING["🗺️ React Router v6 — Route Map"]
        direction TB

        subgraph PUBLIC_NOGUARD["🌍 Fully Public — No Guard"]
            R_FB["/b/:businessId<br/>→ Feedback.jsx<br/>QR landing page<br/>⭐ Star rating + message"]
            R_TY["/thank-you<br/>→ ThankYou.jsx<br/>Post-submission page<br/>Google review redirect"]
            R_CB["/auth/callback<br/>→ AuthCallback.jsx<br/>Supabase magic link handler"]
        end

        subgraph PUBLIC_GUARD["🔓 PublicRoute Guard<br/>Redirects to /dashboard if already logged in"]
            R_LOGIN["/login<br/>→ Login.jsx<br/>Email/password + Magic Link"]
            R_SIGNUP["/signup<br/>→ Signup.jsx<br/>OTP verification + Registration"]
            R_FORGOT["/forgot-password<br/>→ ForgotPassword.jsx<br/>Send password reset email"]
            R_RESET["/reset-password<br/>→ ResetPassword.jsx<br/>Token-based password change"]
        end

        subgraph PROTECTED["🔒 ProtectedRoute Guard<br/>Redirects to /login if no JWT in sessionStorage"]
            R_WELCOME["/welcome<br/>→ Welcome.jsx<br/>Post-login animated screen"]
            R_DASH["/dashboard<br/>→ Dashboard.jsx<br/>Stats · Feedbacks · Reply · Pin"]
            R_QR["/qr-code, /qr<br/>→ QRCode.jsx<br/>Generate · Customize · Download"]
            R_SET["/settings<br/>→ Settings.jsx<br/>Business · Profile · Platforms"]
            R_PRC["/pricing<br/>→ Pricing.jsx<br/>Plan display · Usage"]
            R_ANL["/analytics<br/>→ Analytics.jsx<br/>Charts · Date filter · Export"]
        end
    end

    APP --> ROUTING

    subgraph LAYOUT_WRAP["🏗️ Layout.jsx — App Shell<br/>Wraps all protected pages"]
        direction LR
        SIDEBAR["📋 Sidebar<br/>━━━━━━━━━━━<br/>📊 Dashboard<br/>📱 QR Code<br/>📈 Analytics<br/>⚙️ Settings<br/>💳 Pricing<br/>🚪 Logout"]
        TOPBAR["🔝 Top Bar<br/>Business name<br/>Profile dropdown<br/>Notifications"]
        CONTENT["📄 Main Content<br/>Renders page component"]
    end

    R_DASH --> LAYOUT_WRAP
    R_QR --> LAYOUT_WRAP
    R_ANL --> LAYOUT_WRAP
    R_SET --> LAYOUT_WRAP
    R_PRC --> LAYOUT_WRAP

    subgraph STATE["🔑 State Management"]
        direction TB
        AUTH_CTX["context/AuthContext.jsx<br/>━━━━━━━━━━━━━━━━━━━━<br/>State: user, loading<br/>━━━━━━━━━━━━━━━━━━━━<br/>login(email, password)<br/>signup(data)<br/>logout()<br/>magicLinkAuth(userData)<br/>sendMagicLink(email)<br/>getToken()<br/>getApiUrl()<br/>updateUser(data)"]
        USE_AUTH["hooks/useAuth.js<br/>useContext(AuthContext)<br/>Quick access hook"]
        API_URL["config/api.js<br/>VITE_API_URL or ''<br/>(empty ⇒ Vite proxy /api)"]
        SUPA_CL["config/supabase.js<br/>createClient(url, anonKey)<br/>Used for: signInWithOtp"]
    end

    AUTH_CTX --> USE_AUTH
    AUTH_CTX --> API_URL
    AUTH_CTX --> SUPA_CL

    subgraph COMPONENTS["🧩 Shared Components"]
        direction TB

        subgraph UI_COMP["UI Components"]
            C_STAR["StarRating.jsx<br/>Interactive 1-5 star widget<br/>Used by: Feedback.jsx"]
            C_GOOEY["GooeyNav.jsx<br/>Animated navigation bar<br/>Used by: Layout.jsx"]
            C_PROFILE["ProfileCard.jsx<br/>Animated profile display<br/>Used by: Settings.jsx"]
        end

        subgraph VFX_COMP["Visual Effects (Animations)"]
            C_THREADS["Threads.jsx<br/>Background threads animation<br/>Used by: Login, Signup,<br/>ForgotPassword, Welcome"]
            C_LANYARD["Lanyard.jsx<br/>3D badge animation<br/>Used by: Welcome.jsx"]
            C_METEOR["MeteorShower.jsx<br/>Falling meteors effect<br/>Used by: Layout.jsx"]
            C_FLY["FlyingButterfly.jsx<br/>Floating butterfly<br/>Used by: Layout.jsx"]
            C_CRACK["CrackEffect.jsx<br/>Crack animation<br/>Used by: Layout.jsx"]
            C_NEURAL["NeuralBackground.jsx<br/>Neural network bg<br/>Used by: various"]
            C_PLASMA["Plasma.jsx<br/>Plasma effect<br/>Used by: various"]
            C_LIGHT["LightRays.jsx<br/>Light ray effect<br/>Used by: various"]
            C_WAVE["FluidWave.jsx<br/>Wave animation<br/>Used by: various"]
            C_ELEC["ElectricBorder.jsx<br/>Border effect<br/>Used by: various"]
            C_ANIM["AnimatedBackground.jsx<br/>Generic bg animation"]
            C_ANTI["Antigravity.jsx<br/>Antigravity effect"]
        end
    end

    subgraph DEPS["📦 Key Dependencies"]
        direction LR
        D1["react 18 + react-dom"]
        D2["react-router-dom v6"]
        D3["recharts<br/>Line · Bar · Pie · Area"]
        D4["@supabase/supabase-js<br/>Magic link auth"]
        D5["qr-code-styling<br/>QR generation"]
        D6["react-datepicker<br/>Date range filter"]
        D7["@react-three/fiber<br/>3D animations"]
        D8["tailwindcss 3.4<br/>Utility-first CSS"]
    end
```

---

## Route Access Table

| Path | Page Component | Access Level | Lazy Loaded | Layout |
|------|---------------|-------------|-------------|--------|
| `/` | → Redirect to `/login` | Public | — | No |
| `/b/:businessId` | `Feedback.jsx` | **Public (no auth)** | Yes | No |
| `/thank-you` | `ThankYou.jsx` | **Public (no auth)** | No | No |
| `/auth/callback` | `AuthCallback.jsx` | **Public (no auth)** | No | No |
| `/login` | `Login.jsx` | PublicRoute | No | No |
| `/signup` | `Signup.jsx` | PublicRoute | No | No |
| `/forgot-password` | `ForgotPassword.jsx` | PublicRoute | No | No |
| `/reset-password` | `ResetPassword.jsx` | PublicRoute | No | No |
| `/welcome` | `Welcome.jsx` | **ProtectedRoute** | Yes | No |
| `/dashboard` | `Dashboard.jsx` | **ProtectedRoute** | Yes | **Yes** |
| `/qr-code` | `QRCode.jsx` | **ProtectedRoute** | Yes | **Yes** |
| `/qr` | `QRCode.jsx` | **ProtectedRoute** | Yes | **Yes** |
| `/settings` | `Settings.jsx` | **ProtectedRoute** | Yes | **Yes** |
| `/pricing` | `Pricing.jsx` | **ProtectedRoute** | Yes | **Yes** |
| `/analytics` | `Analytics.jsx` | **ProtectedRoute** | Yes | **Yes** |
| `*` | → Redirect to `/login` | — | — | No |

---

## Page Details

| Page | Lines | Key Dependencies | Features |
|------|-------|-----------------|----------|
| **Dashboard** | ~1369 | `useAuth`, `Layout`, `API_URL` | Stats cards (total, avg, positive%, negative%), feedback list with search + filter, reply to customer, pin/unpin, delete, sort by date/rating |
| **Analytics** | ~472 | `useAuth`, `Layout`, `recharts`, `react-datepicker` | Line chart (trend), bar chart (daily), pie chart (sentiment split), area chart (rating distribution), date range filter, CSV export |
| **Feedback** | ~276 | `useParams`, `StarRating`, `API_URL` | Public form: business info display, 1-5 star rating, message textarea (5000 char limit), optional email, submit with loading state |
| **ThankYou** | ~55 | `useLocation`, `Link` | Conditional: positive → Google review link, negative → empathy message |
| **QRCode** | ~555 | `Layout`, `useAuth`, `qr-code-styling` | 4 QR styles (classic, rounded, dots, elegant), color customization, logo embed, download PNG/SVG, copy link |
| **Settings** | ~1042 | `useAuth`, `Layout`, `API_URL` | Business name/category/logo edit, profile photo upload, external platform links, password change, danger zone |
| **Pricing** | ~288 | `Layout`, `useAuth`, `API_URL` | Free vs Premium plan comparison, current usage stats, upgrade CTA |
| **Welcome** | ~137 | `useAuth`, `Threads`, `Lanyard` | Animated welcome screen with 3D badge, auto-redirect to dashboard |
| **AuthCallback** | ~86 | `supabase`, `useAuth` | Extracts session from URL hash, calls magicLinkAuth(), handles new vs existing user |
| **Login** | ~301 | `Threads`, `API_URL`, `useAuth` | Email/password form, "Send Magic Link" button, forgot password link |
| **Signup** | ~920 | `Threads`, `API_URL`, `useAuth` | 3-step: email → OTP verify → registration form (name, business name, category, password) |
| **ForgotPassword** | ~272 | `Threads`, `API_URL` | Email input → send reset link, success message |
| **ResetPassword** | ~357 | `Threads`, `API_URL` | Token validation → new password form → success redirect |

---

## Component Usage Map

```
App.jsx
├── AuthProvider (context/AuthContext.jsx)
│   ├── uses config/api.js
│   └── uses config/supabase.js
│
├── PublicRoute
│   ├── Login.jsx ──── uses Threads.jsx
│   ├── Signup.jsx ──── uses Threads.jsx
│   ├── ForgotPassword.jsx ──── uses Threads.jsx
│   └── ResetPassword.jsx ──── uses Threads.jsx
│
├── Public (no guard)
│   ├── Feedback.jsx ──── uses StarRating.jsx
│   ├── ThankYou.jsx
│   └── AuthCallback.jsx ──── uses supabase.js
│
└── ProtectedRoute
    ├── Welcome.jsx ──── uses Threads.jsx, Lanyard.jsx
    │
    └── Layout.jsx ──── uses MeteorShower, FlyingButterfly, CrackEffect
        ├── Dashboard.jsx
        ├── Analytics.jsx ──── uses recharts
        ├── QRCode.jsx ──── uses qr-code-styling
        ├── Settings.jsx ──── uses ProfileCard.jsx
        └── Pricing.jsx
```

---

## Build & Dev Configuration

| File | Purpose |
|------|---------|
| `vite.config.js` | Dev server port 8000, proxy `/api` → `localhost:8081` |
| `tailwind.config.js` | Content paths, custom theme |
| `postcss.config.js` | Tailwind + autoprefixer plugins |
| `index.html` | SPA entry, mounts `#root` |
| `vercel.json` | Production rewrites (SPA routing) |
| `package.json` | Dependencies, build scripts |
