const $ = id => document.getElementById(id);
const STORE = "cadg:v1";
const state = {
  image: null,
  processed: null,
  settings: load("settings", {
    shopName:"",shopPhone:"",shopAddress:"",shopTagline:"أناقة تستحقها",
    currency:"ر.س",accent:"#111827",showShopName:true,showContact:true
  }),
  providers: load("providers", []),
  active: load("activation", {active:false,expiresAt:null}),
  lastBlob:null,
  deferredInstall:null
};
function load(k, fallback){try{return JSON.parse(localStorage.getItem(`${STORE}:${k}`)) ?? fallback}catch{return fallback}}
function save(k,v){localStorage.setItem(`${STORE}:${k}`,JSON.stringify(v))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function getProduct(){
  return {name:$("productName").value.trim(),price:$("price").value.trim(),oldPrice:$("oldPrice").value.trim(),
    quantity:$("quantity").value.trim(),size:$("size").value.trim(),colors:$("colors").value.trim(),
    age:$("age").value.trim(),gender:$("gender").value};
}
function setOnline(){const on=navigator.onLine;$("onlineText").textContent=on?"متصل":"بدون إنترنت";$("onlineDot").style.background=on?"#16a34a":"#dc2626"}
addEventListener("online",setOnline);addEventListener("offline",setOnline);setOnline();

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab,.tab-panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});

function hydrateSettings(){
  for(const k of ["shopName","shopPhone","shopAddress","shopTagline","currency","accent","showShopName","showContact"]){
    if($(k)) $(k).type==="checkbox"?$(k).checked=!!state.settings[k]:$(k).value=state.settings[k]??"";
  }
  document.documentElement.style.setProperty("--accent",state.settings.accent||"#111827");
}
hydrateSettings();

$("saveSettings").onclick=()=>{
  for(const k of ["shopName","shopPhone","shopAddress","shopTagline","currency","accent","showShopName","showContact"])
    state.settings[k]=$(k).type==="checkbox"?$(k).checked:$(k).value;
  save("settings",state.settings);hydrateSettings();draw();toast("تم حفظ إعدادات المركز محليًا");
};

$("imageInput").onchange=e=>handleFile(e.target.files?.[0]);
$("dropzone").ondragover=e=>e.preventDefault();
$("dropzone").ondrop=e=>{e.preventDefault();handleFile(e.dataTransfer.files?.[0])};

async function handleFile(file){
  if(!file || !file.type.startsWith("image/")) return toast("اختر ملف صورة صحيح");
  state.image=await fileToImage(file);
  $("sourcePreview").src=state.image.src;$("sourcePreview").hidden=false;$("dropContent").hidden=true;
  draw();
}
function fileToImage(file){return new Promise((res,rej)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);res(im)};im.onerror=rej;im.src=u})}

$("removeBg").onchange=()=>draw();
$("backgroundMode").onchange=()=>draw();
["productName","price","oldPrice","quantity","size","colors","age","gender","showOldPrice","showDetails"].forEach(id=>$(id).addEventListener("input",draw));

