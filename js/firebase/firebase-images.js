import {firestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "./firebase-core.js";

const COL="barberia_assets";
const DOC="images";
let unsubscribe=null;

function resizeImageFile(file,maxSize=520,quality=0.78){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve("");
    if(!file.type?.startsWith("image/"))return reject(new Error("El archivo seleccionado no es una imagen."));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("No se pudo leer la imagen."));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("No se pudo cargar la imagen."));
      img.onload=()=>{
        try{
          let {width,height}=img;
          if(width>height){
            if(width>maxSize){height=Math.round(height*(maxSize/width));width=maxSize}
          }else{
            if(height>maxSize){width=Math.round(width*(maxSize/height));height=maxSize}
          }
          const canvas=document.createElement("canvas");
          canvas.width=width;canvas.height=height;
          const ctx=canvas.getContext("2d",{alpha:false});
          ctx.drawImage(img,0,0,width,height);
          resolve(canvas.toDataURL("image/jpeg",quality));
        }catch(e){reject(e)}
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function compressLogo(file){
  return await resizeImageFile(file,420,0.80);
}
export async function compressBackground(file){
  return await resizeImageFile(file,900,0.72);
}
export async function compressBarberPhoto(file){
  return await resizeImageFile(file,520,0.78);
}
export async function compressEmployeePhoto(file){
  return await resizeImageFile(file,520,0.78);
}

function currentAssets(){
  const App=window.App;
  return {
    logo:App?.db?.business?.clientApp?.logo||"",
    background:App?.db?.business?.clientApp?.background||"",
    barberPhotos:App?.db?.business?.clientApp?.barberPhotos||{},
    employeePhotos:Object.fromEntries((App?.db?.employees||[]).map(e=>[e.id,e.photo||""]))
  };
}

function applyAssets(data){
  const App=window.App;if(!App?.db)return;
  App.db.business=App.db.business||{};
  App.db.business.clientApp=App.db.business.clientApp||{};
  App.db.business.clientApp.logo=data.logo||"";
  App.db.business.clientApp.background=data.background||"";
  App.db.business.clientApp.barberPhotos=data.barberPhotos||{};
  const emp=data.employeePhotos||{};
  App.db.employees=(App.db.employees||[]).map(e=>({...e,photo:emp[e.id]||e.photo||""}));
  localStorage.setItem(App.KEY,JSON.stringify(App.db));
  App.renderAll?.();
}

export async function uploadImages(){
  await setDoc(doc(firestore,COL,DOC),{
    payload:currentAssets(),
    updatedAt:serverTimestamp(),
    updatedBy:window.FirebaseBridge?.user?.email||""
  },{merge:true});
}

export async function downloadImages(){
  const snap=await getDoc(doc(firestore,COL,DOC));
  if(!snap.exists())throw new Error("Todavía no hay imágenes guardadas en Firebase.");
  applyAssets(snap.data()?.payload||{});
}

export function enableImageRealtime(){
  disableImageRealtime();
  unsubscribe=onSnapshot(doc(firestore,COL,DOC),snap=>{
    if(snap.exists()&&snap.data()?.payload)applyAssets(snap.data().payload);
  },err=>window.FirebaseBridge?.setError?.(err));
}
export function disableImageRealtime(){
  if(unsubscribe){try{unsubscribe()}catch{}}
  unsubscribe=null;
}

export function cloudImageStatus(){
  const a=currentAssets();
  return {
    hasLogo:!!a.logo,
    hasBackground:!!a.background,
    barberCount:Object.values(a.barberPhotos||{}).filter(Boolean).length,
    employeeCount:Object.values(a.employeePhotos||{}).filter(Boolean).length
  };
}


let imagePushTimer=null;
export function scheduleImagePush(){
  if(!window.FirebaseBridge?.connected)return;
  clearTimeout(imagePushTimer);
  imagePushTimer=setTimeout(async()=>{
    try{
      await uploadImages();
      window.FirebaseBridge?.setSynced?.();
    }catch(err){
      window.FirebaseBridge?.setError?.(err);
    }
  },1200);
}
