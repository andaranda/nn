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
  const track = document.querySelector("#wheel-track");
  const contact = document.querySelector("#contact");
  if (!track || !contact) return;

  try {
    const { artworks, config } = await loadSiteData();
    if (!artworks.length) throw new Error("No artwork records with images were found.");

    let works = artworks.slice();
    if (Array.isArray(config.curatedArtworkIds) && config.curatedArtworkIds.length) {
      const order = new Map(config.curatedArtworkIds.map((id, index) => [id, index]));
      works = works.filter(work => order.has(work.id))
        .sort((a, b) => order.get(a.id) - order.get(b.id));
    }
    if (!works.length) works = artworks.slice();

    track.innerHTML = "";
    works.forEach((work, index) => {
      const section = document.createElement("section");
      section.className = "wheel-card";
      section.id = index === 0 ? "wheel-start" : "artwork-" + (index + 1);
      section.dataset.anchor = "artwork-" + (index + 1);
      section.setAttribute("aria-label", "Painting " + (index + 1));

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

    contact.dataset.anchor = "contact";
    track.appendChild(contact);
    setupCarousel(track);
  } catch (error) {
    track.innerHTML = '<section class="wheel-card wheel-loading"><p class="empty-state">Artwork data could not be loaded. Check <code>data/artworks.json</code> and preview through a local server.</p></section>';
    console.error(error);
  }
}

function setupCarousel(track) {
  if (typeof window.Pageable !== "function") {
    track.classList.add("carousel-fallback");
    console.error("Pageable did not load; the artwork carousel could not be initialized.");
    return;
  }

  const mantra = document.querySelector(".mantra-transition");
  let mantraTimer;
  let wheelQuietTimer;
  let wheelGestureActive = false;
  let isAnimating = false;

  const artworkSlides = [...track.querySelectorAll(".wheel-card")];
  const chooseCrop = image => {
    const randomPosition = () => Math.round(5 + Math.random() * 90);
    const previousX = Number(image.dataset.cropX || 50);
    const previousY = Number(image.dataset.cropY || 50);
    let x = randomPosition();
    let y = randomPosition();

    // Ensure a visibly different fragment on each revisit.
    if (Math.abs(x - previousX) < 25) x = x < 50 ? Math.min(95, x + 32) : Math.max(5, x - 32);
    if (Math.abs(y - previousY) < 25) y = y < 50 ? Math.min(95, y + 32) : Math.max(5, y - 32);

    image.dataset.cropX = String(x);
    image.dataset.cropY = String(y);
    image.style.setProperty("--crop-x", x + "%");
    image.style.setProperty("--crop-y", y + "%");
  };

  const randomizeArtworkAt = index => {
    if (!artworkSlides.length) return;
    const wrappedIndex = (index % artworkSlides.length + artworkSlides.length) % artworkSlides.length;
    const image = artworkSlides[wrappedIndex].querySelector(".wheel-artwork img");
    if (image) chooseCrop(image);
  };

  // Assign initial crops before the first slide is shown.
  artworkSlides.forEach(slide => {
    const image = slide.querySelector(".wheel-artwork img");
    if (image) chooseCrop(image);
  });

  const pages = new window.Pageable("#wheel-track", {
    orientation: "vertical",
    infinite: true,
    pips: false,
    animation: 700,
    delay: 100,
    swipeThreshold: 350,
    freeScroll: false,
    events: {
      // Wheel input is handled below so a single trackpad/mouse gesture
      // cannot queue multiple slide changes from its momentum events.
      wheel: false,
      mouse: false,
      touch: true,
      keydown: true
    },
    onStart: () => {
      isAnimating = true;
      if (!mantra || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      window.clearTimeout(mantraTimer);
      mantra.classList.add("is-active");
    },
    onFinish: () => {
      isAnimating = false;
      if (!mantra) return;
      window.clearTimeout(mantraTimer);
      mantraTimer = window.setTimeout(() => mantra.classList.remove("is-active"), 180);
    }
  });

  // When a slide finishes entering, pre-randomize its neighbors rather than
  // moving the visible image. Their crops are already set when they arrive.
  pages.on("scroll.end", data => {
    randomizeArtworkAt(data.index - 1);
    randomizeArtworkAt(data.index + 1);
  });

  // A trackpad gesture can emit momentum events for much longer than a mouse
  // wheel. Keep the gesture locked until 800ms after the final wheel event.
  track.addEventListener("wheel", event => {
    event.preventDefault();

    window.clearTimeout(wheelQuietTimer);
    wheelQuietTimer = window.setTimeout(() => {
      wheelGestureActive = false;
    }, 800);

    if (wheelGestureActive) return;
    wheelGestureActive = true;

    // If a new gesture begins during a slide transition, swallow it and its
    // momentum. The quiet timer above will release the lock after it ends.
    if (isAnimating) return;

    if (event.deltaY > 0) pages.next();
    else if (event.deltaY < 0) pages.prev();
  }, { passive: false });
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
});
