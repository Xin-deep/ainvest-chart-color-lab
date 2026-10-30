import { compactTypes, newCompactModule, validateCompactBoard } from './custom.js';
const comparisonTemplates=[{id:'all',name:'对比模板'}];
function createComparisonBoard(){
 const modules=compactTypes.flatMap(def=>{
   const counts=def.chart==='radar'?[3,6]:def.chart==='hbar'?[5,12]:def.chart==='pie'?[3,10]:def.chart==='chord'?[4,10]:def.id==='treemap-entry'?[4,8]:def.id==='treemap-overall'?[8,48]:def.chart==='sankey'?[5,15]:def.chart==='waterfall'?[3,12]:[4,24];
   return counts.map((count,index)=>({...newCompactModule(def.id),count:Math.max(def.range.min,Math.min(def.range.max,count)),comparisonLabel:index?'大量数据':'少量数据',comparisonVariant:index?'many':'few',fixtureCustomized:true,span:'auto'}));
 });
 return {catalogVersion:3,columns:2,density:'compact',selected:modules[0]?.id,modules};
}
function validateComparisonBoards(input){
 if(input?.all?.modules)return {all:validateCompactBoard({...input.all,catalogVersion:3})};
 // Merge the previous category templates without losing their adjusted pairs.
 const previous=['bars','stacks','lines','combos','ranking','pies','radars','treemaps','sankey','chord','waterfalls'].flatMap(id=>Array.isArray(input?.[id]?.modules)?input[id].modules:[]);
 if(!previous.length)return {};
 const board=createComparisonBoard();
 board.modules=board.modules.map(module=>{
   const old=previous.find(m=>m.type===module.type&&m.comparisonLabel===module.comparisonLabel);
   return old?{...module,...old,comparisonVariant:module.comparisonVariant}:module;
 });
 return {all:validateCompactBoard(board)};
}
function comparisonTemplatePanel(id){
 return `<section class="panel-section compact-settings"><div class="section-heading"><span class="section-label">预览布局</span></div><label>布局模式<select data-comparison-template aria-label="选择预览布局"><option value="all" ${id!=='free'?'selected':''}>对比模板</option><option value="free" ${id==='free'?'selected':''}>自由布局</option></select></label><p class="editor-footnote">对比模板将全部 25 种图表的少量 / 大量数据示例放在同一界面，共 50 个模块。</p></section>`;
}
export {comparisonTemplates,createComparisonBoard,validateComparisonBoards,comparisonTemplatePanel};
