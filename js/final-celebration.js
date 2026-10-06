(() => {
  "use strict";

  const entry = document.getElementById("finalCelebrationEntry");
  const openButton = document.getElementById("openFinalCelebration");
  const overlay = document.getElementById("finalCelebration");
  const phone = document.getElementById("finalPhone");
  const sleep = document.getElementById("finalPhoneSleep");
  const active = document.getElementById("finalPhoneActive");
  const messagePanel = document.getElementById("finalPhoneMessage");
  const wakeButton = document.getElementById("activateFinalPhone");
  const openMessageButton = document.getElementById("openFinalMessage");
  const closeMessageButton = document.getElementById("closeFinalMessage");
  const backToPhoneButton = document.getElementById("backToPhone");
  const closeButton = document.getElementById("closeFinalCelebration");
  const replayButton = document.getElementById("finalCelebrationContinue");
  const status = document.getElementById("finalCelebrationStatus");
  const letter = document.getElementById("finalPhoneLetter");
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const P = window.KhushiProgress;

  if (!entry || !overlay || !phone || !letter) return;

  let state = "SCREEN_SLEEP";
  let lastFocused = null;
  let timeline = null;
  let timers = new Set();
  let messageLoaded = false;
  let open = false;

  const setTimer = (fn, ms) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

  const clearTimers = () => {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  };

  const qsFocusable = () => [...overlay.querySelectorAll("button, a[href], [tabindex]:not([tabindex='-1'])")]
    .filter((el) => el instanceof HTMLElement && !el.disabled && !el.hidden && el.offsetParent !== null);

  const focusTrap = (event) => {
    if (!open || event.key !== "Tab") return;
    const focusables = qsFocusable();
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const setHidden = (el, hidden) => {
    if (!el) return;
    el.hidden = hidden;
  };

  const setState = (next) => {
    state = next;
    overlay.dataset.finalState = next;
    overlay.classList.toggle("is-message-open", next === "MESSAGE_OPEN");
    overlay.classList.toggle("is-complete", next === "FINAL_STATE");
  };

  const updateStatus = (text) => {
    if (status) status.textContent = text;
  };

  const renderStaticFinalState = () => {
    clearTimers();
    timeline?.kill?.();
    timeline = null;
    phone.classList.add("is-visible");
    setHidden(sleep, true);
    setHidden(active, false);
    setHidden(messagePanel, true);
    setHidden(wakeButton, true);
    setHidden(replayButton, false);
    setState("SCREEN_ACTIVE");
    updateStatus("The final reveal is ready. Open the message when you are ready.");
  };

  const extractFinalMessage = async () => {
    if (messageLoaded) return true;
    try {
      const response = await fetch("message.html", { credentials: "same-origin" });
      if (!response.ok) throw new Error(`message.html returned ${response.status}`);
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, "text/html");
      const body = doc.querySelector(".personal-message");
      if (!body) throw new Error("Personal message source not found");
      const children = [...body.children];
      const markerIndex = children.findIndex((child) => /One Last Thing/i.test(child.textContent || ""));
      if (markerIndex < 0) throw new Error("Final message marker not found");

      const fragment = document.createDocumentFragment();
      children.slice(markerIndex).forEach((child) => fragment.appendChild(child.cloneNode(true)));
      const signature = doc.querySelector(".message-signature");
      letter.replaceChildren(fragment);
      if (signature) letter.appendChild(signature.cloneNode(true));
      messageLoaded = true;
      return true;
    } catch (error) {
      letter.innerHTML = '<p><strong>One Last Thing…</strong></p><p>The final message is waiting on the full message page.</p><p><a href="message.html">Read the full message ↗</a></p>';
      messageLoaded = false;
      return false;
    }
  };

  const showMessage = async () => {
    if (!open) return;
    setState("MESSAGE_OPEN");
    overlay.classList.remove("is-complete");
    updateStatus("The final message is opening.");
    const loaded = await extractFinalMessage();
    setHidden(sleep, true);
    setHidden(active, true);
    setHidden(messagePanel, false);
    setHidden(wakeButton, true);
    setHidden(replayButton, false);
    overlay.classList.add("is-complete");
    updateStatus(loaded ? "The final message is open. The birthday experience has reached its final reveal." : "The final message is ready on the full message page.");
    if (P) {
      P.visit("final-phone-reveal");
      if (loaded) {
        P.addAchievement("final-phone-reveal");
        P.addAchievement("final-celebration-complete");
        P.visit("final-celebration-complete");
      }
    }
    requestAnimationFrame(() => {
      (closeMessageButton || letter).focus();
    });
  };

  const showActiveScreen = () => {
    if (!open) return;
    setState("SCREEN_ACTIVE");
    setHidden(sleep, true);
    setHidden(active, false);
    setHidden(messagePanel, true);
    setHidden(wakeButton, true);
    updateStatus("A final little message has arrived on the screen.");
    requestAnimationFrame(() => openMessageButton?.focus());
  };

  const animateOpen = () => {
    clearTimers();
    timeline?.kill?.();
    timeline = null;
    phone.classList.remove("is-visible");
    setHidden(sleep, false);
    setHidden(active, true);
    setHidden(messagePanel, true);
    setHidden(wakeButton, false);
    setHidden(replayButton, true);
    setState("SCREEN_SLEEP");
    updateStatus("The celebration is settling. The final device is waking.");

    if (reduced || typeof window.gsap === "undefined") {
      renderStaticFinalState();
      return;
    }

    timeline = window.gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .to(phone, { opacity: 1, y: 0, scale: 1, duration: .95 })
      .to(sleep, { opacity: .2, duration: .35 }, "-=.15")
      .to(sleep, { opacity: 1, duration: .25 })
      .add(() => showActiveScreen())
      .eventCallback("onComplete", () => { timeline = null; });
  };

  const reset = () => {
    clearTimers();
    timeline?.kill?.();
    timeline = null;
    phone.classList.remove("is-visible");
    setHidden(sleep, false);
    setHidden(active, true);
    setHidden(messagePanel, true);
    setHidden(wakeButton, false);
    setHidden(replayButton, true);
    overlay.classList.remove("is-message-open", "is-complete");
    setState("SCREEN_SLEEP");
    updateStatus("The celebration is settling into one last reveal.");
  };

  const openOverlay = () => {
    if (open) return;
    open = true;
    lastFocused = document.activeElement;
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("nav-open");
    entry.hidden = false;
    reset();
    requestAnimationFrame(animateOpen);
    setTimer(() => {
      if (state === "SCREEN_SLEEP") showActiveScreen();
    }, reduced ? 10 : 1250);
    setTimer(() => {
      const target = state === "SCREEN_ACTIVE" ? openMessageButton : wakeButton;
      target?.focus();
    }, reduced ? 60 : 950);
  };

  const closeOverlay = () => {
    if (!open) return;
    open = false;
    clearTimers();
    timeline?.kill?.();
    timeline = null;
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("nav-open");
    overlay.classList.remove("is-message-open", "is-complete");
    reset();
    if (lastFocused instanceof HTMLElement) lastFocused.focus();
  };

  openButton?.addEventListener("click", openOverlay);
  closeButton?.addEventListener("click", closeOverlay);
  wakeButton?.addEventListener("click", showActiveScreen);
  openMessageButton?.addEventListener("click", showMessage);
  closeMessageButton?.addEventListener("click", showActiveScreen);
  backToPhoneButton?.addEventListener("click", showActiveScreen);
  replayButton?.addEventListener("click", () => {
    reset();
    requestAnimationFrame(animateOpen);
  });

  document.addEventListener("khushi:cake-complete", () => {
    entry.hidden = false;
  });
  document.addEventListener("khushi:cake-reset", () => {
    entry.hidden = true;
    if (open) closeOverlay();
  });

  document.addEventListener("keydown", (event) => {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (state === "MESSAGE_OPEN") showActiveScreen();
      else closeOverlay();
      return;
    }
    focusTrap(event);
  });

  // Static fallback: the existing cake page still exposes its original
  // "Continue to the final message" link even when JavaScript is unavailable.
  const cakeAlreadyComplete = Boolean(P?.get?.().cakeCompleted);
  entry.hidden = !cakeAlreadyComplete;
})();
