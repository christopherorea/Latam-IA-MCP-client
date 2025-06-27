# Cómo compilar tu app Cordova para Android

## Requisitos previos
- Node.js y npm instalados
- Java JDK 8 o superior
- Android SDK (puedes instalarlo con Android Studio o solo las Command Line Tools)
- Cordova instalado globalmente:
  ```sh
  npm install -g cordova
  ```

## Pasos para compilar

1. **Instala las dependencias de tu app (si usas Vite o similar):**
   ```sh
   npm install
   npm run build
   ```
   Esto generará la build en `MyApp/www`.

2. **Entra a la carpeta del proyecto Cordova:**
   ```sh
   cd MyApp
   ```

3. **Agrega la plataforma Android (solo la primera vez):**
   ```sh
   cordova platform add android
   ```

4. **Compila la app para Android:**
   ```sh
   cordova build android
   ```
   El APK se generará en `MyApp/platforms/android/app/build/outputs/apk/`.

5. **(Opcional) Ejecuta en un emulador o dispositivo conectado:**
   ```sh
   cordova run android
   ```

## Notas
- Si tienes problemas con el SDK, asegúrate de que las variables de entorno `JAVA_HOME` y `ANDROID_HOME` estén configuradas.
- No necesitas abrir Android Studio, pero sí tener el SDK instalado.
- Si solo quieres probar en navegador:
  ```sh
  cordova run browser
  ```

---

¿Dudas? Consulta la documentación oficial: https://cordova.apache.org/docs/en/latest/guide/cli/
