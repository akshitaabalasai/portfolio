console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}
function normalize(pathname) {
  return pathname.replace(/index\.html$/i, "").replace(/\/+$/, "/") || "/";
}
function computeBasePath() {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "/";
  const seg = location.pathname.split("/").filter(Boolean)[0] || "";
  return seg ? `/${seg}/` : "/";
}

export const BASE_PATH = computeBasePath();

const pages = [
  { url: "",          title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/",  title: "Contact" },
  { url: "resume/",   title: "Resume" },
  { url: "https://github.com/akshitaabalasai", title: "GitHub", external: true },
];

document.querySelector("nav")?.remove();
const nav = document.createElement("nav");
const navInner = document.createElement("div");
navInner.className = "nav-inner";
nav.append(navInner);
document.body.prepend(nav);

const hereHost = location.host;
const herePath = normalize(location.pathname);

for (const p of pages) {
  const href = /^https?:\/\//i.test(p.url) ? p.url : BASE_PATH + p.url;

  const a = document.createElement("a");
  a.href = href;
  a.textContent = p.title;

  const aURL = new URL(a.href);

  if (aURL.host === hereHost && normalize(aURL.pathname) === herePath) {
    a.classList.add("current");
    a.setAttribute("aria-current", "page");
  }

  if (p.external || aURL.host !== hereHost) {
    a.target = "_blank";
    a.rel = "noopener";
  }

  navInner.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme" style="position:fixed;right:1rem;top:.5rem">
    Theme:
    <select id="theme-select">
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

const select = document.querySelector("#theme-select");

function setColorScheme(value) {
  document.documentElement.style.setProperty("color-scheme", value);
  if (value === "light" || value === "dark") {
    document.documentElement.setAttribute("data-theme", value);
  } else {
    document.documentElement.removeAttribute("data-theme"); 
  }
}

const saved = localStorage.getItem("colorScheme") ?? "light dark";
setColorScheme(saved);
select.value = saved;

try {
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  if (select.value === "light dark") {
    select.options[0].textContent = `Automatic (${prefersDark ? "Dark" : "Light"})`;
  }
} catch {}

select.addEventListener("input", (e) => {
  const val = e.target.value;
  setColorScheme(val);
  localStorage.setItem("colorScheme", val);
});

(() => {
  const form = document.querySelector("#contact-form");
  const link = document.querySelector("#send-link");
  const statusEl = document.querySelector("#send-status");
  if (!form || !link) return;

  function buildMailto() {
    const to = form.dataset.to || "akshitaabalasai@gmail.com";
    const subject = encodeURIComponent((form.querySelector('[name="subject"]')?.value || "").replace(/\r\n?/g, "\n"));
    const body    = encodeURIComponent((form.querySelector('[name="body"]')?.value || "").replace(/\r\n?/g, "\n"));

    const params = [];
    if (subject) params.push(`subject=${subject}`);
    if (body)    params.push(`body=${body}`);

    return `mailto:${to}${params.length ? "?" + params.join("&") : ""}`;
  }

  link.addEventListener("click", () => {
    const url = buildMailto();
    link.setAttribute("href", url);
    if (statusEl) statusEl.hidden = false;
    console.log("[contact] Opening:", url);
  });
})();


export async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching/parsing JSON:', err);
    return null;
  }
}


export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) return;

  const validHeading = /^(h[1-6])$/i.test(headingLevel) ? headingLevel : 'h2';

  if (!Array.isArray(projects) || projects.length === 0) {
    containerElement.innerHTML = `<p>No projects to show yet.</p>`;
    return;
  }

  containerElement.innerHTML = '';

  for (const p of projects) {
    const article = document.createElement('article');
    const title = p?.title ?? 'Untitled Project';
    const desc  = p?.description ?? '';

    const raw = (p?.image ?? '').trim();
    const imgSrc = raw
      ? (raw.startsWith('http') ? raw : `${BASE_PATH}${raw.replace(/^\/+/, '')}`)
      : 'https://dsc106.com/labs/lab02/images/empty.svg';

    article.innerHTML = `
      <${validHeading}>${title}</${validHeading}>
      <img src="${imgSrc}" alt="${title}">
      <span class="project-year">Year: ${p?.year ?? ''}</span>
      <p class="project-desc">${desc}</p>
    `;

    containerElement.appendChild(article);
  }
}


export async function fetchGitHubData(username) {
  if (!username) return null;
  return fetchJSON(`https://api.github.com/users/${encodeURIComponent(username)}`);
}
