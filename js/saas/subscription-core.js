/* Safe, customer-visible commercial fields. Never expose internal audit notes. */
export function planName(p={}) {
 const n=String(p.name||p.planName||p.id||p.planId||"Sin plan");
 return /^(?:B\u00c3\u00a1sico|B\u00c3\u0192\u00c2\u00a1sico|Básico|Basico)$/i.test(n)?"Básico":n;
}
export const PAYMENT_METHODS=Object.freeze(["Transferencia","Pago móvil","Zelle","USDT","Efectivo","Otro"]);
export function customerReceipt(p){
 return Object.fromEntries(["businessId","businessName","planId","planName","amountCents","currency","months","paidAt","previousDue","nextDue","method","reference"].map(k=>[k,k==="planName"?String(p[k]||""):p[k]]));
}
export function customerTerms(plans,policy,settings={}){
 const methods=Array.isArray(settings.methods)?PAYMENT_METHODS.filter(m=>settings.methods.includes(m)):[...PAYMENT_METHODS];
 return {plans:plans.filter(p=>p.active!==false).map(p=>({id:p.id,name:planName(p),price:p.price})),policy:{graceDays:policy.graceDays,firstAlertDays:policy.firstAlertDays,priorityDays:policy.priorityDays},methods:methods.length?methods:[...PAYMENT_METHODS],instructions:String(settings.instructions||"").trim().slice(0,1000)};
}
export const money=c=>new Intl.NumberFormat("es",{style:"currency",currency:"USD"}).format(c/100);
export const receiptNumber=id=>String(id||"").slice(0,12).toUpperCase();
export function receiptMessage(p){
 return ["SAMBRIX · Comprobante administrativo","N.º "+receiptNumber(p.id),p.businessName,"Plan: "+planName(p),"Pago: "+money(p.amountCents),"Fecha: "+p.paidAt,"Período: "+p.months+" mes(es)","Vencimiento: "+p.nextDue,"No constituye factura fiscal."].join("\n");
}
