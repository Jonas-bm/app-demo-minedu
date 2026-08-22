(function configureProfileModule(global) {
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
    const details = document.createElement("dl");
    section.className = "profile-view";
    heading.className = "profile-view__heading";
    title.textContent = "Información de la cuenta";
    description.textContent = "Datos de la sesión activa de demostración.";
    details.className = "profile-view__details";
    [["Nombre", session.nombre], ["Usuario", session.usuario], ["Rol activo", session.rol], ["Tipo de acceso", "Cuenta local de demostración"]].forEach(([label, value]) => {
      const item = document.createElement("div");
      const term = document.createElement("dt");
      const definition = document.createElement("dd");
      term.textContent = label;
      definition.textContent = value || "No disponible";
      item.append(term, definition);
      details.append(item);
    });
    heading.append(title, description);
    section.append(heading, details);
    container.replaceChildren(section);
  }

  global.PROFILE_MODULE = Object.freeze({ render });
})(window);
