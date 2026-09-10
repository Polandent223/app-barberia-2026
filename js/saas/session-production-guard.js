/* SAMBRIX · Refuerzo de sesión y acceso de producción */
(function(){
  const blockedStatuses=new Set(["suspendido","suspended","inactivo","inactive","bloqueado","blocked"]);

  function install(){
    const S=window.SaaS;
    if(!S?.resolveFirebaseSession||S.__productionSessionGuard)return false;

    const base=S.resolveFirebaseSession.bind(S);
    S.resolveFirebaseSession=async function(){
      const session=await base();
      if(!session||session.role==="guest"||session.role==="superadmin")return session;

      const profile=window.SaaSAuthAdmin?.profile;
      if(profile?.active===false){
        S.session={role:"guest",user:session.user||null,businessId:"",branchId:""};
        window.SaaSCloudProduction?.stopSessionCloud?.();
        window.App?.toast?.("Este acceso está suspendido. Contacta al administrador del negocio.");
        return S.session;
      }

      const business=(S.db.businesses||[]).find(b=>b.id===session.businessId);
      const status=String(business?.status||"").trim().toLowerCase();
      if(blockedStatuses.has(status)){
        S.session={role:"guest",user:session.user||null,businessId:"",branchId:""};
        window.SaaSCloudProduction?.stopSessionCloud?.();
        window.App?.toast?.("Este negocio no está disponible temporalmente.");
        return S.session;
      }

      return session;
    };

    S.__productionSessionGuard=true;
    return true;
  }

  if(install())return;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(install()||tries>80)clearInterval(timer);
  },100);
})();
