(() => {
  "use strict";

  const bridge = document.querySelector("#storyEnvelope");
  const journeyRoot = document.querySelector("#storyChapters");
  if (!bridge || !journeyRoot) return;

  let unlocked = false;

  const reveal = () => {
    if (unlocked) return;
    unlocked = true;
    bridge.classList.remove("is-locked");
    const control = document.querySelector("#envelopeOpen");
    if (control) { control.disabled = false; control.removeAttribute("aria-disabled"); }
    requestAnimationFrame(() => bridge.classList.add("is-unlocked"));
    bridge.setAttribute("aria-hidden", "false");
  };

  window.addEventListener("khushi:story-finale", reveal);

  const finalChapter = journeyRoot.querySelector('.story-chapter:last-child');
  if (finalChapter && finalChapter.classList.contains("is-active")) reveal();
})();
