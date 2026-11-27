/* Pure commercial calculations; monetary amounts are integer US cents. */
export function cents(value){
  const s=String(value??"").trim();
  if(!/^\d{1,7}(\.\d{1,2})?$/.test(s))throw Error("Monto inválido: usa hasta dos decimales.");
  const [whole,fraction=""]=s.split(".");
  return Number(whole)*100+Number(fraction.padEnd(2,"0"));
}
export function validDay(s){
  if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const d=new Date(s+"T00:00:00Z");return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
}
export function todayLocal(){
  return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Caracas",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
export function addMonths(day,months){
  if(!validDay(day)||!Number.isInteger(months)||months<1||months>12)throw Error("Fecha o período inválido.");
  const [y,m,d]=day.split("-").map(Number);
  const target=new Date(Date.UTC(y,m-1+months,1));
  const max=new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate();
  target.setUTCDate(Math.min(d,max));return target.toISOString().slice(0,10);
}
export function renewalDate(current,today,months){
  if(!validDay(today)||current&&!validDay(current))throw Error("Fecha de vencimiento inválida. Revisa la cuenta.");
  return addMonths(current&&current>today?current:today,months);
}
export function paymentAmount(price,months){
  if(!Number.isInteger(months)||months<1||months>12)throw Error("Período inválido.");
  const unit=cents(price);if(unit<=0)throw Error("El plan no tiene mensualidad cobrable.");
  return unit*months;
}
export const DEFAULT_POLICY=Object.freeze({graceDays:0,firstAlertDays:30,priorityDays:7});
export function billingPolicy(p={}){
 const int=(v,f,min,max)=>Number.isInteger(v)&&v>=min&&v<=max?v:f;
 const firstAlertDays=int(p.firstAlertDays,30,1,90);
 return {graceDays:int(p.graceDays,0,0,30),firstAlertDays,priorityDays:Math.min(firstAlertDays,int(p.priorityDays,7,1,30))};
}
export function daysToDue(day,today){return validDay(day)&&validDay(today)?Math.round((Date.parse(day)-Date.parse(today))/86400000):null;}
export function blocked(b){return b.accessSuspended===true||/^(suspendido|suspended|inactivo|inactive|bloqueado|blocked)$/i.test(b.status||"");}
export function commercialState(b,today,policy=DEFAULT_POLICY){
 if(blocked(b))return "Bloqueada";
 const days=daysToDue(b.nextPayment,today),p=billingPolicy(policy);
 if(days===null)return "Fecha pendiente";
 if(days<0)return days>=-p.graceDays?"En gracia":"Vencida";
 if(days<=p.priorityDays)return "Por vencer";
 return String(b.status).toLowerCase()==="prueba"?"Prueba":"Al día";
}
export function eligibleForCollectionHold(b,today,policy){
 return ["activo","prueba","vencido"].includes(String(b.status||"").toLowerCase())&&!blocked(b)&&commercialState(b,today,policy)==="Vencida";
}
export function monthlyLedger(entries,month){
 if(!/^\d{4}-\d{2}$/.test(month)||!validDay(month+"-01"))throw Error("Mes inválido.");
 const valid=entries.filter(p=>p.currency==="USD"&&validDay(p.paidAt)&&p.paidAt.startsWith(month+"-")&&Number.isSafeInteger(p.amountCents)&&p.amountCents>0);
 const byMethod={};for(const p of valid){const k=String(p.method||"Otro");byMethod[k]=(Object.hasOwn(byMethod,k)?byMethod[k]:0)+p.amountCents;}
 return {count:valid.length,totalCents:valid.reduce((sum,p)=>sum+p.amountCents,0),byMethod};
}
