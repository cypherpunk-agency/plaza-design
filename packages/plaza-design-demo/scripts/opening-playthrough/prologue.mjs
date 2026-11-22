// The prologue smoke run: segments that play a NEW GAME in the ordinary game (`?play&probe`, no sudo) from the title to the
// first morning, asserting the scene, story phase and goal at each beat and recording it (see lib.mjs `beat`).
//   title -> skip the glide -> Harbor Station -> Shed 3 -> the night shift (parcel, Mara, case, trolley) -> checkout and wage
//   statement -> back to the platform -> the morning service to Downtown Metro -> turnstile -> west stairs -> Downtown
//   -> capsule 7B (concierge) -> bed -> the sleep card -> the morning you are deleted.
// It stops when the morning is established (story phase `deleted`): what follows is the older campaign, not the prologue.
import { sleep } from './cdp.mjs';

const goal = (text) => (p) => (p.goal ?? '').startsWith(text);

/** Stand on a target, press E, read every page of what it says and record a beat with the lines attached. */
async function step(d, id, name, note = '') {
  await d.use(id);
  const said = await d.readBubbles();
  await sleep(250);
  return d.beat(name, note, { said });
}

/** Use a target that opens a popup, then pick one of its chips and record what it says. */
async function chipStep(d, b, id, chip, name, note = '') {
  await d.use(id);
  await d.until('popup for ' + id, (p) => p.popup, 4000, 60);
  const chips = (await d.dom()).chips;
  await d.chip(chip);
  await sleep(300);
  const said = await d.readBubbles();
  await d.closePopup(b);
  return d.beat(name, note, { said, chipsSeen: chips });
}

/** Stand on a level target (stairs, turnstile, vehicle door) once it is offered, and press its key. */
async function levelStep(d, b, key, id, timeout = 30000) {
  await d.until(id + ' offered', (p) => p.prompt?.id === id, timeout, 100);
  await b.tap(key, 100);
}

