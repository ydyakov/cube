(function () {
  "use strict";

  var el = CubeGuide.el;

  var SQ1_STEPS = [
    {
      title: "Размяна на ръбове между слоевете",
      text: "Разменя ръб от горния слой с ръб от долния слой. " +
            "<strong>Започни с кубчето във форма на куб</strong> и разреза отдясно.",
      algos: [
        { label: "Алгоритъм", moves: "(1,0) / (0,-3) / (0,-3) / (-1,-1) / (1,4) / (0,3) /" }
      ],
      hint: "Накрая кубчето е отново във форма на куб."
    }
  ];

  var STORAGE_KEY = "cube-formulas:square-1:done";

  /* ---------- notation ---------- */

  function tokenize(s) {
    return (s.match(/\(\s*-?\d+\s*,\s*-?\d+\s*\)|\//g) || []).map(function (t) {
      return t.replace(/\s+/g, "");
    });
  }

  function turnText(n) {
    if (n === 0) return "без завъртане";
    return Math.abs(n) + "×30° " + (n > 0 ? "по" : "обратно на") + " часовниковата";
  }

  function describeMove(token) {
    if (token === "/") return "Завърти дясната половина на 180°";
    var m = token.match(/^\((-?\d+),(-?\d+)\)$/);
    if (!m) return "";
    return "Горе: " + turnText(+m[1]) + " · Долу: " + turnText(+m[2]);
  }

  /* ---------- visuals ---------- */

  // Стените са SVG в квадрат 100×100. Ръбовете на Square-1 са клинове от 30°,
  // затова границите им по страната са на 50 ± 50·tan(15°) ≈ 36.6 / 63.4.
  var A = 36.6;
  var B = 63.4;
  var NS = "http://www.w3.org/2000/svg";

  function svg(lines, color) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 100 100");
    s.setAttribute("class", "sq1__svg");
    var bg = document.createElementNS(NS, "rect");
    bg.setAttribute("width", "100");
    bg.setAttribute("height", "100");
    bg.setAttribute("style", "fill:" + color);
    s.appendChild(bg);
    lines.forEach(function (l) {
      var line = document.createElementNS(NS, "line");
      line.setAttribute("x1", l[0]);
      line.setAttribute("y1", l[1]);
      line.setAttribute("x2", l[2]);
      line.setAttribute("y2", l[3]);
      s.appendChild(line);
    });
    return s;
  }

  // Горна/долна стена: 4 ъгъла (хвърчила) и 4 ръба (триъгълници) около центъра.
  function capLines() {
    return [[A, 0], [B, 0], [100, A], [100, B], [B, 100], [A, 100], [0, B], [0, A]]
      .map(function (p) { return [50, 50, p[0], p[1]]; });
  }

  // Странична стена: горен слой, тънък среден слой, долен слой.
  // Средният слой е разрязан само отпред и отзад (там минава разрезът).
  function sideLines(sliced) {
    var lines = [
      [0, 40, 100, 40], [0, 60, 100, 60],
      [A, 0, A, 40], [B, 0, B, 40],
      [A, 60, A, 100], [B, 60, B, 100]
    ];
    if (sliced) lines.push([A, 40, A, 60]);
    return lines;
  }

  function buildHero() {
    var root = document.getElementById("sq1");
    if (!root) return;
    var faces = [
      { name: "top",    color: "var(--white)",  lines: capLines() },
      { name: "bottom", color: "var(--yellow)", lines: capLines() },
      { name: "front",  color: "var(--red)",    lines: sideLines(true) },
      { name: "back",   color: "var(--orange)", lines: sideLines(true) },
      { name: "right",  color: "var(--blue)",   lines: sideLines(false) },
      { name: "left",   color: "var(--green)",  lines: sideLines(false) }
    ];
    faces.forEach(function (f) {
      var face = el("div", "face face--" + f.name + " sq1__face");
      face.appendChild(svg(f.lines, f.color));
      root.appendChild(face);
    });
  }

  function buildMini() {
    var wrap = el("div", "sq1-mini");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", "Square-1 във форма на куб, гледан отгоре");
    wrap.appendChild(svg(capLines(), "var(--white)"));
    return wrap;
  }

  buildHero();
  CubeGuide.renderSteps({
    root: document.getElementById("steps"),
    steps: SQ1_STEPS,
    storageKey: STORAGE_KEY,
    tokenize: tokenize,
    describe: describeMove,
    buildVisual: buildMini
  });
})();
