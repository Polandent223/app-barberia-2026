# SAMBRIX — entorno de ensayo local

Este entorno sirve la aplicación completa con SDK Firebase, Chart.js y QR locales, configuración de proyecto demo, emuladores Auth/Firestore/Functions y política de red limitada a loopback. No contiene datos de producción ni debe desplegarse públicamente. Se exige Node 22 y Java 21.

Desde una copia de la rama sambrix-2-superadmin-modular:

```bash
npm ci
npm install --no-save --package-lock=false firebase@12 firebase-tools@14 esbuild puppeteer chart.js qrcode
npm install --prefix functions --ignore-scripts --no-audit --no-fund
```

En PowerShell (Windows):
```powershell
$env:GCLOUD_PROJECT="demo-sambrix-qa"
npx firebase emulators:exec --config firebase.shop.json --project demo-sambrix-qa --only auth,firestore,functions "node scripts/qa-browser-manual.mjs"
```
En macOS/Linux:
```bash
GCLOUD_PROJECT=demo-sambrix-qa npx firebase emulators:exec --config firebase.shop.json --project demo-sambrix-qa --only auth,firestore,functions "node scripts/qa-browser-manual.mjs"
```

El servidor local escucha únicamente en 127.0.0.1:4173. Abrir http://127.0.0.1:4173/ cuando el terminal confirme que está listo. Las cuentas ficticias se imprimen en el terminal; no se usan credenciales reales. La bandera POS solo se habilita en el emulador. Para cambiar de cargo, cerrar sesión y volver a entrar con la cuenta de ensayo. Ctrl+C cierra el entorno.

Para automatizar las pruebas, sustituir node scripts/qa-browser-manual.mjs por node --test scripts/authenticated-browser-test.mjs. El trabajo authenticated-browser de GitHub Actions hace esto. Incluye SuperAdmin, propietarios de dos empresas, administrador, gerente, recepción, cajero, profesional, empresa suspendida y reserva móvil con cliente. Las pruebas pueden descubrir problemas de interfaz: no considerar aprobado un caso hasta que CI confirme su resultado.

No usar credenciales reales, no cambiar el identificador de proyecto, no usar firebase deploy, no abrir puertos a Internet. El entorno no constituye un staging publicado. Los datos se recrean al arrancar una nueva sesión de emuladores sin importaciones.
