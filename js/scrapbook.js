(() => {
  "use strict";

  const shell = document.getElementById("memoryBook");
  const openButtons = [...document.querySelectorAll("[data-open-memory-book]")];
  if (!shell || !openButtons.length || !window.KHUSHI_MEDIA?.story) return;

  const stage = shell.querySelector(".scrapbook-stage");
  const spread = shell.querySelector(".scrapbook-spread");
  const turnLayer = shell.querySelector(".scrapbook-turn-layer");
  const closeButton = shell.querySelector("[data-scrapbook-close]");
  const previousButton = shell.querySelector("[data-scrapbook-prev]");
  const nextButton = shell.querySelector("[data-scrapbook-next]");
  const pageCount = shell.querySelector("[data-scrapbook-page-count]");
  const status = shell.querySelector("[data-scrapbook-status]");
  const desktopTitle = shell.querySelector("[data-scrapbook-stage-title]");

  const stories = new Map(window.KHUSHI_MEDIA.story.map((item) => [item.id, item]));
  const featured = window.KHUSHI_MEDIA.featuredMemory;
  const bookConfig = window.KHUSHI_MEDIA.scrapbook || {};
  const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const pageOrder = Array.isArray(bookConfig.pageOrder) && bookConfig.pageOrder.length
    ? [...bookConfig.pageOrder]
    : ["cover", "opening", "chapter-01", "chapter-02", "chapter-03", "chapter-04", "journey", "closing"];

  const hero = document.querySelector(".memories-hero");
  const heroEyebrow = hero?.querySelector(".eyebrow")?.textContent?.trim() || "Chapter one · The moments";
  const heroTitle = hero?.querySelector(".page-title");
  const heroIntro = hero?.querySelector(".page-intro")?.textContent?.trim() || "";
  const closing = document.querySelector(".memory-closing");
  const closingHeading = closing?.querySelector("h2");
  const closingButton = closing?.querySelector(".button");

  const pageSlotSpec = bookConfig.photoSlots || {};

  let pageIndex = 0;
  let lastTrigger = null;
  let isOpen = false;
  let isAnimating = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let liveAnnounceTimer = null;
  let closeTimer = null;

  const getPageMeta = (pageId) => {
    const slots = pageSlotSpec[pageId] || [];
    return { slots: Array.isArray(slots) ? slots : [] };
  };

  const splitParagraphs = (text) => String(text || "")
    .trim()
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const cloneExistingMarkup = (node) => node ? node.cloneNode(true) : null;

  const makePage = (pageId, side) => {
    const page = document.createElement("article");
    page.className = "scrapbook-page scrapbook-page--" + side;
    page.dataset.pageId = pageId;
    page.setAttribute("aria-label", `${displayPageName(pageId)} page`);

    const inner = document.createElement("div");
    inner.className = "scrapbook-page__inner";
    page.appendChild(inner);

    if (pageId === "cover") {
      page.classList.add("scrapbook-cover");
      const eyebrow = document.createElement("p");
      eyebrow.className = "scrapbook-page__eyebrow";
      eyebrow.textContent = heroEyebrow;

      const title = document.createElement("h2");
      title.className = "scrapbook-page__title";
      const titleClone = cloneExistingMarkup(heroTitle);
      if (titleClone) {
        titleClone.className = "";
        title.innerHTML = titleClone.innerHTML;
      } else {
        title.textContent = "Memories worth keeping.";
      }

      const rule = document.createElement("div");
      rule.className = "scrapbook-page__rule";
      rule.setAttribute("aria-hidden", "true");

      const ornament = document.createElement("div");
      ornament.className = "scrapbook-page__ornament";
      ornament.setAttribute("aria-hidden", "true");
      ornament.textContent = "·  ·  ·";

      inner.append(eyebrow, title, rule, ornament);
      return page;
    }

    if (pageId === "opening") {
      page.classList.add("scrapbook-opening");
      const header = document.createElement("div");
      header.className = "scrapbook-page__header";

      const copy = document.createElement("div");
      const eyebrow = document.createElement("p");
      eyebrow.className = "scrapbook-page__eyebrow";
      eyebrow.textContent = heroEyebrow;
      const title = document.createElement("h2");
      title.className = "scrapbook-page__title";
      title.textContent = "A collection of moments, kept together.";
      const body = document.createElement("div");
      body.className = "scrapbook-page__body";
      const p = document.createElement("p");
      p.textContent = heroIntro;
      body.appendChild(p);
      copy.append(eyebrow, title, body);
      header.appendChild(copy);
      inner.appendChild(header);
      return page;
    }

    if (pageId === "journey") {
      page.classList.add("scrapbook-journey");
      const eyebrow = document.createElement("p");
      eyebrow.className = "scrapbook-page__eyebrow";
      eyebrow.textContent = featured?.label || "Our Journey";
      const title = document.createElement("h2");
      title.className = "scrapbook-page__title";
      title.textContent = featured?.title || "Our Journey";
      const subtitle = document.createElement("p");
      subtitle.className = "scrapbook-page__subtitle";
      subtitle.textContent = featured?.caption || "";

      const mediaWrap = document.createElement("div");
      mediaWrap.className = "scrapbook-media-wrap";
      const slot = createPhotoSlot("journey-main", featured?.src, "landscape", featured?.title || "Our Journey");
      mediaWrap.appendChild(slot);
      inner.append(eyebrow, title, subtitle, mediaWrap);
      return page;
    }

    if (pageId === "closing") {
      page.classList.add("scrapbook-closing");
      const eyebrow = document.createElement("p");
      eyebrow.className = "scrapbook-page__eyebrow";
      eyebrow.textContent = "One more look";

      const title = document.createElement("h2");
      title.className = "scrapbook-page__title";
      const clone = cloneExistingMarkup(closingHeading);
      if (clone) {
        clone.className = "";
        title.innerHTML = clone.innerHTML;
      } else {
        title.textContent = "Some memories deserve their own space.";
      }

      const actions = document.createElement("div");
      actions.className = "scrapbook-page__actions";
      const button = cloneExistingMarkup(closingButton);
      if (button) {
        button.removeAttribute("data-reveal");
        button.className = "button button--primary";
        actions.appendChild(button);
      }

      inner.append(eyebrow, title, actions);
      return page;
    }

    const story = stories.get(pageId);
    if (story) {
      page.classList.add("scrapbook-chapter");
      const layout = document.createElement("div");
      layout.className = "scrapbook-chapter-layout";

      const textColumn = document.createElement("div");
      const header = document.createElement("div");
      header.className = "scrapbook-page__header";
      const eyebrow = document.createElement("p");
      eyebrow.className = "scrapbook-page__eyebrow";
      eyebrow.textContent = `${story.number} — ${story.label}`;
      const number = document.createElement("span");
      number.className = "scrapbook-page__number";
      number.setAttribute("aria-hidden", "true");
      number.textContent = story.emoji || story.number;
      header.append(eyebrow, number);

      const title = document.createElement("h2");
      title.className = "scrapbook-page__title";
      title.textContent = story.title;

      const subtitle = document.createElement("p");
      subtitle.className = "scrapbook-page__subtitle";
      subtitle.textContent = story.date || "";

      const body = document.createElement("div");
      body.className = "scrapbook-page__body";
      splitParagraphs(story.text).forEach((paragraph) => {
        const p = document.createElement("p");
        p.textContent = paragraph;
        body.appendChild(p);
      });

      textColumn.append(header, title, subtitle, body);

      const mediaWrap = document.createElement("div");
      mediaWrap.className = "scrapbook-media-wrap";
      const slotSpecs = getPageMeta(pageId).slots;
      const mainSpec = slotSpecs.find((slot) => slot.role === "main") || {
        id: `${pageId}-main`, orientation: "landscape"
      };
      const photo = createPhotoSlot(
        mainSpec.id || `${pageId}-main`,
        story.image,
        mainSpec.orientation || "landscape",
        `${story.number} — ${story.label}`
      );
      mediaWrap.appendChild(photo);

      getPageMeta(pageId).slots
        .filter((slot) => slot.role === "supporting" && slot.src)
        .forEach((slot) => {
          mediaWrap.appendChild(
            createPhotoSlot(
              slot.id,
              slot.src,
              slot.orientation || "square",
              `${story.number} — ${story.label} supporting photograph`
            )
          );
        });

      layout.append(textColumn, mediaWrap);
      inner.appendChild(layout);
      return page;
    }

    return makeBlankPage(pageId, side);
  };

  const makeBlankPage = (pageId, side) => {
    const page = document.createElement("article");
    page.className = `scrapbook-page scrapbook-page--${side} scrapbook-page--blank`;
    page.dataset.pageId = pageId;
    page.setAttribute("aria-hidden", "true");
    return page;
  };

  const createPhotoSlot = (slotId, src, orientation, alt) => {
    const wrap = document.createElement("figure");
    wrap.className = `scrapbook-photo-slot scrapbook-photo-slot--${orientation || "landscape"}`;
    wrap.dataset.photoSlot = slotId;

    if (src) {
      const image = document.createElement("img");
      image.src = src;
      image.alt = alt || "Memory photograph";
      image.loading = "lazy";
      image.decoding = "async";
      wrap.appendChild(image);
    }

    return wrap;
  };

  const displayPageName = (pageId) => {
    if (pageId === "cover") return "Cover";
    if (pageId === "opening") return "Opening";
    if (pageId === "journey") return "Our Journey";
    if (pageId === "closing") return "Closing";
    const story = stories.get(pageId);
    return story ? `${story.number} — ${story.label}` : "Memory";
  };

  const buildPage = (pageId, side) => makePage(pageId, side);

  const renderSpread = (firstIndex) => {
    const currentLeft = spread?.querySelector('[data-book-page="left"]');
    const currentRight = spread?.querySelector('[data-book-page="right"]');
    currentLeft?.remove();
    currentRight?.remove();

    const leftId = pageOrder[firstIndex] || null;
    const rightId = pageOrder[firstIndex + 1] || null;
    const left = leftId ? buildPage(leftId, "left") : makeBlankPage("blank-left", "left");
    const right = rightId ? buildPage(rightId, "right") : makeBlankPage("blank-right", "right");
    const spine = spread?.querySelector(".scrapbook-spine");
    if (spine) {
      spread.insertBefore(left, spine);
      spread.insertBefore(right, spine);
    } else {
      spread?.append(left, right);
    }
  };

  const getPageRefs = () => ({
    left: shell.querySelector('[data-book-page="left"]'),
    right: shell.querySelector('[data-book-page="right"]')
  });

  const renderMobile = (index) => {
    const currentLeft = spread?.querySelector('[data-book-page="left"]');
    const currentRight = spread?.querySelector('[data-book-page="right"]');
    currentLeft?.remove();
    currentRight?.remove();

    const blank = makeBlankPage("mobile-blank", "left");
    const page = pageOrder[index];
    const active = page ? buildPage(page, "right") : makeBlankPage("mobile-blank-right", "right");
    active.classList.add("is-mobile-visible");
    const spine = spread?.querySelector(".scrapbook-spine");
    if (spine) {
      spread.insertBefore(blank, spine);
      spread.insertBefore(active, spine);
    } else {
      spread?.append(blank, active);
    }
  };

  const isMobile = () => window.matchMedia?.("(max-width: 767px)").matches;

  const updateUI = () => {
    if (isMobile()) {
      if (pageCount) pageCount.textContent = `Page ${String(pageIndex + 1).padStart(2, "0")} / ${String(pageOrder.length).padStart(2, "0")}`;
      renderMobile(pageIndex);
    } else {
      const spreadIndex = pageIndex - (pageIndex % 2);
      if (spreadIndex !== pageIndex) pageIndex = spreadIndex;
      if (pageCount) {
        const start = String(spreadIndex + 1).padStart(2, "0");
        const end = Math.min(spreadIndex + 2, pageOrder.length);
        pageCount.textContent = end > spreadIndex ? `Pages ${start}–${String(end).padStart(2, "0")} / ${String(pageOrder.length).padStart(2, "0")}` : `Page ${start} / ${String(pageOrder.length).padStart(2, "0")}`;
      }
      renderSpread(spreadIndex);
    }

    const name = displayPageName(pageOrder[pageIndex]);
    if (desktopTitle) desktopTitle.textContent = name;
    if (status) {
      window.clearTimeout(liveAnnounceTimer);
      liveAnnounceTimer = window.setTimeout(() => {
        status.textContent = `Opened ${name}. ${pageCount?.textContent || ""}`;
      }, 30);
    }
    if (previousButton) previousButton.disabled = pageIndex <= 0;
    if (nextButton) nextButton.disabled = pageIndex >= pageOrder.length - 1 || (!isMobile() && pageIndex >= pageOrder.length - 2);
  };

  const captureSpreadHtml = () => {
    const refs = getPageRefs();
    const holder = document.createElement("div");
    holder.className = "scrapbook-turn-face";
    if (refs.left) holder.appendChild(refs.left.cloneNode(true));
    if (refs.right) holder.appendChild(refs.right.cloneNode(true));
    return holder;
  };

  const animateTransition = (direction, renderTarget) => {
    const motionReduced = reduceMotion();
    if (motionReduced || !window.gsap || !spread) {
      renderTarget();
      return Promise.resolve();
    }

    if (isMobile()) {
      isAnimating = true;
      renderTarget();
      return new Promise((resolve) => {
        window.gsap.fromTo(
          spread,
          { rotateY: direction === "next" ? -7 : 7, scale: .985, opacity: .78 },
          { rotateY: 0, scale: 1, opacity: 1, duration: .42, ease: "power2.out", onComplete: () => {
            isAnimating = false;
            resolve();
          } }
        );
      });
    }

    isAnimating = true;
    const current = captureSpreadHtml();
    turnLayer.replaceChildren(current);
    turnLayer.classList.add("is-active");

    renderTarget();

    const rotation = direction === "next" ? -92 : 92;
    current.style.transformOrigin = direction === "next" ? "right center" : "left center";
    current.style.transform = "rotateY(0deg)";

    return new Promise((resolve) => {
      window.gsap.fromTo(
        current,
        { rotateY: 0, opacity: 1 },
        {
          rotateY: rotation,
          opacity: .08,
          duration: .72,
          ease: "power3.inOut",
          onComplete: () => {
            turnLayer.classList.remove("is-active");
            turnLayer.replaceChildren();
            isAnimating = false;
            resolve();
          }
        }
      );
    });
  };

  const goTo = (target) => {
    if (!isOpen || isAnimating) return;
    const nextIndex = Math.max(0, Math.min(pageOrder.length - 1, target));
    if (nextIndex === pageIndex) return;

    const direction = nextIndex > pageIndex ? "next" : "prev";
    const desktopTarget = isMobile() ? nextIndex : nextIndex - (nextIndex % 2);
    const finalIndex = Math.max(0, Math.min(pageOrder.length - 1, desktopTarget));
    if (finalIndex === pageIndex) return;

    animateTransition(direction, () => {
      pageIndex = finalIndex;
      updateUI();
    });
  };

  const trapFocus = (event) => {
    if (!isOpen || event.key !== "Tab") return;
    const focusable = [...shell.querySelectorAll("button,a[href],[tabindex]:not([tabindex='-1'])")]
      .filter((node) => !node.hasAttribute("disabled") && node.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const open = (trigger) => {
    if (isOpen) return;
    lastTrigger = trigger || document.activeElement;
    isOpen = true;
    window.clearTimeout(closeTimer);
    pageIndex = 0;
    shell.hidden = false;
    shell.setAttribute("aria-hidden", "false");
    shell.classList.add("is-open");
    document.body.classList.add("media-viewer-open");
    renderSpread(0);
    updateUI();

    requestAnimationFrame(() => {
      closeButton?.focus({ preventScroll: true });
      if (!reduceMotion() && window.gsap) {
        window.gsap.fromTo(shell, { opacity: 0 }, { opacity: 1, duration: .45, ease: "power2.out" });
        window.gsap.fromTo(spread, { y: 18, rotateX: 1.2, opacity: .4 }, { y: 0, rotateX: 0, opacity: 1, duration: .72, ease: "power3.out" });
      }
    });
  };

  const close = () => {
    if (!isOpen || isAnimating) return;
    isOpen = false;
    shell.classList.remove("is-open");
    shell.setAttribute("aria-hidden", "true");
    document.body.classList.remove("media-viewer-open");
    if (window.gsap && !reduceMotion()) {
      window.gsap.killTweensOf([shell, spread]);
    }
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      shell.hidden = true;
      if (lastTrigger instanceof HTMLElement) lastTrigger.focus({ preventScroll: true });
    }, reduceMotion() ? 0 : 260);
  };

  openButtons.forEach((button) => {
    button.addEventListener("click", () => open(button));
  });
  closeButton?.addEventListener("click", close);
  previousButton?.addEventListener("click", () => goTo(isMobile() ? pageIndex - 1 : pageIndex - 2));
  nextButton?.addEventListener("click", () => goTo(isMobile() ? pageIndex + 1 : pageIndex + 2));

  document.addEventListener("keydown", (event) => {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(isMobile() ? pageIndex - 1 : pageIndex - 2);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(isMobile() ? pageIndex + 1 : pageIndex + 2);
      return;
    }
    trapFocus(event);
  });

  stage?.addEventListener("touchstart", (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }, { passive: true });

  stage?.addEventListener("touchend", (event) => {
    if (!isOpen || isAnimating) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    goTo(isMobile() ? pageIndex + (dx < 0 ? 1 : -1) : pageIndex + (dx < 0 ? 2 : -2));
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (!isOpen) return;
    const desktop = !isMobile();
    if (desktop && pageIndex % 2) pageIndex -= 1;
    renderSpread(desktop ? pageIndex : 0);
    updateUI();
  }, { passive: true });

  // Expose only a tiny debug-free public surface for future phases.
  window.KhushiScrapbook = Object.freeze({
    open,
    close,
    next: () => goTo(isMobile() ? pageIndex + 1 : pageIndex + 2),
    previous: () => goTo(isMobile() ? pageIndex - 1 : pageIndex - 2),
    get currentPage() { return pageIndex + 1; },
    get totalPages() { return pageOrder.length; }
  });
})();
