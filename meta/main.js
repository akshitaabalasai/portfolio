import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import scrollama from "https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm";

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

  // build a single Date for plotting
  let dt = null;
  if (day && t){
    dt = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      t.getHours(),
      t.getMinutes(),
      0,
      0
    );
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

// Turn line-level rows into per-commit objects
function processCommits(rows){
  const grouped = d3.group(rows.filter(r => r.dt), d => d.commit);

  const commits = Array.from(grouped, ([id, lines]) => {
    const any = lines[0];
    const datetime = any.dt;
    const minutes = datetime.getHours()*60 + datetime.getMinutes();

    // pick dominant type as "technology"
    const byType = d3.rollups(
      lines,
      v => d3.sum(v, d => d.line || 0),
      d => d.type || "other"
    ).sort((a,b) => d3.descending(a[1], b[1]));
    const mainType = byType.length ? byType[0][0] : "other";

    return {
      id,
      datetime,
      hourFrac: minutes / (24*60),
      totalLines: d3.sum(lines, d => d.line || 0),
      lines,
      type: mainType
    };
  });

  return d3.sort(commits, d => d.datetime);
}

/* ---------- Globals for interactivity ---------- */

let commits = [];
let filteredCommits = [];
let timeScale;
let commitMaxTime;
let commitProgress = 100; // 0–100 slider value

let xScale;
let yScale;

/* ---------- Main load ---------- */

d3.csv("loc.csv", parseRow).then(rows => {
  commits = processCommits(rows);
  if (!commits.length) return;

  filteredCommits = commits;

  timeScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([0, 100]);

  commitProgress = 100;
  commitMaxTime = timeScale.invert(commitProgress);

  // initial render
  renderScatterPlot(rows, filteredCommits);
  renderCommitInfo(filteredCommits);
  updateFileDisplay(filteredCommits);
  initSlider();
  initScrolly();
});

/* ---------- Scatter plot ---------- */

function renderScatterPlot(data, commitsToShow){
  const container = d3.select("#chart");
  container.selectAll("*").remove();

  const W = container.node().clientWidth || 1000;
  const H = container.node().clientHeight || 440;
  const M = { top: 20, right: 24, bottom: 40, left: 56 };

  const usableWidth  = W - M.left - M.right;
  const usableHeight = H - M.top  - M.bottom;

  const svg = container.append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([M.left, M.left + usableWidth]);

  yScale = d3.scaleLinear()
    .domain([0, 24])          // hours of day
    .range([M.top + usableHeight, M.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([2, 28]);

  // grid (horizontal)
  const yGrid = d3.axisLeft(yScale).ticks(12)
                  .tickSize(-usableWidth)
                  .tickFormat(() => "");
  svg.append("g")
     .attr("class", "grid")
     .attr("transform", `translate(${M.left},0)`)
     .call(yGrid);

  // axes
  const xAxis = d3.axisBottom(xScale).ticks(7);
  const yAxis = d3.axisLeft(yScale)
    .ticks(12)
    .tickFormat(h => `${String(Math.floor(h)).padStart(2,"0")}:00`);

  svg.append("g")
     .attr("class", "axis x-axis")
     .attr("transform", `translate(0,${M.top + usableHeight})`)
     .call(xAxis);

  svg.append("g")
     .attr("class", "axis y-axis")
     .attr("transform", `translate(${M.left},0)`)
     .call(yAxis);

  const dots = svg.append("g").attr("class","dots");

  const sortedCommits = d3.sort(commitsToShow, d => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, d => d.id)
    .join("circle")
    .attr("class","dot")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.datetime.getHours() + d.datetime.getMinutes()/60))
    .attr("r", d => rScale(d.totalLines))
    .append("title")
    .text(d => `${d.id.slice(0,7)} • ${d.totalLines} lines`);
}