function draw(){
  const c=$("adCanvas"),ctx=c.getContext("2d"),p=getProduct();
  ctx.clearRect(0,0,c.width,c.height);
  const bg=$("backgroundMode").value;
  const g=ctx.createLinearGradient(0,0,c.width,c.height);
  if(bg==="dark"){g.addColorStop(0,"#111827");g.addColorStop(1,"#374151")}
  else if(bg==="beige"){g.addColorStop(0,"#f8f0e3");g.addColorStop(1,"#e7d5bd")}
  else if(bg==="white"){g.addColorStop(0,"#fff");g.addColorStop(1,"#f2f4f7")}
  else {g.addColorStop(0,"#f8fafc");g.addColorStop(1,"#e7edf5")}
  ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
  // decorative local geometry
  ctx.globalAlpha=.13;ctx.fillStyle=state.settings.accent||"#111827";ctx.beginPath();ctx.arc(950,150,220,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  if(state.image){
    const box={x:90,y:150,w:900,h:760};
    const imgCanvas=document.createElement("canvas");imgCanvas.width=box.w;imgCanvas.height=box.h;
    const ic=imgCanvas.getContext("2d");const ratio=Math.min(box.w/state.image.width,box.h/state.image.height);
    const w=state.image.width*ratio,h=state.image.height*ratio;ic.drawImage(state.image,(box.w-w)/2,(box.h-h)/2,w,h);
    if($("removeBg").checked) approximateBackgroundRemoval(ic,box.w,box.h);
    ctx.drawImage(imgCanvas,box.x,box.y,box.w,box.h);
  } else {
    ctx.fillStyle="#667085";ctx.font="700 34px system-ui";ctx.textAlign="center";ctx.fillText("ارفع صورة المنتج",540,540);
  }
  ctx.fillStyle=state.settings.accent||"#111827";ctx.fillRect(0,0,1080,16);
  ctx.textAlign="right";ctx.fillStyle=bg==="dark"?"#fff":"#111827";
  ctx.font="800 42px system-ui";ctx.fillText(state.settings.showShopName&&state.settings.shopName?state.settings.shopName:"عرض ملابس",980,85);
  ctx.font="700 54px system-ui";ctx.fillText(p.name||"اسم المنتج",980,1030);
  if(p.price){ctx.fillStyle=state.settings.accent||"#111827";ctx.font="900 70px system-ui";ctx.fillText(`${p.price} ${state.settings.currency||"ر.س"}`,980,1120)}
  if($("showOldPrice").checked&&p.oldPrice){ctx.fillStyle="#98a2b3";ctx.font="500 31px system-ui";ctx.fillText(`قبل الخصم: ${p.oldPrice} ${state.settings.currency||"ر.س"}`,980,1162)}
  if($("showDetails").checked){
    const details=[p.size&&`المقاس: ${p.size}`,p.colors&&`الألوان: ${p.colors}`,p.quantity&&`الكمية: ${p.quantity}`].filter(Boolean).join("  •  ");
    ctx.fillStyle=bg==="dark"?"#d0d5dd":"#667085";ctx.font="600 25px system-ui";ctx.fillText(details,980,1210);
  }
  if(state.settings.showContact){
    ctx.fillStyle=bg==="dark"?"#e5e7eb":"#475467";ctx.font="500 22px system-ui";
    const contact=[state.settings.shopAddress,state.settings.shopPhone].filter(Boolean).join("  •  ");
    ctx.fillText(contact,980,1270);
  }
  ctx.textAlign="left";ctx.font="600 18px system-ui";ctx.fillStyle=bg==="dark"?"#98a2b3":"#98a2b3";ctx.fillText("Clothing Ad Generator",45,1305);
}

function approximateBackgroundRemoval(ctx,w,h){
  const d=ctx.getImageData(0,0,w,h),a=d.data;
  const samples=[];
  for(const [x,y] of [[0,0],[w-1,0],[0,h-1],[w-1,h-1],[Math.floor(w/2),0]]){const i=(y*w+x)*4;samples.push([a[i],a[i+1],a[i+2]])}
  const avg=samples.reduce((s,v)=>s.map((x,i)=>x+v[i]),[0,0,0]).map(x=>x/samples.length);
  const q=[[0,0],[w-1,0],[0,h-1],[w-1,h-1]],seen=new Uint8Array(w*h),stack=q.slice();
  const threshold=58;
  while(stack.length){
    const [x,y]=stack.pop();if(x<0||y<0||x>=w||y>=h)continue;const pos=y*w+x;if(seen[pos])continue;
    const i=pos*4,dist=Math.hypot(a[i]-avg[0],a[i+1]-avg[1],a[i+2]-avg[2]);
    if(dist>threshold)continue;seen[pos]=1;a[i+3]=Math.max(0,a[i+3]-210);
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(d,0,0);
}

$("generateBtn").onclick=()=>{draw();$("downloadBtn").disabled=false;$("shareBtn").disabled=false;$("whatsappBtn").disabled=false;localCopy();toast("تم إنشاء الإعلان محليًا")};
$("downloadBtn").onclick=()=>{$("adCanvas").toBlob(b=>{state.lastBlob=b;const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`${getProduct().name||"clothing-ad"}.png`;a.click()}, "image/png")};
$("shareBtn").onclick=async()=>{if(!navigator.share)return toast("المشاركة غير مدعومة في هذا المتصفح");$("adCanvas").toBlob(async b=>{try{const f=new File([b],"clothing-ad.png",{type:"image/png"});await navigator.share({title:getProduct().name||"إعلان ملابس",text:$("marketingText").value,files:[f]})}catch(e){}}, "image/png")};
$("whatsappBtn").onclick=()=>{const text=encodeURIComponent($("marketingText").value||"إعلان جديد للملابس");open(`https://wa.me/?text=${text}`,"_blank","noopener")};

function localCopy(){
  const p=getProduct(),s=state.settings;
  const title=p.name||"منتجنا الجديد";
  const price=p.price?` بسعر ${p.price} ${s.currency||"ر.س"}`:"";
  const detail=[p.size&&`المقاسات ${p.size}`,p.colors&&`الألوان ${p.colors}`].filter(Boolean).join(" • ");
  $("marketingText").value=`✨ ${title}\n${s.shopName?s.shopName+" يقدم لكم ":""}اختيارًا أنيقًا بجودة مميزة${price}.\n${detail}${detail?"\n":""}${s.shopPhone?`للطلب والاستفسار: ${s.shopPhone}`:"تواصل معنا لمعرفة التفاصيل."}`;
}
$("localCopyBtn").onclick=()=>{localCopy();toast("تم إنشاء نص محلي بدون AI")};

function renderProviders(){
  const box=$("providerList");
  if(!state.providers.length){box.innerHTML="<p class='muted'>لا توجد مفاتيح مضافة.</p>";return}
  box.innerHTML=state.providers.map((p,i)=>`<div class="provider-item"><div><b>${esc(p.name||p.type)}</b><small>${esc(p.model||"بدون نموذج")} • ${esc(p.endpoint||"")}</small><label class="check"><input type="radio" name="activeProvider" data-active="${i}" ${state.activeProvider===i?'checked':''}> المزود النشط</label></div><button class="danger" data-remove="${i}">حذف</button></div>`).join("");
  box.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const i=+b.dataset.remove;state.providers.splice(i,1);if(state.activeProvider===i)state.activeProvider=0;if(state.activeProvider>i)state.activeProvider--;save('providers',state.providers);save('activeProvider',state.activeProvider);renderProviders()});
  box.querySelectorAll('[data-active]').forEach(b=>b.onchange=()=>{state.activeProvider=+b.dataset.active;save('activeProvider',state.activeProvider);renderProviders()});
}
state.activeProvider=load('activeProvider',0);
renderProviders();
async function localCryptoKey(){return crypto.subtle.importKey('raw',new TextEncoder().encode(location.origin+'|clothing-ad-generator-v2'),'PBKDF2',false,['deriveKey'])}
async function protectKey(value){try{if(!crypto?.subtle)return value;const base=await localCryptoKey(),salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);const iv=crypto.getRandomValues(new Uint8Array(12));const enc=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(value));const all=new Uint8Array(salt.length+iv.length+enc.byteLength);all.set(salt);all.set(iv,salt.length);all.set(new Uint8Array(enc),salt.length+iv.length);return 'enc:'+btoa(String.fromCharCode(...all))}catch{return value}}
async function revealKey(value){if(!String(value).startsWith('enc:'))return value;try{const raw=Uint8Array.from(atob(value.slice(4)),c=>c.charCodeAt(0)),salt=raw.slice(0,16),iv=raw.slice(16,28),enc=raw.slice(28),base=await localCryptoKey(),key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);const out=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,enc);return new TextDecoder().decode(out)}catch{return ''}}
$("addProvider").onclick=async()=>{const endpoint=$("providerEndpoint").value.trim(),rawKey=$("providerKey").value.trim();if(!endpoint||!rawKey)return toast('أدخل endpoint و API key');if(!/^https?:\/\//i.test(endpoint))return toast('Endpoint يجب أن يبدأ بـ http:// أو https://');const p={id:crypto.randomUUID(),type:$("providerType").value,name:$("providerName").value.trim()||'AI Provider',endpoint:endpoint.replace(/\/$/,''),model:$("providerModel").value.trim()||'default',key:await protectKey(rawKey),active:true};state.providers.push(p);state.activeProvider=state.providers.length-1;save('providers',state.providers);save('activeProvider',state.activeProvider);$("providerKey").value='';renderProviders();toast('تمت إضافة المزود والمفتاح محليًا')};
async function aiText(){if(!state.providers.length)return toast('أضف مفتاح AI أولًا');const ordered=[state.activeProvider,...state.providers.map((_,i)=>i)].filter((v,i,a)=>a.indexOf(v)===i);for(const idx of ordered){const p=state.providers[idx];if(!p)continue;const key=await revealKey(p.key);if(!key)continue;try{const url=p.endpoint.replace(/\/$/,'')+'/chat/completions';const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:p.model,messages:[{role:'system',content:'اكتب نصًا تسويقيًا عربيًا قصيرًا لمنتج ملابس، بدون اختلاق معلومات غير موجودة.'},{role:'user',content:JSON.stringify(getProduct())}],temperature:.7})});if(!r.ok)continue;const j=await r.json(),text=j?.choices?.[0]?.message?.content?.trim();if(text){$("marketingText").value=text;state.activeProvider=idx;save('activeProvider',idx);renderProviders();toast(`تم توليد النص عبر ${p.name}`);return}}catch{}}toast('فشل جميع مزودي AI؛ استخدمت الوضع المحلي');localCopy()}
$("aiTextBtn").onclick=aiText;$("testAiBtn").onclick=aiText;
$("aiTryOnBtn").onclick=()=>toast('Try-On يحتاج مزود image-to-image حقيقي. لن نرسل الصورة إلى endpoint نصي بالخطأ.');

