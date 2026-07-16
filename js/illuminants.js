/**
 * Lab-grade CIE illuminants for Colour Mixer
 * Wavelengths: 380–750 nm, Δλ = 10 nm (N=38, matches spectral.js)
 * Observer: CIE 1931 2°
 * Illuminants: CIE D65, CIE A (2856 K), CIE D75 (~7504 K)
 * Display: Bradford CAT → sRGB (D65)
 */
(function (global) {
  "use strict";

  const N = 38;
  const L0 = 380;
  const DL = 10;

  const XBAR = [
    0.001368, 0.004243, 0.01431, 0.04351, 0.13438, 0.2839,
    0.34828, 0.3362, 0.2908, 0.19536, 0.09564, 0.03201,
    0.0049, 0.0093, 0.06327, 0.1655, 0.2904, 0.43345,
    0.5945, 0.7621, 0.9163, 1.0263, 1.0622, 1.0026,
    0.85445, 0.6424, 0.4479, 0.2835, 0.1649, 0.0874,
    0.04677, 0.0227, 0.011359, 0.00579, 0.002899, 0.00144,
    0.00069, 0.000332
  ];
  const YBAR = [
    3.9e-05, 0.00012, 0.000396, 0.00121, 0.004, 0.0116,
    0.023, 0.038, 0.06, 0.09098, 0.13902, 0.20802,
    0.323, 0.503, 0.71, 0.862, 0.954, 0.99495,
    0.995, 0.952, 0.87, 0.757, 0.631, 0.503,
    0.381, 0.265, 0.175, 0.107, 0.061, 0.032,
    0.017, 0.00821, 0.004102, 0.002091, 0.001047, 0.00052,
    0.000249, 0.00012
  ];
  const ZBAR = [
    0.00645, 0.02005, 0.06785, 0.2074, 0.6456, 1.3856,
    1.74706, 1.77211, 1.6692, 1.28764, 0.81295, 0.46518,
    0.272, 0.1582, 0.07825, 0.04216, 0.0203, 0.00875,
    0.0039, 0.0021, 0.00165, 0.0011, 0.0008, 0.00034,
    0.00019, 5e-05, 2e-05, 0, 0, 0,
    0, 0, 0, 0, 0, 0,
    0, 0
  ];

  // Relative SPDs (CIE tables / CIE A formula)
  const SPD = {
    d65: [
    49.9755, 54.6482, 82.7549, 91.486, 93.4318, 86.6823,
    104.865, 117.008, 117.812, 114.861, 115.923, 108.811,
    109.354, 107.802, 104.79, 107.689, 104.405, 104.046,
    100, 96.3342, 95.788, 88.6856, 90.0062, 89.5991,
    87.6987, 83.2886, 83.6992, 80.0268, 80.2146, 82.2778,
    78.2842, 69.7213, 71.6091, 74.349, 61.604, 69.8856,
    75.087, 63.5927
    ],
    a: [
    9.7951, 12.0853, 14.708, 17.6753, 20.995, 24.6709,
    28.7027, 33.0859, 37.8121, 42.8693, 48.2423, 53.9132,
    59.8611, 66.0635, 72.4959, 79.1326, 85.947, 92.912,
    100, 107.184, 114.436, 121.731, 129.043, 136.346,
    143.618, 150.836, 157.979, 165.028, 171.963, 178.769,
    185.429, 191.931, 198.261, 204.409, 210.365, 216.12,
    221.667, 227
    ],
    d75: [
    50.151, 63.592, 99.927, 112.77, 114.86, 110.94,
    131.56, 148.99, 151.38, 150.22, 149.59, 136.54,
    136.34, 131.95, 125.24, 125.86, 118.31, 115.51,
    108.58, 101.32, 97.734, 87.991, 87.141, 84.43,
    80.605, 73.077, 71.521, 65.807, 64.546, 64.373,
    58.91, 50.402, 50.669, 51.634, 41.58, 47.432,
    50.093, 40.937
    ],
  };

  const META = {
    d65: { key: "d65", ui: "day", label: "CIE D65 daylight", cct: "6504 K", note: "sRGB / average noon daylight" },
    a: { key: "a", ui: "warm", label: "CIE Illuminant A", cct: "2856 K", note: "incandescent / warm tungsten" },
    d75: { key: "d75", ui: "cool", label: "CIE D75 daylight", cct: "~7504 K", note: "north sky / cool daylight" },
  };

  // sRGB D65 white (CIE XYZ, Y=1)
  const D65_WHITE = [0.95047, 1.0, 1.08883];

  // Bradford CAT matrices
  const BRADFORD = [
    [0.8951, 0.2664, -0.1614],
    [-0.7502, 1.7135, 0.0367],
    [0.0389, -0.0685, 1.0296],
  ];
  const BRADFORD_INV = [
    [0.9869929, -0.1470543, 0.1599627],
    [0.4323053, 0.5183603, 0.0492912],
    [-0.0085287, 0.0400428, 0.9684867],
  ];

  // XYZ (D65) → linear sRGB (IEC 61966-2-1)
  const XYZ_RGB = [
    [3.2404542, -1.5371385, -0.4985314],
    [-0.9692660, 1.8760108, 0.0415560],
    [0.0556434, -0.2040259, 1.0572252],
  ];

  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  function mulMat3(m, v) {
    return [
      m[0][0]*v[0] + m[0][1]*v[1] + m[0][2]*v[2],
      m[1][0]*v[0] + m[1][1]*v[1] + m[1][2]*v[2],
      m[2][0]*v[0] + m[2][1]*v[1] + m[2][2]*v[2],
    ];
  }

  function whitePoint(spd) {
    let X = 0, Y = 0, Z = 0;
    for (let i = 0; i < N; i++) {
      X += spd[i] * XBAR[i] * DL;
      Y += spd[i] * YBAR[i] * DL;
      Z += spd[i] * ZBAR[i] * DL;
    }
    const k = Y > 0 ? 1 / Y : 1;
    return { xyz: [k * X, 1, k * Z], k };
  }

  const WHITE = {
    d65: whitePoint(SPD.d65),
    a: whitePoint(SPD.a),
    d75: whitePoint(SPD.d75),
  };

  /** Reflectance spectrum from hex via spectral.js, else flat grey from luminance */
  function reflectanceFromHex(hex) {
    if (typeof spectral !== "undefined" && spectral.Color) {
      try {
        const c = new spectral.Color(hex);
        if (c.R && c.R.length === N) return c.R.slice();
      } catch (e) { /* fall through */ }
    }
    // Fallback: grey reflectance from sRGB luminance
    const h = String(hex).replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const toLin = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    const Y = 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    const R = Math.max(0.02, Math.min(0.98, Y));
    return Array(N).fill(R);
  }

  /** XYZ under illuminant for reflectance R[0..37] */
  function xyzUnder(R, illKey) {
    const spd = SPD[illKey] || SPD.d65;
    const { k } = WHITE[illKey] || WHITE.d65;
    let X = 0, Y = 0, Z = 0;
    for (let i = 0; i < N; i++) {
      const w = (R[i] == null ? 0 : R[i]) * spd[i] * DL;
      X += w * XBAR[i];
      Y += w * YBAR[i];
      Z += w * ZBAR[i];
    }
    return [k * X, k * Y, k * Z];
  }

  /** Bradford chromatic adaptation src white → D65 */
  function bradfordToD65(xyz, srcWhite) {
    const srcLMS = mulMat3(BRADFORD, srcWhite);
    const dstLMS = mulMat3(BRADFORD, D65_WHITE);
    const cone = mulMat3(BRADFORD, xyz);
    const adapted = [
      cone[0] * (dstLMS[0] / (srcLMS[0] || 1e-10)),
      cone[1] * (dstLMS[1] / (srcLMS[1] || 1e-10)),
      cone[2] * (dstLMS[2] / (srcLMS[2] || 1e-10)),
    ];
    return mulMat3(BRADFORD_INV, adapted);
  }

  function xyzToSrgb(xyz) {
    const lin = mulMat3(XYZ_RGB, xyz);
    const comp = (c) => {
      c = clamp(c, 0, 1);
      return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    };
    return [
      Math.round(clamp(comp(lin[0]), 0, 1) * 255),
      Math.round(clamp(comp(lin[1]), 0, 1) * 255),
      Math.round(clamp(comp(lin[2]), 0, 1) * 255),
    ];
  }

  function rgbToHex(r, g, b) {
    const to = (v) => clamp(v, 0, 255).toString(16).padStart(2, "0");
    return ("#" + to(r) + to(g) + to(b)).toUpperCase();
  }

  /**
   * Render sRGB hex of a surface colour under a CIE illuminant.
   * @param {string} hex - surface colour (mass-tone or wash already composited)
   * @param {string} illKey - 'd65' | 'a' | 'd75'
   * @param {string} [groundHex] - if alpha < 1, ground also adapted & composited in XYZ-ish via dual reflectance
   * @param {number} [alpha] - 0..1 covering of paint over ground
   */
  function underIlluminant(hex, illKey, groundHex, alpha) {
    const key = illKey in SPD ? illKey : "d65";
    const wp = WHITE[key].xyz;
    const R = reflectanceFromHex(hex);
    let xyz = xyzUnder(R, key);

    if (groundHex && alpha != null && alpha < 0.995) {
      const Rg = reflectanceFromHex(groundHex);
      // optical mix of reflectances (simple convex combination — Beer's-ish for thin wash)
      const a = Math.max(0, Math.min(1, alpha));
      const Rm = R.map((v, i) => a * v + (1 - a) * Rg[i]);
      xyz = xyzUnder(Rm, key);
    }

    // Adapt to D65 for sRGB display (skip if already D65 — still run for consistency)
    const adapted = key === "d65" ? xyz : bradfordToD65(xyz, wp);
    // For D65 path, scale so Y tracks display intent; use adapted as-is
    const [r, g, b] = xyzToSrgb(adapted);
    return rgbToHex(r, g, b);
  }

  function uiToKey(ui) {
    if (ui === "warm") return "a";
    if (ui === "cool") return "d75";
    return "d65";
  }

  function metaForUi(ui) {
    return META[uiToKey(ui)];
  }

  // Sanity: perfect diffuser under D65 should be near white
  const whiteHex = underIlluminant("#FFFFFF", "d65");
  const whiteA = underIlluminant("#FFFFFF", "a");

  global.LabIlluminants = {
    N,
    META,
    WHITE,
    underIlluminant,
    uiToKey,
    metaForUi,
    reflectanceFromHex,
    xyzUnder,
    whitePointCheck: { d65: whiteHex, a: whiteA },
  };
})(typeof window !== "undefined" ? window : globalThis);
