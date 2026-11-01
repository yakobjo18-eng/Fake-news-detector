export function createRouter(pages, { onRoute }) {
  const byRoute = new Map(pages.map((p) => [p.route, p]));
  const defaultRoute = pages[0].route;

  function current() {
    const hash = location.hash.replace(/^#\/?/, "");
    return byRoute.has(hash) ? hash : defaultRoute;
  }

  function navigate(route) {
    if (!byRoute.has(route)) route = defaultRoute;
    if (location.hash !== `#/${route}`) {
      location.hash = `#/${route}`;
    } else {
      onRoute(byRoute.get(route));
    }
  }

  window.addEventListener("hashchange", () => onRoute(byRoute.get(current())));

  return {
    navigate,
    start() {
      onRoute(byRoute.get(current()));
    },
  };
}
