# Colour Mixer

Single-page planning tool for **watercolour**, **gouache**, **acrylic**, **oil**, and **ink**.

- Pigment-aware blending via [spectral.js](https://github.com/rvanwijnen/spectral.js) (Kubelka–Munk)
- Five mediums with medium-specific controls, grounds, and tips
- Limited palette · **40 brand lines** · common names · free custom pickers
- Mix recipes with parts + water/dilution, white/black, body
- Glaze stack over paper/canvas/linen grounds
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
