import {Graph} from './graph.js';
import {makePreview} from './mesh.js';
const graphEl=document.querySelector('#graph'),varsEl=document.querySelector('#variables'),canvas=document.querySelector('#preview');
const variables={width:2,height:2,depth:2};
for(const [key,val] of Object.entries(variables)){const row=document.createElement('div');row.className='var';row.innerHTML=`<label>${key}</label><input type="number" step="0.1" value="${val}" data-var="${key}">`;varsEl.appendChild(row)}
let current={type:'box',width:2,height:2,depth:2};const redraw=makePreview(canvas,current);const graph=new Graph(graphEl,()=>sync());
graph.add('box',130,120);graph.add('transform',470,145);graph.add('output',790,170);
function inputValue(node,key,seen=new Set()){
 const wire=graph.wires.find(w=>w.to.node===node.id&&w.to.key===key);if(!wire)return node.values[key];
 const source=graph.nodes.find(n=>n.id===wire.from.node);if(!source||seen.has(source.id))return node.values[key];seen.add(source.id);
 if(source.type==='number'||source.type==='float'||source.type==='integer'||source.type==='string')return source.values.value;
 if(source.type==='vector3'||source.type==='velocity')return source.values.value||[0,0,0];
 if(source.type==='add'||source.type==='multiply'){const a=Number(inputValue(source,'a',new Set(seen))??0),b=Number(inputValue(source,'b',new Set(seen))??0);return source.type==='add'?a+b:a*b}
 if(source.type==='box'||source.type==='sphere'||source.type==='cylinder')return {type:source.type,width:Number(inputValue(source,'width',new Set(seen))||0),height:Number(inputValue(source,'height',new Set(seen))||0),depth:Number(inputValue(source,'depth',new Set(seen))||0)};
 if(source.type==='transform')return inputValue(source,'mesh',new Set(seen));return node.values[key]
}
function evaluate(){const box=graph.nodes.find(n=>n.type==='box'),sphere=graph.nodes.find(n=>n.type==='sphere'),cylinder=graph.nodes.find(n=>n.type==='cylinder');const source=box||sphere||cylinder;if(!source)return{type:'box',width:2,height:2,depth:2};const model={type:source.type};if(source.type==='box'){model.width=Number(inputValue(source,'width')??2);model.height=Number(inputValue(source,'height')??2);model.depth=Number(inputValue(source,'depth')??2)}if(source.type==='sphere'){model.width=Number(inputValue(source,'radius')??1)*2;model.height=model.width;model.depth=model.width}if(source.type==='cylinder'){model.width=Number(inputValue(source,'radius')??1)*2;model.height=Number(inputValue(source,'height')??2);model.depth=model.width}return model}
function sync(){const model=evaluate();Object.assign(current,model);redraw();document.querySelector('#modelInfo').textContent=model.type.charAt(0).toUpperCase()+model.type.slice(1);document.querySelector('#status').textContent='Live'}
document.querySelectorAll('.palette').forEach(b=>b.onclick=()=>{graph.add(b.dataset.type,220-graph.offset.x,180-graph.offset.y);sync()});varsEl.addEventListener('input',e=>{if(e.target.dataset.var){variables[e.target.dataset.var]=Number(e.target.value)||0;sync()}});document.querySelector('#resetBtn').onclick=()=>location.reload();document.querySelector('#runBtn').onclick=()=>{document.querySelector('#status').textContent='Updated';sync();setTimeout(()=>document.querySelector('#status').textContent='Live',700)};sync();