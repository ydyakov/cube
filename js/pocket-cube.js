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

  /* ---------- helpers ---------- */

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function describeMove(move) {
    var face = FACE_NAMES[move.charAt(0)];
    if (!face) return "";
    if (move.indexOf("2") > -1) return "Завърти " + face + " страна на 180°";
    if (move.indexOf("'") > -1) return "Завърти " + face + " страна обратно на часовниковата стрелка";
    return "Завърти " + face + " страна по часовниковата стрелка";
  }

  function readDone() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeDone(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable */ }
  }

  var toastTimer;
  function toast(message) {
    var node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-on"); }, 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(area);
      }
    });
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

  /* ---------- algorithm card with practice mode ---------- */

  function buildAlgo(algo) {
    var moves = algo.moves.split(/\s+/);
    var repeat = algo.repeat || 1;
    var sequence = [];
    for (var r = 0; r < repeat; r++) sequence = sequence.concat(moves);

    var card = el("div", "algo");
    var head = el("div", "algo__head");
    var title = el("span", "algo__title", algo.label);
    if (repeat > 1) title.appendChild(el("span", "repeat", "(×" + repeat + ")"));

    var tools = el("div", "algo__tools");
    var copyBtn = el("button", "tool", "Копирай");
    copyBtn.type = "button";
    var practiceBtn = el("button", "tool", "Упражнявай");
    practiceBtn.type = "button";
    practiceBtn.setAttribute("aria-pressed", "false");
    tools.appendChild(copyBtn);
    tools.appendChild(practiceBtn);
    head.appendChild(title);
    head.appendChild(tools);

    var list = el("div", "moves");
    var chips = moves.map(function (m) {
      var chip = el("span", "move", m);
      chip.setAttribute("data-tip", describeMove(m));
      list.appendChild(chip);
      return chip;
    });

    var practice = el("div", "practice");
    var prev = el("button", "tool", "← Назад");
    var next = el("button", "tool", "Напред →");
    prev.type = next.type = "button";
    var count = el("span", "practice__count");
    var desc = el("span", "practice__desc");
    practice.appendChild(prev);
    practice.appendChild(next);
    practice.appendChild(count);
    practice.appendChild(desc);

    card.appendChild(head);
    card.appendChild(list);
    card.appendChild(practice);

    var index = 0;

    function render() {
      var on = practiceBtn.getAttribute("aria-pressed") === "true";
      var pos = index % moves.length;
      var round = Math.floor(index / moves.length) + 1;
      chips.forEach(function (chip, i) {
        chip.classList.toggle("is-active", on && i === pos);
        chip.classList.toggle("is-past", on && i < pos);
      });
      if (!on) return;
      count.textContent = (index + 1) + " / " + sequence.length +
        (repeat > 1 ? " · път " + round : "");
      desc.textContent = describeMove(sequence[index]);
      prev.disabled = index === 0;
      next.textContent = index === sequence.length - 1 ? "Готово ✓" : "Напред →";
    }

    copyBtn.addEventListener("click", function () {
      var text = algo.moves + (repeat > 1 ? " (x" + repeat + ")" : "");
      copyText(text).then(
        function () { toast("Копирано: " + text); },
        function () { toast("Неуспешно копиране"); }
      );
    });

    practiceBtn.addEventListener("click", function () {
      var on = practiceBtn.getAttribute("aria-pressed") !== "true";
      practiceBtn.setAttribute("aria-pressed", String(on));
      practice.classList.toggle("is-on", on);
      index = 0;
      render();
      if (on) next.focus();
    });

    prev.addEventListener("click", function () {
      if (index > 0) { index--; render(); }
    });

    next.addEventListener("click", function () {
      if (index < sequence.length - 1) {
        index++;
        render();
      } else {
        practiceBtn.click();
        toast("Алгоритъмът е изпълнен!");
      }
    });

    practice.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
    });

    return card;
  }

  /* ---------- steps & progress ---------- */

  function buildSteps() {
    var root = document.getElementById("steps");
    if (!root) return;
    var done = readDone();

    POCKET_CUBE_STEPS.forEach(function (step, i) {
      var item = el("li", "step");
      item.id = "pocket-step-" + (i + 1);

      var aside = el("div", "step__aside");
      aside.appendChild(el("span", "step__num", String(i + 1)));
      aside.appendChild(buildMini(step.mini));

      var body = el("div", "step__body");
      body.appendChild(el("h3", null, step.title));
      body.appendChild(el("p", null, step.text));
      step.algos.forEach(function (a) { body.appendChild(buildAlgo(a)); });
      if (step.hint) body.appendChild(el("p", "hint", step.hint));

      var label = el("label", "step__done");
      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = !!done[i];
      label.appendChild(box);
      label.appendChild(document.createTextNode("Стъпката е готова"));
      body.appendChild(label);

      item.classList.toggle("is-done", box.checked);
      box.addEventListener("change", function () {
        var state = readDone();
        state[i] = box.checked;
        writeDone(state);
        item.classList.toggle("is-done", box.checked);
        updateProgress();
      });

      item.appendChild(aside);
      item.appendChild(body);
      root.appendChild(item);
    });

    document.getElementById("resetProgress").addEventListener("click", function () {
      writeDone({});
      root.querySelectorAll(".step").forEach(function (item) {
        item.classList.remove("is-done");
        item.querySelector(".step__done input").checked = false;
      });
      updateProgress();
    });

    updateProgress();
  }

  function updateProgress() {
    var boxes = document.querySelectorAll("#steps .step__done input");
    var checked = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).length;
    var total = boxes.length;
    document.getElementById("progressFill").style.width = (total ? checked / total * 100 : 0) + "%";
    document.getElementById("progressText").textContent = checked + " / " + total + " стъпки";
  }

  buildHeroCube();
  buildSteps();
})();
