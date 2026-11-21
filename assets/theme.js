(function () {
  var KEY = "avlasta-theme";
  var root = document.documentElement;
  function read() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      return null;
    }
  }
  function write(v) {
    try {
      localStorage.setItem(KEY, v);
    } catch (e) {
      /* storage blocked: the choice lasts for this page only */
    }
  }
  // Screenshots follow the chosen theme, not only the operating system (Øystein 21.11.2026).
  function pictures(v) {
    var sources = document.querySelectorAll("picture source[media*='prefers-color-scheme']");
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i];
      if (!s.hasAttribute("data-media")) s.setAttribute("data-media", s.getAttribute("media"));
      s.setAttribute("media", v === "dark" ? "all" : v === "light" ? "not all" : s.getAttribute("data-media"));
    }
  }
  function apply(v) {
    if (v === "light" || v === "dark") root.setAttribute("data-theme", v);
    else root.removeAttribute("data-theme");
    pictures(v);
  }
  // Light is the default (most users work in light mode); «Som systemet» only when chosen.
  var saved = read() || "light";
  apply(saved);

  document.addEventListener("DOMContentLoaded", function () {
    var group = document.querySelector("[data-theme-group]");
    if (!group) return;
    group.hidden = false;
    var buttons = group.querySelectorAll("button[data-theme-value]");
    function mark(v) {
      for (var i = 0; i < buttons.length; i++) {
        buttons[i].setAttribute("aria-pressed", String(buttons[i].getAttribute("data-theme-value") === v));
      }
    }
    pictures(saved);
    mark(saved === "light" || saved === "dark" ? saved : "system");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (ev) {
        var v = ev.currentTarget.getAttribute("data-theme-value");
        apply(v);
        write(v);
        mark(v);
      });
    }
  });
})();
