
SaaS.ownerCredentialIterations=120000;

SaaS.bytesToBase64=function(bytes){
  let binary="";
  bytes.forEach(b=>binary+=String.fromCharCode(b));
  return btoa(binary);
};

SaaS.base64ToBytes=function(value){
  const binary=atob(value);
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
};

SaaS.deriveOwnerPasswordHash=async function(password,salt,iterations=SaaS.ownerCredentialIterations){
  if(!window.crypto?.subtle)throw new Error("Este navegador no permite validar credenciales locales de forma segura.");
  const enc=new TextEncoder();
  const material=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits(
    {name:"PBKDF2",hash:"SHA-256",salt,iterations},
    material,
    256
  );
  return new Uint8Array(bits);
};

SaaS.createLocalReviewCredential=async function(business,password){
  if(!business||!password||password.length<8)throw new Error("Usa una contraseña de al menos 8 caracteres.");
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const hash=await SaaS.deriveOwnerPasswordHash(password,salt);
  business.localReviewCredential={
    algorithm:"PBKDF2-SHA256",
    iterations:SaaS.ownerCredentialIterations,
    salt:SaaS.bytesToBase64(salt),
    hash:SaaS.bytesToBase64(hash),
    updatedAt:new Date().toISOString()
  };
  business.ownerAccessStatus="local-review";
  const owner=(business.members||[]).find(m=>String(m.role||"").toLowerCase()==="owner");
  if(owner)owner.authStatus="local-review";
  SaaS.save();
  return {status:"local-review",detail:"Acceso local de prueba creado. No sustituye Firebase para producción."};
};

SaaS.verifyLocalReviewCredential=async function(business,password){
  const c=business?.localReviewCredential;
  if(!c?.salt||!c?.hash)return false;
  const salt=SaaS.base64ToBytes(c.salt);
  const actual=await SaaS.deriveOwnerPasswordHash(password,salt,Number(c.iterations||SaaS.ownerCredentialIterations));
  const expected=SaaS.base64ToBytes(c.hash);
  if(actual.length!==expected.length)return false;
  let diff=0;
  for(let i=0;i<actual.length;i++)diff|=actual[i]^expected[i];
  return diff===0;
};

SaaS.ownerLoginLocal=async function(email,password){
  const normalized=String(email||"").trim().toLowerCase();
  const business=(SaaS.db.businesses||[]).find(b=>String(b.ownerEmail||"").toLowerCase()===normalized);
  if(!business)return null;
  const ok=await SaaS.verifyLocalReviewCredential(business,password);
  if(!ok)return null;
  return {
    business,
    role:"owner",
    reviewAccess:true,
    user:{email:normalized,name:business.owner||normalized,localReview:true}
  };
};

SaaS.ownerLoginFirebase=async function(email,password){
  if(!window.FirebaseBridge?.loginWithEmailPassword||!window.SaaSAuthAdmin?.myBusinessMemberships)return null;
  try{
    const user=await FirebaseBridge.loginWithEmailPassword(email,password);
    let resolved=await SaaSAuthAdmin.resolveMyBusiness?.();
    if(!resolved){
      const memberships=await SaaSAuthAdmin.myBusinessMemberships?.()||[];
      const membership=memberships[0];
      const business=membership?SaaS.db.businesses.find(b=>b.id===membership.businessId):null;
      if(business)resolved={business,membership};
    }
    if(!resolved?.membership||!resolved?.business)return null;
    const {business,membership}=resolved;
    if(!SaaS.db.businesses.some(b=>b.id===business.id)){SaaS.db.businesses.push(business);SaaS.save?.();}
    return {business,role:membership.role||"owner",reviewAccess:false,user:{email:user.email,uid:user.uid,name:membership.name||user.email}};
  }catch{
    return null;
  }
};

SaaS.loginBusinessOwner=async function(email,password){
  let result=null;

  // Prefer real Firebase when available.
  if(window.FirebaseBridge?.loginWithEmailPassword){
    result=await SaaS.ownerLoginFirebase(email,password);
  }

  // Local review is permitted only in non-production builds.
  if(!result && !window.App?.PRODUCTION_MODE){
    result=await SaaS.ownerLoginLocal(email,password);
  }

  if(!result)return false;

  const b=result.business;
  const switched=SaaS.switchTenant?.(b.id,{support:false});
  if(switched===false)throw new Error("No se pudo cargar el negocio asociado a este usuario.");

  // Defensive tenant assertion: never continue into another business.
  if(String(window.App?.db?.meta?.businessId||"")!==String(b.id)){
    throw new Error("SAMBRIX bloqueó una carga de negocio incorrecta.");
  }

  SaaS.session={
    role:result.role||"owner",
    user:result.user,
    businessId:b.id,
    branchId:b.branches?.[0]?.id||"",
    reviewAccess:!!result.reviewAccess
  };

  document.body.dataset.sambrixRole=SaaS.session.role;
  document.body.dataset.ownerAccessMode=result.reviewAccess?"local-review":"firebase";
  document.getElementById("loginView")?.classList.add("hidden");
  document.getElementById("sambrixPortal")?.classList.add("hidden");
  document.getElementById("adminApp")?.classList.remove("hidden");

  SaaS.applyRoleUI?.();
  window.App?.renderAll?.();
  SaaS.renderOwnerAccessBadge?.();

  // Always enter the business owner dashboard, never the client/store view.
  document.getElementById("clientApp")?.classList.add("hidden");
  window.App?.go?.("inicio");
  window.SaaSCloudProduction?.syncForCurrentSession?.().catch?.(console.error);

  return true;
};

