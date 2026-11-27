
import {firestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "../firebase/firebase-core.js";
import {updateDoc,deleteDoc,collection,addDoc} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

function publicProfessionals(A){
  return (A.db.barbers||[]).map(x=>{
    const employee=(A.db.employees||[]).find(e=>e.barberId===x.id);
    const schedule=Array.isArray(employee?.schedule)?employee.schedule:Array.isArray(x.schedule)?x.schedule:null;
    return {id:x.id,name:x.name,schedule:schedule?schedule.map(d=>({day:Number(d.day),active:d.active===true,start:String(d.start||""),end:String(d.end||"")})):null};
  });
}
function publicSnapshot(){
  const A=window.App,b=SaaS.currentBusiness(),br=SaaS.currentBranch();
  const client=A.db.business?.clientApp||{};
  const canTheme=SaaS.planCapability?.("customTheme",b)===true,canPromotions=SaaS.planCapability?.("promotions",b)===true;
  return {
    id:b.id,
    slug:(b.slug||b.id),
    whiteLabel:b.whiteLabel||{showPoweredBy:true},
    name:b.name,
    type:b.type,
    status:b.accessSuspended===true?"Suspendido":b.status,
    timezone:b.timezone||"",
    branch:{id:br?.id||"",name:br?.name||"",city:br?.city||"",address:br?.address||"",whatsapp:br?.whatsapp||""},
    branding:{
      brandName:client.brandName||b.name,
      tagline:client.tagline||"",
      contactPhone:client.contactPhone||"",
      heroTitle:client.heroTitle||"",
      heroSubtitle:client.heroSubtitle||"",
      theme:canTheme&&["light","dark","soft"].includes(client.theme)?client.theme:"light",
      primary:canTheme&&/^#[0-9a-f]{6}$/i.test(client.primary||"")?client.primary:"#c89a4b",
      secondary:canTheme&&/^#[0-9a-f]{6}$/i.test(client.secondary||"")?client.secondary:"#111111",
      logo:client.logo||"",
      background:client.background||"",
      promotions:canPromotions&&Array.isArray(client.promotions)?client.promotions.slice(0,20).map(p=>({title:String(p?.title||"").slice(0,120),text:String(p?.text||"").slice(0,300)})):[],
      barberPhotos:client.barberPhotos||{},
      whatsapp:client.whatsapp||"",
      instagram:client.instagram||"",
      tiktok:client.tiktok||"",
      facebook:client.facebook||""
    },
    businessHours:{open:A.db.business?.open||"09:00",close:A.db.business?.close||"19:00"},
    services:(A.db.services||[]).map(s=>({id:s.id,name:s.name,price:Number(s.price||0),duration:Number(s.duration||40),description:s.description||""})),
    barbers:publicProfessionals(A),
    products:(A.db.products||[]).filter(p=>!p.archived&&p.stock>0&&p.price>0).map(p=>({id:p.id,name:p.name,price:Number(p.price),available:Number(p.stock)>0,category:p.category||""})),
    busy:(A.db.appointments||[]).filter(a=>!["Cancelada","Rechazada"].includes(a.status)).map(a=>({barberId:a.barberId,date:a.date,time:a.time,serviceId:a.serviceId,status:a.status})),
    updatedAt:Date.now()
  };
}

// Publish bounded thumbnails, never tenant-private records or original uploads.
async function serviceThumbnail(source){
  if(typeof source!=="string"||!source)return "";
  if(/^https:\/\//i.test(source))return source.length<=2048?source:"";
  if(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(source))return "";
  return await new Promise(resolve=>{
    const img=new Image();let done=false;
    const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value);};
    const timer=setTimeout(()=>finish(""),3000);
    img.onerror=()=>finish("");
    img.onload=()=>{try{
      const ratio=Math.min(1,240/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
      const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const value=canvas.toDataURL("image/jpeg",.65);finish(value.length<=35000?value:"");
    }catch{finish("");}};
    img.src=source;
  });
}
export async function publishCurrentBusiness(){
  const b=SaaS.currentBusiness();if(!b)throw new Error("No hay negocio activo");
  const snap=publicSnapshot(),actor=window.FirebaseBridge?.user?.uid;
  const source=new Map((window.App.db.services||[]).map(s=>[s.id,s.photo]));
  let remaining=Math.max(0,Math.min(180000,750000-new TextEncoder().encode(JSON.stringify(snap)).length));
  for(const service of snap.services){
    if(remaining<2048)break;
    const photo=await serviceThumbnail(source.get(service.id));
    if(photo&&photo.length<=remaining){service.photo=photo;remaining-=photo.length;}
  }
  if(SaaS.currentBusiness()?.id!==b.id||window.FirebaseBridge?.user?.uid!==actor)throw Error("La sesión o empresa cambió durante la publicación.");
  await setDoc(doc(firestore,"public_businesses",b.id),{...snap,serverUpdatedAt:serverTimestamp()},{merge:true});
  await publishCurrentAvailability();
  return snap;
}

export function availabilitySnapshot(){
  const A=window.App,b=SaaS.currentBusiness();if(!A?.db||!b)return null;
  return {
    businessId:b.id,
    businessHours:{open:A.db.business?.open||"09:00",close:A.db.business?.close||"19:00"},
    barbers:publicProfessionals(A),
    busy:(A.db.appointments||[]).filter(a=>!["Cancelada","Rechazada"].includes(a.status)).map(a=>({id:a.id||"",barberId:a.barberId,date:a.date,time:a.time,serviceId:a.serviceId,status:a.status,duration:Number(a.duration||0)})),
    updatedAt:Date.now()
  };
}

export async function publishCurrentAvailability(){
  const snap=availabilitySnapshot();if(!snap)return false;
  await setDoc(doc(firestore,"public_businesses",snap.businessId,"public_state","availability"),{...snap,serverUpdatedAt:serverTimestamp()},{merge:true});
  return snap;
}

export function watchPublicAvailability(businessId,callback){
  if(!businessId||typeof callback!=="function")return ()=>{};
  return onSnapshot(doc(firestore,"public_businesses",businessId,"public_state","availability"),s=>callback(s.exists()?s.data():null),e=>console.error("[SAMBRIX public availability]",e));
}

export async function loadPublicBusiness(id){
  const s=await getDoc(doc(firestore,"public_businesses",id));
  return s.exists()?s.data():null;
}

export function watchPublicBusiness(id,callback){
  if(!id||typeof callback!=="function")return ()=>{};
  return onSnapshot(doc(firestore,"public_businesses",id),s=>callback(s.exists()?s.data():null),e=>console.error("[SAMBRIX public business]",e));
}

export async function createPublicBooking(businessId,data){
  return await addDoc(collection(firestore,"public_businesses",businessId,"booking_requests"),{
    ...data,status:"Pendiente",createdAt:serverTimestamp()
  });
}


export async function updateBookingRequest(businessId,requestId,data){
  await updateDoc(doc(firestore,"public_businesses",businessId,"booking_requests",requestId),data);
}

export function bookingSlotId(barberId,date,time){
  return String(barberId||"")+"_"+String(date||"")+"_"+String(time||"");
}

export async function releaseBookingSlot(businessId,slotId){
  if(!businessId||!slotId)return;
  await deleteDoc(doc(firestore,"public_businesses",businessId,"booking_slots",slotId));
}

export async function releaseBookingSlotFor(businessId,barberId,date,time){
  const slotId=bookingSlotId(barberId,date,time);
  if(!businessId||!barberId||!date||!time)return;
  await releaseBookingSlot(businessId,slotId);
}

export function watchPublicBookingRequests(businessId,callback){
  return onSnapshot(collection(firestore,"public_businesses",businessId,"booking_requests"),snap=>{
    callback(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
}


export function watchBookingChangeRequests(businessId,callback){
  return onSnapshot(collection(firestore,"public_businesses",businessId,"booking_change_requests"),snap=>{
    callback(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
}

export async function updateBookingChangeRequest(businessId,requestId,data){
  await updateDoc(doc(firestore,"public_businesses",businessId,"booking_change_requests",requestId),data);
}

export async function updateClientAccount(businessId,uid,data){
  if(!businessId||!uid)return;
  const safe={};
  ["points","visits","lastVisit","status","name","phone"].forEach(k=>{if(data[k]!==undefined)safe[k]=data[k]});
  if(Object.keys(safe).length)await updateDoc(doc(firestore,"public_businesses",businessId,"client_accounts",uid),safe);
}

window.NexoPublicCloud={publishCurrentBusiness,availabilitySnapshot,publishCurrentAvailability,watchPublicAvailability,loadPublicBusiness,watchPublicBusiness,createPublicBooking,updateBookingRequest,bookingSlotId,releaseBookingSlot,releaseBookingSlotFor,watchPublicBookingRequests,watchBookingChangeRequests,updateBookingChangeRequest,updateClientAccount};
