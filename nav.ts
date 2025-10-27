const content = document.getElementById("content")!;

const cache: Record<string, string> = {};

async function loadPage(page: string) {
  try {
    if (cache[page]) {
      content.innerHTML = cache[page];
      return;
    }

    const res = await fetch(page);
    if (!res.ok) throw new Error("Page not found");
    const html = await res.text();
    content.innerHTML = html;
    cache[page] = html;
  } catch (e) {
    content.innerHTML = "<h1>404 - Page Not Found</h1>";
  }
}

window.addEventListener("hashchange", () => {
  const page = location.hash.replace("#", "") || "home";
  loadPage(page);
});

const initialPage = location.hash.replace("#", "") || "home";
if (!location.hash) {
  history.replaceState(null, "", "#home");
}
loadPage(initialPage);
