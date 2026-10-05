# Refactorización (recomendaciones aplicadas)

1. **Consolidación de scripts**: los ~100 `<script>` individuales de `index.html`
   se reemplazaron por dos bundles generados en orden determinista:
   - `js/bundle-core.js` (24 archivos del núcleo de la app)
   - `js/bundle-saas.js` (77 archivos SaaS/Sambrix + agenda/cuentas/aprobaciones)
   Los módulos ES (`type="module"`) se mantienen como entradas independientes.
   Los archivos fuente individuales siguen en `js/` y `js/saas/` (excluidos de ESLint
   solo `bundle-*.js`); no se borraron por compatibilidad con las cargas dinámicas
   (`agenda-scheduling.js`, `client-accounts.js`, `appointment-approval.js`,
   `saas-cloud.js`, `staff-production-patch.js`, `session-production-guard.js`,
   `production-action-guards.js` se cargan en runtime desde `auth.js` y los `*-20-3x.js`).

2. **Arranque ordenado**: `js/core.js` ejecuta `App.load()` y `js/saas/saas-core.js`
   ejecuta `SaaS.load()` al ser parseados, por lo que `App.db` y `SaaS.db` siempre
   existen antes de que cualquier código de alto nivel los lea. Se mantienen los
   guards defensivos (`SaaS.db?...`, `if(!SaaS.db)return`) añadidos previamente.

3. **Herramientas de calidad**:
   - `package.json` con scripts `lint`, `check:syntax`, `smoke`, `test`.
   - `eslint.config.js` (flat config, reglas de errores reales: dupe-keys, unreachable...).
   - `scripts/check-syntax.mjs`: `node --check` a todos los JS.
   - `scripts/smoke-test.mjs`: servidor estático + Puppeteer headless; falla ante
     errores de consola o respuestas >= 400.
   - `.github/workflows/ci.yml`: ejecuta syntax-check, lint y smoke test en CI.
