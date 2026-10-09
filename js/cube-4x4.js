(function () {
  "use strict";

  var el = CubeGuide.el;

  // Стрелките са за вътрешните слоеве: накъде се движи предната им страна.
  // r↑ = r, r↓ = r', l↓ = l, l↑ = l' в стандартната нотация.
  var PARITY_STEPS = [
    {
      title: "Паритет: обърната двойка ръбове",
      text: "Двойката ръбове отпред-горе е обърната: отгоре се вижда зелено, а отпред бяло. " +
            "<strong>Дръж кубчето с бялото отгоре, зеленото отпред и обърнатата двойка отпред-горе</strong>, " +
            "както е на модела.",
      algos: [
        { label: "Алгоритъм", moves: "r↓ U2 l↓ F2 l↑ F2 r2 U2 r↑ U2 r↓ U2" }
      ],
      model: {
        // индекс = ред × 4 + колона; на горната стена ред 3 е до предната страна
        front: { 1: "var(--white)", 2: "var(--white)" },
        top:   { 13: "var(--green)", 14: "var(--green)" }
      }
    },
    {
      title: "Паритет: разменени двойки ръбове",
      text: "Двойката ръбове отзад-горе и двойката отдясно-горе са разменени: " +
            "отдясно горе се вижда синьо (цветът отзад), а отзад горе червено. " +
            "<strong>Дръж кубчето с бялото отгоре и зеленото отпред</strong>, както е на модела.",
      algos: [
        { label: "Алгоритъм", moves: "F2 r2 F2" }
      ],
      model: {
        right: { 1: "var(--blue)", 2: "var(--blue)" },
        back:  { 1: "var(--red)", 2: "var(--red)" }
      }
    }
  ];

  var STORAGE_KEY = "cube-formulas:cube-4x4:done";

  /* ---------- notation ---------- */

  var FACE_NAMES = {
    R: "дясната", L: "лявата", U: "горната",
    D: "долната", F: "предната", B: "задната"
  };
  var SLICE_NAMES = { r: "вътрешния десен", l: "вътрешния ляв" };

  function describeMove(move) {
    var c = move.charAt(0);
    var mod = move.slice(1);
    if (SLICE_NAMES[c]) {
      var slice = "Завърти " + SLICE_NAMES[c] + " слой";
      if (mod === "↑") return slice + " нагоре";
      if (mod === "↓") return slice + " надолу";
      if (mod === "2") return slice + " на 180°";
      return "";
    }
    var face = FACE_NAMES[c];
    if (!face) return "";
    if (mod === "2") return "Завърти " + face + " страна на 180°";
    if (mod === "'") return "Завърти " + face + " страна обратно на часовниковата стрелка";
    return "Завърти " + face + " страна по часовниковата стрелка";
  }

  /* ---------- 3D model ---------- */

  var BASE = {
    top: "var(--white)", bottom: "var(--yellow)",
    front: "var(--green)", back: "var(--blue)",
    right: "var(--red)", left: "var(--orange)"
  };

  function buildModel(overrides) {
    var cube = el("div", "cube3d c4");
    Object.keys(BASE).forEach(function (name) {
      var face = el("div", "face face--" + name + " c4__face");
      var custom = overrides[name] || {};
      for (var i = 0; i < 16; i++) {
        var s = el("span", "c4__sticker");
        s.style.background = custom[i] || BASE[name];
        face.appendChild(s);
      }
      cube.appendChild(face);
    });
    return cube;
  }

  CubeGuide.renderSteps({
    root: document.getElementById("steps"),
    steps: PARITY_STEPS,
    storageKey: STORAGE_KEY,
    tokenize: function (s) { return s.trim().split(/\s+/); },
    describe: describeMove,
    buildVisual: function (step) {
      return CubeGuide.viewer(buildModel(step.model), {
        className: "viewer--c4",
        label: "3D 4×4 куб. Влачи, за да го завъртиш.",
        hint: "↻ влачи · отпред: зелено",
        rx: -22,
        ry: -20
      });
    }
  });
})();
