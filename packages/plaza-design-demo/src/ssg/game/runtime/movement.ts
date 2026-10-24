/** Player integration in the original frame units and order. Runtime-owned player/level state only. */
import {levelStep,levelZone,levelFloor,levelBounds,type Movers} from '../engine/level';
import type {SceneHost} from '../engine/host';
import type {SceneId,SceneDef} from '../scenes';
import type {ScenesState,InputState,PresentationState,PlayerState} from './state';
export interface MovementPort {
 p:PlayerState;scenes:ScenesState;input:InputState;presentation:PresentationState;movers:Movers;zh:SceneHost;
 hostOf(id:SceneId):SceneHost;hasScene(id:string):id is SceneId;followResidency():void;crossInto(id:SceneId):void;keepSeenRooms():void;
 levelW:number;platforms:NonNullable<SceneDef['platforms']>;seamAt(edge:'left'|'right'):boolean;walkOff(edge:'left'|'right'):void;
}
export function stepPlayer(port:MovementPort,dt:number,locked:boolean):boolean {
 const p=port.p;
    const left = !locked && (port.input.keys.has('ArrowLeft') || port.input.keys.has('a'));
    const right = !locked && (port.input.keys.has('ArrowRight') || port.input.keys.has('d'));
    const speed = port.input.keys.has('Shift') ? 2.3 : 1.3;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    if (dir) { p.face = dir; if (port.presentation.bubble && Math.abs(p.x - port.presentation.bubble.x) > 140) port.presentation.bubble = null; }
    p.moving = !!dir;
    // a level ride (stairs, escalator, lift) carries the player; walking waits until it ends
    // ↑/↓ held climb a ladder, spiral or switchback (a straight flight is walked with ←/→)
    const climb = locked ? 0 : (port.input.keys.has('ArrowUp') || port.input.keys.has('w') ? 1 : 0) - (port.input.keys.has('ArrowDown') || port.input.keys.has('s') ? 1 : 0);
    const riding = !!port.scenes.level && levelStep(port.scenes.level, p, locked ? 0 : dir, dt, port.movers, climb);
    for(const host of port.scenes.hosts.values())host.model.playerSeat=undefined;
    const seated=port.scenes.level?.state.vehicle;if(seated?.seat){const definition=(port.scenes.level!.source.vehicleBase??port.scenes.level!.source).vehicles?.find(v=>v.id===seated.id),model=definition?.zone?port.hostOf(definition.zone as SceneId).model:port.zh.model;model.playerSeat={vehicle:seated.id.split('/').at(-1)!,seat:seated.seat};}
    // over a seam: the zone the player now stands in becomes the one they are in, with no cut
    const zone = port.scenes.level && levelZone(port.scenes.level);
    if (zone && zone !== port.scenes.here && port.hasScene(zone)) {if(!port.scenes.joinedZones.some(z=>z.id===zone))port.followResidency();port.crossInto(zone);}
    else port.followResidency();
    // a room seen for the first time stays open on this save
    if (port.scenes.level) port.keepSeenRooms();
    const [minX, maxX] = port.scenes.level && !riding ? levelBounds(port.scenes.level, port.levelW, p.x) : [12, port.levelW - 12];
    if (!riding) p.x = Math.max(minX, Math.min(maxX, p.x + dir * speed * dt));
    // Walking into an open border (the yard's passage, a street's end) leaves without E.
    if (dir < 0 && p.x <= 12 && !port.seamAt('left')) port.walkOff('left');
    else if (dir > 0 && p.x >= port.levelW - 12 && !port.seamAt('right')) port.walkOff('right');

    // Vertical: gravity, platforms and the street (a level's floor under the player)
    const prevY = p.y, floorH = port.scenes.level ? levelFloor(port.scenes.level).h : 0;
    if (riding) { /* the ride sets the height */ }
    else if (!p.onGround) {
      p.y += p.vy * dt;
      p.vy -= 0.22 * dt;
      for (const pl of port.platforms) {
        if (p.vy <= 0 && prevY >= pl.h && p.y <= pl.h && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2) { p.y = pl.h; p.vy = 0; p.onGround = true; }
      }
      if (p.y <= floorH) { p.y = floorH; p.vy = 0; p.onGround = true; }
    } else if (p.y > floorH && !port.platforms.some((pl) => pl.h === p.y && p.x > pl.x + 2 && p.x < pl.x + pl.w - 2)) {
      p.onGround = false; p.vy = 0;
    }

    return riding;
}
