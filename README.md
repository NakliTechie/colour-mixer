# Colour Mixer

Single-page planning tool for **watercolour** and **acrylic** mixes.

- Pigment-aware blending via [spectral.js](https://github.com/rvanwijnen/spectral.js) (Kubelka–Munk)
- Limited palette · **brand lines** (Winsor & Newton, Daniel Smith, Schmincke, Sennelier, Golden, Liquitex) · common names · free custom pickers
- Mix recipes with parts + water (WC) or white/black/body (acrylic)
- Glaze stack over paper/canvas grounds
- Photo sample + suggested matches
- Mode-aware tips and local history

**Planned host:** `https://mixer.naklitechie.com`  
**Repo:** https://github.com/NakliTechie/colour-mixer

## Run locally

Any static server:

```bash
cd colour-mixer
python3 -m http.server 8765
# open http://127.0.0.1:8765
```

Or open `index.html` directly (clipboard and some features work best over http).

## Deploy

Upload the whole folder (or its contents) to the web root for `mixer.naklitechie.com`:

```
index.html
css/styles.css
js/app.js
js/palettes.js
vendor/spectral.min.js
vendor/spectral.js   # optional, unminified
README.md
```

No build step. No backend.

## Brand palettes

Under **Brands** (filtered by medium):

| Brand | Line | Medium |
|-------|------|--------|
| Winsor & Newton | Professional Watercolour | WC |
| Winsor & Newton | Cotman Watercolour | WC |
| Daniel Smith | Extra Fine Watercolour | WC |
| Schmincke | Horadam Aquarell | WC |
| Sennelier | l'Aquarelle | WC |
| Golden | Heavy Body Acrylic | Acrylic |
| Liquitex | Heavy Body Acrylic | Acrylic |
| Winsor & Newton | Professional Acrylic | Acrylic |

## Notes

- Tube hex values are **approximate mass-tones for planning**, not brand spectral data or certified colour matches.
- Real paints vary by manufacturer, binder, and batch.
- `spectral.js` is MIT-licensed (vendored under `vendor/`).
