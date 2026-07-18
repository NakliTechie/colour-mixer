/**
 * Mixing decks for Colour Mixer.
 *
 * Inspired by physical "mixing deck" card sets (Julie Collins, Charles Evans,
 * William F. Powell): themed cards that each pair a target colour with a
 * ratio recipe. Every swatch here is rendered by the real pigment engine
 * (Kubelka–Munk via MixerCore.mixPigments), mirroring the app's own
 * watercolour / gouache / oil display model so a card previews exactly what
 * loading it produces.
 *
 * Three views:
 *   • Themes      — curated recipe cards across all five mediums
 *   • Mix grid    — the full ratio range between any two pigments ("500 mixes")
 *   • Match colour — reverse mixing: target colour → closest recipes by ΔE
 *
 * Plus a printable card sheet of the current deck.
 */
(function () {
  "use strict";

  // Pigment shortcuts (display name → hex), from the app's palettes.
  const P = {
    lemon: ["Lemon Yellow", "#F4E04D"],
    hansa: ["Hansa Yellow", "#F5D031"],
    cadY: ["Cadmium Yellow", "#F2B705"],
    indianY: ["Indian Yellow", "#E3A018"],
    ochre: ["Yellow Ochre", "#C9953B"],
    rawS: ["Raw Sienna", "#B8833B"],
    cadO: ["Cadmium Orange", "#E86A17"],
    burntS: ["Burnt Sienna", "#8A3B1E"],
    venetian: ["Venetian Red", "#A33B2B"],
    pyrrole: ["Pyrrole Red", "#E23C28"],
    cadR: ["Cadmium Red", "#D4322C"],
    aliz: ["Alizarin Crimson", "#9B1B30"],
    quinRose: ["Quinacridone Rose", "#C4356A"],
    permRose: ["Permanent Rose", "#D94F7C"],
    quinMag: ["Quinacridone Magenta", "#A61C5C"],
    cobaltV: ["Cobalt Violet", "#8B5A9E"],
    diox: ["Dioxazine Purple", "#4A2C6A"],
    ultra: ["Ultramarine Blue", "#2B4C9B"],
    cobaltB: ["Cobalt Blue", "#2F5FA8"],
    phthaloB: ["Phthalo Blue", "#0A4D8C"],
    prussian: ["Prussian Blue", "#0B2E4A"],
    cerulean: ["Cerulean Blue", "#2A7EB5"],
    viridian: ["Viridian", "#2E7A66"],
    phthaloG: ["Phthalo Green", "#0B6B4F"],
    sap: ["Sap Green", "#4F7A2E"],
    hooker: ["Hooker's Green", "#3A6B3A"],
    burntU: ["Burnt Umber", "#5C3317"],
    payne: ["Payne's Grey", "#3D4A5C"],
  };
  const PIGMENT_KEYS = Object.keys(P);

  const WHITE_HEX = "#F7F5F0";
  const BLACK_HEX = "#1A1A1A";
  const GROUND = {
    watercolour: "#FFFEFA",
    ink: "#FFFEFA",
    gouache: "#F7F4EC",
    acrylic: "#E8DCC8",
    oil: "#E0D4BC",
  };
  const DEFAULT_GROUND_ID = {
    watercolour: "paper-white",
    ink: "paper-white",
    gouache: "bristol",
    acrylic: "canvas",
    oil: "linen",
  };

  // Recipe ingredient helper: r(pigmentKey, parts)
  const r = (key, parts) => ({ name: P[key][0], hex: P[key][1], parts });

  const DECKS = [
    {
      id: "skies", name: "Skies & atmosphere", mode: "watercolour",
      note: "Clear blues to stormy greys",
      cards: [
        { name: "Clear summer sky", water: 62, mix: [r("cerulean", 3), r("ultra", 1)] },
        { name: "Deep zenith blue", water: 55, mix: [r("ultra", 3), r("phthaloB", 1)] },
        { name: "Distant haze", water: 72, mix: [r("cerulean", 2), r("permRose", 1)] },
        { name: "Storm grey", water: 45, mix: [r("ultra", 2), r("burntS", 2)] },
        { name: "Warm dawn glow", water: 66, mix: [r("permRose", 2), r("cadY", 1)] },
        { name: "Overcast light", water: 60, mix: [r("payne", 2), r("ochre", 1)] },
        { name: "Twilight violet", water: 60, mix: [r("ultra", 2), r("quinRose", 1)] },
      ],
    },
    {
      id: "foliage", name: "Foliage & greens", mode: "watercolour",
      note: "Fresh leaves to deep forest",
      cards: [
        { name: "Spring leaf", water: 42, mix: [r("hansa", 3), r("phthaloB", 1)] },
        { name: "Summer foliage", water: 42, mix: [r("sap", 2), r("ultra", 1)] },
        { name: "Deep forest shadow", water: 35, mix: [r("phthaloG", 2), r("aliz", 1)] },
        { name: "Olive khaki", water: 42, mix: [r("hansa", 2), r("ultra", 1), r("burntS", 1)] },
        { name: "Sunlit grass", water: 46, mix: [r("hansa", 3), r("sap", 1)] },
        { name: "Pine evergreen", water: 40, mix: [r("phthaloG", 2), r("burntS", 1)] },
        { name: "Turning leaf", water: 45, mix: [r("sap", 1), r("cadO", 1)] },
      ],
    },
    {
      id: "sunset", name: "Sunsets & sunrises", mode: "watercolour",
      note: "Golden hour to ember dusk",
      cards: [
        { name: "Golden hour", water: 50, mix: [r("cadY", 2), r("cadO", 1)] },
        { name: "Fiery orange", water: 45, mix: [r("cadO", 2), r("pyrrole", 1)] },
        { name: "Rose sky", water: 60, mix: [r("permRose", 2), r("cadO", 1)] },
        { name: "Purple dusk", water: 55, mix: [r("quinRose", 1), r("ultra", 1)] },
        { name: "Peach horizon", water: 66, mix: [r("cadY", 2), r("permRose", 1)] },
        { name: "Ember red", water: 45, mix: [r("pyrrole", 2), r("aliz", 1)] },
      ],
    },
    {
      id: "autumn", name: "Autumn", mode: "watercolour",
      note: "Maple, rust and ochre",
      cards: [
        { name: "Maple red", water: 45, mix: [r("pyrrole", 2), r("cadO", 1)] },
        { name: "Golden leaf", water: 45, mix: [r("indianY", 2), r("cadO", 1)] },
        { name: "Rust", water: 40, mix: [r("burntS", 2), r("cadO", 1)] },
        { name: "Ochre field", water: 46, mix: [r("ochre", 2), r("rawS", 1)] },
        { name: "Bronze bark", water: 40, mix: [r("burntS", 2), r("ultra", 1)] },
        { name: "Deep burgundy", water: 45, mix: [r("aliz", 2), r("ultra", 1)] },
      ],
    },
    {
      id: "water", name: "Water & ocean", mode: "watercolour",
      note: "Shallows to deep swell",
      cards: [
        { name: "Tropical shallows", water: 62, mix: [r("phthaloG", 1), r("cerulean", 2)] },
        { name: "Deep sea", water: 45, mix: [r("phthaloB", 2), r("phthaloG", 1)] },
        { name: "Turquoise", water: 55, mix: [r("phthaloG", 2), r("phthaloB", 1)] },
        { name: "Grey-green swell", water: 45, mix: [r("viridian", 2), r("burntS", 1)] },
        { name: "Reflected sky", water: 60, mix: [r("cerulean", 2), r("ultra", 1)] },
        { name: "Wet sand", water: 55, mix: [r("ochre", 2), r("ultra", 1)] },
      ],
    },
    {
      id: "skin", name: "Skin tones", mode: "watercolour",
      note: "Light to deep, warm & cool",
      cards: [
        { name: "Light warm", water: 66, mix: [r("ochre", 2), r("permRose", 1)] },
        { name: "Mid flesh", water: 60, mix: [r("ochre", 2), r("burntS", 1)] },
        { name: "Rosy cheek", water: 70, mix: [r("permRose", 1), r("cadY", 1)] },
        { name: "Cool shadow", water: 55, mix: [r("burntS", 1), r("ultra", 1)] },
        { name: "Deep skin", water: 45, mix: [r("burntS", 2), r("aliz", 1)] },
        { name: "Olive skin", water: 55, mix: [r("ochre", 2), r("sap", 1)] },
      ],
    },
    {
      id: "neutrals", name: "Neutrals & greys", mode: "watercolour",
      note: "The workhorse mixes",
      cards: [
        { name: "Classic warm grey", water: 55, mix: [r("ultra", 1), r("burntS", 1)] },
        { name: "Cool grey", water: 55, mix: [r("ultra", 2), r("burntS", 1)] },
        { name: "Warm brown-grey", water: 50, mix: [r("ultra", 1), r("burntS", 2)] },
        { name: "Rich near-black", water: 30, mix: [r("phthaloB", 1), r("aliz", 1), r("burntS", 1)] },
        { name: "Granite", water: 55, mix: [r("payne", 1), r("burntS", 1)] },
        { name: "Soft taupe", water: 60, mix: [r("cobaltV", 1), r("ochre", 1)] },
      ],
    },
    {
      id: "florals", name: "Florals", mode: "watercolour",
      note: "Petals, blooms and stems",
      cards: [
        { name: "Rose petal", water: 55, mix: [r("permRose", 2), r("quinMag", 1)] },
        { name: "Lavender", water: 70, mix: [r("diox", 1), r("ultra", 1)] },
        { name: "Sunflower", water: 40, mix: [r("cadY", 2), r("indianY", 1)] },
        { name: "Poppy red", water: 40, mix: [r("pyrrole", 2), r("cadO", 1)] },
        { name: "Violet bloom", water: 55, mix: [r("diox", 2), r("quinRose", 1)] },
        { name: "Leaf & stem", water: 45, mix: [r("sap", 2), r("hansa", 1)] },
      ],
    },
    {
      id: "architecture", name: "Architecture", mode: "watercolour",
      note: "Brick, stone, roof and rust",
      cards: [
        { name: "Red brick", water: 45, mix: [r("venetian", 2), r("burntS", 1)] },
        { name: "Weathered stone", water: 58, mix: [r("ochre", 1), r("ultra", 1), r("burntS", 1)] },
        { name: "Slate roof", water: 45, mix: [r("payne", 2), r("ultra", 1)] },
        { name: "Terracotta", water: 45, mix: [r("cadO", 2), r("burntS", 1)] },
        { name: "Aged wood", water: 50, mix: [r("burntU", 2), r("ochre", 1)] },
        { name: "Concrete grey", water: 60, mix: [r("payne", 1), r("rawS", 1)] },
        { name: "Rusted metal", water: 45, mix: [r("burntS", 2), r("pyrrole", 1)] },
        { name: "Shadow on white wall", water: 70, mix: [r("ultra", 1), r("cobaltV", 1)] },
      ],
    },
    {
      id: "landscape", name: "Landscape essentials", mode: "watercolour",
      note: "Distance, earth and dry grass",
      cards: [
        { name: "Distant hills", water: 68, mix: [r("ultra", 2), r("burntS", 1)] },
        { name: "Misty mountain", water: 74, mix: [r("cobaltB", 1), r("permRose", 1)] },
        { name: "Ploughed field", water: 45, mix: [r("burntS", 2), r("ultra", 1)] },
        { name: "Dry grass", water: 48, mix: [r("ochre", 2), r("sap", 1)] },
        { name: "Dirt road", water: 52, mix: [r("rawS", 2), r("ultra", 1)] },
        { name: "Tree trunk", water: 42, mix: [r("burntU", 2), r("ultra", 1)] },
        { name: "Sunlit meadow", water: 50, mix: [r("hansa", 2), r("sap", 1)] },
      ],
    },
    {
      id: "portrait", name: "Portraits", mode: "watercolour",
      note: "Hair, lips and features",
      cards: [
        { name: "Blonde hair", water: 60, mix: [r("ochre", 2), r("rawS", 1)] },
        { name: "Auburn hair", water: 45, mix: [r("burntS", 2), r("cadO", 1)] },
        { name: "Dark brown hair", water: 40, mix: [r("burntU", 2), r("ultra", 1)] },
        { name: "Black hair (cool)", water: 35, mix: [r("payne", 2), r("burntU", 1)] },
        { name: "Natural lip", water: 55, mix: [r("permRose", 2), r("burntS", 1)] },
        { name: "Blue eye", water: 55, mix: [r("cerulean", 2), r("ultra", 1)] },
        { name: "Brown eye", water: 45, mix: [r("burntS", 2), r("ultra", 1)] },
      ],
    },
    {
      id: "gouache", name: "Gouache flats", mode: "gouache",
      note: "Opaque pastels & flat colour",
      cards: [
        { name: "Pastel sky", white: 55, water: 12, mix: [r("cerulean", 2), r("ultra", 1)] },
        { name: "Mint flat", white: 60, water: 10, mix: [r("phthaloG", 1), r("hansa", 1)] },
        { name: "Blush pink", white: 62, water: 10, mix: [r("permRose", 1)] },
        { name: "Butter yellow", white: 55, water: 10, mix: [r("cadY", 1)] },
        { name: "Lilac flat", white: 60, water: 10, mix: [r("diox", 1), r("ultra", 1)] },
        { name: "Sage", white: 45, water: 12, mix: [r("sap", 1), r("ochre", 1)] },
        { name: "Terracotta flat", white: 25, water: 10, mix: [r("burntS", 2), r("cadO", 1)] },
        { name: "Slate flat", white: 40, water: 10, mix: [r("payne", 2), r("ultra", 1)] },
      ],
    },
    {
      id: "acrylic", name: "Acrylic body", mode: "acrylic",
      note: "Bold body colour with white / black",
      cards: [
        { name: "Bright sky", white: 30, mix: [r("cerulean", 2), r("ultra", 1)] },
        { name: "Foliage green", white: 0, mix: [r("sap", 2), r("cadY", 1)] },
        { name: "Warm grey", white: 20, mix: [r("ultra", 1), r("burntS", 1)] },
        { name: "Shadow black", black: 20, mix: [r("ultra", 1), r("burntU", 1)] },
        { name: "Skin base", white: 30, mix: [r("ochre", 2), r("cadR", 1)] },
        { name: "Deep red", black: 10, mix: [r("pyrrole", 2), r("aliz", 1)] },
        { name: "Pale wall", white: 60, mix: [r("ochre", 1), r("rawS", 1)] },
        { name: "Denim blue", white: 25, mix: [r("ultra", 2), r("burntS", 1)] },
      ],
    },
    {
      id: "oil", name: "Oil portrait & landscape", mode: "oil",
      note: "Classic limited-palette oils",
      cards: [
        { name: "Zorn light flesh", white: 42, mix: [r("ochre", 2), r("cadR", 1)] },
        { name: "Zorn shadow", black: 15, mix: [r("ochre", 1), r("cadR", 1)] },
        { name: "Cool flesh", white: 30, mix: [r("ochre", 1), r("cadR", 1), r("ultra", 1)] },
        { name: "Sky blue", white: 35, mix: [r("cerulean", 2), r("ultra", 1)] },
        { name: "Foliage", white: 0, mix: [r("sap", 2), r("ochre", 1)] },
        { name: "Earth shadow", black: 8, mix: [r("burntU", 2), r("ultra", 1)] },
        { name: "Highlight cream", white: 70, mix: [r("ochre", 1)] },
        { name: "Deep background", black: 12, mix: [r("burntU", 1), r("ultra", 1)] },
      ],
    },
  ];

  const el = {};
  let activeDeck = 0;
  let view = "themes";
  let bound = false;

  function core() {
    return window.MixerCore;
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }
  function deckMode(deck, card) {
    return (card && card.mode) || deck.mode || "watercolour";
  }

  // ——— Colour maths for reverse matching ———
  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToLab({ r: R, g: G, b: B }) {
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const rr = lin(R), gg = lin(G), bb = lin(B);
    let x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
    let y = rr * 0.2126 + gg * 0.7152 + bb * 0.0722;
    let z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x), fy = f(y), fz = f(z);
    return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  }
  function deltaE(a, b) {
    const dL = a.L - b.L, da = a.a - b.a, db = a.b - b.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  // ——— Engine preview (mirrors app's computeDisplayedResult) ———
  function massTone(mix, mode, white, black) {
    const M = core();
    const entries = mix.map((p) => ({ hex: p.hex, factor: Math.max(0.01, p.parts) }));
    const pigTotal = entries.reduce((a, e) => a + e.factor, 0) || 1;
    if (mode === "gouache" || mode === "acrylic" || mode === "oil") {
      if (white > 0) entries.push({ hex: WHITE_HEX, factor: (white / 100) * pigTotal * 1.4 });
      if (black > 0 && (mode === "acrylic" || mode === "oil"))
        entries.push({ hex: BLACK_HEX, factor: (black / 100) * pigTotal * 1.1 });
    }
    return M.mixPigments(entries);
  }

  function previewHex(recipe) {
    const M = core();
    const mode = recipe.mode || "watercolour";
    const water = recipe.water ?? (mode === "watercolour" || mode === "ink" ? 45 : 0);
    const opacity = recipe.opacity ?? 90;
    const ground = GROUND[mode] || "#FFFEFA";
    const mass = massTone(recipe.mix, mode, recipe.white || 0, recipe.black || 0);
    if (mode === "watercolour" || mode === "ink") {
      const alpha = 1 - water / 100;
      const wash = water > 5
        ? M.mixPigments([{ hex: mass, factor: Math.max(0.05, alpha) }, { hex: ground, factor: water / 100 }])
        : mass;
      const cover = clamp(alpha * (mode === "ink" ? 1.12 : 1.05), mode === "ink" ? 0.06 : 0.05, 1);
      return M.compositeOver(ground, wash, cover);
    }
    if (mode === "gouache") {
      const body = opacity / 100, wet = 1 - water / 100;
      const alpha = clamp(body * (0.45 + 0.55 * wet), 0.12, 1);
      const film = water > 10
        ? M.mixPigments([{ hex: mass, factor: Math.max(0.1, wet) }, { hex: ground, factor: water / 200 }])
        : mass;
      return M.compositeOver(ground, film, alpha);
    }
    return M.compositeOver(ground, mass, opacity / 100);
  }

  // ——— Recipe display ———
  function ingredientsHtml(mix) {
    return mix
      .map((p) => `<span class="deck-ing"><span class="deck-dot" style="background:${esc(p.hex)}"></span>${esc(p.name)}<span class="deck-x">×${p.parts}</span></span>`)
      .join('<span class="deck-plus">+</span>');
  }
  function modifiersHtml(recipe) {
    const mode = recipe.mode || "watercolour";
    const chips = [];
    if ((mode === "watercolour" || mode === "ink" || mode === "gouache") && recipe.water != null && recipe.water > 0)
      chips.push(`💧 water ${recipe.water}%`);
    if (recipe.white) chips.push(`⚪ white ${recipe.white}%`);
    if (recipe.black) chips.push(`⚫ black ${recipe.black}%`);
    return chips.map((c) => `<span class="deck-water">${c}</span>`).join("");
  }
  function recipeHtml(recipe) {
    return ingredientsHtml(recipe.mix) + modifiersHtml(recipe);
  }

  // ——— Load a recipe into the mixer ———
  function loadRecipe(recipe) {
    const M = core();
    if (!M) return;
    const mode = recipe.mode || "watercolour";
    if (typeof M.pushUndo === "function") M.pushUndo();
    M.applySnapshot({
      mode,
      slots: recipe.mix.map((p, i) => ({ id: "deck-" + i + "-" + Math.round(p.parts * 10), name: p.name, hex: p.hex, parts: p.parts })),
      water: recipe.water ?? (mode === "watercolour" || mode === "ink" ? 45 : 40),
      white: recipe.white || 0,
      black: recipe.black || 0,
      opacity: recipe.opacity ?? 90,
      ground: DEFAULT_GROUND_ID[mode] || "paper-white",
      glaze: [],
    });
    M.toast(`Loaded “${recipe.name || "mix"}” — tweak it in Mix`);
    const mixer = document.querySelector(".mixer-panel");
    if (mixer) mixer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cardHtml(recipe, dataAttr, idx) {
    return `
      <button type="button" class="deck-card" ${dataAttr}="${idx}" title="Load this recipe into the mixer">
        <span class="deck-swatch" style="background:${esc(previewHex(recipe))}"></span>
        <span class="deck-card-body">
          <span class="deck-card-name">${esc(recipe.name)}${recipe.badge ? `<span class="deck-badge">${esc(recipe.badge)}</span>` : ""}</span>
          <span class="deck-recipe">${recipeHtml(recipe)}</span>
        </span>
      </button>`;
  }

  // Build a full recipe object (with mode) from a deck card.
  function deckRecipe(deck, card) {
    return { ...card, mode: deckMode(deck, card) };
  }

  // ——— Themes view ———
  function renderChips() {
    el.chips.innerHTML = DECKS
      .map((d, i) => `<button type="button" class="deck-chip${i === activeDeck ? " is-active" : ""}" data-deck="${i}" aria-pressed="${i === activeDeck}">${esc(d.name)}</button>`)
      .join("");
  }
  function renderThemeCards() {
    const deck = DECKS[activeDeck];
    if (!deck) return;
    el.note.textContent = deck.note + " · " + medLabel(deck.mode);
    el.grid.innerHTML = deck.cards.map((card, i) => cardHtml(deckRecipe(deck, card), "data-card", i)).join("");
  }
  function medLabel(mode) {
    return { watercolour: "watercolour", gouache: "gouache", acrylic: "acrylic", oil: "oil", ink: "ink" }[mode] || mode;
  }

  // ——— Mix grid view ("500 mixes") ———
  const GRID_STEPS = [[1, 0], [4, 1], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3], [1, 4], [0, 1]];
  const GRID_WATER = 35;
  function fillPigmentSelect(sel, chosen) {
    sel.innerHTML = PIGMENT_KEYS.map((k) => `<option value="${k}"${k === chosen ? " selected" : ""}>${esc(P[k][0])}</option>`).join("");
  }
  function renderGrid() {
    const ak = el.gridA.value, bk = el.gridB.value;
    const A = P[ak], B = P[bk];
    el.gridStrip.innerHTML = GRID_STEPS.map((step, i) => {
      const [pa, pb] = step;
      const mix = [];
      if (pa > 0) mix.push({ name: A[0], hex: A[1], parts: pa });
      if (pb > 0) mix.push({ name: B[0], hex: B[1], parts: pb });
      const recipe = { name: ratioLabel(A[0], B[0], pa, pb), mode: "watercolour", water: GRID_WATER, mix };
      const label = pa === 0 ? "0:1" : pb === 0 ? "1:0" : `${pa}:${pb}`;
      return `<button type="button" class="grid-cell" data-grid="${i}" title="${esc(recipe.name)} — tap to load">
        <span class="grid-sw" style="background:${esc(previewHex(recipe))}"></span>
        <span class="grid-ratio">${label}</span></button>`;
    }).join("");
    el.gridStrip._recipes = GRID_STEPS.map((step) => {
      const [pa, pb] = step;
      const mix = [];
      if (pa > 0) mix.push({ name: A[0], hex: A[1], parts: pa });
      if (pb > 0) mix.push({ name: B[0], hex: B[1], parts: pb });
      return { name: ratioLabel(A[0], B[0], pa, pb), mode: "watercolour", water: GRID_WATER, mix };
    });
  }
  function ratioLabel(an, bn, pa, pb) {
    if (pa === 0) return bn;
    if (pb === 0) return an;
    return `${an} ${pa}:${pb} ${bn}`;
  }

  // ——— Match a colour (reverse mixing) ———
  const MATCH_RATIOS = [[1, 0], [3, 1], [2, 1], [1, 1], [1, 2], [1, 3]];
  const MATCH_WATERS = [8, 30, 52, 70];
  function matchColour(targetHex) {
    const target = rgbToLab(hexToRgb(targetHex));
    const best = new Map(); // key: pigment-set → best {recipe, dE}
    for (let i = 0; i < PIGMENT_KEYS.length; i++) {
      for (let j = i; j < PIGMENT_KEYS.length; j++) {
        const single = i === j;
        const A = P[PIGMENT_KEYS[i]], B = P[PIGMENT_KEYS[j]];
        const key = single ? A[0] : A[0] < B[0] ? A[0] + "|" + B[0] : B[0] + "|" + A[0];
        for (const [pa, pb] of MATCH_RATIOS) {
          if (single && pb > 0) continue;
          const mix = single
            ? [{ name: A[0], hex: A[1], parts: 1 }]
            : [{ name: A[0], hex: A[1], parts: pa }, { name: B[0], hex: B[1], parts: pb }];
          for (const water of MATCH_WATERS) {
            const recipe = { mode: "watercolour", water, mix };
            const dE = deltaE(rgbToLab(hexToRgb(previewHex(recipe))), target);
            const prev = best.get(key);
            if (!prev || dE < prev.dE) best.set(key, { recipe, dE });
          }
        }
      }
    }
    return [...best.values()].sort((a, b) => a.dE - b.dE).slice(0, 6);
  }
  function bandFor(dE) {
    if (dE <= 3) return "very close";
    if (dE <= 7) return "close";
    if (dE <= 14) return "in range";
    return "loose";
  }
  function renderMatch() {
    const hex = normalizeHexInput(el.matchHex.value) || el.matchColor.value;
    const results = matchColour(hex);
    el.matchResults.innerHTML =
      `<div class="match-target"><span class="lib-chip" style="background:${esc(hex)}"></span><span class="micro">Target ${esc(hex.toUpperCase())} — closest 1–2 pigment recipes:</span></div>` +
      results.map((res, i) => {
        const recipe = { ...res.recipe, name: recipeName(res.recipe), badge: `${bandFor(res.dE)} · ΔE ${res.dE.toFixed(1)}` };
        return cardHtml(recipe, "data-match", i);
      }).join("");
    el.matchResults._recipes = results.map((res) => ({ ...res.recipe, name: recipeName(res.recipe) }));
  }
  function recipeName(recipe) {
    return recipe.mix.map((p) => p.name.replace(/ \(.*/, "")).join(" + ");
  }
  function normalizeHexInput(v) {
    let h = String(v || "").trim();
    if (!h) return null;
    if (!h.startsWith("#")) h = "#" + h;
    if (/^#[0-9a-fA-F]{3}$/.test(h)) h = "#" + h.slice(1).split("").map((c) => c + c).join("");
    return /^#[0-9a-fA-F]{6}$/.test(h) ? h.toUpperCase() : null;
  }

  // ——— Print deck sheet ———
  function printDeck() {
    const root = document.getElementById("print-chart-root");
    if (!root) return;
    const deck = DECKS[activeDeck];
    const cells = deck.cards.map((card) => {
      const recipe = deckRecipe(deck, card);
      const ing = recipe.mix.map((p) => `${p.name.replace(/ \(.*/, "")} ×${p.parts}`).join(" + ");
      const mods = [];
      if (recipe.water) mods.push(`water ${recipe.water}%`);
      if (recipe.white) mods.push(`white ${recipe.white}%`);
      if (recipe.black) mods.push(`black ${recipe.black}%`);
      return `<div class="pc-cell"><div class="pc-sw" style="background:${previewHex(recipe)}"></div>
        <span><strong>${esc(card.name)}</strong><br><small>${esc(ing)}${mods.length ? " · " + esc(mods.join(" · ")) : ""}</small></span></div>`;
    }).join("");
    root.innerHTML = `
      <h1>${esc(deck.name)} — mixing deck</h1>
      <p>Colour Mixer · ${esc(medLabel(deck.mode))} recipes · planning reference</p>
      <div class="pc-grid">${cells}</div>`;
    document.body.classList.add("printing-chart");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-chart");
      root.innerHTML = "";
    }, 500);
  }

  // ——— View switching ———
  function setView(v) {
    view = v;
    [["themes", el.vThemes], ["grid", el.vGrid], ["match", el.vMatch]].forEach(([name, node]) => {
      if (node) node.hidden = name !== v;
    });
    el.viewBtns.forEach((b) => {
      const on = b.dataset.deckview === v;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    if (v === "themes") { renderChips(); renderThemeCards(); }
    else if (v === "grid") renderGrid();
    else if (v === "match") renderMatch();
  }

  function bind() {
    if (bound) return;
    el.panel = document.getElementById("decks-panel");
    if (!el.panel) return;
    el.viewBtns = Array.from(el.panel.querySelectorAll("[data-deckview]"));
    el.vThemes = document.getElementById("deckview-themes");
    el.vGrid = document.getElementById("deckview-grid");
    el.vMatch = document.getElementById("deckview-match");
    el.chips = document.getElementById("deck-chips");
    el.note = document.getElementById("deck-note");
    el.grid = document.getElementById("deck-grid");
    el.printBtn = document.getElementById("print-deck");
    el.gridA = document.getElementById("grid-a");
    el.gridB = document.getElementById("grid-b");
    el.gridStrip = document.getElementById("grid-strip");
    el.matchColor = document.getElementById("match-color");
    el.matchHex = document.getElementById("match-hex");
    el.matchGo = document.getElementById("match-go");
    el.matchResults = document.getElementById("match-results");
    if (!el.grid) return;
    bound = true;

    el.viewBtns.forEach((b) => b.addEventListener("click", () => setView(b.dataset.deckview)));

    el.chips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-deck]");
      if (!btn) return;
      activeDeck = Number(btn.dataset.deck);
      renderChips();
      renderThemeCards();
    });
    el.grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-card]");
      if (!btn) return;
      const deck = DECKS[activeDeck];
      loadRecipe(deckRecipe(deck, deck.cards[Number(btn.dataset.card)]));
    });
    if (el.printBtn) el.printBtn.addEventListener("click", printDeck);

    if (el.gridA && el.gridB) {
      fillPigmentSelect(el.gridA, "ultra");
      fillPigmentSelect(el.gridB, "burntS");
      el.gridA.addEventListener("change", renderGrid);
      el.gridB.addEventListener("change", renderGrid);
      el.gridStrip.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-grid]");
        if (!btn) return;
        const recipes = el.gridStrip._recipes || [];
        const rec = recipes[Number(btn.dataset.grid)];
        if (rec) loadRecipe(rec);
      });
    }

    if (el.matchGo) {
      const sync = (hex) => { el.matchColor.value = hex; el.matchHex.value = hex; };
      el.matchColor.addEventListener("input", () => { sync(el.matchColor.value.toUpperCase()); renderMatch(); });
      el.matchHex.addEventListener("change", () => {
        const h = normalizeHexInput(el.matchHex.value);
        if (h) { sync(h); renderMatch(); }
      });
      el.matchGo.addEventListener("click", renderMatch);
      el.matchResults.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-match]");
        if (!btn) return;
        const recipes = el.matchResults._recipes || [];
        const rec = recipes[Number(btn.dataset.match)];
        if (rec) loadRecipe(rec);
      });
    }

    let rendered = false;
    const ensure = () => { if (rendered) return; rendered = true; setView("themes"); };
    if (el.panel.tagName === "DETAILS") {
      el.panel.addEventListener("toggle", () => { if (el.panel.open) ensure(); });
      if (el.panel.open) ensure();
    } else ensure();
  }

  function boot() {
    if (!window.MixerCore) { setTimeout(boot, 40); return; }
    bind();
  }

  window.MIXING_DECKS = DECKS;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
