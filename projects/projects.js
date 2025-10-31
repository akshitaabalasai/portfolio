import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const container = document.querySelector('.projects');
const titleEl = document.querySelector('.projects-title');
const searchInput = document.getElementById('q');
const countOut = document.getElementById('count');
const pieSVG = d3.select('#projects-pie-plot');
const legendEl = document.getElementById('legend');

const projects = await fetchJSON('../projects.json') || [];

projects.forEach(p => {
  if (p.year == null) {
    const d = p.date ? new Date(p.date) : null;
    p.year = Number.isFinite(d?.getFullYear()) ? d.getFullYear() : undefined;
  }
});

const state = {
  query: '',
  selectedYear: null,   
};

const lc = s => (s ?? '').toString().toLowerCase();

function matchesQuery(p, q) {
  if (!q) return true;
  const hay = [
    p.title, p.description,
    Array.isArray(p.tags) ? p.tags.join(' ') : '',
    String(p.year ?? '')
  ].map(lc).join(' ');
  return hay.includes(q);
}

function filterProjects() {
  return projects.filter(p =>
    matchesQuery(p, state.query) &&
    (state.selectedYear == null ? true : p.year === state.selectedYear)
  );
}

function baseForPie() {
  return projects.filter(p => matchesQuery(p, state.query));
}

function renderList() {
  const visible = filterProjects();
  renderProjects(visible, container, 'h2');
  if (titleEl) titleEl.textContent = `Projects (${visible.length})`;
  if (countOut) countOut.value = `${visible.length} shown`;
}

function renderPieAndLegend() {
  const base = baseForPie();
  const counts = new Map();
  base.forEach(p => {
    if (p.year == null) return;
    counts.set(p.year, (counts.get(p.year) || 0) + 1);
  });

  const entries = [...counts.entries()].sort((a, b) => a[0] - b[0]);
  const data = entries.map(([year, count]) => ({ label: String(year), year, value: count }));

  // Clear old
  pieSVG.selectAll('*').remove();
  legendEl.innerHTML = '';

  if (data.length === 0) return;

  const pastelRange = [
    '#A7C7E7', // pastel blue
    '#F9D29D', // pastel peach
    '#F7A8A8', // pastel pink
    '#A8D8B9', // pastel mint
    '#D6C7E8', // pastel lavender (extras if more years)
    '#FBE7C6',
    '#FFE3EC',
    '#CDE7DC'
  ];

  const color = d3.scaleOrdinal()
    .domain(data.map(d => d.label))
    .range(pastelRange);

  const arcGen = d3.arc().innerRadius(18).outerRadius(48);
  const pieGen = d3.pie().value(d => d.value).sort((a, b) => a.year - b.year);

  const g = pieSVG.append('g');

  const slices = g.selectAll('path')
    .data(pieGen(data))
    .enter()
    .append('path')
    .attr('d', arcGen)
    .attr('fill', d => color(d.data.label))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
    .attr('tabindex', 0)
    .attr('aria-label', d => `${d.data.label}: ${d.data.value}`)
    .classed('selected', d => state.selectedYear === d.data.year)
    .on('click', (_, d) => {
      state.selectedYear = (state.selectedYear === d.data.year) ? null : d.data.year;
      renderAll();
    })
    .on('keydown', (ev, d) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        state.selectedYear = (state.selectedYear === d.data.year) ? null : d.data.year;
        renderAll();
      }
    });

  slices.classed('selected', d => state.selectedYear === d.data.year);

  data.forEach((d) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-current', String(state.selectedYear === d.year));
    li.onclick = () => { state.selectedYear = (state.selectedYear === d.year) ? null : d.year; renderAll(); };
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); } };

    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = color(d.label);

    const lab = document.createElement('span');
    lab.textContent = d.label;

    const ct = document.createElement('span');
    ct.textContent = d.value;

    li.append(sw, lab, ct);
    legendEl.appendChild(li);
  });

  if (state.selectedYear != null) {
    const clearLi = document.createElement('li');
    clearLi.classList.add('clear-row');
    clearLi.style.gridColumn = '1 / -1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Clear year filter';
    btn.onclick = () => { state.selectedYear = null; renderAll(); };
    clearLi.append(btn);
    legendEl.appendChild(clearLi);
  }
}

function renderAll() {
  renderList();
  renderPieAndLegend();
}

searchInput?.addEventListener('input', (e) => {
  state.query = lc(e.target.value.trim());
  renderAll();
});

renderAll();
