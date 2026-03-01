# MinSlides

Password-protected slideshow system with scroll-snap navigation, video.js streaming, and optional CDN URL signing. Runs entirely client-side — no backend required.

## Quick Start

```bash
cd src
npm install
```

Edit `slideshow.html` with your slides, then build:

```bash
npm run build
```

The build prompts for an output filename and password, then produces a deployable package in `dist/`.

## Project Structure

```
src/
├── slideshow.html         ← source file (edit this)
├── styles.css             ← all styling
├── password_template.html ← custom StatiCrypt login page
├── build.sh               ← standard build (encrypt only)
├── secure_build.sh        ← secure build (sign CDN URLs + encrypt)
├── sign_urls.js           ← Bunny CDN/Stream URL signing
├── package.json
├── fonts/
│   └── AspektaVF.woff2    ← Aspekta Variable font
├── images/
│   └── logo.svg           ← site logo
└── slides/                ← SVG exports, images (create as needed)
```

Build output:

```
dist/
└── your_project_name/
    ├── your_project_name.html  ← encrypted slideshow
    ├── styles.css
    ├── password_template.html
    ├── fonts/
    ├── images/
    └── slides/
```

Each build creates a self-contained, deployable folder.

## Building

### Standard Build

For slideshows that only need password protection:

```bash
npm run build
# or
bash build.sh
```

Prompts for:
- **Output filename** — sanitized to lowercase with underscores (e.g., "My Project Name" → `my_project_name.html`)
- **Password** — encrypts the slideshow with AES-256-CBC via StatiCrypt

### Secure Build

For NDA'd or sensitive content. Signs all CDN-hosted asset URLs with Bunny token authentication before encrypting:

```bash
npm run build:secure
# or
bash secure_build.sh
```

Prompts for:
- **Output filename**
- **Bunny CDN hostname + security key** — for static assets (SVGs, posters, sprites)
- **Bunny Stream hostname + security key** — for video streams (.m3u8)
- **URL expiration** — e.g., `7d`, `30d`, `90d`
- **Password**

CDN credentials can also be set as environment variables to skip prompts:

```bash
export BUNNY_CDN_HOST="your-zone.b-cdn.net"
export BUNNY_CDN_KEY="your-key"
export BUNNY_STREAM_HOST="vz-xxxxx.b-cdn.net"
export BUNNY_STREAM_KEY="your-key"
```

Signed URLs expire after the specified duration. Rebuild and redeploy before expiration.

## Slides

Each slide is a `<section class="slide">` inside the `.deck` container. The JS auto-discovers slides — no registration needed.

### Color-only background

```html
<section class="slide" data-slide="0">
  <div class="slide-content">
    <!-- your content -->
  </div>
</section>
```

