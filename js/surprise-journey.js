(() => {
  "use strict";

  const root = document.getElementById("surpriseRevealContent");
  const hub = document.getElementById("surpriseHub");
  const personal = document.getElementById("surprisePersonalMoment");
  if (!root || !hub || !personal) return;

  const P = window.KhushiProgress;
  const openPersonal = document.getElementById("openPersonalMoment");
  const closePersonal = document.getElementById("closePersonalMoment");
  const progressText = document.getElementById("surpriseJourneyProgress");
  const progressBar = document.getElementById("surpriseJourneyProgressBar");
  const progressStatus = document.getElementById("surpriseJourneyStatus");
  const completion = document.getElementById("surpriseJourneyCompletion");
  const mysteryCard = hub.querySelector('[data-surprise-card="mystery"]');
  const personalCard = hub.querySelector('[data-surprise-card="personal"]');
  const playfulCard = hub.querySelector('[data-surprise-card="playful"]');
  const celebrationCard = hub.querySelector('[data-surprise-card="celebration"]');
  const personalRevealTargets = [
    document.getElementById("surpriseKicker"),
    document.getElementById("surpriseTitle"),
    document.querySelector("#surprisePersonalMoment .surprise-photo-frame"),
    document.getElementById("surpriseMessage"),
    document.querySelector("#surprisePersonalMoment .surprise-actions")
  ].filter(Boolean);

  const IDS = { mystery: "surprise-mystery-gifts", personal: "surprise-personal-reveal", playful: "surprise-fun-zone", celebration: "surprise-cake-entry" };
  const required = ["mystery", "personal", "playful"];
  let personalOpen = false;
  let lastPersonalFocus = null;

  function completed(id) {
    if (!P) return false;
    return P.get().visits.includes(IDS[id]);
  }

  function mark(id) {
    if (P) P.visit(IDS[id]);
    render();
  }

  function render() {
    const count = required.filter(completed).length;
    const status = count === 0 ? "Nothing opened yet." : count < 3 ? "A few more little moments are waiting." : "Everything in the core journey has been discovered.";
    if (progressText) progressText.textContent = `${count} / ${required.length}`;
    if (progressBar) progressBar.style.width = `${count / required.length * 100}%`;
    if (progressStatus) progressStatus.textContent = status;

    const cards = { mystery: mysteryCard, personal: personalCard, playful: playfulCard, celebration: celebrationCard };
    Object.entries(cards).forEach(([key, card]) => {
      if (!card) return;
      const done = completed(key);
      card.classList.toggle("is-complete", done);
      const state = card.querySelector(`[data-journey-state="${key}"]`);
      if (state) state.textContent = done ? (key === "celebration" ? "Visited" : "Discovered") : "Available";
    });

    if (completion) completion.hidden = count < required.length;
    if (count === required.length && P && !P.get().achievements.includes("surprise-journey")) {
      P.addAchievement("surprise-journey");
    }
  }

  function preparePersonal() {
    personalRevealTargets.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px) scale(.985)";
    });
    const photo = document.getElementById("surprisePhoto");
    const frame = document.querySelector("#surprisePersonalMoment .surprise-photo-frame");
    if (photo && !photo.src && photo.dataset.src) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { photo.src = img.src; frame?.classList.add("has-image"); };
      img.src = photo.dataset.src;
    } else {
      frame?.classList.add("has-image");
    }
  }

  function showPersonal() {
    if (personalOpen) return;
    personalOpen = true;
    lastPersonalFocus = document.activeElement instanceof HTMLElement ? document.activeElement : openPersonal;
    mark("personal");
    preparePersonal();
    hub.hidden = true;
    personal.hidden = false;
    personal.classList.add("is-opening");

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduced || typeof window.gsap === "undefined") {
      personalRevealTargets.forEach((el) => { el.style.opacity = "1"; el.style.transform = "none"; });
      window.setTimeout(() => closePersonal?.focus(), 20);
      return;
    }

    window.gsap.timeline({ defaults: { ease: "power3.out" } })
      .to(personalRevealTargets[0], { opacity: 1, y: 0, duration: .26 })
      .to(personalRevealTargets[1], { opacity: 1, y: 0, duration: .5 }, "-.08")
      .to(personalRevealTargets[2], { opacity: 1, y: 0, scale: 1, duration: .62 }, "-.08")
      .to(personalRevealTargets[3], { opacity: 1, y: 0, duration: .42 }, "-.08")
      .to(personalRevealTargets[4], { opacity: 1, y: 0, duration: .3 }, "-.06")
      .eventCallback("onComplete", () => closePersonal?.focus());
  }

  function hidePersonal() {
    if (!personalOpen) return;
    personalOpen = false;
    personal.classList.remove("is-opening");
    personal.hidden = true;
    hub.hidden = false;
    render();
    if (lastPersonalFocus instanceof HTMLElement) lastPersonalFocus.focus();
    else openPersonal?.focus();
  }

  openPersonal?.addEventListener("click", showPersonal);
  closePersonal?.addEventListener("click", hidePersonal);

  hub.querySelectorAll("[data-journey-action]").forEach((control) => {
    const kind = control.dataset.journeyAction;
    if (kind === "personal") return;
    control.addEventListener("click", () => {
      if (IDS[kind]) mark(kind);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!personalOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      hidePersonal();
    }
  });

  document.addEventListener("khushi:surprise-content", () => {
    personalOpen = false;
    personal.hidden = true;
    hub.hidden = false;
    render();
  });

  document.addEventListener("khushi:surprise-close", () => {
    personalOpen = false;
    personal.hidden = true;
    hub.hidden = false;
    personalRevealTargets.forEach((el) => { el.style.opacity = "0"; el.style.transform = "translateY(16px) scale(.985)"; });
  });

  render();
})();
