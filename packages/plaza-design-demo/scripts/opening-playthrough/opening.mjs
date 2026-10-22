// The scripted opening playthrough: segments, each ending in recorded beats (see lib.mjs `beat`).
// It plays a NEW GAME in the ordinary, locked-down game (`?play&probe`, no sudo) from the title to the jacked-in morning.
//   title -> glide -> train home -> metro platform -> turnstile -> Downtown (before) -> concierge -> flat (dawn) -> sleep
//   -> the morning you are deleted -> Moth's message and uplink.so -> jacking in to HOME-PC.
import { sleep } from './cdp.mjs';

/** Wait for a talk bubble, record the first full page as a beat, read the rest, and attach everything said to that beat. */
async function speak(d, name, note = '') {
  await d.until('bubble ' + name, p => !!p.bubble, 20000, 60);
  await d.until('bubble text', p => !p.bubble || p.bubble.full, 8000, 40);
  const rec = await d.beat(name, note);
  rec.said = await d.readBubbles();
  return rec;
}

/** Advance through a device's acknowledgment (CONCIERGE): beat on its first page, then E to continue. */
async function acknowledge(d, b, name) {
  await d.until('acknowledgment', p => !!p.acknowledging, 8000, 40);
  await sleep(500);
  const rec = await d.beat(name);
  await b.tap('e'); await sleep(200);
  return rec;
}

