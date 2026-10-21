const DATA = {
  artworks: "data/artworks.json",
  exhibitions: "data/exhibitions.json",
  config: "data/site-config.json"
};

async function readJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("Could not load " + path);
  return response.json();
}

function text(value) {
  return value == null ? "" : String(value);
}

function resolveImagePath(path) {
  const value = text(path).trim();
  if (!value) return "";
  if (/^(https?:|data:|\/)/i.test(value) || value.includes("/")) return value;
  return "images/" + value;
}

function safeExternalLink(url) {
  return /^https?:\/\//i.test(url || "");
}

async function renderInstagramLinks() {
  try {
    const config = await readJson(DATA.config);
    if (!safeExternalLink(config.instagramUrl)) return;
    document.querySelectorAll("[data-instagram-link]").forEach(link => {
      link.href = config.instagramUrl;
    });
  } catch (error) {
    // Keep the fallback URL in the HTML if configuration cannot be loaded.
  }
}

function openArtworkDialog(work) {
  const dialog = document.querySelector("#artwork-dialog");
  const content = document.querySelector("#dialog-content");
  if (!dialog || !content) return;

  content.innerHTML = "";
  const imageWrap = document.createElement("div");
  imageWrap.className = "dialog-image-wrap";
  const img = document.createElement("img");
  img.src = resolveImagePath(work.image);
  img.alt = text(work.alt || work.title || "Painting by Nancy Nguyen");
  img.addEventListener("click", () => dialog.close());
  img.style.cursor = "zoom-out";
  imageWrap.appendChild(img);
  content.appendChild(imageWrap);

  const details = document.createElement("div");
  details.className = "dialog-details";
  const title = document.createElement("h2");
  title.textContent = [text(work.title), text(work.year)].filter(Boolean).join(", ");
  details.appendChild(title);

  const metadata = [work.medium, work.dimensions].filter(Boolean).map(text).join(" · ");
  if (metadata) {
    const p = document.createElement("p");
    p.className = "dialog-metadata";
    p.textContent = metadata;
    details.appendChild(p);
  }
  content.appendChild(details);
  dialog.showModal();
}

async function renderHome() {
  const container = document.querySelector("#home-artwork");
  if (!container) return;
  try {
    const [artworks, config] = await Promise.all([
      readJson(DATA.artworks),
      readJson(DATA.config)
    ]);
    const featured = artworks.find(work => work.id === config.homepageArtworkId && work.image);
    if (!featured) {
      container.innerHTML = '<p class="empty-state">Choose a homepage painting in <code>data/site-config.json</code> and add its image path to <code>data/artworks.json</code>.</p>';
      return;
    }

    container.innerHTML = "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "hero-open";
    button.setAttribute("aria-label", "View details for " + text(featured.title || "featured painting"));
    const img = document.createElement("img");
    img.src = resolveImagePath(featured.image);
    img.alt = text(featured.alt || featured.title || "Painting by Nancy Nguyen");
    img.fetchPriority = "high";
    button.appendChild(img);
    button.addEventListener("click", () => openArtworkDialog(featured));
    container.appendChild(button);
  } catch (error) {
    container.innerHTML = '<p class="empty-state">Artwork data could not be loaded. Preview the site through a local server, not by opening the HTML file directly.</p>';
  }
}

