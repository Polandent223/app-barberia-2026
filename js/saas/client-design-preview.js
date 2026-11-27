import {designOptions,applyDesign,renderBrandHeader,renderClientHome,el} from "./client-design.js?v=1";
const by=id=>document.getElementById(id),val=id=>by(id)?.value||"";
const S=()=>window.SaaS,A=()=>window.App;
function context(){const s=S(),id=s?.session?.businessId,uid=window.FirebaseBridge?.user?.uid;return id&&uid&&["owner","admin","manager"].includes(s.session.role)&&s.canWriteDomain?.("config")?id+":"+uid+":"+s.session.role:"";}
export function readDesignOptions(advanced){return designOptions({layout:val("clientLayout"),coverFit:val("clientCoverFit"),buttonShape:val("clientButtonShape"),promotionPosition:val("clientPromotionPosition"),showProfessionals:val("clientShowProfessionals")==="yes",bookingLabel:val("clientBookingLabel")},advanced);}
function snapshot(){
 const a=A(),s=S(),b=s.currentBusiness(),c=a.db.business.clientApp||{},advanced=s.planCapability?.("customTheme",b)===true;
 const branding={...c,...readDesignOptions(advanced)};
 for(const [k,id] of [["brandName","clientBrandName"],["tagline","clientTagline"],["contactPhone","clientContactPhone"],["heroTitle","clientHeroTitle"],["heroSubtitle","clientHeroSubtitle"],["whatsapp","clientWhatsappLink"],["instagram","clientInstagramLink"],["tiktok","clientTiktokLink"],["facebook","clientFacebookLink"]])branding[k]=val(id);
 branding.theme=advanced?val("clientThemeMode"):"light";branding.primary=advanced?val("clientPrimaryColor"):"#c89a4b";branding.secondary=advanced?val("clientSecondaryColor"):"#111111";
 branding.logo=c.logo||"";branding.background=c.background||"";
 branding.promotions=s.planCapability?.("promotions",b)?(c.promotions||[]).map(p=>({title:p.title,text:p.text})):[];
 return {name:b.name,branch:s.currentBranch?.(),branding,services:(a.db.services||[]).map(({id,name,price,duration,description,photo})=>({id,name,price,duration,description,photo})),barbers:(a.db.barbers||[]).map(({id,name})=>({id,name}))};
}
function btn(label,fn){const x=el("button",label,"btn secondary");x.type="button";x.onclick=fn;return x;}
export async function open(){
 const key=context();if(!key||!window.SaaSCloudProduction?.isTenantReady?.(S().session.businessId))return A()?.toast?.("Verifica la sesión y los permisos.");
 if(by("clientDesignerPreview"))return;
 const data=snapshot(),dialog=el("dialog","","client-designer-dialog");dialog.id="clientDesignerPreview";
 const top=el("div","","client-designer-top"),heading=el("div");heading.append(el("h2","Vista previa del diseño"),el("p","Borrador local. No publica cambios ni realiza reservas.","muted"));top.append(heading,btn("Cerrar",()=>dialog.close()));
 const controls=el("div","","client-designer-controls"),phone=btn("Teléfono",()=>device("phone")),pc=btn("Computadora",()=>device("desktop")),note=el("p","Los botones de reserva y contacto están desactivados en la vista previa.","muted");
 const frame=el("div","","client-designer-frame"),root=el("main","","client-v2 client-preview-root"),header=el("header"),content=el("section","","client-v2-content"),nav=el("nav");
 for(const label of ["Inicio","Reservar","Mis citas","Mi cuenta"]){const b=btn(label,()=>{});b.disabled=true;b.setAttribute("aria-current",String(label==="Inicio"));nav.append(b);}
 root.append(header,content,nav);frame.append(root);controls.append(phone,pc);dialog.append(top,controls,note,frame);document.body.append(dialog);dialog.showModal();
 function device(v){frame.dataset.device=v;phone.setAttribute("aria-pressed",String(v==="phone"));pc.setAttribute("aria-pressed",String(v==="desktop"));}
 function render(){if(!dialog.open||context()!==key)return;applyDesign(root,data.branding);renderBrandHeader(header,data);content.replaceChildren();renderClientHome(content,data,{preview:true});for(const b of content.querySelectorAll("button"))b.disabled=true;}
 device("phone");render();
 const watcher=setInterval(()=>{if(context()!==key&&dialog.open)dialog.close();},400);
 dialog.addEventListener("close",()=>{clearInterval(watcher);dialog.remove();},{once:true});
 // Process only selected files locally, without uploading or changing App.db.
 try{for(const [field,k,max,q] of [["clientLogoFile","logo",320,.72],["clientBackgroundFile","background",800,.65]]){const file=by(field)?.files?.[0];if(file){const image=await A().compressImageLocal(file,max,q);if(!dialog.open||context()!==key)return;data.branding[k]=image;}}render();}catch{if(dialog.open)note.textContent="No se pudo previsualizar una imagen nueva. Se conserva la anterior en esta vista.";}
}
window.SambrixClientDesigner={open,readDesignOptions};