SaaS.renderOwnerAccessBadge=function(){
  const badge=document.getElementById("sessionRoleBadge");
  const role=document.getElementById("sessionRoleName");
  const business=document.getElementById("sessionBusinessName");
  if(!badge||!role||!business)return;

  if(SaaS.session?.reviewAccess){
    badge.classList.remove("hidden");
    role.textContent="OWNER · PRUEBA LOCAL";
    business.textContent=SaaS.currentBusiness?.()?.name||"";
    badge.dataset.accessMode="local-review";
  }
};

SaaS.openOwnerAccessSetup=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  document.getElementById("ownerAccessBusinessId").value=businessId;
  document.getElementById("ownerAccessSetupTitle").textContent=`Acceso · ${b.name}`;
  document.getElementById("ownerAccessEmail").value=b.ownerEmail||"";
  document.getElementById("ownerAccessPassword").value="";
  document.getElementById("ownerAccessPasswordConfirm").value="";

  const firebaseReady=!!window.FirebaseBridge?.connected && !!window.SaaSAuthAdmin?.createBusinessMember;
  document.getElementById("ownerAccessModeNote").innerHTML=firebaseReady
    ?'<strong>Producción Firebase</strong><span>Se intentará crear un acceso real asociado a este negocio.</span>'
    :'<strong>Modo de prueba local</strong><span>La contraseña se guarda únicamente como hash PBKDF2. Sirve para probar Business localmente, pero no cuenta como acceso de producción.</span>';

  const modal=document.getElementById("ownerAccessSetupModal");
  modal?.classList.remove("hidden");
  modal?.classList.add("open");
};

SaaS.closeOwnerAccessSetup=function(){
  const modal=document.getElementById("ownerAccessSetupModal");
  if(!modal)return;
  modal.classList.remove("open");
  modal.classList.add("hidden");
  document.getElementById("ownerAccessPassword")&&(document.getElementById("ownerAccessPassword").value="");
  document.getElementById("ownerAccessPasswordConfirm")&&(document.getElementById("ownerAccessPasswordConfirm").value="");
};

SaaS.saveOwnerAccessSetup=async function(){
  const id=document.getElementById("ownerAccessBusinessId").value;
  const b=SaaS.db.businesses.find(x=>x.id===id);if(!b)return;
  const password=document.getElementById("ownerAccessPassword").value;
  const confirmPassword=document.getElementById("ownerAccessPasswordConfirm").value;

  if(password.length<8)return alert("La contraseña debe tener al menos 8 caracteres.");
  if(password!==confirmPassword)return alert("Las contraseñas no coinciden.");

  const btn=document.getElementById("saveOwnerAccessSetup");
  if(btn){
    btn.disabled=true;
    btn.textContent="Guardando...";
    btn.setAttribute("aria-busy","true");
  }

  try{
    let result=null;
    const firebaseReady=!!window.FirebaseBridge?.connected && !!window.SaaSAuthAdmin?.createBusinessMember;
    if(window.App?.PRODUCTION_MODE && !firebaseReady){
      throw new Error("Firebase debe estar conectado para crear accesos de producción.");
    }

    if(firebaseReady){
      try{
        const user=await SaaSAuthAdmin.createBusinessMember({
          businessId:b.id,
          name:b.owner,
          email:b.ownerEmail,
          password,
          role:"owner"
        });
        b.ownerAccessStatus="active";
        const owner=(b.members||[]).find(m=>String(m.role||"").toLowerCase()==="owner");
        if(owner){owner.authStatus="active";owner.firebaseUid=user.uid;}
        result={status:"active",detail:"Acceso Firebase creado correctamente."};
      }catch(error){
        if(window.App?.PRODUCTION_MODE) throw error;
        result=await SaaS.createLocalReviewCredential(b,password);
        result.detail=`Firebase no pudo crear el usuario (${error?.message||"error"}). Se creó acceso local de prueba.`;
      }
    }else{
      result=await SaaS.createLocalReviewCredential(b,password);
    }

    SaaS.save();
    SaaS.audit?.("SECURITY","Acceso del propietario configurado",{status:result.status,email:b.ownerEmail},b.id);
    SaaS.closeOwnerAccessSetup();
    SaaS.renderActivation?.();
    SaaS.renderAll?.();
    window.App?.toast?.(result.status==="active"?"Acceso del propietario activo":"Acceso local de prueba creado");
  }catch(error){
    alert(error?.message||"No se pudo configurar el acceso.");
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent="Guardar acceso";
      btn.removeAttribute("aria-busy");
    }
  }
};
