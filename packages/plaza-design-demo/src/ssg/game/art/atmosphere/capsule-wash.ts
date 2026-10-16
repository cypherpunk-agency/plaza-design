/** Flat's story-directed warm/cold light, rendered below its player. */
export function drawCapsuleWash(x: CanvasRenderingContext2D, viewW:number, viewH:number, tone:'warm'|'cold') {
  x.fillStyle = tone === 'warm' ? 'rgba(255,160,80,.08)' : 'rgba(100,135,190,.14)';
  x.fillRect(0, 0, viewW, viewH);
}
