
App.compressImageLocal=function(file,maxSize=520,quality=.78){
  return new Promise((resolve,reject)=>{
    if(!file)return resolve("");
    const r=new FileReader();
    r.onerror=()=>reject(new Error("No se pudo leer la imagen"));
    r.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("No se pudo cargar la imagen"));
      img.onload=()=>{
        let w=img.width,h=img.height;
        if(w>h&&w>maxSize){h=Math.round(h*(maxSize/w));w=maxSize}
        else if(h>=w&&h>maxSize){w=Math.round(w*(maxSize/h));h=maxSize}
        const c=document.createElement("canvas");c.width=w;c.height=h;
        c.getContext("2d",{alpha:false}).drawImage(img,0,0,w,h);
        resolve(c.toDataURL("image/jpeg",quality));
      };
      img.src=r.result;
    };
    r.readAsDataURL(file);
  });
};

App.fileToDataUrl=function(file,callback){
  if(!file)return callback("");
  const r=new FileReader();
  r.onload=()=>callback(r.result);
  r.readAsDataURL(file);
};

App.loadClientCustomization=function(){
  if(!App.byId("clientBrandName"))return;
  const c=App.db.business.clientApp=App.db.business.clientApp||{};

  App.byId("clientBrandName").value=c.brandName||App.db.business.name||"";
  if(App.byId("clientTagline"))App.byId("clientTagline").value=c.tagline||"";
  if(App.byId("clientContactPhone"))App.byId("clientContactPhone").value=c.contactPhone||"";
  App.byId("clientHeroTitle").value=c.heroTitle||"";
  App.byId("clientHeroSubtitle").value=c.heroSubtitle||"";
  App.byId("clientThemeMode").value=c.theme||"light";
  App.byId("clientPrimaryColor").value=c.primary||"#c89a4b";
  App.byId("clientSecondaryColor").value=c.secondary||"#111111";
  App.byId("clientWhatsappLink").value=c.whatsapp||"";
  App.byId("clientInstagramLink").value=c.instagram||"";
  App.byId("clientTiktokLink").value=c.tiktok||"";
  App.byId("clientFacebookLink").value=c.facebook||"";

  App.byId("clientLogoPreview").src=c.logo||"";
  App.byId("clientBackgroundPreview").src=c.background||"";

  App.renderPromotionEditor();
  App.renderBarberPhotoEditor();
  window.SaaS?.renderBrandingPlanAccess?.();
};

App.renderPromotionEditor=function(){
  const box=App.byId("promotionEditorList");if(!box)return;
  const p=App.db.business.clientApp.promotions||[];
  box.innerHTML=p.map((x,i)=>`<div class="promotion-editor">
    <label>Título<input value="${x.title||""}" onchange="App.updatePromotion(${i},'title',this.value)"></label>
    <label>Descuento / texto<input value="${x.text||""}" onchange="App.updatePromotion(${i},'text',this.value)"></label>
    <button class="btn danger" onclick="App.removePromotion(${i})">Eliminar</button>
  </div>`).join("")||'<div class="muted">Sin promociones configuradas.</div>';
};
App.addPromotion=function(){
  App.db.business.clientApp.promotions.push({title:"Nueva promoción",text:"10% OFF"});
  App.renderPromotionEditor();
};
App.updatePromotion=function(i,key,val){App.db.business.clientApp.promotions[i][key]=val};
App.removePromotion=function(i){App.db.business.clientApp.promotions.splice(i,1);App.renderPromotionEditor()};

App.renderBarberPhotoEditor=function(){
  const box=App.byId("barberPhotoEditor");if(!box)return;
  const photos=App.db.business.clientApp.barberPhotos||{};
  box.innerHTML=App.db.barbers.map(b=>`<article class="card barber-photo-card">
    <img src="${photos[b.id]||""}" alt="${b.name}">
    <div class="in"><h3>${b.name}</h3><label>Elegir foto<input type="file" accept="image/*" onchange="App.setBarberPhoto('${b.id}',this.files[0])"></label></div>
  </article>`).join("");
};
App.setBarberPhoto=function(id,file){
  App.compressImageLocal(file,520,.78).then(data=>{App.db.business.clientApp.barberPhotos[id]=data;App.renderBarberPhotoEditor();localStorage.setItem(App.KEY,JSON.stringify(App.db));window.FirebaseBridge?.scheduleImagePush?.();App.toast("Foto actualizada")}).catch(()=>App.toast("No se pudo procesar la foto"));
};

