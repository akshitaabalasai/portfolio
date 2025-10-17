// ---------- Boot & helpers ----------
console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Normalize paths so "/resume" and "/resume/index.html" match
function normalize(pathname) {
  return pathname.replace(/index\.html$/i, "").replace(/\/+$/, "/") || "/";
}

// Compute a base path that works on localhost and on GitHub Pages
function computeBasePath() {
  const host = location.hostname;

  // Local dev (Live Server)
  if (host === "localhost" || host === "127.0.0.1") return "/";

  // GitHub Pages (project site): https://<user>.github.io/<repo>/
  // Use the first path segment as repo name
  const seg = location.pathname.split("/").filter(Boolean)[0] || "";
  return seg ? `/${seg}/` : "/";
}

const BASE_PATH = computeBasePath();

// ---------- Step 3: Auto navigation ----------
const pages = [
  { url: "",          title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/",  title: "Contact" },
  { url: "resume/",   title: "Resume" },
  { url: "https://github.com/akshitaabalasai", title: "GitHub", external: true },
];

// Remove any hard-coded nav (if left) and inject a fresh one at top of <body>
document.querySelector("nav")?.remove();
const nav = document.createElement("nav");
document.body.prepend(nav);

const hereHost = location.host;
const herePath = normalize(location.pathname);

for (const p of pages) {
  // Prefix internal links with BASE_PATH
  const href = /^https?:\/\//i.test(p.url) ? p.url : BASE_PATH + p.url;

  const a = document.createElement("a");
  a.href = href;
  a.textContent = p.title;

  const aURL = new URL(a.href);

  // Highlight current page (Step 2 logic)
  if (aURL.host === hereHost && normalize(aURL.pathname) === herePath) {
    a.classList.add("current");
    a.setAttribute("aria-current", "page");
  }

  // External links in new tab
  if (p.external || aURL.host !== hereHost) {
    a.target = "_blank";
    a.rel = "noopener";
  }

  nav.append(a);
}

// ---------- Step 4: Dark mode switch (Automatic / Light / Dark) ----------
document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme">
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
  // Required by lab: set CSS property on <html>
  document.documentElement.style.setProperty("color-scheme", value);

  // Also control a data attribute so page-specific CSS can react
  if (value === "light" || value === "dark") {
    document.documentElement.setAttribute("data-theme", value);
  } else {
    document.documentElement.removeAttribute("data-theme"); // Automatic
  }
}

const saved = localStorage.getItem("colorScheme") ?? "light dark";
setColorScheme(saved);
select.value = saved;

// Optional: show current OS scheme for the Automatic option
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
