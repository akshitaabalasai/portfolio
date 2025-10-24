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
  statsRoot.style.display = 'grid';
  statsRoot.style.gap = '1.5rem';
  statsRoot.style.gridTemplateColumns = 'repeat(5, minmax(160px, 1fr))';

  stats.forEach(s => {
    const card = document.createElement('article');
    Object.assign(card.style, {
      background: 'var(--card-bg, #f6f7f9)',
      borderRadius: '18px',
      padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 2px rgba(0,0,0,.06), 0 6px 20px rgba(0,0,0,.08)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      minHeight: '120px',
      justifyContent: 'center',
    });

    const lab = document.createElement('div');
    lab.textContent = s.label.toUpperCase();
    Object.assign(lab.style, {
      letterSpacing: '.07em',
      color: '#7a8595',
      fontSize: '.95rem'
    });

    const val = document.createElement('div');
    val.textContent = s.value.toLocaleString();
    Object.assign(val.style, {
      fontWeight: '800',
      fontSize: 'clamp(2.4rem, 6vw, 3.8rem)',
      lineHeight: '1.1'
    });

    card.append(lab, val);
    statsRoot.appendChild(card);
  });
}
