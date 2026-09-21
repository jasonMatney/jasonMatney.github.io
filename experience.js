import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {nodes,edges} from './network.mjs';

// An authored miniature landscape; positions are illustrative, not surveyed.
export function createExperience({host,labels,onSelect}) {
 const scene=new THREE.Scene();scene.background=new THREE.Color('#122f2a');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Cedar Bay 3D landscape. Use the view buttons to rotate and zoom; choose a community to follow its route.');
 const camera=new THREE.PerspectiveCamera(38,1,.1,300);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.12;controls.maxPolarAngle=1.18;controls.target.set(0,0,0);
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
 let selected='D',routePoints=[],routeMesh=null;const courier=new THREE.Mesh(new THREE.SphereGeometry(.48,12,8),new THREE.MeshBasicMaterial({color:'#fff5d4'}));world.add(courier);
 const status=document.querySelector('#scene-status'),toolbar=document.querySelector('.scene-tools');toolbar.hidden=false;
 function interaction(value){controls.enabled=value;renderer.domElement.style.pointerEvents=value?'auto':'none';document.querySelector('#orbit-toggle').setAttribute('aria-pressed',String(value));status.textContent=value?'Drag to orbit · Select a community · Use + / − to zoom':'Select a community · Enable rotation to explore';}
 interaction(matchMedia('(pointer:fine) and (min-width:701px)').matches);
 let isTop=false;controls.addEventListener('start',()=>{isTop=false;document.querySelector('#view-top').setAttribute('aria-pressed','false');});function reset(){isTop=false;placeOverview();controls.target.set(0,0,0);camera.zoom=1;camera.updateProjectionMatrix();controls.update();document.querySelector('#view-top').setAttribute('aria-pressed','false');}
 function placeOverview(){camera.position.set(32,65,70).multiplyScalar(Math.max(1,1.7/camera.aspect));}
 document.querySelector('#orbit-toggle').onclick=()=>interaction(!controls.enabled);
 document.querySelector('#view-reset').onclick=reset;
 document.querySelector('#view-top').onclick=()=>{isTop=!isTop;if(isTop){camera.position.set(0,Math.max(100,48/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)),.1);}else{placeOverview();}camera.zoom=1;camera.updateProjectionMatrix();controls.target.set(0,0,0);camera.lookAt(controls.target);document.querySelector('#view-top').setAttribute('aria-pressed',String(isTop));};
 function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.75,2);camera.updateProjectionMatrix();}
 document.querySelector('#zoom-in').onclick=()=>zoom(1.2);document.querySelector('#zoom-out').onclick=()=>zoom(1/1.2);
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 new ResizeObserver(resize).observe(host);resize();reset();
 let active=true;new IntersectionObserver(entries=>{active=entries[0].isIntersecting;},{threshold:0}).observe(host);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let previous=0;const timings=[];let frame=0;
 renderer.setAnimationLoop(time=>{if(!active||document.hidden){previous=0;return;}if(previous){timings.push(time-previous);if(timings.length>120)timings.shift();}previous=time;controls.update();
  if(routePoints.length){const t=reduced.matches ? .25 : (time*.000065)%1;const segment=t*(routePoints.length-1),i=Math.min(Math.floor(segment),routePoints.length-2);courier.position.lerpVectors(routePoints[i],routePoints[i+1],segment-i);courier.position.y+=.45;}
  for(const a of anchors){const v=a.position.clone().project(camera);a.label.style.left=`${(v.x*.5+.5)*host.clientWidth}px`;a.label.style.top=`${(-v.y*.5+.5)*host.clientHeight}px`;a.label.hidden=v.z>1||Math.abs(v.x)>.96||Math.abs(v.y)>.94;}
  renderer.render(scene,camera);if(++frame%60===0){host.dataset.camera=camera.position.toArray().map(v=>v.toFixed(1)).join(',');host.dataset.drawCalls=renderer.info.render.calls;host.dataset.triangles=renderer.info.render.triangles;host.dataset.frameMs=(timings.reduce((a,b)=>a+b,0)/Math.max(1,timings.length)).toFixed(1);}
 });
 renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();host.closest('.map-panel').classList.remove('has-3d');toolbar.hidden=true;labels.hidden=true;status.textContent='3D paused by your device. The map and controls remain available.';renderer.setAnimationLoop(null);});
 host.closest('.map-panel').classList.add('has-3d');host.dataset.ready='true';
 return {update({closed,selected:next,threshold,result,route}){selected=next;closure.visible=closed;for(const part of bridgeParts)part.visible=!closed;
  for(const n of result.communities){rings[n.id].material.color.set(n.id===selected?'#ffd090':n.minutes<=threshold?'#c6e6a0':'#4b6657');rings[n.id].scale.setScalar(n.id===selected?1.2:1);}
  for(const a of anchors){if(!a.node.clinic){a.label.setAttribute('aria-pressed',String(a.node.id===selected));a.label.classList.toggle('selected',a.node.id===selected);}a.label.classList.toggle('mobile-secondary',!a.node.clinic&&a.node.id!==selected);}
  if(routeMesh){world.remove(routeMesh);routeMesh.geometry.dispose();}routePoints=[];
  for(let i=1;i<route.path.length;i++){const a=route.path[i-1],b=route.path[i],curve=roadCurves.get([a,b].sort().join(''));const forward=edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)).a===a;let points=curve.getPoints(35);if(!forward)points.reverse();routePoints.push(...points.map(p=>p.clone().add(new THREE.Vector3(0,.65,0))));}
  const curve=new THREE.CatmullRomCurve3(routePoints);routeMesh=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.32,6,false),gold);world.add(routeMesh);host.dataset.route=route.path.join('-');host.dataset.scenario=closed?'closed':'open';
 }};
}
