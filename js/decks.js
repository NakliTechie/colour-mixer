/**
 * Mixing decks for Colour Mixer.
 *
 * Inspired by physical "mixing deck" card sets (Julie Collins, Charles Evans,
 * William F. Powell): themed cards that each pair a target colour with a
 * ratio recipe. Here every card's swatch is rendered by the real pigment
 * engine (Kubelka–Munk via MixerCore.mixPigments), and tapping a card loads
 * its exact recipe — paints, ratios and water — into the mixer to tweak.
 *
 * Recipes use watercolour pigments drawn from the app's limited + common
 * palettes. Ratios are conventional artist mixes; hues are approximate.
 */
(function () {
  "use strict";

  // Pigment shortcuts (display name → hex), from the app's palettes.
  const P = {
    hansa: ["Hansa Yellow", "#F5D031"],
    cadY: ["Cadmium Yellow", "#F2B705"],
    lemon: ["Lemon Yellow", "#F4E04D"],
    indianY: ["Indian Yellow", "#E3A018"],
    cadO: ["Cadmium Orange", "#E86A17"],
    pyrrole: ["Pyrrole Red", "#E23C28"],
    cadR: ["Cadmium Red", "#D4322C"],
    aliz: ["Alizarin Crimson", "#9B1B30"],
    quinRose: ["Quinacridone Rose", "#C4356A"],
    quinMag: ["Quinacridone Magenta", "#A61C5C"],
    permRose: ["Permanent Rose", "#D94F7C"],
    ultra: ["Ultramarine Blue", "#2B4C9B"],
    phthaloB: ["Phthalo Blue", "#0A4D8C"],
    cobaltB: ["Cobalt Blue", "#2F5FA8"],
    cerulean: ["Cerulean Blue", "#2A7EB5"],
    prussian: ["Prussian Blue", "#0B2E4A"],
    phthaloG: ["Phthalo Green", "#0B6B4F"],
    sap: ["Sap Green", "#4F7A2E"],
    viridian: ["Viridian", "#2E7A66"],
    hooker: ["Hooker's Green", "#3A6B3A"],
    diox: ["Dioxazine Purple", "#4A2C6A"],
    cobaltV: ["Cobalt Violet", "#8B5A9E"],
    burntS: ["Burnt Sienna", "#8A3B1E"],
    rawS: ["Raw Sienna", "#B8833B"],
    ochre: ["Yellow Ochre", "#C9953B"],
    burntU: ["Burnt Umber", "#5C3317"],
    venetian: ["Venetian Red", "#A33B2B"],
    payne: ["Payne's Grey", "#3D4A5C"],
  };

  // Recipe helper: r(pigmentKey, parts)
  const r = (key, parts) => ({ name: P[key][0], hex: P[key][1], parts });

  const DECKS = [
    {
      id: "skies",
      name: "Skies & atmosphere",
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
      id: "foliage",
      name: "Foliage & greens",
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
      id: "sunset",
      name: "Sunsets & sunrises",
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
      id: "autumn",
      name: "Autumn",
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
      id: "water",
      name: "Water & ocean",
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
      id: "skin",
      name: "Skin tones",
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
      id: "neutrals",
      name: "Neutrals & greys",
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
      id: "florals",
      name: "Florals",
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
  ];

  const el = {};
  let activeDeck = 0;
  let bound = false;

  function core() {
    return window.MixerCore;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cardSwatch(card) {
    const M = core();
    if (M && typeof M.mixPigments === "function") {
      return M.mixPigments(card.mix.map((p) => ({ hex: p.hex, factor: p.parts })));
    }
    return card.mix[0].hex;
  }

  function recipeHtml(card) {
    const parts = card.mix
      .map(
        (p) =>
          `<span class="deck-ing"><span class="deck-dot" style="background:${esc(
            p.hex
          )}"></span>${esc(p.name)}<span class="deck-x">×${p.parts}</span></span>`
      )
      .join('<span class="deck-plus">+</span>');
    return `${parts}<span class="deck-water">💧 water ${card.water}%</span>`;
  }

  function renderChips() {
    el.chips.innerHTML = DECKS.map(
      (d, i) =>
        `<button type="button" class="deck-chip${
          i === activeDeck ? " is-active" : ""
        }" data-deck="${i}" aria-pressed="${i === activeDeck}">${esc(d.name)}</button>`
    ).join("");
  }

  function renderCards() {
    const deck = DECKS[activeDeck];
    if (!deck) return;
    el.note.textContent = deck.note;
    el.grid.innerHTML = deck.cards
      .map(
        (card, i) => `
        <button type="button" class="deck-card" data-card="${i}" title="Load this recipe into the mixer">
          <span class="deck-swatch" style="background:${esc(cardSwatch(card))}"></span>
          <span class="deck-card-body">
            <span class="deck-card-name">${esc(card.name)}</span>
            <span class="deck-recipe">${recipeHtml(card)}</span>
          </span>
        </button>`
      )
      .join("");
  }

  function loadCard(card) {
    const M = core();
    if (!M) return;
    if (typeof M.pushUndo === "function") M.pushUndo();
    M.applySnapshot({
      mode: "watercolour",
      slots: card.mix.map((p, idx) => ({
        id: "deck-" + idx + "-" + Math.round(p.parts),
        name: p.name,
        hex: p.hex,
        parts: p.parts,
      })),
      water: card.water,
      white: 0,
      black: 0,
      opacity: 90,
      ground: "paper-white",
      glaze: [],
    });
    M.toast(`Loaded “${card.name}” — tweak it in Mix`);
    const mixer = document.querySelector(".mixer-panel");
    if (mixer) mixer.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function bind() {
    if (bound) return;
    el.panel = document.getElementById("decks-panel");
    el.chips = document.getElementById("deck-chips");
    el.note = document.getElementById("deck-note");
    el.grid = document.getElementById("deck-grid");
    if (!el.panel || !el.grid) return;
    bound = true;

    el.chips.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-deck]");
      if (!btn) return;
      activeDeck = Number(btn.dataset.deck);
      renderChips();
      renderCards();
    });

    el.grid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-card]");
      if (!btn) return;
      const deck = DECKS[activeDeck];
      loadCard(deck.cards[Number(btn.dataset.card)]);
    });

    let rendered = false;
    const ensure = () => {
      if (rendered) return;
      rendered = true;
      renderChips();
      renderCards();
    };
    if (el.panel.tagName === "DETAILS") {
      el.panel.addEventListener("toggle", () => {
        if (el.panel.open) ensure();
      });
      if (el.panel.open) ensure();
    } else {
      ensure();
    }
  }

  function boot() {
    if (!window.MixerCore) {
      setTimeout(boot, 40);
      return;
    }
    bind();
  }

  // Expose for anyone who wants the data (e.g. future print sheet).
  window.MIXING_DECKS = DECKS;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
