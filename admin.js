(() => {
const cfg=window.BI_CONFIG||{}, PAGE_SIZE=25;
let page=0,totalRows=0,currentRows=[];
const login=document.getElementById("login"),dashboard=document.getElementById("dashboard"),logout=document.getElementById("logout"),loginMsg=document.getElementById("loginMsg"),dashMsg=document.getElementById("dashMsg");
if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey||cfg.supabasePublishableKey.includes("COLE_AQUI")){loginMsg.textContent="Configuração do Supabase em falta.";return;}
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const esc=v=>{const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML};
const fmt=v=>new Intl.DateTimeFormat("pt-PT",{dateStyle:"short",timeStyle:"short"}).format(new Date(v));
function showLogin(){login.classList.remove("hidden");dashboard.classList.add("hidden");logout.classList.add("hidden")}
function showDash(){login.classList.add("hidden");dashboard.classList.remove("hidden");logout.classList.remove("hidden")}
async function check(){const{data:{session}}=await client.auth.getSession();if(!session){showLogin();return}const{data,error}=await client.rpc("sou_administrador");if(error||data!==true){await client.auth.signOut();loginMsg.textContent="Conta sem autorização administrativa.";showLogin();return}showDash();await loadAll()}
document.getElementById("loginForm").addEventListener("submit",async e=>{e.preventDefault();loginMsg.textContent="";const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value;const{error}=await client.auth.signInWithPassword({email,password});if(error){loginMsg.textContent="E-mail ou palavra-passe incorretos.";return}await check()});
logout.addEventListener("click",async()=>{await client.auth.signOut();showLogin()});

let provinceChartInstance=null,dailyChartInstance=null;

async function charts(){
 const [{data:provinceData,error:provinceError},{data:dailyData,error:dailyError}]
   = await Promise.all([
     client.rpc("obter_assinaturas_por_provincia_admin"),
     client.rpc("obter_evolucao_diaria_admin")
   ]);

 if(!provinceError){
   const labels=(provinceData||[]).map(r=>r.provincia);
   const values=(provinceData||[]).map(r=>Number(r.total||0));
   if(provinceChartInstance)provinceChartInstance.destroy();
   provinceChartInstance=new Chart(document.getElementById("provinceChart"),{
     type:"doughnut",
     data:{labels,datasets:[{label:"Assinaturas",data:values}]},
     options:{
       responsive:true,
       maintainAspectRatio:false,
       cutout:"62%",
       plugins:{
         legend:{position:"bottom"},
         tooltip:{callbacks:{label:(ctx)=>`${ctx.label}: ${ctx.raw}`}}
       }
     }
   });
 }

 if(!dailyError){
   const labels=(dailyData||[]).map(r=>new Date(r.dia).toLocaleDateString("pt-PT"));
   const values=(dailyData||[]).map(r=>Number(r.total||0));
   if(dailyChartInstance)dailyChartInstance.destroy();
   dailyChartInstance=new Chart(document.getElementById("dailyChart"),{
     type:"line",
     data:{labels,datasets:[{label:"Assinaturas por dia",data:values,tension:.35,fill:true,borderWidth:3,pointRadius:3}]},
     options:{
       responsive:true,
       maintainAspectRatio:false,
       scales:{y:{beginAtZero:true,ticks:{precision:0}}}
     }
   });
 }
}

async function metrics(){const{data,error}=await client.rpc("obter_metricas_admin");if(error)return;const r=Array.isArray(data)?data[0]:data;document.getElementById("total").textContent=Number(r?.total||0).toLocaleString("pt-PT");document.getElementById("today").textContent=Number(r?.hoje||0).toLocaleString("pt-PT");document.getElementById("week").textContent=Number(r?.ultimos_7_dias||0).toLocaleString("pt-PT");document.getElementById("leader").textContent=r?.provincia_lider||"—"}
async function provinces(){const{data}=await client.rpc("listar_provincias_admin");const s=document.getElementById("province"),cur=s.value;s.innerHTML='<option value="">Todas</option>'+(data||[]).map(r=>`<option>${esc(r.provincia)}</option>`).join("");s.value=cur}
async function rows(){dashMsg.textContent="";const q=document.getElementById("search").value.trim(),p=document.getElementById("province").value;let req=client.from("assinaturas").select("id,nome,provincia,created_at",{count:"exact"}).order("created_at",{ascending:false}).range(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE-1);if(q)req=req.ilike("nome",`%${q.replace(/[%_]/g,"")}%`);if(p)req=req.eq("provincia",p);const{data,error,count}=await req;if(error){dashMsg.textContent="Erro ao carregar assinaturas.";return}currentRows=data||[];totalRows=count||0;render()}
function render(){const b=document.getElementById("rows");b.innerHTML=currentRows.map(r=>`<tr><td>${esc(r.nome)}</td><td>${esc(r.provincia)}</td><td>${fmt(r.created_at)}</td><td><button data-id="${r.id}" class="del">Eliminar</button></td></tr>`).join("")||'<tr><td colspan="4">Sem registos.</td></tr>';document.getElementById("count").textContent=`(${totalRows})`;document.getElementById("page").textContent=`Página ${page+1} de ${Math.max(1,Math.ceil(totalRows/PAGE_SIZE))}`;document.getElementById("prev").disabled=page===0;document.getElementById("next").disabled=(page+1)*PAGE_SIZE>=totalRows;b.querySelectorAll(".del").forEach(x=>x.addEventListener("click",()=>remove(x.dataset.id)))}
async function remove(id){if(!confirm("Eliminar esta assinatura?"))return;const{error}=await client.from("assinaturas").delete().eq("id",id);dashMsg.textContent=error?"Erro ao eliminar.":"Assinatura eliminada.";await loadAll()}
async function loadAll(){await Promise.all([metrics(),provinces(),charts()]);await rows()}
document.getElementById("refresh").addEventListener("click",loadAll);document.getElementById("province").addEventListener("change",()=>{page=0;rows()});document.getElementById("search").addEventListener("input",()=>{page=0;clearTimeout(window.t);window.t=setTimeout(rows,350)});document.getElementById("prev").addEventListener("click",()=>{if(page>0){page--;rows()}});document.getElementById("next").addEventListener("click",()=>{if((page+1)*PAGE_SIZE<totalRows){page++;rows()}});
document.getElementById("csv").addEventListener("click",async()=>{const{data,error}=await client.from("assinaturas").select("nome,provincia,created_at").order("created_at",{ascending:false});if(error){dashMsg.textContent="Erro ao exportar.";return}const arr=[["Nome","Província","Data"],...(data||[]).map(r=>[r.nome,r.provincia,r.created_at])];const csv=arr.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),u=URL.createObjectURL(blob),a=document.createElement("a");a.href=u;a.download=`assinaturas-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(u)});
client.auth.onAuthStateChange((_e,s)=>{if(!s)showLogin()});check();
})();