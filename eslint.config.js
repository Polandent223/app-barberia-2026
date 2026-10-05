import globals from "globals";

export default [
  {
    ignores: ["js/bundle-*.js", "node_modules/**"],
  },
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, App: "writable", SaaS: "writable" },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": ["warn", { args: "none" }],
      "no-redeclare": "warn",
      "no-dupe-keys": "error",
      "no-unreachable": "error",
      "no-constant-condition": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["js/firebase/**/*.js", "js/saas/public-cloud.js", "js/saas/client-cloud-auth.js", "js/saas/saas-access.js", "js/saas/saas-cloud-main.js", "js/saas/saas-cloud.js"],
    languageOptions: { sourceType: "module" },
  },
];
