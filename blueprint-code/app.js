const DEFAULT_CODE=`name = input_value("name", "Marcus")
start = input_value("start", 5)

speed = start * 2
enabled = True
message = f"Hello {name}"

if enabled and speed > 5:
    print(message)
    print("Speed =", speed)
    await delay(500)
    speed += 10
else:
    print("Disabled")

for i in range(3):
    print(speed)
    await delay(150)
    speed += 1

print("Final:", str(speed))`;
const codeEl=document.getElementById('code'),lineNums=document.getElementById('lineNums'),inputsEl=document.getElementById('inputs'),varsEl=document.getElementById('vars'),outputEl=document.getElementById('output'),errorsEl=document.getElementById('errors'),stateEl=document.getElementById('compileState'),cursorEl=document.getElementById('cursor');let controller=null,inputValues={};
codeEl.value=localStorage.getItem('python-code-draft')||DEFAULT_CODE;
function syncLines(){lineNums.innerHTML=Array.from({length:codeEl.value.split('\n').length},(_,i)=>i+1).join('<br>');localStorage.setItem('python-code-draft',codeEl.value)}
function cursor(){const before=codeEl.value.slice(0,codeEl.selectionStart),a=before.split('\n');cursorEl.textContent='Ln '+a.length+' · Col '+(a.at(-1).length+1)}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function scanInputs(){const found=[];const re=/input_value\(\s*["']([^"']+)["']\s*,\s*([^\)]+)\)/g;codeEl.value.split(/\r?\n/).forEach(line=>{let m;while((m=re.exec(line))){let d=m[2].trim(),type='str';if(d==='True'||d==='False')type='bool';else if(/^-?\d+$/.test(d))type='int';else if(/^-?(?:\d+\.\d*|\d*\.\d+)$/.test(d))type='float';else if(d.startsWith('['))type='list';found.push({name:m[1],type,def:d})}});const unique=[];const seen=new Set();for(const x of found)if(!seen.has(x.name)){seen.add(x.name);unique.push(x)}inputsEl.innerHTML=unique.length?unique.map(i=>'<div class="input-row"><div class="input-label">'+esc(i.name)+' · '+esc(i.type)+'</div><input data-input="'+esc(i.name)+'" value="'+esc(inputValues[i.name]??literalDefault(i.def,i.type))+'"></div>').join(''):'<div class="empty">Use input_value("name", default) to create a live input.</div>';inputsEl.querySelectorAll('input').forEach(el=>el.oninput=()=>inputValues[el.dataset.input]=el.value)}
function literalDefault(s,t){if(t==='bool')return s==='True'?'true':'false';if(t==='int'||t==='float')return s;if(t==='list')return s;const q=s.match(/^["']([\s\S]*)["']$/);return q?q[1]:s}
function showVars(state){const v=state?.vars||{};const keys=Object.keys(v);varsEl.innerHTML=keys.length?keys.map(k=>'<div class="var-row"><div><b>'+esc(k)+'</b></div><div class="var-value">'+esc(typeof v[k]==='object'?JSON.stringify(v[k]):v[k])+'</div></div>').join(''):'<div class="empty">Run the Python program to inspect variables.</div>'}
function showError(e){stateEl.textContent='Error';stateEl.className='bad';errorsEl.innerHTML='<div class="error">'+esc(e.message||e)+'</div>'}
async function run(){controller?.abort();controller=new AbortController();errorsEl.innerHTML='';outputEl.textContent='';stateEl.textContent='Loading Python…';stateEl.className='';inputValues={...inputValues};inputsEl.querySelectorAll('input').forEach(el=>inputValues[el.dataset.input]=el.value);try{const result=await PythonEngine.run(codeEl.value,inputValues,e=>{if(e.type==='loading')stateEl.textContent='Loading Python…';if(e.type==='output')outputEl.textContent+=(outputEl.textContent?'\n':'')+String(e.value);if(e.type==='vars')showVars({vars:e.vars})},controller.signal);showVars(result);stateEl.textContent='Completed';stateEl.className='ok'}catch(e){showError(e);if(e.message==='Execution stopped')stateEl.textContent='Stopped'}}
document.getElementById('runBtn').onclick=run;document.getElementById('stopBtn').onclick=()=>{controller?.abort();stateEl.textContent='Stopped';stateEl.className='bad'};document.getElementById('newBtn').onclick=()=>{if(confirm('Start a new Python program?')){codeEl.value=DEFAULT_CODE;inputValues={};syncLines();scanInputs();showVars(null);outputEl.textContent='Program output will appear here.';errorsEl.innerHTML='';stateEl.textContent='Ready';stateEl.className=''}};document.getElementById('saveBtn').onclick=()=>{const data={format:'PythonCodeLab',version:2,name:'Untitled Python Program',code:codeEl.value,inputs:inputValues};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='python-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)};document.getElementById('loadBtn').onclick=()=>document.getElementById('fileInput').click();document.getElementById('fileInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);codeEl.value=d.code||'';inputValues=d.inputs||{};syncLines();scanInputs();stateEl.textContent='Loaded';showVars(null)}catch{showError(Error('Invalid Python project file'))}};r.readAsText(f);e.target.value=''};
codeEl.addEventListener('input',()=>{syncLines();scanInputs()});codeEl.addEventListener('scroll',()=>{lineNums.scrollTop=codeEl.scrollTop});codeEl.addEventListener('click',cursor);codeEl.addEventListener('keyup',cursor);codeEl.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const a=codeEl.selectionStart,b=codeEl.selectionEnd;codeEl.value=codeEl.value.slice(0,a)+'    '+codeEl.value.slice(b);codeEl.selectionStart=codeEl.selectionEnd=a+4;syncLines()}});scanInputs();syncLines();cursor();