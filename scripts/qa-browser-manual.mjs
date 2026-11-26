import {createQaServer} from "./qa-browser-server.mjs";
import {seedQa,BUSINESS,PHONE,PIN,PASSWORD} from "./qa-browser-seed.mjs";
const qa=await createQaServer({port:4173}),seed=await seedQa();
console.log("\nSAMBRIX QA — SOLO EMULADORES LOCALES");
console.log("Panel: "+qa.url);
console.log("Cliente: "+qa.url+"/?business="+BUSINESS+"&cliente=app");
console.log("Contraseña de ensayo: "+PASSWORD);
for(const [role,user] of Object.entries(seed.users))if(role!=="client")console.log(role+": "+user.email);
console.log("Cliente ficticio: "+PHONE+" / "+PIN);
console.log("Ctrl+C para cerrar. No publicar este entorno.");
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await qa.close();await seed.close();process.exit(0);}
process.once("SIGINT",stop);process.once("SIGTERM",stop);
