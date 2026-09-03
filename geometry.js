class GeometryOps {
 static cube(s=2){const h=s/2;return {vertices:[[-h,-h,-h],[h,-h,-h],[h,h,-h],[-h,h,-h],[-h,-h,h],[h,-h,h],[h,h,h],[-h,h,h]],faces:[[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[1,2,6,5],[0,4,7,3]]}}
 static plane(s=4){const h=s/2;return {vertices:[[-h,0,-h],[h,0,-h],[h,0,h],[-h,0,h]],faces:[[0,1,2,3]]}}
 static clone(g){return {vertices:g.vertices.map(v=>v.slice()),faces:g.faces.map(f=>f.slice())}}
 static normal(g,face){const f=g.faces[face],a=g.vertices[f[0]],b=g.vertices[f[1]],c=g.vertices[f[2]];if(!a||!b||!c)return[0,1,0];const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const l=Math.hypot(...n)||1;return n.map(x=>x/l)}
 static center(g,face){const f=g.faces[face],c=[0,0,0];if(!f)return c;f.forEach(i=>{c[0]+=g.vertices[i][0];c[1]+=g.vertices[i][1];c[2]+=g.vertices[i][2]});return c.map(x=>x/f.length)}
 static translateVertices(g,indices,d){const seen=new Set(indices);seen.forEach(i=>{if(g.vertices[i]){g.vertices[i][0]+=d[0];g.vertices[i][1]+=d[1];g.vertices[i][2]+=d[2]}});return g}
 static moveFace(g,face,d){return g.faces[face]?this.translateVertices(g,g.faces[face],d):g}
 static moveVertex(g,index,d){return g.vertices[index]?this.translateVertices(g,[index],d):g}
 static moveEdge(g,a,b,d){return this.translateVertices(g,[a,b],d)}
 static scaleVertices(g,indices,factor,center){const seen=[...new Set(indices)];seen.forEach(i=>{const v=g.vertices[i];if(v)for(let k=0;k<3;k++)v[k]=center[k]+(v[k]-center[k])*factor});return g}
 static extrude(g,face,amount){if(!g.faces[face])return g;const f=g.faces[face],n=this.normal(g,face),base=f.map(i=>g.vertices[i].slice()),newIds=base.map(v=>{const q=[v[0]+n[0]*amount,v[1]+n[1]*amount,v[2]+n[2]*amount];g.vertices.push(q);return g.vertices.length-1});g.faces[face]=newIds.slice();for(let i=0;i<f.length;i++){const j=(i+1)%f.length;g.faces.push([f[i],f[j],newIds[j],newIds[i]])}return g}
 static inset(g,face,amount){if(!g.faces[face])return g;const f=g.faces[face],c=this.center(g,face);const ids=f.map(i=>{const v=g.vertices[i],q=[v[0]+(c[0]-v[0])*amount,v[1]+(c[1]-v[1])*amount,v[2]+(c[2]-v[2])*amount];g.vertices.push(q);return g.vertices.length-1});g.faces[face]=ids;for(let i=0;i<f.length;i++){const j=(i+1)%f.length;g.faces.push([f[i],f[j],ids[j],ids[i]])}return g}
 static bevel(g,face,amount){if(!g.faces[face])return g;const f=g.faces[face],c=this.center(g,face),a=Math.min(.8,Math.max(.02,amount));for(const i of f){const v=g.vertices[i];v[0]=c[0]+(v[0]-c[0])*(1-a);v[1]=c[1]+(v[1]-c[1])*(1-a);v[2]=c[2]+(v[2]-c[2])*(1-a)}return g}
 static triangulate(g){const out=[];for(const f of g.faces){for(let i=1;i<f.length-1;i++)out.push([f[0],f[i],f[i+1]])}g.faces=out;return g}
 static flip(g){g.faces.forEach(f=>f.reverse());return g}
 static toJSON(g){return this.clone(g)}
 static fromJSON(d){return {vertices:(d.vertices||[]).map(v=>v.slice()),faces:(d.faces||[]).map(f=>f.slice())}}
}
window.GeometryOps=GeometryOps;