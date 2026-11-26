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
  const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
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
export function commercialState(b,today){
  if(b.accessSuspended===true||/^(suspendido|suspended|inactivo|inactive|bloqueado|blocked)$/i.test(b.status||""))return "Bloqueada";
  if(!validDay(b.nextPayment))return "Fecha pendiente";
  if(b.nextPayment<today)return "Vencida";
  const days=(Date.parse(b.nextPayment)-Date.parse(today))/86400000;
  return days<=7?"Por vencer":String(b.status).toLowerCase()==="prueba"?"Prueba":"Al día";
}
