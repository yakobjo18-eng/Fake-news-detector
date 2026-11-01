import { createRouter } from "./router.js";
import { icons } from "./icons.js";
import { getPrefs } from "./storage.js";
import * as analyze from "./pages/analyze.js";
import * as explainPage from "./pages/explain.js";
import * as compare from "./pages/compare.js";
import * as evaluation from "./pages/evaluation.js";
import * as history from "./pages/history.js";
import * as settings from "./pages/settings.js";

// Analyze Article is the default/landing route — the actual tool, not a marketing
// page, per the design direction (see frontend/DESIGN_CONTRACT.md).
const PAGES = [analyze, explainPage, compare, evaluation, history, settings];

const shell = document.querySelector(".shell");
const sidebar = document.querySelector(".sidebar");
const navList = document.querySelector("#navList");
const contentEl = document.querySelector("#content");
const mobileToggle = document.querySelector("#mobileNavToggle");
const compactToggle = document.querySelector("#compactToggle");
const brandHome = document.querySelector("#brandHome");
const brandHomeMobile = document.querySelector("#brandHomeMobile");
const HOME_ROUTE = PAGES[0].route;

if (getPrefs().compactSidebar) shell.classList.add("compact");

navList.innerHTML = PAGES.map(
  (p) => `<button class="nav-item" data-route="${p.route}">${icons[p.route] ?? ""}<span class="nav-label">${p.title}</span></button>`
).join("");

function setCompact(isCompact) {
  shell.classList.toggle("compact", isCompact);
}

compactToggle.addEventListener("click", () => setCompact(!shell.classList.contains("compact")));
mobileToggle.addEventListener("click", () => sidebar.classList.toggle("open"));
brandHome.addEventListener("click", () => router.navigate(HOME_ROUTE));
brandHomeMobile.addEventListener("click", () => router.navigate(HOME_ROUTE));

function renderRoute(page) {
  navList.querySelectorAll(".nav-item").forEach((el) => {
    el.classList.toggle("active", el.dataset.route === page.route);
  });
  contentEl.innerHTML = page.render();
  page.mount?.(contentEl, router.navigate, { onCompactToggle: setCompact });
  sidebar.classList.remove("open");
  contentEl.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

const router = createRouter(PAGES, { onRoute: renderRoute });

navList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-route]");
  if (btn) router.navigate(btn.dataset.route);
});

router.start();
