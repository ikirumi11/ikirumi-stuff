import * as THREE from 'three';
export class Editor{
 constructor(scene,camera,renderer){this.scene=scene;this.camera=camera;this.renderer=renderer;this.selected=null;this.tool='select';this.mode='face';this.undoStack=[];this.redoStack=[];this.sceneController=null;this.ui=null}
 selectObject(o){if(this.selected)this.selected.userData.selected=false;this.selected=o;if(o)o.userData.selected=true;this.ui?.refresh();}
 setTool(t){this.tool=t;this.ui?.refreshTools()}
 snapshot(){return this.sceneController?.serialize()}
 pushUndo(){const s=this.snapshot();if(s){this.undoStack.push(JSON.stringify(s));if(this.undoStack.length>50)this.undoStack.shift();this.redoStack=[]}}
 undo(){if(!this.undoStack.length)return;const cur=this.snapshot();this.redoStack.push(JSON.stringify(cur));this.sceneController.restore(JSON.parse(this.undoStack.pop()));this.ui?.refresh()}
 redo(){if(!this.redoStack.length)return;const cur=this.snapshot();this.undoStack.push(JSON.stringify(cur));this.sceneController.restore(JSON.parse(this.redoStack.pop()));this.ui?.refresh()}
 update(){}
}