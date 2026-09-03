import * as THREE from 'three';
import {GeometryOps} from './geometry.js';
export class SceneController{
 constructor(scene,editor){this.scene=scene;this.editor=editor;this.objects=[]}
 addCube(name='Cube'){const g=GeometryOps.makeCube(2);const m=new THREE.MeshStandardMaterial({color:0x7d8798,roughness:.7,metalness:.08});const o=new THREE.Mesh(g,m);o.name=name;o.castShadow=true;o.receiveShadow=true;o.userData.type='Mesh';this.scene.add(o);this.objects.push(o);this.editor.selectObject(o);return o}
 addPlane(name='Plane'){const o=new THREE.Mesh(GeometryOps.makePlane(),new THREE.MeshStandardMaterial({color:0x697381,side:THREE.DoubleSide}));o.name=name;o.userData.type='Mesh';this.scene.add(o);this.objects.push(o);this.editor.selectObject(o);return o}
 remove(o){if(!o)return;this.scene.remove(o);this.objects=this.objects.filter(x=>x!==o);this.editor.selectObject(this.objects.at(-1)||null)}
 duplicate(o){if(!o)return;const n=o.clone();n.name=o.name+'.001';n.position.x+=.5;n.position.z+=.5;n.material=o.material.clone();this.scene.add(n);this.objects.push(n);this.editor.selectObject(n);return n}
 serialize(){return this.objects.map(o=>({name:o.name,position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray(),geometry:GeometryOps.toJSON(o.geometry)}))}
 restore(data){for(const o of this.objects)this.scene.remove(o);this.objects=[];for(const d of data){const o=new THREE.Mesh(GeometryOps.fromJSON(d.geometry),new THREE.MeshStandardMaterial({color:0x7d8798,roughness:.7}));o.name=d.name;o.position.fromArray(d.position);o.rotation.fromArray(d.rotation);o.scale.fromArray(d.scale);o.userData.type='Mesh';this.scene.add(o);this.objects.push(o)}this.editor.selectObject(this.objects[0]||null)}
}