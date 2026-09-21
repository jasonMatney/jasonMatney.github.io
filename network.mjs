export const nodes = [
  {id:'A',name:'Cedar Point',x:145,y:355,population:1800},
  {id:'B',name:'Pine Harbor',x:170,y:170,population:2200},
  {id:'C',name:'North Ridge',x:350,y:90,population:1200},
  {id:'D',name:'Willow Bend',x:385,y:280,population:1600},
  {id:'E',name:'Eastbank',x:610,y:175,population:1900},
  {id:'F',name:'South Cove',x:650,y:375,population:1300},
  {id:'W',name:'West clinic',x:90,y:70,clinic:true},
  {id:'H',name:'East clinic',x:700,y:80,clinic:true}
];
export const edges = [
  {a:'A',b:'B',minutes:10},{a:'B',b:'W',minutes:8},
  {a:'B',b:'C',minutes:12},{a:'C',b:'E',minutes:18},
  {a:'A',b:'D',minutes:12},{a:'B',b:'D',minutes:9},
  {a:'D',b:'E',minutes:7,bridge:true},{a:'D',b:'F',minutes:17},
  {a:'E',b:'F',minutes:11},{a:'E',b:'H',minutes:6}
];
export function shortestRoute(start, closed=false){
  const distances=Object.fromEntries(nodes.map(n=>[n.id,Infinity]));
  const previous={}; const remaining=new Set(nodes.map(n=>n.id)); distances[start]=0;
  while(remaining.size){
    const current=[...remaining].reduce((a,b)=>distances[a]<distances[b]?a:b);
    if(!Number.isFinite(distances[current])) break;
    remaining.delete(current);
    for(const e of edges){
      if(closed&&e.bridge) continue;
      const next=e.a===current?e.b:e.b===current?e.a:null;
      if(!next||!remaining.has(next))continue;
      const candidate=distances[current]+e.minutes;
      if(candidate<distances[next]){distances[next]=candidate;previous[next]=current;}
    }
  }
  const clinic=nodes.filter(n=>n.clinic).sort((a,b)=>distances[a.id]-distances[b.id])[0];
  const path=[];let at=clinic.id;
  while(at){path.unshift(at);at=previous[at];}
  return {minutes:distances[clinic.id],clinic:clinic.name,path};
}
export function analyze(closed,threshold){
  const communities=nodes.filter(n=>!n.clinic).map(n=>({...n,...shortestRoute(n.id,closed)}));
  const population=communities.reduce((sum,n)=>sum+n.population,0);
  const covered=communities.filter(n=>n.minutes<=threshold).reduce((sum,n)=>sum+n.population,0);
  return {communities,population,covered,percent:Math.round(covered/population*100)};
}