function updateScatterPlot(data, commitsToShow){
  const container = d3.select("#chart");
  const svg = container.select("svg");
  if (svg.empty()) return;

  const W = container.node().clientWidth || 1000;
  const H = container.node().clientHeight || 440;
  const M = { top: 20, right: 24, bottom: 40, left: 56 };
  const usableWidth  = W - M.left - M.right;
  const usableHeight = H - M.top  - M.bottom;

  // update domains based on visible commits
  xScale.domain(d3.extent(commitsToShow, d => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt()
    .domain([minLines || 0, maxLines || 1])
    .range([2, 28]);

  const xAxis = d3.axisBottom(xScale).ticks(7);

  const xAxisGroup = svg.select("g.x-axis");
  xAxisGroup.selectAll("*").remove();
  xAxisGroup
    .attr("transform", `translate(0,${M.top + usableHeight})`)
    .call(xAxis);

  const dots = svg.select("g.dots");

  const sortedCommits = d3.sort(commitsToShow, d => -d.totalLines);

  dots
    .selectAll("circle")
    .data(sortedCommits, d => d.id)
    .join("circle")
    .attr("class","dot")
    .attr("cx", d => xScale(d.datetime))
    .attr("cy", d => yScale(d.datetime.getHours() + d.datetime.getMinutes()/60))
    .attr("r", d => {
      const r = rScale(d.totalLines);
      return r;
    })
    .append("title")
    .text(d => `${d.id.slice(0,7)} • ${d.totalLines} lines`);
}

/* ---------- Summary tiles based on filtered commits ---------- */

function renderCommitInfo(commitsToShow){
  const totalLOC = d3.sum(commitsToShow, d => d.totalLines) || 0;
  const numCommits = commitsToShow.length;

  const fileSet = new Set();
  let longestLine = 0;
  let maxLines = 0;

  commitsToShow.forEach(c => {
    c.lines.forEach(l => {
      fileSet.add(l.file);
      if (l.line > longestLine) longestLine = l.line;
    });
    if (c.totalLines > maxLines) maxLines = c.totalLines;
  });

  d3.select("#stat-total").text(fmtInt(totalLOC));
  d3.select("#stat-commits").text(fmtInt(numCommits));
  d3.select("#stat-files").text(fmtInt(fileSet.size));
  d3.select("#stat-longest").text(fmtInt(longestLine));
  d3.select("#stat-maxlines").text(fmtInt(maxLines));

  d3.select("#selection-count").text(
    numCommits === commits.length
      ? "All commits shown"
      : `${numCommits} commit${numCommits === 1 ? "" : "s"} shown`
  );
}

/* ---------- File unit visualization ---------- */

function updateFileDisplay(commitsToShow){
  const lines = commitsToShow.flatMap(d => d.lines);

  let files = d3
    .groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a,b) => b.lines.length - a.lines.length);

  const filesContainer = d3
    .select("#files")
    .selectAll("div")
    .data(files, d => d.name)
    .join(
      enter => enter.append("div").call(div => {
        div.append("dt").append("code");
        div.append("dd");
      })
    );

  // filename + count
  filesContainer.select("dt > code")
    .html(d => {
      const count = d.lines.length;
      return `${d.name}<small>${count} line${count===1 ? "" : "s"}</small>`;
    });

  // unit dots
  filesContainer
    .select("dd")
    .selectAll("div")
    .data(d => d.lines)
    .join("div")
    .attr("class","loc");
}

/* ---------- Shared updater for slider + scrolly ---------- */

function setCommitMaxTime(newMaxTime){
  commitMaxTime = newMaxTime;

  // sync slider
  const pct = timeScale(commitMaxTime);
  commitProgress = pct;
  const slider = document.querySelector("#commit-progress");
  if (slider) slider.value = pct;

  // filtered commits
  filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
  if (!filteredCommits.length){
    filteredCommits = [commits[0]];
  }

  // update time label
  const timeLabel = document.querySelector("#commit-time");
  if (timeLabel){
    timeLabel.textContent = commitMaxTime.toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short"
    });
  }

  // update visuals
  updateScatterPlot(null, filteredCommits);
  renderCommitInfo(filteredCommits);
  updateFileDisplay(filteredCommits);
}

/* ---------- Slider wiring ---------- */

function initSlider(){
  const slider = document.querySelector("#commit-progress");
  if (!slider) return;

  slider.addEventListener("input", event => {
    const value = Number(event.target.value);
    const maxTime = timeScale.invert(value);
    setCommitMaxTime(maxTime);
  });

  // initialize once
  setCommitMaxTime(commitMaxTime);
}

/* ---------- Scrollytelling with Scrollama ---------- */

function initScrolly(){
  const commitsSorted = d3.sort(commits, d => d.datetime);

  d3.select("#scatter-story")
    .selectAll(".step")
    .data(commitsSorted)
    .join("div")
    .attr("class","step")
    .html((d, i) => {
      const fileCount = d3.rollups(
        d.lines,
        v => v.length,
        x => x.file
      ).length;

      return `
        <p><strong>${d.datetime.toLocaleString("en", {
          dateStyle: "full",
          timeStyle: "short"
        })}</strong></p>
        <p>
          Commit <code>${d.id.slice(0,7)}</code> edited
          <strong>${d.totalLines}</strong> lines across
          <strong>${fileCount}</strong> files.
        </p>
        <p>
          Then I looked over all I had made, and I saw that it was very good.
        </p>
      `;
    });

  const scroller = scrollama();

  function onStepEnter(response){
    const commit = response.element.__data__;
    setCommitMaxTime(commit.datetime);
  }

  scroller
    .setup({
      container: "#scrolly-1",
      step: "#scatter-story .step",
      offset: 0.55
    })
    .onStepEnter(onStepEnter);

  window.addEventListener("resize", scroller.resize);
}
