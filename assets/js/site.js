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

function safeExternalLink(url) {
  return /^https?:\/\//i.test(url || "");
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
    const img = document.createElement("img");
    img.src = featured.image;
    img.alt = text(featured.alt || featured.title || "Painting by Nancy Nguyen");
    img.fetchPriority = "high";
    container.appendChild(img);
  } catch (error) {
    container.innerHTML = '<p class="empty-state">Artwork data could not be loaded. Preview the site through a local server, not by opening the HTML file directly.</p>';
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
  img.src = work.image;
  img.alt = text(work.alt || work.title || "Painting by Nancy Nguyen");
  imageWrap.appendChild(img);
  content.appendChild(imageWrap);
  const details = document.createElement("div");
  details.className = "dialog-details";
  const title = document.createElement("p");
  title.textContent = [text(work.title), text(work.year)].filter(Boolean).join(", ");
  details.appendChild(title);
  const metadata = [work.medium, work.dimensions].filter(Boolean).map(text).join(" · ");
  if (metadata) {
    const p = document.createElement("p");
    p.textContent = metadata;
    details.appendChild(p);
  }
  if (work.description) {
    const p = document.createElement("p");
    p.textContent = work.description;
    details.appendChild(p);
  }
  content.appendChild(details);
  dialog.showModal();
}

async function renderWorks() {
  const grid = document.querySelector("#works-grid");
  if (!grid) return;
  try {
    const artworks = await readJson(DATA.artworks);
    const works = artworks.filter(work => work.image);
    if (!works.length) return;
    grid.innerHTML = "";
    works.forEach(work => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "work-card";
      button.setAttribute("aria-label", "View " + text(work.title || "artwork"));
      const img = document.createElement("img");
      img.src = work.image;
      img.alt = text(work.alt || work.title || "Painting by Nancy Nguyen");
      img.loading = "lazy";
      button.appendChild(img);
      const title = document.createElement("span");
      title.className = "work-title";
      title.textContent = [text(work.title), text(work.year)].filter(Boolean).join(", ");
      button.appendChild(title);
      const meta = [work.medium, work.dimensions].filter(Boolean).map(text).join(" · ");
      if (meta) {
        const metadata = document.createElement("span");
        metadata.className = "work-meta";
        metadata.textContent = meta;
        button.appendChild(metadata);
      }
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
      if (exhibition.venue || exhibition.location) {
        detail.appendChild(document.createTextNode(", "));
        const location = document.createElement("span");
        location.className = "exhibition-location";
        location.textContent = [exhibition.venue, exhibition.location].filter(Boolean).join(", ");
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
    const main = document.querySelector(".cv-page");
    if (main) main.insertAdjacentHTML("afterbegin", '<p class="empty-state">Exhibition data could not be loaded. Preview the site through a local server.</p>');
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHome();
  renderWorks();
  renderExhibitions();
  const dialog = document.querySelector("#artwork-dialog");
  const close = document.querySelector(".dialog-close");
  if (close && dialog) close.addEventListener("click", () => dialog.close());
  if (dialog) dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
});