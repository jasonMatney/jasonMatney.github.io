import {nodes,edges,shortestRoute,analyze} from './network.mjs';
const $=s=>document.querySelector(s);
const ns='http://www.w3.org/2000/svg';
function el(tag,attrs={},text){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text)n.textContent=text;return n;}
function contours(svg,cx,cy,sx,sy,count,color,opacity){
  const g=el('g',{fill:'none',stroke:color,'stroke-width':.75,opacity});
  for(let ring=1;ring<=count;ring++){let d='';for(let step=0;step<=100;step++){const t=step/100*Math.PI*2;const radius=ring/count;const wobble=1+.14*Math.sin(3*t+radius*3)+.09*Math.cos(7*t-radius*4)+.04*Math.sin(13*t);const x=cx+Math.cos(t)*sx*radius*wobble,y=cy+Math.sin(t)*sy*radius*wobble;d+=`${step?'L':'M'}${x.toFixed(1)},${y.toFixed(1)} `;}g.append(el('path',{d:d+'Z'}));}svg.append(g);
}
const hero=$('#hero-map');
const grid=el('g',{stroke:'#a6b29a','stroke-width':.6,opacity:.3});
for(let x=20;x<650;x+=90)grid.append(el('path',{d:`M${x} 0V720`}));
for(let y=25;y<720;y+=90)grid.append(el('path',{d:`M0 ${y}H650`}));hero.append(grid);
contours(hero,435,200,290,250,29,'#8b9b7f',.6);contours(hero,200,550,210,210,22,'#8b9b7f',.6);contours(hero,660,690,220,235,20,'#8b9b7f',.45);
hero.append(el('path',{d:'M115 -20 Q420 160 310 330 T400 760',stroke:'#a9b9a2','stroke-width':35,fill:'none',opacity:.3}));
hero.append(el('path',{d:'M180 80L310 175L365 290L260 410L390 535L545 620',stroke:'#b76138','stroke-width':1.5,'stroke-dasharray':'3 5',fill:'none'}));
for(const[x,y]of [[180,80],[310,175],[365,290],[260,410],[390,535],[545,620]]){hero.append(el('circle',{cx:x,cy:y,r:5,fill:'#f3f1e9',stroke:'#b76138','stroke-width':1.5}));hero.append(el('circle',{cx:x,cy:y,r:11,fill:'none',stroke:'#b76138',opacity:.2}));}
const map=$('#network-map');
const sceneStage=$('.scene-stage');
contours(map,260,140,210,180,16,'#789879',.2);contours(map,650,360,190,140,13,'#789879',.2);
map.append(el('path',{d:'M470 -40C380 100 510 175 468 285S455 420 520 530',stroke:'#234f47','stroke-width':37,fill:'none'}));
map.append(el('text',{x:475,y:435,fill:'#88a597','font-size':13,'font-style':'italic','font-family':'Georgia',transform:'rotate(-77 475 435)'},'Cedar River'));
const roads=el('g',{class:'map-roads'}),routeLayer=el('g'),places=el('g',{class:'map-places'});map.append(roads,routeLayer,places);
const lookup=Object.fromEntries(nodes.map(n=>[n.id,n]));
for(const e of edges){const a=lookup[e.a],b=lookup[e.b];const group=el('g');group.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#68877a','stroke-width':2,'data-edge':`${e.a}-${e.b}`}));group.append(el('text',{x:(a.x+b.x)/2+7,y:(a.y+b.y)/2-7,fill:'#adbeae','font-size':10},`${e.minutes}m`));roads.append(group);}
const closure=el('g',{visibility:'hidden'});closure.append(el('circle',{cx:497.5,cy:227.5,r:15,fill:'#173b33',stroke:'#f6b17c'}));closure.append(el('path',{d:'M491 221L504 234M504 221L491 234',stroke:'#f6b17c','stroke-width':2}));
for(const n of nodes){const g=el('g',n.clinic?{}:{class:'map-node',tabindex:0,role:'button','aria-label':`Follow ${n.name}`,'data-node':n.id});
  if(n.clinic){g.append(el('rect',{x:n.x-9,y:n.y-9,width:18,height:18,fill:'#d8dfc8'}));g.append(el('path',{d:`M${n.x-5} ${n.y}h10M${n.x} ${n.y-5}v10`,stroke:'#173b33','stroke-width':2}));}
  else{g.append(el('circle',{cx:n.x,cy:n.y,r:20,fill:'transparent'}));g.append(el('circle',{cx:n.x,cy:n.y,r:7,fill:'#173b33',stroke:'#b3c8b5','stroke-width':2,'data-marker':n.id}));}
  const label=el('text',{x:n.x+14,y:n.y+5,fill:'#e2e8d7','font-size':13,'font-family':'Georgia'} ,n.name);
  if(n.x>600){label.setAttribute('x',n.x-16);label.setAttribute('text-anchor','end');label.setAttribute('y',n.y+27);}g.append(label);places.append(g);
  if(!n.clinic){const select=()=>{$('#community').value=n.id;render();};g.addEventListener('click',select);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});}
}
map.append(closure);
let closed=false;
let experience=null;
function selectCommunity(id){$('#community').value=id;render();}
const observer=new IntersectionObserver(async entries=>{if(!entries.some(e=>e.isIntersecting))return;observer.disconnect();try{const {createExperience}=await import('./experience.js?v=cinema3');experience=createExperience({host:$('#scene-3d'),labels:$('#scene-labels'),onSelect:selectCommunity});sceneStage.dataset.sceneState='ready';sceneStage.setAttribute('aria-busy','false');render();}catch(error){console.warn('3D view unavailable; using accessible map.',error);sceneStage.dataset.sceneState='fallback';sceneStage.setAttribute('aria-busy','false');$('#scene-status').textContent='3D unavailable on this device. The map and access controls remain available.';}},{rootMargin:'300px'});
observer.observe($('#simulation'));
function render(){
 const threshold=Number($('#threshold').value), selected=$('#community').value, result=analyze(closed,threshold), route=shortestRoute(selected,closed),baseline=shortestRoute(selected,false);
 experience?.update({closed,selected,threshold,result,route});
 $('#threshold-value').textContent=`${threshold} min`;$('#coverage').textContent=`${result.percent}%`;
 $('#route-summary').textContent=`${lookup[selected].name} → ${route.clinic}: ${route.minutes} minutes.`;
 const delta=route.minutes-baseline.minutes;
 $('#scenario-insight').textContent=closed?`${delta?`${delta} minutes longer for this community.`:'This community’s shortest journey is unchanged.'} ${result.covered.toLocaleString()} of ${result.population.toLocaleString()} residents are within ${threshold} minutes.`:`All roads are open. ${result.covered.toLocaleString()} of ${result.population.toLocaleString()} residents are within ${threshold} minutes.`;
 for(const b of document.querySelectorAll('[data-scenario]'))b.setAttribute('aria-pressed',String((b.dataset.scenario==='closed')===closed));
 routeLayer.replaceChildren();
 for(let i=1;i<route.path.length;i++){const a=lookup[route.path[i-1]],b=lookup[route.path[i]];routeLayer.append(el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#f1b076','stroke-width':4,'stroke-linecap':'round'}));}
 closure.setAttribute('visibility',closed?'visible':'hidden');
 const bridge=document.querySelector('[data-edge="D-E"]');bridge.setAttribute('stroke-dasharray',closed?'4 7':'none');bridge.setAttribute('opacity',closed?'.3':'1');
 for(const n of result.communities){const marker=document.querySelector(`[data-marker="${n.id}"]`);marker.setAttribute('fill',n.id===selected?'#f1b076':n.minutes<=threshold?'#a5c0a0':'#173b33');marker.setAttribute('r',n.id===selected?10:7);document.querySelector(`[data-node="${n.id}"]`).setAttribute('aria-pressed',String(n.id===selected));}
 $('#travel-table').replaceChildren(...result.communities.map(n=>{const tr=document.createElement('tr');for(const value of[n.name,n.population.toLocaleString(),`${n.minutes} min`,n.minutes<=threshold?'Yes':'No']){const td=document.createElement('td');td.textContent=value;tr.append(td);}return tr;}));
 $('#map-desc').textContent=`Fictional Cedar Bay. ${closed?'Bridge closed.':'All roads open.'} ${lookup[selected].name} reaches ${route.clinic} in ${route.minutes} minutes. ${result.percent}% of residents are within the ${threshold}-minute target. Travel times are also listed in the method table.`;
}
for(const b of document.querySelectorAll('[data-scenario]'))b.addEventListener('click',()=>{closed=b.dataset.scenario==='closed';render();});
$('#community').addEventListener('change',render);$('#threshold').addEventListener('input',render);$('#reset').addEventListener('click',()=>{closed=false;$('#community').value='D';$('#threshold').value='15';render();});
$('#year').textContent=new Date().getFullYear();render();
