import * as THREE from 'three';
import {OrbitControls} from './vendor/three/OrbitControls.js';
import {nodes,edges} from './network.mjs';

// An authored miniature landscape; positions are illustrative, not surveyed.
export function createExperience({host,labels,onSelect,onStoryStart,onStoryScenario}) {
 const scene=new THREE.Scene();scene.background=new THREE.Color('#122f2a');scene.fog=new THREE.Fog('#122f2a',125,260);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 host.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','Cedar Bay 3D landscape. Use the view buttons to rotate and zoom; choose a community to follow its route.');
 const camera=new THREE.PerspectiveCamera(38,1,.1,300);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.rotateSpeed=.55;controls.autoRotateSpeed=.8;controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.12;controls.maxPolarAngle=1.18;controls.target.set(0,0,0);
 const ambient=new THREE.HemisphereLight('#f3ead2','#31584f',1.85);scene.add(ambient);
 const sun=new THREE.DirectionalLight('#ffe0aa',3.5);sun.position.set(-25,65,35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-55,right:55,top:45,bottom:-45,near:1,far:130});sun.shadow.bias=-.0004;sun.shadow.normalBias=.15;scene.add(sun);
 const fill=new THREE.DirectionalLight('#a6c8cc',.85);fill.position.set(40,20,-30);scene.add(fill);
 const world=new THREE.Group();scene.add(world);
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.88,...extra});
 const soil=mat('#3a5948'),landMat=mat('#708870',{vertexColors:true,flatShading:true}),waterMat=mat('#3a8c8b',{roughness:.3,metalness:.25});
 const roadsMat=mat('#526257'),edgeMat=mat('#c9c5a3'),roofMat=mat('#a27d57'),wallMat=mat('#dfdac0'),clinicMat=mat('#ece8d0');
 const gold=new THREE.MeshBasicMaterial({color:'#ffac50'}),markerMat=mat('#c9dbb1'),darkMat=mat('#365543');
 const river=z=>8+2.5*Math.sin(z*.14);
 function height(x,z){const hills=1.5+5*Math.exp(-((x+20)**2/140+(z+10)**2/140))+3.3*Math.exp(-((x-26)**2/130+(z-15)**2/60))+.5*Math.sin(x*.23)*Math.cos(z*.25);const distance=Math.abs(x-river(z));return THREE.MathUtils.lerp(-.4,hills,THREE.MathUtils.smoothstep(distance,1.5,6));}
 const point=n=>new THREE.Vector3((n.x-400)/10,0,(n.y-245)/10);
 const terrain=new THREE.PlaneGeometry(80,49,100,64);terrain.rotateX(-Math.PI/2);const pos=terrain.attributes.position,colors=[];
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),h=height(x,z);pos.setY(i,h);const grain=Math.sin(x*.37+z*.11)*Math.cos(z*.29-x*.08);const c=new THREE.Color().setHSL(.255-h*.003,.17+h*.006,.39+h*.022+grain*.012);colors.push(c.r,c.g,c.b);}
 terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();const ground=new THREE.Mesh(terrain,landMat);ground.receiveShadow=true;world.add(ground);
 // Survey-like contour strokes give the terrain a readable atlas texture.
 const contourVertices=[],indices=terrain.index;for(let t=0;t<indices.count;t+=3){const triangle=[0,1,2].map(j=>{const k=indices.getX(t+j);return [pos.getX(k),pos.getY(k),pos.getZ(k)];});const low=Math.min(...triangle.map(p=>p[1])),high=Math.max(...triangle.map(p=>p[1]));for(let level=1;level<=7;level+=.8){if(level<=low||level>=high)continue;const hits=[];for(const [a,b] of [[0,1],[1,2],[2,0]]){const p=triangle[a],q=triangle[b];if((p[1]<level&&q[1]>=level)||(q[1]<level&&p[1]>=level)){const f=(level-p[1])/(q[1]-p[1]);hits.push(p[0]+(q[0]-p[0])*f,level+.045,p[2]+(q[2]-p[2])*f);}}if(hits.length===6)contourVertices.push(...hits);}}
 const contourGeometry=new THREE.BufferGeometry();contourGeometry.setAttribute('position',new THREE.Float32BufferAttribute(contourVertices,3));world.add(new THREE.LineSegments(contourGeometry,new THREE.LineBasicMaterial({color:'#e2d5ab',transparent:true,opacity:.18,depthWrite:false})));
 // Keep the block top below the skirt so the two surfaces do not z-fight along the edge.
 const base=new THREE.Mesh(new THREE.BoxGeometry(80,2.6,49),soil);base.position.y=-2.35;world.add(base);
 // Close the four exposed edges of the terrain block.
 const skirtPos=[],skirtIndex=[];for(const side of [0,1,2,3]){const start=skirtPos.length/3;for(let i=0;i<=100;i++){const t=i/100;const x=side===0?-40+80*t:side===1?40:side===2?40-80*t:-40;const z=side===0?-24.5:side===1?-24.5+49*t:side===2?24.5:24.5-49*t;skirtPos.push(x,height(x,z),z,x,-1,z);if(i<100){const a=start+i*2;skirtIndex.push(a,a+1,a+2,a+1,a+3,a+2);}}}
 const skirt=new THREE.BufferGeometry();skirt.setAttribute('position',new THREE.Float32BufferAttribute(skirtPos,3));skirt.setIndex(skirtIndex);skirt.computeVertexNormals();world.add(new THREE.Mesh(skirt,mat('#526b53',{side:THREE.DoubleSide})));
 const waterTime={value:0};waterMat.onBeforeCompile=shader=>{shader.uniforms.uTime=waterTime;shader.vertexShader='varying vec2 vWater;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWater = position.xy;');shader.fragmentShader='uniform float uTime; varying vec2 vWater;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal.x += sin(vWater.y * 2.3 + uTime * .8) * .07; normal.y += cos(vWater.x * 1.8 + uTime * .6) * .04; normal = normalize(normal);');};
 const water=new THREE.Mesh(new THREE.PlaneGeometry(79.9,48.9),waterMat);water.rotation.x=-Math.PI/2;water.position.y=.18;world.add(water);
 for(const side of [-1,1]){const bank=[];for(let i=0;i<=90;i++){const z=-24+i*48/90,x=river(z)+side*4.6;bank.push(new THREE.Vector3(x,Math.max(.23,height(x,z)+.07),z));}world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bank),90,.045,4,false),new THREE.MeshBasicMaterial({color:'#d8d0a7',transparent:true,opacity:.55})));}
 // Roads follow the relief. River crossings are elevated above the water.
 const byId=Object.fromEntries(nodes.map(n=>[n.id,n]));const roadCurves=new Map();const bridgeParts=[];
 function roadCurve(e){const a=point(byId[e.a]),b=point(byId[e.b]);const points=[];for(let i=0;i<=40;i++){const t=i/40;const x=THREE.MathUtils.lerp(a.x,b.x,t),z=THREE.MathUtils.lerp(a.z,b.z,t);points.push(new THREE.Vector3(x,Math.max(height(x,z)+.2,1.1),z));}return new THREE.CatmullRomCurve3(points);}
 for(const e of edges){const curve=roadCurve(e);roadCurves.set([e.a,e.b].sort().join(''),curve);const verge=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.36,5,false),edgeMat);world.add(verge);const road=new THREE.Mesh(new THREE.TubeGeometry(curve,64,.23,5,false),roadsMat);road.position.y=.23;world.add(road);
  if(e.bridge){for(let t=.34;t<.72;t+=.065){const p=curve.getPoint(t);if(Math.abs(p.x-river(p.z))<5){const pillar=new THREE.Mesh(new THREE.BoxGeometry(.45,p.y+1,.65),soil);pillar.position.set(p.x,p.y/2-.5,p.z);world.add(pillar);}}bridgeParts.push(verge,road);}
 }
 // Reusable low-poly trees, laid out deterministically away from roads.
 const treeGeo=new THREE.ConeGeometry(.7,2.7,5),trees=new THREE.InstancedMesh(treeGeo,mat('#315b44',{flatShading:true}),360),crownGeo=new THREE.ConeGeometry(.48,1.65,5),crowns=new THREE.InstancedMesh(crownGeo,mat('#4a7854',{flatShading:true}),360),dummy=new THREE.Object3D();crownGeo.translate(0,1.05,0);let count=0;
 const nearRoad=(x,z)=>edges.some(e=>{const a=point(byId[e.a]),b=point(byId[e.b]);const t=THREE.MathUtils.clamp(((x-a.x)*(b.x-a.x)+(z-a.z)*(b.z-a.z))/((b.x-a.x)**2+(b.z-a.z)**2),0,1);return Math.hypot(x-a.x-t*(b.x-a.x),z-a.z-t*(b.z-a.z))<1.3;});
 for(let i=0;i<900&&count<360;i++){const x=Math.sin(i*127.1+7)*38,z=Math.sin(i*311.7+2)*23;if(Math.abs(x-river(z))<5||nearRoad(x,z)||nodes.some(n=>point(n).distanceTo(new THREE.Vector3(x,0,z))<3))continue;const scale=.55+(Math.sin(i*13)+1)*.28;dummy.position.set(x,height(x,z)+1.1*scale,z);dummy.scale.setScalar(scale);dummy.rotation.y=i;dummy.updateMatrix();trees.setMatrixAt(count,dummy.matrix);crowns.setMatrixAt(count,dummy.matrix);const shade=new THREE.Color().setHSL(.35+Math.sin(i*7)*.015,.22,.28+Math.sin(i*19)*.045);trees.setColorAt(count,shade);crowns.setColorAt(count,new THREE.Color().setHSL(.34,.24,.36+Math.sin(i*11)*.035));count++;}trees.count=count;crowns.count=count;trees.castShadow=true;world.add(trees,crowns);
 const anchors=[];const rings={};
 for(const n of nodes){const p=point(n);p.y=Math.max(height(p.x,p.z),1.1);const group=new THREE.Group();group.position.copy(p);world.add(group);
  if(n.clinic){const building=new THREE.Mesh(new THREE.BoxGeometry(2.3,1.8,1.5),clinicMat);building.position.y=.9;group.add(building);const roof=new THREE.Mesh(new THREE.BoxGeometry(2.5,.18,1.7),mat('#728b7f'));roof.position.y=1.85;group.add(roof);for(const [w,d]of [[1,.25],[.25,1]]){const cross=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),mat('#b34f30'));cross.position.y=2;group.add(cross);}const beacon=new THREE.Mesh(new THREE.SphereGeometry(.24,8,6),new THREE.MeshBasicMaterial({color:'#ffe2a0'}));beacon.position.y=2.55;group.add(beacon);const reach=new THREE.Mesh(new THREE.TorusGeometry(3.2,.045,4,48),new THREE.MeshBasicMaterial({color:'#d9e5bb',transparent:true,opacity:.65}));reach.rotation.x=Math.PI/2;reach.position.y=.18;group.add(reach);}
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
 const film=document.createElement('button');film.type='button';film.id='play-flyover';film.textContent='Watch the story';film.setAttribute('aria-pressed','false');toolbar.prepend(film);
 const storyPanel=document.querySelector('#story-panel'),storyKicker=document.querySelector('#story-kicker'),storyTitle=document.querySelector('#story-title'),storyCopy=document.querySelector('#story-copy'),storyMeasure=document.querySelector('#story-measure'),storyProgress=document.querySelector('#story-progress');
 const chapters=[
  {name:'The journey',kicker:'01 / A normal day',title:'Care is across the river.',copy:'From Willow Bend, the nearest clinic is one crossing away.',measure:'13 minutes · East clinic',position:new THREE.Vector3(14,24,35),target:new THREE.Vector3(0,1,2)},
  {name:'The closure',kicker:'02 / The interruption',title:'Then the bridge closes.',copy:'One missing connection changes the route through the entire network.',measure:'The crossing is gone',position:new THREE.Vector3(28,27,30),target:new THREE.Vector3(9,1,-2)},
  {name:'The detour',kicker:'03 / The new path',title:'The journey turns west.',copy:'Willow Bend now reaches the other clinic by a longer road.',measure:'17 minutes · West clinic',position:new THREE.Vector3(-24,34,39),target:new THREE.Vector3(-13,1,-6)},
  {name:'The reach',kicker:'04 / The wider effect',title:'Access changes for more than one town.',copy:'At a 15-minute target, 1,600 fewer synthetic residents are within reach of a clinic.',measure:'57% → 41% within target',position:new THREE.Vector3(20,78,58),target:new THREE.Vector3(0,0,0)}
 ];
 const chapterButtons=chapters.map((chapter,index)=>{const button=document.createElement('button');button.type='button';button.textContent=`0${index+1} ${chapter.name}`;button.setAttribute('aria-label',`Show chapter ${index+1}: ${chapter.name}`);button.addEventListener('click',()=>startStory(index));storyProgress.append(button);return button;});
 let tween=null,story=null,storyComplete=false,desiredZoom=1,isTop=false;
 const ease=t=>t*t*t*(t*(t*6-15)+10);
 // Portrait screens intentionally frame the active crossing instead of shrinking the whole region.
 const overview=()=>new THREE.Vector3(32,65,70).multiplyScalar(camera.aspect<1?1.35:Math.max(1,1.25/camera.aspect));
 function moveTo(position,target=new THREE.Vector3(),duration=1.8){
  if(reduced.matches){camera.position.copy(position);controls.target.copy(target);camera.lookAt(target);tween=null;return;}
  tween={from:camera.position.clone(),to:position.clone(),targetFrom:controls.target.clone(),targetTo:target.clone(),age:0,duration};
 }
 const orbitButton=document.querySelector('#orbit-toggle');
 function stopFilm(){story=null;tween=null;storyComplete=false;film.textContent=reduced.matches?'Reduced motion':'Watch the story';film.setAttribute('aria-pressed','false');storyPanel.hidden=true;host.dataset.story='stopped';}
 function setChapter(index){if(!story)return;story.chapter=index;const chapter=chapters[index];onStoryScenario(index>0);storyKicker.textContent=chapter.kicker;storyTitle.textContent=chapter.title;storyCopy.textContent=chapter.copy;storyMeasure.textContent=chapter.measure;storyMeasure.classList.toggle('impact',index===3);storyPanel.hidden=false;storyPanel.dataset.chapter=String(index);chapterButtons.forEach((button,i)=>button.setAttribute('aria-current',i===index?'step':'false'));desiredZoom=1;isTop=false;document.querySelector('#view-top').setAttribute('aria-pressed','false');moveTo(chapter.position,chapter.target,index===0?2:2.8);}
 function startStory(index=0){if(reduced.matches)return;host.parentElement.scrollIntoView({behavior:'smooth',block:'start'});story={age:index*5.5,chapter:-1,paused:false};storyComplete=false;onStoryStart();setAutoRotate(false);film.textContent='Pause story';film.setAttribute('aria-pressed','true');host.dataset.story='playing';setChapter(index);}
 function finishStory(){story=null;storyComplete=true;film.textContent='Replay story';film.setAttribute('aria-pressed','false');storyCopy.textContent+=' Choose another community or access target to explore the network.';host.dataset.story='complete';}
 function interaction(value){controls.enabled=value;renderer.domElement.style.pointerEvents=value?'auto':'none';status.textContent=controls.autoRotate?'Scene rotating · Drag to orbit · Use + / − to zoom':value?'Drag to orbit · Select a community · Use + / − to zoom':'Select a community · Enable rotation to explore';}
 function setAutoRotate(value){const next=Boolean(value)&&!reduced.matches;controls.autoRotate=next;if(next){controls.enabled=true;renderer.domElement.style.pointerEvents='auto';}orbitButton.setAttribute('aria-pressed',String(next));orbitButton.textContent=next?'Stop rotation':'Rotate scene';interaction(controls.enabled);}
 interaction(matchMedia('(pointer:fine) and (min-width:701px)').matches);
 setAutoRotate(false);
 controls.addEventListener('start',()=>{stopFilm();setAutoRotate(false);tween=null;isTop=false;document.querySelector('#view-top').setAttribute('aria-pressed','false');});
 function reset(immediate=false){stopFilm();setAutoRotate(false);isTop=false;desiredZoom=1;if(immediate){camera.position.copy(overview());controls.target.set(0,0,0);camera.zoom=1;camera.lookAt(controls.target);}else moveTo(overview());document.querySelector('#view-top').setAttribute('aria-pressed','false');}
 orbitButton.onclick=()=>{stopFilm();tween=null;setAutoRotate(!controls.autoRotate);};
 document.querySelector('#view-reset').onclick=()=>reset();
 document.querySelector('#view-top').onclick=()=>{stopFilm();setAutoRotate(false);isTop=!isTop;desiredZoom=1;moveTo(isTop?new THREE.Vector3(0,Math.max(100,48/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)),.1):overview());document.querySelector('#view-top').setAttribute('aria-pressed',String(isTop));};
 function zoom(factor){stopFilm();setAutoRotate(false);desiredZoom=THREE.MathUtils.clamp(desiredZoom*factor,.75,2);}
 document.querySelector('#zoom-in').onclick=()=>zoom(1.2);document.querySelector('#zoom-out').onclick=()=>zoom(1/1.2);
 film.onclick=()=>{if(!story){startStory();return;}story.paused=!story.paused;film.textContent=story.paused?'Resume story':'Pause story';film.setAttribute('aria-pressed',String(!story.paused));host.dataset.story=story.paused?'paused':'playing';};
 function motionPreference(){film.disabled=reduced.matches;setAutoRotate(false);if(reduced.matches){stopFilm();film.textContent='Reduced motion';}else if(!story)film.textContent=storyComplete?'Replay story':'Watch the story';}
 reduced.addEventListener('change',motionPreference);motionPreference();
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();reset(true);}
 new ResizeObserver(resize).observe(host);resize();

 let previous=0;const timings=[];let frame=0;const projected=new THREE.Vector3();
 renderer.setAnimationLoop(time=>{const bounds=host.parentElement.getBoundingClientRect();if(document.hidden||bounds.bottom<=0||bounds.top>=innerHeight){previous=0;return;}const elapsed=previous?(time-previous)/1000:0;const dt=Math.min(elapsed,.05);if(previous){timings.push(time-previous);if(timings.length>120)timings.shift();}previous=time;if(!reduced.matches)clock+=dt;
  if(story&&!story.paused){story.age+=dt;const chapter=Math.min(3,Math.floor(story.age/5.5));if(chapter!==story.chapter)setChapter(chapter);if(story.age>=22)finishStory();}
  if(tween){tween.age+=story?.paused?0:dt;const t=Math.min(1,tween.age/tween.duration),e=ease(t);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,e);if(t===1)tween=null;}
  camera.zoom=reduced.matches?desiredZoom:THREE.MathUtils.lerp(camera.zoom,desiredZoom,1-Math.exp(-7*dt));camera.updateProjectionMatrix();controls.update();waterTime.value=clock;
  if(ghost){ghostAge+=dt;ghost.material.opacity=.45*Math.max(0,1-ghostAge/.6);if(ghostAge>=.6){world.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null;}}
  routeAge+=story?.paused?0:dt;if(routeMesh){const reveal=reduced.matches?1:Math.min(1,routeAge/1.25);routeMesh.geometry.setDrawRange(0,Math.floor(120*reveal)*6*6);}
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
  const nextKey=route.path.join('-');host.dataset.scenario=closed?'closed':'open';if(nextKey===routeKey)return;routeKey=nextKey;if(!story)stopFilm();setAutoRotate(false);routeAge=0;
  if(changed&&!isTop&&!story){const target=point(byId[selected]).multiplyScalar(.2);moveTo(overview().add(target),target,1.6);}
  if(ghost){world.remove(ghost);ghost.geometry.dispose();ghost.material.dispose();ghost=null;}
  if(routeMesh){if(reduced.matches){world.remove(routeMesh);routeMesh.geometry.dispose();}else{ghost=routeMesh;ghost.material=gold.clone();ghost.material.transparent=true;ghost.material.depthWrite=false;ghost.material.opacity=.45;ghostAge=0;}}routePoints=[];
  for(let i=1;i<route.path.length;i++){const a=route.path[i-1],b=route.path[i],curve=roadCurves.get([a,b].sort().join(''));const forward=edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a)).a===a;let points=curve.getPoints(35);if(!forward)points.reverse();routePoints.push(...points.map(p=>p.clone().add(new THREE.Vector3(0,.65,0))));}
  const unique=routePoints.filter((p,i)=>!i||p.distanceToSquared(routePoints[i-1])>.00001);const curve=new THREE.CatmullRomCurve3(unique);routeCurve=curve;routeMesh=new THREE.Mesh(new THREE.TubeGeometry(curve,120,.32,6,false),gold);world.add(routeMesh);host.dataset.route=route.path.join('-');host.dataset.scenario=closed?'closed':'open';
  },stopStory:stopFilm};
}
