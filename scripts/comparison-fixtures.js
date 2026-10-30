// Fixed upstream demos need genuinely different data volumes for the comparison pair.
export function applyComparisonFixture(cfg,module){
 if(!['few','many'].includes(module.comparisonVariant))return cfg;
 if(module.type==='sankey-financial'&&module.comparisonVariant==='few'){
   return {...cfg,nodes:[
     {id:'business-a',name:'Core Business',role:'income',stage:0,order:0},
     {id:'business-b',name:'Other Business',role:'income',stage:0,order:1},
     {id:'revenue',name:'Revenue',role:'income',stage:1,order:0},
     {id:'cost',name:'Cost of Revenue',role:'expense',stage:2,order:0},
     {id:'profit',name:'Gross Profit',role:'profit',stage:2,order:1}
   ],links:[
     {source:'business-a',target:'revenue',value:14.8e9},
     {source:'business-b',target:'revenue',value:6.7e9},
     {source:'revenue',target:'cost',value:18.8e9},
     {source:'revenue',target:'profit',value:2.7e9,negativeSource:'cost'}
   ]};
 }
 if(['waterfall-bridge','waterfall-data'].includes(module.type)){
   const count=module.count,step=-5e9,start=100e9,data=module.type==='waterfall-data';
   const amount=(value,id)=>data?{segments:[{id:id+'-a',name:'Core',value:value*.6},{id:id+'-b',name:'Other',value:value*.4}]}:{value};
   return {...cfg,items:[
     {id:'revenue',name:'Revenue',kind:'total',...amount(start,'revenue')},
     ...Array.from({length:count-2},(_,i)=>({id:'expense-'+i,name:'Expense '+(i+1),kind:'delta',operatorBefore:'-',...amount(step,'expense-'+i)})),
     {id:'profit',name:'Net Profit',kind:'total',operatorBefore:'=',...amount(start+(count-2)*step,'profit')}
   ]};
 }
 return cfg;
}
