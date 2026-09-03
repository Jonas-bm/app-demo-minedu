# Repository Guidelines

## Estructura del proyecto

Este repositorio contiene una maqueta estática de SIGATET, sin backend, framework ni dependencias. `index.html` implementa el acceso y `src/pages/inicio.html` contiene la aplicación autenticada. La lógica está en `src/assets/js/`, los estilos en `src/assets/css/` y las imágenes en `src/assets/images/`. Los catálogos y datos simulados viven en `src/data/`; la configuración pública y los módulos globales, en `src/config/`. Consulte `docs/` para requisitos y matrices funcionales cuando esa carpeta esté disponible localmente.

## Ejecución y desarrollo

No existe un paso de compilación. Sirva el repositorio por HTTP porque el navegador bloquea las cargas JSON mediante `file://`:

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000/index.html`. También puede usar VS Code Live Server. Las cuentas de demostración están en `src/config/credenciales.demo.js`; no agregue credenciales reales.

## Estilo y convenciones

Mantenga el código, la interfaz, los comentarios y los commits en español. Use dos espacios en HTML, CSS y JavaScript, comillas dobles en JavaScript y nombres `kebab-case` para archivos (por ejemplo, `gestor-dashboard.js`). Encapsule cada script en una IIFE y publique únicamente su API mediante un objeto congelado en `window`. Separe HTML, CSS y JavaScript. Respete el orden de los `<script>` de `inicio.html`: la configuración y los ayudantes deben cargarse antes que sus consumidores. Conserve la adaptación responsive desde 320 px y los controles de sesión y rol.

## Pruebas

No hay pruebas automatizadas ni objetivo formal de cobertura. Antes de enviar cambios, recorra manualmente las rutas afectadas para los cuatro roles (`Macro`, `Gestor de la Información`, `Jefe` y `Administrador`). Compruebe errores de consola, navegación y autorización, estados vacíos y de error, persistencia en `localStorage`/`sessionStorage`, y diseño en móvil y escritorio. Documente los casos verificados en la solicitud de cambio.

## Commits y solicitudes de cambio

El historial usa mensajes breves en español, como `modificaciones` y `observaciones levantadas`; mejórelos con una acción y alcance concretos, por ejemplo: `corrige validación de zonas al importar`. Mantenga cada commit enfocado. Las solicitudes de cambio deben explicar el problema y la solución, enumerar rutas y roles afectados, incluir pasos de prueba y enlazar el requisito o incidencia. Adjunte capturas para cambios visuales. No incluya datos personales, contraseñas ni firmas reales.
