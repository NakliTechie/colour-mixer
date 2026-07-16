# Colour Mixer

Single-page planning tool for **watercolour** and **acrylic** mixes.

- Pigment-aware blending via [spectral.js](https://github.com/rvanwijnen/spectral.js) (Kubelka–Munk)
- Limited palette · named paints · free custom pickers
- Mix recipes with parts + water (WC) or white/black/body (acrylic)
- Glaze stack over paper/canvas grounds
- Photo sample + suggested matches
- Mode-aware tips and local history

**Planned host:** `https://mixer.naklitechie.com`

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

## Notes

- Tube hex values are **approximate mass-tones for planning**, not brand spectral data.
- Real paints vary by manufacturer, binder, and batch.
- `spectral.js` is MIT-licensed (vendored under `vendor/`).
