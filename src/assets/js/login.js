const form = document.querySelector("#login-form");
const userInput = document.querySelector("#usuario");
const passwordInput = document.querySelector("#contrasena");
const rememberInput = document.querySelector("#recordar");
const message = document.querySelector("#form-message");
const forgotButton = document.querySelector("#forgot-button");
let locallyCreatedUsers = [];
try {
  const savedUsers = JSON.parse(localStorage.getItem("demoAdminUsers") || "[]");
  if (Array.isArray(savedUsers)) {
    locallyCreatedUsers = savedUsers.filter((item) => item.estado === "Activo" && item.contrasenaTemporal).map((item) => ({ usuario: item.usuario, contrasena: item.contrasenaTemporal, nombre: item.nombre, rol: item.rol === "Administrador" && item.usuario !== "admin.demo" ? "Jefe" : item.rol }));
  }
} catch (error) {
  console.warn("Se ignoraron usuarios demo locales inválidos.", error);
}
const baseDemoUsers = Array.isArray(window.DEMO_USERS) ? window.DEMO_USERS : [];
const demoUsers = [...baseDemoUsers, ...locallyCreatedUsers.filter((local) => !baseDemoUsers.some((base) => base.usuario === local.usuario))];

const rememberedUser = localStorage.getItem("demoRememberedUser");

if (rememberedUser) {
  userInput.value = rememberedUser;
  rememberInput.checked = true;
  passwordInput.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  message.textContent = "";

  const usuario = userInput.value.trim();
  const contrasena = passwordInput.value;

  if (!usuario || !contrasena) {
    message.textContent = "Completa el usuario y la contraseña.";
    return;
  }

  if (demoUsers.length === 0) {
    message.textContent = "El acceso local no está configurado. Conecta el servicio de autenticación.";
    return;
  }

  const foundUser = demoUsers.find(
    (item) => item.usuario === usuario && item.contrasena === contrasena
  );

  if (!foundUser) {
    message.textContent = "Usuario o contraseña incorrectos.";
    return;
  }

  const normalizedRole = window.normalizeDemoRole(foundUser.rol);

  if (!normalizedRole) {
    message.textContent = "El usuario no tiene un rol de demostración configurado.";
    return;
  }

  if (rememberInput.checked) {
    localStorage.setItem("demoRememberedUser", usuario);
  } else {
    localStorage.removeItem("demoRememberedUser");
  }

  sessionStorage.setItem(
    "demoSession",
    JSON.stringify({
      usuario: foundUser.usuario,
      nombre: foundUser.nombre,
      rol: normalizedRole
    })
  );

  window.location.href = "src/pages/inicio.html";
});

forgotButton.addEventListener("click", () => {
  message.textContent = "En esta demo, solicita las credenciales al administrador.";
});
