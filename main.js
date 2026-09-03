const canvas=document.getElementById('editorCanvas');const view=new View3D(canvas);const scene={};const editor=new Editor(scene,null,canvas);const sceneController=new SceneController(scene,editor);const io=new IOController(editor,sceneController);const ui=new UIController(editor,sceneController,io);const selection=new SelectionController(editor,view);editor.sceneController=sceneController;editor.ui=ui;const input=new InputController(editor,canvas,view,selection);
// Always begin a fresh session with exactly one default cube.
sceneController.objects=[];
editor.selectObject(null);
sceneController.addCube('Cube');
ui.refresh();
function resize(){view.resize()}window.addEventListener('resize',resize);function frame(){view.render(sceneController.objects,editor);requestAnimationFrame(frame)}frame();