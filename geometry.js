import * as THREE from 'three';
export const GeometryOps={
 makeCube(s=2){return new THREE.BoxGeometry(s,s,s)},
 makePlane(s=4){const g=new THREE.PlaneGeometry(s,s);g.rotateX(-Math.PI/2);return g},
 rebuild(g){g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g},
 toJSON(g){return {positions:Array.from(g.attributes.position.array),indices:g.index?Array.from(g.index.array):null}},
 fromJSON(d){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(d.positions,3));if(d.indices)g.setIndex(d.indices);return this.rebuild(g)},
 flip(g){const a=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i);for(let i=0;i<a.length;i+=3)[a[i+1],a[i+2]]=[a[i+2],a[i+1]];g.setIndex(a);return this.rebuild(g)},
 extrudeFace(g,i,d=.5){const p=g.attributes.position,b=i*3;if(b+2>=p.count)return g;const a=new THREE.Vector3().fromBufferAttribute(p,b),c=new THREE.Vector3().fromBufferAttribute(p,b+2),bb=new THREE.Vector3().fromBufferAttribute(p,b+1),n=bb.clone().sub(a).cross(c.clone().sub(a)).normalize().multiplyScalar(d);const arr=Array.from(p.array),start=p.count;for(const v of [a,bb,c]){const q=v.clone().add(n);arr.push(q.x,q.y,q.z)}const ids=g.index?Array.from(g.index.array):Array.from({length:p.count},(_,x)=>x);ids.push(start,start+2,start+1,b,b+1,start,start,b+1,start+1,b+1,b+2,start+1,b+2,b,start+2);const ng=new THREE.BufferGeometry();ng.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));ng.setIndex(ids);return this.rebuild(ng)}
};