/**
 * Paint library + cross-brand dupe finder for Colour Mixer.
 *
 * Inspired by the "Smarty Paints" workflow: search a large real-paint
 * database by name / pigment / properties, then find the closest matches
 * ("dupes") in other brand lines with a property-level comparison.
 *
 * Data comes from window.BRAND_PALETTES (+ limited / named singles).
 * Colour distance is CIE76 ΔE in Lab (self-contained — no engine needed).
 * Sends paints to the mix via window.MixerCore.addToMix.
 */
(function () {
  "use strict";

  const MEDIUM_LABEL = {
    watercolour: "Watercolour",
    gouache: "Gouache",
    acrylic: "Acrylic",
    oil: "Oil",
    ink: "Ink",
  };

  // How many result rows to render before asking the user to narrow the search.
  const RESULT_CAP = 80;
  // How many dupes to show per target.
  const DUPE_COUNT = 6;
  // ΔE bands → human label + class.
  const DUPE_BANDS = [
    { max: 2, label: "near-identical", cls: "band-1" },
    { max: 5, label: "very close", cls: "band-2" },
    { max: 10, label: "close", cls: "band-3" },
    { max: 18, label: "loose", cls: "band-4" },
    { max: Infinity, label: "distant", cls: "band-5" },
  ];

  let PAINTS = [];
  let bound = false;
  const el = {};

  function core() {
    return window.MixerCore;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ——— Colour maths (sRGB hex → Lab → CIE76 ΔE) ———
  function hexToRgb(hex) {
    const h = String(hex || "").replace("#", "").trim();
    const full =
      h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0");
    const n = parseInt(full.slice(0, 6), 16) || 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToLab({ r, g, b }) {
    const lin = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const R = lin(r),
      G = lin(g),
      B = lin(b);
    // sRGB → XYZ (D65)
    let x = R * 0.4124 + G * 0.3576 + B * 0.1805;
    let y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    let z = R * 0.0193 + G * 0.1192 + B * 0.9505;
    // Normalise by D65 white
    x /= 0.95047;
    y /= 1.0;
    z /= 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(x),
      fy = f(y),
      fz = f(z);
    return {
      L: 116 * fy - 16,
      a: 500 * (fx - fy),
      b: 200 * (fy - fz),
    };
  }

  function deltaE(l1, l2) {
    const dL = l1.L - l2.L,
      da = l1.a - l2.a,
      db = l1.b - l2.b;
    return Math.sqrt(dL * dL + da * da + db * db);
  }

  function bandFor(dE) {
    return DUPE_BANDS.find((b) => dE <= b.max) || DUPE_BANDS[DUPE_BANDS.length - 1];
  }

  // A single Colour Index code, e.g. PB29, PR254, PB15:1, PBr7 — not "mixed",
  // not a slash-joined blend, not a multi-token string.
  const SINGLE_PIGMENT_RE = /^P(?:Y|O|R|V|B|G|Bk|Br|W)\d+(?::\d+)?$/i;
  function isSinglePigment(pigment) {
    const p = String(pigment || "").trim();
    if (!p || /mixed/i.test(p)) return false;
    if (/[\/,+]/.test(p) || /\s/.test(p)) return false;
    return SINGLE_PIGMENT_RE.test(p);
  }

  // ——— Build the flat paint index ———
  function collectPaints() {
    const out = [];
    const seen = new Set();
    const push = (p, brand, line, medium) => {
      const hex = String(p.hex || "").trim();
      if (!hex) return;
      const key = `${brand}|${line}|${p.name}|${hex}`;
      if (seen.has(key)) return;
      seen.add(key);
      const rgb = hexToRgb(hex);
      out.push({
        name: p.name,
        hex,
        pigment: p.pigment || "",
        brand: brand || "",
        line: line || "",
        medium: medium || p.medium || "",
        opacity: p.opacity || null,
        staining: p.staining || null,
        granulating: !!p.granulating,
        single: isSinglePigment(p.pigment),
        lab: rgbToLab(rgb),
      });
    };

    if (Array.isArray(window.BRAND_PALETTES)) {
      window.BRAND_PALETTES.forEach((b) => {
        (b.paints || []).forEach((p) => push(p, b.brand, b.line, b.medium));
      });
    }
    return out;
  }

  // ——— Filtering ———
  function currentFilters() {
    return {
      q: (el.search.value || "").trim().toLowerCase(),
      medium: el.medium.value,
      single: el.single.checked,
      gran: el.gran.checked,
      opacity: el.opacity.value,
      staining: el.staining.value,
    };
  }

  function matchesFilters(p, f) {
    if (f.medium !== "all" && p.medium !== f.medium) return false;
    if (f.single && !p.single) return false;
    if (f.gran && !p.granulating) return false;
    if (f.opacity && p.opacity !== f.opacity) return false;
    if (f.staining && p.staining !== f.staining) return false;
    if (f.q) {
      const hay = `${p.name} ${p.pigment} ${p.brand} ${p.line}`.toLowerCase();
      if (!hay.includes(f.q)) return false;
    }
    return true;
  }

  // ——— Rendering ———
  function tagHtml(p) {
    const bits = [];
    if (p.opacity) bits.push(p.opacity === "transparent" ? "transp." : p.opacity);
    if (p.staining) bits.push("stain:" + p.staining);
    if (p.granulating) bits.push("gran.");
    if (p.single) bits.push("1-pig");
    if (!bits.length) return "";
    return `<span class="paint-tags">${bits
      .map((b) => `<span class="ptag">${escapeHtml(b)}</span>`)
      .join("")}</span>`;
  }

  function rowHtml(p, idx, actionLabel, action) {
    const pig = p.pigment
      ? `<span class="pigment">${escapeHtml(p.pigment)}</span>`
      : "";
    return `
      <div class="lib-row">
        <span class="lib-chip" style="background:${escapeHtml(p.hex)}"></span>
        <div class="lib-info">
          <span class="lib-name">${escapeHtml(p.name)}${pig}</span>
          <span class="lib-brand">${escapeHtml(p.brand)} · ${escapeHtml(
            p.line
          )}</span>
          ${tagHtml(p)}
        </div>
        <div class="lib-row-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-${action}="${idx}">${actionLabel}</button>
          <button type="button" class="btn btn-secondary btn-sm" data-lib-add="${idx}">Mix</button>
        </div>
      </div>`;
  }

  let visible = []; // paints currently rendered in the results list

  function renderResults() {
    const f = currentFilters();
    const matches = PAINTS.filter((p) => matchesFilters(p, f));
    // Sort: single-pigment first, then by lightness (rough hue-agnostic order),
    // so the default view is a useful "clean mixers up top" list.
    matches.sort((a, b) => {
      if (a.single !== b.single) return a.single ? -1 : 1;
      return b.lab.L - a.lab.L;
    });
    visible = matches.slice(0, RESULT_CAP);

    el.count.textContent = matches.length
      ? `${matches.length} paint${matches.length === 1 ? "" : "s"}` +
        (matches.length > RESULT_CAP ? ` — showing first ${RESULT_CAP}, narrow with search` : "")
      : "No paints match these filters.";

    el.results.innerHTML = visible
      .map((p, i) => rowHtml(p, i, "Dupes", "dupe"))
      .join("");
  }

  function renderDupes(target) {
    // Dupes are drawn from OTHER brands in the SAME medium.
    const scored = PAINTS.filter(
      (p) =>
        p.medium === target.medium &&
        !(p.brand === target.brand && p.line === target.line) &&
        !(p.name === target.name && p.hex === target.hex)
    )
      .map((p) => ({ p, dE: deltaE(p.lab, target.lab) }))
      .sort((a, b) => a.dE - b.dE)
      .slice(0, DUPE_COUNT);

    const propRow = (label, same, detail) =>
      `<span class="dupe-prop ${same ? "prop-ok" : "prop-diff"}" title="${escapeHtml(
        detail
      )}">${same ? "✓" : "✕"} ${escapeHtml(label)}</span>`;

    const matchesHtml = scored
      .map(({ p, dE }, i) => {
        const band = bandFor(dE);
        const props = [
          propRow(
            p.pigment && p.pigment === target.pigment ? "same pigment" : "pigment",
            !!p.pigment && p.pigment === target.pigment,
            `${target.pigment || "?"} vs ${p.pigment || "?"}`
          ),
          propRow(
            "opacity",
            !!p.opacity && p.opacity === target.opacity,
            `${target.opacity || "?"} vs ${p.opacity || "?"}`
          ),
          propRow(
            "staining",
            !!p.staining && p.staining === target.staining,
            `${target.staining || "?"} vs ${p.staining || "?"}`
          ),
          propRow(
            "granulation",
            p.granulating === target.granulating,
            `${target.granulating ? "yes" : "no"} vs ${p.granulating ? "yes" : "no"}`
          ),
        ].join("");
        return `
          <div class="dupe-row">
            <span class="lib-chip" style="background:${escapeHtml(p.hex)}"></span>
            <div class="lib-info">
              <span class="lib-name">${escapeHtml(p.name)}${
          p.pigment ? `<span class="pigment">${escapeHtml(p.pigment)}</span>` : ""
        }</span>
              <span class="lib-brand">${escapeHtml(p.brand)} · ${escapeHtml(
          p.line
        )}</span>
              <span class="dupe-props">${props}</span>
            </div>
            <div class="dupe-score">
              <span class="dupe-band ${band.cls}">${band.label}</span>
              <span class="micro">ΔE ${dE.toFixed(1)}</span>
              <button type="button" class="btn btn-secondary btn-sm" data-dupe-add="${i}">Mix</button>
            </div>
          </div>`;
      })
      .join("");

    const best = scored[0];
    const noDupe =
      !best || best.dE > 10
        ? `<p class="dupe-warn">No close cross-brand match (best ΔE ${
            best ? best.dE.toFixed(1) : "—"
          }). Add this paint to the mixer and build the colour from your own palette instead.</p>`
        : "";

    el.dupe._scored = scored; // for the Mix buttons
    el.dupe.innerHTML = `
      <div class="dupe-head">
        <span class="lib-chip lib-chip-lg" style="background:${escapeHtml(
          target.hex
        )}"></span>
        <div class="lib-info">
          <span class="lib-name">${escapeHtml(target.name)}${
      target.pigment ? `<span class="pigment">${escapeHtml(target.pigment)}</span>` : ""
    }</span>
          <span class="lib-brand">${escapeHtml(target.brand)} · ${escapeHtml(
      target.line
    )} · ${escapeHtml(MEDIUM_LABEL[target.medium] || target.medium)}</span>
        </div>
        <button type="button" class="dupe-close" data-dupe-close aria-label="Close dupe finder">×</button>
      </div>
      <p class="micro dupe-sub">Closest matches in other ${escapeHtml(
        MEDIUM_LABEL[target.medium] || target.medium
      )} lines:</p>
      ${noDupe}
      <div class="dupe-list">${matchesHtml || '<p class="micro">No other brands in this medium.</p>'}</div>`;
    el.dupe.classList.remove("hidden");
    el.dupe.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function addToMix(p) {
    const M = core();
    if (!M) return;
    M.addToMix({
      name: p.name,
      hex: p.hex,
      note: [p.brand, p.line].filter(Boolean).join(" · "),
    });
    M.toast(`Added ${p.name} to mix`);
  }

  // ——— Wire ———
  function bind() {
    if (bound) return;
    el.panel = document.getElementById("library-panel");
    el.search = document.getElementById("lib-search");
    el.medium = document.getElementById("lib-medium");
    el.single = document.getElementById("lib-single");
    el.gran = document.getElementById("lib-gran");
    el.opacity = document.getElementById("lib-opacity");
    el.staining = document.getElementById("lib-staining");
    el.count = document.getElementById("lib-count");
    el.results = document.getElementById("lib-results");
    el.dupe = document.getElementById("dupe-panel");
    el.total = document.getElementById("lib-total");
    if (!el.panel || !el.results) return; // panel not present
    bound = true;

    PAINTS = collectPaints();
    if (el.total) el.total.textContent = String(PAINTS.length);

    const rerender = () => renderResults();
    el.search.addEventListener("input", rerender);
    [el.medium, el.single, el.gran, el.opacity, el.staining].forEach((c) =>
      c.addEventListener("change", rerender)
    );

    el.results.addEventListener("click", (e) => {
      const dupeBtn = e.target.closest("[data-dupe]");
      if (dupeBtn) {
        renderDupes(visible[Number(dupeBtn.dataset.dupe)]);
        return;
      }
      const addBtn = e.target.closest("[data-lib-add]");
      if (addBtn) addToMix(visible[Number(addBtn.dataset.libAdd)]);
    });

    el.dupe.addEventListener("click", (e) => {
      if (e.target.closest("[data-dupe-close]")) {
        el.dupe.classList.add("hidden");
        el.dupe.innerHTML = "";
        return;
      }
      const add = e.target.closest("[data-dupe-add]");
      if (add && el.dupe._scored) {
        const hit = el.dupe._scored[Number(add.dataset.dupeAdd)];
        if (hit) addToMix(hit.p);
      }
    });

    // Render once the panel is first opened (cheap, but avoids work on load).
    let rendered = false;
    const ensure = () => {
      if (rendered) return;
      rendered = true;
      renderResults();
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

  // Wait for MixerCore + palettes.
  function boot() {
    if (!window.MixerCore || !window.BRAND_PALETTES) {
      setTimeout(boot, 40);
      return;
    }
    bind();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
