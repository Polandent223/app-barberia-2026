
SaaS.openMembers=function(businessId){
  const b=SaaS.db.businesses.find(x=>x.id===businessId);if(!b)return;
  document.getElementById("businessUsersBusinessId").value=businessId;
  document.getElementById("businessUsersTitle").textContent=`Usuarios · ${b.name}`;
  document.getElementById("businessUsersModal").classList.remove("hidden");
  SaaS.renderMembers();
};
SaaS.closeMembers=()=>document.getElementById("businessUsersModal")?.classList.add("hidden");

SaaS.renderMembers=async function(){
  const id=document.getElementById("businessUsersBusinessId")?.value;if(!id||!window.SaaSAuthAdmin)return;
  const box=document.getElementById("businessMembersList");
  try{
    const list=await SaaSAuthAdmin.listBusinessMembers(id);
    box.innerHTML=list.map(m=>`<div class="row"><div><strong>${m.name||m.email}</strong><small>${m.email} · ${m.role}</small></div><button class="btn danger" onclick="SaaS.removeMember('${m.uid}')">Quitar acceso</button></div>`).join("")||'<div class="muted">Sin usuarios Firebase en este negocio.</div>';
  }catch(e){box.innerHTML=`<div class="muted">${e.message}</div>`}
};
SaaS.createMember=async function(){
  const businessId=document.getElementById("businessUsersBusinessId").value;
  try{
    await SaaSAuthAdmin.createBusinessMember({
      businessId,
      name:document.getElementById("memberName").value.trim(),
      email:document.getElementById("memberEmail").value.trim(),
      password:document.getElementById("memberPassword").value,
      role:document.getElementById("memberRole").value
    });
    window.App?.toast?.("Usuario creado");
    document.getElementById("memberPassword").value="";
    await SaaS.renderMembers();
  }catch(e){window.App?.toast?.(e.message||"No se pudo crear usuario")}
};
SaaS.removeMember=async function(uid){
  const businessId=document.getElementById("businessUsersBusinessId").value;
  if(!confirm("¿Quitar acceso a este negocio?"))return;
  try{await SaaSAuthAdmin.removeBusinessMember(businessId,uid);await SaaS.renderMembers();window.App?.toast?.("Acceso retirado")}catch(e){window.App?.toast?.(e.message)}
};
