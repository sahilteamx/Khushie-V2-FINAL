(() => {
  "use strict";

  const root = document.body;
  const hero = document.querySelector("#hero");
  const loader = document.querySelector("#siteLoader");
  const skip = document.querySelector("#skipIntro");
  const treeShell = document.querySelector(".hero-tree-shell");
  const tree = document.querySelector(".home-tree");

  if (!root || !hero || !treeShell || !tree) return;

  const reducedQuery = window.KHUSHI_CONFIG?.reducedMotionQuery || "(prefers-reduced-motion: reduce)";
  const reducedMotion = window.matchMedia?.(reducedQuery)?.matches ?? false;
  const gsap = window.gsap;

  let started = false;
  let finished = false;
  let timeline = null;
  let loaderObserver = null;
  let finishTimer = null;

  const qsa = (selector) => Array.from(tree.querySelectorAll(selector));

  const paths = qsa(".tree-roots path, .tree-trunk path, .tree-branches path");
  const leaves = qsa(".tree-leaves");
  const flowers = qsa(".tree-flower");
  const petals = qsa(".tree-petals path");
  const sweep = tree.querySelector(".tree-light-sweep");
  const ground = tree.querySelector(".tree-ground");
  const aura = tree.querySelector(".tree-aura");
  const heroCopy = Array.from(hero.querySelectorAll(".hero-copy > *"));
  const eyebrow = hero.querySelector(".hero-copy .eyebrow");
  const heroActions = hero.querySelector(".hero-actions");
  const title = hero.querySelector(".hero-title");
  const subtitle = hero.querySelector(".hero-subtitle");
  const personal = hero.querySelector(".personal-placeholder");
  const scrollIndicator = hero.querySelector(".scroll-indicator");
  const monogram = hero.querySelector(".hero-monogram");

  function finalVisualState() {
    paths.forEach((path) => {
      const length = path.getTotalLength ? path.getTotalLength() : 1;
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = "0";
      path.style.opacity = "1";
    });

    leaves.forEach((leaf, index) => {
      leaf.style.opacity = "1";
      leaf.style.transformOrigin = "center";
      leaf.style.transform = `translateY(0) rotate(${index % 2 ? 1.5 : -1.5}deg) scale(1)`;
    });

    flowers.forEach((flower) => {
      flower.style.opacity = "1";
      flower.style.transformOrigin = "center";
      flower.style.transform = "scale(1)";
    });

    petals.forEach((petal) => {
      petal.style.opacity = "0";
    });

    if (ground) ground.style.opacity = "1";
    if (aura) aura.style.opacity = ".68";
    if (sweep) sweep.style.opacity = "0";

    if (gsap) {
      gsap.set(heroCopy, { clearProps: "opacity,transform" });
      gsap.set(scrollIndicator, { clearProps: "opacity,transform" });
    } else {
      heroCopy.forEach((element) => {
        element.style.opacity = "1";
        element.style.transform = "none";
      });
      if (scrollIndicator) scrollIndicator.style.opacity = "1";
    }

    hero.classList.remove("is-cinematic-prep", "is-tree-active");
    hero.classList.add("is-cinematic-complete");
    treeShell.dataset.treeStage = "complete";
    finished = true;
  }

  function setInitialTreeState() {
    paths.forEach((path) => {
      const length = path.getTotalLength ? path.getTotalLength() : 1;
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      path.style.opacity = "0";
    });

    leaves.forEach((leaf) => {
      leaf.style.opacity = "0";
      leaf.style.transformOrigin = "center";
      leaf.style.transform = "scale(.42)";
    });

    flowers.forEach((flower) => {
      flower.style.opacity = "0";
      flower.style.transformOrigin = "center";
      flower.style.transform = "scale(.25)";
    });

    petals.forEach((petal) => {
      petal.style.opacity = "0";
      petal.style.transform = "translate3d(0,0,0) rotate(0deg) scale(.8)";
    });

    if (ground) ground.style.opacity = ".35";
    if (aura) aura.style.opacity = ".12";
    if (sweep) sweep.style.opacity = "0";

    hero.classList.add("is-cinematic-prep");
    treeShell.dataset.treeStage = "ready";
  }

  function revealHeroInstant() {
    if (finished) return;
    if (timeline) {
      timeline.kill();
      timeline = null;
    }
    finalVisualState();
  }

  function revealHeroWithGsap() {
    if (!gsap) {
      window.setTimeout(revealHeroInstant, 140);
      return;
    }

    hero.classList.remove("is-cinematic-prep");
    hero.classList.add("is-tree-active");
    treeShell.dataset.treeStage = "growing";

    timeline = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        hero.classList.remove("is-tree-active");
        hero.classList.add("is-cinematic-complete");
        treeShell.dataset.treeStage = "complete";
        finished = true;
      }
    });

    if (aura) timeline.to(aura, { opacity: 0.46, duration: 0.7, ease: "power2.out" }, 0);
    if (ground) timeline.to(ground, { opacity: 0.78, duration: 0.8 }, 0.05);

    timeline.to(paths, {
      strokeDashoffset: 0,
      opacity: 1,
      duration: 1.55,
      stagger: { each: 0.055, from: "start" },
      ease: "power2.inOut"
    }, 0.35);

    timeline.to(leaves, {
      opacity: 1,
      scale: 1,
      duration: 0.85,
      stagger: { each: 0.085, from: "edges" },
      ease: "back.out(1.5)"
    }, 1.85);

    timeline.to(flowers, {
      opacity: 1,
      scale: 1,
      duration: 0.7,
      stagger: { each: 0.095, from: "random" },
      ease: "back.out(1.7)"
    }, 2.78);

    timeline.to(aura, { opacity: 0.72, duration: 0.75, ease: "sine.inOut" }, 3.15);

    timeline.set(petals, { opacity: 0.84 }, 3.48);
    timeline.to(petals, {
      x: (index) => [42, -52, 66, -30, 50, -62, 34, -44][index] || 24,
      y: (index) => [-95, -72, -128, -84, -112, -78, -105, -90][index] || -86,
      rotation: (index) => [26, -22, 38, -34, 28, -26, 32, -30][index] || 20,
      scale: (index) => [0.72, 0.82, 0.64, 0.78, 0.72, 0.84, 0.68, 0.8][index] || 0.75,
      duration: (index) => [2.3, 2.5, 2.15, 2.6, 2.35, 2.55, 2.45, 2.3][index] || 2.4,
      stagger: 0.13,
      ease: "power1.out"
    }, 3.5);

    if (sweep) {
      timeline.fromTo(
        sweep,
        { opacity: 0, strokeDasharray: 920, strokeDashoffset: 920 },
        { opacity: 0.7, strokeDashoffset: 0, duration: 0.72, ease: "power2.inOut" },
        4.45
      );
      timeline.to(sweep, { opacity: 0, duration: 0.3 }, 5.08);
    }

    if (monogram) {
      timeline.to(monogram, { autoAlpha: 0.025, duration: 0.7 }, 4.6);
    }

    // The emotional reveal comes after growth rather than before it.
    if (eyebrow) timeline.fromTo(eyebrow, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 4.8);
    if (title) timeline.fromTo(title, { autoAlpha: 0, y: 24, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.72, ease: "power3.out" }, 5.02);
    if (subtitle) timeline.fromTo(subtitle, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55 }, 5.5);
    if (personal) timeline.fromTo(personal, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 5.78);
    if (heroActions) timeline.fromTo(heroActions, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, 6.02);
    if (scrollIndicator) timeline.fromTo(scrollIndicator, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45 }, 6.5);

    timeline.to(hero.querySelector(".hero-glow"), {
      opacity: 0.54,
      scale: 1.03,
      duration: 1.2,
      ease: "sine.inOut"
    }, 4.9);
  }

  function start() {
    if (started || finished) return;
    started = true;

    if (reducedMotion) {
      finalVisualState();
      return;
    }

    if (!gsap) {
      window.setTimeout(revealHeroInstant, 180);
      return;
    }

    revealHeroWithGsap();
  }

  function finishNow() {
    if (!started) started = true;
    revealHeroInstant();
  }

  function loaderIsGone() {
    return !loader || loader.classList.contains("is-hidden") || !loader.isConnected || !root.classList.contains("is-loading");
  }

  function watchLoader() {
    if (loaderIsGone()) {
      window.setTimeout(start, 50);
      return;
    }

    if (!loader) {
      window.setTimeout(start, 50);
      return;
    }

    loaderObserver = new MutationObserver(() => {
      if (loaderIsGone()) {
        loaderObserver?.disconnect();
        loaderObserver = null;
        window.setTimeout(start, 80);
      }
    });

    loaderObserver.observe(loader, { attributes: true, attributeFilter: ["class"] });

    // This is only an initialization fallback. The existing global loader
    // remains the single source of truth for the page-loading lifecycle.
    window.setTimeout(() => {
      if (!started && loaderIsGone()) start();
    }, 1900);
  }

  function bindSkip() {
    if (!skip) return;
    skip.addEventListener("click", () => {
      // main.js owns the loader. This handler only resolves the homepage
      // scene so the user never lands in a half-grown tree.
      finishNow();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !finished && !loaderIsGone()) {
        event.preventDefault();
        finishNow();
        skip.click();
      }
    });
  }

  function initialize() {
    setInitialTreeState();
    bindSkip();

    // Keep the existing page reveal and the tree reveal as one continuous
    // experience without modifying main.js's loader engine.
    watchLoader();

    // If a browser has reduced motion set after load, resolve cleanly.
    const motionQuery = window.matchMedia?.(reducedQuery);
    motionQuery?.addEventListener?.("change", (event) => {
      if (event.matches && !finished) finishNow();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.KhushiHomeCinematic = Object.freeze({
    skip: finishNow,
    play: start,
    isComplete: () => finished
  });
})();
