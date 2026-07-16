/**
 * Colour Mixer — watercolour & acrylic planning tool
 * Pigment mixing via spectral.js (Kubelka–Munk)
 */
(function () {
  "use strict";

  const MAX_SLOTS = 4;
  const HISTORY_KEY = "colour-mixer-history-v1";
  const CUSTOM_KEY = "colour-mixer-custom-v1";
  const MAX_HISTORY = 24;

  const BRAND_KEY = "colour-mixer-brand-v1";

  /** @type {{ mode: 'watercolour'|'acrylic', slots: MixSlot[], water: number, white: number, black: number, opacity: number, glaze: GlazeLayer[], ground: string, tipIndex: number, custom: Paint[], sampleHex: string|null, brandId: string }} */
  const state = {
    mode: "watercolour",
    slots: [],
    water: 40,
    white: 0,
    black: 0,
    opacity: 90,
    glaze: [],
    ground: "paper-white",
    tipIndex: 0,
    custom: loadJSON(CUSTOM_KEY, []),
    sampleHex: null,
    brandId: localStorage.getItem(BRAND_KEY) || "wn-pwc",
  };

  /**
   * @typedef {{ id: string, name: string, hex: string, parts: number, note?: string }} MixSlot
   * @typedef {{ id: string, name: string, hex: string, strength: number }} GlazeLayer
   * @typedef {{ id: string, name: string, hex: string, note?: string, family?: string, brandish?: string, acrylicOnly?: boolean }} Paint
   */

  // ——— DOM ———
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const el = {
    body: document.body,
    mixSlots: $("#mix-slots"),
    mixEmpty: $("#mix-empty"),
    waterSlider: $("#water-slider"),
    waterReadout: $("#water-readout"),
    whiteSlider: $("#white-slider"),
    whiteReadout: $("#white-readout"),
    blackSlider: $("#black-slider"),
    blackReadout: $("#black-readout"),
    opacitySlider: $("#opacity-slider"),
    opacityReadout: $("#opacity-readout"),
    swatchResult: $("#swatch-result"),
    swatchGround: $("#swatch-ground"),
    resultHex: $("#result-hex"),
    resultRgb: $("#result-rgb"),
    resultRecipe: $("#result-recipe"),
    comparePigment: $("#compare-pigment"),
    compareRgb: $("#compare-rgb"),
    copyHex: $("#copy-hex"),
    saveMix: $("#save-mix"),
    addGlazeFromMix: $("#add-glaze-from-mix"),
    clearMix: $("#clear-mix"),
    glazeLayers: $("#glaze-layers"),
    glazeEmpty: $("#glaze-empty"),
    glazePreview: $("#glaze-preview"),
    glazeHex: $("#glaze-hex"),
    copyGlazeHex: $("#copy-glaze-hex"),
    useGlazeAsMix: $("#use-glaze-as-mix"),
    clearGlaze: $("#clear-glaze"),
    groundSelect: $("#ground-select"),
    paletteLimited: $("#palette-limited"),
    paletteBrands: $("#palette-brands"),
    paletteBrandGrid: $("#palette-brand-grid"),
    brandSelect: $("#brand-select"),
    brandMeta: $("#brand-meta"),
    paletteNamed: $("#palette-named"),
    paletteCustom: $("#palette-custom"),
    customSwatches: $("#custom-swatches"),
    customColor: $("#custom-color"),
    customName: $("#custom-name"),
    addCustomSwatch: $("#add-custom-swatch"),
    addCustomToMix: $("#add-custom-to-mix"),
    paletteHint: $("#palette-hint"),
    photoInput: $("#photo-input"),
    photoWorkspace: $("#photo-workspace"),
    photoCanvas: $("#photo-canvas"),
    sampleSwatch: $("#sample-swatch"),
    sampleHex: $("#sample-hex"),
    sampleToMix: $("#sample-to-mix"),
    matchSuggestions: $("#match-suggestions"),
    tipText: $("#tip-text"),
    nextTip: $("#next-tip"),
    historyList: $("#history-list"),
    clearHistory: $("#clear-history"),
    toast: $("#toast"),
  };

  // ——— Utils ———
  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota */
    }
  }

  function uid(prefix = "id") {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function hexToRgb(hex) {
    const h = hex.replace("#", "").trim();
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const n = parseInt(full, 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
    };
  }

  function rgbToHex(r, g, b) {
    const to = (v) =>
      clamp(Math.round(v), 0, 255)
        .toString(16)
        .padStart(2, "0");
    return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  }

  function normalizeHex(hex) {
    if (!hex) return "#FFFFFF";
    let h = String(hex).trim();
    if (!h.startsWith("#")) h = "#" + h;
    const rgb = hexToRgb(h);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function toast(msg) {
    el.toast.hidden = false;
    el.toast.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      el.toast.hidden = true;
    }, 1800);
  }

  function spectralAvailable() {
    return typeof spectral !== "undefined" && spectral.Color && spectral.mix;
  }

  /** Mix pigments with spectral.js; fall back to weighted RGB if needed. */
  function mixPigments(entries) {
    // entries: [{ hex, factor }] factor > 0
    const valid = entries.filter((e) => e.factor > 0 && e.hex);
    if (!valid.length) return "#FFFFFF";

    if (spectralAvailable()) {
      try {
        const args = valid.map((e) => [
          new spectral.Color(normalizeHex(e.hex)),
          e.factor,
        ]);
        const mixed = spectral.mix(...args);
        return normalizeHex(mixed.toString({ format: "hex" }));
      } catch (err) {
        console.warn("spectral.mix failed, falling back", err);
      }
    }

    // RGB weighted average fallback
    let r = 0,
      g = 0,
      b = 0,
      t = 0;
    for (const e of valid) {
      const c = hexToRgb(normalizeHex(e.hex));
      r += c.r * e.factor;
      g += c.g * e.factor;
      b += c.b * e.factor;
      t += e.factor;
    }
    return rgbToHex(r / t, g / t, b / t);
  }

  function mixRgbAverage(entries) {
    const valid = entries.filter((e) => e.factor > 0 && e.hex);
    if (!valid.length) return "#FFFFFF";
    let r = 0,
      g = 0,
      b = 0,
      t = 0;
    for (const e of valid) {
      const c = hexToRgb(normalizeHex(e.hex));
      r += c.r * e.factor;
      g += c.g * e.factor;
      b += c.b * e.factor;
      t += e.factor;
    }
    return rgbToHex(r / t, g / t, b / t);
  }

  /** Alpha composite src over dst. alpha 0–1. */
  function compositeOver(dstHex, srcHex, alpha) {
    const a = clamp(alpha, 0, 1);
    const d = hexToRgb(normalizeHex(dstHex));
    const s = hexToRgb(normalizeHex(srcHex));
    return rgbToHex(
      s.r * a + d.r * (1 - a),
      s.g * a + d.g * (1 - a),
      s.b * a + d.b * (1 - a)
    );
  }

  /**
   * Optical glaze: blend glaze pigment toward underpainting with spectral mix,
   * then composite. strength 0–1 = wash strength / covering.
   */
  function applyGlazeLayer(underHex, layerHex, strength) {
    const s = clamp(strength, 0, 1);
    if (s <= 0.001) return underHex;

    // Mix under + glaze pigment by strength for more paint-like optical shift
    const optical = mixPigments([
      { hex: underHex, factor: 1 - s * 0.85 },
      { hex: layerHex, factor: s },
    ]);
    // Soften with alpha composite so paper/canvas still reads
    return compositeOver(underHex, optical, Math.min(1, s * 1.05));
  }

  function groundHex() {
    const g = window.GROUNDS[state.ground];
    return g ? g.hex : "#FFFEFA";
  }

  // ——— Core mix computation ———
  function baseMixEntries() {
    return state.slots.map((s) => ({
      hex: s.hex,
      factor: Math.max(0.01, s.parts),
      name: s.name,
      parts: s.parts,
    }));
  }

  function computeMassTone() {
    const entries = baseMixEntries();
    if (!entries.length) return null;

    if (state.mode === "acrylic") {
      const extra = [...entries];
      // white/black as % of total pigment weight
      const pigmentTotal = entries.reduce((a, e) => a + e.factor, 0);
      if (state.white > 0) {
        extra.push({
          hex: "#F7F5F0",
          factor: (state.white / 100) * pigmentTotal * 1.4,
          name: "Titanium White",
        });
      }
      if (state.black > 0) {
        extra.push({
          hex: "#1A1A1A",
          factor: (state.black / 100) * pigmentTotal * 1.1,
          name: "Carbon Black",
        });
      }
      return {
        pigment: mixPigments(extra),
        rgbAvg: mixRgbAverage(extra),
        entries: extra,
      };
    }

    // Watercolour: pure pigment mix (dilution applied at display)
    return {
      pigment: mixPigments(entries),
      rgbAvg: mixRgbAverage(entries),
      entries,
    };
  }

  function computeDisplayedResult() {
    const mass = computeMassTone();
    const ground = groundHex();
    if (!mass) {
      return {
        display: ground,
        mass: null,
        pigment: ground,
        rgbAvg: ground,
        alpha: 0,
        recipe: "Add paints to build a recipe.",
      };
    }

    let display;
    let alpha;

    if (state.mode === "watercolour") {
      // water 0 = full strength, 95 = very pale wash
      alpha = 1 - state.water / 100;
      // slight spectral lift toward paper for very watery washes
      const wash =
        state.water > 5
          ? mixPigments([
              { hex: mass.pigment, factor: Math.max(0.05, alpha) },
              { hex: ground, factor: state.water / 100 },
            ])
          : mass.pigment;
      display = compositeOver(ground, wash, clamp(alpha * 1.05, 0.05, 1));
    } else {
      alpha = state.opacity / 100;
      display = compositeOver(ground, mass.pigment, alpha);
    }

    return {
      display,
      mass: mass.pigment,
      pigment: mass.pigment,
      rgbAvg: mass.rgbAvg,
      alpha,
      recipe: buildRecipe(mass.entries),
    };
  }

  function buildRecipe(entries) {
    if (!entries || !entries.length) return "Add paints to build a recipe.";

    // Normalize parts for display
    const named = entries.filter((e) => e.name);
    const fromSlots = named.length ? named : entries;

    // Use original slot parts when possible
    if (state.slots.length) {
      const total = state.slots.reduce((a, s) => a + s.parts, 0) || 1;
      const parts = state.slots
        .map((s) => {
          const pct = Math.round((s.parts / total) * 100);
          return `${s.parts} part${s.parts === 1 ? "" : "s"} ${s.name} (${pct}%)`;
        })
        .join(" + ");

      let suffix = "";
      if (state.mode === "watercolour") {
        suffix = ` · water ~${state.water}% (wash strength ${100 - state.water}%)`;
      } else {
        const bits = [];
        if (state.white > 0) bits.push(`+${state.white}% white`);
        if (state.black > 0) bits.push(`+${state.black}% black`);
        bits.push(`body ${state.opacity}%`);
        suffix = " · " + bits.join(", ");
      }
      return parts + suffix;
    }

    return fromSlots.map((e) => e.name || e.hex).join(" + ");
  }

  function computeGlazeComposite() {
    let under = groundHex();
    for (const layer of state.glaze) {
      under = applyGlazeLayer(under, layer.hex, layer.strength / 100);
    }
    return under;
  }

  // ——— Render ———
  function renderMode() {
    el.body.dataset.mode = state.mode;
    $$(".mode-btn").forEach((btn) => {
      const active = btn.dataset.mode === state.mode;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
    $$("[data-show-mode]").forEach((node) => {
      const show = node.dataset.showMode === state.mode;
      node.hidden = !show;
    });
    // Sensible ground default when switching medium
    if (state.mode === "acrylic" && state.ground.startsWith("paper")) {
      state.ground = "canvas";
      el.groundSelect.value = "canvas";
    } else if (state.mode === "watercolour" && state.ground === "canvas") {
      state.ground = "paper-white";
      el.groundSelect.value = "paper-white";
    }
    // Ensure selected brand is valid for this medium
    const brands = brandsForMode();
    if (brands.length && !brands.some((b) => b.id === state.brandId)) {
      state.brandId = brands[0].id;
      try {
        localStorage.setItem(BRAND_KEY, state.brandId);
      } catch {
        /* ignore */
      }
    }
    renderTip();
    renderPalettes();
    renderAll();
  }

  function brandsForMode() {
    const list = window.BRAND_PALETTES || [];
    return list.filter((b) => {
      if (b.medium === "both") return true;
      if (state.mode === "watercolour") return b.medium === "watercolour";
      return b.medium === "acrylic";
    });
  }

  function currentBrand() {
    const brands = brandsForMode();
    let brand = brands.find((b) => b.id === state.brandId);
    if (!brand) {
      brand = brands[0] || null;
      if (brand) state.brandId = brand.id;
    }
    return brand;
  }

  function renderBrandSelect() {
    if (!el.brandSelect) return;
    const brands = brandsForMode();
    el.brandSelect.innerHTML = brands
      .map(
        (b) =>
          `<option value="${escapeHtml(b.id)}">${escapeHtml(b.brand)} — ${escapeHtml(b.line)}</option>`
      )
      .join("");
    const brand = currentBrand();
    if (brand) {
      el.brandSelect.value = brand.id;
      el.brandMeta.textContent = brand.note
        ? `${brand.note} · approx. mass-tones for planning`
        : "Approximate mass-tones for planning — not brand-certified.";
    } else {
      el.brandMeta.textContent = "No brand lines for this medium.";
    }
  }

  function renderBrandGrid() {
    const brand = currentBrand();
    if (!brand || !el.paletteBrandGrid) {
      if (el.paletteBrandGrid) el.paletteBrandGrid.innerHTML = "";
      return;
    }
    const paints = brand.paints
      .filter((p) => !(state.mode === "watercolour" && p.acrylicOnly))
      .map((p) => ({
        ...p,
        id: p.id || `${brand.id}-${p.name}`,
        name: p.name,
        // Prefix brand short name in mix recipe for clarity
        displayBrand: brand.brand,
        brandLine: brand.line,
      }));
    paintGrid(el.paletteBrandGrid, paints, false, {
      showPigment: true,
      brandLabel: `${brand.brand} ${brand.line}`,
    });
  }

  function renderPalettes() {
    paintGrid(el.paletteLimited, window.PAINT_PALETTES.limited);
    const named = window.PAINT_PALETTES.named.filter((p) => {
      if (state.mode === "watercolour" && p.acrylicOnly) return false;
      return true;
    });
    paintGrid(el.paletteNamed, named);
    paintGrid(el.customSwatches, state.custom, true);
    renderBrandSelect();
    renderBrandGrid();
  }

  function paintGrid(container, paints, isCustom = false, opts = {}) {
    if (!container) return;
    container.innerHTML = "";
    paints.forEach((paint) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "swatch-btn";
      const bits = [
        paint.name,
        paint.pigment,
        paint.note || paint.brandish || "",
        opts.brandLabel,
        paint.hex,
      ].filter(Boolean);
      btn.title = bits.join(" — ");
      const pigmentHtml =
        opts.showPigment && paint.pigment
          ? `<span class="pigment">${escapeHtml(paint.pigment)}</span>`
          : "";
      btn.innerHTML = `<span class="chip" style="background:${normalizeHex(paint.hex)}"></span><span class="label">${escapeHtml(paint.name)}${pigmentHtml}</span>`;
      btn.addEventListener("click", () => {
        // When adding brand paint, include brand in the slot name if useful
        const mixPaint = { ...paint };
        if (paint.displayBrand && !paint.name.includes(paint.displayBrand)) {
          // Keep short tube name for recipe readability; brand is in title
          mixPaint.note = [paint.displayBrand, paint.brandLine, paint.note]
            .filter(Boolean)
            .join(" · ");
        }
        addToMix(mixPaint);
      });
      if (isCustom) {
        btn.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          state.custom = state.custom.filter((c) => c.id !== paint.id);
          saveJSON(CUSTOM_KEY, state.custom);
          renderPalettes();
          toast("Removed custom swatch");
        });
      }
      container.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMixSlots() {
    el.mixSlots.innerHTML = "";
    el.mixEmpty.hidden = state.slots.length > 0;

    state.slots.forEach((slot, index) => {
      const row = document.createElement("div");
      row.className = "mix-slot";
      row.innerHTML = `
        <div class="slot-chip" style="background:${normalizeHex(slot.hex)}"></div>
        <div class="slot-meta">
          <div class="slot-name">${escapeHtml(slot.name)}</div>
          <div class="slot-parts">
            <input type="range" min="1" max="12" step="1" value="${slot.parts}" data-slot-index="${index}" aria-label="Parts for ${escapeHtml(slot.name)}" />
            <span class="parts-val">${slot.parts} part${slot.parts === 1 ? "" : "s"}</span>
          </div>
        </div>
        <button type="button" class="remove-slot" data-remove="${index}" aria-label="Remove ${escapeHtml(slot.name)}">×</button>
      `;
      el.mixSlots.appendChild(row);
    });
  }

  function renderResult() {
    const result = computeDisplayedResult();
    const ground = groundHex();

    el.swatchGround.style.backgroundColor = ground;
    el.swatchResult.style.backgroundColor = result.display;
    el.resultHex.textContent = result.display;
    const rgb = hexToRgb(result.display);
    el.resultRgb.textContent = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    el.resultRecipe.textContent = result.recipe;

    el.comparePigment.style.backgroundColor = result.pigment;
    el.compareRgb.style.backgroundColor = result.rgbAvg;

    const hasMix = state.slots.length > 0;
    el.saveMix.disabled = !hasMix;
    el.addGlazeFromMix.disabled = !hasMix;

    // Readouts
    el.waterReadout.textContent = `${state.water}%`;
    el.whiteReadout.textContent = `${state.white}%`;
    el.blackReadout.textContent = `${state.black}%`;
    el.opacityReadout.textContent = `${state.opacity}%`;
  }

  function renderGlaze() {
    el.glazeLayers.innerHTML = "";
    el.glazeEmpty.hidden = state.glaze.length > 0;

    state.glaze.forEach((layer, index) => {
      const li = document.createElement("li");
      li.className = "glaze-layer";
      li.innerHTML = `
        <div class="layer-chip" style="background:${normalizeHex(layer.hex)}"></div>
        <div>
          <div class="layer-name">${index + 1}. ${escapeHtml(layer.name)}</div>
          <div class="layer-controls">
            <input type="range" min="5" max="100" value="${layer.strength}" data-glaze-index="${index}" aria-label="Strength for ${escapeHtml(layer.name)}" />
            <span class="parts-val">${layer.strength}%</span>
          </div>
        </div>
        <button type="button" class="remove-slot" data-remove-glaze="${index}" aria-label="Remove layer">×</button>
      `;
      el.glazeLayers.appendChild(li);
    });

    const composite = computeGlazeComposite();
    el.glazePreview.style.backgroundColor = composite;
    // subtle paper texture feel
    el.glazePreview.style.backgroundImage = `linear-gradient(0deg, ${composite}, ${composite})`;
    el.glazeHex.textContent = state.glaze.length ? composite : "—";
    el.copyGlazeHex.disabled = !state.glaze.length;
    el.useGlazeAsMix.disabled = !state.glaze.length;
  }

  function renderTip() {
    const tips = window.MODE_TIPS[state.mode] || [];
    if (!tips.length) return;
    state.tipIndex = state.tipIndex % tips.length;
    el.tipText.textContent = tips[state.tipIndex];
  }

  function renderHistory() {
    const history = loadJSON(HISTORY_KEY, []);
    el.historyList.innerHTML = "";
    if (!history.length) {
      const empty = document.createElement("li");
      empty.className = "micro";
      empty.textContent = "No saved mixes yet.";
      empty.style.listStyle = "none";
      el.historyList.appendChild(empty);
      return;
    }
    history.forEach((item, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "history-item";
      btn.innerHTML = `
        <span class="h-chip" style="background:${normalizeHex(item.displayHex)}"></span>
        <span class="h-text">${escapeHtml(item.recipe)}</span>
        <span class="micro">${item.mode === "acrylic" ? "Ac" : "WC"}</span>
      `;
      btn.title = "Load this mix";
      btn.addEventListener("click", () => loadHistoryItem(item));
      el.historyList.appendChild(btn);
    });
  }

  function renderAll() {
    renderMixSlots();
    renderResult();
    renderGlaze();
    renderHistory();
  }

  // ——— Actions ———
  function addToMix(paint) {
    if (state.slots.length >= MAX_SLOTS) {
      toast(`Max ${MAX_SLOTS} paints in a mix`);
      return;
    }
    // If same paint already in mix, bump parts
    const existing = state.slots.find(
      (s) => s.hex.toLowerCase() === normalizeHex(paint.hex).toLowerCase() && s.name === paint.name
    );
    if (existing) {
      existing.parts = Math.min(12, existing.parts + 1);
    } else {
      state.slots.push({
        id: uid("slot"),
        name: paint.name,
        hex: normalizeHex(paint.hex),
        parts: 1,
        note: paint.note,
      });
    }
    renderAll();
  }

  function clearMix() {
    state.slots = [];
    state.water = 40;
    state.white = 0;
    state.black = 0;
    state.opacity = 90;
    el.waterSlider.value = "40";
    el.whiteSlider.value = "0";
    el.blackSlider.value = "0";
    el.opacitySlider.value = "90";
    renderAll();
  }

  function saveCurrentMix() {
    const result = computeDisplayedResult();
    if (!state.slots.length) return;
    const history = loadJSON(HISTORY_KEY, []);
    history.unshift({
      id: uid("hist"),
      mode: state.mode,
      slots: state.slots.map((s) => ({ ...s })),
      water: state.water,
      white: state.white,
      black: state.black,
      opacity: state.opacity,
      displayHex: result.display,
      massHex: result.pigment,
      recipe: result.recipe,
      ts: Date.now(),
    });
    saveJSON(HISTORY_KEY, history.slice(0, MAX_HISTORY));
    renderHistory();
    toast("Saved to history");
  }

  function loadHistoryItem(item) {
    state.mode = item.mode === "acrylic" ? "acrylic" : "watercolour";
    state.slots = (item.slots || []).map((s) => ({ ...s }));
    state.water = item.water ?? 40;
    state.white = item.white ?? 0;
    state.black = item.black ?? 0;
    state.opacity = item.opacity ?? 90;
    el.waterSlider.value = String(state.water);
    el.whiteSlider.value = String(state.white);
    el.blackSlider.value = String(state.black);
    el.opacitySlider.value = String(state.opacity);
    renderMode();
    toast("Loaded mix");
  }

  function addGlazeFromMix() {
    const result = computeDisplayedResult();
    if (!state.slots.length) return;
    const name =
      state.slots.length === 1
        ? state.slots[0].name
        : `Mix (${state.slots.map((s) => s.name.split(" ")[0]).join("+")})`;
    const strength =
      state.mode === "watercolour"
        ? Math.round(100 - state.water)
        : state.opacity;
    state.glaze.push({
      id: uid("glaze"),
      name,
      hex: result.pigment,
      strength: clamp(strength, 5, 100),
    });
    renderGlaze();
    toast("Glaze layer added");
  }

  function clearGlaze() {
    state.glaze = [];
    renderGlaze();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied " + text);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("Copied " + text);
    }
  }

  // ——— Photo match ———
  let photoImage = null;

  function drawPhoto() {
    const canvas = el.photoCanvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!photoImage) return;
    const maxW = 480;
    const scale = Math.min(1, maxW / photoImage.width);
    canvas.width = Math.round(photoImage.width * scale);
    canvas.height = Math.round(photoImage.height * scale);
    ctx.drawImage(photoImage, 0, 0, canvas.width, canvas.height);
  }

  function sampleAt(clientX, clientY) {
    const canvas = el.photoCanvas;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const pixel = ctx.getImageData(
      clamp(x, 0, canvas.width - 1),
      clamp(y, 0, canvas.height - 1),
      1,
      1
    ).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    state.sampleHex = hex;
    el.sampleSwatch.style.backgroundColor = hex;
    el.sampleHex.textContent = hex;
    el.sampleToMix.disabled = false;
    suggestMatches(hex);
  }

  function colorDistance(hexA, hexB) {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    // simple weighted Euclidean in RGB (good enough for ranking)
    const dr = a.r - b.r;
    const dg = a.g - b.g;
    const db = a.b - b.b;
    return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
  }

  function allPalettePaints() {
    const brand = currentBrand();
    const brandPaints = brand
      ? brand.paints
          .filter((p) => !(state.mode === "watercolour" && p.acrylicOnly))
          .map((p) => ({ ...p, name: p.name }))
      : [];
    return [
      ...window.PAINT_PALETTES.limited,
      ...brandPaints,
      ...window.PAINT_PALETTES.named.filter(
        (p) => !(state.mode === "watercolour" && p.acrylicOnly)
      ),
      ...state.custom,
    ];
  }

  function suggestMatches(targetHex) {
    const paints = allPalettePaints();
    // Best single paints
    const singles = paints
      .map((p) => ({
        type: "single",
        paints: [p],
        hex: normalizeHex(p.hex),
        dist: colorDistance(targetHex, p.hex),
        label: p.name,
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);

    // Best 2-paint mixes (limited set only for performance)
    const limited = window.PAINT_PALETTES.limited;
    const pairs = [];
    for (let i = 0; i < limited.length; i++) {
      for (let j = i + 1; j < limited.length; j++) {
        for (const ratio of [
          [2, 1],
          [1, 1],
          [1, 2],
          [3, 1],
          [1, 3],
        ]) {
          const hex = mixPigments([
            { hex: limited[i].hex, factor: ratio[0] },
            { hex: limited[j].hex, factor: ratio[1] },
          ]);
          pairs.push({
            type: "mix",
            paints: [limited[i], limited[j]],
            ratio,
            hex,
            dist: colorDistance(targetHex, hex),
            label: `${ratio[0]} ${limited[i].name.split(" (")[0]} + ${ratio[1]} ${limited[j].name.split(" (")[0]}`,
          });
        }
      }
    }
    pairs.sort((a, b) => a.dist - b.dist);
    const bestPairs = pairs.slice(0, 4);

    const suggestions = [...singles, ...bestPairs]
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);

    // Keep payloads out of HTML attributes (safer + no JSON escaping issues)
    el.matchSuggestions._payloads = suggestions.map((s) => ({
      type: s.type,
      paints: s.paints.map((p) => ({ name: p.name, hex: p.hex })),
      ratio: s.ratio || [1],
    }));

    el.matchSuggestions.innerHTML =
      `<p class="micro" style="margin:0 0 0.35rem">Closest from limited palette / singles:</p>` +
      suggestions
        .map((s, idx) => {
          return `<div class="match-row" data-match-idx="${idx}">
            <span class="mini" style="background:${s.hex}"></span>
            <span style="flex:1">${escapeHtml(s.label)}</span>
            <button type="button" class="btn btn-ghost btn-sm apply-match-btn">Use</button>
          </div>`;
        })
        .join("");
  }

  // ——— Events ———
  function bindEvents() {
    $$(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.mode = btn.dataset.mode;
        renderMode();
      });
    });

    $$(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        $$(".tab").forEach((t) => {
          t.classList.toggle("is-active", t === tab);
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        const which = tab.dataset.paletteTab;
        const panels = {
          limited: el.paletteLimited,
          brands: el.paletteBrands,
          named: el.paletteNamed,
          custom: el.paletteCustom,
        };
        Object.entries(panels).forEach(([key, node]) => {
          if (!node) return;
          const show = key === which;
          node.hidden = !show;
          node.classList.toggle("hidden", !show);
        });
        const hints = {
          limited:
            "Tap a paint to add it to the mix. Split-primary + earths — a classic planning set.",
          brands:
            "Popular brand lines (W&N, Daniel Smith, Schmincke, Golden…). Hexes ≈ mass-tones for planning only.",
          named:
            "Generic common names. Prefer Brands when you know your tube manufacturer.",
          custom:
            "Free pickers for any colour. Long-press / right-click a custom swatch to remove it.",
        };
        el.paletteHint.textContent = hints[which] || hints.limited;
      });
    });

    if (el.brandSelect) {
      el.brandSelect.addEventListener("change", () => {
        state.brandId = el.brandSelect.value;
        try {
          localStorage.setItem(BRAND_KEY, state.brandId);
        } catch {
          /* ignore */
        }
        renderBrandGrid();
        const brand = currentBrand();
        if (brand) {
          el.brandMeta.textContent = brand.note
            ? `${brand.note} · approx. mass-tones for planning`
            : "Approximate mass-tones for planning — not brand-certified.";
        }
      });
    }

    el.mixSlots.addEventListener("input", (e) => {
      const t = e.target;
      if (t.matches("input[type=range][data-slot-index]")) {
        const i = Number(t.dataset.slotIndex);
        if (state.slots[i]) {
          state.slots[i].parts = Number(t.value);
          renderResult();
          // update label without full re-render of slots (keeps focus)
          const val = t.parentElement.querySelector(".parts-val");
          if (val) {
            const p = state.slots[i].parts;
            val.textContent = `${p} part${p === 1 ? "" : "s"}`;
          }
        }
      }
    });

    el.mixSlots.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove]");
      if (!btn) return;
      const i = Number(btn.dataset.remove);
      state.slots.splice(i, 1);
      renderAll();
    });

    el.waterSlider.addEventListener("input", () => {
      state.water = Number(el.waterSlider.value);
      renderResult();
    });
    el.whiteSlider.addEventListener("input", () => {
      state.white = Number(el.whiteSlider.value);
      renderResult();
    });
    el.blackSlider.addEventListener("input", () => {
      state.black = Number(el.blackSlider.value);
      renderResult();
    });
    el.opacitySlider.addEventListener("input", () => {
      state.opacity = Number(el.opacitySlider.value);
      renderResult();
    });

    el.clearMix.addEventListener("click", clearMix);
    el.saveMix.addEventListener("click", saveCurrentMix);
    el.addGlazeFromMix.addEventListener("click", addGlazeFromMix);
    el.clearGlaze.addEventListener("click", clearGlaze);

    el.copyHex.addEventListener("click", () =>
      copyText(el.resultHex.textContent)
    );
    el.copyGlazeHex.addEventListener("click", () => {
      if (el.glazeHex.textContent !== "—") copyText(el.glazeHex.textContent);
    });

    el.useGlazeAsMix.addEventListener("click", () => {
      const hex = computeGlazeComposite();
      state.slots = [
        {
          id: uid("slot"),
          name: "Glaze result",
          hex,
          parts: 1,
        },
      ];
      state.water = 0;
      state.white = 0;
      state.black = 0;
      state.opacity = 100;
      el.waterSlider.value = "0";
      el.whiteSlider.value = "0";
      el.blackSlider.value = "0";
      el.opacitySlider.value = "100";
      renderAll();
      toast("Glaze loaded as mix base");
      el.resultHex.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    el.groundSelect.addEventListener("change", () => {
      state.ground = el.groundSelect.value;
      renderResult();
      renderGlaze();
    });

    el.glazeLayers.addEventListener("input", (e) => {
      const t = e.target;
      if (t.matches("input[data-glaze-index]")) {
        const i = Number(t.dataset.glazeIndex);
        if (state.glaze[i]) {
          state.glaze[i].strength = Number(t.value);
          const val = t.parentElement.querySelector(".parts-val");
          if (val) val.textContent = `${t.value}%`;
          // partial update
          const composite = computeGlazeComposite();
          el.glazePreview.style.backgroundColor = composite;
          el.glazeHex.textContent = composite;
        }
      }
    });

    el.glazeLayers.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-remove-glaze]");
      if (!btn) return;
      state.glaze.splice(Number(btn.dataset.removeGlaze), 1);
      renderGlaze();
    });

    el.addCustomSwatch.addEventListener("click", () => {
      const hex = normalizeHex(el.customColor.value);
      const name = (el.customName.value || "Custom colour").trim();
      state.custom.unshift({ id: uid("custom"), name, hex });
      state.custom = state.custom.slice(0, 24);
      saveJSON(CUSTOM_KEY, state.custom);
      renderPalettes();
      toast("Added to custom palette");
    });

    el.addCustomToMix.addEventListener("click", () => {
      const hex = normalizeHex(el.customColor.value);
      const name = (el.customName.value || "Custom colour").trim();
      addToMix({ name, hex });
    });

    el.nextTip.addEventListener("click", () => {
      state.tipIndex += 1;
      renderTip();
    });

    el.clearHistory.addEventListener("click", () => {
      saveJSON(HISTORY_KEY, []);
      renderHistory();
      toast("History cleared");
    });

    el.photoInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        photoImage = img;
        el.photoWorkspace.classList.remove("hidden");
        drawPhoto();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    el.photoCanvas.addEventListener("click", (e) => {
      sampleAt(e.clientX, e.clientY);
    });

    el.sampleToMix.addEventListener("click", () => {
      if (!state.sampleHex) return;
      addToMix({ name: `Sample ${state.sampleHex}`, hex: state.sampleHex });
    });

    el.matchSuggestions.addEventListener("click", (e) => {
      const btn = e.target.closest(".apply-match-btn");
      if (!btn) return;
      const row = btn.closest("[data-match-idx]");
      if (!row) return;
      const payloads = el.matchSuggestions._payloads || [];
      const data = payloads[Number(row.dataset.matchIdx)];
      if (!data) return;
      state.slots = data.paints.map((p, i) => ({
        id: uid("slot"),
        name: p.name,
        hex: normalizeHex(p.hex),
        parts: data.ratio ? data.ratio[i] || 1 : 1,
      }));
      renderAll();
      toast("Match applied to mix");
    });
  }

  // ——— Init ———
  function init() {
    if (!spectralAvailable()) {
      console.warn("spectral.js not loaded — using RGB fallback");
    }
    // Sync ground select default for watercolour
    el.groundSelect.value = "paper-white";
    state.ground = "paper-white";
    bindEvents();
    renderMode();
    renderPalettes();
    renderAll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
