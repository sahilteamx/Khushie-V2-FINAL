(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const stage = $("#surpriseStage");
  const start = $("#surpriseButton");
  const replay = $("#replaySurprise");
  const exit = $("#surpriseExit");
  if (!stage || !start) return;

  const gate = $("#birthdayPinGate");
  const pinRoot = $("#birthdayPin");
  const pinFallback = $("#birthdayPinFallback");
  const numberStage = $("#birthdayNumberStage");
  const numberValue = $("#birthdayNumberTitle");
  const numberDate = $("#birthdayNumberDate");
  const numberEyebrow = $(".birthday-number-stage__eyebrow", numberStage);
  const numberSweep = $(".birthday-number-stage__sweep", numberStage);
  const numberContinue = $("#birthdayNumberContinue");
  const content = $("#surpriseRevealContent");
  const kicker = $("#surpriseKicker");
  const title = $("#surpriseTitle");
  const frame = $(".surprise-photo-frame");
  const photo = $("#surprisePhoto");
  const message = $("#surpriseMessage");
  const actions = $(".surprise-actions");
  const particles = $("#surpriseParticles");
  const surpriseHub = $("#surpriseHub");
  const reducedQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let reduced = Boolean(reducedQuery?.matches);
  let running = false;
  let lastFocused = null;
  let activeTimeline = null;
  let advanceTimer = null;
  let revealMode = "pin";

  const pinController = window.KhushiPinExperience?.create?.(pinRoot, {
    onSuccess: handlePinSuccess
  });

  function updateReduced(event) {
    reduced = Boolean(event.matches);
  }
  if (reducedQuery?.addEventListener) reducedQuery.addEventListener("change", updateReduced);
  else reducedQuery?.addListener?.(updateReduced);

  function configureBirthdayNumber() {
    const configured = window.KHUSHI_CONFIG?.birthday;
    const target = new Date(configured || "");
    if (Number.isNaN(target.getTime())) return;

    const day = String(target.getDate()).padStart(2, "0");
    const formatter = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "long", year: "numeric" });
    if (numberValue) {
      numberValue.textContent = day;
      numberValue.setAttribute("aria-label", `Birthday date number ${day}`);
    }
    if (numberDate) numberDate.textContent = formatter.format(target);
  }

  function makeParticles() {
    particles?.replaceChildren();
    if (!particles || reduced) return;

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 18; i += 1) {
      const particle = document.createElement("span");
      particle.className = "surprise-particle";
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.transform = `scale(${0.65 + Math.random() * 0.7})`;
      fragment.appendChild(particle);
    }
    particles.appendChild(fragment);
  }

  function burstConfetti() {
    if (reduced) return;

    const fragment = document.createDocumentFragment();
    const pieces = 36;
    for (let i = 0; i < pieces; i += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.setProperty("--confetti-hue", String(Math.floor(Math.random() * 45 + 25)));
      piece.style.setProperty("--confetti-x", `${(Math.random() - 0.5) * 180}px`);
      piece.style.setProperty("--confetti-r", `${Math.random() * 900 - 450}deg`);
      piece.style.animationDelay = `${i * 7}ms`;
      fragment.appendChild(piece);
    }
    document.body.appendChild(fragment);
    window.setTimeout(() => {
      document.querySelectorAll(".confetti-piece").forEach((piece) => piece.remove());
    }, 3200);
  }

  function revealPhoto() {
    return new Promise((resolve) => {
      if (!photo) return resolve(false);
      const src = photo?.dataset.src || "";
      if (!src) return resolve(false);

      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        photo.src = image.src;
        frame?.classList.add("has-image");
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = src;
    });
  }

  function clearTimer() {
    if (advanceTimer) {
      window.clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

  function setPanel(panel, active) {
    if (!panel) return;
    panel.classList.toggle("is-active", active);
    panel.setAttribute("aria-hidden", active ? "false" : "true");
  }

  function resetContentState() {
    [kicker, title, frame, message, actions].forEach((element) => {
      if (!element) return;
      element.style.opacity = "0";
      element.style.transform = "translateY(18px) scale(.98)";
    });
    frame?.classList.remove("has-image");
  }

  function resetNumberState() {
    [numberEyebrow, numberValue, numberDate].forEach((element) => {
      if (!element) return;
      element.style.opacity = "0";
      element.style.transform = element === numberValue ? "scale(.9)" : "translateY(12px)";
    });
    if (numberSweep) {
      numberSweep.style.opacity = "0";
      numberSweep.style.transform = "translateX(-65vw) rotate(-8deg)";
    }
    numberContinue?.classList.remove("is-visible");
    numberStage?.classList.toggle("is-reduced", reduced);
  }

  function close() {
    clearTimer();
    activeTimeline?.kill();
    activeTimeline = null;
    stage.classList.remove("is-active", "is-number-reveal");
    stage.setAttribute("aria-hidden", "true");
    stage.setAttribute("aria-labelledby", "surpriseTitle");
    document.body.classList.remove("nav-open");
    setPanel(gate, false);
    setPanel(numberStage, false);
    stage.setAttribute("aria-labelledby", "surpriseTitle");
    if (content) { content.style.visibility = "hidden"; content.setAttribute("aria-hidden", "true"); }
    pinController?.close?.();
    resetContentState();
    resetNumberState();
    running = false;
    revealMode = "pin";
    document.dispatchEvent(new CustomEvent("khushi:surprise-close"));
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  }

  function trapFocus(event) {
    if (!stage.classList.contains("is-active") || event.key !== "Tab") return;
    const activePanel = gate?.classList.contains("is-active") ? gate :
      numberStage?.classList.contains("is-active") ? numberStage : content;
    const focusable = [exit, ...((activePanel?.querySelectorAll("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || []))]
      .filter((element) => element instanceof HTMLElement && !element.disabled && element.offsetParent !== null);
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
  }

  function showContent() {
    clearTimer();
    stage.setAttribute("aria-labelledby", "surpriseTitle");
    activeTimeline?.kill();
    activeTimeline = null;
    revealMode = "content";
    setPanel(gate, false);
    setPanel(numberStage, false);
    if (content) {
      content.style.visibility = "visible";
      content.setAttribute("aria-hidden", "false");
      content.style.opacity = "1";
      content.style.pointerEvents = "auto";
    }
    stage.classList.remove("is-number-reveal");

    const finishContent = () => {
      [kicker, title, frame, message, actions].forEach((element) => {
        if (!element) return;
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      running = false;
      burstConfetti();
      document.dispatchEvent(new CustomEvent("khushi:surprise-content", { detail: { hub: Boolean(surpriseHub) } }));
      window.setTimeout(() => document.querySelector("#surpriseHub [data-journey-action], #openPersonalMoment")?.focus(), 30);
    };

    revealPhoto().then(() => {
      if (reduced || typeof window.gsap === "undefined") {
        finishContent();
        return;
      }

      activeTimeline = window.gsap.timeline({ defaults: { ease: "power3.out" } });
      activeTimeline
        .to(kicker, { opacity: 1, y: 0, duration: 0.35 })
        .to(title, { opacity: 1, y: 0, duration: 0.62 }, "-=.1")
        .to(frame, { opacity: 1, y: 0, scale: 1, duration: 0.72, ease: "power2.out" }, "-=.14")
        .to(message, { opacity: 1, y: 0, duration: 0.45 }, "-=.10")
        .to(actions, { opacity: 1, y: 0, duration: 0.38 }, "-=.06")
        .add(burstConfetti)
        .eventCallback("onComplete", () => {
          running = false;
          activeTimeline = null;
          document.dispatchEvent(new CustomEvent("khushi:surprise-content", { detail: { hub: Boolean(surpriseHub) } }));
          window.setTimeout(() => document.querySelector("#surpriseHub [data-journey-action], #openPersonalMoment")?.focus(), 30);
        });
    });
  }

  function showNumber() {
    revealMode = "number";
    stage.setAttribute("aria-labelledby", "birthdayNumberTitle");
    stage.classList.add("is-number-reveal");
    setPanel(gate, false);
    setPanel(numberStage, true);
    if (content) {
      content.style.visibility = "hidden";
      content.setAttribute("aria-hidden", "true");
      content.style.opacity = "0";
      content.style.pointerEvents = "none";
    }
    resetNumberState();

    if (reduced || typeof window.gsap === "undefined") {
      [numberEyebrow, numberValue, numberDate].forEach((element) => {
        if (!element) return;
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      numberStage?.classList.add("is-reduced");
      numberContinue?.classList.add("is-visible");
      running = false;
      window.setTimeout(() => numberContinue?.focus(), 30);
      return;
    }

    activeTimeline?.kill();
    activeTimeline = window.gsap.timeline({ defaults: { ease: "power3.out" } });
    activeTimeline
      .to(numberEyebrow, { opacity: 1, y: 0, duration: 0.35 })
      .to(numberValue, { opacity: 1, scale: 1, duration: 1.05, ease: "power2.out" }, "-=.04")
      .to(numberDate, { opacity: 1, y: 0, duration: 0.45 }, "-=.18")
      .to(numberSweep, { opacity: 1, x: "55vw", duration: 1.0, ease: "power1.inOut" }, "-=.45")
      .to(numberContinue, { opacity: 1, duration: 0.3 }, "-=.22")
      .eventCallback("onComplete", () => {
        numberContinue?.classList.add("is-visible");
        activeTimeline = null;
        // Move forward automatically so the original Surprise experience remains
        // the destination; the visible button remains available to skip the wait.
        advanceTimer = window.setTimeout(() => {
          showContent();
        }, 950);
      });
  }

  function handlePinSuccess() {
    if (!stage.classList.contains("is-active") || running) return;
    running = true;
    activeTimeline?.kill();
    activeTimeline = null;

    if (reduced || typeof window.gsap === "undefined") {
      showNumber();
      return;
    }

    activeTimeline = window.gsap.timeline({ defaults: { ease: "power3.inOut" } });
    activeTimeline
      .to(gate, { opacity: 0, duration: 0.55 })
      .add(() => showNumber())
      .eventCallback("onComplete", () => {
        activeTimeline = null;
      });
  }

  function fallbackToContent() {
    if (!stage.classList.contains("is-active")) return;
    showContent();
  }

  function open() {
    if (running) return;
    running = true;
    lastFocused = document.activeElement;
    stage.classList.add("is-active");
    stage.setAttribute("aria-hidden", "false");
    stage.setAttribute("aria-labelledby", "birthdayPinTitle");
    document.body.classList.add("nav-open");
    makeParticles();
    configureBirthdayNumber();
    resetContentState();
    resetNumberState();
    if (content) {
      content.style.visibility = "hidden";
      content.setAttribute("aria-hidden", "true");
      content.style.opacity = "0";
      content.style.pointerEvents = "none";
    }

    if (pinController?.open) {
      setPanel(gate, true);
      setPanel(numberStage, false);
      revealMode = "pin";
      pinController.open();
      running = false;
    } else {
      pinFallback?.classList.add("is-visible");
      setPanel(gate, true);
      setPanel(numberStage, false);
      running = false;
      window.setTimeout(() => pinFallback?.focus(), 40);
    }
  }

  start.addEventListener("click", open);
  replay?.addEventListener("click", open);
  exit?.addEventListener("click", close);
  pinFallback?.addEventListener("click", fallbackToContent);
  numberContinue?.addEventListener("click", showContent);

  stage.addEventListener("click", (event) => {
    if (event.target === stage) close();
  });

  document.addEventListener("keydown", (event) => {
    if (!stage.classList.contains("is-active")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    trapFocus(event);
  });

  if (!pinController) {
    pinFallback?.classList.add("is-visible");
  }

  configureBirthdayNumber();
})();