async function renderWorks() {
  const grid = document.querySelector("#works-grid");
  if (!grid) return;
  try {
    const [artworks, config] = await Promise.all([
      readJson(DATA.artworks),
      readJson(DATA.config)
    ]);
    let works = artworks.filter(work => work.image);
    if (Array.isArray(config.curatedArtworkIds) && config.curatedArtworkIds.length) {
      const order = new Map(config.curatedArtworkIds.map((id, index) => [id, index]));
      works = works.filter(work => order.has(work.id))
        .sort((a, b) => order.get(a.id) - order.get(b.id));
    }
    if (!works.length) return;

    grid.innerHTML = "";
    works.forEach(work => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "work-card";
      button.setAttribute("aria-label", "View " + text(work.title || "artwork"));
      const img = document.createElement("img");
      img.src = resolveImagePath(work.image);
      img.alt = text(work.alt || work.title || "Painting by Nancy Nguyen");
      img.loading = "lazy";
      button.appendChild(img);
      button.addEventListener("click", () => openArtworkDialog(work));
      grid.appendChild(button);
    });
  } catch (error) {
    grid.innerHTML = '<p class="empty-state">Artwork data could not be loaded. Preview the site through a local server, not by opening the HTML file directly.</p>';
  }
}

function renderExhibitionList(containerId, exhibitions) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = "";
  exhibitions
    .slice()
    .sort((a, b) => Number(b.year) - Number(a.year) || text(a.title).localeCompare(text(b.title)))
    .forEach(exhibition => {
      const li = document.createElement("li");
      const year = document.createElement("span");
      year.className = "exhibition-year";
      year.textContent = text(exhibition.year);
      li.appendChild(year);

      const detail = document.createElement("span");
      if (exhibition.url && safeExternalLink(exhibition.url)) {
        const link = document.createElement("a");
        link.href = exhibition.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = text(exhibition.title);
        detail.appendChild(link);
      } else {
        detail.appendChild(document.createTextNode(text(exhibition.title)));
      }
      const venue = [exhibition.venue, exhibition.location].filter(Boolean).join(", ");
      if (venue) {
        detail.appendChild(document.createTextNode(", "));
        const location = document.createElement("span");
        location.className = "exhibition-location";
        location.textContent = venue;
        detail.appendChild(location);
      }
      li.appendChild(detail);
      list.appendChild(li);
    });
}

async function renderExhibitions() {
  if (!document.querySelector("#solo-exhibitions")) return;
  try {
    const exhibitions = await readJson(DATA.exhibitions);
    renderExhibitionList("solo-exhibitions", exhibitions.filter(item => item.type === "solo"));
    renderExhibitionList("group-exhibitions", exhibitions.filter(item => item.type === "group"));
  } catch (error) {
    const section = document.querySelector("#exhibitions");
    if (section) section.insertAdjacentHTML("afterbegin", '<p class="empty-state">Exhibition data could not be loaded. Preview the site through a local server.</p>');
  }
}

function setupMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#site-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    menu.hidden = isOpen;
  });
  menu.querySelectorAll("a[href^='#']").forEach(link => {
    link.addEventListener("click", () => {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation");
      menu.hidden = true;
    });
  });
}

function setupDialog() {
  const dialog = document.querySelector("#artwork-dialog");
  const close = document.querySelector(".dialog-close");
  if (!dialog || !close) return;
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
}

function setupMantraTransition() {
  const hero = document.querySelector(".hero");
  const works = document.querySelector("#works");
  const context = document.querySelector("#exhibitions");
  if (!hero || !works || !context) return;

  const update = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.style.setProperty("--mantra-opacity", "0");
      return;
    }

    const scrollY = window.scrollY;
    const viewport = window.innerHeight || 1;
    const boundaries = [
      hero.offsetTop + hero.offsetHeight,
      context.offsetTop
    ];
    let opacity = 0;

    boundaries.forEach(boundary => {
      const distance = Math.abs(scrollY - boundary);
      const windowSize = viewport * 0.24;
      const strength = Math.max(0, 1 - distance / windowSize);
      opacity = Math.max(opacity, strength * 0.22);
    });

    document.documentElement.style.setProperty("--mantra-opacity", String(opacity));
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
}

function setupHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

document.addEventListener("DOMContentLoaded", () => {
  renderInstagramLinks();
  renderHome();
  renderWorks();
  renderExhibitions();
  setupMenu();
  setupDialog();
  setupHeader();
  setupMantraTransition();
});
