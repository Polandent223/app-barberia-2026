/* Historical records may be appended, not edited or removed. */
import {fingerprint,cloneJSON} from "./sync-conflict.js?v=2.0.3";
export const protectedLists={finance:["cash","sales"],inventory:["stockMoves"]};
function fail(message){const e=Error(message);e.code="sambrix/protected-history";throw e;}
function sameExisting(old,next,kind,businessId){
  if(fingerprint(old)===fingerprint(next))return true;
  if(!old||!next||typeof old!=="object"||typeof next!=="object")return false;
  // Older records can acquire missing display metadata in memory. Preserve the
  // original server row rather than rewriting the historical record.
  const copy=cloneJSON(next);
  for(const k of ["businessId","branchId"]){
    if(!Object.prototype.hasOwnProperty.call(old,k)){
      if(k==="businessId"&&copy[k]!==businessId)return false;
      delete copy[k];
    }
  }
  if(kind==="sales"&&!Object.prototype.hasOwnProperty.call(old,"paymentMethod")&&copy.paymentMethod==="No especificado")delete copy.paymentMethod;
  return fingerprint(old)===fingerprint(copy);
}
export function protectHistory(domain,before,after,businessId){
  const out=cloneJSON(after);
  for(const key of protectedLists[domain]||[]){
    const old=before?.[key]??[],next=after?.[key]??[];
    if(!Array.isArray(old)||!Array.isArray(next)||next.length<old.length)fail("No se permite borrar registros históricos de "+key+".");
    for(let i=0;i<old.length;i++)if(!sameExisting(old[i],next[i],key,businessId))fail("No se permite cambiar un registro histórico de "+key+". Contacta a soporte.");
    const ids=new Set(old.map(r=>r?.id).filter(Boolean));
    for(const row of next.slice(old.length)){
      if(!row||typeof row.id!=="string"||!row.id||ids.has(row.id)||row.businessId&&row.businessId!==businessId)fail("Registro nuevo duplicado o de otra empresa.");
      ids.add(row.id);
      if(key==="cash"&&(!Number.isFinite(Number(row.amount))||Number(row.amount)<0||!["Ingreso","Egreso"].includes(row.type)))fail("Movimiento de caja inválido.");
      if(key==="sales"&&(!Number.isFinite(Number(row.total))||Number(row.total)<0))fail("Importe de venta inválido.");
      if(key==="stockMoves"&&(!Number.isFinite(Number(row.qty))||Number(row.qty)<=0))fail("Cantidad de inventario inválida.");
    }
    out[key]=[...cloneJSON(old),...cloneJSON(next.slice(old.length))];
  }
  return out;
}
