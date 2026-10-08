(function () {
  "use strict";

  var COLORS = {
    b: "var(--blue)",
    g: "var(--green)",
    y: "var(--yellow)",
    r: "var(--red)"
  };

  var FACE_NAMES = {
    R: "дясната", L: "лявата", U: "горната",
    D: "долната", F: "предната", B: "задната"
  };

  // Стъпките за Pocket Cube (алгоритми от SuperAntoniovivaldi).
  // mini: цветовете на малките парчета в горния десен ъгъл на предната страна.
  var POCKET_CUBE_STEPS = [
    {
      title: "Върни кубчето във форма на куб",
      text: "Върни кубчето обратно във форма на куб или във форма с една избутана назад колона. " +
            "Направи го интуитивно. Ако кубчето е с избутана назад колона, използвай един от " +
            "алгоритмите по-долу. <strong>Дръж страната с избутаните назад малки парчета като предна (F).</strong>",
      mini: { colors: "bgyb", highlight: false },
      algos: [
        { label: "Вариант A: виждаш U, L и F", moves: "R F R' F' R' D R D' F D R'" },
        { label: "Вариант B: виждаш U, F и R", moves: "L' F' L F L D' L' D F' D' L" }
      ]
    },
    {
      title: "Съвпадение на малко крайно парче с малкото ъглово",
      text: "Целта е поне едно малко крайно парче да съвпадне с малкото ъглово парче. " +
            "Няма значение кое крайно парче съвпада. Използвай алгоритъма, като малките парчета " +
            "са в <strong>горния десен ъгъл на предната страна</strong>.",
      mini: { colors: "rrby", highlight: true },
      algos: [
        { label: "Алгоритъм", moves: "L B' U' B L2 D F2 D' L D L' F'" }
      ],
      hint: "След алгоритъма една колона пак ще е избутана назад. Използвай алгоритъм от стъпка 1, " +
            "за да върнеш формата на куб, и повтаряй, докато получиш резултата."
    },
    {
      title: "Всички малки крайни парчета на място",
      text: "Сега всички малки крайни парчета трябва да са на правилното място, освен две, " +
            "които трябва да се обърнат на място. Няма значение кои две. Използвай алгоритъма, " +
            "като малките парчета са в <strong>горния десен ъгъл на предната страна</strong>.",
      mini: { colors: "ybry", highlight: true },
      algos: [
        { label: "Алгоритъм", moves: "L B' U' L' B D L' F' D' L B D' R'" }
      ],
      hint: "Отново използвай алгоритъм от стъпка 1, за да върнеш формата на куб, и повтаряй, " +
            "докато получиш резултата."
    },
    {
      title: "Обърни последните две парчета",
      text: "Изпълни алгоритъма <strong>два пъти</strong>, за да обърнеш последните две крайни парчета. " +
            "След първото изпълнение кубчето няма да е във форма на куб, това е нормално. " +
            "Дръж кубчето ориентирано както преди.",
      mini: { colors: "bbbb", highlight: false },
      algos: [
        { label: "Алгоритъм", moves: "L B' U' L' B D L' F' D' L B D' R' B' D", repeat: 2 }
      ],
      hint: "Повтаряй, докато кубчето се подреди. За запомняне: това е алгоритъмът от стъпка 3 " +
            "с още два хода накрая (B' D)."
    }
  ];

  var STORAGE_KEY = "cube-formulas:pocket-cube:done";

  var el = CubeGuide.el;

  function describeMove(move) {
    var face = FACE_NAMES[move.charAt(0)];
    if (!face) return "";
    if (move.indexOf("2") > -1) return "Завърти " + face + " страна на 180°";
    if (move.indexOf("'") > -1) return "Завърти " + face + " страна обратно на часовниковата стрелка";
    return "Завърти " + face + " страна по часовниковата стрелка";
  }

  /* ---------- cube visuals ---------- */

  function smallTile(colors, highlight) {
    var tile = el("div", "tile tile--small" + (highlight ? " is-hl" : ""));
    colors.split("").forEach(function (c) {
      var s = el("span", "sticker");
      s.style.background = COLORS[c];
      tile.appendChild(s);
    });
    return tile;
  }

  // smallAt: в кой квадрант (0 горе-ляво … 3 долу-дясно) са малките парчета; -1 = няма.
  function buildFace(className, colors, smallAt, highlight) {
    var face = el("div", className);
    for (var q = 0; q < 4; q++) {
      face.appendChild(q === smallAt ? smallTile(colors, highlight) : el("div", "tile"));
    }
    return face;
  }

  // Малките парчета са само в един ъгъл на кубчето: горе-отпред-вдясно.
  // Квадрантите са избрани така, че трите страни да се срещат в този ъгъл.
  function buildHeroCube() {
    var cube = document.getElementById("cube3d");
    if (!cube) return;
    var faces = [
      { name: "front",  colors: "bbbb", smallAt: 1 },
      { name: "right",  colors: "gggg", smallAt: 0 },
      { name: "top",    colors: "yyyy", smallAt: 3 },
      { name: "back",   smallAt: -1 },
      { name: "left",   smallAt: -1 },
      { name: "bottom", smallAt: -1 }
    ];
    faces.forEach(function (f) {
      cube.appendChild(buildFace("face face--" + f.name, f.colors || "", f.smallAt, false));
    });
  }

  function buildMini(mini) {
    var wrap = buildFace("mini", mini.colors, 1, mini.highlight);
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", "Предна страна: малките парчета са в горния десен ъгъл");
    wrap.appendChild(el("span", "mini__label mini__label--f", "F"));
    wrap.appendChild(el("span", "mini__label mini__label--r", "R"));
    return wrap;
  }

  buildHeroCube();
  CubeGuide.renderSteps({
    root: document.getElementById("steps"),
    steps: POCKET_CUBE_STEPS,
    storageKey: STORAGE_KEY,
    tokenize: function (s) { return s.trim().split(/\s+/); },
    describe: describeMove,
    buildVisual: function (step) { return buildMini(step.mini); }
  });
})();
