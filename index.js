import { renderProjects } from './global.js';

const projectsEl = document.querySelector('.projects');
fetch('./projects.json')
  .then(r => r.json())
  .then(all => renderProjects(all.slice(0, 3), projectsEl, 'h3'));

const statsRoot = document.querySelector('#profile-stats');

const stats = [
  { label: "Followers",     value: 0 },
  { label: "Following",     value: 1 },
  { label: "Public Repos",  value: 22 },
  { label: "Public Gists",  value: 0 },
  { label: "Commits",       value: 125 },
];

if (statsRoot) {
  stats.forEach(s => {
    const card = document.createElement('article');
    card.className = 'stat-card';

    const lab = document.createElement('div');
    lab.className = 'stat-label';
    lab.textContent = s.label;

    const val = document.createElement('div');
    val.className = 'stat-value';
    val.textContent = s.value.toLocaleString();

    card.append(lab, val);
    statsRoot.appendChild(card);
  });
}
