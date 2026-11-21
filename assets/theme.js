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
      if (v === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, v);
    } catch (e) {
      /* storage blocked: the choice lasts for this page only */
    }
  }
  function apply(v) {
    if (v === "light" || v === "dark") root.setAttribute("data-theme", v);
    else root.removeAttribute("data-theme");
  }
  var saved = read();
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
