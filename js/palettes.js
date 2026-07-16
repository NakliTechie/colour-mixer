/**
 * Paint palettes for Colour Mixer.
 * Hex values are approximate mass-tones for planning — not brand-certified.
 */
window.PAINT_PALETTES = {
  limited: [
    {
      id: "hansa-y",
      name: "Hansa Yellow (cool)",
      hex: "#F5D031",
      family: "yellow",
      note: "Cool yellow — clean greens with phthalo",
    },
    {
      id: "cad-y",
      name: "Cadmium Yellow (warm)",
      hex: "#F2B705",
      family: "yellow",
      note: "Warm yellow — oranges with warm red",
    },
    {
      id: "pyrrole-r",
      name: "Pyrrole Red (warm)",
      hex: "#E23C28",
      family: "red",
      note: "Warm red — lively oranges",
    },
    {
      id: "quin-rose",
      name: "Quinacridone Rose (cool)",
      hex: "#C4356A",
      family: "red",
      note: "Cool red/magenta — clean purples",
    },
    {
      id: "ultra-b",
      name: "Ultramarine Blue (warm)",
      hex: "#2B4C9B",
      family: "blue",
      note: "Warm blue — violets with rose",
    },
    {
      id: "phthalo-b",
      name: "Phthalo Blue (cool)",
      hex: "#0A4D8C",
      family: "blue",
      note: "Cool blue — strong tinting; use sparingly",
    },
    {
      id: "burnt-s",
      name: "Burnt Sienna",
      hex: "#8A3B1E",
      family: "earth",
      note: "Warm earth — neutrals with ultramarine",
    },
    {
      id: "yellow-o",
      name: "Yellow Ochre",
      hex: "#C9953B",
      family: "earth",
      note: "Muted yellow earth",
    },
    {
      id: "paynes",
      name: "Payne's Grey",
      hex: "#3D4A5C",
      family: "neutral",
      note: "Cool dark — softer than black",
    },
  ],

  named: [
    { id: "lemon-y", name: "Lemon Yellow", hex: "#F4E04D", brandish: "common WC/acrylic", family: "yellow" },
    { id: "cad-y-deep", name: "Cadmium Yellow Deep", hex: "#E8A317", brandish: "common", family: "yellow" },
    { id: "indian-y", name: "Indian Yellow", hex: "#E3A018", brandish: "common WC", family: "yellow" },
    { id: "cad-o", name: "Cadmium Orange", hex: "#E86A17", brandish: "common", family: "orange" },
    { id: "cad-r", name: "Cadmium Red Medium", hex: "#D4322C", brandish: "common", family: "red" },
    { id: "alizarin", name: "Alizarin Crimson", hex: "#9B1B30", brandish: "classic (often hue)", family: "red" },
    { id: "quin-mag", name: "Quinacridone Magenta", hex: "#A61C5C", brandish: "common", family: "red" },
    { id: "perm-rose", name: "Permanent Rose", hex: "#D94F7C", brandish: "common WC", family: "red" },
    { id: "diox-p", name: "Dioxazine Purple", hex: "#4A2C6A", brandish: "common", family: "violet" },
    { id: "cobalt-v", name: "Cobalt Violet", hex: "#8B5A9E", brandish: "common", family: "violet" },
    { id: "cobalt-b", name: "Cobalt Blue", hex: "#2F5FA8", brandish: "common", family: "blue" },
    { id: "cerulean", name: "Cerulean Blue", hex: "#2A7EB5", brandish: "common", family: "blue" },
    { id: "prussian", name: "Prussian Blue", hex: "#0B2E4A", brandish: "common", family: "blue" },
    { id: "indanthrene", name: "Indanthrene Blue", hex: "#1E3A6E", brandish: "common WC", family: "blue" },
    { id: "phthalo-g", name: "Phthalo Green", hex: "#0B6B4F", brandish: "common", family: "green" },
    { id: "sap-g", name: "Sap Green", hex: "#4F7A2E", brandish: "common", family: "green" },
    { id: "viridian", name: "Viridian", hex: "#2E7A66", brandish: "common", family: "green" },
    { id: "hookers", name: "Hooker's Green", hex: "#3A6B3A", brandish: "common WC", family: "green" },
    { id: "raw-sienna", name: "Raw Sienna", hex: "#B8833B", brandish: "common", family: "earth" },
    { id: "raw-umber", name: "Raw Umber", hex: "#6B4E31", brandish: "common", family: "earth" },
    { id: "burnt-umber", name: "Burnt Umber", hex: "#5C3317", brandish: "common", family: "earth" },
    { id: "venetian", name: "Venetian Red", hex: "#A33B2B", brandish: "common", family: "earth" },
    { id: "titanium-w", name: "Titanium White", hex: "#F7F5F0", brandish: "acrylic essential", family: "neutral", acrylicOnly: true },
    { id: "zinc-w", name: "Zinc White", hex: "#F2F0EA", brandish: "softer white", family: "neutral", acrylicOnly: true },
    { id: "ivory-blk", name: "Ivory Black", hex: "#1A1A1A", brandish: "common", family: "neutral" },
    { id: "lamp-blk", name: "Lamp Black", hex: "#0D0D0D", brandish: "common acrylic", family: "neutral" },
    { id: "neutral-tint", name: "Neutral Tint", hex: "#2C2C34", brandish: "common WC", family: "neutral" },
  ],
};

window.GROUNDS = {
  "paper-white": { name: "Paper white", hex: "#FFFEFA" },
  "paper-cream": { name: "Cream paper", hex: "#F5EDE0" },
  "paper-cold": { name: "Cold-press grey", hex: "#E8E6E1" },
  canvas: { name: "Canvas tone", hex: "#E8DCC8" },
  "mid-grey": { name: "Mid grey underpainting", hex: "#8A8680" },
};

window.MODE_TIPS = {
  watercolour: [
    "Lighten with water, not white. The paper is your lightest value — let it glow through the wash.",
    "Transparent pigments mix cleaner. Opaque or sedimentary colours can chalk or mud when overmixed.",
    "Two or three colours are usually enough. A fourth often greys the mix toward mud.",
    "Complementary pairs (e.g. ultramarine + burnt sienna) make beautiful neutrals — stop before they go dead grey.",
    "Glaze wet-over-dry for optical depth. Each dry layer adds richness without stirring mud on the palette.",
    "Phthalo blues and greens are high-tinting. Start with a tiny part and add more — easier than rescuing a flooded mix.",
    "Warm + cool of the same family (e.g. two yellows) keeps secondaries lively instead of one-note.",
    "If a mix goes muddy, try the same hues with more water as separate glazes instead of one heavy puddle.",
  ],
  acrylic: [
    "Titanium white tints but also cools and can chalk. Add gradually and check against your ground.",
    "Mix mass-tone first, then tint/shade. Jumping straight to pastel makes matching harder later.",
    "Acrylics dry slightly darker. Plan a touch lighter than the target if matching a reference.",
    "Black quickly kills chroma. Prefer a complementary dark or Payne’s-style mix for natural shadows.",
    "Lower body / more medium turns a colour into a glaze — useful for optical layers over dry underpainting.",
    "Warm and cool versions of each primary still apply: they control whether your secondaries sing or go dull.",
    "A limited palette (split primary + earth + white) keeps mixes harmonious across a painting.",
    "Overmixing on the palette can grey colours. Leave a little variation — it reads more like paint.",
  ],
};
