const DEFAULT_CODE=`input name: string = "Marcus"
input start: number = 5

var speed: number = start * 2
var enabled: boolean = toBoolean("true")
var message: string = "Hello " + name

if enabled && speed > 5 then
  output message
  output "Speed = " + speed
  delay 500
  set speed = speed + 10
else
  output "Disabled"
end

repeat 3 times
  output speed
  delay 150
  set speed = speed + 1
end

output "Final: " + toString(speed)`;
const codeEl=document.getElementById('code'),lineNums=document.getElementById('lineNums'),inputsEl=document.getElementById('inputs'),varsEl=document.getElementById('vars'),outputEl=document.getElementById('output'),errorsEl=document.getElementById('errors'),stateEl=document.getElementById('compileState'),cursorEl=document.getElementById('cursor');let controller=null,inputValues={};
codeEl.value=localStorage.getItem('blueprint-code-draft')||DEFAULT_CODE;
function syncLines(){lineNums.innerHTML=Array.from({length:codeEl.value.split('\n').length},(_,i)=>i+1).join('<br>');localStorage.setItem('blueprint-code-draft',codeEl.value)}
function cursor(){const before=codeEl.value.slice(0,codeEl.selectionStart),a=before.split('\n');cursorEl.textContent='Ln '+a.length+' · Col '+(a.at(-1).length+1)}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function scanInputs(){const found=[];codeEl.value.split(/\r?\n/).forEach(line=>{const m=line.trim().match(/^input\s+([A-Za-z_$][\w$]*)(?:\s*:\s*(number|string|boolean|any|array))?(?:\s*=\s*(.*))?$/i);if(m)found.push({name:m[1],type:(m[2]||'string').toLowerCase(),def:m[3]||''})});const old={...inputValues};inputsEl.innerHTML=found.length?found.map(i=>'<div class="input-row"><div class="input-label">'+esc(i.name)+' · '+esc(i.type)+'</div><input data-input="'+esc(i.name)+'" value="'+esc(old[i.name]??literalDefault(i.def,i.type))+'"></div>').join(''):'<div class="empty">No inputs declared.</div>';inputsEl.querySelectorAll('input').forEach(el=>el.oninput=()=>inputValues[el.dataset.input]=el.value)}
function literalDefault(s,t){if(!s)return t==='number'?'0':t==='boolean'?'false':t==='array'?'[]':'';if((s.startsWith('"')&&s.endsWith('"'))||(s.startsWith("'")&&s.endsWith("'")))return s.slice(1,-1);if(t==='number')return Number(s);if(t==='boolean')return s.toLowerCase()==='true';return s}
function showVars(state){const v=state?.vars||{};const keys=Object.keys(v);varsEl.innerHTML=keys.length?keys.map(k=>'<div class="var-row"><div><b>'+esc(k)+'</b><div class="var-type">'+esc(v[k].type)+'</div></div><div class="var-value">'+esc(typeof v[k].value==='object'?JSON.stringify(v[k].value):v[k].value)+'</div></div>').join(''):'<div class="empty">Run the program to inspect variables.</div>'}
function showError(e){stateEl.textContent='Error';stateEl.className='bad';errorsEl.innerHTML='<div class="error">'+esc(e.message||e)+'</div>'}
async function run(){controller?.abort();controller=new AbortController();errorsEl.innerHTML='';outputEl.textContent='';stateEl.textContent='Running…';stateEl.className='';inputValues={...inputValues};inputsEl.querySelectorAll('input').forEach(el=>inputValues[el.dataset.input]=el.value);try{const result=await BlueprintEngine.run(codeEl.value,inputValues,e=>{if(e.type==='output')outputEl.textContent+=(outputEl.textContent?'\n':'')+String(e.value);if(e.type==='var')showVars({vars:result?.vars||{}})},controller.signal);showVars(result);stateEl.textContent='Completed';stateEl.className='ok'}catch(e){showError(e);if(e.message==='Execution stopped')stateEl.textContent='Stopped'}}
document.getElementById('runBtn').onclick=run;document.getElementById('stopBtn').onclick=()=>{controller?.abort();stateEl.textContent='Stopped';stateEl.className='bad'};document.getElementById('newBtn').onclick=()=>{if(confirm('Start a new blueprint?')){codeEl.value=DEFAULT_CODE;inputValues={};syncLines();scanInputs();showVars(null);outputEl.textContent='Program output will appear here.';errorsEl.innerHTML='';stateEl.textContent='Ready';stateEl.className=''}};document.getElementById('saveBtn').onclick=()=>{const data={format:'BlueprintCode',version:1,name:'Untitled Blueprint',code:codeEl.value,inputs:inputValues};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='blueprint-project.bpc';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};document.getElementById('loadBtn').onclick=()=>document.getElementById('fileInput').click();document.getElementById('fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);codeEl.value=d.code||'';inputValues=d.inputs||{};syncLines();scanInputs();stateEl.textContent='Loaded';showVars(null)}catch{showError(Error('Invalid Blueprint project file'))}};r.readAsText(f);e.target.value=''};
codeEl.addEventListener('input',()=>{syncLines();scanInputs()});codeEl.addEventListener('scroll',()=>{lineNums.scrollTop=codeEl.scrollTop});codeEl.addEventListener('click',cursor);codeEl.addEventListener('keyup',cursor);codeEl.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const a=codeEl.selectionStart,b=codeEl.selectionEnd;codeEl.value=codeEl.value.slice(0,a)+'  '+codeEl.value.slice(b);codeEl.selectionStart=codeEl.selectionEnd=a+2;syncLines()}});scanInputs();syncLines();cursor();