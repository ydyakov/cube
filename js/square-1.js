(function () {
  "use strict";

  var el = CubeGuide.el;

  var SQ1_STEPS = [
    {
      title: "Размяна на ръбове между слоевете",
      text: "Разменя двата оцветени ръба: десния ръб на горния слой и десния ръб на долния слой. " +
            "<strong>Започни с кубчето във форма на куб, ориентирано като на модела</strong> " +
            "(оранжевото отпред, зеленото отдясно). Моделът се върти с мишката.",
      algos: [
        { label: "Алгоритъм", moves: "(1,0) / (0,-3) / (0,-3) / (-1,-1) / (1,4) / (0,3) /" }
      ],
      model: "edgeSwap",
      hint: "Накрая кубчето е отново във форма на куб."
    },
    {
      title: "Пермутация на ъгли",
      text: "Разменя двата оцветени ъгъла в горния слой: предния ляв (червен) и предния десен (син). " +
            "<strong>Започни с кубчето във форма на куб, ориентирано като на модела</strong> " +
            "(оранжевото отпред, зеленото отдясно).",
      algos: [
        { label: "Алгоритъм", moves: "(1,0) / (3,-3) / (-3,0) / (0,3) / (0,-3) / (0,3) /" }
      ],
      model: "cornerPerm",
      hint: "Накрая кубчето е отново във форма на куб."
    },
    {
      title: "Пермутация на два ръба",
      text: "Разменя два ръба. " +
            "<strong>Започни с кубчето във форма на куб, ориентирано като на модела</strong> " +
            "(бялото отгоре, оранжевото отпред, зеленото отдясно).",
      algos: [
        { label: "Алгоритъм", moves: "(-2,0) / (3,0) / (-1,-1) / (-2,1) /" }
      ],
      model: "edgePerm"
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

  // Стените са SVG в квадрат 100×100, разделени на отделни парчета (полигони),
  // за да може всяко да има свой цвят. Ръбовете на Square-1 са клинове от 30°,
  // затова границите им по страната са на 50 ± 50·tan(15°) ≈ 36.6 / 63.4.
  var A = 36.6;
  var B = 63.4;
  var NS = "http://www.w3.org/2000/svg";

  function rect(x1, y1, x2, y2) {
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
  }

  // Горна/долна стена: 4 ръба (триъгълници) и 4 ъгъла (хвърчила) около центъра.
  // Имената са спрямо стената: "edge-right" е ръбът към дясната страна (x = 100).
  var C = [50, 50];
  var CAP = {
    "edge-back":    [C, [A, 0], [B, 0]],
    "edge-right":   [C, [100, A], [100, B]],
    "edge-front":   [C, [B, 100], [A, 100]],
    "edge-left":    [C, [0, B], [0, A]],
    "corner-br":    [C, [B, 0], [100, 0], [100, A]],
    "corner-fr":    [C, [100, B], [100, 100], [B, 100]],
    "corner-fl":    [C, [A, 100], [0, 100], [0, B]],
    "corner-bl":    [C, [0, A], [0, 0], [A, 0]]
  };

  // Странична стена: горен слой, тънък среден слой, долен слой.
  // Средният слой е разрязан само отпред и отзад, вляво (там минава разрезът).
  function sideParts(sliced) {
    var parts = {
      "top-l": rect(0, 0, A, 40), "top-edge": rect(A, 0, B, 40), "top-r": rect(B, 0, 100, 40),
      "bot-l": rect(0, 60, A, 100), "bot-edge": rect(A, 60, B, 100), "bot-r": rect(B, 60, 100, 100)
    };
    if (sliced) {
      parts["mid-l"] = rect(0, 40, A, 60);
      parts["mid-r"] = rect(A, 40, 100, 60);
    } else {
      parts["mid"] = rect(0, 40, 100, 60);
    }
    return parts;
  }

  function faceSvg(parts, colorOf) {
    var s = document.createElementNS(NS, "svg");
    s.setAttribute("viewBox", "0 0 100 100");
    s.setAttribute("class", "sq1__svg");
    Object.keys(parts).forEach(function (key) {
      var poly = document.createElementNS(NS, "polygon");
      poly.setAttribute("points", parts[key].map(function (p) { return p.join(","); }).join(" "));
      poly.setAttribute("style", "fill:" + colorOf(key));
      s.appendChild(poly);
    });
    return s;
  }

  var FACE_PARTS = {
    top: CAP, bottom: CAP,
    front: sideParts(true), back: sideParts(true),
    right: sideParts(false), left: sideParts(false)
  };

  // colors: { faceName: color | { part: color, "*": color } }
  function buildSq1(root, colors) {
    Object.keys(FACE_PARTS).forEach(function (name) {
      var spec = colors[name];
      var colorOf = typeof spec === "string"
        ? function () { return spec; }
        : function (part) { return spec[part] || spec["*"]; };
      var face = el("div", "face face--" + name + " sq1__face");
      face.appendChild(faceSvg(FACE_PARTS[name], colorOf));
      root.appendChild(face);
    });
  }

  function buildHero() {
    var root = document.getElementById("sq1");
    if (!root) return;
    buildSq1(root, {
      top: "var(--white)", bottom: "var(--yellow)",
      front: "var(--red)", back: "var(--orange)",
      right: "var(--blue)", left: "var(--green)"
    });
  }

  // Моделите за стъпките: сив пъзел, оранжев/зелен среден слой за ориентация,
  // а парчетата, които алгоритъмът мести, са оцветени.
  // На лявата стена "top-r" е предната част, на дясната "top-l" (виж ориентацията на стените).
  // На долната стена "-front"/"-back" са огледални: "edge-front" там е задният ръб.
  var GRAY = "var(--sq1-gray)";
  var MODELS = {
    // двата десни ръба (горен и долен)
    edgeSwap: {
      top:    { "*": GRAY, "edge-right": "var(--yellow)" },
      bottom: { "*": GRAY, "edge-right": "var(--white)" },
      front:  { "*": GRAY, "mid-l": "var(--orange)", "mid-r": "var(--orange)" },
      back:   GRAY,
      right:  { "*": GRAY, "mid": "var(--green)", "top-edge": "var(--red)", "bot-edge": "var(--red)" },
      left:   GRAY
    },
    // двата предни ъгъла в горния слой (червен вляво, син вдясно)
    cornerPerm: {
      top:    {
        "*": GRAY, "corner-fl": "var(--red)", "edge-front": "var(--red)",
        "corner-fr": "var(--blue)", "edge-right": "var(--blue)"
      },
      bottom: GRAY,
      front:  {
        "*": GRAY, "mid-l": "var(--orange)", "mid-r": "var(--orange)",
        "top-l": "var(--red)", "top-edge": "var(--red)", "top-r": "var(--blue)"
      },
      back:   GRAY,
      right:  { "*": GRAY, "mid": "var(--green)", "top-l": "var(--blue)", "top-edge": "var(--blue)" },
      left:   { "*": GRAY, "top-r": "var(--red)" }
    },
    // цветен пъзел: десните ръбове (горе и долу) са червени отстрани,
    // задните ръбове (горе и долу) са зелени; задната страна и техните капачета са сиви
    edgePerm: {
      top:    { "*": "var(--white)", "edge-back": GRAY, "edge-right": GRAY },
      bottom: { "*": "var(--yellow)", "edge-front": GRAY, "edge-right": GRAY },
      front:  "var(--orange)",
      back:   { "*": GRAY, "top-edge": "var(--green)", "bot-edge": "var(--green)" },
      right:  { "*": "var(--green)", "top-edge": "var(--red)", "bot-edge": "var(--red)" },
      left:   "var(--blue)"
    }
  };

  // 3D модел, който се върти с мишката/пръста (и със стрелките от клавиатурата).
  function buildViewer(colors) {
    var wrap = el("div", "sq1-viewer");
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", "3D Square-1. Влачи, за да го завъртиш.");
    var cube = el("div", "cube3d sq1");
    buildSq1(cube, colors);
    wrap.appendChild(cube);
    wrap.appendChild(el("span", "sq1-viewer__hint", "↻ влачи"));

    var rx = -24, ry = -35, drag = null;
    function apply() {
      cube.style.transform = "rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    }
    function rotate(dx, dy) {
      ry += dx;
      rx = Math.max(-89, Math.min(89, rx - dy));
      apply();
    }

    wrap.addEventListener("pointerdown", function (e) {
      drag = { x: e.clientX, y: e.clientY };
      wrap.setPointerCapture(e.pointerId);
      wrap.classList.add("is-dragging");
    });
    wrap.addEventListener("pointermove", function (e) {
      if (!drag) return;
      rotate((e.clientX - drag.x) * 0.6, (e.clientY - drag.y) * 0.6);
      drag = { x: e.clientX, y: e.clientY };
    });
    function end() { drag = null; wrap.classList.remove("is-dragging"); }
    wrap.addEventListener("pointerup", end);
    wrap.addEventListener("pointercancel", end);
    wrap.addEventListener("keydown", function (e) {
      var d = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
      if (!d) return;
      e.preventDefault();
      rotate(d[0], d[1]);
    });

    apply();
    return wrap;
  }

  buildHero();
  CubeGuide.renderSteps({
    root: document.getElementById("steps"),
    steps: SQ1_STEPS,
    storageKey: STORAGE_KEY,
    tokenize: tokenize,
    describe: describeMove,
    buildVisual: function (step) { return buildViewer(MODELS[step.model]); }
  });
})();
