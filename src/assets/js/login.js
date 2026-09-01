const form = document.querySelector("#login-form");
const userInput = document.querySelector("#usuario");
const passwordInput = document.querySelector("#contrasena");
const rememberInput = document.querySelector("#recordar");
const message = document.querySelector("#form-message");
const forgotButton = document.querySelector("#forgot-button");
const passwordChangeForm = document.querySelector("#password-change-form");
const newPasswordInput = document.querySelector("#nueva-contrasena");
const confirmPasswordInput = document.querySelector("#confirmar-contrasena");
const passwordChangeMessage = document.querySelector("#password-change-message");
const passwordChangeCancel = document.querySelector("#password-change-cancel");

const GENERIC_PASSWORD = "demo2026";
const adminUsersKey = "demoAdminUsers";

function readAdminUsers() {
  try {
    const value = JSON.parse(localStorage.getItem(adminUsersKey) || "[]");
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("Se ignoraron usuarios demo locales inválidos.", error);
    return [];
  }
}

const locallyCreatedUsers = readAdminUsers()
  .filter((item) => item.estado === "Activo" && item.contrasenaTemporal)
  .map((item) => ({
    usuario: item.usuario,
    contrasena: item.contrasenaTemporal,
    nombre: item.nombre,
    rol: item.rol === "Administrador" && item.usuario !== "admin.demo" ? "Jefe" : item.rol,
    debeCambiarContrasena: item.debeCambiarContrasena === true
  }));

const baseDemoUsers = Array.isArray(window.DEMO_USERS) ? window.DEMO_USERS : [];
const demoUsers = [
  ...baseDemoUsers,
  ...locallyCreatedUsers.filter((local) => !baseDemoUsers.some((base) => base.usuario === local.usuario))
];

const rememberedUser = localStorage.getItem("demoRememberedUser");

if (rememberedUser) {
  userInput.value = rememberedUser;
  rememberInput.checked = true;
  passwordInput.focus();
}

let pendingLogin = null;

function applyRemember(usuario) {
  if (rememberInput.checked) {
    localStorage.setItem("demoRememberedUser", usuario);
  } else {
    localStorage.removeItem("demoRememberedUser");
  }
}

function completeLogin(foundUser, normalizedRole, usuario) {
  applyRemember(usuario);
  sessionStorage.setItem(
    "demoSession",
    JSON.stringify({
      usuario: foundUser.usuario,
      nombre: foundUser.nombre,
      rol: normalizedRole
    })
  );
  window.location.href = "src/pages/inicio.html";
}

function requiresPasswordChange(foundUser, contrasena) {
  if (foundUser.debeCambiarContrasena === true) return true;
  const isLocalUser = locallyCreatedUsers.some((item) => item.usuario === foundUser.usuario);
  return isLocalUser && contrasena === GENERIC_PASSWORD;
}

function startPasswordChange(foundUser, normalizedRole, usuario) {
  pendingLogin = { foundUser, normalizedRole, usuario };
  message.textContent = "";
  passwordChangeMessage.textContent = "";
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";
  form.hidden = true;
  passwordChangeForm.hidden = false;
  newPasswordInput.focus();
}

function cancelPasswordChange() {
  pendingLogin = null;
  passwordChangeMessage.textContent = "";
  passwordChangeForm.hidden = true;
  form.hidden = false;
  passwordInput.value = "";
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

  if (requiresPasswordChange(foundUser, contrasena)) {
    startPasswordChange(foundUser, normalizedRole, usuario);
    return;
  }

  completeLogin(foundUser, normalizedRole, usuario);
});

passwordChangeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  passwordChangeMessage.textContent = "";

  if (!pendingLogin) {
    cancelPasswordChange();
    return;
  }

  const nueva = newPasswordInput.value;
  const confirmar = confirmPasswordInput.value;

  if (nueva.length < 6) {
    passwordChangeMessage.textContent = "La nueva contraseña debe tener al menos 6 caracteres.";
    newPasswordInput.focus();
    return;
  }

  if (nueva === GENERIC_PASSWORD) {
    passwordChangeMessage.textContent = "Elige una contraseña distinta a la genérica.";
    newPasswordInput.focus();
    return;
  }

  if (nueva !== confirmar) {
    passwordChangeMessage.textContent = "Las contraseñas no coinciden.";
    confirmPasswordInput.focus();
    return;
  }

  const { foundUser, normalizedRole, usuario } = pendingLogin;
  const storedUsers = readAdminUsers();
  const index = storedUsers.findIndex((item) => item.usuario === foundUser.usuario);

  if (index === -1) {
    passwordChangeMessage.textContent =
      "No se pudo actualizar la contraseña en este navegador. Intenta nuevamente.";
    return;
  }

  storedUsers[index] = {
    ...storedUsers[index],
    contrasenaTemporal: nueva,
    debeCambiarContrasena: false,
    contrasenaActualizadaEn: new Date().toISOString()
  };
  localStorage.setItem(adminUsersKey, JSON.stringify(storedUsers));

  foundUser.contrasena = nueva;
  foundUser.debeCambiarContrasena = false;
  pendingLogin = null;

  completeLogin(foundUser, normalizedRole, usuario);
});

passwordChangeCancel.addEventListener("click", cancelPasswordChange);

forgotButton.addEventListener("click", () => {
  message.textContent = "En esta demo, solicita las credenciales al administrador.";
});
