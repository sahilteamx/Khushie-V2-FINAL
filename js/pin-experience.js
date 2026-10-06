(() => {
  "use strict";

  const PIN = "1810";
  const $ = (selector, root = document) => root.querySelector(selector);

  function create(root, options = {}) {
    if (!root) return null;

    const dots = [...root.querySelectorAll(".birthday-pin__dot")];
    const status = $(".birthday-pin__status", root);
    const keypad = $(".birthday-pin__keypad", root);
    const fallback = $(".birthday-pin__fallback", root);

    let value = "";
    let locked = false;
    let complete = false;
    let initialized = false;

    const announce = (text, state = "") => {
      if (!status) return;
      status.textContent = text;
      if (state) status.dataset.state = state;
      else delete status.dataset.state;
    };

    const updateDots = (success = false) => {
      dots.forEach((dot, index) => {
        dot.classList.toggle("is-filled", index < value.length);
        dot.classList.toggle("is-success", success && index < value.length);
      });

      root.setAttribute(
        "aria-label",
        `Birthday PIN, ${value.length} of ${PIN.length} digits entered`
      );
    };

    const reset = () => {
      value = "";
      locked = false;
      complete = false;
      root.classList.remove("is-error");
      updateDots(false);
      announce("Enter the four-digit birthday PIN.");
    };

    const fail = () => {
      if (locked) return;
      root.classList.remove("is-error");
      void root.offsetWidth;
      root.classList.add("is-error");
      announce("That PIN does not match. Try again.", "error");
      value = "";
      updateDots(false);
      window.setTimeout(() => root.classList.remove("is-error"), 320);
    };

    const succeed = () => {
      locked = true;
      complete = true;
      updateDots(true);
      announce("Birthday PIN accepted.", "success");
      options.onSuccess?.();
    };

    const digit = (char) => {
      if (locked || value.length >= PIN.length) return;
      value += char;
      updateDots(false);
      announce(`${value.length} of ${PIN.length} digits entered.`);
      if (value.length === PIN.length) {
        if (value === PIN) succeed();
        else window.setTimeout(fail, 110);
      }
    };

    const backspace = () => {
      if (locked) return;
      if (value.length) value = value.slice(0, -1);
      updateDots(false);
      announce(`${value.length} of ${PIN.length} digits entered.`);
    };

    const clear = () => {
      if (locked) return;
      value = "";
      updateDots(false);
      announce("PIN cleared. Enter the four-digit birthday PIN.");
    };

    const onKeypadClick = (event) => {
      const button = event.target.closest("button[data-pin-action]");
      if (!button || !keypad.contains(button)) return;
      const action = button.dataset.pinAction || "";
      if (/^\d$/.test(action)) digit(action);
      else if (action === "backspace") backspace();
      else if (action === "clear") clear();
    };

    const onKeydown = (event) => {
      if (!root.classList.contains("is-active")) return;
      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        digit(event.key);
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        backspace();
        return;
      }
      if (event.key === "Enter" && value.length === PIN.length) {
        event.preventDefault();
        if (value === PIN) succeed();
        else fail();
      }
    };

    const open = () => {
      root.classList.add("is-active");
      root.setAttribute("aria-hidden", "false");
      reset();
      window.setTimeout(() => {
        const first = keypad?.querySelector("button[data-pin-action]");
        first?.focus();
      }, 40);
    };

    const close = () => {
      root.classList.remove("is-active");
      root.setAttribute("aria-hidden", "true");
      reset();
    };

    const fallbackMode = () => {
      fallback?.classList.add("is-visible");
      announce("The birthday gate could not load. You can continue to the surprise.", "error");
    };

    keypad?.addEventListener("click", onKeypadClick);
    document.addEventListener("keydown", onKeydown);
    updateDots(false);

    initialized = true;

    return {
      open,
      close,
      reset,
      isComplete: () => complete,
      hasInitialized: () => initialized,
      fallbackMode
    };
  }

  window.KhushiPinExperience = Object.freeze({ create, pinLength: PIN.length });
})();
