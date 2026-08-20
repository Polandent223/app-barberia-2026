
import {firestore,doc,getDoc,setDoc,collection,addDoc,onSnapshot,serverTimestamp} from "../firebase/firebase-core.js";
import {updateDoc} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

function publicSnapshot(){
  const A=window.App,b=SaaS.currentBusiness(),br=SaaS.currentBranch();
  const client=A.db.business?.clientApp||{};
  return {
    id:b.id,
    slug:(b.slug||b.id),
    whiteLabel:b.whiteLabel||{showPoweredBy:true},
    name:b.name,
    type:b.type,
    status:b.status,
    branch:{id:br?.id||"",name:br?.name||"",city:br?.city||"",address:br?.address||"",whatsapp:br?.whatsapp||""},
    branding:{
      brandName:client.brandName||b.name,
      heroTitle:client.heroTitle||"",
      heroSubtitle:client.heroSubtitle||"",
      theme:client.theme||"light",
      primary:client.primary||"#c89a4b",
      secondary:client.secondary||"#111111",
      logo:client.logo||"",
      background:client.background||"",
      promotions:client.promotions||[],
      barberPhotos:client.barberPhotos||{},
      whatsapp:client.whatsapp||"",
      instagram:client.instagram||"",
      tiktok:client.tiktok||"",
      facebook:client.facebook||""
    },
    businessHours:{open:A.db.business?.open||"09:00",close:A.db.business?.close||"19:00"},
    services:(A.db.services||[]).map(s=>({id:s.id,name:s.name,price:Number(s.price||0),duration:Number(s.duration||40),description:s.description||""})),
    barbers:(A.db.barbers||[]).map(x=>({id:x.id,name:x.name})),
    products:(A.db.products||[]).filter(p=>p.stock>0&&p.price>0).map(p=>({id:p.id,name:p.name,price:Number(p.price),available:Number(p.stock)>0,category:p.category||""})),
    busy:(A.db.appointments||[]).filter(a=>a.status!=="Cancelada").map(a=>({barberId:a.barberId,date:a.date,time:a.time,serviceId:a.serviceId,status:a.status})),
    updatedAt:Date.now()
  };
}

export async function publishCurrentBusiness(){
  const b=SaaS.currentBusiness();if(!b)throw new Error("No hay negocio activo");
  const snap=publicSnapshot();
  await setDoc(doc(firestore,"public_businesses",b.id),{...snap,serverUpdatedAt:serverTimestamp()},{merge:true});
  return snap;
}

export async function loadPublicBusiness(id){
  const s=await getDoc(doc(firestore,"public_businesses",id));
  return s.exists()?s.data():null;
}

export async function createPublicBooking(businessId,data){
  return await addDoc(collection(firestore,"public_businesses",businessId,"booking_requests"),{
    ...data,status:"Pendiente",createdAt:serverTimestamp()
  });
}


export async function updateBookingRequest(businessId,requestId,data){
  await updateDoc(doc(firestore,"public_businesses",businessId,"booking_requests",requestId),data);
}

export function watchPublicBookingRequests(businessId,callback){
  return onSnapshot(collection(firestore,"public_businesses",businessId,"booking_requests"),snap=>{
    callback(snap.docs.map(d=>({id:d.id,...d.data()})));
  });
}

window.NexoPublicCloud={publishCurrentBusiness,loadPublicBusiness,createPublicBooking,updateBookingRequest,watchPublicBookingRequests};
