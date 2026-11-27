/* Public client experience — no access to tenant-local state. */
import {slots,clock,available} from "./client-booking-core.js?v=2.0.8";
import {applyDesign,renderBrandHeader,renderClientHome,safePhoto} from "./client-design.js?v=1";
const params=new URLSearchParams(location.search),id=params.get("business");
if(id&&params.get("cliente")==="app"){
const el=(tag,text="",cls="")=>{const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x;};
const button=(text,fn,cls="secondary")=>{const x=el("button",text,"btn "+cls);x.type="button";x.addEventListener("click",fn);return x;};
const field=(name,x)=>{const l=el("label");l.append(el("span",name),x);return l;};
const input=(type,placeholder="")=>{const x=el("input");x.type=type;x.placeholder=placeholder;return x;};
const select=()=>el("select");
const cloud=()=>window.SambrixClientCloud;
let root,content,nav,header,notice,data=null,mode="home",step=1,service="",professional="",date="",time="",note="",busy=false,requestGeneration=0,authMode="login",bookingId="";
const money=v=>Number.isFinite(Number(v))?"$"+Number(v).toFixed(2):"Consultar precio";
const message=(s,error=false)=>{notice.textContent=s;notice.classList.toggle("error",error);};
const allowed=()=>data&&["Activo","Prueba"].includes(data.status);
function route(next){mode=next;if(next==="book"&&!service)step=1;render();}
function title(s,p=""){content.append(el("h2",s));if(p)content.append(el("p",p,"client-v2-muted"));}
function choice(name,detail,selected,fn,photo=""){const b=button("",fn,"client-v2-choice");b.setAttribute("aria-pressed",String(selected));if(selected)b.classList.add("chosen");const u=safePhoto(photo);if(u){const img=el("img");img.src=u;img.alt="";img.loading="lazy";img.addEventListener("error",()=>img.remove(),{once:true});b.append(img);}const t=el("span");t.append(el("strong",name),el("small",detail));b.append(t);return b;}
function headerRender(){applyDesign(document.body,data?.branding||{});applyDesign(root,data?.branding||{});renderBrandHeader(header,data);}
async function refresh(quiet=false){const gen=++requestGeneration;try{const p=await cloud().verifiedAvailability(id);if(gen!==requestGeneration)return false;data=p;if(!date)date=clock(data.timezone).date;if(!quiet)render();return true;}catch(e){if(gen!==requestGeneration)return false;data=null;render();message(e.message||"No pudimos verificar la agenda.",true);return false;}}
async function action(btn,fn){if(busy)return;busy=true;btn.disabled=true;try{await fn();}catch(e){message(String(e?.message||"No se pudo completar."),true);}finally{busy=false;if(btn.isConnected)btn.disabled=false;}}
function accountForm(){
  title(authMode==="login"?"Entra a tu cuenta":"Activa tu cuenta","Usa tu número de WhatsApp y un PIN de 8 números. Si ya tienes una ficha en el negocio, solicita su vinculación después de registrarte. No se envía un SMS.");
  const form=el("form"),phone=input("tel","Ej. +58 412 1234567"),pin=input("password","PIN"),name=input("text","Nombre completo"),repeat=input("password","Repite el PIN");
  phone.autocomplete="tel";phone.required=true;pin.required=true;pin.inputMode="numeric";pin.autocomplete=authMode==="login"?"current-password":"new-password";pin.maxLength=8;
  if(authMode!=="login"){name.required=true;name.maxLength=120;name.autocomplete="name";form.append(field("Nombre",name));}
  form.append(field("WhatsApp",phone),field("PIN",pin));
  if(authMode!=="login"){repeat.required=true;repeat.inputMode="numeric";repeat.maxLength=8;form.append(field("Confirmar PIN de 8 números",repeat));}
  const submit=button(authMode==="login"?"Iniciar sesión":"Crear cuenta",()=>{},"primary");submit.type="submit";
  form.append(submit);form.addEventListener("submit",e=>{e.preventDefault();action(submit,async()=>{
    if(authMode==="login")await cloud().login(phone.value,pin.value);else{if(pin.value!==repeat.value)throw Error("Los PIN no coinciden.");await cloud().register(name.value,phone.value,pin.value);}
    if(!cloud().currentClient())throw Error("No se pudo verificar la cuenta.");
    message("Sesión iniciada.");render();
  });});content.append(form,button(authMode==="login"?"Crear cuenta nueva":"Ya tengo cuenta",()=>{authMode=authMode==="login"?"register":"login";render();}));
  if(authMode==="login")content.append(el("p","Si olvidaste tu PIN, contacta directamente al negocio. La recuperación automática aún no está disponible.","client-v2-muted"));
}
function renderHome(){renderClientHome(content,data,{reserve:()=>{step=1;route("book");},choose:id=>{service=id;professional="";time="";step=2;route("book");}});}
function renderBook(){
  const s=data.services?.find(x=>x.id===service),p=data.barbers?.find(x=>x.id===professional);
  if(step>1&&!s)step=1;if(step>2&&!p)step=2;
  title("Reserva tu cita","Paso "+step+" de 4");
  const progress=el("div","","client-v2-progress");for(let i=1;i<=4;i++){const x=el("span",String(i),i===step?"current":i<step?"done":"");progress.append(x);}content.append(progress);
  if(step===1){const g=el("div","","client-v2-grid");for(const x of data.services||[])g.append(choice(x.name||"Servicio",x.duration+" min · "+money(x.price),service===x.id,()=>{service=x.id;professional="";time="";step=2;render();},x.photo));content.append(el("h3","Selecciona un servicio"),g);if(!g.children.length)content.append(el("p","Todavía no hay servicios publicados."));}
  if(step===2){const g=el("div","","client-v2-grid");for(const x of data.barbers||[])g.append(choice(x.name||"Profesional","Consultar horarios",professional===x.id,()=>{professional=x.id;time="";step=3;render();},data.branding?.barberPhotos?.[x.id]));content.append(el("h3","Selecciona un profesional"),g);if(!g.children.length)content.append(el("p","No hay profesionales publicados."));}
  if(step===3){const d=input("date");d.min=clock(data.timezone).date;d.value=date;d.addEventListener("change",()=>{date=d.value;time="";render();});content.append(field("Fecha",d),button("Actualizar disponibilidad",async()=>{await refresh();}));const g=el("div","","client-v2-slots");for(const t of slots(data,service,professional,date))g.append(choice(t,"",time===t,()=>{time=t;step=4;render();}));content.append(g);if(!g.children.length)content.append(el("p","No hay horarios disponibles para esta fecha."));}
  if(step===4){
    content.append(el("h3","Resumen de la solicitud"),el("p",s.name+" · "+p.name),el("p",date+" · "+time+" · "+money(s.price)));
    if(!cloud()?.isReady()){content.append(el("p","Verificando cuenta…"));}
    else if(!cloud().currentClient())accountForm();
    else{
      const c=cloud().currentClient();content.append(el("p","Solicitante: "+c.name),el("p","La cita queda pendiente hasta que el negocio confirme.","client-v2-muted"));
      const n=el("textarea");n.value=note;n.maxLength=500;n.placeholder="Nota opcional";n.addEventListener("input",()=>note=n.value);content.append(field("Nota",n));
      const send=button("Enviar solicitud",()=>action(send,async()=>{
        if(!available(data,service,professional,date,time))throw Error("Ese horario ya no está disponible.");
        const r=await cloud().createBooking({serviceId:service,barberId:professional,date,time,note,branchId:data.branch?.id||""});bookingId=r.id;note="";service="";professional="";time="";step=1;route("appointments");syncBookingNotice();
      }),"primary");content.append(send);
    }
  }
  if(step>1)content.append(button("Paso anterior",()=>{step--;render();}));
}
function syncBookingNotice(){
  if(!bookingId||!cloud()?.currentClient())return;
  const r=cloud().bookings().find(x=>x.id===bookingId);
  if(!r)return message("Solicitud recibida. Espera la confirmación del negocio.");
  const labels={Pendiente:"Solicitud recibida. Espera la confirmación del negocio.",Aprobada:"Tu cita está confirmada.",Finalizada:"Tu servicio ha finalizado.",Cancelada:"Tu cita fue cancelada.",Rechazada:"El negocio rechazó la solicitud."};
  message(labels[r.status]||"Consulta el estado en Mis citas.");
}
function renderAppointments(){
  title("Mis citas","Aquí puedes consultar el estado de tus solicitudes.");
  if(!cloud()?.isReady()){content.append(el("p","Verificando cuenta…"));return;}
  if(!cloud().currentClient()){accountForm();return;}
  if(bookingId)content.append(el("p","Tu última solicitud fue recibida por Firebase.","client-v2-muted"));
  const changes=cloud().changes();
  for(const r of cloud().bookings()){const card=el("article","","client-v2-record"),s=data.services?.find(x=>x.id===r.serviceId),p=data.barbers?.find(x=>x.id===r.barberId);card.append(el("strong",r.date+" · "+r.time),el("p",(s?.name||"Servicio")+" · "+(p?.name||"Profesional")),el("span",r.status==="Pendiente"?"Pendiente de confirmación":r.status==="Aprobada"?"Confirmada":r.status||"Sin estado","client-v2-state"));
    const pending=changes.some(x=>x.bookingRequestId===r.id&&x.status==="Pendiente");
    if(pending)card.append(el("p","Tienes una solicitud de cambio pendiente."));
    if(r.status==="Aprobada"&&!pending){
      const cancel=button("Solicitar cancelación",()=>action(cancel,async()=>{if(!confirm("¿Solicitar cancelar esta cita?"))return;await cloud().requestBookingChange(r.id,"cancel");message("Solicitud de cancelación enviada.");}));card.append(cancel);
      const d=input("date");d.min=clock(data.timezone).date;d.value=r.date;const t=select();const fill=()=>{t.replaceChildren(new Option("Selecciona horario",""));for(const v of slots(data,r.serviceId,r.barberId,d.value))t.append(new Option(v,v));};d.addEventListener("change",fill);fill();
      const change=button("Solicitar reprogramación",()=>action(change,async()=>{if(!t.value)throw Error("Selecciona un horario.");await cloud().requestBookingChange(r.id,"reschedule",d.value,t.value);message("Solicitud de cambio enviada.");}));card.append(field("Nueva fecha",d),field("Nuevo horario",t),change);
    }content.append(card);}
  if(!cloud().bookings().length&&!bookingId)content.append(el("p","Todavía no tienes citas."));
}
function renderProfile(){
  title("Mi cuenta");if(!cloud()?.isReady()){content.append(el("p","Verificando cuenta…"));return;}
  const c=cloud().currentClient();if(!c){accountForm();return;}
  const profile=el("article","","client-v2-record client-v2-profile");profile.append(el("strong",c.name),el("p",c.phone),el("strong",(c.points||0)+" puntos · "+(c.visits||0)+" visitas"));if(c.lastVisit)profile.append(el("p","Última visita: "+c.lastVisit));content.append(profile);
  if(!c.linkVerified){const box=el("article","","client-v2-record");box.append(el("strong","Vincular historial anterior"),el("p","Si ya tenías una ficha en este negocio, confirma tu identidad con el personal y muéstrale este código. No compartas tu PIN."),el("strong",c.activationCode||""));content.append(box);}
  if(data.branding?.clientHistory!==false){content.append(el("h3","Historial de servicios"));
  for(const h of c.serviceHistory||[]){const card=el("article","","client-v2-record");card.append(el("strong",h.service||"Servicio"),el("p",[h.date,h.time,h.professional].filter(Boolean).join(" · ")));content.append(card);}
  if(!c.serviceHistory?.length)content.append(el("p","Todavía no tienes servicios sincronizados.","client-v2-muted"));}
  const out=button("Cerrar sesión",()=>action(out,async()=>{await cloud().logout();bookingId="";route("home");message("Sesión cerrada.");}));content.append(out);
}
function render(){if(!root||!root.isConnected)return;headerRender();content.replaceChildren();for(const b of nav.children)b.setAttribute("aria-current",String(b.dataset.view===mode));if(!allowed()){title("Reservas no disponibles","Contacta directamente con el negocio o vuelve a intentar.");content.append(button("Reintentar",()=>refresh()));return;}if(mode==="home")renderHome();else if(mode==="book")renderBook();else if(mode==="appointments")renderAppointments();else renderProfile();}
async function boot(){
  for(const x of ["sambrixPortal","loginView","adminApp","clientApp"])document.getElementById(x)?.classList.add("hidden");
  document.body.dataset.sambrixPublicV2="true";root=el("main","","client-v2");root.id="sambrixClientV2";header=el("header");notice=el("p","","client-v2-notice");notice.setAttribute("role","status");content=el("section","","client-v2-content");nav=el("nav");nav.setAttribute("aria-label","Navegación de cliente");
  for(const [v,label] of [["home","Inicio"],["book","Reservar"],["appointments","Mis citas"],["profile","Mi cuenta"]]){const b=button(label,()=>route(v));b.dataset.view=v;nav.append(b);}root.append(header,notice,content,nav);document.body.append(root);title("Cargando negocio…");
  for(let i=0;i<100&&!cloud();i++)await new Promise(r=>setTimeout(r,100));
  if(!cloud()){message("No se pudo iniciar el servicio de cuentas. Recarga la página.",true);return;}
  document.addEventListener("sambrix-client-cloud-change",()=>{if(!busy){if(bookingId&&!notice.classList.contains("error")&&(notice.textContent.startsWith("Solicitud recibida")||notice.textContent.startsWith("Tu cita")||notice.textContent.startsWith("Tu servicio")||notice.textContent.startsWith("El negocio")))syncBookingNotice();if(mode==="appointments"||mode==="profile"||mode==="book"&&step===4)render();}});
  await refresh();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
}
