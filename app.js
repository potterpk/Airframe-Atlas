const { NOW, GROUPS, A } = window.AIRCRAFT_DATA;
const byId = Object.fromEntries(A.map(a => [a.id, a]));
const yr = s => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return y + ((m - 1) + (d - 1) / 30) / 12;
};
A.forEach(a => { a.ffy = yr(a.ff); a.kids = []; });
A.forEach(a => a.pred.forEach(([p, t]) => byId[p].kids.push([a.id, t])));

const STATUS = {
  prod: "In production",
  cert: "In certification",
  ended: "Production ended",
  retired: "Retired from service"
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"
}[c]));
const fmtDate = s => {
  const [y, m, d] = s.split("-");
  return new Date(Date.UTC(+y, +m - 1, +d)).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC"
  });
};

function aircraftOptions(select, selected) {
  select.innerHTML = A.map(a =>
    `<option value="${a.id}"${a.id === selected ? " selected" : ""}>${esc(a.name)}</option>`
  ).join("");
}

function buildTimeline() {
  const svg = document.getElementById("tl");
  if (!svg) return;
  const LW = 230, PW = 980, Y0 = 1930, Y1 = 2030, RH = 24, GH = 30, TOP = 26;
  const x = y => LW + (y - Y0) / (Y1 - Y0) * PW;
  const rows = [];
  let y = TOP;
  GROUPS.forEach(([g, label]) => {
    rows.push({ type: "g", label, y });
    y += GH;
    A.filter(a => a.g === g).forEach(a => {
      a.ry = y + RH / 2;
      rows.push({ type: "a", a, y });
      y += RH;
    });
  });
  const H = y + 8, W = LW + PW + 20;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("width", W);
  svg.setAttribute("height", H);
  let s = `<defs>
    <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="5" fill="var(--accent)"/></pattern>
    <marker id="arr" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z" fill="var(--muted)"/></marker>
  </defs>`;
  for (let yy = Y0; yy <= Y1; yy += 10) {
    s += `<line class="grid" x1="${x(yy)}" x2="${x(yy)}" y1="${TOP - 6}" y2="${H - 4}"/><text class="yr" x="${x(yy)}" y="${TOP - 10}" text-anchor="middle">${yy}</text>`;
  }
  s += `<line class="grid" x1="${x(NOW)}" x2="${x(NOW)}" y1="${TOP - 6}" y2="${H - 4}" stroke-dasharray="2 3"/>`;
  rows.forEach(r => {
    if (r.type === "g") s += `<text class="grp" x="8" y="${r.y + GH - 9}">${esc(r.label)}</text>`;
  });
  A.forEach(a => a.pred.forEach(([p, t]) => {
    const P = byId[p], ex = x(a.ffy), y1 = P.ry, y2 = a.ry;
    s += `<path class="edge ${t}" d="M${x(P.ffy) + 4} ${y1} H${ex - 8} Q${ex - 4} ${y1} ${ex - 4} ${y1 + (y2 > y1 ? 4 : -4)} V${y2 + (y2 > y1 ? -4 : 4)} Q${ex - 4} ${y2} ${ex} ${y2}" marker-end="url(#arr)"/>`;
  }));
  rows.filter(r => r.type === "a").forEach(({ a, y }) => {
    const x1 = x(a.ffy), x2 = x(a.end ? Math.max(a.end + 0.5, a.ffy + 0.6) : NOW);
    const cls = a.st === "prod" ? "prod" : a.st === "cert" ? "cert" : "";
    s += `<g class="row" data-id="${a.id}" tabindex="0" role="link" aria-label="${esc(a.name)}, first flight ${a.ffy | 0}">
      <rect class="rowbg" x="0" y="${y}" width="${W}" height="${RH}"/>
      <text class="lbl" x="18" y="${y + RH / 2 + 4.5}">${esc(a.name.replace(" family", ""))}</text>
      <rect class="bar ${cls}" x="${x1}" y="${y + 7}" width="${Math.max(3, x2 - x1)}" height="${RH - 14}" rx="2"/>
      ${!a.end && a.st === "prod" ? `<path d="M${x2} ${y + 5} l6 ${RH / 2 - 5} l-6 ${RH / 2 - 5}z" fill="var(--accent)"/>` : ""}
      ${a.eis ? `<circle class="eis" cx="${x(a.eis + 0.5)}" cy="${y + RH / 2}" r="4"/>` : ""}
    </g>`;
  });
  svg.innerHTML = s;
  const openAircraft = e => {
    const row = e.target.closest(".row");
    if (row) location.href = `aircraft.html#${row.dataset.id}`;
  };
  svg.addEventListener("click", openAircraft);
  svg.addEventListener("keydown", e => {
    if (e.target.closest(".row") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openAircraft(e);
    }
  });
}

