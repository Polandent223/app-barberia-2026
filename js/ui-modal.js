
App.modalState={onSave:null};

App.closeModal=function(){
  App.hide("appModal");
  App.byId("appModal").setAttribute("aria-hidden","true");
  App.modalState.onSave=null;
};

App.openFormModal=function({tag="EDITAR",title="Editar",fields=[],note="",saveText="Guardar cambios",onSave}){
  App.byId("modalTag").textContent=tag;
  App.byId("modalTitle").textContent=title;
  App.byId("modalSaveBtn").textContent=saveText;
  App.modalState.onSave=onSave;

  const html=`
    ${note?`<div class="modal-note">${note}</div>`:""}
    <div class="modal-grid">
      ${fields.map(f=>{
        if(f.type==="select"){
          return `<label>${f.label}<select id="modal_${f.name}">${(f.options||[]).map(o=>`<option value="${o.value}" ${String(o.value)===String(f.value)?"selected":""}>${o.label}</option>`).join("")}</select></label>`;
        }
        if(f.type==="textarea"){
          return `<label style="grid-column:1/-1">${f.label}<textarea id="modal_${f.name}">${f.value??""}</textarea></label>`;
        }
        return `<label>${f.label}<input id="modal_${f.name}" type="${f.type||"text"}" value="${String(f.value??"").replaceAll('"',"&quot;")}" ${f.step?`step="${f.step}"`:""}></label>`;
      }).join("")}
    </div>`;
  App.byId("modalBody").innerHTML=html;
  App.show("appModal");
  App.byId("appModal").setAttribute("aria-hidden","false");
};

App.readModal=function(name){return App.byId("modal_"+name)?.value||""};

App.openConfirmModal=function({title="Confirmar",message="",confirmText="Eliminar",onConfirm}){
  App.openFormModal({
    tag:"CONFIRMAR",
    title,
    note:message,
    fields:[],
    saveText:confirmText,
    onSave:onConfirm
  });
};

document.addEventListener("DOMContentLoaded",()=>{
  App.byId("modalCloseBtn").addEventListener("click",App.closeModal);
  App.byId("modalCancelBtn").addEventListener("click",App.closeModal);
  App.byId("modalSaveBtn").addEventListener("click",()=>{
    if(typeof App.modalState.onSave==="function") App.modalState.onSave();
  });
  App.byId("appModal").addEventListener("click",e=>{if(e.target===App.byId("appModal"))App.closeModal()});
});
