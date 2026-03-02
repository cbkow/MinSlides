# MinSlides

Password-protected slideshow with scroll-snap navigation, Video.js streaming, and optional CDN URL signing. Runs client-side — no backend required.

## Quick Start

```bash
cd src
npm install
npm run build
```

Prompts for an output name and password, then produces a deployable package in `dist/`.

## Project Structure

```
src/
├── slideshow.html         ← edit this
├── styles.css
├── password_template.html ← StatiCrypt login page
├── build.js               ← standard build (encrypt only)
├── secure_build.js        ← secure build (sign CDN URLs + encrypt)
├── sign_urls.js           ← Bunny CDN/Stream URL signing
├── package.json
├── fonts/                 ← Aspekta Variable font
├── images/
└── slides/                ← SVG exports, images
```

## Building

Both build scripts are cross-platform Node.js — works on Windows, macOS, and Linux.

### Standard Build (`npm run build`)

Encrypts the slideshow with StatiCrypt (AES-256-CBC). Prompts for output filename and password.

### Secure Build (`npm run build:secure`)

Signs all CDN-hosted URLs with Bunny token authentication, then encrypts. Prompts for Bunny CDN/Stream credentials, URL expiration (e.g. `30d`), and password.

CDN credentials can skip prompts via environment variables:

```bash
export BUNNY_CDN_HOST="your-zone.b-cdn.net"
export BUNNY_CDN_KEY="your-key"
export BUNNY_STREAM_HOST="vz-xxxxx.b-cdn.net"
export BUNNY_STREAM_KEY="your-key"
```

Signed URLs expire after the specified duration — rebuild before expiration.

## Slides

Each `<section class="slide" data-slide="N">` inside `.deck` is auto-discovered by the JS engine.

### Backgrounds

```html
<!-- Color only (default black) -->
<section class="slide">

<!-- Dark variations -->
<section class="slide slide--tint">   <!-- #0a0a0a -->
<section class="slide slide--shift">  <!-- #0d0d0d -->
<section class="slide slide--lift">   <!-- #111111 -->

<!-- External SVG/image (contain) -->
<img class="slide-bg" src="slides/slide-01.svg" alt="">

<!-- Full-bleed photo (cover) -->
<img class="slide-bg slide-bg--cover" src="photo.jpg" alt="">

<!-- Inline SVG (for video positioning) -->
<div class="slide-bg-inline" id="my-svg">
  <svg viewBox="0 0 1920 1080">
    <rect id="video-zone" x="200" y="300" width="960" height="540" fill="none"/>
  </svg>
</div>
```

## Video

### Basic player

```html
<div class="video-mount">
  <video id="player-1" class="video-js vjs-fluid" controls preload="auto">
    <source src="manifest.m3u8" type="application/x-mpegURL">
  </video>
</div>
```

### Custom poster

Add a `.video-poster` div inside `.video-mount`. It overlays the player until clicked.

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

### Sprite thumbnails

Add data attributes to `.video-mount` for hover previews on the progress bar:

```html
<div class="video-mount"
  data-thumb-sprite="path/to/sprite.jpg"
  data-thumb-config="path/to/config.json">
```

The JSON config can specify `width`, `height`, `columns`, `rows`, and `interval`. Without a config, defaults to 160x90, 10 columns, 17 rows, 1s interval.

### SVG-positioned video

Mount a player over a named element in an inline SVG:

```javascript
mountVideoOnSVG('my-svg', 'video-zone', 'manifest.m3u8', 'application/x-mpegURL');
```

Repositions automatically via ResizeObserver.

### HLS quality selector

Auto-added to the control bar for HLS streams with multiple renditions. No config needed.

## Video Gallery

A main player with a clickable thumbnail strip that switches videos.

```html
<div class="video-gallery">
  <div class="video-gallery-player">
    <div class="video-mount">
      <div class="video-poster" style="background-image: url('poster.webp');">
        <button class="video-poster-play" aria-label="Play">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="6,3 20,12 6,21"/></svg>
        </button>
      </div>
      <video id="player-gallery" class="video-js vjs-fluid" controls preload="auto">
        <source src="first-video.mp4" type="video/mp4">
      </video>
    </div>
  </div>

  <div class="video-gallery-thumbs video-gallery-thumbs--3">
    <button class="video-gallery-thumb active"
      data-video-url="first-video.mp4"
      data-poster="poster-1.webp"
      data-caption="First Video">
      <div class="video-gallery-thumb-img">
        <img src="thumb-1.webp" alt="First Video" loading="lazy">
        <svg class="video-gallery-thumb-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="6,4 20,12 6,20"/></svg>
        <svg class="video-gallery-thumb-active" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
      </div>
      <span class="video-gallery-thumb-caption">First Video</span>
    </button>
    <!-- repeat for each video -->
  </div>
</div>
```

Each thumbnail needs `data-video-url`, `data-poster`, and `data-caption`. The first thumbnail should have `class="active"`.

Grid modifiers: `--2`, `--3`, `--4`, `--5` set fixed column counts. Without a modifier, the grid auto-fits with a 120px minimum.

## Theming

Change `--color-accent` in `styles.css` to theme the slideshow (indicator dots, labels, video progress tint, password page button):

```css
--color-accent: rgb(0, 120, 212);
```

Typography uses Aspekta Variable (bundled in `fonts/`).

## Deployment

Upload the `dist/your_project_name/` folder to any static host — Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any web server.
