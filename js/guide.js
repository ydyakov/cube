// Общ код за страниците с ръководства: стъпки, алгоритми, режим „Упражнявай“ и напредък.
// Всеки пъзел подава своите данни на CubeGuide.renderSteps(...).
(function () {
  "use strict";

  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* storage unavailable */ }
  }

  var toastTimer;
  function toast(message) {
    var node = document.getElementById("toast");
    if (!node) return;
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

  /* ---------- algorithm card with practice mode ---------- */

  function buildAlgo(algo, opts) {
    var moves = opts.tokenize(algo.moves);
    var repeat = algo.repeat || 1;
    var sequence = [];
    for (var r = 0; r < repeat; r++) sequence = sequence.concat(moves);
    var plain = moves.join(opts.joiner);

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
      chip.setAttribute("data-tip", opts.describe(m));
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
      desc.textContent = opts.describe(sequence[index]);
      prev.disabled = index === 0;
      next.textContent = index === sequence.length - 1 ? "Готово ✓" : "Напред →";
    }

    copyBtn.addEventListener("click", function () {
      var text = plain + (repeat > 1 ? " (x" + repeat + ")" : "");
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

  // opts: {
  //   root, steps, storageKey,
  //   tokenize(movesString) -> [token], describe(token) -> string, joiner,
  //   buildVisual(step) -> Node (по избор)
  // }
  function renderSteps(opts) {
    var root = opts.root;
    if (!root) return;
    opts.joiner = opts.joiner || " ";
    var done = readJSON(opts.storageKey);

    function updateProgress() {
      var fill = document.getElementById("progressFill");
      var text = document.getElementById("progressText");
      if (!fill || !text) return;
      var boxes = root.querySelectorAll(".step__done input");
      var checked = Array.prototype.filter.call(boxes, function (b) { return b.checked; }).length;
      var total = boxes.length;
      fill.style.width = (total ? checked / total * 100 : 0) + "%";
      text.textContent = checked + " / " + total + (total === 1 ? " стъпка" : " стъпки");
    }

    opts.steps.forEach(function (step, i) {
      var item = el("li", "step");

      var aside = el("div", "step__aside");
      aside.appendChild(el("span", "step__num", String(i + 1)));
      if (opts.buildVisual) aside.appendChild(opts.buildVisual(step));

      var body = el("div", "step__body");
      body.appendChild(el("h3", null, step.title));
      body.appendChild(el("p", null, step.text));
      step.algos.forEach(function (a) { body.appendChild(buildAlgo(a, opts)); });
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
        var state = readJSON(opts.storageKey);
        state[i] = box.checked;
        writeJSON(opts.storageKey, state);
        item.classList.toggle("is-done", box.checked);
        updateProgress();
      });

      item.appendChild(aside);
      item.appendChild(body);
      root.appendChild(item);
    });

    var reset = document.getElementById("resetProgress");
    if (reset) {
      reset.addEventListener("click", function () {
        writeJSON(opts.storageKey, {});
        root.querySelectorAll(".step").forEach(function (item) {
          item.classList.remove("is-done");
          item.querySelector(".step__done input").checked = false;
        });
        updateProgress();
      });
    }

    updateProgress();
  }

  window.CubeGuide = { el: el, renderSteps: renderSteps };
})();
