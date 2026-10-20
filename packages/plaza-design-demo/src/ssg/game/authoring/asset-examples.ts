/** Display-only examples. These never run commands, change source documents or unlock gameplay. */
import type { Properties, Resolved, Value } from '../art/core/composition';
import { prepareCharacter } from '../runtime/characters';

export function helperArtwork(type: string): boolean {
  return /\.(marker|spawn-marker|light|caster)$/.test(type) || type === 'scene.player';
}

export function drawHelperPreview(canvas: HTMLCanvasElement, type: string) {
  const ctx = canvas.getContext('2d')!, x = canvas.width / 2, y = canvas.height / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save();
  const light = /\.(light|caster)$/.test(type), player = type === 'scene.player';
  ctx.strokeStyle = '#72dbca'; ctx.fillStyle = '#72dbca'; ctx.lineWidth = 3;
  if (light) {
    const glow = ctx.createRadialGradient(x, y, 2, x, y, 74);
    glow.addColorStop(0, '#ffd9a5'); glow.addColorStop(1, 'rgba(255,217,165,0)');
    ctx.fillStyle = glow; ctx.fillRect(x - 74, y - 74, 148, 148);
  }
  ctx.setLineDash([6, 5]); ctx.strokeRect(x - 52, y - 38, 104, 76); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 12); ctx.stroke();
  ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d2dfeb';
  ctx.fillText(player ? 'Player layer' : light ? 'Light / shadow helper' : 'Scene marker', x, y + 104);
  ctx.restore();
  return { message: 'Editor diagram of an invisible scene helper, not game artwork.' };
}

/** Named representative states, rather than guessing that every boolean should be true. */
export function exampleState(row: Resolved): Properties {
  const s = structuredClone(row.state), id = row.element.type, at = row.placement;
  if (id === 'actor.prepared' || id === 'character.prepared') {
    const pose = s.pose as Properties | undefined;
    if (!pose?.visible) s.pose = prepareCharacter({ x: at.x, h: at.h, seed: 17, act: 'stand' }, 0) as unknown as Value;
    if (id === 'character.prepared') s.clip = null;
  }
  if (id === 'dockwork.case') s.visible = true;
  if (id === 'dockwork.statement') s.checked = true;
  if (id === 'dockwork.complete') s.done = true;
  if (id === 'downtown.smear' || id === 'downtown.stall-pool') {
    Object.assign(s, { city: true, rain: 1 });
    if (id === 'downtown.smear') Object.assign(s, { x: at.x, color: '255,136,0' });
    else s.metrics = [at.x, 140];
  }
  if (id === 'downtown.device-hover') {
    const snapshot = s.snapshot as Properties;
    s.snapshot = { ...snapshot, hoverSpot: { x: at.x, y: at.h, w: 52, h: 48 } };
  }
  if (id === 'sandbox.hover') s.snapshot = { ...(s.snapshot as Properties), hoverSpot: { x: at.x, y: at.h, w: 52, h: 48 } };
  if (id === 'station.waiting-passenger') s.rider = { on: true, kind: 'phone', flip: false, phase: 0 };
  if (id === 'train.rider') {
    const f = s.frame as Properties;
    if (f) s.frame = { ...f, riders: { ...(f.riders as Properties), [String(row.props.actor)]: { on: true, kind: 'suit', sit: false, flip: false, phase: 0, offset: 0 } } };
  }
  if (id.startsWith('terminal.')) {
    const f = s.snapshot as Properties;
    if (f) {
      const sample = { ...f, layer: 'all', deckReefer: true };
      if (id === 'terminal.carried-load') Object.assign(sample, { loadVisible: true, trolley: { x: at.x + 64, h: at.h, carry: 1 } });
      if (id === 'terminal.crane-outline') Object.assign(sample, { hover: 'sts2' });
      if (id === 'terminal.reefer-outline') Object.assign(sample, { hover: 'reefer' });
      s.snapshot = sample;
    }
  }
  return s;
}
