
SaaS.publicBusinessUrl=function(){
  const b=SaaS.currentBusiness();
  const u=new URL(location.href);
  u.search="";
  u.hash="";
  u.searchParams.set("business",b?.id||"");
  u.searchParams.set("cliente","app");
  return u.toString();
};

SaaS.renderPublicLink=function(){
  const input=document.getElementById("publicBusinessUrl");if(!input)return;
  const url=SaaS.publicBusinessUrl();input.value=url;
  const canvas=document.getElementById("publicBusinessQr");
  if(canvas&&window.QRCode?.toCanvas){
    QRCode.toCanvas(canvas,url,{width:180,margin:1},()=>{});
  }
};

SaaS.publishPublicBusiness=async function(){
  try{
    await window.NexoPublicCloud.publishCurrentBusiness();
    SaaS.renderPublicLink();
    window.App?.toast?.("App Cliente publicada");
  }catch(e){window.App?.toast?.(e.message||"No se pudo publicar")}
};

SaaS.copyPublicUrl=async function(){
  const url=SaaS.publicBusinessUrl();
  try{await navigator.clipboard.writeText(url);window.App?.toast?.("Enlace copiado")}catch{document.getElementById("publicBusinessUrl")?.select()}
};
