(function () {
  var form = document.querySelector("[data-price-calc]");
  if (!form) return;
  var cfg = JSON.parse(form.getAttribute("data-price-calc"));
  var lang = document.documentElement.lang || "nb";
  var fmt = new Intl.NumberFormat(lang === "en" ? "en-GB" : "nb-NO", { maximumFractionDigits: 0 });
  var users = form.querySelector("#calc-users");
  var agents = form.querySelector("#calc-agents");
  var out = form.querySelector("[data-price-out]");

  function platform(n) {
    for (var i = 0; i < cfg.tiers.length; i++) {
      var t = cfg.tiers[i];
      if (t.upTo === null) return Math.round(n * t.perUser);
      if (n <= t.upTo) return t.price;
    }
    return 0;
  }
  function kr(v) {
    return cfg.kr.replace("{v}", fmt.format(v));
  }
  function update() {
    var u = Math.max(1, Math.floor(Number(users.value) || 0));
    var a = Math.max(1, Math.floor(Number(agents.value) || 0));
    var p = platform(u);
    var month = p + a * cfg.perAgent;
    var pilot = Math.round(month * (100 - cfg.pilotPct) / 100);
    out.querySelector("[data-v=platform]").textContent = kr(p);
    out.querySelector("[data-v=agents]").textContent = kr(a * cfg.perAgent);
    out.querySelector("[data-v=month]").textContent = kr(month);
    out.querySelector("[data-v=year]").textContent = kr(month * 12);
    out.querySelector("[data-v=pilot]").textContent = kr(pilot);
  }
  form.addEventListener("input", update);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    update();
  });
  form.querySelector("[data-js-only]").hidden = false;
  var nojs = form.querySelector("[data-no-js]");
  if (nojs) nojs.hidden = true;
  update();
})();
