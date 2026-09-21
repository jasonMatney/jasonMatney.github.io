import test from 'node:test';
import assert from 'node:assert/strict';
import {nodes,edges,shortestRoute,analyze} from '../network.mjs';
test('known shortest journeys and weighted coverage respond to bridge closure',()=>{
  assert.equal(shortestRoute('D',false).minutes,13);
  assert.equal(shortestRoute('D',true).minutes,17);
  assert.equal(shortestRoute('D',true).clinic,'West clinic');
  assert.equal(shortestRoute('C',false).minutes,20);
  assert.equal(analyze(false,15).percent,57);
  assert.equal(analyze(true,15).percent,41);
  assert.equal(analyze(false,20).percent,100);
});
test('every returned route has valid edges, correct sum, and an actual clinic destination',()=>{
 for(const closed of [false,true])for(const n of nodes.filter(n=>!n.clinic)){
  const result=shortestRoute(n.id,closed);let sum=0;
  assert.equal(result.path[0],n.id);
  assert.ok(nodes.find(n=>n.id===result.path.at(-1)).clinic);
  for(let i=1;i<result.path.length;i++){
   const a=result.path[i-1],b=result.path[i],edge=edges.find(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a));
   assert.ok(edge);assert.ok(!(closed&&edge.bridge));sum+=edge.minutes;
  }assert.equal(sum,result.minutes);
 }
});
test('closure never improves access and coverage is monotonic as the target increases',()=>{
 for(const n of nodes.filter(n=>!n.clinic))assert.ok(shortestRoute(n.id,true).minutes>=shortestRoute(n.id,false).minutes);
 for(const closed of [false,true]){let last=0;for(let threshold=10;threshold<=40;threshold+=5){const r=analyze(closed,threshold);assert.equal(r.population,10000);assert.ok(r.percent>=last);last=r.percent;}}
});
