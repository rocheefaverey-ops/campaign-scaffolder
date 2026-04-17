# Campaign Examples & Game Types

Complete examples for all supported game engines and campaign page templates.

## 📁 File Structure

```
examples/
├── campaign-pages/
│   ├── REGISTRATION_PAGE.tsx      ← Form with validation
│   ├── LEADERBOARD_PAGE.tsx       ← Global/friends tabs
│   ├── VOUCHER_PAGE.tsx           ← QR code + code display
│   ├── VIDEO_PAGE.tsx             ← Video player
│   └── TERMS_FAQ_PAGE.tsx         ← Accordion FAQ
├── unity-project/
│   ├── Assets/Scripts/
│   │   ├── LivewallManager.cs     ← Integration layer
│   │   └── GameManager.cs         ← Game logic
│   └── README.md                   ← Setup guide
└── EXAMPLES_GUIDE.md              ← This file
```

## 🎮 Game Type Examples

### 1. Unity WebGL

**Location**: `modules/unity/`

**Features**:
- WebGL build loading from CDN
- Boot data injection (environment, muted, translations, custom)
- Event system (ready, start, end, sendEvent)
- Device pixel ratio scaling
- Compression support (br, gzip, none)

**Files**:
- `UnityCanvas.tsx` — React component
- `LivewallBridge.jslib` — C# integration
- `EXAMPLE_UNITY_PROJECT.md` — Full setup guide with code

**Setup**:
```bash
# Create new Unity project
# Copy LivewallBridge.jslib to Assets/Plugins/WebGL/
# Add LivewallManager.cs and GameManager.cs scripts
# Build to Build/ folder
# Upload to CDN
```

### 2. Phaser (2D games)

**Location**: `modules/phaser/`

**Features**:
- Phaser 3/4 support
- Canvas element mounting
- Event bridge via `window.dispatchGameEvent`
- Simple API: click UI elements to end game

**Files**:
- `PhaserCanvas.tsx` — Ready-to-use component

**Usage**:
```tsx
<PhaserCanvas
  onGameEnd={(result) => {
    console.log('Game ended:', result);
    router.push('/result');
  }}
/>
```

### 3. React Three Fiber (3D games)

**Location**: `modules/r3f/`

**Features**:
- Three.js 3D rendering in React
- Suspense loading boundary
- Camera and controls preset
- Example rotating cube scene

**Files**:
- `R3FCanvas.tsx` — Three.js scene component

**Usage**:
```tsx
<R3FCanvas
  onGameEnd={(result) => {
    // Handle game end
  }}
/>
```

---

## 📄 Campaign Page Examples

### 1. Registration Page

**Purpose**: Collect player info before gameplay

**Features**:
- Form validation (name, email)
- Checkbox opt-ins (terms, marketing)
- Error messaging
- Loading state
- CAPE data integration

**Keys**:
```json
{
  "general.register.title": "Register",
  "general.register.fieldName": "Your name",
  "general.register.fieldEmail": "Email address"
}
```

**Routing**: `/register` → `/gameplay`

---

### 2. Leaderboard Page

**Purpose**: Show top scores and current player ranking

**Features**:
- Global vs Friends tabs
- Top 10 scores
- Current user highlighted
- Responsive design

**Keys**:
```json
{
  "general.leaderboard.title": "Leaderboard",
  "general.leaderboard.viewGlobal": "Global",
  "general.leaderboard.viewFriends": "Friends"
}
```

**Data**: Replace mock data with API call to `/api/leaderboard`

---

### 3. Voucher Page

**Purpose**: Display reward code and QR code

**Features**:
- QR code SVG
- Copy-to-clipboard voucher code
- Visual feedback (copy success)
- CAPE image support

**Keys**:
```json
{
  "general.voucher.title": "You won!",
  "general.voucher.ctaLabel": "Continue"
}
```

**Integration**: Connect to rewards backend

---

### 4. Video Page

**Purpose**: Show promotional or tutorial video

**Features**:
- HTML5 video player with controls
- Responsive aspect ratio
- Description text
- CAPE video URL support

**Keys**:
```json
{
  "general.video.title": "Watch this",
  "general.video.url": "https://..."
}
```

**Note**: Video URL should come from CAPE campaign data

---

### 5. Terms & FAQ Page

**Purpose**: Legal and help content

**Features**:
- Accordion-style expandable sections
- Search-friendly structure
- CAPE rich text support

**Keys**:
```json
{
  "general.faq.title": "FAQ",
  "general.terms.content": "..."
}
```

**Integration**: Pull from CAPE's rich-text field

---

## 🔄 Complete Campaign Flow

```
Landing Page
    ↓
    ├─→ [Skip registration]
    └─→ Registration Page (optional)
        ↓
Onboarding Page
    ↓
Gameplay Page
    ├─→ Gameplay Component (Unity/Phaser/R3F)
    └─→ Click "End Game" button
        ↓
Result Page
    ├─→ Show Score + Rank
    └─→ [Play Again] or [Continue]
        ↓
Menu (optional)
├─→ Home
├─→ Leaderboard
├─→ Video (optional)
├─→ Voucher (if won)
└─→ FAQ/Terms
```

---

## 🎯 Using These Examples

### Copy to Your Campaign

```bash
# Copy registration module to your campaign
cp examples/campaign-pages/REGISTRATION_PAGE.tsx \
   my-campaign/app/\(campaign\)/register/page.tsx

# Customize with CAPE keys
# Update imports for your project structure
```

### Customize for Your Brand

1. **Update CAPE keys** in `getCapeText()` calls
2. **Update colors** by modifying CSS classes
3. **Update animations** in `style={{ animation: '...' }}`
4. **Add images** via `getCapeImage()` or URL props

### Connect to Backend

Each page has a comment showing where to add:
- Server actions (registration submission)
- API calls (leaderboard fetching)
- Analytics (event tracking)

---

## 📋 Checklist for New Campaign

- [ ] Select game type (Unity/Phaser/R3F)
- [ ] Copy `UnityCanvas.tsx` (or alternative) to gameplay
- [ ] Choose campaign pages (register, leaderboard, voucher, video, faq)
- [ ] Copy page files to `app/(campaign)/`
- [ ] Update CAPE keys in getCapeText() calls
- [ ] Update color scheme (primary color variable)
- [ ] Connect to backend APIs
- [ ] Test full flow on mobile
- [ ] Upload build and test live

---

## 🧪 Testing Locally

```bash
# Generate new campaign
npm run scaffold

# Add example pages
cp examples/campaign-pages/*.tsx my-campaign/app/(campaign)/

# Update paths and CAPE keys
# Test with mock data
npm run dev:mock

# Test with real CAPE
npm run dev
```

---

## 🚀 Next Steps

1. **Copy examples** that match your campaign
2. **Customize** colors, text, and images
3. **Connect backend** APIs (registration, leaderboard, voucher)
4. **Test flows** on mobile and desktop
5. **Deploy** to production

All examples follow Livewall best practices:
- ✓ CAPE data integration
- ✓ Responsive design
- ✓ Smooth animations
- ✓ Error handling
- ✓ Accessibility
- ✓ Mobile-first