async function decodeActivation(token){try{const [payload,signature,...extra]=String(token||'').split('.');if(!payload||!signature||extra.length)return null;const pad=payload.replaceAll('-','+').replaceAll('_','/')+'==='.slice((payload.length+3)%4);return {payload,signature,obj:JSON.parse(atob(pad))}}catch{return null}}
async function verifyActivation(token,publicKeyPem){const x=await decodeActivation(token);if(!x||x.obj.v!==1||Date.now()<x.obj.issuedAt-60000||Date.now()>=x.obj.expiresAt)return false;try{const pem=publicKeyPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\\s/g,'');const bytes=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));const key=await crypto.subtle.importKey('spki',bytes,{name:'Ed25519'},false,['verify']);const sig=Uint8Array.from(atob(x.signature.replaceAll('-','+').replaceAll('_','/')+'==='.slice((x.signature.length+3)%4)),c=>c.charCodeAt(0));return await crypto.subtle.verify({name:'Ed25519'},key,sig,new TextEncoder().encode(x.payload))}catch{return false}}
async function updateActivationStatus(){const a=state.active;if(!a){$("activationStatus").textContent=navigator.onLine?'لم يتم التفعيل بعد.':'لا يوجد تفعيل محفوظ.';return}const ok=a.token&&a.publicKey&&await verifyActivation(a.token,a.publicKey);$("activationStatus").textContent=ok?`التفعيل صالح حتى ${new Date(a.expiresAt).toLocaleDateString('ar')} • ${navigator.onLine?'متصل':'Offline'}`:'التفعيل غير صالح أو منتهي؛ يلزم تفعيل جديد.'}
$("activateBtn").onclick=async()=>{const code=$("accessCode").value.trim();if(!code)return toast('أدخل رمز الاستخدام');if(!navigator.onLine)return toast('التفعيل الأول يحتاج اتصالًا بالإنترنت');try{const r=await fetch('/api/activate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const j=await r.json();if(!r.ok)throw new Error(j.error||'فشل التفعيل');if(!j.token||!j.publicKey||!(await verifyActivation(j.token,j.publicKey)))throw new Error('توقيع التفعيل غير صالح');state.active={token:j.token,publicKey:j.publicKey,expiresAt:j.expiresAt};save('activation',state.active);await updateActivationStatus();toast('تم التفعيل والتحقق من التوقيع')}catch(e){toast(e.message||'فشل التفعيل')}};
$("createTokenBtn").onclick=async()=>{const secret=$("developerSecret").value.trim(),days=+$("tokenDays").value;if(!secret)return toast('أدخل سر المطور');try{const r=await fetch('/api/developer/tokens',{method:'POST',headers:{'Content-Type':'application/json','X-Developer-Secret':secret},body:JSON.stringify({days})});const j=await r.json();if(!r.ok)throw new Error(j.error||'فشل');$("tokenOutput").textContent=j.code;toast('تم إنشاء الرمز')}catch(e){$("tokenOutput").textContent=e.message||'فشل'}};
$("resetBtn").onclick=()=>{if(confirm("إعادة ضبط بيانات الإعلان؟")){["productName","price","oldPrice","quantity","size","colors","age"].forEach(x=>$(x).value="");$("gender").value="";$("marketingText").value="";state.image=null;$("sourcePreview").hidden=true;$("dropContent").hidden=false;draw()}};
addEventListener("beforeinstallprompt",e=>{e.preventDefault();state.deferredInstall=e;$("installBtn").hidden=false});
$("installBtn").onclick=async()=>{if(!state.deferredInstall)return;state.deferredInstall.prompt();state.deferredInstall=null;$("installBtn").hidden=true};
function toast(msg){let t=document.querySelector(".toast");if(!t){t=document.createElement("div");t.className="toast";Object.assign(t.style,{position:"fixed",bottom:"22px",left:"50%",transform:"translateX(-50%)",background:"#111827",color:"#fff",padding:"12px 16px",borderRadius:"12px",zIndex:100,fontSize:"13px"});document.body.append(t)}t.textContent=msg;clearTimeout(t._x);t._x=setTimeout(()=>t.remove(),2800)}
draw();