function initTimeline() {
  const stats = document.getElementById("stats");
  stats.innerHTML = `<div><b>${A.length}</b>types</div><div><b>${A.filter(a => a.st === "prod").length}</b>in production</div><div><b>1933–${Math.floor(NOW)}</b>first flights to now</div>`;
  const makers = document.getElementById("makers");
  makers.innerHTML = `<label>Design house</label>` +
    [["all", "All"], ...GROUPS].map(([key, label]) =>
      `<button class="chip" data-k="${key}" aria-pressed="${key === "all"}">${esc(label.split(" · ")[0])}</button>`
    ).join("") +
    `<input id="q" type="search" placeholder="Search name, engine, variant…" aria-label="Search aircraft">`;
  let filter = "all", query = "";
  function matches(a) {
    if (filter !== "all" && a.g !== filter) return false;
    return !query || [a.name, a.maker, a.v, a.eng, a.id].join(" ").toLowerCase().includes(query);
  }
  function applyFilter() {
    document.querySelectorAll("#tl .row").forEach(row =>
      row.classList.toggle("dim", !matches(byId[row.dataset.id]))
    );
  }
  makers.addEventListener("click", e => {
    const button = e.target.closest(".chip");
    if (!button) return;
    filter = button.dataset.k;
    makers.querySelectorAll(".chip").forEach(chip =>
      chip.setAttribute("aria-pressed", chip === button)
    );
    applyFilter();
  });
  makers.addEventListener("input", e => {
    if (e.target.id !== "q") return;
    query = e.target.value.trim().toLowerCase();
    applyFilter();
  });
  buildTimeline();
}

