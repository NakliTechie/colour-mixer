# Colour Mixer

Single-page planning tool for **watercolour**, **gouache**, **acrylic**, **oil**, and **ink**.

- Pigment-aware blending via [spectral.js](https://github.com/rvanwijnen/spectral.js) (Kubelka–Munk)
- Five mediums with medium-specific controls, grounds, and tips
- Limited palette · **40 brand lines** · common names · saved sets · free pickers
- Mix recipes with parts + water/dilution, white/black, body
- Hue wheel (harmony rings) · value strip · mud score · light preview
- Mixing chart · recipe card export · printable palette chart
- Compare A/B · share link + QR · undo/redo
- Glaze stack · photo match · tips · history

**Host:** `https://mixer.naklitechie.com`  
**Repo:** https://github.com/NakliTechie/colour-mixer  
**Sister:** [Hue & Cry](https://hueandcry.naklitechie.com/) — Sanzo Wada combinations from a photo

## Run locally

Any static server:

```bash
cd colour-mixer
python3 -m http.server 8765
# open http://127.0.0.1:8765
```

Or open `index.html` directly (clipboard and some features work best over http).

## Deploy (Cloudflare Pages)

**Git-connected Pages project:** `colour-mixer`  
- Repo: `NakliTechie/colour-mixer` · branch `main`  
- Build command: *(none)* · output directory: `/`  
- Auto-deploys on every push to `main` (and preview deploys for other branches/PRs)

**URLs**
- https://colour-mixer.pages.dev  
- https://mixer.naklitechie.com (custom domain)

No build step. No backend. Static files from repo root.

## Mediums

| Medium | Controls | Default ground |
|--------|----------|----------------|
| Watercolour | Water | Paper white |
| Gouache | Water + white + body | Bristol |
| Acrylic | White + black + body | Canvas |
| Oil | White + black + body | Linen |
| Ink | Dilution (water) | Paper white |

Gouache brand list also includes watercolour lines as planning proxies.

## Brand palettes

**40 lines** under **Brands** (filtered by medium): watercolour (13), gouache (5 + WC proxies), acrylic (10), oil (6), ink (6).

## Notes

- Tube hex values are **approximate mass-tones for planning**, not brand spectral data or certified colour matches.
- Real paints vary by manufacturer, binder, and batch.
- `spectral.js` is MIT-licensed (vendored under `vendor/`).