export const segments = [
  ['title', async (d, b, base) => {
    await b.goto(base + '?play&probe');
    await d.until('title', p => p.title, 20000, 100);
    await d.beat('title-sunrise', 'the sun is coming up out of the sea');
    await b.tap('Escape'); // any key skips the rise
    await d.until('title menu', p => p.menu, 8000, 80);
    await sleep(1200);
    await d.beat('title-menu', 'the settled shot with the main menu');
    await b.tap('Enter'); // NEW GAME
    await d.until('glide', p => p.glide, 8000, 80);
    await d.beat('glide-starts', 'the glide from the coast to Downtown and LINE 0 (not a still: the scene is the title)');
  }],
  ['train', async (d, b) => {
    await d.until('glide lands on the train', p => !p.title, 200000, 400);
    await speak(d, 'train-arrival', 'opening:home, car 3, 05:41');
    // an everyday device in the car (everyday home train/train) and a stranger (phase lines home train/suit)
    await d.use('train');
    const dom = await d.dom(); const rec = await d.beat('train-brake-popup', 'the car device popup: story chips', { chipsSeen: dom.chips });
    await d.chip('read the brake plate');
    await sleep(500); await d.beat('train-brake-plate', 'chip: read the brake plate');
    await d.closePopup(b);
    await d.use('read:suit');
    await speak(d, 'train-talk-suit', 'a stranger in the car (phase lines home train/suit)');
    // the home run is the Train mover's `home` path: the doors open at Downtown after ~30 s of scene time
    await d.until('doors open', p => p.targets.some(t => t.id === 'exit:out'), 90000, 200);
    await d.goTo('exit:out'); await sleep(200);
    await d.beat('train-doors-open', 'the car stands at DOWNTOWN with its doors open');
    await b.tap('e');
    await d.until('metro platform', p => p.here === 'metro', 15000, 80);
  }],
  ['metro', async (d, b) => {
    await speak(d, 'metro-arrival', 'metro platform, 05:48');
    await d.use('read:regular');
    await speak(d, 'metro-talk-regular', 'phase lines home metro/regular');
    await d.goTo('exit:downtown'); await sleep(250);
    await d.beat('metro-at-turnstile', 'standing at the exit gate');
    await b.tap('e');
    await d.until('gate verifying', p => !!p.gate, 4000, 20);
    await d.beat('turnstile-verifying', 'the checkpoint is verifying (the beat is timed in clock frames)');
    await d.until('gate ok', p => p.gate && p.gate.includes('ok'), 6000, 20);
    await d.beat('turnstile-ok', 'the checkpoint says ok; the street opens next');
    await d.until('downtown', p => p.here === 'downtown', 15000, 60);
  }],
  ['downtown', async (d, b) => {
    await speak(d, 'downtown-before-arrival', 'opening:street, Downtown before, 05:52');
    await d.use('use:umbrella');
    await speak(d, 'downtown-talk-umbrella', 'phase lines home downtown/umbrella');
    await d.use('exit:shop');
    await speak(d, 'downtown-shop-closed', 'phase exit rule home downtown/shop');
    await d.use('exit:moth');
    await speak(d, 'downtown-moth-door', 'phase exit rule home downtown/moth');
    await d.use('gate');
    await d.beat('downtown-gate-popup', 'the market gate popup: story chips', { chipsSeen: (await d.dom()).chips });
    await d.chip('push the gate'); await sleep(500);
    await d.beat('downtown-gate-chip', 'chip: push the gate (a caption over the gate)');
    await d.closePopup(b);
    await d.goTo('exit:capsule'); await sleep(250);
    await d.beat('downtown-at-tower', 'at the capsule tower door');
    await b.tap('e');
    await acknowledge(d, b, 'concierge-acknowledges');
    await d.until('flat', p => p.here === 'capsule', 15000, 80);
  }],
  ['flat', async (d, b) => {
    await speak(d, 'flat-arrival', 'opening:flat, the flat at dawn, 06:04');
    await d.use('door');
    await d.beat('flat-door-bed-first', 'phase exit rule flat capsule/door');
    await b.tap('e'); await sleep(400); // a say rule: bubble
    await d.readBubbles();
    await d.use('kettle');
    await d.beat('flat-kettle-popup', 'kettle popup', { chipsSeen: (await d.dom()).chips });
    await d.chip('boil'); await sleep(700);
    await d.beat('flat-kettle-boiled', 'chip: boil (device verb)');
    await d.closePopup(b);
    await d.use('blinds');
    await d.chip('open'); await sleep(700);
    await d.beat('flat-blinds-open', 'chip: open the blinds (state change sun)');
    await d.closePopup(b);
    // idle ping: standing still a while points at the bed
    await d.goTo('story:bed'); await sleep(300);
    for (let i = 0; i < 40 && (await d.dom()).pings > 0; i++) await sleep(250); // earlier pings fade first
    const t0 = Date.now(); let ping = false;
    while (Date.now() - t0 < 45000) { await sleep(250); if ((await d.dom()).pings > 0) { ping = true; break; } }
    await d.beat('flat-idle-ping', 'stood still at the bed until the attention ping showed: ' + ping, { pingShown: ping, pingAfterS: Math.round((Date.now() - t0) / 1000) });
    await d.beat('flat-bed-prompt', 'the bed prompt (an opening-only target)');
    await b.tap('e');
    await d.until('sleep card', p => !!p.card, 4000, 15);
    await d.until('card shows from-time', p => p.card && p.card.stage === 'card', 4000, 20);
    await d.beat('sleep-card-from', 'the card: from', { card: (await d.probe()).card });
    await d.until('card later', p => p.card && p.card.text !== '06:04' && p.phase === 'deleted', 4000, 15);
    await d.beat('sleep-card-to', 'the card: to');
    await d.until('fade done', p => !p.card, 6000, 40);
    await speak(d, 'morning-wakes', 'opening:slept; deleted; 09:40; the player says what is wrong');
  }],
  ['morning', async (d, b) => {
    // plain things fail: the door, the kettle (MORNING.tries), then Moth writes
    await d.use('lock');
    await d.chip('try the door'); await sleep(600);
    await d.beat('morning-door-denied', 'chip: try the door (fail 1)');
    await d.closePopup(b);
    await d.use('kettle');
    await d.chip('boil'); await sleep(600);
    await d.beat('morning-kettle-denied', 'chip: boil (fail 2)');
    await d.closePopup(b);
    await d.until('Moth writes', p => p.phase === 'uplinked' || !!p.bubble, 30000, 100);
    await d.until('bubble full', p => !p.bubble || p.bubble.full, 8000, 40);
    const rec = await d.beat('uplink-moth-message', 'Moth writes; uplink.so arrives');
    rec.said = await d.readBubbles();
    await d.until('uplinked', p => p.phase === 'uplinked', 8000, 80);
    await sleep(800);
    await d.beat('uplinked', 'opening:uplink; the clock is released');
  }],
  ['jack', async (d, b) => {
    await d.use('pc');
    await d.beat('uplinked-pc-popup', 'HOME-PC popup', { chipsSeen: (await d.dom()).chips });
    const chips = (await d.dom()).chips; const jack = chips.find(c => /jack/i.test(c));
    if (jack) { await d.chip('jack'); await sleep(1500); }
    await d.beat('jacked-in', 'jacked in to HOME-PC: opening:jacked, hacking is yours', { jackChip: jack ?? null });
    await sleep(1500);
    await d.beat('jacked-settled', 'a moment later');
  }],
];
