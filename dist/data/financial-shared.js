import { financialDividendYieldTrace, payoutIncomeBars, payoutCashBars } from './financial-reference.js';
const financialChartModules=[
 {id:'financial-technical',type:'radar-basic',fixture:'financial-technical',chartId:'technical-radar',height:160},
 {id:'financial-rating',type:'radar-rating',fixture:'financial-rating',chartId:'investment-rating',height:170},
 {id:'financial-trend',type:'combo',fixture:'financial-trend',chartId:'balance-trend',height:240,colorSlots:[0,1,6]},
 {id:'financial-breakdown',type:'waterfall-data',fixture:'financial-breakdown',chartId:'balance-breakdown',height:240},
 {id:'financial-business',type:'donut',fixture:'financial-business',chartId:'revenue-breakdown-business',height:'auto',summary:{label:'Total',value:'109.42B'}},
 {id:'financial-region',type:'donut',fixture:'financial-region',chartId:'revenue-breakdown-region',height:'auto',summary:{label:'Total',value:'109.42B'}},
 {id:'financial-payout',type:'combo',fixture:'financial-payout',chartId:'dividend-payout',height:240,colorSlots:[0,1,6]},
 {id:'financial-yield',type:'line',fixture:'financial-yield',chartId:'dividend-yield',height:240,colorSlots:[6]}
].map(m=>({count:8,series:3,labels:'auto',...m}));
const financialPercent=v=>`${Number((v*100).toFixed(2))}%`;
function financialChartConfig(module){
 const b=1e9;
 switch(module.fixture){
 case 'financial-technical':return {name:'Technical Score',dimensions:['Fundamental','Technical','Momentum'],series:[{name:'Technical Score',data:[4,3,1.5]}],max:10,segments:4,shape:'curve',editable:false};
 case 'financial-rating':return {name:'Investment Rating',dimensions:['Value','Future','Past','Health','Dividend'],series:[{name:'Rating',data:[1.5,5,4,8,4.5]}],max:10,segments:5,variant:'rating',editable:false};
 case 'financial-trend':return {categories:['Q4 2024','Q1 2025','Q2 2025','Q3 2025','Q4 2025','Q1 2026','Q2 2026','Q3 2026'],series:[{name:'Assets',type:'bar',data:[366.98,344.08,331.23,331.49,359.24,367.04,359.21,383.28].map(v=>v*b)},{name:'Liabilities',type:'bar',data:[308.03,284.63,279.41,279.17,300.19,305.36,278.82,275.75].map(v=>v*b)},{name:'Debt Ratio',type:'line',axis:'secondary',data:[.844,.806,.7983,.8014,.7948,.7675,.719,.7265]}],zoom:{start:0,end:1}};
 case 'financial-breakdown':return {name:'Balance Sheet',period:'',variant:'data',xAxisContent:'name',showRelations:true,items:[{id:'assets',name:'Assets',kind:'total',value:383.27*b,percent:.1562},{id:'liabilities',name:'Liabilities',kind:'delta',value:-275.75*b,operatorBefore:'-',percent:.0379},{id:'equity',name:'Equity',kind:'total',value:107.52*b,operatorBefore:'=',percent:.6333}]};
 case 'financial-business':return {name:'Revenue by Business',variant:'donut',items:[['iPhone',54.25],['Services',30.74],['Mac',10.35],['Other Products',7.88],['iPad',6.19]].map(([name,value])=>({name,value:value*b})),legend:'bottom',dataLabel:true,labelLayout:'outside'};
 case 'financial-region':return {name:'Revenue by Region',variant:'donut',items:[['Americas',45.78],['Europe',29.39],['Greater China',18.82],['Rest of Asia Pacific',8.87],['Japan',6.56]].map(([name,value])=>({name,value:value*b})),legend:'bottom',dataLabel:true,labelLayout:'outside'};
 case 'financial-payout':return {categories:Array.from({length:8},(_,i)=>String(2018+i)),series:[{name:'Net Income Attributable to Parent',type:'bar',data:payoutIncomeBars.map(v=>v.height/(1117-1044.7)*140*b)},{name:'Total Cash Dividends',type:'bar',data:payoutCashBars.map(v=>v.height/(1117-1044.7)*140*b)},{name:'Payout Ratio',type:'line',axis:'secondary',data:[.2275,.2521,.2413,.1503,.1465,.1558,.1663,.1344]}],zoom:{start:0,end:1}};
 case 'financial-yield':return {categories:financialDividendYieldTrace.map((_,i,all)=>i===0?'Apr 11, 2026':i===Math.floor(all.length/2)?'Jul 18, 2026':i===all.length-1?'Oct 28, 2026':'\u200b'.repeat(i+1)),series:[{name:'Dividend Yield',type:'line',data:financialDividendYieldTrace.map(([,y])=>(1478.16-y)/(1478.16-1371.156)*.0056)}],dataLabel:false,zoom:{start:0,end:1}};
 default:return null;
 }
}
export {financialChartModules,financialChartConfig,financialPercent};
