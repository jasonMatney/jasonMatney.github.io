import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {nodes,edges} from './network.mjs';

// An authored miniature landscape; positions are illustrative, not surveyed.
export function createExperience({host,labels,onSelect}) {
 const scene=new THREE.Scene();scene.background=new THREE.Color('#122f2a');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Cedar Bay 3D landscape. Use the view buttons to rotate and zoom; choose a community to follow its route.');
 const camera=new THREE.PerspectiveCamera(38,1,.1,300);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.rotateSpeed=.55;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.12;controls.maxPolarAngle=1.18;controls.target.set(0,0,0);
 const ambient=new THREE.HemisphereLight('#ecf3dc','#405649',2.5);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#ffe1b1',3.2);sun.position.set(-25,65,35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-55,right:55,top:45,bottom:-45,near:1,far:130});sun.shadow.bias=-.0004;sun.shadow.normalBias=.15;scene.add(sun);
 const fill=new THREE.DirectionalLight('#aeced6',1.2);fill.position.set(40,20,-30);scene.add(fill);
 const world=new THREE.Group();scene.add(world);
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.88,...extra});
 const soil=mat('#3a5948'),landMat=mat('#708870',{vertexColors:true,flatShading:true}),waterMat=mat('#3a8c8b',{roughness:.3,metalness:.25});
 const roadsMat=mat('#526257'),edgeMat=mat('#c9c5a3'),roofMat=mat('#a27d57'),wallMat=mat('#dfdac0'),clinicMat=mat('#ece8d0');
 const gold=new THREE.MeshBasicMaterial({color:'#ffac50'}),markerMat=mat('#c9dbb1'),darkMat=mat('#365543');
 const river=z=>8+2.5*Math.sin(z*.14);
 function height(x,z){const hills=1.5+5*Math.exp(-((x+20)**2/140+(z+10)**2/140))+3.3*Math.exp(-((x-26)**2/130+(z-15)**2/60))+.5*Math.sin(x*.23)*Math.cos(z*.25);const distance=Math.abs(x-river(z));return THREE.MathUtils.lerp(-.4,hills,THREE.MathUtils.smoothstep(distance,1.5,6));}
 const point=n=>new THREE.Vector3((n.x-400)/10,0,(n.y-245)/10);
 const terrain=new THREE.PlaneGeometry(80,49,100,64);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position,colors=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=height(x,z);pos.setY(i,h);const c=new THREE.Color().setHSL(.25,.15,.42+h*.023);colors.push(c.r,c.g,c.b);}
 terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const ground=new THREE.Mesh(terrain,landMat);ground.receiveShadow=true;world.add(ground);
 const base=new THREE.Mesh(new THREE.BoxGeometry(80,2.6,49),soil);base.position.y=-1.7;world.add(base);
 // Close the four exposed edges of the terrain block.
 const skirtPos=[],skirtIndex=[];for(const side of [0,1,2,3]){const start=skirtPos.length/3;for(let i=0;i<=100;i++){const t=i/100;const x=side===0?-40+80*t:side===1?40:side===2?40-80*t:-40;const z=side===0?-24.5:side===1?-24.5+49*t:side===2?24.5:24.5-49*t;skirtPos.push(x,height(x,z),z,x,-1,z);if(i<100){const a=start+i*2;skirtIndex.push(a,a+1,a+2,a+1,a+3,a+2);}}}
 const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(skirtPos,3));skirt.setIndex(skirtIndex);skirt.computeVertexNormals();world.add(new THREE.Mesh(skirt,mat('#526b53',{side:THREE.DoubleSide})));
 const waterTime={value:0};waterMat.onBeforeCompile=shader=>{shader.uniforms.uTime=waterTime;shader.vertexShader='varying vec2 vWater;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWater = position.xy;');shader.fragmentShader='uniform float uTime; varying vec2 vWater;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal.x += sin(vWater.y * 2.3 + uTime * .8) * .07; normal.y += cos(vWater.x * 1.8 + uTime * .6) * .04; normal = normalize(normal);');};
 const water=new THREE.Mesh(new THREE.PlaneGeometry(79.9,48.9),waterMat);water.rotation.x=-Math.PI/2;water.position.y=.18;world.add(water);
 // Roads follow the relief. River crossings are elevated above the water.
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));const roadCurves=new Map();const bridgeParts=[];
 function roadCurve(e){const a=point(byId[e.a]),b=point(byId[e.b]);const points=[];for(let i=0;i<=40;i++){const t=i/40;const x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);points.push(new THREE.Vector3(x,Math.max(height(x,z)+.2,1.1),z));}return new THREE.CatmullRomCurve3(points);}
 for(const e of edges){const curve=roadCurve(e);roadCurves.set([e.a,e.b].sort().join(''),curve);const verge=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.36,5,false),edgeMat);world.add(verge);const road=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.23,5,false),roadsMat);road.position.y=.23;world.add(road);
  if(e.bridge){for(let t=.34;t<.72;t+=.065){const p=curve.getPoint(t);if(Math.abs(p.x-river(p.z))<5){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.45,p.y+1,.65),soil);pillar.position.set(p.x,p.y/2-.5,p.z);world.add(pillar);}}bridgeParts.push(verge,road);}
 }
 // Reusable low-poly trees, laid out deterministically away from roads.
 const treeGeo=new THREE.ConeGeometry(.7,2.7,5),trees=new THREE.InstancedMesh(treeGeo,mat('#315b44',{flatShading:true}),360),dummy=new THREE.Object3D();let count=0;
 const nearRoad=(x,z)=>edges.some(e=>{const a=point(byId[e.a]),b=point(byId[e.b]);const t=THREE.MathUtils.clamp(((x-a.x)*(b.x-a.x)+(z-a.z)*(b.z-a.z))/((b.x-a.x)**2+(b.z-a.z)**2),0,1);return Math.hypot(x-a.x-t*(b.x-a.x),z-a.z-t*(b.z-a.z))<1.3;});
 for(let i=0;i<900&&count<360;i++){const x=Math.sin(i*127.1+7)*38,z=Math.sin(i*311.7+2)*23;if(Math.abs(x-river(z))<5||nearRoad(x,z)||nodes.some(n=>point(n).distanceTo(new THREE.Vector3(x,0,z))<3))continue;const scale=.55+(Math.sin(i*13)+1)*.28;dummy.position.set(x,height(x,z)+1.1*scale,z);dummy.scale.setScalar(scale);dummy.rotation.y=i;dummy.updateMatrix();trees.setMatrixAt(count++,dummy.matrix);}trees.count=count;trees.castShadow=true;world.add(trees);
 const anchors=[];const rings={};
 for(const n of nodes){const p=point(n);p.y=Math.max(height(p.x,p.z),1.1);const group=new THREE.Group();group.position.copy(p);world.add(group);
  if(n.clinic){const building=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.8,1.5),clinicMat);building.position.y=.9;group.add(building);const roof=new THREE.Mesh(new THREE.BoxGeometry(2.5,.18,1.7),mat('#728b7f'));roof.position.y=1.85;group.add(roof);for(const [w,d]of [[1,.25],[.25,1]]){const cross=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),mat('#b34f30'));cross.position.y=2;group.add(cross);}}
  else {for(let j=0;j<6;j++){const home=new THREE.Mesh(new THREE.BoxGeometry(.8,.9,.95),wallMat);const a=j*2.4,r=1.4+(j%2)*.75;home.castShadow=true;home.position.set(Math.cos(a)*r,.5,Math.sin(a)*r);group.add(home);const roof=new THREE.Mesh(new THREE.ConeGeometry(.76,.65,4),roofMat);roof.castShadow=true;roof.rotation.y=Math.PI/4;roof.position.copy(home.position);roof.position.y=1.25;group.add(roof);}
   const ring=new THREE.Mesh(new THREE.TorusGeometry(2.9,.12,5,48),markerMat.clone());ring.rotation.x=Math.PI/2;ring.position.y=.25;group.add(ring);rings[n.id]=ring;
  }
  const label=document.createElement(n.clinic?'span':'button');label.className='place-label'+(n.clinic?' clinic-label':'');label.textContent=(n.clinic?'+ ':'')+n.name;if(!n.clinic){label.type='button';label.setAttribute('aria-label',`Follow ${n.name} in 3D`);label.addEventListener('click',()=>onSelect(n.id));}labels.append(label);anchors.push({node:n,position:p.clone().add(new THREE.Vector3(0,n.clinic?3.3:2.4,0)),label});
 }
 const closure=new THREE.Group();const bridgeCurve=roadCurves.get('DE');closure.position.copy(bridgeCurve.getPoint(.5));closure.position.y+=1.5;for(const r of [-Math.PI/4,Math.PI/4]){const bar=new THREE.Mesh(new THREE.BoxGeometry(2.7,.3,.3),mat('#f39756'));bar.rotation.z=r;closure.add(bar);}world.add(closure);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let selected='D',routePoints=[],routeMesh=null,routeCurve=null,routeAge=0,routeKey='',clock=0,ghost=null,ghostAge=0;
 const courier=new THREE.Mesh(new THREE.SphereGeometry(.4,12,8),new THREE.MeshBasicMaterial({color:'#fff5d4',transparent:true}));world.add(courier);
 const halo=new THREE.Mesh(new THREE.SphereGeometry(.85,12,8),new THREE.MeshBasicMaterial({color:'#ffc16e',transparent:true,opacity:.16,depthWrite:false}));world.add(halo);
 const status=document.querySelector('#scene-status'),toolbar=document.querySelector('.scene-tools');toolbar.hidden=false;
 const film=document.createElement('button');film.type='button';film.id='play-flyover';film.textContent='Play flyover';film.setAttribute('aria-pressed','false');toolbar.prepend(film);
 const caption=document.createElement('div');caption.className='scene-caption';caption.setAttribute('aria-live','polite');host.parentElement.append(caption);
 let tween=null,flyover=null,desiredZoom=1,isTop=false,lastShot=-1;
 const ease=t=>t*t*t*(t*(t*6-15)+10);
 const overview=()=>new THREE.Vector3(32,65,70).multiplyScalar(Math.max(1,1.7/camera.aspect));
 function moveTo(position,target=new THREE.Vector3(),duration=1.8){
  if(reduced.matches){camera.position.copy(position);controls.target.copy(target);camera.lookAt(target);tween=null;return;}
  tween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),age:0,duration};
 }
 function stopFilm(){flyover=null;tween=null;film.textContent=reduced.matches?'Reduced motion':'Play flyover';film.setAttribute('aria-pressed','false');caption.classList.remove('visible');host.dataset.flyover='stopped';}
 function interaction(value){controls.enabled=value;renderer.domElement.style.pointerEvents=value?'auto':'none';document.querySelector('#orbit-toggle').setAttribute('aria-pressed',String(value));status.textContent=value?'Drag to orbit · Select a community · Use + / − to zoom':'Select a community · Enable rotation to explore';}
 interaction(matchMedia('(pointer:fine) and (min-width:701px)').matches);
 controls.addEventListener('start',()=>{stopFilm();tween=null;isTop=false;document.querySelector('#view-top').setAttribute('aria-pressed','false');});
 function reset(immediate=false){stopFilm();isTop=false;desiredZoom=1;if(immediate){camera.position.copy(overview());controls.target.set(0,0,0);camera.zoom=1;camera.lookAt(controls.target);}else moveTo(overview());document.querySelector('#view-top').setAttribute('aria-pressed','false');}
 document.querySelector('#orbit-toggle').onclick=()=>{stopFilm();tween=null;interaction(!controls.enabled);};
 document.querySelector('#view-reset').onclick=()=>reset();
 document.querySelector('#view-top').onclick=()=>{stopFilm();isTop=!isTop;desiredZoom=1;moveTo(isTop?new THREE.Vector3(0,Math.max(100,48/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)),.1):overview());document.querySelector('#view-top').setAttribute('aria-pressed',String(isTop));};
 function zoom(factor){stopFilm();desiredZoom=THREE.MathUtils.clamp(desiredZoom*factor,.75,2);}
 document.querySelector('#zoom-in').onclick=()=>zoom(1.2);document.querySelector('#zoom-out').onclick=()=>zoom(1/1.2);
 film.onclick=()=>{if(flyover){stopFilm();tween=null;return;}if(reduced.matches)return;flyover={age:0};lastShot=-1;desiredZoom=1;isTop=false;document.querySelector('#view-top').setAttribute('aria-pressed','false');film.textContent='Stop flyover';film.setAttribute('aria-pressed','true');host.dataset.flyover='playing';};
 function motionPreference(){film.disabled=reduced.matches;film.textContent=reduced.matches?'Reduced motion':'Play flyover';if(reduced.matches){stopFilm();tween=null;film.textContent='Reduced motion';}}
 reduced.addEventListener('change',motionPreference);motionPreference();
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();reset(true);}
 new ResizeObserver(resize).observe(host);resize();

 let previous=0;const timings=[];let frame=0;const projected=new THREE.Vector3();
 renderer.setAnimationLoop(time=>{const bounds=host.parentElement.getBoundingClientRect();if(document.hidden||bounds.bottom<=0||bounds.top>=innerHeight){previous=0;return;}const elapsed=previous?(time-previous)/1000:0;const dt=Math.min(elapsed,.05);if(previous){timings.push(time-previous);if(timings.length>120)timings.shift();}previous=time;if(!reduced.matches)clock+=dt;
  if(flyover){flyover.age+=dt;const shot=Math.min(2,Math.floor(flyover.age/6));if(shot!==lastShot){lastShot=shot;const factor=Math.max(1,1.65/camera.aspect);const focus=routeCurve?routeCurve.getPointAt(shot===0?0:shot===1 ? .5 : 1):new THREE.Vector3();focus.multiplyScalar(.35);const positions=[new THREE.Vector3(32,65,70),new THREE.Vector3(-28,62,78),new THREE.Vector3(-36,70,65)];moveTo(positions[shot].multiplyScalar(factor),focus,5.8);caption.textContent=[`01 / ${byId[selected].name} · The starting point`,'02 / Follow the connection',`03 / ${routeCurve?'Access to care':'The wider landscape'}`][shot];caption.classList.add('visible');}if(flyover.age>=18){stopFilm();moveTo(overview());}}
  if(tween){tween.age+=dt;const t=Math.min(1,tween.age/tween.duration),e=ease(t);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,e);if(t===1)tween=null;}
  camera.zoom=reduced.matches?desiredZoom:THREE.MathUtils.lerp(camera.zoom,desiredZoom,1-Math.exp(-7*dt));camera.updateProjectionMatrix();controls.update();waterTime.value=clock;
  if(ghost){ghostAge+=dt;ghost.material.opacity=.45*Math.max(0,1-ghostAge/.6);if(ghostAge>=.6){world.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null;}}
  routeAge+=dt;if(routeMesh){const reveal=reduced.matches?1:Math.min(1,routeAge/1.25);routeMesh.geometry.setDrawRange(0,Math.floor(120*reveal)*6*6);}
  if(routeCurve){const t=reduced.matches ? .35 : Math.min(1,Math.max(0,(routeAge-1.25)/9));courier.position.copy(routeCurve.getPointAt(t));courier.position.y+=.45;courier.visible=reduced.matches||routeAge>1.25;const fade=reduced.matches?1:Math.min(1,Math.max(0,(routeAge-1.25)*2),Math.max(0,(12-routeAge)*1.5));courier.material.opacity=fade;halo.material.opacity=.16*fade;halo.visible=courier.visible;halo.position.copy(courier.position);halo.scale.setScalar(1+.18*Math.sin(clock*2));if(routeAge>12)routeAge=1.25;}
  for(const [id,ring]of Object.entries(rings)){const scale=id===selected?1.16+(reduced.matches?0:.04*Math.sin(clock*2)):1;ring.scale.setScalar(scale);}
  for(const a of anchors){const v=projected.copy(a.position).project(camera);a.label.style.transform=`translate(-50%,-100%) translate(${(v.x*.5+.5)*host.clientWidth}px,${(-v.y*.5+.5)*host.clientHeight}px)`;a.label.style.left='0';a.label.style.top='0';a.label.hidden=v.z>1||Math.abs(v.x)>.96||Math.abs(v.y)>.94;}
  renderer.render(scene,camera);if(++frame%60===0){host.dataset.camera=camera.position.toArray().map(v=>v.toFixed(1)).join(',');host.dataset.drawCalls=renderer.info.render.calls;host.dataset.triangles=renderer.info.render.triangles;host.dataset.frameMs=(timings.reduce((a,b)=>a+b,0)/Math.max(1,timings.length)).toFixed(1);host.dataset.transition=tween?'moving':'settled';}
 });
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.closest('.map-panel').classList.remove('has-3d');host.parentElement.dataset.sceneState='fallback';host.parentElement.setAttribute('aria-busy','false');toolbar.hidden=true;labels.hidden=true;status.textContent='3D paused by your device. The map and controls remain available.';renderer.setAnimationLoop(null);});
 host.closest('.map-panel').classList.add('has-3d');host.dataset.ready='true';
 return {update({closed,selected:next,threshold,result,route}){const changed=selected!==next;selected=next;closure.visible=closed;for(const part of bridgeParts)part.visible=!closed;
  for(const n of result.communities){rings[n.id].material.color.set(n.id===selected?'#ffd090':n.minutes<=threshold?'#c6e6a0':'#4b6657');rings[n.id].scale.setScalar(n.id===selected?1.2:1);}
  for(const a of anchors){if(!a.node.clinic){a.label.setAttribute('aria-pressed',String(a.node.id===selected));a.label.classList.toggle('selected',a.node.id===selected);}a.label.classList.toggle('mobile-secondary',!a.node.clinic&&a.node.id!==selected);}
  const nextKey=route.path.join('-');host.dataset.scenario=closed?'closed':'open';if(nextKey===routeKey)return;routeKey=nextKey;stopFilm();routeAge=0;
  if(changed&&!isTop){const target=point(byId[selected]).multiplyScalar(.2);moveTo(overview().add(target),target,1.6);}
  if(ghost){world.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null;}
  if(routeMesh){if(reduced.matches){world.remove(routeMesh);routeMesh.geometry.dispose();}else{ghost=routeMesh;ghost.material=gold.clone();ghost.material.transparent=true;ghost.material.depthWrite=false;ghost.material.opacity=.45;ghostAge=0;}}routePoints=[];
  for(let i=1;i<route.path.length;i++){const a=route.path[i-1],b=route.path[i],curve=roadCurves.get([a,b].sort().join(''));const forward=edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)).a===a;let points=curve.getPoints(35);if(!forward)points.reverse();routePoints.push(...points.map(p=>p.clone().add(new THREE.Vector3(0,.65,0))));}
  const unique=routePoints.filter((p,i)=>!i||p.distanceToSquared(routePoints[i-1])>.00001);const curve=new THREE.CatmullRomCurve3(unique);routeCurve=curve;routeMesh=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.32,6,false),gold);world.add(routeMesh);host.dataset.route=route.path.join('-');host.dataset.scenario=closed?'closed':'open';
 }};
}