function renderAircraft(id) {
  const a = byId[id];
  if (!a) return;
  const compareWith = a.pred[0] && a.pred[0][0] !== id
    ? a.pred[0][0]
    : id === "a380" ? "b747" : "a380";
  drawTop(a);
  drawSide(a);
  drawFront(a);
  const picker = document.getElementById("aircraftPicker");
  if (picker) picker.value = id;
  document.getElementById("info").innerHTML = `
    <div class="title-block">
      <span class="maker">${esc(a.maker)} · sheet variant ${esc(a.v)}</span>
      <h2>${esc(a.name)}</h2>
      <span class="pill ${a.st}">${STATUS[a.st]}</span>
    </div>
    <table class="spec"><tbody>
      <tr><th>First flight</th><td>${fmtDate(a.ff)}</td></tr>
      <tr><th>Airline service</th><td>${a.eis ? a.eis : (a.st === "cert" ? "Not yet" : "Never (prototype)")}</td></tr>
      <tr><th>Production</th><td>${a.end ? (a.ffy | 0) + "–" + a.end : (a.st === "cert" ? "Pre-delivery" : "Ongoing")}</td></tr>
      <tr><th>Built</th><td>${esc(a.built)}</td></tr>
      <tr><th>Length · span · height</th><td>${a.len.toFixed(1)} m · ${a.span.toFixed(1)} m${a.fold ? ` (${a.fold} m folded)` : ""} · ${a.h.toFixed(1)} m</td></tr>
      <tr><th>Wing sweep</th><td>${a.lay === "concorde" ? "Ogival delta" : a.sw + "° (approx.)"}</td></tr>
      <tr><th>Seats</th><td>${esc(a.seats)}</td></tr>
      <tr><th>Range</th><td>${esc(a.range)}</td></tr>
      <tr><th>Cruise</th><td>${esc(a.cruise)}</td></tr>
      <tr><th>Engines</th><td>${esc(a.eng)}</td></tr>
    </tbody></table>
    <p class="note">${esc(a.note)}</p>
    <div class="kin">
      <div><span class="k">Derived from</span>${lineageLinks(a.pred)}</div>
      <div><span class="k">Led to</span>${lineageLinks(a.kids)}</div>
    </div>
    <div class="links">
      <span class="k">Archival drawings and sources</span>
      <a href="https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(a.name.replace(/ “.*”/, "") + " 3-view")}&title=Special:MediaSearch&type=image">Three-view drawings on Wikimedia Commons</a>
      <a href="https://ntrs.nasa.gov/search?q=${encodeURIComponent(a.name.replace(/ “.*”/, "").replace(" family", ""))}">NASA Technical Reports Server: test reports and drawings</a>
      <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(a.wiki)}">Encyclopedia entry (Wikipedia)</a>
    </div>
    <a class="button-link" href="compare.html?left=${encodeURIComponent(id)}&right=${encodeURIComponent(compareWith)}">Compare this aircraft</a>`;
}

function lineageLinks(list) {
  return list.length
    ? list.map(([id, type]) => `<a href="aircraft.html#${encodeURIComponent(id)}" title="${type === "d" ? "Direct derivative" : "Shares major parts or concept"}">${esc(byId[id].name)}${type === "i" ? " ⋯" : ""}</a>`).join("")
    : `<span class="none">None in this atlas</span>`;
}

function initAircraft() {
  const picker = document.getElementById("aircraftPicker");
  aircraftOptions(picker, "b747");
  picker.addEventListener("change", () => { location.hash = picker.value; });
  const selectFromHash = () => {
    const id = location.hash.slice(1);
    renderAircraft(byId[id] ? id : "b747");
  };
  window.addEventListener("hashchange", selectFromHash);
  selectFromHash();
}

function renderComparison(a, b) {
  const panel = document.getElementById("compareReadout");
  if (!a || !b || a.id === b.id) {
    panel.hidden = true;
    panel.innerHTML = "";
    return;
  }
  const metrics = [["Length", a.len, b.len], ["Wingspan", a.span, b.span], ["Height", a.h, b.h]];
  panel.hidden = false;
  panel.innerHTML = `
    <div class="compare-heading"><span>Dashed outline · scale check</span><strong>${esc(a.name)} vs ${esc(b.name)}</strong></div>
    <div class="compare-metrics">${metrics.map(([label, left, right]) => {
      const difference = left - right;
      const adjectives = {
        Length: difference > 0 ? "longer" : "shorter",
        Wingspan: difference > 0 ? "wider" : "narrower",
        Height: difference > 0 ? "taller" : "shorter"
      };
      const verdict = difference === 0
        ? `Same ${label.toLowerCase()}`
        : `${esc(a.name)} is ${Math.abs(difference).toFixed(1)} m ${adjectives[label]} than ${esc(b.name)}`;
      return `<div class="compare-metric"><span>${label}</span><b>${left.toFixed(1)} m vs ${right.toFixed(1)} m</b><small>${verdict}</small></div>`;
    }).join("")}</div>`;
}

