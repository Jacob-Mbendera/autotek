# AutoTek Brand Asset Pack — v1.0

Production-ready brand identity assets. **Shell icons** (favicon, PWA, touch) live at the project root and `/icons/`; **marketing marks** stay here under `assets/`.

## Layout (after web integration)

| Location | Contents |
|----------|----------|
| **`/favicon.ico`** | Legacy multi-resolution ICO (root URL; browsers request by default) |
| **`/favicon.svg`** | Primary vector favicon |
| **`/icons/`** | PNG sizes (64–512), maskable (192/512), apple-touch (180), favicon PNG fallbacks (16/32/48), vector `icon.svg`, `maskable.svg`, `apple-touch.svg` |
| **`/assets/logo/`** | Master logo variants (horizontal, stacked, monogram, mono, gradient, etc.) |
| **`/assets/social/`** | Avatar, OG image, nav headers (light/dark), splash |
| **`/assets/brand-guide/`** | One-page brand guide HTML (print to PDF) |

## Primary color

`#14B8A6` (Teal 500)

## Typography

Inter 400–800 for wordmark and UI. JetBrains Mono for technical specs.

## Web integration (current)

- **`index.html`** — `favicon.ico`, `favicon.svg`, `apple-touch-icon`
- **`/manifest.webmanifest`** — PWA icons under `/icons/`

### Example meta (OG image when you wire SEO)

```html
<meta property="og:image" content="/assets/social/og-image.svg" />
```

Use PNG exports for strict OG dimensions (1200×630) if you add raster versions later.
