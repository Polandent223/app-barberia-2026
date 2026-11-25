/* SAMBRIX Business — modular navigation using the existing role and plan policies. */
(() => {
  "use strict";
  const GROUPS=[
    {id:"agenda",number:"01",title:"Agenda y reservas",description:"Citas, disponibilidad y solicitudes",pages:[["citas","Citas","Registrar y consultar citas"],["reservas","Reservas en línea","Canal de reservas"],["bookingInbox","Solicitudes de reserva","Revisar solicitudes pendientes"]]},
    {id:"clients",number:"02",title:"Clientes",description:"Directorio e información de clientes",pages:[["clientes","Directorio de clientes","Consultar y gestionar clientes"],["clienteSolicitudes","Solicitudes de clientes","Atender solicitudes"]]},
    {id:"services",number:"03",title:"Servicios",description:"Servicios, precios y profesionales",pages:[["servicios","Catálogo de servicios","Servicios y precios"],["barberos","Profesionales","Equipo de atención"]]},
    {id:"cash",number:"04",title:"Caja y ventas",description:"Movimientos y comprobantes",pages:[["caja","Caja","Ingresos, egresos y ventas"],["recibos","Comprobantes","Consultar recibos"],["autorizaciones","Autorizaciones","Revisar operaciones pendientes"]]},
    {id:"stock",number:"05",title:"Inventario",description:"Productos y existencias",pages:[["inventario","Productos y stock","Gestionar inventario"]]},
    {id:"team",number:"06",title:"Personal",description:"Empleados, horarios y asistencia",pages:[["personal","Empleados","Gestionar el equipo"],["asistencia","Asistencia","Registro de asistencia"],["horariosPersonal","Horarios","Horarios del personal"],["rendimientoPersonal","Rendimiento","Indicadores del equipo"],["historialPersonal","Historial","Historial del personal"],["ausenciasPersonal","Ausencias","Permisos y ausencias"],["nominaPersonal","Nómina","Control de nómina"],["usuarios","Usuarios y roles","Permisos de acceso"]]},
    {id:"reports",number:"07",title:"Reportes",description:"Indicadores e historial del negocio",pages:[["reportes","Reportes","Consultar resultados"],["auditoria","Auditoría","Consultar historial"]]},
    {id:"settings",number:"08",title:"Configuración",description:"Datos, sucursales y aplicación de clientes",pages:[["configuracion","Datos del negocio","Preferencias y datos"],["branches","Sucursales","Gestionar sucursales"],["clienteConfig","Aplicación de clientes","Personalizar experiencia"]]},
    {id:"support",number:"09",title:"Soporte y avisos",description:"Contacta a SAMBRIX",pages:[["notificationsHub","Avisos","Consultar notificaciones"]]}
  ];
  const roles=new Set(["owner","admin","manager","reception","cashier","barber"]);
  const names={owner:"Propietario",admin:"Administrador",manager:"Gerente",reception:"Recepción",cashier:"Cajero",barber:"Profesional"};
  const $=id=>document.getElementById(id),S=()=>window.SaaS;
  const role=()=>String(S()?.session?.role||"");
  const valid=()=>roles.has(role())&&!!S()?.session?.businessId;
  const biz=()=>S()?.currentBusiness?.();
  const token=()=>String(window.FirebaseBridge?.user?.uid||"")+":"+String(S()?.session?.businessId||"")+":"+role();
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  function permitted(id){
    if(!valid()||!$(id)||!S()?.pageAllowed?.(id))return false;
    // Support is independent of the commercial feature matrix. For every operational
    // page use the existing plan policy, rather than inventing new entitlements.
    if(id==="notificationsHub")return true;
    return S()?.featureAllowed?.(id,biz())===true;
  }
  function visibleGroups(){return GROUPS.map(g=>({...g,pages:g.pages.filter(p=>permitted(p[0]))})).filter(g=>g.pages.length||g.id==="support");}
  function e(tag,text="",cls=""){const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x;}
  function button(text,fn,cls=""){const b=e("button",text,cls);b.type="button";b.addEventListener("click",fn);return b;}
  let root,nav,grid,search,headline,desc,context,summary,main,app,mode="menu",group="",session="",lastPage="",signature="",scheduled=false;
  function page(){return main?.querySelector(".page.active")?.id||"";}
  function showMenu(id=""){
    if(!valid())return;
    group=id;mode="menu";root.hidden=false;app.dataset.businessWorkspaceView="menu";
    draw();window.scrollTo({top:0,behavior:"auto"});
  }
  function go(id){
    if(!permitted(id)){window.App?.toast?.("Esta herramienta no está disponible para tu cargo o plan.");return;}
    window.App?.go?.(id);
    if(page()===id){mode="page";root.hidden=true;app.dataset.businessWorkspaceView="page";lastPage=id;updateNav();window.scrollTo({top:0,behavior:"auto"});}
  }
  function support(){if(valid())S()?.openSupportTicket?.();}
  function tile(number,title,description,action,terms=""){
    const b=button("",action,"business-tile"),badge=e("span",number,"business-tile-mark"),copy=e("span");
    badge.setAttribute("aria-hidden","true");copy.append(e("strong",title),e("small",description));b.append(badge,copy);b.dataset.search=norm(title+" "+description+" "+terms);return b;
  }
  function updateNav(){
    const g=visibleGroups().find(x=>x.id===group);
    context.textContent=(biz()?.name||"Mi negocio")+" · "+(names[role()]||"");
    nav.querySelector("[data-business-home]").hidden=mode==="menu"&&!g;
    nav.querySelector("[data-business-area]").hidden=mode==="menu"||!g;
    nav.querySelector("[data-business-summary]").hidden=!permitted("inicio")||mode==="page"&&page()==="inicio";
  }
  function draw(){
    const groups=visibleGroups(),active=groups.find(x=>x.id===group);if(group&&!active)group="";
    headline.textContent=active?.title||"Mi negocio";
    desc.textContent=active?.description||"Elige el área de trabajo que necesitas.";
    search.value="";search.placeholder=active?"Buscar herramienta…":"Buscar área…";search.setAttribute("aria-label",search.placeholder);
    grid.replaceChildren();
    if(active){for(const [id,title,detail] of active.pages)grid.append(tile("→",title,detail,()=>go(id)));if(active.id==="support")grid.append(tile("?", "Contactar soporte","Enviar una solicitud a SAMBRIX",support));}
    else for(const g of groups){grid.append(tile(g.number,g.title,g.description,()=>showMenu(g.id),g.pages.map(p=>p[1]).join(" ")));}
    summary.textContent="";updateNav();
  }
  function filter(){const q=norm(search.value);let count=0;for(const card of grid.children){card.hidden=!!q&&!card.dataset.search.includes(q);if(!card.hidden)count++;}summary.textContent=count?"":"No hay resultados para esta búsqueda.";}
  function restrictOverview(){
    const home=$("inicio");if(!home)return;
    // Do not show owner financial metrics or unrelated inventory widgets to limited roles.
    for(const [id,target] of [["ownerTodayAppointments","citas"],["ownerTodayRevenue","caja"],["ownerClients","clientes"],["ownerLowStock","inventario"],["statAppointments","citas"],["statFinished","citas"],["statSales","caja"],["statLowStock","inventario"]]){
      const node=$(id)?.closest("article");if(node)node.classList.toggle("business-policy-hidden",!permitted(target));
    }
    const full=["owner","admin","manager"].includes(role());
    for(const [id,target] of [["ownerMonthSales","reportes"],["ownerUpcomingAppointments","citas"],["ownerBarberPerformance","reportes"],["ownerTopServices","reportes"],["ownerAlerts","reportes"],["homeAppointments","citas"],["homeSummary","reportes"]]){
      const node=id==="ownerMonthSales"?$(id)?.closest(".owner-score"):$(id)?.closest(".panel");if(node)node.classList.toggle("business-policy-hidden",!permitted(target)||(["ownerBarberPerformance","ownerTopServices","ownerAlerts","homeSummary"].includes(id)&&!full));
    }
    for(const button of home.querySelectorAll("[data-go]"))button.classList.toggle("business-policy-hidden",!permitted(button.dataset.go));
    const receipt=$("homeReceiptBtn");if(receipt)receipt.classList.toggle("business-policy-hidden",!permitted("recibos"));
    $("openClientAppBtn")?.classList.toggle("business-policy-hidden",!permitted("clienteConfig")&&!permitted("reservas"));
    $("openNotificationsBtn")?.classList.toggle("business-policy-hidden",!permitted("notificationsHub"));
  }
  function sync(){
    if(!valid()){
      app.removeAttribute("data-business-workspace");app.removeAttribute("data-business-workspace-view");root.hidden=true;nav.hidden=true;session="";signature="";lastPage="";
      for(const n of app.querySelectorAll(".business-policy-hidden"))n.classList.remove("business-policy-hidden");return;
    }
    const t=token(),currentPage=page(),sig=visibleGroups().map(g=>g.id+":"+g.pages.map(p=>p[0]).join(",")).join("|");
    app.dataset.businessWorkspace="ready";nav.hidden=false;
    if(session!==t){session=t;lastPage=currentPage;signature=sig;showMenu();restrictOverview();return;}
    if(currentPage!==lastPage){lastPage=currentPage;if(currentPage&&currentPage!=="accessDenied"&&permitted(currentPage)){group=GROUPS.find(g=>g.pages.some(p=>p[0]===currentPage))?.id||"";mode="page";root.hidden=true;app.dataset.businessWorkspaceView="page";}}
    if(sig!==signature){signature=sig;if(mode==="menu")draw();else if(currentPage&&!permitted(currentPage))showMenu();}
    restrictOverview();updateNav();
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;sync();});}
  function boot(){
    app=$("adminApp");main=app?.querySelector("main");if(!main||!S()||$("businessWorkspace"))return;
    nav=e("nav","","business-workspace-nav");nav.hidden=true;nav.setAttribute("aria-label","Navegación de empresa");
    context=e("strong");const home=button("Menú",()=>showMenu());home.dataset.businessHome="";
    const back=button("Volver al área",()=>showMenu(group));back.dataset.businessArea="";
    const overview=button("Resumen",()=>go("inicio"));overview.dataset.businessSummary="";
    nav.append(context,home,back,overview,button("Soporte",support));
    root=e("section","","business-workspace");root.id="businessWorkspace";root.hidden=true;
    headline=e("h1");desc=e("p");search=e("input");search.type="search";search.addEventListener("input",filter);
    grid=e("div","","business-workspace-grid");summary=e("p");summary.setAttribute("role","status");
    root.append(headline,desc,search,grid,summary);main.prepend(nav,root);
    const observer=new MutationObserver(schedule);observer.observe(document.body,{attributes:true,attributeFilter:["data-sambrix-role"]});observer.observe(app,{attributes:true,attributeFilter:["class"]});for(const p of main.querySelectorAll(".page"))observer.observe(p,{attributes:true,attributeFilter:["class"]});
    // Periodically re-evaluate policy after cloud changes without rebuilding an active search.
    setInterval(schedule,1200);
    sync();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