Background variants: `.slide--tint` (#0a0a0a), `.slide--shift` (#0d0d0d), `.slide--lift` (#111).

### External SVG background

```html
<section class="slide" data-slide="1">
  <img class="slide-bg" src="slides/slide-01.svg" alt="">
  <div class="slide-content">
    <!-- content overlays the SVG -->
  </div>
</section>
```

Uses `object-fit: contain` — shows the full design, letterboxes if aspect ratios don't match.

### Image background (photo)

```html
<section class="slide" data-slide="2">
  <img class="slide-bg slide-bg--cover" src="slides/photo.jpg" alt="">
  <div class="slide-content">
    <!-- content overlays the photo -->
  </div>
</section>
```

Add `slide-bg--cover` for full-bleed photos that fill the viewport and crop edges. Works with JPG, PNG, WebP, AVIF.

### Inline SVG (for video positioning)

```html
<section class="slide" data-slide="3">
  <div class="slide-bg-inline" id="slide3-svg">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080">
      <!-- paste Illustrator SVG export here -->
      <rect id="video-zone" x="200" y="300" width="960" height="540" fill="none"/>
    </svg>
  </div>
</section>
```

Named SVG elements become targets for `mountVideoOnSVG()`. Use this when you need precise video placement over a designed layout.

## Video

### Basic video embed

```html
<div class="video-mount">
  <video id="player-1" class="video-js vjs-fluid" controls preload="auto">
    <source src="https://your-cdn.com/manifest.m3u8" type="application/x-mpegURL">
  </video>
</div>
```

Supported source types:

| Format | MIME type | Use case |
|--------|-----------|----------|
| HLS | `application/x-mpegURL` | Adaptive streaming |
| DASH | `application/dash+xml` | Alternative adaptive |
| MP4 | `video/mp4` | Direct file |

### Custom poster overlay

```html
<div class="video-mount">
  <div class="video-poster" style="background-image: url('poster.webp');">
    <button class="video-poster-play" aria-label="Play">
      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
    </button>
  </div>
  <video id="player-1" class="video-js vjs-fluid" controls preload="auto">
    <source src="manifest.m3u8" type="application/x-mpegURL">
  </video>
</div>
```

The poster overlays the player until clicked. Hides automatically on play.

### Sprite thumbnails

Add data attributes to the `.video-mount` for hover preview thumbnails on the progress bar:

```html
<div class="video-mount"
  data-thumb-sprite="https://cdn.example.com/sprite.jpg"
  data-thumb-width="160"
  data-thumb-height="90"
  data-thumb-columns="10"
  data-thumb-rows="17"
  data-thumb-interval="1">
```

All attributes except `data-thumb-sprite` are optional (defaults shown above). Each URL can be independently signed for CDN-protected assets.

### SVG-positioned video

Place a video precisely over a named element in an inline SVG:

```javascript
mountVideoOnSVG(
  'slide3-svg',      // ID of the .slide-bg-inline wrapper
  'video-zone',      // ID of the rect inside the SVG
  'manifest.m3u8',
  'application/x-mpegURL'
);
```

A `ResizeObserver` automatically repositions the video when the viewport changes.

### HLS quality selector

For HLS streams with multiple renditions, a quality selector (Auto / 1080p / 720p / etc.) is automatically added to the control bar. No configuration needed.

## Theming

### Accent color

Change `--color-accent` in `styles.css` to theme the entire slideshow:

```css
--color-accent: rgb(0, 120, 212);  /* blue — default */
```

This drives: indicator dots, slide labels, video progress bar tint, and the password page button.

### Typography

Uses Aspekta Variable (packaged in `fonts/`). Headlines are uppercase at weight 700, body text is normal case at 0.6 opacity.

### Slide backgrounds

Four dark background levels available as modifier classes:

| Class | Color | Use |
|-------|-------|-----|
| (none) | `#000000` | Default black |
| `.slide--tint` | `#0a0a0a` | Subtle lift |
| `.slide--shift` | `#0d0d0d` | Medium lift |
| `.slide--lift` | `#111111` | Lightest |

## Fixed UI

These elements are always visible over all slides:

- **Top left** — presentation title (edit text in HTML)
- **Top right** — logo linking to chrisbialkow.ski
- **Bottom right** — page counter (auto-updates: "1 / 6")
- **Right center** — navigation indicator dots
- **Bottom center** — keyboard hint (fades after first interaction)

## Deployment

Upload the entire output folder from `dist/` to any static host:

- **Netlify** — drag and drop at app.netlify.com/drop
- **Vercel** — `npx vercel dist/your_project_name`
- **Cloudflare Pages** — connect repo or direct upload
- **GitHub Pages** — push folder contents to `gh-pages` branch
- **Any static host** — it's just HTML, CSS, and fonts

The password page loads the Aspekta font from the sidecar `fonts/` directory so it matches the slideshow styling.

## SVG Workflow

1. Design slides in Illustrator at 1920x1080
2. Name layers/objects that will hold videos (e.g., "video-hero")
3. Export as SVG (keep text as live `<text>` elements for smaller files)
4. Optimize with SVGO: `npx svgo slides/slide-01.svg`
5. Reference in `slideshow.html` as `<img>` or inline SVG
6. For inline SVGs, named elements become video placement targets via `mountVideoOnSVG()`

## How It Works

StatiCrypt encrypts the entire HTML payload with AES-256-CBC. The output contains only a password prompt, the encrypted blob, and decryption logic. Until the correct password is entered, the slideshow content doesn't exist in readable form — not in view-source, not in dev tools.

For the secure build, CDN URLs are signed with Bunny token authentication before encryption. Each URL gets a SHA-256 hash of the security key + file path + expiration timestamp. The CDN rejects requests without a valid token.
