/* Append-only financial corrections. No payment is sent to a bank. */
export const kinds=["REFUND","VOID","DISCOUNT","CASH_REVERSAL"];
export function moneyCents(value){
  if(value===null||value===""||typeof value==="boolean")throw Error("Monto inválido.");
  const n=Number(value),c=Math.round(n*100);
  if(!Number.isFinite(n)||!Number.isSafeInteger(c)||c<0||c>999999900||Math.abs(n*100-c)>1e-6)throw Error("Monto inválido.");
  return c;
}
export function correctionSummary(finance,sourceId){
  const source=finance.cash?.find(x=>x.id===sourceId);
  if(!source||source.correctionId||!["Ingreso","Egreso"].includes(source.type))throw Error("Movimiento original inválido.");
  const original=moneyCents(source.amount),rows=finance.cash.filter(x=>x.correctionOf===sourceId);
  const corrected=rows.reduce((sum,row)=>sum+moneyCents(row.amount),0);
  if(corrected>original)throw Error("Historial de correcciones inconsistente.");
  return {source,original,corrected,remaining:original-corrected};
}
export function buildCorrection({finance,businessId,sourceId,kind,amount,reason,actor,correctionId,date,previousCents}){
  const summary=correctionSummary(finance,sourceId),{source,original,corrected,remaining}=summary;
  const saleId=String(source.saleId||""),cents=moneyCents(amount),why=String(reason||"").trim();
  if(source.businessId&&source.businessId!==businessId)throw Error("Movimiento de otra empresa.");
  if(!kinds.includes(kind)||why.length<5||why.length>500||cents<=0||cents>remaining||corrected!==previousCents)throw Error("Monto, motivo o saldo de corrección inválido.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Fecha inválida.");
  if(kind==="CASH_REVERSAL"){
    if(saleId||cents!==remaining)throw Error("Una corrección manual debe revertir el saldo completo y no pertenecer a un recibo.");
  }else{
    if(source.type!=="Ingreso"||!saleId||!finance.sales?.some(x=>x.id===saleId))throw Error("El movimiento no pertenece a un recibo de venta.");
    if(kind==="VOID"&&cents!==remaining)throw Error("La anulación debe cubrir todo el importe restante.");
  }
  if(!correctionId||finance.cash.some(x=>x.id==="adj_"+correctionId))throw Error("Corrección duplicada.");
  const cashEntry={id:"adj_"+correctionId,type:source.type==="Ingreso"?"Egreso":"Ingreso",concept:({REFUND:"Devolución",VOID:"Anulación de saldo",DISCOUNT:"Descuento posterior",CASH_REVERSAL:"Reversión de caja"})[kind],amount:cents/100,method:String(source.method||"No especificado"),date,currency:String(source.currency||"$"),businessId,branchId:String(source.branchId||""),correctionId,correctionOf:sourceId,correctionKind:kind,createdBy:actor};
  if(saleId)cashEntry.originalSaleId=saleId;
  return {businessId,sourceId,sourceIndex:finance.cash.indexOf(source),kind,amountCents:cents,previousCents,cumulativeCents:corrected+cents,saleId,reason:why,actorUid:actor,cashEntry,originalCents:original};
}
export async function applyCorrection({db,sdk,businessId,sourceId,kind,amount,reason,actor,email="",date,check=()=>{}}){
  const {doc,collection,runTransaction,serverTimestamp}=sdk;
  const financeRef=doc(db,"businesses",businessId,"state","finance"),totalRef=doc(db,"businesses",businessId,"correction_totals",sourceId),correction=doc(collection(db,"businesses",businessId,"financial_corrections")),event=doc(collection(db,"businesses",businessId,"state_events"));
  return runTransaction(db,async tx=>{
    check();const [f,t]=await Promise.all([tx.get(financeRef),tx.get(totalRef)]);
    if(!f.exists()||f.data().businessId!==businessId||!Array.isArray(f.data().payload?.cash))throw Error("Caja no verificada.");
    if(t.exists()&&(t.data().businessId!==businessId||t.data().sourceId!==sourceId))throw Error("Saldo de corrección inválido.");
    const finance=f.data().payload,previousCents=t.exists()?t.data().cents:0;
    const record=buildCorrection({finance,businessId,sourceId,kind,amount,reason,actor,correctionId:correction.id,date,previousCents});
    check();const revision=Number(f.data().syncRevision||0)+1;
    const {originalCents,...data}=record;
    tx.set(correction,{...data,createdAt:serverTimestamp()});
    tx.set(totalRef,{businessId,sourceId,cents:record.cumulativeCents,lastCorrectionId:correction.id,actorUid:actor,updatedAt:serverTimestamp()});
    tx.set(event,{businessId,domain:"finance",revision,actorUid:actor,createdAt:serverTimestamp()});
    tx.update(financeRef,{businessId,payload:{...finance,cash:[...finance.cash,record.cashEntry]},updatedByUid:actor,updatedBy:email,updatedAt:serverTimestamp(),syncRevision:revision,auditId:event.id});
    return {id:correction.id,...record};
  });
}
export function refundTotal(cash,from="0000-01-01",to="9999-12-31"){
  return (cash||[]).filter(x=>x.type==="Egreso"&&x.originalSaleId&&x.correctionId&&x.date>=from&&x.date<=to).reduce((sum,x)=>sum+moneyCents(x.amount),0)/100;
}
