/* Shared presentation for the public home and local, non-publishing designer preview. */
export const layouts=["classic","gallery","editorial"];
export function designOptions(b={},advanced=true){
 return {layout:advanced&&layouts.includes(b.layout)?b.layout:"classic",
 coverFit:advanced&&b.coverFit==="contain"?"contain":"cover",
 buttonShape:advanced&&["rounded","pill","square"].includes(b.buttonShape)?b.buttonShape:"rounded",
 promotionPosition:advanced&&b.promotionPosition==="top"?"top":"after",
 showProfessionals:advanced&&b.showProfessionals===true,
 bookingLabel:advanced&&typeof b.bookingLabel==="string"?b.bookingLabel.trim().slice(0,40):""};
}
export const el=(tag,text="",cls="")=>{const x=document.createElement(tag);if(text)x.textContent=text;if(cls)x.className=cls;return x;};
export function safePhoto(url){if(typeof url!=="string"||!url.trim())return "";if(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(url))return url;try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password?u.href:"";}catch{return "";}}
function color(v,f){return /^#[0-9a-f]{6}$/i.test(v||"")?v:f;}
function ink(hex){const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2]>.179?"#111111":"#ffffff";}
export function applyDesign(root,brand={}){
 const d=designOptions(brand),primary=color(brand.primary,"#c89a4b"),secondary=color(brand.secondary,"#142d40");
 root.dataset.clientTheme=["light","dark","soft"].includes(brand.theme)?brand.theme:"light";
 root.dataset.clientLayout=d.layout;root.dataset.coverFit=d.coverFit;root.dataset.buttonShape=d.buttonShape;
 for(const [k,v] of Object.entries({"--client-v2-primary":primary,"--client-v2-primary-ink":ink(primary),"--client-v2-secondary":secondary,"--client-v2-secondary-ink":ink(secondary)}))root.style.setProperty(k,v);
}
function photo(src,cls="",alt=""){const u=safePhoto(src);if(!u)return null;const x=el("img","",cls);x.src=u;x.alt=alt;x.loading="lazy";x.addEventListener("error",()=>x.remove(),{once:true});return x;}
export function renderBrandHeader(header,data){const b=data?.branding||{};header.replaceChildren();const logo=photo(b.logo,"","Logo");if(logo)header.append(logo);const copy=el("div");copy.append(el("strong",b.brandName||data?.name||"SAMBRIX"),el("small",b.tagline||data?.branch?.name||"Reservas en línea"));header.append(copy);}
function action(label,fn,cls="secondary"){const x=el("button",label,"btn "+cls);x.type="button";x.addEventListener("click",fn);return x;}
function socialLink(value,hosts){try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&hosts.some(h=>u.hostname===h||u.hostname.endsWith("."+h))?u.href:"";}catch{return "";}}
function section(title){const s=el("section","","client-home-section");s.append(el("h3",title));return s;}
const noop=()=>{};
export function renderClientHome(content,data,{reserve=noop,choose=noop,preview=false}={}){
 const b=data.branding||{},d=designOptions(b),hero=el("section","","client-home-hero"),cover=photo(b.background,"client-home-cover","Portada del negocio");
 if(cover)hero.append(cover);const copy=el("div","","client-home-copy");
 copy.append(el("h2",b.heroTitle||"Reserva tu próxima cita"),el("p",b.heroSubtitle||"Elige un servicio y encuentra un horario disponible.","client-v2-muted"),action(d.bookingLabel||"Reservar ahora",reserve,"primary"));
 hero.append(copy);content.append(hero);
 const promotions=section("Promociones"),pg=el("div","","client-v2-grid");
 for(const p of Array.isArray(b.promotions)?b.promotions.slice(0,20):[]){if(!p||typeof p!=="object")continue;const card=el("article","","client-v2-record client-v2-promotion");card.append(el("span","OFERTA","client-promo-tag"),el("strong",String(p.title||"Promoción")),el("p",String(p.text||"")));pg.append(card);}
 promotions.append(pg);if(pg.children.length&&d.promotionPosition==="top")content.append(promotions);
 const services=section("Servicios"),g=el("div","","client-v2-grid client-home-services");
 for(const s of data.services||[]){const card=action("",()=>choose(s.id),"client-v2-choice client-home-service");const img=photo(s.photo,"client-home-service-photo");if(img)card.append(img);const t=el("span"),price=Number.isFinite(Number(s.price))?"$"+Number(s.price).toFixed(2):"Consultar precio";t.append(el("strong",s.name||"Servicio"),el("small",String(s.duration||"")+" min · "+price));if(s.description&&d.layout!=="classic")t.append(el("small",String(s.description).slice(0,140)));card.append(t);g.append(card);}
 services.append(g);if(!g.children.length)services.append(el("p","Todavía no hay servicios publicados.","client-v2-muted"));content.append(services);
 if(pg.children.length&&d.promotionPosition!=="top")content.append(promotions);
 if(d.showProfessionals&&(data.barbers||[]).length){const team=section("Nuestro equipo"),grid=el("div","","client-v2-grid client-home-team");for(const p of data.barbers){const card=el("article","","client-v2-record");const img=photo(b.barberPhotos?.[p.id],"client-team-photo");if(img)card.append(img);card.append(el("strong",p.name||"Profesional"));grid.append(card);}team.append(grid);content.append(team);}
 const raw=String(b.contactPhone||data.branch?.whatsapp||"").trim(),phone=raw.replace(/\D/g,""),whatsapp=socialLink(b.whatsapp,["wa.me","whatsapp.com"])||(/^[+\d\s().-]+$/.test(raw)&&phone.length>=8&&phone.length<=15?"https://wa.me/"+phone:"");
 const social=el("div","","client-v2-social");for(const [label,url] of [["WhatsApp",whatsapp],["Instagram",socialLink(b.instagram,["instagram.com"])],["TikTok",socialLink(b.tiktok,["tiktok.com"])],["Facebook",socialLink(b.facebook,["facebook.com","fb.com"])]]){if(!url)continue;const a=el("a",label,"btn secondary");if(!preview){a.href=url;a.rel="noopener noreferrer";a.target="_blank";}else a.setAttribute("aria-disabled","true");social.append(a);}
 if(social.children.length){const c=section("Contacto y redes");c.append(social);content.append(c);}
}
