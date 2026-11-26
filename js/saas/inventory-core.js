/* Inventory operations are atomic, one product at a time. */
export function buildInventoryOperation({payload,businessId,actor,operationId,kind,productId,values={},quantity,reason,date}){
  if(!Array.isArray(payload.products)||!Array.isArray(payload.stockMoves))throw Error("Inventario inválido.");
  const products=[...payload.products],stockMoves=[...payload.stockMoves],index=products.findIndex(p=>p.id===productId),old=products[index];
  const why=String(reason||"").trim();
  if(!["CREATE","EDIT","ENTRY","EXIT","ARCHIVE"].includes(kind)||why.length<5||why.length>500||!productId||!operationId)throw Error("Operación o motivo inválido.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error("Fecha inválida.");
  if(kind==="CREATE"?index!==-1:!old||old.archived===true||old.businessId&&old.businessId!==businessId)throw Error("Producto inexistente, archivado o duplicado.");
  const number=(v,integer=false)=>{const n=Number(v);if(v===""||v==null||!Number.isFinite(n)||n<0||n>9999999||(integer&&!Number.isSafeInteger(n)))throw Error("Cantidad o importe inválido.");return n;};
  let next,move=null;
  if(kind==="CREATE"||kind==="EDIT"){
    const name=String(values.name||"").trim(),category=String(values.category||"").trim();
    if(!name||name.length>120||!category||category.length>80)throw Error("Nombre o categoría inválidos.");
    const photo=String(values.photo??old?.photo??"");
    if(photo.length>400000||photo&&!/^data:image\/(jpeg|png|webp);base64,/.test(photo)&&!/^https:\/\//.test(photo))throw Error("Imagen inválida o demasiado grande.");
    next={...old,id:productId,name,category,stock:old?number(old.stock,true):0,min:number(values.min??0,true),cost:number(values.cost??0),price:number(values.price??0),photo};
    if(!old){next.businessId=businessId;next.archived=false;}
  }else if(kind==="ARCHIVE"){
    if(number(old.stock,true)!==0)throw Error("Primero regulariza las existencias a cero.");
    next={...old,archived:true};
  }else{
    const qty=number(quantity,true),before=number(old.stock,true),after=before+(kind==="ENTRY"?qty:-qty);
    if(qty<=0||after<0||after>9999999)throw Error("Cantidad inválida o stock insuficiente.");
    next={...old,stock:after};
    move={id:"stock_"+operationId,productId,type:kind==="ENTRY"?"Entrada":"Salida",qty,reason:why,date,businessId,branchId:String(old.branchId||""),createdBy:actor,stockBefore:before,stockAfter:after,operationId,productName:String(old.name||"Producto")};
    stockMoves.push(move);
  }
  if(kind==="CREATE")products.push(next);else products[index]=next;
  return {payload:{...payload,products,stockMoves},record:{businessId,productId,productIndex:kind==="CREATE"?products.length-1:index,kind,reason:why,actorUid:actor,date,movement:move}};
}
export async function applyInventoryOperation({db,sdk,businessId,actor,email="",check=()=>{},...args}){
  const {doc,collection,runTransaction,serverTimestamp}=sdk;
  const ref=doc(db,"businesses",businessId,"state","inventory"),operation=doc(collection(db,"businesses",businessId,"inventory_operations")),event=doc(collection(db,"businesses",businessId,"state_events"));
  return runTransaction(db,async tx=>{
    check();const snap=await tx.get(ref);
    if(!snap.exists()||snap.data().businessId!==businessId)throw Error("Inventario no verificado.");
    const result=buildInventoryOperation({...args,payload:snap.data().payload,businessId,actor,operationId:operation.id});
    check();const revision=Number(snap.data().syncRevision||0)+1;
    tx.set(operation,{...result.record,revision,createdAt:serverTimestamp()});
    tx.set(event,{businessId,domain:"inventory",revision,actorUid:actor,createdAt:serverTimestamp()});
    tx.update(ref,{businessId,payload:result.payload,updatedByUid:actor,updatedBy:email,updatedAt:serverTimestamp(),syncRevision:revision,auditId:event.id,inventoryOperationId:operation.id});
    return {id:operation.id,...result.record};
  });
}
