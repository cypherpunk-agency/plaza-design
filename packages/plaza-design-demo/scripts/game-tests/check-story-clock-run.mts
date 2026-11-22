import assert from 'node:assert/strict';
import { CityClock, CLOCK_RATE, stamp, until, weekday } from '../../src/ssg/game/world/clock';
const clock = new CityClock(),
  save = { day: 1, min: 1140, seed: 3 };
clock.bind(save);
clock.pin(1140);
clock.run(3, 370);
assert.equal(clock.min, 1140, 'starting a run never jumps the minute');
clock.tick(20 / CLOCK_RATE);
assert.equal(clock.min, 1200);
clock.run(3, 370);
clock.tick(100 / CLOCK_RATE);
assert.equal(clock.day, 2);
assert.equal(clock.min, 60);
clock.run(3, 370);
clock.tick(1000 / CLOCK_RATE);
assert.equal(clock.min, 370);
assert.equal(clock.day, 2);
clock.tick(1000);
assert.equal(clock.min, 370, 'hold at dawn');
clock.withSnapshot({ day: 5, min: 100, seed: 1 }, () => {
  clock.run(1);
  clock.tick(1);
});
assert.equal(clock.min, 370);
clock.tick(1);
assert.equal(clock.min, 370, 'preview restores pacing and cap');
const reloaded = new CityClock();
reloaded.bind({ ...save });
reloaded.run(3, 370);
reloaded.tick(1000);
assert.equal(reloaded.day, 2);
assert.equal(reloaded.min, 370, 'reload at the cap does not start another day');
clock.run();
clock.tick(1);
assert(clock.min > 370, 'normal pacing resumes');
assert.equal(clock.pace, 1);
// The HUD shows the weekday: day 1 is a Monday, and the week wraps.
assert.equal(weekday(1), 'MON');
assert.equal(weekday(7), 'SUN');
assert.equal(weekday(8), 'MON');
assert.equal(stamp(3, 21 * 60 + 40), 'WED 21:40');
// A sleep that runs on to 08:00 from whenever you went to bed (the waitUntil cue).
assert.equal(until(23 * 60 + 30, 8 * 60), 510);
assert.equal(until(2 * 60, 8 * 60), 360);
console.log('Authored running clock: no jump, midnight, cap, preview, reload and weekday PASS');
