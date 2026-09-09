/* ===== FASE 20.14 — IDENTIDAD + TERMINOLOGÍA MULTINEGOCIO ===== */
(function(){
  const A=window.App;
  if(!A)return;

  const normalize=v=>String(v||"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

  A.businessVocabulary=function(){
    const current=window.SaaS?.currentBusiness?.();
    const type=normalize(current?.type||A.db?.meta?.businessType||"");
    const generic={
      staff:"Profesionales",
      staffOne:"profesional",
      staffMany:"profesionales",
      business:"negocio",
      bookingPerson:"profesional",
      staffRole:"Profesional",
      staffPhoto:"Fotos de profesionales"
    };
    if(type.includes("barber")) return {...generic,staff:"Barberos",staffOne:"barbero",staffMany:"barberos",business:"barbería",bookingPerson:"barbero",staffRole:"Barbero",staffPhoto:"Fotos de barberos"};
    if(type.includes("salon")||type.includes("belleza")||type.includes("peluquer")) return {...generic,staff:"Estilistas",staffOne:"estilista",staffMany:"estilistas",business:"salón",bookingPerson:"estilista",staffRole:"Estilista",staffPhoto:"Fotos de estilistas"};
    if(type.includes("una")||type.includes("nail")) return {...generic,staff:"Profesionales",staffOne:"profesional",staffMany:"profesionales",business:"estudio de uñas",bookingPerson:"profesional",staffRole:"Profesional",staffPhoto:"Fotos de profesionales"};
    if(type.includes("spa")) return {...generic,staff:"Profesionales",staffOne:"profesional",staffMany:"profesionales",business:"spa"};
    if(type.includes("clin")||type.includes("medic")||type.includes("dental")) return {...generic,staff:"Profesionales",staffOne:"profesional",staffMany:"profesionales",business:"clínica"};
    if(type.includes("taller")||type.includes("mecanic")) return {...generic,staff:"Técnicos",staffOne:"técnico",staffMany:"técnicos",business:"taller",bookingPerson:"técnico",staffRole:"Técnico",staffPhoto:"Fotos de técnicos"};
    if(type.includes("consult")) return {...generic,staff:"Profesionales",business:"consultorio"};
    return generic;
  };

  A.applyBusinessIdentity=function(){
    const role=window.SaaS?.session?.role||"guest";
    const current=window.SaaS?.currentBusiness?.();
    const name=current?.name||A.db?.business?.name||"Mi negocio";
    const type=current?.type||A.db?.meta?.businessType||"Negocio";
    const v=A.businessVocabulary();

    const brand=document.getElementById("activeBusinessBrand");
    const context=document.getElementById("activeBusinessContext");
    if(brand) brand.textContent="SAMBRIX";

    // FASE 20.17: el encabezado global nunca debe filtrar el último tenant
    // seleccionado dentro del SuperAdmin. El negocio solo se identifica
    // cuando la sesión pertenece realmente a Business.
    if(context){
      context.textContent=role==="superadmin"
        ? "SuperAdmin · Administración de plataforma"
        : `${name} · ${type}`;
    }

    const sessionBusiness=document.getElementById("sessionBusinessName");
    if(sessionBusiness){
      sessionBusiness.textContent=role==="superadmin"
        ? "Plataforma SAMBRIX"
        : `${name} · ${type}`;
    }

    window.SaaS?.renderCurrentPlanBadge?.();

    const cfg=document.getElementById("configBusinessNameLabel");
    if(cfg) cfg.textContent="Nombre del negocio";

    // Main owner dashboard terminology.
    const nav=document.querySelector('.bottom-nav [data-page="barberos"] span');
    if(nav) nav.textContent=v.staff;
    const pageTitle=document.querySelector('#barberos .page-head h2');
    if(pageTitle) pageTitle.textContent=v.staff;
    const teamTitle=document.querySelector('#inicio #ownerBarberPerformance')?.closest('.panel')?.querySelector('h3');
    if(teamTitle) teamTitle.textContent=`Rendimiento de ${v.staffMany}`;
    const summary=document.getElementById("homeSummary");
    if(summary){
      summary.querySelectorAll("strong").forEach(el=>{if(el.textContent.trim()==="Barberos")el.textContent=v.staff;});
    }

    const barberPage=document.getElementById("barberos");
    if(barberPage){
      barberPage.querySelectorAll("button,label,h2,h3,p,small,span").forEach(el=>{
        if(el.children.length && !["BUTTON","LABEL"].includes(el.tagName))return;
        const t=el.textContent.trim();
        if(t==="Barberos")el.textContent=v.staff;
        if(t==="+ Barbero")el.textContent=`+ ${v.staffOne.charAt(0).toUpperCase()+v.staffOne.slice(1)}`;
        if(t==="Guardar barbero")el.textContent=`Guardar ${v.staffOne}`;
      });
    }

    // Generic placeholders and owner-facing wording.
    const search=document.getElementById("appointmentSearch");
    if(search)search.placeholder=`Buscar por cliente, ${v.staffOne} o servicio...`;
    const hero=document.querySelector("#inicio .legacy-hero h2");
    if(hero)hero.textContent="Control del negocio";


    // Reports, configuration and owner-facing labels.
    document.querySelectorAll("#reportes h3, #reportes strong, #reportes span").forEach(el=>{
      if(el.children.length)return;
      const txt=(el.textContent||"").trim();
      if(txt==="Rendimiento por barbero")el.textContent=`Rendimiento por ${v.staffOne}`;
      if(txt==="Rendimiento barberos")el.textContent=`Rendimiento de ${v.staffMany}`;
    });

    const logoLabel=document.querySelector('label[for="clientLogoFile"]');
    if(logoLabel && /barber/i.test(logoLabel.textContent)) logoLabel.childNodes[0].nodeValue="Logo del negocio";

    document.querySelectorAll("#clienteConfig h3,#clienteConfig p,#clienteConfig label").forEach(el=>{
      if(el.children.length && el.tagName!=="LABEL")return;
      const txt=(el.childNodes[0]?.nodeValue||el.textContent||"").trim();
      if(/^Logo de la barber/i.test(txt) && el.childNodes[0]) el.childNodes[0].nodeValue="Logo del negocio";
      if(/^Fotos de barberos$/i.test(txt)) el.textContent=v.staffPhoto;
    });

    // User/member role selector: keep internal value "barber" but show a neutral label.
    document.querySelectorAll('select option[value="barber"]').forEach(opt=>{
      opt.textContent=`${v.staffRole}/Empleado`;
    });

    // Configuration language must stay universal.
    document.querySelectorAll("#configuracion label").forEach(label=>{
      const txt=(label.childNodes[0]?.nodeValue||"").trim();
      if(/^Nombre de la barber/i.test(txt)) label.childNodes[0].nodeValue="Nombre del negocio";
    });

    // Public/client experience follows the tenant too.
    const clientBrand=document.getElementById("clientBrandNameView");
    if(clientBrand)clientBrand.textContent=A.db?.business?.clientApp?.brandName||name;
    const badge=document.querySelector("#clientHome .client-badge");
    if(badge)badge.textContent=String(type||"NEGOCIO").toUpperCase();
    const clientSubtitle=document.getElementById("clientHeroSubtitleView");
    if(clientSubtitle && /barbero/i.test(clientSubtitle.textContent)) clientSubtitle.textContent=`Elige servicio, ${v.bookingPerson} y horario disponible.`;
    document.querySelectorAll("#clientApp h2,#clientApp h3,#clientApp p,#clientApp span,#clientApp small").forEach(el=>{
      if(el.children.length)return;
      const txt=(el.textContent||"").trim();
      if(txt==="Barberos")el.textContent=v.staff;
      if(txt==="2. Barbero")el.textContent=`2. ${v.staffOne.charAt(0).toUpperCase()+v.staffOne.slice(1)}`;
      if(txt==="Barbero")el.textContent=v.staffOne.charAt(0).toUpperCase()+v.staffOne.slice(1);
      if(/Productos disponibles para comprar en la barbería\./i.test(txt))el.textContent="Productos disponibles para comprar en este negocio.";
      if(/Asignaremos un barbero libre\./i.test(txt))el.textContent=`Asignaremos ${v.staffOne==="profesional"?"un profesional disponible":`un ${v.staffOne} disponible`}.`;
    });
  };

  const oldRender=A.renderAll?.bind(A);
  if(oldRender && !A.__businessTerminologyInstalled){
    A.renderAll=function(){
      const out=oldRender();
      A.applyBusinessIdentity();
      return out;
    };
    A.__businessTerminologyInstalled=true;
  }
})();
