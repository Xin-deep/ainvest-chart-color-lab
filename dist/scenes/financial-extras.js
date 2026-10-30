import { validateCompactBoard, renderCompactCards } from './custom.js';
function defaultFinancialBoard(){return {catalogVersion:3,columns:2,density:'compact',modules:[],selected:undefined};}
function validateFinancialBoard(input){
  if(!input||!Array.isArray(input.modules))return defaultFinancialBoard();
  return validateCompactBoard({...input,catalogVersion:3,columns:input.columns??2});
}
function renderFinancialExtras(board){
  return `${board.modules.length?`<section class="financial-module financial-extra-modules"><div class="financial-module-header"><h2>新增可视化组件</h2></div><div class="compact-grid" style="--board-columns:${board.columns}">${renderCompactCards(board)}</div></section>`:''}<button class="compact-add-tile financial-add-module" data-action="module-picker">＋ 添加可视化模块</button>`;
}
export {defaultFinancialBoard,validateFinancialBoard,renderFinancialExtras};
