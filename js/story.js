(() => {
  "use strict";

  const root = document.querySelector("#storyChapters");
  const chapters = window.KHUSHI_MEDIA?.story;
  if (!root || !Array.isArray(chapters) || !chapters.length) return;

  const progress = document.querySelector("#storyProgress span");
  const position = document.querySelector("#storyPosition");
  const previous = document.querySelector("#storyPrev");
  const next = document.querySelector("#storyNext");
  const reducedQuery = window.KHUSHI_CONFIG?.reducedMotionQuery || "(prefers-reduced-motion: reduce)";
  const reduced = window.matchMedia?.(reducedQuery)?.matches ?? false;
  let active = 0;
  let observer = null;

  const lines = (text) => String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);

  const createChapter = (chapter, index) => {
    const item = document.createElement("article");
    item.className = `story-chapter story-chapter--${index % 2 === 0 ? "left" : "right"} reveal`;
    item.dataset.index = String(index);
    item.id = chapter.id;
    item.setAttribute("aria-labelledby", `${chapter.id}-title`);

    const marker = document.createElement("button");
    marker.type = "button";
    marker.className = "chapter-number";
    marker.setAttribute("aria-label", `Jump to chapter ${chapter.number}, ${chapter.title}`);
    marker.innerHTML = `<span>${chapter.number}</span>`;

    const card = document.createElement("div");
    card.className = "chapter-card";

    const media = document.createElement("div");
    media.className = "chapter-media";
    media.setAttribute("role", "img");
    media.setAttribute("aria-label", `${chapter.title} chapter image`);

    const visual = document.createElement("div");
    visual.className = "chapter-media-visual";

    if (chapter.image) {
      const image = document.createElement("img");
      image.src = chapter.image;
      image.alt = `${chapter.title} chapter image`;
      image.loading = index === 0 ? "eager" : "lazy";
      image.decoding = "async";
      visual.appendChild(image);
    }

    const vignette = document.createElement("span");
    vignette.className = "chapter-media-vignette";
    vignette.setAttribute("aria-hidden", "true");
    visual.appendChild(vignette);

    const mediaLabel = document.createElement("span");
    mediaLabel.className = "chapter-media-label";
    mediaLabel.textContent = `${chapter.number} · ${chapter.label}`;
    visual.appendChild(mediaLabel);

    media.appendChild(visual);

    const meta = document.createElement("div");
    meta.className = "chapter-meta";
    meta.innerHTML = `
      <span class="chapter-label">${chapter.number} · ${chapter.label} ${chapter.emoji || ""}</span>
      <h2 id="${chapter.id}-title">${chapter.title}</h2>
      <p>${chapter.date || ""}</p>
    `;

    const panel = document.createElement("div");
    panel.className = "chapter-panel";
    panel.id = `${chapter.id}-panel`;

    const copy = document.createElement("div");
    copy.className = "chapter-copy";
    lines(chapter.text).forEach((line) => {
      const p = document.createElement("p");
      p.textContent = line;
      copy.appendChild(p);
    });
    panel.appendChild(copy);

    const footer = document.createElement("div");
    footer.className = "chapter-panel-footer";
    footer.textContent = index === chapters.length - 1
      ? "The next page is waiting."
      : "Continue when you're ready.";
    panel.appendChild(footer);

    card.append(media, meta, panel);
    item.append(marker, card);

    const activateFromChapter = () => {
      active = index;
      syncNav();
      item.classList.add("is-active", "is-open");
      item.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      if (index === chapters.length - 1) {
        window.dispatchEvent(new CustomEvent("khushi:story-finale", { detail: { chapterIndex: index } }));
      }
    };

    marker.addEventListener("click", activateFromChapter);
    media.tabIndex = 0;
    media.setAttribute("role", "button");
    media.setAttribute("aria-label", `Read ${chapter.title}`);
    media.addEventListener("click", activateFromChapter);
    media.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateFromChapter();
      }
    });

    return item;
  };

  const allItems = chapters.map(createChapter);
  allItems.forEach((item) => root.appendChild(item));

  const syncNav = () => {
    const chapter = chapters[active];
    if (!chapter) return;
    if (position) position.textContent = `${chapter.number} / ${String(chapters.length).padStart(2, "0")}`;
    if (progress) progress.style.width = `${((active + 1) / chapters.length) * 100}%`;
    if (previous) previous.disabled = active <= 0;
    if (next) next.disabled = active >= chapters.length - 1;
  };

  const activate = (index, shouldScroll = true) => {
    active = Math.max(0, Math.min(chapters.length - 1, index));
    allItems.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === active);
      if (itemIndex === active) item.classList.add("is-open");
    });
    syncNav();
    if (active === chapters.length - 1) {
      window.dispatchEvent(new CustomEvent("khushi:story-finale", { detail: { chapterIndex: active } }));
    }
    if (shouldScroll) {
      allItems[active]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    }
  };

  previous?.addEventListener("click", () => activate(active - 1));
  next?.addEventListener("click", () => activate(active + 1));

  syncNav();

  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      let best = null;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        const rect = entry.boundingClientRect;
        const distance = Math.abs(rect.top - window.innerHeight * 0.42);
        if (!best || distance < best.distance) best = { index: Number(entry.target.dataset.index), distance };
      });
      if (best && best.index !== active) {
        active = best.index;
        allItems.forEach((item, itemIndex) => item.classList.toggle("is-active", itemIndex === active));
        syncNav();
        if (active === chapters.length - 1) {
          window.dispatchEvent(new CustomEvent("khushi:story-finale", { detail: { chapterIndex: active } }));
        }
      }
    }, { threshold: 0.25, rootMargin: "-15% 0px -35% 0px" });
    allItems.forEach((item) => observer.observe(item));
  } else {
    allItems.forEach((item) => item.classList.add("is-visible"));
  }

  window.KhushiStoryJourney = Object.freeze({
    chapters,
    getActiveIndex: () => active,
    goTo: (index) => activate(index)
  });

  const youtubeMount = document.querySelector("#youtubeVideoMount");
  const youtubeStatus = document.querySelector("#youtubeVideoStatus");

  function getYouTubeId(value) {
    try {
      const raw = String(value || "").trim();
      if (!raw) return "";
      const url = new URL(raw);
      if (url.hostname === "youtu.be") return url.pathname.slice(1).split("/")[0];
      if (url.hostname.includes("youtube.com")) {
        if (url.pathname === "/watch") return url.searchParams.get("v") || "";
        if (url.pathname.startsWith("/embed/")) return url.pathname.split("/embed/")[1].split("/")[0];
        if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/shorts/")[1].split("/")[0];
      }
    } catch (_) {}
    return "";
  }

  function renderYouTube() {
    if (!youtubeMount) return;
    const config = window.KHUSHI_CONFIG?.youtubeVideo;
    const id = getYouTubeId(config?.url);
    youtubeMount.replaceChildren();
    if (!config?.enabled || !id) {
      if (youtubeStatus) youtubeStatus.textContent = "No video is configured right now.";
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.className = "youtube-embed";
    iframe.title = config.title || "Birthday video";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    iframe.allowFullscreen = true;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;
    youtubeMount.appendChild(iframe);
    if (youtubeStatus) youtubeStatus.textContent = config.description || "";
  }

  renderYouTube();

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const editable = target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (editable) return;
    if (event.key === "ArrowRight") {
      event.preventDefault();
      activate(Math.min(active + 1, chapters.length - 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      activate(Math.max(active - 1, 0));
    }
  });
})();
