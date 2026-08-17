
function clone(v){return JSON.parse(JSON.stringify(v??null))}
function stripAssets(v){
  if(v===null||v===undefined)return v;
  if(typeof v==="string")return v.startsWith("data:image/")?"":v;
  if(Array.isArray(v))return v.map(stripAssets);
  if(typeof v==="object"){
    const out={};
    for(const [k,val] of Object.entries(v)){
      if(k==="barberPhotos"){out[k]={};continue}
      if(k==="logo"||k==="background"||k==="photo"){out[k]="";continue}
      out[k]=stripAssets(val);
    }
    return out;
  }
  return v;
}
export function getLocalAssets(db){
  return {
    logo:db?.business?.clientApp?.logo||"",
    background:db?.business?.clientApp?.background||"",
    barberPhotos:clone(db?.business?.clientApp?.barberPhotos||{}),
    employeePhotos:Object.fromEntries((db?.employees||[]).map(e=>[e.id,e.photo||""]))
  };
}
export function splitCloudState(db){
  const d=stripAssets(clone(db));
  return {
    config:{business:d.business||{},users:d.users||[],barbers:d.barbers||[],services:d.services||[],products:d.products||[],employees:d.employees||[]},
    operations:{clients:d.clients||[],appointments:d.appointments||[],cash:d.cash||[],stockMoves:d.stockMoves||[],sales:d.sales||[],approvalRequests:d.approvalRequests||[],clientRequests:d.clientRequests||[],shopOrders:d.shopOrders||[]},
    history:{auditLog:d.auditLog||[],clientActivity:d.clientActivity||[],attendance:d.attendance||[],absences:d.absences||[]}
  };
}
export function combineCloudState(config={},operations={},history={}){return {...config,...operations,...history}}
export function restoreLocalAssets(db,a){
  db.business=db.business||{};db.business.clientApp=db.business.clientApp||{};
  db.business.clientApp.logo=a.logo||"";db.business.clientApp.background=a.background||"";db.business.clientApp.barberPhotos=a.barberPhotos||{};
  db.employees=(db.employees||[]).map(e=>({...e,photo:a.employeePhotos?.[e.id]||e.photo||""}));
  return db;
}
