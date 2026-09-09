/* SAMBRIX 20.31 — Cuenta del cliente, sesión y prevención de duplicados */
(function(){
 const A=window.App;if(!A)return;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const normPhone=v=>String(v||'').replace(/\D/g,'');
 const businessId=()=>String(A.db?.meta?.businessId||window.SaaS?.currentBusiness?.()?.id||'local');
 const sessionKey=()=>`sambrix_client_session_${businessId()}`;
 const cloudClientMode=()=>{const q=new URLSearchParams(location.search);return q.get("cliente")==="app"&&!!q.get("business")};

 A.ensureClientAccounts=function(){A.db.clientAccounts=A.db.clientAccounts||[];return A.db.clientAccounts};
 A.clientAccountByPhone=function(phone){const p=normPhone(phone);return A.ensureClientAccounts().find(x=>normPhone(x.phone)===p)};
 A.clientAccountById=function(id){return A.ensureClientAccounts().find(x=>x.id===id)};
 A.currentClientAccount=function(){if(cloudClientMode())return null;const id=localStorage.getItem(sessionKey());const acc=A.clientAccountById(id);if(!acc&&id)localStorage.removeItem(sessionKey());return acc||null};
 A.currentClient=function(){const acc=A.currentClientAccount();return acc?A.db.clients.find(x=>x.id===acc.clientId)||null:null};
 A.clientLoggedIn=()=>!!A.currentClient();

 // Hash local para la fase de revisión. En producción esta credencial debe migrar a Firebase Auth.
 A.clientPinHash=function(pin,salt){
   let h=2166136261>>>0,str=`${salt}|${pin}|SAMBRIX_CLIENT`;
   for(let r=0;r<240;r++)for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}
   return h.toString(16).padStart(8,'0');
 };
 A.newClientSalt=()=>A.uid()+A.uid();

 A.ensureClientAuthUI=function(){
   const shell=document.querySelector('#clientApp .client-shell');if(!shell)return;
   let auth=document.getElementById('clientAuth2031');
   if(!auth){
     auth=document.createElement('section');auth.id='clientAuth2031';auth.className='client-auth-2031';
     const top=document.querySelector('#clientApp .client-top');top?.insertAdjacentElement('afterend',auth);
   }
   let badge=document.getElementById('clientAccountBadge2031');
   if(!badge){
     badge=document.createElement('div');badge.id='clientAccountBadge2031';badge.className='client-account-badge hidden';
     document.querySelector('#clientApp .client-top')?.appendChild(badge);
   }
   A.renderClientAuthUI();
 };
 A.renderClientAuthUI=function(mode){
   const auth=document.getElementById('clientAuth2031'),badge=document.getElementById('clientAccountBadge2031');if(!auth)return;
   const acc=A.currentClientAccount(),c=A.currentClient();
   const pages=[...document.querySelectorAll('#clientApp .client-page')],nav=document.querySelector('#clientApp .client-bottom');
   if(acc&&c){
     auth.classList.add('hidden');pages.forEach(p=>p.classList.remove('client-auth-locked'));if(nav)nav.classList.remove('hidden');
     if(badge){badge.classList.remove('hidden');badge.innerHTML=`<div><strong>${esc(c.name)}</strong><small>${esc(c.phone||acc.phone)}</small></div><button class="btn secondary" type="button" onclick="App.clientLogout2031()">Salir</button>`;}
     A.syncClientAccountFields();return;
   }
   if(badge)badge.classList.add('hidden');if(nav)nav.classList.add('hidden');pages.forEach(p=>p.classList.add('client-auth-locked'));
   const register=mode==='register';
   auth.classList.remove('hidden');
   auth.innerHTML=`<div class="client-auth-card"><span class="tag">CUENTA DEL CLIENTE</span><h2>${register?'Crear mi cuenta':'Ingresar'}</h2><p class="muted">${register?'Regístrate una sola vez. Tus reservas quedarán siempre asociadas a tu mismo perfil.':'Ingresa para reservar, ver tus citas y reprogramar sin crear clientes duplicados.'}</p>${register?`<div class="form-grid"><label>Nombre<input id="clientRegName2031" autocomplete="name"></label><label>WhatsApp<input id="clientRegPhone2031" inputmode="tel" autocomplete="tel"></label><label>PIN de acceso<input id="clientRegPin2031" type="password" inputmode="numeric" maxlength="8" placeholder="6 a 8 dígitos"></label><label>Repetir PIN<input id="clientRegPin22031" type="password" inputmode="numeric" maxlength="8"></label></div><div class="actions"><button class="btn primary" type="button" onclick="App.clientRegister2031()">Crear cuenta</button><button class="btn secondary" type="button" onclick="App.renderClientAuthUI('login')">Ya tengo cuenta</button></div>`:`<div class="form-grid"><label>WhatsApp<input id="clientLoginPhone2031" inputmode="tel" autocomplete="tel"></label><label>PIN<input id="clientLoginPin2031" type="password" inputmode="numeric" maxlength="8"></label></div><div class="actions"><button class="btn primary" type="button" onclick="App.clientLogin2031()">Ingresar</button><button class="btn secondary" type="button" onclick="App.renderClientAuthUI('register')">Crear cuenta</button></div>`}<div class="permission-note"><strong>Importante:</strong> el número se usa para localizar tu perfil, pero SAMBRIX enlaza reservas e historial mediante un ID único del cliente.</div></div>`;
 };

 A.clientRegister2031=function(){
   if(cloudClientMode())return A.toast("Conectando cuenta segura...");
   const name=A.val('clientRegName2031').trim(),phoneRaw=A.val('clientRegPhone2031'),phone=normPhone(phoneRaw),pin=A.val('clientRegPin2031'),pin2=A.val('clientRegPin22031');
   if(!name||phone.length<7)return A.toast('Escribe nombre y WhatsApp válido');
   if(!/^\d{6,8}$/.test(pin))return A.toast('El PIN debe tener entre 6 y 8 números');
   if(pin!==pin2)return A.toast('Los PIN no coinciden');
   if(A.clientAccountByPhone(phone))return A.toast('Ese WhatsApp ya tiene cuenta. Ingresa con tu PIN');
   // Si el administrador ya creó al cliente, se enlaza esa ficha; no se duplica.
   let c=A.db.clients.find(x=>normPhone(x.phone)===phone);
   if(!c){c={id:A.uid(),name,phone:phoneRaw.trim(),birthday:'',frequency:20,style:'',points:0,visits:0,lastVisit:''};A.db.clients.push(c)}
   else {if(!c.name)c.name=name;if(!c.phone)c.phone=phoneRaw.trim();}
   const salt=A.newClientSalt(),acc={id:A.uid(),clientId:c.id,phone:phoneRaw.trim(),salt,pinHash:A.clientPinHash(pin,salt),createdAt:new Date().toISOString(),status:'Activo'};
   A.ensureClientAccounts().push(acc);localStorage.setItem(sessionKey(),acc.id);A.persist();A.ensureClientAuthUI();A.clientGo('clientHome');A.toast('Cuenta creada. Bienvenido a SAMBRIX');
 };
 A.clientLogin2031=function(){
   if(cloudClientMode())return A.toast("Conectando cuenta segura...");
   const phone=A.val('clientLoginPhone2031'),pin=A.val('clientLoginPin2031'),acc=A.clientAccountByPhone(phone);
   if(!acc)return A.toast('No existe una cuenta con ese WhatsApp. Regístrate primero');
   if(acc.status==='Bloqueado')return A.toast('Esta cuenta está bloqueada. Contacta al negocio');
   if(A.clientPinHash(pin,acc.salt)!==acc.pinHash)return A.toast('PIN incorrecto');
   if(!A.db.clients.some(x=>x.id===acc.clientId))return A.toast('La cuenta no está vinculada a un cliente válido');
   acc.lastLoginAt=new Date().toISOString();localStorage.setItem(sessionKey(),acc.id);localStorage.setItem(A.KEY,JSON.stringify(A.db));A.ensureClientAuthUI();A.clientGo('clientHome');A.toast('Sesión iniciada');
 };
 A.clientLogout2031=function(){localStorage.removeItem(sessionKey());A.clientSelection={serviceId:'',barberId:'',time:''};A.renderClientAuthUI('login');A.toast('Sesión cerrada')};

 A.syncClientAccountFields=function(){
   const c=A.currentClient();if(!c)return;
   [['clientBookName',c.name],['clientBookPhone',c.phone],['clientLookupPhone',c.phone],['clientProfilePhone',c.phone],['clientHistoryPhone',c.phone]].forEach(([id,v])=>{const el=document.getElementById(id);if(el){el.value=v||'';el.readOnly=true;}});
   const card=document.getElementById('clientBookName')?.closest('.client-card');if(card){const h=card.querySelector('h2');if(h)h.textContent='4. Tu cuenta';}
 };

 const prevOpen=A.openClientApp;A.openClientApp=function(){prevOpen?.();A.ensureClientAuthUI();if(!A.clientLoggedIn()){document.querySelectorAll('#clientApp .client-page').forEach(p=>p.classList.remove('active'));A.renderClientAuthUI('login')}else{A.syncClientAccountFields();A.lookupClientAppointments();A.lookupClientProfile();A.lookupClientHistory?.();}};
 const prevRender=A.renderClientApp;A.renderClientApp=function(){const r=prevRender?.();A.ensureClientAccounts();A.ensureClientAuthUI();return r;};
 const prevGo=A.clientGo;A.clientGo=function(page){if(!A.clientLoggedIn()){A.renderClientAuthUI('login');return A.toast('Ingresa o crea tu cuenta para continuar')}const r=prevGo?.(page);A.syncClientAccountFields();if(page==='clientAppointments')A.lookupClientAppointments();if(page==='clientProfile')A.lookupClientProfile();if(page==='clientHistory')A.lookupClientHistory?.();return r;};

 // Reserva: el cliente ya debe existir por su cuenta. Nunca crea otra ficha al reservar.
 A.submitClientReservation=function(){
   const c=A.currentClient();if(!c){A.renderClientAuthUI('login');return A.toast('Debes ingresar antes de reservar')}
   const s=A.db.services.find(x=>x.id===A.clientSelection.serviceId),date=A.val('clientBookDate'),time=A.clientSelection.time;
   if(!s||!date||!time)return A.toast('Completa servicio, fecha y horario');
   let barberId=A.clientSelection.barberId;
   if(!barberId){const list=A.availableBarbers(date,time,s.duration);if(!list.length)return A.toast('Horario no disponible');barberId=list[0].id}
   if(!A.slotAvailable(barberId,date,time,s.duration))return A.toast('Ese horario acaba de ocuparse. Elige otro');
   const note=A.val('clientBookNote');
   const appt={id:A.uid(),clientId:c.id,barberId,serviceId:s.id,date,time,status:'Confirmada',note:note||'',source:'client-account',createdAt:new Date().toISOString()};
   A.db.appointments.push(appt);A.addClientActivity?.('Reserva online',`${c.name} · ${date} ${time}`,c.phone||'');A.clientSelection={serviceId:'',barberId:'',time:''};A.persist();A.clientGo('clientAppointments');A.toast('Reserva confirmada');
 };

 // Las vistas privadas usan siempre el clientId de la sesión, no una búsqueda libre por teléfono.
 A.lookupClientAppointments=function(){
   const c=A.currentClient(),root=A.byId('clientAppointmentsList');if(!root)return;if(!c){root.innerHTML='<div class="muted">Inicia sesión para ver tus citas.</div>';return}
   const data=A.db.appointments.filter(a=>a.clientId===c.id).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
   root.innerHTML=data.map(a=>{const req=(A.db.clientRequests||[]).filter(r=>r.appointmentId===a.id&&r.type==='reschedule').sort((x,y)=>(y.createdAt||'').localeCompare(x.createdAt||''))[0];return `<div class="row"><div><strong>${esc(a.date)} ${esc(a.time)}</strong><small>${esc(A.serviceName(a.serviceId))} · ${esc(A.barberName(a.barberId))} · ${esc(a.status)}${req?` · Reprogramación: ${esc(req.status)}${req.status==='Pendiente'?` → ${esc(req.newDate)} ${esc(req.newTime)}`:''}`:''}</small></div>${['Pendiente','Confirmada'].includes(a.status)&&req?.status!=='Pendiente'?`<div class="request-actions"><button class="btn secondary" onclick="App.openReschedule('${a.id}')">Reprogramar</button><button class="btn danger" onclick="App.requestAppointmentChange('${a.id}','cancel')">Cancelar</button></div>`:''}</div>`}).join('')||'<div class="muted">No tienes citas registradas.</div>';
 };
 A.lookupClientProfile=function(){
   const c=A.currentClient();if(!c)return;const progress=Math.min(100,Number(c.points||0));
   A.byId('clientProfileData').innerHTML=`<div class="loyalty-card"><span>MI CUENTA SAMBRIX</span><h2 style="color:#fff;margin:8px 0">${esc(c.name)}</h2><div>${esc(c.phone||'')} · <strong>${c.points||0} puntos</strong> · ${c.visits||0} visitas</div><div class="loyalty-progress"><span style="width:${progress}%"></span></div><small>Tu perfil y tus citas están vinculados a un ID único.</small></div>`;
   const promos=[];if((c.visits||0)>=5)promos.push({title:'Cliente frecuente',text:'Pregunta por tu beneficio especial'});if((c.points||0)>=100)promos.push({title:'Beneficio VIP',text:'Tienes beneficios exclusivos disponibles'});
   A.byId('clientPersonalPromos').innerHTML=`<h3>Promociones para ti</h3>${promos.map(p=>`<div class="personal-promo"><h3>${p.title}</h3><div>${p.text}</div></div>`).join('')||'<div class="muted">Sigue acumulando visitas y puntos para desbloquear beneficios.</div>'}`;
 };
 const oldHistory=A.lookupClientHistory;A.lookupClientHistory=function(){const c=A.currentClient();if(!c)return;const el=A.byId('clientHistoryPhone');if(el){el.readOnly=false;el.value=c.phone||'';}oldHistory?.();if(el)el.readOnly=true;};

 // Oculta búsquedas por teléfono: una cuenta solo puede consultar su propia información.
 A.applyClientAccountPrivateUI=function(){
   ['clientLookupPhone','clientProfilePhone','clientHistoryPhone'].forEach(id=>{const input=document.getElementById(id),grid=input?.closest('.form-grid');if(grid)grid.classList.add('client-account-search-hidden')});
 };
 document.addEventListener('DOMContentLoaded',()=>{A.ensureClientAccounts();A.ensureClientAuthUI();A.applyClientAccountPrivateUI();A.syncClientAccountFields();});
})();