export const segments = [
  [
    'title',
    async (d, b, base) => {
      await b.goto(base + '?play&probe');
      await d.until('title', (p) => p.title, 20000, 100);
      await b.tap('Escape'); // a key during the sunrise reveals the menu
      await d.until('title menu', (p) => p.menu, 8000, 80);
      await sleep(1200);
      await d.beat('title-menu', 'the settled shot with the main menu');
      await b.tap('Enter'); // NEW GAME (the first item on a fresh profile)
      await d.until('glide', (p) => p.glide, 8000, 80);
      await sleep(1000);
      await b.tap('Escape'); // skips the glide and lands at the playable Harbor start
      await d.until('landed', (p) => !p.title, 20000, 100);
      const p = await d.expect(
        'Harbor Station in the prologue',
        (p) => p.here === 'harbor-station' && p.phase === 'prologue',
      );
      void p;
      const rec = await d.beat('harbor-arrival', 'landed at Harbor Station, dusk');
      rec.said = await d.readBubbles();
    },
  ],
  [
    'harbor',
    async (d, b) => {
      await d.expect('the first goal', goal('Walk east to the supervisor'));
      await d.walkTo(1210);
      await levelStep(d, b, 'ArrowDown', 'down:harbor-station/via-stair');
      await sleep(1500);
      await d.walkUntil(
        'ArrowRight',
        'the checkout turnstile',
        (p) => p.prompt?.id === 'barrier:harbor-checkout/turnstile',
      );
      await d.beat(
        'checkout-turnstile-in',
        'down the stairs, east along the quay, at the staff gate',
      );
      await b.tap('e');
      await sleep(1200);
      await d.walkUntil(
        'ArrowRight',
        'Shed 3',
        (p) => p.here === 'harbor-shed' && p.targets.some((t) => t.id === 'use:boss'),
      );
      await d.goTo('use:boss');
      await d.beat('shed-arrival', 'Shed 3, the supervisor in his booth');
    },
  ],
  [
    'shift',
    async (d, b) => {
      await step(d, 'use:boss', 'shift-briefing', 'the supervisor hands over the work tag');
      await d.expect('the parcel goal', goal('Pick up the blue parcel'));
      await step(d, 'use:parcel', 'shift-parcel', 'dispatch: the blue parcel');
      await d.expect('the Mara goal', goal('Bring the blue parcel west to Mara'));
      await d.find('ArrowLeft', 'use:mara');
      await chipStep(
        d,
        b,
        'use:mara',
        'give Mara the blue parcel',
        'shift-mara',
        'receiving: the handover chip',
      );
      await d.expect('the case goal', goal('Take the empty case'));
      await step(d, 'use:case', 'shift-case', 'the empty case from the receiving counter');
      await d.find('ArrowRight', 'use:rack');
      await chipStep(
        d,
        b,
        'use:rack',
        'put the empty case in the rack',
        'shift-rack',
        'case returns in the shed',
      );
      await d.expect('report back', goal('Report back to the supervisor'));
      await step(d, 'use:boss', 'shift-last-job', 'the supervisor: trolley T4');
      await d.expect('the trolley goal', goal('Move trolley T4'));
      await d.find('ArrowLeft', 'use:trolley');
      await step(d, 'use:trolley', 'shift-trolley-clamped', 'the trolley will not roll');
      await d.expect('the clamp goal', goal('Release the red wheel clamp'));
      await step(d, 'use:clamp', 'shift-clamp', 'the clamp opens');
      await step(d, 'use:trolley', 'shift-trolley-parked', 'the trolley rolls into LOADING BAY 2');
      await d.expect('the checkout goal', goal('Return your work tag at CHECKOUT'));
    },
  ],
  [
    'checkout',
    async (d, b) => {
      await d.find('ArrowLeft', 'use:checkout');
      await chipStep(
        d,
        b,
        'use:checkout',
        'return work tag and check out',
        'checkout',
        'tag returned, shift closed, tokens credited',
      );
      await step(d, 'use:statement', 'wage-statement', 'net pay; the morning train is next');
      await d.expect('shift complete', goal('SHIFT COMPLETE'));
      await d.find('ArrowLeft', 'barrier:harbor-checkout/turnstile');
      await b.tap('e');
      await sleep(1200);
      await d.walkUntil(
        'ArrowLeft',
        'the stairs up to the platform',
        (p) =>
          p.here === 'harbor-quay' && p.targets.some((t) => t.id === 'up:harbor-station/via-stair'),
      );
      await d.goTo('up:harbor-station/via-stair');
      await levelStep(d, b, 'ArrowUp', 'up:harbor-station/via-stair');
      await sleep(1500);
      await d.walkUntil(
        'ArrowLeft',
        'the platform end',
        (p) => p.here === 'harbor-station' && p.player.y === 0 && p.player.x < 400,
        40000,
      );
      await d.walkTo(84);
      await d.until(
        'the morning service at the platform',
        (p) => p.prompt?.id === 'vehicle:harbor-station/service',
        60000,
        200,
      );
      await d.beat('platform-boarding', 'the morning service stands at Harbor Station');
    },
  ],
  [
    'commute',
    async (d, b) => {
      await b.tap('e');
      await d.until('the ride leaves Harbor', (p) => p.here !== 'harbor-station', 30000, 200);
      const ride = await d.beat('ride-tunnel', 'on board, in the tunnel zones');
      ride.said = await d.readBubbles();
      await d.until(
        'the doors open at Downtown Metro',
        (p) =>
          p.here === 'metro' &&
          p.prompt?.id === 'vehicle:harbor-station/service' &&
          p.prompt.label.includes('STEP OFF'),
        120000,
        200,
      );
      await d.beat('ride-downtown-metro', 'the service stands at Downtown Metro');
      await b.tap('e');
      await sleep(800);
      await d.expect('home phase at the metro', (p) => p.here === 'metro' && p.phase === 'home');
      const rec = await d.beat('metro-arrival', 'off the train, underground');
      rec.said = await d.readBubbles();
      await d.find('ArrowLeft', 'barrier:metro/gate-in');
      await b.tap('e');
      // west along the platform to the west stairs, up them, and on west onto the street
      const stairs = await d.walkUntil(
        'ArrowLeft',
        'the west stairs',
        (p) => p.targets.some((t) => t.kind === 'level' && t.id.startsWith('up:')),
        40000,
      );
      const up = stairs.targets.find((t) => t.kind === 'level' && t.id.startsWith('up:'));
      await d.goTo(up.id);
      await levelStep(d, b, 'ArrowUp', up.id, 5000);
      await sleep(2000);
      await d.walkUntil('ArrowLeft', 'Downtown', (p) => p.here === 'downtown', 40000);
      await d.until('Downtown arrival line', (q) => !!q.bubble, 8000, 80).catch(() => null);
      const arrival = await d.beat('downtown-arrival', 'up the west stairs to the street, morning');
      arrival.said = await d.readBubbles();
      await d.expect('the home goal', (p2) => p2.phase === 'home' && goal('go home')(p2));
    },
  ],
  [
    'home',
    async (d, b) => {
      await d.use('exit:capsule');
      await d.until('the concierge', (p) => !!p.acknowledging, 15000, 80);
      await sleep(400);
      await d.beat('concierge', 'the capsule tower lets you in');
      await b.tap('e');
      await d.until('capsule 7B', (p) => p.here === 'capsule', 20000, 100);
      await d.until('home lines', (p) => !!p.bubble, 8000, 80);
      const rec = await d.beat('capsule-arrival', 'home: kettle, blinds, bed');
      rec.said = await d.readBubbles();
      await d.expect('the flat phase', (p) => p.phase === 'flat' && goal('get some sleep')(p));
      await d.use('story:bed');
      await d.until('the sleep card', (p) => p.card?.stage === 'card', 8000, 60);
      await d.beat('sleep-card', 'the rest card over the capsule');
      await d.until('morning', (p) => p.phase === 'deleted' && !p.card, 20000, 100);
      await d.until('morning lines', (p) => !!p.bubble, 8000, 80);
      const morning = await d.beat(
        'morning-deleted',
        'the morning is established; the prologue ends here',
      );
      morning.said = await d.readBubbles();
    },
  ],
];
