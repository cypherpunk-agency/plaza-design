import type {CompanionPet} from '../engine/gameplay/scene-companion';
import { drawPixel, type PixelPose as Pose } from '../art/characters/pixel';
/**
 * Pixel, the robot cat: a small companion the engine draws in any scene.
 *
 * Pixel sleeps on whatever is warm. In the flat (Capsule 7B) the scene says
 * where that is (`perch`: the bed, the router, the sunny spot); outside, Pixel
 * follows the player: walks behind, sits when you stop, and after a while
 * curls up on a warm machine nearby (the scene source) or naps where it sat.
 *
 * Pixel is only a picture: it never blocks the player, never takes a prompt,
 * and has no hit box. Whether Pixel is with you is a save flag (`flags.pixel`,
 * set when you first leave the flat); where Pixel stands is not saved, it
 * simply turns up behind you.
 *
 * Native companion movement and presentation; authored conversations own the words.
 */

/** Somewhere to rest: world x, height above the ground, and how Pixel rests there. */
export interface Perch { x: number; h: number; rest: 'sleep' | 'sun' | 'sit' }

export class Companion {
  x = 0;
  h = 0;
  face = 1;
  pose: Pose = 'sit';
  /** Where Pixel is heading and how it will rest there. */
  private goal: Perch | null = null;
  private hopping: { x0: number; h0: number; x1: number; h1: number; f: number } | null = null;
  /** Frames left of a waking stretch. */
  private stretching = 0;
  /** Frames the player has been standing still (outside). */
  private idle = 0;
  /** Outside: a warm machine Pixel picked for this rest (once per stop). */
  private napAt: Perch | null = null;
  private decided = false;
  private zs: { x: number; h: number; age: number; ch?: string }[] = [];
  private petted = 0;

  /** Petted (E next to Pixel): a visible purr, and what you notice, in turn. */
  pet(recipe:CompanionPet):string {
    for (let i = 0; i < 3; i++) this.zs.push({ x: this.x + (i - 1) * 5, h: this.h + 12, age: -i * 14, ch: 'prr' });
    const n=this.petted++,c=recipe.conversations;
    return this.pose==='sleep'?c.sleep[n%c.sleep.length]:this.pose==='sun'?c.sun:this.pose==='walk'||this.pose==='hop'?c.moving:c.idle[n%c.idle.length];
  }

  /** Put Pixel down right here (on arriving somewhere). */
  place(x: number, h = 0, pose: Pose = 'sit', face = 1) {
    Object.assign(this, { x, h, pose, face, hopping: null, stretching: 0, idle: 0, napAt: null, decided: false, goal: null });
    this.zs = [];
  }

  /**
   * One frame. `perch`: in a home scene, where Pixel wants to be (follow the
   * warmth); without it, Pixel follows the player and naps near `warm` spots.
   */
  update(dt: number, o: { px: number; face: number; moving: boolean; perch?: Perch | null; warm?: Perch[] }) {
    // never lost: too far behind (a door, a jump cut), turn up behind the player
    if (!o.perch && Math.abs(this.x - o.px) > 300) this.place(o.px - o.face * 22, 0, 'sit', o.face);
    this.goal = o.perch ?? this.follow(dt, o);
    this.zs = this.zs.filter((z) => (z.age += dt) < 90);
    if ((this.pose === 'sleep' || this.pose === 'sun') && Math.random() < 0.012 * dt) this.zs.push({ x: this.x + this.face * 6, h: this.h + 10, age: 0 });

    if (this.hopping) {
      const p = this.hopping;
      p.f = Math.min(1, p.f + dt / 16);
      this.x = p.x0 + (p.x1 - p.x0) * p.f;
      this.h = p.h0 + (p.h1 - p.h0) * p.f + Math.sin(p.f * Math.PI) * (10 + Math.abs(p.h1 - p.h0) * 0.3);
      this.pose = 'hop';
      if (p.f >= 1) { this.x = p.x1; this.h = p.h1; this.hopping = null; this.pose = 'sit'; }
      return;
    }
    if (this.stretching > 0) { this.stretching -= dt; this.pose = 'stretch'; return; }

    const g = this.goal;
    if (!g) return;
    const there = Math.abs(this.x - g.x) < 1.5 && Math.abs(this.h - g.h) < 0.5;
    if (there) { this.pose = g.rest; return; }
    // resting and about to go: a stretch first
    if (this.pose === 'sleep' || this.pose === 'sun') { this.stretching = 34; this.pose = 'stretch'; return; }
    // off a perch first, then along the floor, then up onto the perch
    if (this.h > 0.5) { this.hop(this.x + (g.x >= this.x ? 1 : -1) * 10, 0); return; }
    if (Math.abs(this.x - g.x) < 2 && g.h > 0) { this.hop(g.x, g.h); return; }
    const d = g.x - this.x, dist = Math.abs(d);
    const speed = o.perch ? 0.9 : Math.min(2.7, 1 + dist * 0.016);
    this.face = Math.sign(d) || this.face;
    this.x += Math.sign(d) * Math.min(dist, speed * dt);
    this.pose = 'walk';
  }

  /** Outside: behind the player while they walk; sit when they stop; then a nap, on a warm machine if one is near. */
  private follow(dt: number, o: { px: number; face: number; moving: boolean; warm?: Perch[] }): Perch {
    const gap = this.x - o.px;
    if (o.moving) {
      this.idle = 0; this.napAt = null; this.decided = false;
      // keep a cat's distance: only walk once the player is a few steps away
      if (Math.abs(gap) < 28 && Math.sign(gap) === -o.face) return { x: this.x, h: this.h, rest: 'sit' };
      return { x: o.px - o.face * 20, h: 0, rest: 'sit' };
    }
    this.idle += dt;
    if (this.napAt && Math.abs(this.napAt.x - o.px) < 140) return this.napAt;
    this.napAt = null;
    if (this.idle > 240 && !this.decided) {
      this.decided = true;
      const near = (o.warm ?? []).filter((w) => Math.abs(w.x - o.px) < 110).sort((a, b) => Math.abs(a.x - o.px) - Math.abs(b.x - o.px))[0];
      // sometimes: a cat has its own plans
      if (near && Math.random() < 0.6) { this.napAt = near; return near; }
    }
    // sit where it is, unless that is right on top of the player
    const x = Math.abs(gap) < 12 ? o.px - o.face * 18 : this.x;
    return { x, h: 0, rest: this.idle > 600 ? 'sleep' : 'sit' };
  }

  private hop(x: number, h: number) { this.face = x >= this.x ? 1 : -1; this.hopping = { x0: this.x, h0: this.h, x1: x, h1: h, f: 0 }; }

  /** Draw Pixel, standing (or lying) on its height above the ground. Call before the player, so Pixel stays behind. */
  draw(x: CanvasRenderingContext2D, sx: (wx: number) => number, y: (h: number) => number, t: number) { drawPixel(x, sx, y, t, { x:this.x, h:this.h, face:this.face, pose:this.pose, zs:this.zs }); }


}
