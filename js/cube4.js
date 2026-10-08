(function () {
  "use strict";

  // Анимиран 4×4 куб: разбърква се с няколко хода, после ги връща обратно и се подрежда.

  var N = 4;
  var SIZE = 60;                       // px на едно кубче (CSS мащабира сцената на малки екрани)
  var LAYERS = [-1.5, -0.5, 0.5, 1.5].map(function (k) { return k * SIZE; });
  var TURN_MS = 420;
  var SCRAMBLE_LENGTH = 8;

  var AXES = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

  // Цвят на страната спрямо подредения куб (CSS осите: y сочи надолу, z към зрителя).
  var FACES = [
    { name: "right",  color: "var(--red)",    test: function (x) { return x === N - 1; } },
    { name: "left",   color: "var(--orange)", test: function (x) { return x === 0; } },
    { name: "top",    color: "var(--white)",  test: function (x, y) { return y === 0; } },
    { name: "bottom", color: "var(--yellow)", test: function (x, y) { return y === N - 1; } },
    { name: "front",  color: "var(--green)",  test: function (x, y, z) { return z === N - 1; } },
    { name: "back",   color: "var(--blue)",   test: function (x, y, z) { return z === 0; } }
  ];

  var root = document.getElementById("cube4");
  if (!root || typeof DOMMatrix === "undefined") return;

  var pivot = document.createElement("div");
  pivot.className = "rcube__pivot";
  root.appendChild(pivot);

  var cubies = [];

  function roundMatrix(m) {
    return new DOMMatrix(Array.prototype.map.call(m.toFloat64Array(), Math.round));
  }

  function setMatrix(cubie, m) {
    cubie.matrix = m;
    cubie.el.style.transform = m.toString();
  }

  function build() {
    for (var x = 0; x < N; x++) {
      for (var y = 0; y < N; y++) {
        for (var z = 0; z < N; z++) {
          var outer = x === 0 || y === 0 || z === 0 || x === N - 1 || y === N - 1 || z === N - 1;
          if (!outer) continue;

          var node = document.createElement("div");
          node.className = "cubie";
          FACES.forEach(function (f) {
            var face = document.createElement("span");
            face.className = "cubie__face cubie__face--" + f.name;
            if (f.test(x, y, z)) {
              face.classList.add("has-sticker");
              face.style.setProperty("--c", f.color);
            }
            node.appendChild(face);
          });
          root.appendChild(node);

          var cubie = { el: node, matrix: null };
          setMatrix(cubie, new DOMMatrix().translate(
            (x - 1.5) * SIZE, (y - 1.5) * SIZE, (z - 1.5) * SIZE
          ));
          cubies.push(cubie);
        }
      }
    }
  }

  function coord(m, axis) {
    return axis === "x" ? m.m41 : axis === "y" ? m.m42 : m.m43;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function turn(move) {
    var a = AXES[move.axis];
    var angle = 90 * move.dir;
    var layer = cubies.filter(function (c) {
      return Math.round(coord(c.matrix, move.axis)) === move.layer;
    });

    pivot.style.transition = "none";
    pivot.style.transform = "none";
    layer.forEach(function (c) { pivot.appendChild(c.el); });
    void pivot.offsetWidth; // reflow, за да тръгне преходът от 0°

    pivot.style.transition = "transform " + TURN_MS + "ms cubic-bezier(.45,.05,.3,1)";
    pivot.style.transform = "rotate3d(" + a.join(",") + "," + angle + "deg)";

    return wait(TURN_MS + 40).then(function () {
      var r = new DOMMatrix().rotateAxisAngle(a[0], a[1], a[2], angle);
      layer.forEach(function (c) {
        setMatrix(c, roundMatrix(r.multiply(c.matrix)));
        root.appendChild(c.el);
      });
      pivot.style.transition = "none";
      pivot.style.transform = "none";
    });
  }

  function randomScramble(length) {
    var keys = Object.keys(AXES);
    var moves = [];
    while (moves.length < length) {
      var m = {
        axis: keys[Math.floor(Math.random() * keys.length)],
        layer: LAYERS[Math.floor(Math.random() * LAYERS.length)],
        dir: Math.random() < 0.5 ? 1 : -1
      };
      var prev = moves[moves.length - 1];
      if (prev && prev.axis === m.axis && prev.layer === m.layer) continue; // без безсмислени повторения
      moves.push(m);
    }
    return moves;
  }

  function sequence(moves) {
    return moves.reduce(function (p, m) {
      return p.then(function () { return turn(m); });
    }, Promise.resolve());
  }

  function loop() {
    var scramble = randomScramble(SCRAMBLE_LENGTH);
    var solve = scramble.slice().reverse().map(function (m) {
      return { axis: m.axis, layer: m.layer, dir: -m.dir };
    });
    return wait(900)
      .then(function () { return sequence(scramble); })
      .then(function () { return wait(700); })
      .then(function () { return sequence(solve); })
      .then(loop);
  }

  build();

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) loop();
})();
