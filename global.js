// ----- boot / helper -----
console.log("IT’S ALIVE!");

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// ================
// Step 3: Auto <nav>
// ================

// Add your site pages here (internal links as folder paths; external with https://)
const pages = [
  { url: "",          title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "contact/",  title: "Contact" },
  { url: "resume/",   title: "Resume" },
  { url: "https://github.com/akshitaabalasai", title: "GitHub", external: true },
];

// Detect local dev vs GitHub Pages and compute a base path for internal links
function computeBasePath() {
  const host = location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "/"; // local

  // On GitHub Pages project sites, the first path segment is the repo name
  const seg = location.pathname.split("/").filter(Boolean)[0] || "";
  return seg ? `/${seg}/` : "/";
}
const BASE_PATH = computeBasePath();

// Normalize paths so "index.html" and trailing slashes don’t break matching
function normalize(pathname) {
  return pathname.replace(/index\.html$/, "").replace(/\/+$/, "/") || "/";
}
const hereHost = location.host;
const herePath = normalize(location.pathname);

// Remove any preexisting nav (in case one is left) and inject a fresh one
document.querySelector("nav")?.remove();
const nav = document.createElement("nav");
document.body.prepend(nav);

// Build links
for (const p of pages) {
  // Prefix internal links with BASE_PATH so links work locally and on GitHub Pages
  let href = /^https?:\/\//i.test(p.url) ? p.url : BASE_PATH + p.url;

  const a = document.createElement("a");
  a.href = href;
  a.textContent = p.title;

  const aURL = new URL(a.href);

  // Highlight current page (Step 3.2 logic = Step 2.2 check)
  if (aURL.host === hereHost && normalize(aURL.pathname) === herePath) {
    a.classList.add("current");
    a.setAttribute("aria-current", "page");
  }

  // Open external links in a new tab
  if (p.external || aURL.host !== hereHost) {
    a.target = "_blank";
    a.rel = "noopener";
  }

  nav.append(a);
}

// ============================
// (Optional) Step 2 stand-alone
// If you ever keep a static <nav> in HTML, this highlights the current item:
//
// const navLinks = $$("nav a");
// const currentLink = navLinks.find(
//   a => a.host === location.host && normalize(a.pathname) === herePath
// );
// currentLink?.classList.add("current");
/* =========================
   STEP 4: Dark mode switch
   ========================= */

// Inject the switcher UI at the very top of <body> (Step 4.2)
document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
      Theme:
      <select id="theme-select">
        <!-- values are exactly the CSS values we set on <html> -->
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );
  
  // Helper to set the color-scheme on the root element (<html>)
  function setColorScheme(value){
    document.documentElement.style.setProperty("color-scheme", value); // Step 4.4
  }
  
  // Initialize: read saved pref, else default to Automatic
  const select = document.querySelector("#theme-select");
  const saved = localStorage.getItem("colorScheme"); // Step 4.5
  const initial = saved ?? "light dark";
  setColorScheme(initial);
  select.value = initial;
  
  // If you want the label to hint OS mode for Automatic (optional)
  try{
    const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
    if (select.value === "light dark") {
      select.options[0].textContent = `Automatic (${prefersDark ? "Dark" : "Light"})`;
    }
  }catch{ /* matchMedia may not exist in some very old browsers */ }
  
  // Listen for changes & persist (Step 4.4 + 4.5)
  select.addEventListener("input", (event) => {
    const value = event.target.value;
    setColorScheme(value);
    localStorage.setItem("colorScheme", value);
    // console.log("color scheme changed to", value); // per lab
  });
  