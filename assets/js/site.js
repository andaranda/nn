const DATA = {
  artworks: "data/artworks.json",
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

async function loadSiteData() {
  const [artworks, config] = await Promise.all([
    readJson(DATA.artworks),
    readJson(DATA.config)
  ]);
  return { artworks: artworks.filter(work => work.image), config };
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

async function renderHomeAndWheel() {
  const hero = document.querySelector("#home-artwork");
  const track = document.querySelector("#wheel-track");
  if (!hero || !track) return;

  try {
    const { artworks, config } = await loadSiteData();
    const featured = artworks.find(work => work.id === config.homepageArtworkId) || artworks[0];
    if (!featured) throw new Error("No artwork records with images were found.");

    hero.innerHTML = "";
    const heroButton = document.createElement("button");
    heroButton.type = "button";
    heroButton.className = "hero-open";
    heroButton.setAttribute("aria-label", "View details for " + text(featured.title || "featured painting"));
    const heroImage = document.createElement("img");
    heroImage.src = resolveImagePath(featured.image);
    heroImage.alt = text(featured.alt || featured.title || "Painting by Nancy Nguyen");
    heroImage.fetchPriority = "high";
    heroButton.appendChild(heroImage);
    heroButton.addEventListener("click", () => openArtworkDialog(featured));
    hero.appendChild(heroButton);

    let works = artworks.slice();
    if (Array.isArray(config.curatedArtworkIds) && config.curatedArtworkIds.length) {
      const order = new Map(config.curatedArtworkIds.map((id, index) => [id, index]));
      works = works.filter(work => order.has(work.id))
        .sort((a, b) => order.get(a.id) - order.get(b.id));
    }
    if (!works.length) works = [featured];

    track.innerHTML = "";
    works.forEach((work, index) => {
      const section = document.createElement("section");
      section.className = "wheel-card";
      section.setAttribute("aria-label", "Painting " + (index + 1));
      if (index === 0) section.id = "wheel-start";

      const button = document.createElement("button");
      button.type = "button";
      button.className = "wheel-artwork";
      button.setAttribute("aria-label", "View " + text(work.title || "painting"));
      const img = document.createElement("img");
      img.src = resolveImagePath(work.image);
      img.alt = text(work.alt || work.title || "Painting by Nancy Nguyen");
      img.loading = index < 2 ? "eager" : "lazy";
      button.appendChild(img);
      button.addEventListener("click", () => openArtworkDialog(work));
      section.appendChild(button);
      track.appendChild(section);
    });

    const returnImage = document.querySelector("#return-image");
    if (returnImage) {
      returnImage.src = resolveImagePath(featured.image);
      returnImage.alt = "";
    }
  } catch (error) {
    hero.innerHTML = '<p class="empty-state">Artwork data could not be loaded. Preview through a local server, not by opening the HTML file directly.</p>';
    track.innerHTML = '<section class="wheel-card wheel-loading"><p class="empty-state">Check the records in <code>data/artworks.json</code>.</p></section>';
  }
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
  const track = document.querySelector("#wheel-track");
  const contact = document.querySelector("#contact");
  const loopStart = document.querySelector("#loop-start");
  const loopEnd = document.querySelector("#loop-end");
  if (!hero || !track || !contact || !loopStart || !loopEnd) return;

  let hideTimer;
  const root = document.documentElement;
  const setOpacity = value => root.style.setProperty("--mantra-opacity", String(value));

  const updateDuringScroll = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOpacity(0);
      return;
    }
    const scrollY = window.scrollY;
    const viewport = window.innerHeight || 1;
    const boundaries = [
      hero.offsetTop + hero.offsetHeight,
      ...Array.from(track.children).map(card => card.offsetTop),
      contact.offsetTop,
      loopStart.offsetTop,
      contact.offsetTop,
      loopEnd.offsetTop
    ];
    const nearBoundary = boundaries.some(boundary =>
      Math.abs(scrollY - boundary) < viewport * 0.34
    );
    setOpacity(nearBoundary ? 0.24 : 0);
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => setOpacity(0), 260);
  };

  setOpacity(0);
  window.addEventListener("scroll", updateDuringScroll, { passive: true });
  window.addEventListener("resize", () => setOpacity(0));
}

function setupLoop() {
  const loopEnd = document.querySelector("#loop-end");
  const loopStart = document.querySelector("#loop-start");
  if (!loopEnd || !loopStart) return;

  let lastScrollY = window.scrollY;
  let scrollingDown = true;
  let resetting = false;

  window.addEventListener("scroll", () => {
    scrollingDown = window.scrollY > lastScrollY;
    lastScrollY = window.scrollY;
  }, { passive: true });

  const observer = new IntersectionObserver(entries => {
    const entry = entries[0];
    if (!entry.isIntersecting || entry.intersectionRatio < 0.6 ||
        !scrollingDown || resetting) return;

    resetting = true;
    // Both gates have the same appearance. Move from the trailing gate to
    // the matching gate before the paintings, so the next scroll reveals
    // painting one rather than the landing screen.
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, loopStart.offsetTop);
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousBehavior;
      lastScrollY = window.scrollY;
      scrollingDown = false;
      resetting = false;
    });
  }, { threshold: [0.6, 0.8] });

  observer.observe(loopEnd);
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
  renderHomeAndWheel();
  setupDialog();
  setupHeader();
  setupMantraTransition();
  setupLoop();
});
