/** Editor interface only; never included in game artwork or pixel-parity captures. */
import type {PreviewResult} from './contracts';
export function drawSelectionOverlay(ctx: CanvasRenderingContext2D, result: PreviewResult, selectedId?: string, allObjects=false) {
  const selected = result.bounds.find(b => b.id === selectedId); if (!selected&&!allObjects) return;
  ctx.save();
  try {
    ctx.setTransform(1,0,0,1,0,0);ctx.lineWidth=1;
    if(allObjects){ctx.strokeStyle='#8fa2b980';ctx.setLineDash([2,3]);for(const box of result.bounds)if(box.id!==selectedId&&box.width>0&&box.height>0)ctx.strokeRect(box.x+.5,box.y+.5,box.width,box.height);}
    if(!selected)return;
    ctx.strokeStyle = '#72dbca'; ctx.fillStyle = '#10151d'; ctx.setLineDash([4, 3]);
    ctx.strokeRect(selected.x + .5, selected.y + .5, selected.width, selected.height); ctx.setLineDash([]);
    for (const x of [selected.x, selected.x + selected.width]) for (const y of [selected.y, selected.y + selected.height]) { ctx.fillRect(x - 3, y - 3, 6, 6); ctx.strokeRect(x - 3.5, y - 3.5, 7, 7); }
  } finally { ctx.restore(); }
}
