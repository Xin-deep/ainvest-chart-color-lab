// Business fixtures from the supplied Aime screenshots; shared renderers draw the charts.
const aimeFixtureTypes = {'aime-growth':'line-multi','aime-duration':'market-cap-race','aime-factors':'donut','aime-stack':'stack','aime-grouped':'grouped3'};
const aimeCardTitle = 'AAPL Dividend Continuous Duration, Dividend Growth Duration';
const aimeResample = (values,n) => Array.from({length:n},(_,i)=>{const x=n===1?0:i*(values.length-1)/(n-1),a=Math.floor(x),b=Math.min(values.length-1,a+1);return values[a]+(values[b]-values[a])*(x-a);});
function aimeChartConfig(module){
  const n=module.count;
  if(module.fixture==='aime-growth'){
    const data=[[.08,.35,.05,.12,.21,.29,.18,.39,.3,.3,.18,.07],[.4,.65,.36,.42,.52,.61,.5,.72,.63,.63,.51,.37],[.82,.91,.81,.83,.86,.89,.85,.93,.9,.9,.86,.81]];
    return {categories:Array.from({length:n},(_,i)=>i===0?'2025 Q3':i===Math.floor(n/3)?'2025 Q4':i===Math.floor(2*n/3)?'2026 Q1':i===n-1?'2026 Q2':'\u200b'.repeat(i+1)),series:Array.from({length:module.series},(_,i)=>({name:['Net Income YoY','Total Revenue YoY','Diluted EPS YoY'][i]||`Metric ${i+1}`,data:aimeResample(data[i%3],n).map(v=>i<3?v:v*.75),type:'line',area:true})),unit:'%',zoom:{start:0,end:1}};
  }
  if(module.fixture==='aime-duration')return {items:[{name:'Dividend Continuous Duration',value:23},{name:'Dividend Growth Duration',value:14}],topN:2};
  if(module.fixture==='aime-factors')return {name:'Total',variant:'donut',items:Array.from({length:n},(_,i)=>({name:i<5?`Factory${i+1}`:i===5?'legend':i===6?'legend\u200b':`Factory${i+1}`,value:[.25,.18,.165,.12,.12,.10,.065][i%7]*155250000})),legend:'bottom',dataLabel:module.labels==='on',labelLayout:module.labels==='on'?'outside':'off'};
  if(module.fixture==='aime-stack'||module.fixture==='aime-grouped'){
    const stack=module.fixture==='aime-stack';
    const data=stack?[[.28,.18,.40,.43,.65],[.18,.10,.25,.26,.41],[.12,0,.15,.18,.27],[.10,0,.15,.16,.22],[0,0,0,.08,.06]]:[[1.4,1.8,1.3,1.4,1.0],[.9,1.4,.9,1.05,.7],[.8,1.1,.8,.85,.6],[1.1,1.45,1,1.05,.8]];
    return {categories:Array.from({length:n},(_,i)=>String(2020+i)),series:Array.from({length:module.series},(_,i)=>({name:`Factory${i+1}`,data:aimeResample(data[i%data.length],n).map(v=>i<data.length?v:v*.8),type:'bar'})),stack:stack?'normal':'none',zoom:{start:0,end:1}};
  }
  return null;
}
export {aimeFixtureTypes,aimeCardTitle,aimeChartConfig};
