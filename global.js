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

const BASE_PATH = computeBasePath();

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
  document.documentElement.style.setProperty("color-scheme", value);

  if (value === "light" || value === "dark") {
    document.documentElement.setAttribute("data-theme", value);
  } else {
    document.documentElement.removeAttribute("data-theme"); // Automatic
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
  
  
  
  
