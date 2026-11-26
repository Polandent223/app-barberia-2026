import http from "node:http";
import {readFile,mkdtemp,rm} from "node:fs/promises";
import {resolve,dirname,extname,join} from "node:path";
import {fileURLToPath} from "node:url";
import {tmpdir} from "node:os";
import {createRequire} from "node:module";
import {build} from "esbuild";
export const PROJECT="demo-sambrix-qa";
const root=resolve(dirname(fileURLToPath(import.meta.url)),".."),require=createRequire(import.meta.url);
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".webp":"image/webp",".ico":"image/x-icon",".woff2":"font/woff2"};
export function assertLocalEmulators(){
 const local=/^(localhost|127\.0\.0\.1):\d+$/;
 if(process.env.GCLOUD_PROJECT!==PROJECT||!local.test(process.env.FIRESTORE_EMULATOR_HOST||"")||!local.test(process.env.FIREBASE_AUTH_EMULATOR_HOST||""))throw Error("QA solo puede ejecutarse en proyecto demo con emuladores locales.");
}
export async function createQaServer({port=0}={}){
 assertLocalEmulators();
 const sdkDir=await mkdtemp(join(tmpdir(),"sambrix-sdk-"));
 await build({entryPoints:["app","auth","firestore","functions"].map(n=>({in:"qa-sdk:"+n,out:"firebase-"+n})),plugins:[{name:"qa-sdk",setup(b){b.onResolve({filter:/^qa-sdk:/},args=>({path:args.path.slice(7),namespace:"qa-sdk"}));b.onLoad({filter:/.*/,namespace:"qa-sdk"},args=>({contents:"export * from "+JSON.stringify("firebase/"+args.path)+";",loader:"js",resolveDir:root}));}}],outdir:sdkDir,bundle:true,splitting:true,format:"esm",platform:"browser",logLevel:"warning"});
 await Promise.all([["chart","import Chart from 'chart.js/auto';window.Chart=Chart;"],["qrcode","import * as QRCode from 'qrcode';window.QRCode=QRCode;"]].map(([name,contents])=>build({stdin:{contents,resolveDir:root,loader:"js"},outfile:join(sdkDir,name+".js"),bundle:true,format:"iife",platform:"browser",logLevel:"warning"})));
 const authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST,fireHost=process.env.FIRESTORE_EMULATOR_HOST.split(":");
 const authConnect=(expr)=>"connectAuthEmulator("+expr+","+JSON.stringify("http://"+authHost)+",{disableWarnings:true});";
 const fsConnect=(expr)=>"connectFirestoreEmulator("+expr+","+JSON.stringify(fireHost[0])+","+Number(fireHost[1])+");";
 const server=http.createServer(async(req,res)=>{
  try{
   const p=decodeURIComponent(new URL(req.url,"http://localhost").pathname),path=p==="/"?"/index.html":p;
   if(path.includes("..")||!/^\/(?:index\.html|qa-sdk\/[\w.-]+\.js|(?:js|css|assets|img|images|icons)\/[\w./-]+|[\w.-]+\.(?:png|jpg|svg|ico|webmanifest|json))$/.test(path)||path==="/firebase.json"||path==="/firebase.shop.json"||path==="/package.json")throw Error("Ruta no permitida");
   let data;
   if(path.startsWith("/qa-sdk/"))data=await readFile(join(sdkDir,path.slice(8)));
   else if(path==="/js/firebase/firebase-config.js")data='export const firebaseConfig={apiKey:"demo-api-key",authDomain:"demo-sambrix-qa.firebaseapp.com",projectId:"demo-sambrix-qa",appId:"1:123:web:qa"};export const FIREBASE_SDK_VERSION="QA";';
   else data=await readFile(join(root,path));
   if(path.endsWith(".js")&&!path.startsWith("/qa-sdk/")){
    data=String(data).replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/firebase-(app|auth|firestore|functions)\.js/g,(_,n)=>"/qa-sdk/firebase-"+n+".js").replace(/(firebase-core\.js)\?v=[\d.]+/g,"$1");
    if(path==="/js/firebase/firebase-core.js"){
     data='import {connectAuthEmulator} from "/qa-sdk/firebase-auth.js";import {connectFirestoreEmulator} from "/qa-sdk/firebase-firestore.js";\n'+data;
     data=data.replace("export {FIREBASE_SDK_VERSION",authConnect("auth")+fsConnect("firestore")+"\nexport {FIREBASE_SDK_VERSION");
    }
    if(path==="/js/saas/client-cloud-auth.js"){
     data='import {connectAuthEmulator} from "/qa-sdk/firebase-auth.js";import {connectFirestoreEmulator} from "/qa-sdk/firebase-firestore.js";\n'+data;
     data=data.replace("await setPersistence(auth,browserLocalPersistence);",authConnect("auth")+fsConnect("db")+"await setPersistence(auth,browserLocalPersistence);");
    }
    if(path==="/js/saas/saas-access.js"){
     data='import {connectAuthEmulator} from "/qa-sdk/firebase-auth.js";\n'+data;
     data=data.replace("const auth=getAuth(app);","const auth=getAuth(app);"+authConnect("auth"));
    }
    if(path==="/js/saas/shop-control.js"){
     data='import {connectFunctionsEmulator} from "/qa-sdk/firebase-functions.js";\n'+data;
     data=data.replace("const endpoints=Object.fromEntries","const qaFunctions=getFunctions(firebaseApp,\"us-central1\");connectFunctionsEmulator(qaFunctions,\"127.0.0.1\",5001);\n const endpoints=Object.fromEntries").replace('httpsCallable(getFunctions(firebaseApp,"us-central1"),name)','httpsCallable(qaFunctions,name)');
    }
   }
   if(path==="/index.html"){
    data=String(data).replace(/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/qrcode[^"]+"[^>]*><\/script>/g,'<script defer src="/qa-sdk/qrcode.js"></script>').replace(/<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/chart\.js[^"]*"[^>]*><\/script>/g,'<script defer src="/qa-sdk/chart.js"></script>');
    data=data.replace("</body>",'<div style="position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#742b00;color:white;text-align:center;font:12px sans-serif;padding:4px;pointer-events:none">SAMBRIX QA · ENTORNO LOCAL · DATOS FICTICIOS</div></body>');
   }
   res.writeHead(200,{"content-type":mime[extname(path)]||"application/octet-stream","cache-control":"no-store","content-security-policy":"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; frame-src 'self' http://localhost:* http://127.0.0.1:*; object-src 'none'; base-uri 'self'"});
   res.end(data);
  }catch(e){res.writeHead(404);res.end("QA: recurso no disponible");}
 });
 await new Promise(r=>server.listen(port,"127.0.0.1",r));
 return {url:"http://127.0.0.1:"+server.address().port,close:async()=>{await new Promise(r=>server.close(r));await rm(sdkDir,{recursive:true,force:true});}};
}
