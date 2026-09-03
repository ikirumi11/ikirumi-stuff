export class IOController{
 constructor(editor,scene){this.e=editor;this.s=scene}
 save(){const blob=new Blob([JSON.stringify({version:1,objects:this.s.serialize()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='meshforge-project.json';a.click();URL.revokeObjectURL(a.href)}
 load(){const input=document.getElementById('fileInput');input.onchange=async()=>{const f=input.files[0];if(!f)return;try{const d=JSON.parse(await f.text());this.s.restore(d.objects||d);this.e.ui?.refresh()}catch(err){alert('Could not load project: '+err.message)}input.value=''};input.click()}
}