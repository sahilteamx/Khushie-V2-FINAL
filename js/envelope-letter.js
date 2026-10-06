(() => {
  "use strict";

  const root = document.querySelector("#storyEnvelope");
  const openButton = document.querySelector("#envelopeOpen");
  const letterDialog = document.querySelector("#letterPanel");
  const letterBody = document.querySelector("#letterBody");
  const letterStatus = document.querySelector("#letterStatus");
  const closeButton = document.querySelector("#letterClose");
  const fallbackLink = document.querySelector("#letterFallbackLink");
  if (!root || !openButton || !letterDialog || !letterBody || !closeButton) return;

  const reduce = window.matchMedia?.(window.KHUSHI_CONFIG?.reducedMotionQuery || "(prefers-reduced-motion: reduce)")?.matches ?? false;
  let state = "closed";
  let opener = openButton;
  let letterLoaded = false;
  let transitionTimer = null;
  let timeline = null;

  const setStatus = (message) => {
    if (letterStatus) letterStatus.textContent = message;
  };

  const close = () => {
    window.clearTimeout(transitionTimer);
    if (timeline?.kill) timeline.kill();
    timeline = null;
    state = "closed";
    letterDialog.hidden = true;
    openButton.setAttribute("aria-expanded", "false");
    letterDialog.classList.remove("is-open");
    root.classList.remove("is-letter-open", "is-opening");
    document.body.classList.remove("story-letter-lock");
    openButton.disabled = false;
    const flap = root.querySelector(".envelope-flap");
    const paper = root.querySelector(".envelope-letter");
    const seal = root.querySelector(".envelope-seal");
    const visual = root.querySelector(".envelope-visual");
    if (window.gsap) {
      try {
        window.gsap.set(flap, { rotateX: 0 });
        window.gsap.set(paper, { y: 22, opacity: .96 });
        window.gsap.set(seal, { opacity: 1, scale: 1 });
        window.gsap.set(visual, { opacity: 1 });
        window.gsap.set(letterDialog, { opacity: 0, y: 18 });
      } catch (_) {}
    } else {
      flap?.style.removeProperty("transform");
      paper?.style.removeProperty("transform");
      seal?.style.removeProperty("opacity");
      visual?.style.removeProperty("opacity");
    }
    if (fallbackLink) fallbackLink.hidden = false;
    try { opener?.focus({ preventScroll: true }); } catch (_) { opener?.focus?.(); }
    setStatus("Envelope closed. You can open it again whenever you're ready.");
  };

  const splitSections = (body) => {
    const sections = [];
    let current = [];
    [...body.children].forEach((node) => {
      if (node.classList.contains("message-divider")) {
        if (current.length) sections.push(current);
        current = [];
      } else {
        current.push(node);
      }
    });
    if (current.length) sections.push(current);
    return sections;
  };

  const sectionText = (section) => section.map((node) => node.textContent || "").join(" ").trim();

  const chooseSections = (sections) => {
    const labels = [
      "Birthday", 
      "Why You're Special",
      "A Little Secret For You",
      "Always With You",
      "One Last Thing"
    ];
    const chosen = [];
    if (sections[0]) chosen.push(sections[0]);
    sections.slice(1).forEach((section) => {
      const text = sectionText(section);
      if (labels.slice(1).some((label) => text.includes(label))) chosen.push(section);
    });
    return chosen.slice(0, 5);
  };

  const cloneSection = (section) => {
    const wrapper = document.createElement("section");
    wrapper.className = "letter-section-copy";
    section.forEach((node) => wrapper.appendChild(node.cloneNode(true)));
    return wrapper;
  };

  const loadLetter = async () => {
    if (letterLoaded) return true;
    setStatus("Opening the letter…");
    try {
      const response = await fetch("message.html", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) throw new Error(`message.html returned ${response.status}`);
      const html = await response.text();
      const parser = new DOMParser();
      const documentFromMessage = parser.parseFromString(html, "text/html");
      const source = documentFromMessage.querySelector(".message-body.personal-message");
      const sourceTop = documentFromMessage.querySelector(".message-card-top");
      const sourceSignature = documentFromMessage.querySelector(".message-signature");
      if (!source) throw new Error("Personal message source not found");

      const sections = chooseSections(splitSections(source));
      if (!sections.length) throw new Error("No personal message sections found");

      letterBody.replaceChildren();
      if (sourceTop) {
        const top = document.createElement("div");
        top.className = "letter-source-top";
        top.appendChild(sourceTop.firstElementChild?.cloneNode(true) || document.createElement("span"));
        letterBody.appendChild(top);
      }
      sections.forEach((section) => letterBody.appendChild(cloneSection(section)));
      if (sourceSignature) letterBody.appendChild(sourceSignature.cloneNode(true));

      letterLoaded = true;
      return true;
    } catch (error) {
      console.error("Khushi envelope letter load failed:", error);
      letterBody.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.className = "letter-load-fallback";
      fallback.innerHTML = `
        <p>The personal message is available on the Message page.</p>
        <a class="button button--primary" href="message.html">Open the full message ↗</a>
      `;
      letterBody.appendChild(fallback);
      if (fallbackLink) fallbackLink.hidden = false;
      setStatus("The letter animation is available, but the full message could not be loaded here.");
      return false;
    }
  };

  const open = async () => {
    if (state !== "closed" || root.classList.contains("is-locked")) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : openButton;
    state = "opening";
    openButton.setAttribute("aria-expanded", "true");
    window.clearTimeout(transitionTimer);
    openButton.disabled = true;
    root.classList.add("is-opening");

    const loaded = await loadLetter();
    letterDialog.hidden = false;
    document.body.classList.add("story-letter-lock");

    const finish = () => {
      state = "open";
      root.classList.remove("is-opening");
      root.classList.add("is-letter-open");
      openButton.disabled = false;
      closeButton.focus({ preventScroll: true });
      setStatus(loaded ? "Letter opened." : "The full message is available on the Message page.");
    };

    if (reduce || !window.gsap) {
      requestAnimationFrame(finish);
      return;
    }

    try {
      timeline?.kill?.();
      timeline = window.gsap.timeline({ onComplete: finish });
      timeline
        .to(root.querySelector(".envelope-seal"), { scale: 0.94, duration: 0.18, ease: "power1.out" })
        .to(root.querySelector(".envelope-flap"), { rotateX: -178, duration: 0.72, transformOrigin: "50% 100%", ease: "power2.inOut" })
        .to(root.querySelector(".envelope-letter"), { y: -48, duration: 0.72, ease: "power2.out" }, "-=0.28")
        .to(root.querySelector(".envelope-seal"), { opacity: 0, duration: 0.2 }, "-=0.3")
        .to(root.querySelector(".envelope-visual"), { opacity: 0.25, duration: 0.25 }, "-=0.2")
        .to(letterDialog, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.05");
    } catch (_) {
      finish();
    }
  };

  openButton.addEventListener("click", open);
  closeButton.addEventListener("click", close);

  document.addEventListener("keydown", (event) => {
    if (state === "closed") return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  root.addEventListener("click", (event) => {
    if (state === "open" && event.target === root.querySelector(".letter-backdrop")) close();
  });

  window.KhushiEnvelopeLetter = Object.freeze({ open, close, getState: () => state });
})();
