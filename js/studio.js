/**
 * Studio features for Colour Mixer — mud, harmonies, chart, export,
 * print, saved palettes, compare A/B, share/QR, light preview, undo UI.
 * Depends on window.MixerCore from app.js
 */
(function () {
  "use strict";

  const SAVED_KEY = "colour-mixer-saved-palettes-v1";
  const COMPARE_KEY = "colour-mixer-compare-v1";

  function core() {
    return window.MixerCore;
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }

  function clamp(n, a, b) {
    return Math.min(b, Math.max(a, n));
  }

  function hueDistance(a, b) {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const to = (v) =>
      Math.round((v + m) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  }

  // ——— Mud score ———
  function computeMud(slots, resultHex, hexToHsl) {
    if (!slots.length) return null;
    let score = 0;
    const notes = [];
    if (slots.length >= 4) {
      score += 35;
      notes.push("4 paints — easy mud");
    } else if (slots.length === 3) {
      score += 18;
      notes.push("3 paints");
    }
    const hues = slots
      .map((s) => hexToHsl(s.hex))
      .filter((h) => h.s > 0.12);
    for (let i = 0; i < hues.length; i++) {
      for (let j = i + 1; j < hues.length; j++) {
        const d = hueDistance(hues[i].h, hues[j].h);
        if (d > 150 && d < 210) {
          score += 28;
          notes.push("complementary pair");
        } else if (d > 120 && d < 150) {
          score += 12;
        }
      }
    }
    const res = hexToHsl(resultHex);
    if (slots.length >= 2 && res.s < 0.14 && res.l > 0.15 && res.l < 0.85) {
      score += 22;
      notes.push("low chroma result");
    }
    score = clamp(score, 0, 100);
    let level = "clean";
    if (score >= 55) level = "high";
    else if (score >= 30) level = "watch";
    return { score, level, notes: [...new Set(notes)] };
  }

  function renderMud(detail) {
    const row = $("#mud-row");
    const badge = $("#mud-badge");
    const note = $("#mud-note");
    if (!row || !badge) return;
    const M = core();
    if (!M || !detail.slots.length) {
      row.hidden = true;
      return;
    }
    const mud = computeMud(detail.slots, detail.result.display, M.hexToHsl);
    if (!mud) {
      row.hidden = true;
      return;
    }
    row.hidden = false;
    row.dataset.level = mud.level;
    badge.textContent =
      mud.level === "clean"
        ? "Clean mix"
        : mud.level === "watch"
          ? "Mud watch"
          : "Mud risk";
    badge.className = "mud-badge mud-" + mud.level;
    if (note) {
      note.textContent =
        mud.notes.length
          ? mud.notes.join(" · ") + ` (${mud.score})`
          : mud.level === "clean"
            ? "Looking clear"
            : "";
    }
  }

  // ——— Harmonies ———
  function renderHarmonies(detail) {
    const row = $("#harmony-row");
    const box = $("#harmony-swatches");
    if (!row || !box) return;
    const M = core();
    if (!M || !detail.slots.length) {
      row.hidden = true;
      return;
    }
    const hsl = M.hexToHsl(detail.result.display);
    if (hsl.s < 0.06) {
      row.hidden = true;
      return;
    }
    row.hidden = false;
    const h = hsl.h;
    const items = [
      { label: "Complement", hue: (h + 180) % 360 },
      { label: "Analog −30°", hue: (h + 330) % 360 },
      { label: "Analog +30°", hue: (h + 30) % 360 },
      { label: "Triad +120°", hue: (h + 120) % 360 },
      { label: "Triad +240°", hue: (h + 240) % 360 },
    ];
    box.innerHTML = items
      .map((it) => {
        const hex = hslToHex(it.hue, Math.max(0.45, hsl.s), 0.5);
        return `<button type="button" class="harmony-chip" data-harm-hex="${hex}" data-harm-label="${it.label}" title="Add nearest limited paint">
          <span class="harmony-sw" style="background:${hex}"></span>
          <span class="harmony-lbl">${it.label}</span>
        </button>`;
      })
      .join("");
  }

  // ——— Light preview (multi-illuminant, linear-RGB gains) ———
  let lightMode = "day";

  /** Approximate RGB gains for common viewing lights (planning only). */
  const ILLUMINANTS = {
    day: {
      label: "Daylight (D65-ish)",
      gains: [1.0, 1.0, 1.0],
      groundTint: [1, 1, 1],
    },
    warm: {
      label: "Warm lamp (~2700K)",
      // tungsten: strong R, weak B
      gains: [1.28, 1.06, 0.62],
      groundTint: [1.08, 1.02, 0.88],
    },
    cool: {
      label: "Cool / north light",
      gains: [0.82, 0.94, 1.22],
      groundTint: [0.94, 0.97, 1.06],
    },
  };

  function srgbToLinear(c) {
    c = c / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb(c) {
    c = clamp(c, 0, 1);
    const v =
      c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(clamp(v, 0, 1) * 255);
  }

  function rgbToHexLocal(r, g, b) {
    const to = (v) =>
      clamp(Math.round(v), 0, 255)
        .toString(16)
        .padStart(2, "0");
    return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
  }

  /**
   * Simulate mix colour under an illuminant.
   * Multiplies linear RGB by gains, optionally tints ground then recomposites.
   */
  function simulateUnderLight(displayHex, groundHex, illuminantKey, alpha) {
    const M = core();
    const ill = ILLUMINANTS[illuminantKey] || ILLUMINANTS.day;
    const [gr, gg, gb] = ill.gains;
    const [tr, tg, tb] = ill.groundTint;

    const applyGains = (hex, useGroundTint) => {
      if (!M) return hex;
      const { r, g, b } = M.hexToRgb(M.normalizeHex(hex));
      let lr = srgbToLinear(r);
      let lg = srgbToLinear(g);
      let lb = srgbToLinear(b);
      if (useGroundTint) {
        lr *= tr;
        lg *= tg;
        lb *= tb;
      } else {
        lr *= gr;
        lg *= gg;
        lb *= gb;
      }
      // Mild luminance normalize so warm/cool don't just look darker
      const y0 = 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
      const y1 = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      if (y1 > 1e-6 && illuminantKey !== "day") {
        const scale = Math.pow(y0 / y1, 0.35); // partial restore
        lr *= scale;
        lg *= scale;
        lb *= scale;
      }
      return rgbToHexLocal(linearToSrgb(lr), linearToSrgb(lg), linearToSrgb(lb));
    };

    const litPaint = applyGains(displayHex, false);
    if (!groundHex || alpha == null || alpha >= 0.98) {
      return litPaint;
    }
    // Paper/canvas also shifts under the lamp
    const litGround = applyGains(groundHex, true);
    return M.compositeOver(litGround, litPaint, clamp(alpha, 0, 1));
  }

  function applyLightPreview(detail) {
    const stage = $("#swatch-result");
    const groundEl = $("#swatch-ground");
    const sticky = $("#sticky-swatch");
    const note = $("#light-note");
    if (!detail || !detail.result) return;

    const display = detail.result.display;
    const ground = core() ? core().groundHex() : "#FFFEFA";
    const alpha = detail.result.alpha != null ? detail.result.alpha : 1;

    const day = simulateUnderLight(display, ground, "day", alpha);
    const warm = simulateUnderLight(display, ground, "warm", alpha);
    const cool = simulateUnderLight(display, ground, "cool", alpha);

    const setSw = (id, hex) => {
      const el = $(id);
      if (el) el.style.backgroundColor = hex;
    };
    setSw("#light-sw-day", day);
    setSw("#light-sw-warm", warm);
    setSw("#light-sw-cool", cool);

    const main =
      lightMode === "warm" ? warm : lightMode === "cool" ? cool : day;
    const litG =
      lightMode === "day"
        ? ground
        : simulateUnderLight(ground, ground, lightMode, 1);

    if (stage) {
      stage.style.filter = ""; // no CSS filter hacks
      stage.style.backgroundColor = main;
      stage.classList.remove("light-day", "light-warm", "light-cool");
      stage.classList.add("light-" + lightMode);
    }
    if (groundEl) {
      groundEl.style.backgroundColor = litG;
    }
    if (sticky) sticky.style.backgroundColor = main;

    // Mark active cell
    document.querySelectorAll(".light-cell").forEach((cell) => {
      cell.classList.remove("is-active");
    });
    const activeId =
      lightMode === "warm"
        ? "light-sw-warm"
        : lightMode === "cool"
          ? "light-sw-cool"
          : "light-sw-day";
    const activeSw = $(`#${activeId}`);
    if (activeSw && activeSw.parentElement) {
      activeSw.parentElement.classList.add("is-active");
    }

    if (note) {
      const ill = ILLUMINANTS[lightMode];
      note.textContent = `${ill.label} — linear RGB illuminant gains (planning approx., not lab measurement).`;
    }
  }

  // ——— Mix chart ———
  function buildMixChart() {
    const M = core();
    const box = $("#mix-chart");
    if (!M || !box) return;
    const st = M.getState();
    if (st.slots.length < 2) {
      M.toast("Need at least 2 paints in the mix");
      return;
    }
    const a = st.slots[0];
    const b = st.slots[1];
    const ratios = [
      [6, 0],
      [5, 1],
      [4, 2],
      [3, 3],
      [2, 4],
      [1, 5],
      [0, 6],
    ];
    const cells = ratios.map(([pa, pb]) => {
      let hex;
      if (pa === 0) hex = b.hex;
      else if (pb === 0) hex = a.hex;
      else hex = M.mixPigments([
        { hex: a.hex, factor: pa },
        { hex: b.hex, factor: pb },
      ]);
      // apply ground wash approx for WC
      const ground = M.groundHex();
      let display = hex;
      if (st.mode === "watercolour" || st.mode === "ink") {
        const alpha = 1 - st.water / 100;
        display = M.compositeOver(ground, hex, Math.max(0.15, alpha));
      }
      const label =
        pa === 0 ? b.name.split(" (")[0] : pb === 0 ? a.name.split(" (")[0] : `${pa}:${pb}`;
      return { hex: display, mass: hex, label };
    });
    box.hidden = false;
    box.innerHTML =
      `<p class="micro chart-title">${escapeHtml(a.name)} ↔ ${escapeHtml(b.name)}</p>` +
      `<div class="chart-row">` +
      cells
        .map(
          (c) =>
            `<div class="chart-cell" title="${c.mass}">
              <div class="chart-sw" style="background:${c.hex}"></div>
              <span>${escapeHtml(c.label)}</span>
            </div>`
        )
        .join("") +
      `</div>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ——— Recipe card export ———
  function exportRecipeCard() {
    const M = core();
    if (!M) return;
    const st = M.getState();
    const result = M.computeDisplayedResult();
    if (!st.slots.length) return;

    const slotLines = st.slots.length;
    const w = 720;
    const h = Math.max(420, 320 + slotLines * 30);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // background
    ctx.fillStyle = "#f7f4ee";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(28,26,23,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    // title
    ctx.fillStyle = "#1c1a17";
    ctx.font = "600 28px Georgia, serif";
    ctx.fillText("Colour Mixer · recipe", 40, 56);
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillStyle = "#5c564e";
    ctx.fillText(`${st.mode} · mixer.naklitechie.com`, 40, 80);

    // swatch on ground
    const ground = M.groundHex();
    ctx.fillStyle = ground;
    roundRect(ctx, 40, 110, 200, 200, 16);
    ctx.fill();
    ctx.fillStyle = result.display;
    roundRect(ctx, 60, 130, 160, 160, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.stroke();

    // meta
    ctx.fillStyle = "#1c1a17";
    ctx.font = "700 22px ui-monospace, monospace";
    ctx.fillText(result.display, 280, 140);
    ctx.font = "15px system-ui, sans-serif";
    ctx.fillStyle = "#3a3530";
    wrapText(ctx, result.recipe, 280, 175, 400, 22);

    // slots
    let y = 280;
    ctx.font = "13px system-ui, sans-serif";
    st.slots.forEach((s) => {
      ctx.fillStyle = s.hex;
      roundRect(ctx, 280, y - 12, 22, 22, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.stroke();
      ctx.fillStyle = "#1c1a17";
      const label = `${s.parts}× ${s.name}`.slice(0, 48);
      ctx.fillText(label, 312, y + 4);
      y += 28;
    });

    const filename = `mix-${result.display.replace("#", "")}.png`;
    const finish = (href, revoke) => {
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (revoke) setTimeout(() => URL.revokeObjectURL(href), 1500);
      M.toast("Recipe card downloaded");
    };
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (!blob) {
          finish(canvas.toDataURL("image/png"), false);
          return;
        }
        finish(URL.createObjectURL(blob), true);
      }, "image/png");
    } else {
      finish(canvas.toDataURL("image/png"), false);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (let n = 0; n < words.length; n++) {
      const test = line + words[n] + " ";
      if (ctx.measureText(test).width > maxWidth && n > 0) {
        ctx.fillText(line, x, yy);
        line = words[n] + " ";
        yy += lineHeight;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, yy);
  }

  // ——— Print palette chart ———
  function printPaletteChart() {
    const M = core();
    const root = $("#print-chart-root");
    if (!root || !M) return;
    const paints = window.PAINT_PALETTES.limited || [];
    let mixes = "";
    for (let i = 0; i < paints.length; i++) {
      for (let j = i + 1; j < Math.min(i + 3, paints.length); j++) {
        const hex = M.mixPigments([
          { hex: paints[i].hex, factor: 1 },
          { hex: paints[j].hex, factor: 1 },
        ]);
        mixes += `<div class="pc-cell"><div class="pc-sw" style="background:${hex}"></div>
          <span>${escapeHtml(paints[i].name.split(" (")[0])} + ${escapeHtml(paints[j].name.split(" (")[0])}</span></div>`;
      }
    }
    root.innerHTML = `
      <h1>Limited palette chart</h1>
      <p>Colour Mixer · planning reference · ${new Date().toLocaleDateString()}</p>
      <h2>Tubes</h2>
      <div class="pc-grid">
        ${paints
          .map(
            (p) =>
              `<div class="pc-cell"><div class="pc-sw" style="background:${p.hex}"></div>
              <span>${escapeHtml(p.name)}<br><small>${p.opacity || ""}${p.granulating ? " · gran." : ""}${p.staining ? " · stain " + p.staining : ""}</small></span></div>`
          )
          .join("")}
      </div>
      <h2>Sample 1:1 mixes</h2>
      <div class="pc-grid">${mixes}</div>
    `;
    document.body.classList.add("printing-chart");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("printing-chart");
      root.innerHTML = "";
    }, 500);
  }

  // ——— Saved palettes ———
  function renderSavedPalettes() {
    const list = $("#saved-palettes-list");
    if (!list) return;
    const saved = loadJSON(SAVED_KEY, []);
    if (!saved.length) {
      list.innerHTML = `<p class="micro">No saved sets yet. Build a mix, then save its paints.</p>`;
      return;
    }
    list.innerHTML = saved
      .map(
        (sp, idx) => `
      <div class="saved-item" data-saved-idx="${idx}">
        <div class="saved-item-head">
          <strong>${escapeHtml(sp.name)}</strong>
          <span class="micro">${sp.paints.length} paints</span>
        </div>
        <div class="saved-swatches">
          ${sp.paints
            .map(
              (p) =>
                `<button type="button" class="saved-sw" style="background:${p.hex}" title="${escapeHtml(p.name)}" data-add-name="${escapeHtml(p.name)}" data-add-hex="${p.hex}"></button>`
            )
            .join("")}
        </div>
        <div class="row-actions">
          <button type="button" class="btn btn-ghost btn-sm load-saved">Load all to mix</button>
          <button type="button" class="btn btn-ghost btn-sm del-saved">Delete</button>
        </div>
      </div>`
      )
      .join("");
  }

  function saveCurrentPalette() {
    const M = core();
    if (!M) return;
    const st = M.getState();
    if (!st.slots.length) {
      M.toast("Add paints first");
      return;
    }
    const name = prompt(
      "Name this palette set",
      `Set ${new Date().toLocaleDateString()}`
    );
    if (!name) return;
    const saved = loadJSON(SAVED_KEY, []);
    saved.unshift({
      id: "sp-" + Date.now(),
      name: name.trim(),
      paints: st.slots.map((s) => ({ name: s.name, hex: s.hex })),
    });
    saveJSON(SAVED_KEY, saved.slice(0, 20));
    renderSavedPalettes();
    M.toast("Palette saved");
  }

  // ——— Compare A/B ———
  function snapshotRecipe() {
    const M = core();
    if (!M) return null;
    const st = M.getState();
    if (!st.slots.length) return null;
    const result = M.computeDisplayedResult();
    return {
      mode: st.mode,
      slots: st.slots.map((s) => ({ ...s })),
      water: st.water,
      white: st.white,
      black: st.black,
      opacity: st.opacity,
      displayHex: result.display,
      recipe: result.recipe,
    };
  }

  function storeCompare(which) {
    const snap = snapshotRecipe();
    const M = core();
    if (!snap) {
      M.toast("Nothing to store");
      return;
    }
    const data = loadJSON(COMPARE_KEY, { a: null, b: null });
    data[which] = snap;
    saveJSON(COMPARE_KEY, data);
    renderCompare();
    M.toast(`Stored as ${which.toUpperCase()}`);
  }

  function loadCompare(which) {
    const M = core();
    const data = loadJSON(COMPARE_KEY, { a: null, b: null });
    const item = data[which];
    if (!item || !M) return;
    M.pushUndo();
    M.applySnapshot(item);
    M.toast(`Loaded ${which.toUpperCase()}`);
  }

  function renderCompare() {
    const data = loadJSON(COMPARE_KEY, { a: null, b: null });
    ["a", "b"].forEach((k) => {
      const sw = $(`#compare-${k}-swatch`);
      const lab = $(`#compare-${k}-label`);
      const loadBtn = $(`#load-compare-${k}`);
      const item = data[k];
      if (sw) sw.style.background = item ? item.displayHex : "#eee";
      if (lab)
        lab.textContent = item
          ? item.recipe.slice(0, 48) + (item.recipe.length > 48 ? "…" : "")
          : `${k.toUpperCase()} empty`;
      if (loadBtn) loadBtn.disabled = !item;
    });
  }

  // ——— Share / QR ———
  function buildShareUrl() {
    const M = core();
    if (!M) return "";
    const st = M.getState();
    if (!st.slots.length) return "";
    const payload = {
      m: st.mode,
      s: st.slots.map((x) => [x.name, x.hex, x.parts]),
      w: st.water,
      wh: st.white,
      bk: st.black,
      o: st.opacity,
      g: st.ground,
    };
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return `${location.origin}${location.pathname}?mix=${enc}`;
  }

  function shareMix() {
    const M = core();
    const url = buildShareUrl();
    if (!url) {
      M.toast("Add paints to share");
      return;
    }
    // Surface QR under Studio tools
    const tools = document.getElementById("tools-panel");
    if (tools) {
      tools.open = true;
      tools.setAttribute("open", "");
    }
    const wrap = $("#share-qr-wrap");
    const img = $("#share-qr-img");
    const txt = $("#share-url-text");
    if (wrap && img) {
      wrap.classList.remove("hidden");
      img.src =
        "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" +
        encodeURIComponent(url);
      if (txt) txt.textContent = url;
      wrap.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    // Prefer native share sheet when available (mobile)
    if (navigator.share) {
      navigator
        .share({
          title: "Colour Mixer recipe",
          text: "Pigment mix recipe from Colour Mixer",
          url,
        })
        .then(() => M.toast("Shared"))
        .catch(() => copyShareUrl(url, M));
      return;
    }
    copyShareUrl(url, M);
  }

  function copyShareUrl(url, M) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(
        () => M.toast("Share link copied"),
        () => M.toast("Copy this link from Studio tools")
      );
    } else {
      M.toast("Share link ready below");
    }
  }

  function tryLoadFromUrl() {
    const M = core();
    if (!M) return;
    const params = new URLSearchParams(location.search);
    const enc = params.get("mix");
    if (!enc) return;
    try {
      let b64 = enc.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
      const snap = {
        mode: payload.m || "watercolour",
        slots: (payload.s || []).map((row) => ({
          id: "slot-" + Math.random().toString(36).slice(2, 7),
          name: row[0],
          hex: row[1],
          parts: row[2] || 1,
        })),
        water: payload.w ?? 40,
        white: payload.wh ?? 0,
        black: payload.bk ?? 0,
        opacity: payload.o ?? 90,
        ground: payload.g,
      };
      M.applySnapshot(snap);
      M.toast("Loaded shared mix");
    } catch (e) {
      console.warn("Bad share payload", e);
    }
  }

  // ——— Harmony chip → nearest limited paint ———
  function addNearestForHex(hex, label) {
    const M = core();
    if (!M) return;
    const paints = window.PAINT_PALETTES.limited || [];
    const target = M.hexToHsl(hex);
    let best = null;
    let bestD = 999;
    paints.forEach((p) => {
      const h = M.hexToHsl(p.hex);
      if (h.s < 0.08) return;
      const d = hueDistance(target.h, h.h);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    });
    if (best) {
      M.addToMix(best);
      M.toast(`${label}: ${best.name}`);
    }
  }

  // ——— Paint tags helper for app.js ———
  function paintTagHtml(paint) {
    const p =
      typeof window.inferPaintTraits === "function"
        ? window.inferPaintTraits(paint)
        : paint;
    const bits = [];
    if (p.opacity) bits.push(p.opacity === "transparent" ? "transp." : p.opacity);
    if (p.staining) bits.push("stain:" + p.staining);
    if (p.granulating) bits.push("gran.");
    if (!bits.length) return "";
    const title = [
      p.opacity && `opacity: ${p.opacity}`,
      p.staining && `staining: ${p.staining}`,
      p.granulating ? "granulating" : "non-granulating",
      p.traitsInferred ? "(inferred)" : "(set)",
    ]
      .filter(Boolean)
      .join(" · ");
    return `<span class="paint-tags" title="${escapeHtml(title)}">${bits
      .map((b) => `<span class="ptag">${escapeHtml(b)}</span>`)
      .join("")}</span>`;
  }

  // ——— Wire ———
  function onMixerUpdate(e) {
    const detail = e.detail || {};
    renderMud(detail);
    renderHarmonies(detail);
    applyLightPreview(detail);
    const has = detail.slots && detail.slots.length > 0;
    ["export-card", "share-mix", "build-mix-chart", "store-compare-a", "store-compare-b", "show-share-qr", "save-current-palette"].forEach(
      (id) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = !has && id !== "save-current-palette" ? true : id === "save-current-palette" ? !has : !has;
      }
    );
    // undo buttons
    const M = core();
    if (M) {
      const u = document.getElementById("undo-mix");
      const r = document.getElementById("redo-mix");
      if (u) u.disabled = !M.canUndo();
      if (r) r.disabled = !M.canRedo();
    }
  }

  function bind() {
    document.addEventListener("mixer:update", onMixerUpdate);

    document.querySelectorAll("[data-light]").forEach((btn) => {
      btn.addEventListener("click", () => {
        lightMode = btn.dataset.light;
        document.querySelectorAll("[data-light]").forEach((b) => {
          b.classList.toggle("is-active", b === btn);
        });
        const M = core();
        if (M) {
          applyLightPreview({
            result: M.computeDisplayedResult(),
            slots: M.getState().slots,
          });
        }
      });
    });

    // Click a light-strip cell to select that illuminant
    document.getElementById("light-strip")?.addEventListener("click", (e) => {
      const cell = e.target.closest(".light-cell");
      if (!cell) return;
      const id = cell.querySelector(".light-sw")?.id || "";
      if (id.includes("warm")) lightMode = "warm";
      else if (id.includes("cool")) lightMode = "cool";
      else lightMode = "day";
      document.querySelectorAll("[data-light]").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.light === lightMode);
      });
      const M = core();
      if (M) {
        applyLightPreview({
          result: M.computeDisplayedResult(),
          slots: M.getState().slots,
        });
      }
    });

    const harmBox = $("#harmony-swatches");
    if (harmBox) {
      harmBox.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-harm-hex]");
        if (!btn) return;
        addNearestForHex(btn.dataset.harmHex, btn.dataset.harmLabel);
      });
    }

    $("#build-mix-chart")?.addEventListener("click", buildMixChart);
    $("#export-card")?.addEventListener("click", exportRecipeCard);
    $("#share-mix")?.addEventListener("click", shareMix);
    $("#show-share-qr")?.addEventListener("click", shareMix);
    $("#print-palette-chart")?.addEventListener("click", printPaletteChart);
    $("#save-current-palette")?.addEventListener("click", saveCurrentPalette);
    $("#store-compare-a")?.addEventListener("click", () => storeCompare("a"));
    $("#store-compare-b")?.addEventListener("click", () => storeCompare("b"));
    $("#load-compare-a")?.addEventListener("click", () => loadCompare("a"));
    $("#load-compare-b")?.addEventListener("click", () => loadCompare("b"));

    $("#undo-mix")?.addEventListener("click", () => core()?.undo());
    $("#redo-mix")?.addEventListener("click", () => core()?.redo());

    const rings = $("#show-harmony-rings");
    if (rings) {
      rings.addEventListener("change", () => {
        if (core()) core().setHarmonyRings(rings.checked);
      });
    }

    $("#saved-palettes-list")?.addEventListener("click", (e) => {
      const M = core();
      const item = e.target.closest(".saved-item");
      if (!item || !M) return;
      const idx = Number(item.dataset.savedIdx);
      const saved = loadJSON(SAVED_KEY, []);
      const sp = saved[idx];
      if (!sp) return;
      if (e.target.closest(".del-saved")) {
        saved.splice(idx, 1);
        saveJSON(SAVED_KEY, saved);
        renderSavedPalettes();
        M.toast("Deleted");
        return;
      }
      if (e.target.closest(".load-saved")) {
        M.pushUndo();
        M.clearSlotsOnly();
        sp.paints.forEach((p) => M.addToMix(p, { skipUndo: true }));
        M.toast("Loaded " + sp.name);
        return;
      }
      const sw = e.target.closest("[data-add-hex]");
      if (sw) {
        M.addToMix({ name: sw.dataset.addName, hex: sw.dataset.addHex });
      }
    });

    renderSavedPalettes();
    renderCompare();

    document.addEventListener("mixer:saved-tab", renderSavedPalettes);

    // Wait for MixerCore
    const boot = () => {
      if (!core()) {
        setTimeout(boot, 30);
        return;
      }
      core().setPaintTagRenderer(paintTagHtml);
      const ringsEl = $("#show-harmony-rings");
      if (ringsEl) core().setHarmonyRings(ringsEl.checked);
      tryLoadFromUrl();
      // initial UI sync
      document.dispatchEvent(
        new CustomEvent("mixer:update", {
          detail: {
            slots: core().getState().slots,
            result: core().computeDisplayedResult(),
          },
        })
      );
    };
    boot();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
