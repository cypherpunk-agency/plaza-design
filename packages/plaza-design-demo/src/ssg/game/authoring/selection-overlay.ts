/** Editor interface only; never included in game artwork or pixel-parity captures. */
import type {PreviewResult} from './contracts';
export function drawSelectionOverlay(ctx: CanvasRenderingContext2D, result: PreviewResult, selectedId?: string, allObjects=false) {
  const selected = result.bounds.find(b => b.id === selectedId); if (!selected&&!allObjects) return;
  ctx.save();
  try {
    ctx.setTransform(1,0,0,1,0,0);ctx.lineWidth=1;
    if(allObjects){ctx.strokeStyle='#b3c5d9cc';ctx.lineWidth=1.5;ctx.setLineDash([3,2]);for(const box of result.bounds)if(box.id!==selectedId&&box.width>0&&box.height>0)ctx.strokeRect(box.x+.5,box.y+.5,box.width,box.height);ctx.lineWidth=1;}
    if(!selected)return;
    if(selected.clip){const c=selected.clip;ctx.strokeStyle='#ffb43c';ctx.setLineDash([7,3]);ctx.strokeRect(c.x+.5,c.y+.5,c.width,c.height);ctx.setLineDash([]);ctx.fillStyle='#ffb43c';ctx.font='11px monospace';ctx.fillText('Artwork clip',c.x+4,c.y+13);}
    ctx.strokeStyle = '#72dbca'; ctx.setLineDash([4, 3]);
    ctx.strokeRect(selected.x + .5, selected.y + .5, selected.width, selected.height); ctx.setLineDash([]);
  } finally { ctx.restore(); }
}
