/* SAMBRIX 2: navigation only. Authorization and business data remain in existing modules. */
(() => {
  "use strict";
  const groups = [
    {id:"companies",icon:"01",title:"Empresas y usuarios",description:"Alta, sucursales, propietarios y accesos",pages:[["branches","Sucursales"],["saasCRM","Directorio comercial"],["activationCenter","Activar empresas"],["saasOnboarding","Alta y configuración"],["onboardingCenter","Seguimiento de altas"],["licenseCenter","Licencias"]]},
    {id:"plans",icon:"02",title:"Planes y suscripciones",description:"Mensualidades, renovaciones y beneficios",pages:[["saasPlans","Planes y mensualidades"],["saasAddons","Servicios adicionales"]]},
    {id:"finance",icon:"03",title:"Finanzas",description:"Cobros, facturas y estados de cuenta",pages:[["billingOperationsCenter","Cobros, suscripciones y comprobantes"]]},
    {id:"support",icon:"04",title:"Soporte y avisos",description:"Atención a negocios y comunicaciones",pages:[["supportCenter","Tickets y soporte empresarial"],["saasAlerts","Alertas"],["notificationsHub","Notificaciones"],["serviceStatusCenter","Estado del servicio"],["helpCenter","Centro de ayuda"],["trainingHandoffCenter","Entrega y capacitación"]]},
    {id:"analytics",icon:"05",title:"Estadísticas",description:"Indicadores y evolución comercial",pages:[["saasMetricsCenter","Métricas SaaS"],["saasAnalytics","Analítica global"]]},
    {id:"security",icon:"06",title:"Seguridad y auditoría",description:"Permisos, accesos y protección de datos",pages:[["saasSecurity","Seguridad"],["authSecurityCenter","Autenticación"],["firebaseRulesCenter","Reglas Firebase"],["privacyCenter","Privacidad"],["secretsSecurityCenter","Credenciales"],["saasAudit","Auditoría"],["validationSecurityCenter","Validación"]]},
    {id:"backup",icon:"07",title:"Respaldos",description:"Copias, restauración y continuidad",pages:[["backupCenter","Copias de seguridad"],["migrationCenter","Migración de datos"],["recoveryCenter","Recuperación"],["continuityCenter","Continuidad"]]},
    {id:"settings",icon:"08",title:"Configuración",description:"Preferencias y administración de la plataforma",pages:[["platformSettings","Configuración general"],["updateCenter","Actualizaciones"]]},
    {id:"technical",icon:"09",title:"Herramientas avanzadas",description:"Diagnóstico, pruebas y mantenimiento",pages:[["systemHealth","Salud del sistema"],["healthCenter","Servicios técnicos"],["incidentCenter","Incidentes"],["maintenanceCenter","Mantenimiento"],["deploymentCenter","Despliegue"],["reviewGateCenter","Revisión final"]]}
  ];
  const byId = id => document.getElementById(id);
  const isAdmin = () => window.SaaS?.session?.role === "superadmin";
  const permitted = id => !!byId(id) && window.SaaS?.pageAllowed?.(id);
  let current = "home", lastPage = "", workspace, bar, search, grid;
  const normalize = text => String(text || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  function element(tag, className, text) {
    const el = document.createElement(tag); if(className) el.className=className;
    if(text) el.textContent=text; return el;
  }
  function card(icon,title,description,action) {
    const b=element("button","workspace-card"); b.type="button";
    const i=element("span","workspace-icon",icon); i.setAttribute("aria-hidden","true");
    const copy=element("span"); copy.append(element("strong","",title),element("small","",description));
    b.append(i,copy); b.addEventListener("click",action);
    b.dataset.filter=normalize(title+" "+description); return b;
  }
  function select(view, navigate=true) {
    if(!isAdmin()) return;
    current=view; byId("superadmin").dataset.moduleView=view;
    if(navigate && !byId("superadmin").classList.contains("active")) window.App?.go?.("superadmin");
    draw();
    window.scrollTo({top:0,behavior:"auto"});
  }
  function openPage(id) {
    if(!isAdmin() || !permitted(id)) return;
    window.App?.go?.(id);
  }
  function draw() {
    if(!workspace) return;
    const g=groups.find(x=>x.id===current);
    workspace.replaceChildren();
    workspace.append(element("h2","",g?g.title:"Panel de administración"),element("p","",g?g.description:"Selecciona el área que quieres administrar."));
    if(g?.id==="analytics") workspace.append(element("p","","Los ingresos mensuales actuales son indicadores calculados; el historial real aún requiere registros verificables."));
    if(g?.id==="companies") workspace.append(element("p","","Gestiona propietarios y empleados con el botón Usuarios de cada empresa."));
    search=element("input","workspace-search"); search.type="search";search.placeholder=g?"Buscar herramienta...":"Buscar área...";search.setAttribute("aria-label",search.placeholder);
    grid=element("div","workspace-grid"); workspace.append(search,grid);
    if(!g) for(const item of groups) grid.append(card(item.icon,item.title,item.description,()=>select(item.id)));
    else for(const [id,title] of g.pages) if(permitted(id)) grid.append(card("→",title,"Abrir módulo",()=>openPage(id)));
    search.addEventListener("input",()=>{for(const b of grid.children)b.hidden=!b.dataset.filter.includes(normalize(search.value));});
    updateBar();
  }
  function updateBar() {
    if(!bar)return;
    const page=document.querySelector("#adminApp .page.active")?.id||"";
    const activeGroup=groups.find(g=>g.pages.some(p=>p[0]===page));
    if(page!==lastPage && page && page!=="superadmin" && activeGroup)current=activeGroup.id;
    if(page!==lastPage){lastPage=page; if(page==="superadmin"&&byId("superadmin").dataset.moduleView!==current){byId("superadmin").dataset.moduleView=current;draw();}}
    const group=groups.find(g=>g.id===current);
    bar.querySelector("strong").textContent=page==="superadmin"?(group?.title||"SAMBRIX · Inicio"):(activeGroup?.title||"SAMBRIX · Módulo");
    bar.querySelector("[data-return-area]").hidden=page==="superadmin"||!group;
    bar.querySelector("[data-return-home]").hidden=page==="superadmin"&&current==="home";
  }
  function boot(){
    const root=byId("superadmin"), directory=byId("superadminModuleDirectory"), main=document.querySelector("#adminApp main");
    if(!root||!directory||!main||!window.SaaS||byId("sambrixWorkspace"))return;
    const mapped=new Set([...groups.flatMap(g=>g.pages.map(p=>p[0])),"saasSupport","operationsCenter","saasSubscriptions","billingCenter","renewalAlertsCenter","discountsCenter","invoicesCenter","accountStatementsCenter"]);
    // Keep all previous technical tools reachable, without cluttering the dashboard.
    const advanced=groups.find(g=>g.id==="technical");
    for(const btn of directory.querySelectorAll("[data-page-jump]")){
      const id=btn.dataset.pageJump;if(mapped.has(id)||!byId(id))continue;
      const title=btn.querySelector("strong")?.textContent||id;
      advanced.pages.push([id,title]);mapped.add(id);
    }
    const excluded=new Set(["superadmin","reservas","bookingInbox","clienteSolicitudes","personal","asistencia","horariosPersonal","rendimientoPersonal","historialPersonal","ausenciasPersonal","nominaPersonal"]);
    for(const btn of document.querySelectorAll(".bottom-nav .nav-saas[data-page]")){
      const id=btn.dataset.page;if(mapped.has(id)||excluded.has(id)||!byId(id))continue;
      advanced.pages.push([id,btn.querySelector("span")?.textContent||id]);mapped.add(id);
    }
    const businessPanel=byId("saasBusinessTable")?.parentElement;
    if(businessPanel){
      businessPanel.id="sambrixBusinessPanel";const tools=element("div","workspace-business-tools");
      for(const id of ["globalBusinessSearch","createBusinessBtn"]){const el=byId(id);if(el)tools.append(el);}
      businessPanel.prepend(tools);
    }
    // The old chart synthesizes historical revenue from today's MRR. Do not present it as actual history.
    const legacyTrend=byId("mrrChart")?.closest(".panel");
    if(legacyTrend){legacyTrend.classList.add("workspace-unverified-mrr");}
    workspace=element("div");workspace.id="sambrixWorkspace";directory.append(workspace);
    bar=element("nav");bar.id="sambrixModuleBar";bar.setAttribute("aria-label","Navegación SuperAdmin");
    const home=element("button","","Inicio");home.type="button";home.dataset.returnHome="";home.addEventListener("click",()=>select("home"));
    const back=element("button","","Volver al área");back.type="button";back.dataset.returnArea="";back.addEventListener("click",()=>select(current));
    bar.append(element("strong","","SAMBRIX"),home,back);main.prepend(bar);
    root.dataset.moduleView="home";draw();
    const observer=new MutationObserver(()=>{if(isAdmin()) updateBar();});
    observer.observe(main,{subtree:true,attributes:true,attributeFilter:["class"]});
    observer.observe(document.body,{attributes:true,attributeFilter:["data-sambrix-role"]});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();