import {Graph} from './graph.js';
import {makePreview} from './mesh.js';
const graphEl=document.querySelector('#graph'),varsEl=document.querySelector('#variables'),canvas=document.querySelector('#preview');
const variables={width:2,height:2,depth:2};
for(const [key,val] of Object.entries(variables)){const row=document.createElement('div');row.className='var';row.innerHTML=`<label>${key}</label><input type="number" step="0.1" value="${val}" data-var="${key}">`;varsEl.appendChild(row)}
let current={type:'box',...variables};const redraw=makePreview(canvas,current);const graph=new Graph(graphEl,()=>sync());
graph.add('box',120,110);graph.add('transform',390,120);
function sync(){const box=graph.nodes.find(n=>n.type==='box');if(box){const el=document.querySelector(`.node[data-id="${box.id}"]`);if(el){for(const input of el.querySelectorAll('.value[data-key]')){const k=input.dataset.key;input.oninput=()=>{current[k]=Number(input.value)||0;redraw()};}}}current.width=variables.width;current.height=variables.height;current.depth=variables.depth;redraw();document.querySelector('#status').textContent='Live'}
document.querySelectorAll('.palette').forEach(b=>b.onclick=()=>{graph.add(b.dataset.type,180,180);sync()});varsEl.addEventListener('input',e=>{if(e.target.dataset.var){variables[e.target.dataset.var]=Number(e.target.value)||0;sync()}});
document.querySelector('#resetBtn').onclick=()=>location.reload();document.querySelector('#runBtn').onclick=()=>{document.querySelector('#status').textContent='Updated';sync();setTimeout(()=>document.querySelector('#status').textContent='Live',700)};sync();
