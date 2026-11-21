// Reads the demo's health check, appends the result to status/data.json (history is taken from the live site,
// so nothing is committed), and rewrites the status block in the status pages. No dependencies.
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const cfg = JSON.parse(readFileSync("status/config.json", "utf8"));
const KEEP_DAYS = 30;
const DAYS_SHOWN = 30;
const TIMEOUT_MS = 20000;

async function previous() {
  try {
    const r = await fetch(`${cfg.siteUrl}/status/data.json`, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.checks)) return d;
    }
  } catch {}
  try {
    return JSON.parse(readFileSync("status/data.json", "utf8"));
  } catch {
    return { checks: [] };
  }
}

async function check() {
  const t0 = performance.now();
  const at = new Date().toISOString();
  try {
    const r = await fetch(cfg.healthUrl, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store", headers: { "user-agent": "avlasta-status" } });
    const ms = Math.round(performance.now() - t0);
    let body = null;
    try {
      body = await r.json();
    } catch {}
    const db = body?.db?.ok === true;
    return { t: at, ok: r.status === 200 && body?.ok === true && db, ms, db };
  } catch {
    return { t: at, ok: false, ms: null, db: null };
  }
}

const data = await previous();
const now = await check();
const cutoff = Date.now() - KEEP_DAYS * 864e5;
const checks = [...data.checks.filter((c) => Date.parse(c.t) >= cutoff && c.t !== now.t), now].sort((a, b) => a.t.localeCompare(b.t));
writeFileSync("status/data.json", JSON.stringify({ updated: now.t, intervalMinutes: cfg.intervalMinutes, checks }) + "\n");

// ---------- render ----------
const L = {
  nb: {
    loc: "nb-NO",
    up: "Demoen virker",
    down: "Demoen svarer ikke",
    db: "Demoen svarer, men databasen har feil",
    last: (d, ms) => `Sist sjekket ${d}${ms != null ? `, svarte på ${fmtMs(ms, "nb")}` : ""}.`,
    k24: "Oppe siste 24 timer",
    k7: "Oppe siste 7 dager",
    k30: "Oppe siste 30 dager",
    kMs: "Median svartid siste 24 timer",
    checks: (n) => `${n} ${n === 1 ? "sjekk" : "sjekker"}`,
    none: "ingen sjekker",
    daysH: "Siste 30 dager",
    barsLabel: "Oppetid per dag. Tallene står i tabellen under.",
    old: "eldst",
    today: "i dag",
    th: ["Dato", "Sjekker", "Oppe", "Tregeste svar"],
    noData: "Ingen målinger",
    tableCap: "Oppetid per dag, nyeste først. Dager uten målinger er ikke med.",
  },
  en: {
    loc: "en-GB",
    up: "The demo is working",
    down: "The demo is not responding",
    db: "The demo responds, but the database has errors",
    last: (d, ms) => `Last checked ${d}${ms != null ? `, replied in ${fmtMs(ms, "en")}` : ""}.`,
    k24: "Up last 24 hours",
    k7: "Up last 7 days",
    k30: "Up last 30 days",
    kMs: "Median response last 24 hours",
    checks: (n) => `${n} ${n === 1 ? "check" : "checks"}`,
    none: "no checks",
    daysH: "Last 30 days",
    barsLabel: "Uptime per day. The figures are in the table below.",
    old: "oldest",
    today: "today",
    th: ["Date", "Checks", "Up", "Slowest reply"],
    noData: "No checks",
    tableCap: "Uptime per day, newest first. Days without checks are left out.",
  },
};

function fmtMs(ms, lang) {
  const loc = L[lang].loc;
  if (ms < 1000) return `${ms} ms`;
  return `${new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(ms / 1000)} s`;
}
const pct = (list, lang) => {
  if (!list.length) return null;
  const v = (100 * list.filter((c) => c.ok).length) / list.length;
  return new Intl.NumberFormat(L[lang].loc, { maximumFractionDigits: v === 100 ? 0 : 2 }).format(v).replace(/ /g, " ") + " %";
};
const since = (h) => checks.filter((c) => Date.parse(c.t) >= Date.now() - h * 36e5);
const dayKey = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });

function render(lang) {
  const t = L[lang];
  const last = checks[checks.length - 1];
  const state = last.ok ? "ok" : last.db === false ? "warn" : "down";
  const label = last.ok ? t.up : last.db === false ? t.db : t.down;
  const when = new Date(last.t).toLocaleString(t.loc, { timeZone: "Europe/Oslo", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const kpi = (l, list) => {
    const p = pct(list, lang);
    return `<div class="kpi"><div class="v">${p ?? "·"}</div><div class="l">${l}</div><div class="fine">${list.length ? t.checks(list.length) : t.none}</div></div>`;
  };
  const okMs = since(24).filter((c) => c.ms != null).map((c) => c.ms).sort((a, b) => a - b);
  const median = okMs.length ? fmtMs(okMs[Math.floor(okMs.length / 2)], lang) : "·";

  const days = [];
  for (let i = DAYS_SHOWN - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 864e5).toISOString());
    const list = checks.filter((c) => dayKey(c.t) === key);
    days.push({ key, list });
  }
  const bars = days
    .map(({ list }) => {
      if (!list.length) return "<span></span>";
      const up = list.filter((c) => c.ok).length / list.length;
      return `<span class="${up === 1 ? "b-ok" : up >= 0.95 ? "b-warn" : "b-down"}"></span>`;
    })
    .join("");
  const rows = days
    .filter((d) => d.list.length)
    .reverse()
    .map(({ key, list }) => {
      const slow = Math.max(...list.map((c) => c.ms ?? 0));
      const date = new Date(key + "T12:00:00Z").toLocaleDateString(t.loc, { day: "numeric", month: "long" });
      return `<tr><th scope="row">${date}</th><td class="num">${list.length}</td><td class="num">${pct(list, lang)}</td><td class="num">${slow ? fmtMs(slow, lang) : "·"}</td></tr>`;
    })
    .join("");

  return `
    <div class="status-now ${state}"><span class="light" aria-hidden="true"></span><p><strong>${label}</strong><br><span class="fine">${t.last(when, last.ms)}</span></p></div>
    <div class="kpis">${kpi(t.k24, since(24))}${kpi(t.k7, since(24 * 7))}${kpi(t.k30, since(24 * 30))}<div class="kpi"><div class="v">${median}</div><div class="l">${t.kMs}</div></div></div>
    <h2>${t.daysH}</h2>
    <div class="bars" role="img" aria-label="${t.barsLabel}">${bars}</div>
    <div class="bars-legend" aria-hidden="true"><span>${DAYS_SHOWN} ${lang === "en" ? "days ago" : "dager siden"}</span><span>${t.today}</span></div>
    <div class="table-wrap"><table><caption>${t.tableCap}</caption><thead><tr>${t.th.map((h, i) => `<th scope="col"${i ? ' class="num"' : ""}>${h}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
`;
}

for (const [file, lang] of [
  ["status/index.html", "nb"],
  ["en/status/index.html", "en"],
]) {
  if (!existsSync(file)) continue;
  const html = readFileSync(file, "utf8");
  const re = new RegExp(`(<!--status:start ${lang}-->)[\\s\\S]*?(<!--status:end-->)`);
  writeFileSync(file, html.replace(re, `$1${render(lang)}$2`));
}
console.log(`ok=${now.ok} ms=${now.ms} db=${now.db} history=${checks.length}`);
