/* Shared client identity reconciliation. No private history is claimed by phone alone. */
export const normalizePhone=v=>String(v||"").replace(/\D/g,"");
export const activationCode=uid=>String(uid||"").slice(-12);
export function safePublicIdentity(name,phone){
 return typeof name==="string"&&name.trim().length>=2&&name.trim().length<=120&&/^[\p{L}\p{M}\p{N} .,’-]+$/u.test(name.trim())&&typeof phone==="string"&&phone.length<=30&&/^[+\d\s().-]+$/.test(phone)&&/^\d{7,20}$/.test(normalizePhone(phone));
}
export function validAccount(uid,p){
 return typeof uid==="string"&&/^[A-Za-z0-9_-]{1,128}$/.test(uid)&&p?.clientId==="client_"+uid&&p.status==="Activo"&&safePublicIdentity(p.name,p.phone)&&normalizePhone(p.phone)===p.phoneNormalized;
}
export function inspectAccount(clients,uid,p){
 if(!validAccount(uid,p))return {kind:"invalid"};
 const linked=clients.filter(c=>c.firebaseUid===uid),same=clients.filter(c=>normalizePhone(c.phone)===p.phoneNormalized);
 if(linked.length>1)return {kind:"conflict"};
 if(linked.length===1){
  const c=linked[0];
  if(normalizePhone(c.phone)!==p.phoneNormalized||same.some(x=>x.id!==c.id))return {kind:"conflict",client:c};
  return {kind:"linked",client:c};
 }
 if(clients.some(c=>c.id===p.clientId)||p.linkedClientId||p.linkVerified===true)return {kind:"conflict"};
 if(same.length===1&&!same[0].firebaseUid)return {kind:"verify",client:same[0]};
 if(same.length)return {kind:"conflict"};
 return {kind:"new"};
}
export function makeClient(businessId,branchId,uid,p){
 if(!validAccount(uid,p))throw Error("Cuenta inválida.");
 return {id:p.clientId,firebaseUid:uid,clientLinkVerified:false,source:"App Cliente",name:p.name.trim(),phone:p.phone,businessId,branchId:branchId||"",points:0,visits:0,lastVisit:""};
}
export function verifyLink(clients,uid,p,clientId,code,actor,at){
 const m=inspectAccount(clients,uid,p);
 if(!["verify","linked"].includes(m.kind)||m.client.id!==clientId||String(code||"").trim()!==activationCode(uid))throw Error("La cuenta o el código de activación no coincide. No se vinculó ningún historial.");
 Object.assign(m.client,{firebaseUid:uid,clientLinkVerified:true,clientLinkVerifiedBy:actor,clientLinkVerifiedAt:at});
 return m.client;
}
export function projection(c,uid,schedule,config,allowHistory=true){
 const completed=(schedule.appointments||[]).filter(a=>a.clientId===c.id&&a.status==="Finalizada");
 // Legacy history is not exposed until an authorized operator verifies ownership.
 const verified=c.clientLinkVerified===true;
 const own=completed.filter(a=>a.publicRequestId&&a.id==="public_"+a.publicRequestId);
 const eligible=verified?completed:own;
 const allPublic=own.length===completed.length&&Number(c.visits||0)===own.length;
 const exact=verified||allPublic;
 return {linkedClientId:c.id,linkVerified:verified,points:exact?Math.max(0,Number(c.points)||0):0,visits:exact?Math.max(0,Number(c.visits)||0):own.length,lastVisit:exact?String(c.lastVisit||""):own.map(a=>String(a.date||"")).sort().at(-1)||"",
 serviceHistory:(allowHistory?eligible:[]).map(a=>({id:String(a.id),date:String(a.date||""),time:String(a.time||""),service:String(config.services?.find(s=>s.id===a.serviceId)?.name||"Servicio"),professional:String(config.barbers?.find(p=>p.id===a.barberId)?.name||"Profesional")})).sort((a,b)=>(b.date+" "+b.time).localeCompare(a.date+" "+a.time)).slice(0,100)};
}
