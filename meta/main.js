import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

/* ---------- Parsers & helpers ---------- */
const fmtInt = d3.format(",");
const parseDate = d3.timeParse("%Y-%m-%d");
const parseTimeHMS = d3.timeParse("%H:%M:%S");
const parseTimeHM = d3.timeParse("%H:%M");

function parseRow(d){
  // Columns produced by eloquent: file,line,type,commit,author,date,time,timezone,...
  const line = +d.line || 0;
  const day = parseDate(d.date);
  let t = parseTimeHMS(d.time) || parseTimeHM(d.time); // robust to HH:MM:SS or HH:MM

  // build a single Date for plotting by minutes of day
  let dt = null;
  if (day && t){
    dt = new Date(day.getFullYear(), day.getMonth(), day.getDate(),
                  t.getHours(), t.getMinutes(), 0, 0);
  }

  return {
    file: d.file,
    type: d.type || "other",
    commit: d.commit,
    author: d.author,
    line,
    date: d.date,
    time: d.time,
    dt
  };
}

/* ---------- Load data ---------- */
d3.csv("loc.csv", parseRow).then(rows => {
  // Filter out rows without a timestamp
  const valid = rows.filter(r => r.dt);

  /* ---------- Summary tiles ---------- */
  const totalLOC = d3.sum(rows, d => d.line) || 0;
  const commits = new Set(rows.map(d => d.commit)).size;
  const files   = new Set(rows.map(d => d.file)).size;
  const longestLine = d3.max(rows, d => d.line) || 0;

  // lines per commit for MAX LINES
  const linesPerCommit = d3.rollup(rows, v => d3.sum(v, d => d.line), d => d.commit);
  const maxLines = d3.max(linesPerCommit.values()) || 0;

  d3.select("#stat-total").text(fmtInt(totalLOC));
  d3.select("#stat-commits").text(fmtInt(commits));
  d3.select("#stat-files").text(fmtInt(files));
  d3.select("#stat-longest").text(fmtInt(longestLine));
  d3.select("#stat-maxlines").text(fmtInt(maxLines));

  /* ---------- Aggregate by commit for bubbles ---------- */
  const commitsAgg = Array.from(
    d3.group(valid, d => d.commit),
    ([commit, v]) => {
      const any = v[0];
      const dt = any.dt;
      return {
        commit,
        dateOnly: new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()),
        minutes : dt.getHours()*60 + dt.getMinutes(),
        lines   : d3.sum(v, d => d.line),
        author  : any.author,
        // lang -> lines within commit
        byLang  : d3.rollup(v, vv => d3.sum(vv, x => x.line), x => x.type || "other"),
      };
    }
  );

  renderScatter(commitsAgg);
  attachBrush(commitsAgg);
});

/* ---------- Chart ---------- */
function renderScatter(data){
  const container = d3.select("#chart");
  container.selectAll("*").remove();

  const W = container.node().clientWidth;
  const H = container.node().clientHeight;
  const M = { top: 20, right: 24, bottom: 40, left: 56 };

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`);

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.dateOnly))
    .range([M.left, W - M.right]);

  const y = d3.scaleLinear()
    .domain([0, 24*60])          // minutes of day
    .range([H - M.bottom, M.top]);

  const r = d3.scaleSqrt()
    .domain([0, d3.max(data, d => d.lines) || 1])
    .range([3, 26]);

  // grid (horizontal)
  const yGrid = d3.axisLeft(y).ticks(12)
                  .tickSize(-(W - M.left - M.right))
                  .tickFormat(() => "");
  svg.append("g")
     .attr("class", "grid")
     .attr("transform", `translate(${M.left},0)`)
     .call(yGrid);

  // axes
  svg.append("g")
     .attr("class", "axis")
     .attr("transform", `translate(0,${H - M.bottom})`)
     .call(d3.axisBottom(x).ticks(7));

  svg.append("g")
     .attr("class", "axis")
     .attr("transform", `translate(${M.left},0)`)
     .call(d3.axisLeft(y).ticks(12).tickFormat(m => `${String(Math.floor(m/60)).padStart(2,"0")}:00`));

  // points
  svg.append("g")
    .attr("class","dots")
    .selectAll("circle")
    .data(data)
    .join("circle")
      .attr("class","dot")
      .attr("cx", d => x(d.dateOnly))
      .attr("cy", d => y(d.minutes))
      .attr("r",  d => r(d.lines))
      .append("title")
      .text(d => `${d.commit.slice(0,7)} • ${d.lines} lines`);
}

/* ---------- Brush + language breakdown ---------- */
function attachBrush(commitsAgg){
  const container = d3.select("#chart");
  const svg = container.select("svg");
  const W = container.node().clientWidth;
  const H = container.node().clientHeight;
  const M = { top: 20, right: 24, bottom: 40, left: 56 };

  const x = d3.scaleTime()
    .domain(d3.extent(commitsAgg, d => d.dateOnly))
    .range([M.left, W - M.right]);

  const y = d3.scaleLinear()
    .domain([0, 24*60])
    .range([H - M.bottom, M.top]);

  const brush = d3.brush()
    .extent([[M.left, M.top], [W - M.right, H - M.bottom]])
    .on("brush end", brushed);

  svg.append("g")
    .attr("class", "brush")
    .call(brush);

  function brushed(event){
    const sel = event.selection;
    if (!sel){
      d3.select("#selection-count").text("No commits selected");
      d3.select("#language-breakdown").html("");
      return;
    }
    const [[x0,y0],[x1,y1]] = sel;

    const selected = commitsAgg.filter(d =>
      x0 <= x(d.dateOnly) && x(d.dateOnly) <= x1 &&
      y0 <= y(d.minutes)  && y(d.minutes)  <= y1
    );

    d3.select("#selection-count").text(
      selected.length ? `${selected.length} commit${selected.length>1?"s":""} selected` : "No commits selected"
    );

    // Sum language lines across selected commits
    const lang = new Map();
    selected.forEach(c => {
      c.byLang.forEach((v,k) => lang.set(k, (lang.get(k)||0)+v));
    });

    renderLangTiles(lang);
  }
}

function renderLangTiles(langMap){
  const wrap = d3.select("#language-breakdown");
  wrap.html("");

  if (!langMap.size) return;

  const total = Array.from(langMap.values()).reduce((a,b)=>a+b,0) || 1;
  const entries = Array.from(langMap.entries())
                       .sort((a,b)=>d3.descending(a[1], b[1]));

  entries.forEach(([name, lines]) => {
    const tile = wrap.append("div").attr("class","tile lang-tile");
    tile.append("div").attr("class","label lang-name").text(name.toUpperCase());
    tile.append("div").attr("class","value lang-value")
        .text(`${d3.format(",")(lines)} lines (${d3.format(".1%")(lines/total)})`);
  });
}
