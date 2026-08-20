SaaS.HELP_GUIDES=[
 {id:"owner-first",title:"Primer ingreso del dueño",roles:["Dueño"],keywords:"login acceso contraseña negocio",steps:["Abre SAMBRIX con tu cuenta.","Confirma que aparece únicamente tu negocio.","Revisa el panel principal y el nombre del negocio.","Si ves información de otro negocio, sal y reporta el caso inmediatamente."]},
 {id:"appointment-new",title:"Crear una cita",roles:["Dueño","Personal"],keywords:"cita calendario cliente servicio",steps:["Abre Citas/Calendario.","Selecciona fecha y hora.","Elige o crea el cliente.","Selecciona servicio y profesional.","Guarda y confirma que aparece en el calendario."]},
 {id:"appointment-change",title:"Mover o cancelar una cita",roles:["Dueño","Personal"],keywords:"mover cambiar cancelar cita",steps:["Busca la cita.","Abre sus detalles.","Cambia fecha/hora o selecciona cancelar.","Guarda y confirma el nuevo estado."]},
 {id:"client-new",title:"Registrar un cliente",roles:["Dueño","Personal"],keywords:"cliente telefono correo historial",steps:["Abre Clientes.","Selecciona nuevo cliente.","Completa los datos necesarios.","Guarda y verifica que pueda encontrarse en la búsqueda."]},
 {id:"employee",title:"Agregar personal con permisos correctos",roles:["Dueño"],keywords:"empleado personal permiso rol acceso",steps:["Abre Equipo/Personal.","Crea o selecciona al empleado.","Asigna únicamente el rol que necesita.","Comprueba que no tenga acceso de SuperAdmin ni a otros negocios."]},
 {id:"booking-test",title:"Probar la reserva pública",roles:["Dueño","SuperAdmin"],keywords:"reserva publica link cliente disponibilidad",steps:["Abre el enlace público del negocio como cliente.","Selecciona servicio, profesional y horario.","Completa una reserva de prueba.","Confirma que aparece en el calendario correcto."]},
 {id:"cache-old",title:"El teléfono muestra una versión vieja",roles:["Dueño","Personal","SuperAdmin"],keywords:"cache version vieja telefono pwa actualizar",steps:["Confirma el número de versión mostrado.","Cierra y vuelve a abrir SAMBRIX.","Recarga la página.","Si continúa igual, usa el diagnóstico de Caché/PWA o solicita soporte."]},
 {id:"support-case",title:"Reportar un problema útilmente",roles:["Dueño","SuperAdmin"],keywords:"soporte error problema ticket",steps:["Indica qué negocio está afectado.","Describe exactamente qué intentabas hacer.","Anota dispositivo/navegador y versión SAMBRIX.","Explica los pasos para reproducir el fallo.","No compartas contraseñas ni claves privadas."]},
 {id:"admin-tenant",title:"Revisar aislamiento de un negocio",roles:["SuperAdmin"],keywords:"tenant aislamiento negocio seguridad",steps:["Selecciona el negocio desde SuperAdmin.","Revisa usuario, rol y businessId.","Ejecuta las pruebas de aislamiento.","No apruebes producción si un usuario puede leer o modificar otro tenant."]},
 {id:"admin-incident",title:"Gestionar una incidencia general",roles:["SuperAdmin"],keywords:"incidencia estado servicio mantenimiento",steps:["Confirma si afecta a uno o varios negocios.","Registra el caso en Soporte.","Si es general, publica Estado del Servicio.","Actualiza el estado hasta resolverlo y documenta la causa."]}
];

SaaS.renderHelpCenter=function(){
 const box=document.getElementById("helpGuideList");if(!box)return;
 const q=(document.getElementById("helpSearch")?.value||"").trim().toLowerCase();
 const role=document.getElementById("helpRoleFilter")?.value||"";
 const guides=SaaS.HELP_GUIDES;
 const rows=guides.filter(g=>(!role||g.roles.includes(role))&&(!q||(`${g.title} ${g.keywords} ${g.roles.join(" ")}`).toLowerCase().includes(q)));

 document.getElementById("helpGuideCount").textContent=guides.length;
 document.getElementById("helpOwnerCount").textContent=guides.filter(g=>g.roles.includes("Dueño")).length;
 document.getElementById("helpStaffCount").textContent=guides.filter(g=>g.roles.includes("Personal")).length;
 document.getElementById("helpAdminCount").textContent=guides.filter(g=>g.roles.includes("SuperAdmin")).length;

 box.innerHTML=rows.map(g=>`<details class="row help-guide">
   <summary>${g.title}<div class="help-role">${g.roles.join(" · ")}</div></summary>
   <div class="help-guide-body"><ol>${g.steps.map(s=>`<li>${s}</li>`).join("")}</ol></div>
 </details>`).join("")||'<div class="muted">No encontré una guía con esos filtros.</div>';
};

const oldRenderAll_189=SaaS.renderAll;
SaaS.renderAll=function(){oldRenderAll_189();SaaS.renderHelpCenter();};
