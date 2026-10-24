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
  let currentIndex = 0;
  const chooseCrop = image => {
    const previousX = Number(image.dataset.cropX ?? 0.5);
    const previousY = Number(image.dataset.cropY ?? 0.5);
    let x = 0.05 + Math.random() * 0.9;
    let y = 0.05 + Math.random() * 0.9;

    // Avoid returning to almost the same region when a painting reappears.
    if (Math.abs(x - previousX) < 0.25) x = x < 0.5 ? Math.min(0.95, x + 0.32) : Math.max(0.05, x - 0.32);
    if (Math.abs(y - previousY) < 0.25) y = y < 0.5 ? Math.min(0.95, y + 0.32) : Math.max(0.05, y - 0.32);

    image.dataset.cropX = String(x);
    image.dataset.cropY = String(y);
    positionArtworkImage(image);
  };

  // The viewport acts as a window onto the painting. Keep source pixels at
  // native scale when possible; enlarge small prototype files only to cover it.
  const positionArtworkImage = image => {
    if (!image.naturalWidth || !image.naturalHeight) return;
    const viewport = image.closest(".wheel-artwork");
    if (!viewport) return;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;

    const scale = Math.max(1, width / image.naturalWidth, height / image.naturalHeight);
    const imageWidth = image.naturalWidth * scale;
    const imageHeight = image.naturalHeight * scale;
    const overflowX = Math.max(0, imageWidth - width);
    const overflowY = Math.max(0, imageHeight - height);
    const cropX = Number(image.dataset.cropX ?? 0.5);
    const cropY = Number(image.dataset.cropY ?? 0.5);
    const panX = (cropX - 0.5) * overflowX;
    const panY = (cropY - 0.5) * overflowY;

    image.style.width = imageWidth + "px";
    image.style.height = imageHeight + "px";
    image.style.setProperty("--pan-x", panX + "px");
    image.style.setProperty("--pan-y", panY + "px");
  };

  const randomizeArtworkAt = index => {
    if (!artworkSlides.length) return;
    const wrappedIndex = (index % artworkSlides.length + artworkSlides.length) % artworkSlides.length;
    const slide = artworkSlides[wrappedIndex];
    const image = slide.querySelector(".wheel-artwork img");
    if (!image) return;

    chooseCrop(image);

    // Pageable may create a loop copy of the first/last slide. Keep its crop
    // synchronized with the source slide so the invisible loop reset cannot
    // reveal a different region for a frame.
    const anchor = slide.dataset.anchor;
    if (!anchor) return;
    track.querySelectorAll("[data-anchor]").forEach(copy => {
      if (copy === slide || copy.dataset.anchor !== anchor) return;
      const copyImage = copy.querySelector(".wheel-artwork img");
      if (!copyImage) return;
      copyImage.dataset.cropX = image.dataset.cropX;
      copyImage.dataset.cropY = image.dataset.cropY;
      positionArtworkImage(copyImage);
    });
  };

  // Assign crops before display; resize keeps the same relative region.
  artworkSlides.forEach(slide => {
    const image = slide.querySelector(".wheel-artwork img");
    if (!image) return;
    chooseCrop(image);
    image.addEventListener("load", () => positionArtworkImage(image));
    if (image.complete) positionArtworkImage(image);
  });

  window.addEventListener("resize", () => {
    artworkSlides.forEach(slide => {
      const image = slide.querySelector(".wheel-artwork img");
      if (image) positionArtworkImage(image);
    });
  }, { passive: true });

  const pages = new window.Pageable("#wheel-track", {
    orientation: "vertical",
    infinite: true,
    pips: false,
    animation: 700,
    delay: 100,
    swipeThreshold: 80,
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
      if (mantra) {
        window.clearTimeout(mantraTimer);
        mantraTimer = window.setTimeout(() => mantra.classList.remove("is-active"), 180);
      }

      // Start the cooldown after the slide animation, not on every wheel event.
      // Momentum cannot keep restarting this timer while the transition runs.
      window.clearTimeout(wheelQuietTimer);
      wheelQuietTimer = window.setTimeout(() => {
        wheelGestureActive = false;
      }, 900);
    }
  });

  const primeArtworkAt = index => {
    if (!artworkSlides.length) return;
    const wrappedIndex = (index % artworkSlides.length + artworkSlides.length) % artworkSlides.length;
    const image = artworkSlides[wrappedIndex].querySelector(".wheel-artwork img");
    if (!image) return;
    image.loading = "eager";
    if (image.complete && image.decode) image.decode().catch(() => {});
  };

  // Prepare neighboring paintings before they enter the viewport.
  pages.on("scroll.end", data => {
    currentIndex = data.index % artworkSlides.length;
    randomizeArtworkAt(currentIndex - 1);
    randomizeArtworkAt(currentIndex + 1);
    primeArtworkAt(currentIndex - 1);
    primeArtworkAt(currentIndex + 1);
  });

  // Accept one wheel event per gesture. Momentum events are ignored without
  // extending the lock, including events received during the mantra transition.
  track.addEventListener("wheel", event => {
    event.preventDefault();
    if (isAnimating || wheelGestureActive) return;
    if (event.deltaY === 0) return;

    wheelGestureActive = true;
    const direction = event.deltaY > 0 ? 1 : -1;
    primeArtworkAt(currentIndex + direction);
    if (direction > 0) pages.next();
    else pages.prev();
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
