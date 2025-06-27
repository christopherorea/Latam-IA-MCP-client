# Latam-IA MCP Client

[![React](https://img.shields.io/badge/React-2025-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple?logo=vite)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Gemini-API-blueviolet)](https://ai.google.dev/gemini-api)
[![MIT License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen)](https://github.com/christopherorea/Latam-IA-MCP-client)
[![Demo en vivo](https://img.shields.io/badge/Demo-GitHub%20Pages-blue)](https://christopherorea.github.io/Latam-IA-MCP-client/)

🚀 **Latam-IA MCP Client** es un conector universal open source para interactuar con sistemas MCP (Model Context Protocol) globales, pensado para América y el mundo. Su objetivo es facilitar la integración y el acceso a modelos de lenguaje (LLMs) de múltiples proveedores, desde cualquier dispositivo: computadoras, navegadores, teléfonos, relojes inteligentes ¡y más!

---

## 📑 Índice

- [Demo en vivo](#-demo-en-vivo)
- [Instalación y ejecución local](#-instalación-y-ejecución-local)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Requisitos previos](#-requisitos-previos)
- [Seguridad y privacidad](#-seguridad-y-privacidad)
- [Reglas para contribuir](#-reglas-para-contribuir)
- [¿Cómo crear un branch?](#-cómo-crear-un-branch)
- [Validación](#-validación)
- [TODOs](#todos)
- [¿Para quién es?](#-para-quién-es)
- [¿Por qué usarlo?](#-por-qué-usarlo)
- [Patrocinador](#-patrocinador)
- [Licencia](#-licencia)
- [Modos de uso: PWA y extensión de Chrome](#modos-de-uso-pwa-y-extensión-de-chrome)

---

## 🌐 Demo en vivo

[¡Pruébalo aquí!](https://christopherorea.github.io/Latam-IA-MCP-client/)

---

## ⚡ Instalación y ejecución local

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/christopherorea/Latam-IA-MCP-client.git
   cd Latam-IA-MCP-client
   ```
2. **Instala las dependencias:**
   ```bash
   npm install
   ```
3. **Configura tu Gemini API Key:**
   - La clave se solicita al iniciar la app y se guarda solo en tu sesión local.
   - Puedes obtener una en [Google AI Gemini](https://ai.google.dev/gemini-api/docs/)
4. **Ejecuta en modo desarrollo:**
   ```bash
   npm run dev
   ```
5. **Abre en tu navegador:**
   - Normalmente en [http://localhost:5173](http://localhost:5173)

---

## 📁 Estructura del proyecto

- `components/` — Componentes principales de la UI (chat, header, footer, etc.)
- `hooks/` — Custom hooks para lógica de negocio y estado
- `services/` — Integraciones con APIs externas (Gemini, OpenAI, Claude, etc.)
- `types.ts` — Tipos y contratos TypeScript
- `constants.tsx` — Iconos y constantes visuales
- `App.tsx` — Componente raíz
- `vite.config.ts` — Configuración de Vite

---

## 🚦 Requisitos previos

- Node.js >= 18.x
- Navegador moderno
- **Gemini API Key** (por ahora solo disponible este proveedor)

---

## 🔒 Seguridad y privacidad

- Las herramientas y las claves API se almacenan únicamente en la sesión del usuario.
- No se guardan en servidores externos ni se comparten, asegurando que la seguridad depende exclusivamente de quien use el sistema.
- Recomendamos siempre usar claves personales y mantenerlas seguras.

---

## 🛠️ Reglas para contribuir

- Usa ramas y nombres de commits siguiendo estas convenciones:
  - `fix/<motivo>` para correcciones de bugs o problemas.
  - `feature/<añadido>` para nuevas funcionalidades.
  - `refactor/<motivo>` para refactorización de código.
  - `docs/<motivo>` para cambios en la documentación.
  - `test/<motivo>` para añadir o mejorar pruebas.
  - `chore/<motivo>` para tareas menores o mantenimiento.
- Toda contribución debe pasar la validación de código y revisión por la comunidad.
- Abre un Pull Request explicando claramente el cambio y su impacto.

---

## 🛠️ ¿Cómo crear un branch?

Para contribuir, crea una nueva rama siguiendo estas reglas de nomenclatura:

- Para correcciones de bugs:
  ```bash
  git checkout -b fix/<motivo>
  # Ejemplo:
  git checkout -b fix/arreglo-chat
  ```

- Para nuevas funcionalidades:
  ```bash
  git checkout -b feature/<añadido>
  # Ejemplo:
  git checkout -b feature/tabs-servidores
  ```

- Para mejoras de documentación:
  ```bash
  git checkout -b docs/<motivo>
  # Ejemplo:
  git checkout -b docs/actualiza-readme
  ```

- Para refactorizaciones:
  ```bash
  git checkout -b refactor/<motivo>
  # Ejemplo:
  git checkout -b refactor/estructura-componentes
  ```

Recuerda siempre crear tu branch desde la rama `main` y hacer un Pull Request cuando termines tu cambio.

---

## ✅ Validación

- Antes de hacer merge, asegúrate de que tu código pase los tests y respete las convenciones del proyecto.
- La comunidad revisará y aprobará los cambios.

---

## TODOs

- [ ] Añadir pruebas unitarias.
- [ ] Refactorización del código para mayor mantenibilidad.
- [ ] Implementar tabs para intercambiar entre servidores MCP y proveedores LLM.
- [ ] Mejorar la cobertura de tests y documentación.
- [ ] Soporte para más proveedores de LLM (actualmente solo Gemini API Key).

---

## 👥 ¿Para quién es?

- Usuarios, empresas y desarrolladores que quieran interactuar con LLMs y servidores MCP de forma sencilla y segura.
- Miembros de la comunidad LATAM AI y cualquier persona interesada en IA conversacional y protocolos abiertos.
- Cualquiera que desee contribuir, mejorar y mantener una herramienta de IA para todos.

---

## 🌎 ¿Por qué usarlo?

- **Conexión universal:** Un solo cliente para todos tus LLMs y servidores MCP.
- **Comunidad:** Crece y evoluciona gracias a las ideas y aportes de usuarios de toda América y el mundo.
- **Futuro abierto:** Pensado para ser la base de la interacción con IA en la región y más allá.

---

## 🤝 Patrocinador

Este proyecto es patrocinado por [Consultor-IA](https://consultor-ia.tech/).  
Gracias a Consultor-IA por apoyar el desarrollo y la comunidad de LATAM AI.

---

## 📄 Licencia

Este proyecto es open source bajo licencia MIT.

---

## 🧩 Modos de uso: PWA y extensión de Chrome

Puedes usar este cliente de tres formas principales:

### 1. Usar como PWA (por defecto)

No necesitas hacer ningún cambio. El proyecto está listo para funcionar como PWA:
- Simplemente ejecuta en desarrollo (`npm run dev`) o despliega el build (`npm run build`).
- El archivo `index.html` ya apunta al manifiesto y service worker de PWA:
  ```html
  <link rel="manifest" id="manifest-link" href="/manifest-pwa.json">
  <script>
    navigator.serviceWorker.register('/service-worker.js')
  </script>
  ```
- Puedes instalar la app como PWA desde el navegador (opción "Instalar app" en Chrome, Edge, etc.).

### 2. Crear tu propia extensión de Chrome

Si quieres tu propia extensión personalizada:
1. Cambia en `index.html` la línea del manifiesto por la de extensión:
   ```html
   <link rel="manifest" id="manifest-link" href="/manifest.json">
   ```
2. Ejecuta el build del proyecto:
   ```bash
   npm run build
   ```
3. Ve a `chrome://extensions/`, activa "Modo desarrollador" y haz clic en "Cargar descomprimida". Selecciona la carpeta `dist/` generada.

### 3. Probar la extensión ya empaquetada

Si solo quieres probar la extensión rápidamente:
1. Descomprime el archivo `Latam-IA-MCP-client-chrome-v1.zip` que está en la raíz del proyecto.
2. Ve a `chrome://extensions/`, activa "Modo desarrollador" y haz clic en "Cargar descomprimida". Selecciona la carpeta descomprimida.

---

Cada vez que haces merge a `main`, un workflow de GitHub Actions despliega la app en GitHub Pages automáticamente.

---

## 📚 Citación

Si este proyecto te resulta útil, siéntete libre de citarlo.

```
@misc{latam-ia-mcp-client,
  title={Latam-IA MCP Client: Conector universal open source para LLMs y servidores MCP},
  author={Christopher Orea},
  year={2025},
  howpublished={\url{https://github.com/christopherorea/Latam-IA-MCP-client}},
  note={LinkedIn del autor: https://www.linkedin.com/in/chrisgalleta/}
}
```

¡Bienvenido a la revolución de la IA abierta y colaborativa! 🌎🤖

