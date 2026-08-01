(()=>{"use strict";
const cfg=window.BI_CONFIG||{},status=document.getElementById("status"),form=document.getElementById("resetForm"),message=document.getElementById("message");
if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey||cfg.supabasePublishableKey.includes("COLE_AQUI")){status.textContent="Configuração do Supabase em falta.";return}
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
function ready(){status.textContent="Link validado. Introduza uma nova palavra-passe.";form.classList.remove("hidden")}
client.auth.onAuthStateChange((event,session)=>{if((event==="PASSWORD_RECOVERY"||event==="SIGNED_IN")&&session)ready()});
(async()=>{const q=new URLSearchParams(location.search);if(q.get("error_description")){status.textContent=decodeURIComponent(q.get("error_description").replace(/\+/g," "));return}
const{data:{session}}=await client.auth.getSession();if(session)ready();else setTimeout(async()=>{const{data:{session:s}}=await client.auth.getSession();if(s)ready();else status.textContent="O link é inválido, já foi utilizado ou expirou. Volte ao painel e peça um novo e-mail.";},1200)})();
form.addEventListener("submit",async e=>{e.preventDefault();message.textContent="";const p=document.getElementById("newPassword").value,c=document.getElementById("confirmPassword").value;if(p.length<8){message.textContent="Use pelo menos 8 caracteres.";return}if(p!==c){message.textContent="As palavras-passe não coincidem.";return}
const{error}=await client.auth.updateUser({password:p});if(error){message.textContent="Não foi possível atualizar a palavra-passe.";return}
message.textContent="Palavra-passe atualizada com sucesso.";setTimeout(()=>location.href="admin.html",1500)});
})();