function initCompare() {
  const leftSelect = document.getElementById("compareLeft");
  const rightSelect = document.getElementById("compareRight");
  const saveButton = document.getElementById("saveComparison");
  const status = document.getElementById("apiStatus");
  const savedList = document.getElementById("savedComparisonList");
  const params = new URLSearchParams(location.search);
  const left = byId[params.get("left")] ? params.get("left") : "b747";
  const right = byId[params.get("right")] ? params.get("right") : "a380";
  aircraftOptions(leftSelect, left);
  aircraftOptions(rightSelect, right);
  function update() {
    const a = byId[leftSelect.value], b = byId[rightSelect.value];
    const overlay = a.id === b.id ? null : b;
    drawTop(a, overlay);
    drawSide(a, overlay);
    drawFront(a, overlay);
    renderComparison(a, b);
    const next = new URL(location.href);
    next.searchParams.set("left", a.id);
    next.searchParams.set("right", b.id);
    history.replaceState(null, "", next);
  }
  async function loadSavedComparisons() {
    try {
      const response = await fetch("/api/comparisons");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load saved comparisons.");
      savedList.innerHTML = payload.length
        ? payload.map(item => {
          const a = byId[item.left_aircraft], b = byId[item.right_aircraft];
          return `<div class="saved-item">
            <a href="compare.html?left=${encodeURIComponent(item.left_aircraft)}&right=${encodeURIComponent(item.right_aircraft)}">${esc(a.name)} <span>vs</span> ${esc(b.name)}</a>
            <button type="button" class="remove-saved" data-delete="${item.id}" aria-label="Remove saved comparison">Remove</button>
          </div>`;
        }).join("")
        : `<p class="saved-empty">No saved comparisons yet.</p>`;
      saveButton.disabled = false;
    } catch (error) {
      status.textContent = `Backend unavailable: ${error.message}. Start the server with python server.py.`;
      saveButton.disabled = true;
    }
  }
  saveButton.addEventListener("click", async () => {
    const left = leftSelect.value, right = rightSelect.value;
    if (left === right) {
      status.textContent = "Choose two different aircraft before saving.";
      return;
    }
    saveButton.disabled = true;
    status.textContent = "Saving comparison…";
    try {
      const response = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ left_aircraft: left, right_aircraft: right })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save this comparison.");
      status.textContent = "Comparison saved.";
      await loadSavedComparisons();
    } catch (error) {
      status.textContent = `Could not save comparison: ${error.message}`;
      saveButton.disabled = false;
    }
  });
  savedList.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;
    button.disabled = true;
    status.textContent = "Removing saved comparison…";
    try {
      const response = await fetch(`/api/comparisons/${encodeURIComponent(button.dataset.delete)}`, {
        method: "DELETE"
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not remove this comparison.");
      status.textContent = "Saved comparison removed.";
      await loadSavedComparisons();
    } catch (error) {
      status.textContent = `Could not remove comparison: ${error.message}`;
      button.disabled = false;
    }
  });
  leftSelect.addEventListener("change", update);
  rightSelect.addEventListener("change", update);
  update();
  loadSavedComparisons();
}

function initHome() {
  const stats = document.getElementById("stats");
  stats.innerHTML = `<div><b>${A.length}</b>aircraft</div><div><b>${GROUPS.length}</b>design houses</div><div><b>1933–${Math.floor(NOW)}</b>in aviation history</div>`;
  const cards = document.getElementById("featuredAircraft");
  const featured = ["concorde", "b747", "a380", "dc3"];
  cards.innerHTML = featured.map(id => {
    const a = byId[id];
    return `<a class="aircraft-card" href="aircraft.html#${a.id}">
      <span class="maker">${esc(a.maker)} · ${a.ffy | 0}</span>
      <strong>${esc(a.name)}</strong>
      <span>${a.len.toFixed(1)} m long · ${a.span.toFixed(1)} m span</span>
      <span class="card-arrow" aria-hidden="true">↗</span>
    </a>`;
  }).join("");
  const hashId = location.hash.slice(1);
  if (byId[hashId]) location.replace(`aircraft.html#${encodeURIComponent(hashId)}`);
}

const page = document.body.dataset.page;
if (page === "home") initHome();
if (page === "timeline") initTimeline();
if (page === "aircraft") initAircraft();
if (page === "compare") initCompare();
