(function configureSelectUi(global) {
  let sequence = 0;
  let opened = null;

  function close(control, restoreFocus = false) {
    if (!control) return;
    if (control.portaled) {
      control.portalHost?.classList.remove("has-portaled-select");
      control.list.classList.remove("is-portaled");
      control.list.removeAttribute("style");
      control.wrapper.append(control.list);
      control.portaled = false;
      control.portalHost = null;
    }
    control.wrapper.classList.remove("is-open");
    control.trigger.setAttribute("aria-expanded", "false");
    if (opened === control) opened = null;
    if (restoreFocus) control.trigger.focus();
  }

  function sync(control) {
    const selected = control.select.selectedOptions[0];
    control.trigger.textContent = selected ? selected.textContent : "Selecciona una opción";
    control.trigger.disabled = control.select.disabled;
    control.trigger.classList.toggle("has-placeholder", !control.select.value);

    [...control.list.children].forEach((option, index) => {
      const source = control.select.options[index];
      if (!source) return;
      option.textContent = source.textContent;
      option.hidden = source.hidden;
      option.disabled = source.disabled;
      option.setAttribute("aria-selected", String(source.selected));
      option.classList.toggle("is-selected", source.selected);
    });
  }

  function rebuild(control) {
    control.list.replaceChildren();
    [...control.select.options].forEach((source, index) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "custom-select__option";
      option.setAttribute("role", "option");
      option.dataset.index = String(index);
      option.addEventListener("click", () => {
        if (source.disabled) return;
        control.select.selectedIndex = index;
        control.select.dispatchEvent(new Event("change", { bubbles: true }));
        sync(control);
        close(control, true);
      });
      control.list.append(option);
    });
    sync(control);
  }

  function open(control) {
    if (control.trigger.disabled) return;
    if (opened && opened !== control) close(opened);
    rebuild(control);
    const dialog = control.select.closest("dialog");
    if (dialog) {
      const rect = control.trigger.getBoundingClientRect();
      const availableBelow = global.innerHeight - rect.bottom;
      const estimatedHeight = Math.min(280, (control.select.options.length * 40) + 12);
      const openAbove = availableBelow < estimatedHeight + 12 && rect.top > availableBelow;
      control.portaled = true;
      control.portalHost = dialog;
      dialog.classList.add("has-portaled-select");
      dialog.append(control.list);
      control.list.classList.add("is-portaled");
      control.list.style.left = `${rect.left}px`;
      control.list.style.width = `${rect.width}px`;
      control.list.style.top = openAbove ? "auto" : `${rect.bottom + 6}px`;
      control.list.style.bottom = openAbove ? `${global.innerHeight - rect.top + 6}px` : "auto";
    }
    control.wrapper.classList.add("is-open");
    control.trigger.setAttribute("aria-expanded", "true");
    opened = control;
  }

  function enhance(select) {
    if (select.dataset.customSelect === "true" || select.dataset.nativeSelect === "true" || select.multiple || select.size > 1) return;
    select.dataset.customSelect = "true";

    const wrapper = document.createElement("div");
    const trigger = document.createElement("button");
    const list = document.createElement("div");
    const listId = `custom-select-options-${++sequence}`;
    wrapper.className = "custom-select";
    trigger.type = "button";
    trigger.className = "custom-select__trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", listId);
    list.className = "custom-select__options";
    list.id = listId;
    list.setAttribute("role", "listbox");

    select.before(wrapper);
    wrapper.append(select, trigger, list);
    const control = { select, wrapper, trigger, list };
    select._customSelectControl = control;

    trigger.addEventListener("click", () => {
      if (wrapper.classList.contains("is-open")) close(control);
      else open(control);
    });
    trigger.addEventListener("keydown", (event) => {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key) && !wrapper.classList.contains("is-open")) {
        event.preventDefault();
        open(control);
        const options = [...list.querySelectorAll(".custom-select__option:not([disabled])")];
        (options.find((option) => option.classList.contains("is-selected")) || options[0])?.focus();
      } else if (event.key === "Escape") {
        close(control);
      }
    });
    list.addEventListener("keydown", (event) => {
      const options = [...list.querySelectorAll(".custom-select__option:not([disabled])")];
      const current = options.indexOf(document.activeElement);
      if (event.key === "Escape") {
        event.preventDefault();
        close(control, true);
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        options[(current + step + options.length) % options.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        options[event.key === "Home" ? 0 : options.length - 1]?.focus();
      }
    });
    select.addEventListener("change", () => sync(control));
    select.addEventListener("focus", () => {
      sync(control);
      trigger.focus();
    });

    new MutationObserver(() => rebuild(control)).observe(select, { childList: true, subtree: true, attributes: true });
    rebuild(control);
  }

  function enhanceWithin(root = document) {
    if (root.matches?.("select")) enhance(root);
    root.querySelectorAll?.("select").forEach(enhance);
  }

  document.addEventListener("pointerdown", (event) => {
    if (opened && !opened.wrapper.contains(event.target) && !opened.list.contains(event.target)) close(opened);
  });
  document.addEventListener("click", () => queueMicrotask(() => {
    document.querySelectorAll("select[data-custom-select='true']").forEach((select) => sync(select._customSelectControl));
  }));

  const observer = new MutationObserver((changes) => {
    changes.forEach((change) => change.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) enhanceWithin(node);
    }));
  });
  enhanceWithin();
  observer.observe(document.body, { childList: true, subtree: true });
  global.SELECT_UI = Object.freeze({ enhanceWithin });
})(window);
