
SaaS.renderBranches=function(){
  const box=document.getElementById("branchList");if(!box)return;
  const b=SaaS.currentBusiness(),ctx=SaaS.getContext();
  document.getElementById("branchBusinessLabel").innerHTML=`<strong>${b?.name||""}</strong> · ${b?.type||""}`;
  box.innerHTML=(b?.branches||[]).map(br=>`<article class="card branch-card ${ctx.branchId===br.id?"active-branch":""}">
    <span class="tag">${br.active===false?"INACTIVA":"SUCURSAL"}</span><h3>${br.name}</h3><div class="muted">${br.city||""}</div><p>${br.address||""}</p><div class="manage-actions"><button class="btn primary" onclick="SaaS.selectBranch('${br.id}')">Entrar</button><button class="btn edit" onclick="SaaS.editBranch('${br.id}')">Editar</button>${(b.branches||[]).length>1?`<button class="btn danger" onclick="SaaS.deleteBranch('${br.id}')">Eliminar</button>`:""}</div>
  </article>`).join("");
};
SaaS.openBranchModal=function(){document.getElementById("branchModal")?.classList.remove("hidden");["branchName","branchCity","branchAddress","branchWhatsapp"].forEach(id=>document.getElementById(id).value="");document.getElementById("branchModal").dataset.edit=""};
SaaS.closeBranchModal=()=>document.getElementById("branchModal")?.classList.add("hidden");
SaaS.saveBranch=function(){
  const b=SaaS.currentBusiness(),name=document.getElementById("branchName").value.trim();if(!b||!name)return window.App?.toast?.("Escribe nombre de sucursal");
  const id=document.getElementById("branchModal").dataset.edit;
  const data={name,city:document.getElementById("branchCity").value,address:document.getElementById("branchAddress").value,whatsapp:document.getElementById("branchWhatsapp").value,active:true};
  if(id)Object.assign(b.branches.find(x=>x.id===id),data);else b.branches.push({id:SaaS.uid(),...data});
  SaaS.save();SaaS.closeBranchModal();SaaS.renderAll();
};
SaaS.editBranch=function(id){const b=SaaS.currentBusiness(),br=b?.branches?.find(x=>x.id===id);if(!br)return;SaaS.openBranchModal();document.getElementById("branchModal").dataset.edit=id;document.getElementById("branchName").value=br.name||"";document.getElementById("branchCity").value=br.city||"";document.getElementById("branchAddress").value=br.address||"";document.getElementById("branchWhatsapp").value=br.whatsapp||""};
SaaS.selectBranch=function(id){const b=SaaS.currentBusiness();if(!b?.branches?.some(x=>x.id===id))return;const c=SaaS.getContext();SaaS.setContext({...c,branchId:id});SaaS.applyTenantContext();SaaS.renderAll();window.App?.toast?.("Sucursal seleccionada")};
SaaS.deleteBranch=function(id){const b=SaaS.currentBusiness();if(!b||b.branches.length<=1)return; if(!confirm("¿Eliminar sucursal?"))return;b.branches=b.branches.filter(x=>x.id!==id);SaaS.save();SaaS.renderAll()};
