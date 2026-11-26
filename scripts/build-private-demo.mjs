import {cpSync,readFileSync,readdirSync,writeFileSync,rmSync,mkdirSync} from "node:fs";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
const out="demo-dist";
const config=readFileSync("js/firebase/firebase-config.js","utf8");
if(!/projectId\s*:\s*["']sambrix-demo["']/.test(config))throw Error("Invalid DEMO project");
if(JSON.parse(readFileSync(".firebaserc","utf8")).projects.default!=="sambrix-demo")throw Error("Invalid Firebase CLI target");
const forbidden=/app-barberia-2026(?:\.firebaseapp\.com|[^\s"'<>]*\.firebaseio\.com|\.firebasestorage\.app|\.web\.app|\.appspot\.com)|["']projectId["']\s*:\s*["']app-barberia-2026["']|projectId\s*:\s*["']app-barberia-2026["']/i;
rmSync(out,{recursive:true,force:true});mkdirSync(out);
for(const name of ["index.html","js","css"])cpSync(name,join(out,name),{recursive:true});
function scan(dir){for(const item of readdirSync(dir,{withFileTypes:true})){const p=join(dir,item.name);if(item.isDirectory())scan(p);else if(/\.(js|html|css|json)$/.test(p)&&forbidden.test(readFileSync(p,"utf8")))throw Error("Production reference: "+p);}}
// Repair only valid UTF-8 sequences misread as Windows-1252.
const legacy=new TextDecoder("windows-1252");
const strict=new TextDecoder("utf-8",{fatal:true});
const byteOf=new Map(Array.from({length:256},(_,b)=>[legacy.decode(Uint8Array.of(b)),b]));
function repairText(input){
 for(let pass=0;pass<3;pass++){
  let out="";
  for(let i=0;i<input.length;){
   const b=byteOf.get(input[i]),n=b>=194&&b<=223?2:b>=224&&b<=239?3:b>=240&&b<=244?4:0;
   if(n&&i+n<=input.length){
    const bytes=Array.from(input.slice(i,i+n),c=>byteOf.get(c));
    if(bytes.length===n&&bytes.slice(1).every(v=>v>=128&&v<=191)){
     try{out+=strict.decode(Uint8Array.from(bytes));i+=n;continue;}catch{}
    }
   }
   out+=input[i++];
  }
  if(out===input)return out;
  input=out;
 }
 return input;
}
if(repairText("EspaÃ±ol | ConversiÃ³n | â–¦ | Español")!=="Español | Conversión | ▦ | Español")throw Error("Encoding repair self-test failed");
let repaired=0;
function repairTree(dir){
 for(const item of readdirSync(dir,{withFileTypes:true})){
  const p=join(dir,item.name);
  if(item.isDirectory()){repairTree(p);continue;}
  if(!/\.(html|js|css|json)$/.test(p))continue;
  const original=readFileSync(p,"utf8"),fixed=repairText(original);
  if(fixed!==original){
   writeFileSync(p,fixed,"utf8");
   if(p.endsWith(".js"))execFileSync(process.execPath,["--check",p],{stdio:"inherit"});
   repaired++;
  }
 }
}
repairTree(out);
const verifyHtml=readFileSync(join(out,"index.html"),"utf8");
for(const word of ["Español","administración","dueños","Tecnología"])if(!verifyHtml.includes(word))throw Error("Missing corrected text: "+word);
console.log("DEMO encoding: corrected "+repaired+" static files; changed JavaScript syntax checked.");
scan(out);
const html=join(out,"index.html");writeFileSync(html,readFileSync(html,"utf8").replace("</body>",'<div style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#742b00;color:white;text-align:center;font:12px sans-serif;padding:4px;pointer-events:none">SAMBRIX DEMO · SOLO DATOS FICTICIOS</div></body>'));
console.log("SAMBRIX DEMO build: isolated Firebase, static allowlist.");
