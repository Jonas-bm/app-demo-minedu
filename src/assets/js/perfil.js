(function configureProfileModule(global) {
  const maxPhotoBytes = 2 * 1024 * 1024;

  function photoKey(session) {
    return `demoProfilePhoto:${session.usuario}`;
  }

  function initials(name) {
    return String(name || "Usuario").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  }

  function render(container) {
    const session = JSON.parse(sessionStorage.getItem("demoSession") || "null");
    if (!session) {
      container.innerHTML = '<div class="atet-state atet-state--error" role="alert"><strong>No pudimos cargar el perfil.</strong><span>La sesión ya no está disponible.</span></div>';
      return;
    }

    const section = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h3");
    const description = document.createElement("p");
    const profileGrid = document.createElement("div");
    const photoPanel = document.createElement("section");
    const photoTitle = document.createElement("h4");
    const avatar = document.createElement("div");
    const image = document.createElement("img");
    const fallback = document.createElement("span");
    const photoActions = document.createElement("div");
    const inputLabel = document.createElement("label");
    const input = document.createElement("input");
    const remove = document.createElement("button");
    const hint = document.createElement("p");
    const status = document.createElement("p");
    const accountPanel = document.createElement("section");
    const accountTitle = document.createElement("h4");
    const details = document.createElement("dl");

    section.className = "profile-view";
    heading.className = "profile-view__heading";
    title.textContent = "Mi perfil";
    description.textContent = "Consulta tus datos y personaliza la foto de tu cuenta de demostración.";
    profileGrid.className = "profile-view__grid";
    photoPanel.className = "profile-photo";
    photoTitle.textContent = "Foto de perfil";
    avatar.className = "profile-photo__avatar";
    image.alt = `Foto de perfil de ${session.nombre}`;
    fallback.textContent = initials(session.nombre);
    photoActions.className = "profile-photo__actions";
    inputLabel.className = "registration-action registration-action--primary profile-photo__upload";
    inputLabel.textContent = "Cambiar foto";
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.setAttribute("aria-label", "Seleccionar una nueva foto de perfil");
    inputLabel.append(input);
    remove.className = "registration-action registration-action--secondary";
    remove.type = "button";
    remove.textContent = "Eliminar foto";
    hint.className = "profile-photo__hint";
    hint.textContent = "JPG, PNG o WebP, hasta 2 MB. La foto se guarda únicamente en este navegador.";
    status.className = "profile-photo__status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    accountPanel.className = "profile-account";
    accountTitle.textContent = "Información de la cuenta";
    details.className = "profile-view__details";

    function applyPhoto(value) {
      const hasPhoto = Boolean(value);
      image.hidden = !hasPhoto;
      fallback.hidden = hasPhoto;
      remove.hidden = !hasPhoto;
      if (hasPhoto) image.src = value;
      else image.removeAttribute("src");
      global.dispatchEvent(new CustomEvent("demo-profile-photo-change", { detail: { usuario: session.usuario, photo: value || "" } }));
    }

    [["Nombre", session.nombre], ["Usuario", session.usuario], ["Rol activo", session.rol], ["Tipo de acceso", "Cuenta local de demostración"]].forEach(([label, value]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = label;
      definition.textContent = value || "No disponible";
      item.append(term, definition);
      details.append(item);
    });

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      status.textContent = "";
      if (!file) return;
      if (!input.accept.split(",").includes(file.type)) {
        status.textContent = "Selecciona una imagen JPG, PNG o WebP.";
        input.value = "";
        return;
      }
      if (file.size > maxPhotoBytes) {
        status.textContent = "La imagen supera el límite de 2 MB.";
        input.value = "";
        return;
      }
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        try {
          localStorage.setItem(photoKey(session), reader.result);
          applyPhoto(reader.result);
          status.textContent = "La foto de perfil se actualizó correctamente.";
        } catch (error) {
          console.warn("No se pudo guardar la foto demo.", error);
          status.textContent = "No hay espacio suficiente en el navegador para guardar esta foto.";
        }
        input.value = "";
      });
      reader.addEventListener("error", () => { status.textContent = "No se pudo leer la imagen seleccionada."; });
      reader.readAsDataURL(file);
    });

    remove.addEventListener("click", () => {
      if (!global.confirm("¿Deseas eliminar tu foto de perfil de esta demo?")) return;
      localStorage.removeItem(photoKey(session));
      applyPhoto("");
      status.textContent = "La foto se eliminó; volvimos a mostrar tus iniciales.";
    });

    heading.append(title, description);
    avatar.append(image, fallback);
    photoActions.append(inputLabel, remove);
    photoPanel.append(photoTitle, avatar, photoActions, hint, status);
    accountPanel.append(accountTitle, details);
    profileGrid.append(photoPanel, accountPanel);
    section.append(heading, profileGrid);
    container.replaceChildren(section);
    applyPhoto(localStorage.getItem(photoKey(session)) || "");
  }

  global.PROFILE_MODULE = Object.freeze({ render });
})(window);
