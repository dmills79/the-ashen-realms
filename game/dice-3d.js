/* Native WebGL dice: real beveled meshes, a textured table, floor/edge contacts and guided settlement.
   Outcomes come exclusively from the game's 4d6 sampler, never from animation or contact physics. */
(function(){
'use strict';
const faces=[{n:[1,0,0],u:[0,0,-1],v:[0,1,0],value:3},{n:[-1,0,0],u:[0,0,1],v:[0,1,0],value:4},{n:[0,1,0],u:[1,0,0],v:[0,0,-1],value:1},{n:[0,-1,0],u:[1,0,0],v:[0,0,1],value:6},{n:[0,0,1],u:[1,0,0],v:[0,1,0],value:2},{n:[0,0,-1],u:[-1,0,0],v:[0,1,0],value:5}];
const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(x=>x/l)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function multiplyQ(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]]}
function axisQ(axis,angle){const n=normalize(axis),s=Math.sin(angle/2);return [...n.map(v=>v*s),Math.cos(angle/2)]}
function rotate(q,v){const t=cross(q.slice(0,3),v).map(x=>2*x),c=cross(q.slice(0,3),t);return v.map((x,i)=>x+q[3]*t[i]+c[i])}
function slerp(a,b,t){let cos=dot(a,b);if(cos<0){b=b.map(v=>-v);cos=-cos}if(cos>.9995)return normalize(a.map((v,i)=>v+(b[i]-v)*t));const angle=Math.acos(Math.min(1,cos)),sin=Math.sin(angle);return a.map((v,i)=>(v*Math.sin((1-t)*angle)+b[i]*Math.sin(t*angle))/sin)}
function settledOrientation(value,yaw=0){
 const n=faces.find(f=>f.value===value)?.n;if(!n)throw Error('Invalid die face');
 const up=[0,1,0],d=dot(n,up);const q=d<-.999?[1,0,0,0]:normalize([...cross(n,up),1+d]);
 return multiplyQ(axisQ(up,yaw),q);
}
function topFace(q){return faces.reduce((best,f)=>rotate(q,f.n)[1]>rotate(q,best.n)[1]?f:best).value}
function support(q){const sum=[0,1,2].reduce((s,i)=>s+Math.abs(rotate(q,[Number(i===0),Number(i===1),Number(i===2)])[1]),0);return .42*sum+.08}
function createSimulation(values,seed=0){
 if(values.length!==4||values.some(v=>!Number.isInteger(v)||v<1||v>6))throw Error('Four d6 values required');
 return values.map((value,i)=>({value,x:-4.1+i*.78,y:1.9+i*.24,z:-1.4+i*.7,vx:6.8+i*.55,vz:.9-i*.4,vy:2+i*.25,q:axisQ([1,.5+i*.1,.4],.4+i),spin:8+i*1.5+Math.sin(seed+i),target:settledOrientation(value,.17*(i-1.5)),finalX:(i-1.5)*1.65,finalZ:i%2?.12:-.12}));
}
function step(bodies,dt,time,onContact=()=>{}){
 for(const b of bodies){
  b.vy-=21*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
  b.q=normalize(multiplyQ(axisQ([1,.8,.6],b.spin*dt),b.q));
  const floor=support(b.q);
  if(b.y<floor){b.y=floor;if(b.vy<-.6)onContact(Math.min(1,Math.abs(b.vy)/9));b.vy=Math.abs(b.vy)*.29;b.vx*=.73;b.vz*=.73;b.spin*=.72}
  if(Math.abs(b.x)>4.8){b.x=Math.sign(b.x)*4.8;b.vx*=-.45;onContact(.35)}
  if(Math.abs(b.z)>2.2){b.z=Math.sign(b.z)*2.2;b.vz*=-.45;onContact(.25)}
 }
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
  const a=bodies[i],b=bodies[j],dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,d=Math.hypot(dx,dy,dz);
  if(d<1.62&&d>.001){const n=[dx/d,dy/d,dz/d],over=(1.62-d)/2;
   a.x-=n[0]*over;a.y-=n[1]*over;a.z-=n[2]*over;b.x+=n[0]*over;b.y+=n[1]*over;b.z+=n[2]*over;
   const closing=(a.vx-b.vx)*n[0]+(a.vy-b.vy)*n[1]+(a.vz-b.vz)*n[2];
   if(closing>0){const impulse=closing*.65;a.vx-=n[0]*impulse;a.vy-=n[1]*impulse;a.vz-=n[2]*impulse;b.vx+=n[0]*impulse;b.vy+=n[1]*impulse;b.vz+=n[2]*impulse;onContact(Math.min(.6,closing/8))}
  }
 }
 // A short guided finish makes the fair sampled value unambiguous; contacts do not bias outcomes.
 if(time>.62){const t=Math.min(1,(time-.62)/.43),k=1-Math.pow(1-t,3);
  for(const b of bodies){b.x+=(b.finalX-b.x)*Math.min(1,dt*18);b.z+=(b.finalZ-b.z)*Math.min(1,dt*18);b.q=slerp(b.q,b.target,Math.min(1,dt*16));b.y=Math.max(support(b.q),b.y+(support(b.q)-b.y)*k)}
 }
 if(time>=1.08)settle(bodies);
}
function settle(bodies){for(const b of bodies){b.x=b.finalX;b.z=b.finalZ;b.y=.5;b.q=b.target.slice();b.vx=b.vy=b.vz=b.spin=0}}
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function model(q,x,y,z,scale=[1,1,1]){const m=identity();for(let i=0;i<3;i++){const v=rotate(q,[Number(i===0),Number(i===1),Number(i===2)]);for(let j=0;j<3;j++)m[i*4+j]=v[j]*scale[i]}m[12]=x;m[13]=y;m[14]=z;return m}
function view(eye){const z=normalize(eye),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])}
function perspective(aspect){const f=1/Math.tan(.65/2),near=.1,far=80;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0])}
function cube(){
 const data=[],coords=[-.5,-.42,-.24,0,.24,.42,.5];
 for(const [fi,f] of faces.entries()){
  const point=(u,v)=>{const p=f.n.map((n,i)=>n*.5+f.u[i]*u+f.v[i]*v),inner=p.map(v=>Math.max(-.42,Math.min(.42,v))),n=normalize(p.map((v,i)=>v-inner[i]));return [...inner.map((v,i)=>v+n[i]*.08),...n,(fi+(u+.5))/6,v+.5]};
  for(let y=0;y<coords.length-1;y++)for(let x=0;x<coords.length-1;x++){
   const a=point(coords[x],coords[y]),b=point(coords[x+1],coords[y]),c=point(coords[x+1],coords[y+1]),d=point(coords[x],coords[y+1]);data.push(...a,...b,...c,...a,...c,...d);
  }
 }
 return new Float32Array(data);
}
function plane(){return new Float32Array([-1,0,-1,0,1,0,0,0,1,0,-1,0,1,0,1,0,1,0,1,0,1,0,1,1,-1,0,-1,0,1,0,0,0,1,0,1,0,1,0,1,1,-1,0,1,0,1,0,0,1])}
function atlas(){
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=256;const c=canvas.getContext('2d'),pips=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
 for(const [i,f] of faces.entries()){
  const x=i*256,g=c.createLinearGradient(x,0,x+256,256);g.addColorStop(0,'#f4e2b7');g.addColorStop(1,'#cab98d');c.fillStyle=g;c.fillRect(x,0,256,256);
  for(const p of pips[f.value]){const px=x+64+(p%3)*64,py=64+Math.floor(p/3)*64;c.fillStyle='#807253';c.beginPath();c.arc(px,py,14,0,Math.PI*2);c.fill();c.fillStyle='#292722';c.beginPath();c.arc(px,py+2,11,0,Math.PI*2);c.fill()}
 }
 return canvas;
}
function mount(canvas,{onContact=()=>{},onUnavailable=()=>{},reducedMotion=()=>false}={}){
 let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false})}catch(e){}
 if(!gl){onUnavailable('3D rendering is unavailable on this device. Dice rules and results remain usable.');return {available:false,play:async roll=>({values:roll.dice.slice(),rendered:false}),show:()=>{},dispose:()=>{},debug:()=>({available:false})}}
 let disposed=false,lostContext=false,raf=0,busy=false,done=null,bodies=createSimulation([1,2,3,4]),drop=-1,serial=0,lastContact=0;
 settle(bodies);
 const textures=[],buffers=[];
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 const vs=shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 normal;attribute vec2 uv;uniform mat4 projection,view,model;varying vec3 n;varying vec2 texUv;void main(){n=mat3(model)*normal;texUv=uv;gl_Position=projection*view*model*vec4(position,1.);}`);
 const fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 n;varying vec2 texUv;uniform sampler2D surface;uniform vec3 tint;uniform float shadow,opacity;void main(){if(shadow>0.5){float d=length(texUv-.5)*2.;if(d>1.)discard;gl_FragColor=vec4(.04,.025,.012,exp(-d*d*4.)*opacity);}else{vec3 normal=normalize(n);float light=.57+.43*max(dot(normal,normalize(vec3(-.5,1.,.65))),0.);vec3 color=texture2D(surface,texUv).rgb*tint*light;float rim=pow(max(dot(normal,normalize(vec3(-.2,1.,1.))),0.),18.);gl_FragColor=vec4(color+vec3(.12,.08,.025)*rim,1.);}}`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
 const locations={};for(const name of ['projection','view','model','surface','tint','shadow','opacity'])locations[name]=gl.getUniformLocation(program,name);
 const attrs=['position','normal','uv'].map(n=>gl.getAttribLocation(program,n));
 function buffer(data){const b=gl.createBuffer();buffers.push(b);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);return {buffer:b,count:data.length/8}}
 const box=buffer(cube()),floor=buffer(plane());
 function texture(source){const t=gl.createTexture();textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t}
 const diceTexture=texture(atlas()),placeholder=document.createElement('canvas');placeholder.width=placeholder.height=1;let tableTexture=texture(placeholder),tableReady=false;
 const table=new Image();table.onload=()=>{if(disposed)return;gl.deleteTexture(tableTexture);tableTexture=texture(table);tableReady=true;draw()};table.onerror=()=>{if(!disposed)onUnavailable('The illustrated tabletop could not load. Reload to restore its artwork.')};table.src='assets/tavern_creation/tabletop.png';
 function mesh(geometry,transform,tex,tint,shadow=0,opacity=1){
  gl.bindBuffer(gl.ARRAY_BUFFER,geometry.buffer);for(let i=0;i<3;i++){gl.enableVertexAttribArray(attrs[i]);gl.vertexAttribPointer(attrs[i],i===2?2:3,gl.FLOAT,false,32,[0,12,24][i])}
  gl.uniformMatrix4fv(locations.model,false,transform);gl.uniform3fv(locations.tint,tint);gl.uniform1f(locations.shadow,shadow);gl.uniform1f(locations.opacity,opacity);gl.bindTexture(gl.TEXTURE_2D,tex);gl.drawArrays(gl.TRIANGLES,0,geometry.count);
 }
 function draw(){
  if(disposed||lostContext)return;const ratio=Math.min(2,window.devicePixelRatio||1),width=Math.max(1,Math.round(canvas.clientWidth*ratio)),height=Math.max(1,Math.round(canvas.clientHeight*ratio));
  if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height}
  gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const aspect=width/height,factor=Math.max(1,1.65/aspect);gl.uniformMatrix4fv(locations.projection,false,perspective(aspect));gl.uniformMatrix4fv(locations.view,false,view([0,6.5*factor,8*factor]));gl.uniform1i(locations.surface,0);
  if(tableReady)mesh(floor,model([0,0,0,1],0,-.025,0,[5.8,1,3.5]),tableTexture,[1,.95,.85]);
  gl.depthMask(false);
  for(const b of bodies){const size=.75+b.y*.13;mesh(floor,model([0,0,0,1],b.x+.15*b.y,.002,b.z+.12*b.y,[size,1,size*.78]),diceTexture,[1,1,1],1,.58/(1+b.y*.6))}
  gl.depthMask(true);
  for(const [i,b] of bodies.entries())mesh(box,model(b.q,b.x,b.y,b.z),diceTexture,i===drop?[.93,.42,.31]:[1,1,1]);
 }
 const observer=new ResizeObserver(()=>draw());observer.observe(canvas);
 const lost=e=>{e.preventDefault();if(disposed)return;lostContext=true;cancelAnimationFrame(raf);busy=false;done?.({values:bodies.map(b=>b.value),rendered:false});done=null;onUnavailable('3D rendering was interrupted. The recorded dice results are preserved.')};canvas.addEventListener('webglcontextlost',lost);
 function show(roll){if(disposed)return;bodies=createSimulation(roll.dice);settle(bodies);drop=roll.drop;draw()}
 function play(roll){
  if(disposed||busy)return Promise.resolve(null);if(lostContext)return Promise.resolve({values:roll.dice.slice(),rendered:false});bodies=createSimulation(roll.dice,serial++);drop=-1;busy=true;
  return new Promise(resolve=>{
   done=resolve;let start=performance.now(),last=start,elapsed=0;
   function frame(now){
    if(disposed)return;const delta=Math.min(.04,(now-last)/1000);last=now;
    if(reducedMotion()){elapsed=1.1;settle(bodies)}else{let left=delta;while(left>0){const dt=Math.min(left,1/120);elapsed+=dt;step(bodies,dt,elapsed,impact=>{if(now-lastContact>45){lastContact=now;onContact(impact)}});left-=dt}}
    if(elapsed>=1.08||now-start>1400){settle(bodies);drop=roll.drop;busy=false;draw();done=null;resolve({values:bodies.map(b=>topFace(b.q)),rendered:true});return}
    draw();raf=requestAnimationFrame(frame);
   }
   raf=requestAnimationFrame(frame);
  });
 }
 function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();canvas.removeEventListener('webglcontextlost',lost);done?.(null);done=null;for(const t of textures)gl.deleteTexture(t);for(const b of buffers)gl.deleteBuffer(b);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext()}
 draw();return {available:true,play,show,dispose,debug:()=>({available:!lostContext,busy,tableReady,values:bodies.map(b=>topFace(b.q)),positions:bodies.map(b=>[b.x,b.y,b.z]),discarded:drop})};
}
window.AshenDice={mount,settledOrientation,topFace,createSimulation,step,settle};
})();
