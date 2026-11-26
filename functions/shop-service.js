import {createHash} from "node:crypto";
import {checkoutShop,returnShopSale,MAX_LINES,METHODS} from "./shop-core.js";
const hash=value=>createHash("sha256").update(value).digest("hex");
const fail=(code,message)=>{const e=Error(message);e.code=code;throw e;};
const idPattern=/^[A-Za-z0-9_-]{1,180}$/;
const requestPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function normalized(input,kind){
 if(!input||typeof input!=="object"||!idPattern.test(input.businessId||"")||!requestPattern.test(input.requestId||""))fail("invalid-argument","Identificador de empresa u operación inválido.");
 if(kind==="SALE"){
  const orderId=String(input.orderId||"");
  if(orderId&&!idPattern.test(orderId))fail("invalid-argument","Pedido inválido.");
  if(!METHODS.includes(input.method))fail("invalid-argument","Método inválido.");
  let items=[];
  if(!orderId){
   if(!Array.isArray(input.items)||input.items.length<1||input.items.length>MAX_LINES)fail("invalid-argument","Cantidad de referencias inválida.");
   items=input.items.map(x=>{
    if(!idPattern.test(x?.id||"")||!Number.isSafeInteger(x.qty)||x.qty<1||x.qty>9999999||typeof x.price!=="number"||!Number.isFinite(x.price)||x.price<=0)fail("invalid-argument","Producto, precio o cantidad inválidos.");
    return {id:x.id,qty:x.qty,price:x.price};
   });
  }
  return {businessId:input.businessId,requestId:input.requestId,orderId,items,method:input.method};
 }
 if(!/^[a-f0-9]{64}$/.test(input.originalOperationId||""))fail("invalid-argument","Venta original inválida.");
 const reason=String(input.reason||"").trim();if(reason.length<5||reason.length>500)fail("invalid-argument","Motivo inválido.");
 return {businessId:input.businessId,requestId:input.requestId,originalOperationId:input.originalOperationId,reason};
}
function serverClock(now,business){
 const timezone=String(business?.timezone||"UTC");
 let parts;
 try{parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(now);}
 catch{fail("failed-precondition","Zona horaria del negocio inválida.");}
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return {date:p.year+"-"+p.month+"-"+p.day,time:p.hour+":"+p.minute};
}
export function createShopService({db,sdk,now=()=>new Date()}){
 return async function execute(kind,auth,input){
  if(!auth?.uid)fail("unauthenticated","Inicia sesión.");
  if(!["SALE","RETURN"].includes(kind))fail("invalid-argument","Operación no válida.");
  const data=normalized(input,kind),{businessId,requestId,...args}=data,actor=auth.uid,email=String(auth.token?.email||"");
  const at=now(),operationId=hash(actor+":"+requestId.toLowerCase()),intentHash=hash(JSON.stringify({kind,...data,requestId:requestId.toLowerCase()}));
  const authorize=async(tx,action)=>{
   const paths=[["platform","config"],["platform_users",actor],["businesses",businessId],["businesses",businessId,"members",actor]];
   const [platform,profile,company,member]=await Promise.all(paths.map(p=>tx.get(sdk.doc(db,...p))));
   if(!platform.exists()||platform.data().shopServerEnabled!==true)fail("failed-precondition","Punto de venta no habilitado por SAMBRIX.");
   if([profile,company,member].some(s=>!s.exists()))fail("permission-denied","Empresa o usuario no autorizado.");
   const p=profile.data(),b=company.data(),m=member.data();
   if(p.uid!==actor||p.role!=="business_user"||p.active===false||m.uid!==actor||m.businessId!==businessId||m.active===false||b.accessSuspended===true||!["activo","prueba"].includes(String(b.status||"").toLowerCase()))fail("permission-denied","Acceso empresarial no autorizado.");
   if(!["plan-pro","plan-premium"].includes(b.planId)||b.nextPayment&&b.nextPayment<serverClock(at,{}).date)fail("failed-precondition","Suscripción no habilitada.");
   if(!(action==="RETURN"?["owner","admin"]:["owner","admin","manager","cashier"]).includes(m.role))fail("permission-denied","Tu cargo no autoriza esta operación.");
  };
  const common={db,sdk,businessId,actor,email,authorize,operationId,intentHash,clock:b=>serverClock(at,b),...args};
  return kind==="SALE"?checkoutShop(common):returnShopSale(common);
 };
}
