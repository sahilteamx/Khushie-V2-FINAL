(() => {
  "use strict";

  const shell = document.querySelector("#memoryWorld");
  const wall = shell?.querySelector("[data-memory-world-wall]");
  const stage = shell?.querySelector("[data-memory-world-stage]");
  const camera = shell?.querySelector("[data-memory-world-camera]");
  const room = shell?.querySelector("[data-memory-world-room]");
  const intro = shell?.querySelector("[data-memory-world-intro]");
  const status = shell?.querySelector("[data-memory-world-status]");
  const position = shell?.querySelector("[data-memory-world-position]");
  const openButtons = [...document.querySelectorAll("[data-open-memory-world]")];
  const closeButton = shell?.querySelector("[data-memory-world-close]");
  const prevButton = shell?.querySelector("[data-memory-world-prev]");
  const nextButton = shell?.querySelector("[data-memory-world-next]");

  if (!shell || !wall || !stage || !camera || !room || !window.KHUSHI_MEDIA) return;

  const media = window.KHUSHI_MEDIA;
  const worldConfig = media.memoryWorld || {};
  const placements = Array.isArray(worldConfig.placements) ? worldConfig.placements : [];
  const zones = worldConfig.zones || {};
  const reducedMotionQuery = window.KHUSHI_CONFIG?.reducedMotionQuery || "(prefers-reduced-motion: reduce)";
  const reducedMotion = window.matchMedia?.(reducedMotionQuery);

  const byId = new Map();
  [...(media.memories || []), ...(media.story || []), media.featuredMemory]
    .filter(Boolean)
    .forEach((item) => byId.set(item.id, item));

  const zoneOrder = ["childhood", "thoseDays", "present", "future", "journey"];
  let zoneIndex = 0;
  let worldOpen = false;
  let activeButton = null;
  let rafId = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let transitioning = false;

  const isMobile = () => window.matchMedia?.("(max-width: 767px)").matches ?? false;
  const motionReduced = () => Boolean(reducedMotion?.matches);

  const getSourceItem = (id) => byId.get(id) || null;

  const getWorldItems = () => placements
    .map((placement) => {
      const source = getSourceItem(placement.id);
      if (!source?.src) return null;
      return {
        type: source.type || "image",
        src: source.src,
        poster: source.poster,
        title: source.title || source.label || "Memory",
        label: source.label || source.title || "Memory",
        caption: source.caption || (source.date ? `${source.date}` : "")
      };
    })
    .filter(Boolean);

  const worldItems = getWorldItems();

  const createPolaroid = (placement, index) => {
    const source = getSourceItem(placement.id);
    if (!source?.src) return null;

    const zone = zones[placement.zone] || {};
    const button = document.createElement("button");
    button.type = "button";
    button.className = [
      "memory-world-polaroid",
      placement.featured ? "memory-world-polaroid--featured" : "",
      `memory-world-polaroid--${placement.zone}`
    ].filter(Boolean).join(" ");
    button.dataset.memoryId = placement.id;
    button.dataset.zone = placement.zone;
    button.dataset.index = String(index);
    button.style.setProperty("--mw-x", `${placement.x ?? 0}%`);
    button.style.setProperty("--mw-y", `${placement.y ?? 0}%`);
    button.style.setProperty("--mw-z", `${placement.z ?? 20}px`);
    button.style.setProperty("--mw-r", `${placement.rotate ?? 0}deg`);
    button.style.setProperty("--mw-s", `${placement.scale ?? 1}`);
    button.style.setProperty("--mw-d", `${Math.max(0, 10 + (placement.z ?? 20) / 18)}px`);
    button.setAttribute(
      "aria-label",
      `${zone.label || "Memory"}: ${source.title || source.label || "Photo"}`
    );

    const frame = document.createElement("span");
    frame.className = "memory-world-polaroid-frame";
    frame.setAttribute("aria-hidden", "true");

    const image = document.createElement("img");
    image.src = source.src;
    image.alt = "";
    image.loading = placement.featured || index < 4 ? "eager" : "lazy";
    image.decoding = "async";

    const tape = document.createElement("span");
    tape.className = "memory-world-tape";
    tape.setAttribute("aria-hidden", "true");

    const caption = document.createElement("span");
    caption.className = "memory-world-polaroid-caption";
    caption.textContent = source.title || source.label || "Memory";

    const subcaption = document.createElement("span");
    subcaption.className = "memory-world-polaroid-subcaption";
    subcaption.textContent = zone.title || "Memory";

    frame.append(image, tape, caption, subcaption);
    button.appendChild(frame);

    button.addEventListener("click", () => openPhoto(placement.id, button));
    return button;
  };

  const renderWall = () => {
    wall.replaceChildren();
    placements.forEach((placement, index) => {
      const node = createPolaroid(placement, index);
      if (node) wall.appendChild(node);
    });
  };

  const updateZone = (nextIndex, animate = true) => {
    zoneIndex = (nextIndex + zoneOrder.length) % zoneOrder.length;
    const zone = zoneOrder[zoneIndex];

    shell.dataset.activeZone = zone;
    position.textContent = `${String(zoneIndex + 1).padStart(2, "0")} / ${String(zoneOrder.length).padStart(2, "0")}`;

    const zoneMeta = zones[zone] || {};
    status.textContent = zone === "journey"
      ? `Featured space · ${worldItems.length} memories in one shared room.`
      : `${zoneMeta.label || "Memory zone"} · ${zoneMeta.title || "Memory"}`;

    const labels = shell.querySelectorAll(".memory-world-zone-label");
    labels.forEach((label) => label.classList.toggle("is-active", label.classList.contains(`memory-world-zone-label--${zone === "thoseDays" ? "those-days" : zone}`)));

    const mobileShift = {
      childhood: 0,
      thoseDays: -150,
      present: -295,
      future: -445,
      journey: -220
    }[zone] ?? 0;

    room.style.setProperty("--mobile-pan-x", `${isMobile() ? mobileShift : 0}px`);

    if (animate && !motionReduced()) {
      shell.classList.remove("is-zone-changing");
      requestAnimationFrame(() => shell.classList.add("is-zone-changing"));
      window.setTimeout(() => shell.classList.remove("is-zone-changing"), 520);
    }
  };

  const animateFrame = () => {
    if (!worldOpen) {
      rafId = 0;
      return;
    }

    const easing = motionReduced() ? 1 : 0.085;
    pointerX += (targetX - pointerX) * easing;
    pointerY += (targetY - pointerY) * easing;

    camera.style.setProperty("--camera-x", `${pointerX}deg`);
    camera.style.setProperty("--camera-y", `${pointerY}deg`);

    rafId = window.requestAnimationFrame(animateFrame);
  };

  const startFrameLoop = () => {
    if (rafId) return;
    targetX = 0;
    targetY = 0;
    pointerX = 0;
    pointerY = 0;
    rafId = window.requestAnimationFrame(animateFrame);
  };

  const stopFrameLoop = () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    camera.style.removeProperty("--camera-x");
    camera.style.removeProperty("--camera-y");
  };

  const openPhoto = (id, trigger) => {
    const index = worldItems.findIndex((item) => {
      const source = getSourceItem(id);
      return source && item.src === source.src;
    });

    activeButton = trigger;

    if (window.KhushiMemoryLightbox?.openItems && index >= 0) {
      window.KhushiMemoryLightbox.openItems(worldItems, index);
      return;
    }

    // Defensive fallback: the primary Memories gallery remains usable.
    status.textContent = "Open this memory from the gallery below.";
  };

  const openWorld = (trigger) => {
    if (worldOpen || transitioning) return;
    worldOpen = true;
    transitioning = true;
    activeButton = trigger || document.activeElement;

    shell.hidden = false;
    shell.setAttribute("aria-hidden", "false");
    document.body.classList.add("memory-world-open");
    renderWall();
    updateZone(zoneIndex, false);

    window.setTimeout(() => {
      shell.classList.add("is-open");
      shell.classList.add("is-intro-complete");
      if (!motionReduced()) intro?.classList.add("is-hidden");
      stage.focus({ preventScroll: true });
      startFrameLoop();
      transitioning = false;
    }, motionReduced() ? 30 : 80);
  };

  const closeWorld = () => {
    if (!worldOpen || transitioning) return;
    transitioning = true;

    if (window.KhushiMemoryLightbox && document.querySelector("#lightbox.is-open")) {
      window.KhushiMemoryLightbox.close();
    }

    stopFrameLoop();
    shell.classList.remove("is-open", "is-intro-complete");
    document.body.classList.remove("memory-world-open");

    window.setTimeout(() => {
      shell.hidden = true;
      shell.setAttribute("aria-hidden", "true");
      worldOpen = false;
      transitioning = false;
      intro?.classList.remove("is-hidden");
      if (activeButton instanceof HTMLElement) activeButton.focus();
      activeButton = null;
    }, motionReduced() ? 0 : 360);
  };

  const updatePointer = (event) => {
    if (!worldOpen || motionReduced() || isMobile()) return;
    const rect = stage.getBoundingClientRect();
    const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    targetX = Math.max(-1, Math.min(1, nx)) * 2.6;
    targetY = Math.max(-1, Math.min(1, ny)) * -1.4;
  };

  const handleTouchStart = (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  };

  const handleTouchEnd = (event) => {
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;
    updateZone(zoneIndex + (dx < 0 ? 1 : -1));
  };

  renderWall();
  updateZone(0, false);

  openButtons.forEach((button) => {
    button.addEventListener("click", () => openWorld(button));
  });

  closeButton?.addEventListener("click", closeWorld);
  prevButton?.addEventListener("click", () => updateZone(zoneIndex - 1));
  nextButton?.addEventListener("click", () => updateZone(zoneIndex + 1));
  stage.addEventListener("pointermove", updatePointer, { passive: true });
  stage.addEventListener("touchstart", handleTouchStart, { passive: true });
  stage.addEventListener("touchend", handleTouchEnd, { passive: true });

  shell.addEventListener("click", (event) => {
    if (event.target === shell) closeWorld();
  });

  document.addEventListener("keydown", (event) => {
    if (!worldOpen) return;

    const lightboxOpen = document.querySelector("#lightbox.is-open");
    if (lightboxOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeWorld();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateZone(zoneIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      updateZone(zoneIndex + 1);
    }
  });

  reducedMotion?.addEventListener?.("change", () => {
    if (worldOpen) {
      targetX = 0;
      targetY = 0;
      updateZone(zoneIndex, false);
    }
  });

  window.KhushiMemoryWorld = Object.freeze({
    open: openWorld,
    close: closeWorld,
    isOpen: () => worldOpen
  });
})();
