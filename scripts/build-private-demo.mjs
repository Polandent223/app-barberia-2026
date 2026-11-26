import {cpSync,readFileSync,readdirSync,writeFileSync,rmSync,mkdirSync} from "node:fs";
import {join} from "node:path";
const out="demo-dist";
const config=readFileSync("js/firebase/firebase-config.js","utf8");
if(!/projectId\s*:\s*["']sambrix-demo["']/.test(config))throw Error("Invalid DEMO project");
if(JSON.parse(readFileSync(".firebaserc","utf8")).projects.default!=="sambrix-demo")throw Error("Invalid Firebase CLI target");
const forbidden=/app-barberia-2026(?:\.firebaseapp\.com|[^\s"'<>]*\.firebaseio\.com|\.firebasestorage\.app|\.web\.app|\.appspot\.com)|["']projectId["']\s*:\s*["']app-barberia-2026["']|projectId\s*:\s*["']app-barberia-2026["']/i;
rmSync(out,{recursive:true,force:true});mkdirSync(out);
for(const name of ["index.html","js","css"])cpSync(name,join(out,name),{recursive:true});
function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())scan(p);else if(/\.(js|html|css|json)$/.test(p)&&forbidden.test(readFileSync(p,"utf8")))throw Error("Production reference: "+p);}}
scan(out);
const html=join(out,"index.html");writeFileSync(html,readFileSync(html,"utf8").replace("</body>",'<div style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#742b00;color:white;text-align:center;font:12px sans-serif;padding:4px;pointer-events:none">SAMBRIX DEMO · SOLO DATOS FICTICIOS</div></body>'));
console.log("SAMBRIX DEMO build: isolated Firebase, static allowlist.");
