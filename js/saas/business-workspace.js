/* SAMBRIX Business — modular navigation using the existing role and plan policies. */
(() => {
  "use strict";
  const GROUPS=[
    {id:"agenda",number:"01",title:"Agenda y reservas",description:"Citas, disponibilidad y solicitudes",pages:[["citas","Citas","Registrar y consultar citas"],["reservas","Reservas en línea","Canal de reservas"],["bookingInbox","Solicitudes de reserva","Revisar solicitudes pendientes"]]},
    {id:"clients",number:"02",title:"Clientes",description:"Directorio e información de clientes",pages:[["clientes","Directorio de clientes","Consultar y gestionar clientes"],["clienteSolicitudes","Solicitudes de clientes","Atender solicitudes"]]},
    {id:"services",number:"03",title:"Servicios",description:"Servicios, precios y profesionales",pages:[["servicios","Catálogo de servicios","Servicios y precios"],["barberos","Profesionales","Equipo de atención"]]},
    {id:"cash",number:"04",title:"Caja y ventas",description:"Movimientos y comprobantes",pages:[["caja","Caja","Ingresos, egresos y ventas"],["recibos","Comprobantes","Consultar recibos"],["autorizaciones","Autorizaciones","Revisar operaciones pendientes"]]},
    {id:"stock",number:"05",title:"Inventario",description:"Productos y existencias",pages:[["inventario","Productos y stock","Gestionar inventario"]]},
    {id:"team",number:"06",title:"Personal",description:"Empleados, horarios y asistencia",pages:[["personal","Empleados","Gestionar el equipo"],["asistencia","Asistencia","Registro de asistencia"],["horariosPersonal","Horarios","Horarios del personal"],["rendimientoPersonal","Rendimiento","Indicadores del equipo"],["historialPersonal","Historial","Historial del personal"],["ausenciasPersonal","Ausencias","Permisos y ausencias"],["nominaPersonal","Nómina","Control de nómina"],["usuarios","Usuarios y permisos","Crear accesos, asignar cargos y suspender usuarios"]]},
    {id:"reports",number:"07",title:"Reportes",description:"Indicadores e historial del negocio",pages:[["reportes","Reportes","Consultar resultados"],["auditoria","Auditoría","Consultar historial"]]},
    {id:"settings",number:"08",title:"Configuración",description:"Datos, sucursales y aplicación de clientes",pages:[["configuracion","Datos del negocio","Preferencias y datos"],["branches","Sucursales","Gestionar sucursales"],["clienteConfig","Aplicación de clientes","Personalizar experiencia"],["ownerSubscription","Mi suscripción","Plan, vencimiento y comprobantes"]]},
    {id:"support",number:"09",title:"Soporte y avisos",description:"Contacta a SAMBRIX",pages:[["notificationsHub","Avisos","Consultar notificaciones"]]}
  ];
  const roles=new Set(["owner","admin","manager","reception","cashier","barber"]);
  const names={owner:"Propietario",admin:"Administrador",manager:"Gerente",reception:"Recepción",cashier:"Cajero",barber:"Profesional"};
  const $=id=>document.getElementById(id),S=()=>window.SaaS;
  const role=()=>String(S()?.session?.role||"");
  const valid=()=>roles.has(role())&&!!S()?.session?.businessId&&!!window.FirebaseBridge?.user?.uid;
  const biz=()=>S()?.currentBusiness?.();
  const token=()=>String(window.FirebaseBridge?.user?.uid||"")+":"+String(S()?.session?.businessId||"")+":"+role();
  const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  function permitted(id){
    if(id==="ownerSubscription")return valid()&&role()==="owner";
    if(id==="usuarios")return valid()&&["owner","admin"].includes(role())&&S()?.featureAllowed?.(id,biz())===true;
    if(!valid()||!$(id)||!S()?.pageAllowed?.(id))return false;
    // Support is independent of the commercial feature matrix. For every operational
    // page use the existing plan policy, rather than inventing new entitlements.
    if(id==="notificationsHub")return true;
    const current=biz();
    if(!current||String(current.id)!==String(S()?.session?.businessId))return false;
    return S()?.featureAllowed?.(id,current)===true;
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
    if(id==="ownerSubscription"&&permitted(id)){window.SambrixSubscription?.open?.();return;}
    if(id==="usuarios"&&permitted(id)){openMemberWorkspace();return;}
    if(!permitted(id)){window.App?.toast?.("Esta herramienta no está disponible para tu cargo o plan.");return;}
    window.App?.go?.(id);
    if(page()===id){mode="page";root.hidden=true;app.dataset.businessWorkspaceView="page";lastPage=id;updateNav();window.scrollTo({top:0,behavior:"auto"});}
  }
  function support(){if(valid())S()?.openSupportTicket?.();}
  // Real Firebase memberships, independent of the old local PIN directory.
  function openMemberWorkspace(){
    if(!permitted("usuarios"))return;
    const api=window.SaaSAuthAdmin,id=String(S().session.businessId),actor=window.FirebaseBridge.user.uid,sessionKey=token();
    if(!api?.setBusinessMemberActive){window.App?.toast?.("La gestión de accesos todavía no está disponible.");return;}
    if($("tenantMembersDialog"))return;
    const dialog=e("dialog");dialog.id="tenantMembersDialog";dialog.className="panel";
    dialog.style.cssText="width:min(680px,94vw);max-height:85vh;overflow:auto;border:1px solid #b7b7b7;border-radius:16px;padding:20px;background:var(--panel,#fff);color:var(--text,#222)";
    const top=e("div","","panel-head");top.append(e("h2","Usuarios y permisos"),button("Cerrar",()=>dialog.close(),"btn secondary"));
    const intro=e("p","Gestiona los accesos de "+(biz()?.name||"tu empresa")+". Las cuentas de acceso son independientes de las fichas de empleados y de asistencia.","muted");
    const allowed=["manager","reception","cashier","barber"];if(role()==="owner")allowed.unshift("admin");
    const roleText={admin:"Administrador",manager:"Gerente",reception:"Recepcionista",cashier:"Cajero",barber:"Profesional",owner:"Propietario"};
    const descriptions={admin:"Administración operativa y gestión de personal, excepto otros administradores.",manager:"Supervisión de operaciones, caja, inventario y equipo.",reception:"Agenda, clientes, reservas y caja según permisos existentes.",cashier:"Caja, comprobantes, clientes e inventario según permisos existentes.",barber:"Agenda, clientes y asistencia; sin acceso a caja."};
    const form=e("form","","panel"),fields=e("div","","form-grid"),status=e("p");status.setAttribute("role","status");
    const input=(title,type)=>{const label=e("label",title),x=e("input");x.type=type;x.required=true;label.append(x);fields.append(label);return x;};
    const name=input("Nombre","text"),email=input("Correo","email"),password=input("Contraseña inicial","password");password.minLength=8;password.autocomplete="new-password";
    const roleLabel=e("label","Cargo"),select=e("select");select.id="tenantMemberRole";
    function options(target,values){for(const value of values){const o=e("option",roleText[value]);o.value=value;target.append(o);}}
    options(select,allowed);roleLabel.append(select);fields.append(roleLabel);
    const preview=e("p",descriptions[select.value],"muted");select.addEventListener("change",()=>preview.textContent=descriptions[select.value]);
    const submit=e("button","Crear acceso","btn primary");submit.type="submit";form.append(e("h3","Nuevo usuario"),fields,preview,submit);
    const list=e("div","","stack"),search=e("input");search.type="search";search.placeholder="Buscar por nombre o correo";search.setAttribute("aria-label","Buscar usuarios");
    let rows=[],busy=false;
    const current=()=>dialog.isConnected&&token()===sessionKey&&permitted("usuarios");
    const info=e("p","Suspender un acceso no elimina empleados, citas ni historial. Si SAMBRIX suspendió la cuenta a nivel de plataforma, contacta a soporte para reactivarla.","muted");
    function render(){
      if(!current())return;list.replaceChildren();
      const q=norm(search.value);
      for(const m of rows.filter(m=>norm([m.name,m.email,roleText[m.role]].join(" ")).includes(q))){
        const row=e("div","","panel");const details=e("div");
        details.append(e("strong",m.name||m.email||"Usuario"),e("p",(m.email||"")+" · "+(roleText[m.role]||m.role)+" · "+(m.active===false?"Suspendido":"Habilitado"),"muted"));
        row.append(details);
        if(m.uid!==actor&&m.role!=="owner"&&(role()==="owner"||m.role!=="admin")&&allowed.includes(m.role)){
          const actions=e("div","","actions"),change=e("select");options(change,allowed);change.value=m.role;change.setAttribute("aria-label","Cargo de "+(m.name||m.email));
          const save=button("Cambiar cargo",()=>{if(change.value!==m.role&&confirm("¿Cambiar el cargo? El usuario deberá iniciar sesión nuevamente."))work(()=>api.changeBusinessMemberRole(id,m.uid,change.value),"Cargo actualizado.");},"btn secondary");
          const active=button(m.active===false?"Reactivar":"Suspender acceso",()=>{if(confirm(m.active===false?"¿Reactivar este acceso?":"¿Suspender este acceso sin eliminar historial?"))work(()=>api.setBusinessMemberActive(id,m.uid,m.active===false),"Estado actualizado.");},m.active===false?"btn secondary":"btn danger");
          for(const x of [change,save,active])x.disabled=busy;actions.append(change,save,active);row.append(actions);
        }else row.append(e("small","Acceso protegido","muted"));
        list.append(row);
      }
      if(!list.children.length)list.append(e("p","No hay usuarios que coincidan.","muted"));
    }
    async function reload(){
      const result=await api.listBusinessMembers(id);if(!current())return;
      rows=result;render();
    }
    async function work(action,message){
      if(busy||!current())return;busy=true;submit.disabled=true;refresh.disabled=true;render();status.textContent="Verificando en Firebase…";
      try{await action();if(!current())return;status.textContent=message;await reload();}
      catch(err){if(current())status.textContent="No se pudo completar o verificar: "+(err?.message||"Revisa la conexión y los permisos.");}
      finally{busy=false;if(current()){submit.disabled=false;refresh.disabled=false;render();}}
    }
    form.addEventListener("submit",ev=>{ev.preventDefault();if(!form.reportValidity())return;const values={businessId:id,name:name.value.trim(),email:email.value.trim(),password:password.value,role:select.value};if(!values.name){status.textContent="Escribe el nombre.";return;}work(async()=>{try{await api.createBusinessMember(values);if(current()){name.value="";email.value="";}}finally{password.value="";values.password="";}},"Acceso creado en Firebase.");});
    search.addEventListener("input",render);const refresh=button("Actualizar usuarios",()=>work(async()=>{},"Usuarios consultados en Firebase."),"btn secondary");
    dialog.append(top,intro,form,status,e("h3","Accesos registrados"),search,refresh,list,info);
    document.body.append(dialog);dialog.showModal();
    const watcher=setInterval(()=>{if(!current()&&dialog.open)dialog.close();},400);
    dialog.addEventListener("close",()=>{clearInterval(watcher);password.value="";rows=[];dialog.remove();},{once:true});
    work(async()=>{},"Usuarios consultados en Firebase.");
  }
  function tile(number,title,description,action,terms=""){
    const b=button("",action,"business-tile"),badge=e("span",number,"business-tile-mark"),copy=e("span");
    badge.setAttribute("aria-hidden","true");copy.append(e("strong",title),e("small",description));b.append(badge,copy);b.dataset.search=norm(title+" "+description+" "+terms);return b;
  }
  function updateNav(){
    const g=visibleGroups().find(x=>x.id===group);
    context.textContent=(biz()?.name||"Mi negocio")+" · "+(names[role()]||"");
    nav.querySelector("[data-business-home]").hidden=mode==="menu"&&!g;
    nav.querySelector("[data-business-area]").hidden=mode==="menu"||!g;
    nav.querySelector("[data-owner-subscription]").hidden=!permitted("ownerSubscription");
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
    for(const id of ["languageSelect","currencySelect"])$(id)?.classList.toggle("business-policy-hidden",!S()?.canWriteDomain?.("config"));
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
    if(mode==="page"&&currentPage!=="accessDenied"&&!permitted(currentPage)){showMenu();}
    if(sig!==signature){signature=sig;if(mode==="menu")draw();}
    restrictOverview();updateNav();
  }
  function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;sync();});}
  function boot(){
    app=$("adminApp");main=app?.querySelector("main");if(!main||!S()||$("businessWorkspace"))return;
    nav=e("nav","","business-workspace-nav");nav.hidden=true;nav.setAttribute("aria-label","Navegación de empresa");
    context=e("strong");const home=button("Menú",()=>showMenu());home.dataset.businessHome="";
    const back=button("Volver al área",()=>showMenu(group));back.dataset.businessArea="";
    const overview=button("Resumen",()=>go("inicio"));overview.dataset.businessSummary="";
    const subscription=button("Mi suscripción",()=>go("ownerSubscription"));subscription.dataset.ownerSubscription="";subscription.hidden=true;
    nav.append(context,home,back,overview,subscription,button("Soporte",support));
    root=e("section","","business-workspace");root.id="businessWorkspace";root.hidden=true;
    headline=e("h1");desc=e("p");search=e("input");search.type="search";search.addEventListener("input",filter);
    grid=e("div","","business-workspace-grid");summary=e("p");summary.setAttribute("role","status");
    root.append(headline,desc,search,grid,summary);main.prepend(nav,root);
    const originalGo=window.App?.go;
    if(originalGo)window.App.go=function(id,...args){
      if(valid()&&id!=="accessDenied"&&!permitted(id)){window.App?.toast?.("Esta herramienta no está disponible para tu cargo o plan.");return;}
      return originalGo.call(this,id,...args);
    };
    const observer=new MutationObserver(schedule);observer.observe(document.body,{attributes:true,attributeFilter:["data-sambrix-role"]});observer.observe(app,{attributes:true,attributeFilter:["class"]});for(const p of main.querySelectorAll(".page"))observer.observe(p,{attributes:true,attributeFilter:["class"]});
    // Periodically re-evaluate policy after cloud changes without rebuilding an active search.
    setInterval(schedule,1200);
    sync();
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})();