App.saveClientCustomization=function(){
  const c=App.db.business.clientApp=App.db.business.clientApp||{};
  const business=window.SaaS?.currentBusiness?.();
  const canTheme=window.SaaS?.planCapability?.("customTheme",business)??false;
  const canCover=window.SaaS?.planCapability?.("coverImage",business)??true;

  c.brandName=App.val("clientBrandName");
  c.tagline=App.val("clientTagline");
  c.contactPhone=App.val("clientContactPhone");
  c.heroTitle=App.val("clientHeroTitle");
  c.heroSubtitle=App.val("clientHeroSubtitle");

  if(canTheme){
    c.theme=App.val("clientThemeMode")||"light";
    c.primary=App.val("clientPrimaryColor")||"#c89a4b";
    c.secondary=App.val("clientSecondaryColor")||"#111111";
  }else{
    c.theme="light";
  }

  c.whatsapp=App.val("clientWhatsappLink");
  c.instagram=App.val("clientInstagramLink");
  c.tiktok=App.val("clientTiktokLink");
  c.facebook=App.val("clientFacebookLink");

  const logo=App.byId("clientLogoFile")?.files?.[0];
  const bg=canCover?App.byId("clientBackgroundFile")?.files?.[0]:null;

  const persist=()=>{
    App.logAction("App Cliente personalizada","App Cliente","Diseño actualizado");
    localStorage.setItem(App.KEY,JSON.stringify(App.db));
    window.SaaS?.saveTenantState?.(window.SaaS?.getContext?.().businessId,App.db);
    window.FirebaseBridge?.scheduleImagePush?.();
    App.applyClientCustomization();
    window.SaaS?.renderBrandingPlanAccess?.();
    App.renderAll();
    App.toast("App Cliente actualizada");
  };

  const jobs=[];
  if(logo)jobs.push(App.compressImageLocal(logo,420,.80).then(d=>{c.logo=d}));
  if(bg)jobs.push(App.compressImageLocal(bg,900,.72).then(d=>{c.background=d}));

  Promise.allSettled(jobs).then(persist);
};

App.applyClientCustomization=function(){
  const c=App.db.business.clientApp;if(!c)return;
  const app=App.byId("clientApp");if(!app)return;

  const business=window.SaaS?.currentBusiness?.();
  const canTheme=window.SaaS?.planCapability?.("customTheme",business)??false;

  app.classList.toggle("client-dark",canTheme&&c.theme==="dark");
  app.classList.toggle("client-light",!canTheme||c.theme!=="dark");

  if(canTheme){
    app.style.setProperty("--client-primary",c.primary||"#c89a4b");
    app.style.setProperty("--client-secondary",c.secondary||"#111111");
  }else{
    app.style.removeProperty("--client-primary");
    app.style.removeProperty("--client-secondary");
  }

  App.byId("clientBrandNameView").textContent=c.brandName||App.db.business.name;
  App.byId("clientBrandTagline").textContent=c.tagline||c.heroSubtitle||"Reserva con nosotros";
  App.byId("clientBrandLogo").src=c.logo||"";
  App.byId("clientHeroTitleView").innerHTML=(c.heroTitle||"Tu negocio. Tu momento.").replace(/\.\s+/,".<br><em>")+(c.heroTitle?.includes(".")?"</em>":"");
  App.byId("clientHeroSubtitleView").textContent=c.heroSubtitle||"";

  const hero=document.querySelector(".client-hero");
  if(hero){
    if(c.background){
      hero.classList.add("custom-bg");
      hero.style.backgroundImage=`linear-gradient(90deg,rgba(0,0,0,.58),rgba(0,0,0,.15)),url("${c.background}")`;
    }else{
      hero.classList.remove("custom-bg");
      hero.style.backgroundImage="";
    }
  }

  const canPromos=window.SaaS?.planCapability?.("promotions",business)??false;
  const promoBox=App.byId("clientPromotionsHome");
  const promoCard=promoBox?.closest(".client-card");
  if(promoCard)promoCard.hidden=!canPromos;
  if(promoBox&&canPromos){
    promoBox.innerHTML=(c.promotions||[]).map(p=>`<article class="promo-client-card"><span>OFERTA</span><h3>${p.title}</h3><strong>${p.text}</strong></article>`).join("")||'<div class="muted">No hay promociones activas.</div>';
  }

  const links=[["WhatsApp",c.whatsapp],["Instagram",c.instagram],["TikTok",c.tiktok],["Facebook",c.facebook]].filter(x=>x[1]);
  App.byId("clientSocialLinks").innerHTML=links.map(([n,u])=>`<a class="social-link" href="${u}" target="_blank" rel="noopener">${n}</a>`).join("")||'<div class="muted">Redes sociales no configuradas.</div>';
};

App.previewClientCustomization=function(){
  App.openClientApp();
};

App.previewSelectedImage=function(inputId,imgId){
  const f=App.byId(inputId).files[0];if(!f)return;
  App.fileToDataUrl(f,d=>App.byId(imgId).src=d);
};
