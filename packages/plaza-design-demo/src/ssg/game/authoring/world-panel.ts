import { runFrame } from './frame-loop';
import type { CityModel } from '../world/city';
/** City geography and travel editing around the existing native map preview. */
import {
  createWorldMapPreview,
  type WorldPlaceInspection,
  type WorldMapPreviewState,
} from './world-map';
import type { WorldDocument } from '../world/document';
import type { SceneId } from '../scenes';
import { createFrame } from './frame';
import { mountCityAuthoring, type CityAuthoringSession } from './city-authoring';
import { mountDistrictAuthoring } from './district-authoring';
import type { WorkbenchContext, WorkbenchHandle } from './contracts';
import { liveSources } from './validation-snapshot';
import { validatePendingCity } from './pending-city';
import { cityList } from './world-city-model';
import type { CitySource } from '../world/city';

const MODES = ['Place', 'Districts', 'Travel', 'Map layout & discovery'] as const;
export interface WorldPanelSession {
  scene?: string;
  mode?: (typeof MODES)[number];
  editing?: CityAuthoringSession;
  place?: WorldPlaceInspection['place']['id'];
  preview?: Partial<WorldMapPreviewState>;
  /** City list filter in the left column. */
  filter?: string;
}
export function mountWorldPanel(
  host: HTMLElement,
  document: WorldDocument,
  openScene: (id: string) => void,
  context: WorkbenchContext,
  session: WorldPanelSession = {},
  scene?: string,
  world?: CityModel,
): () => void {
  if (!context.authoring) throw Error('City map requires the editor source API');
  // The editor's current scene decides which place is inspected; the picker remains for browsing.
  const home = scene
    ? document.map.places.find((p) => (p.scenes as readonly string[]).includes(scene))
    : undefined;
  if (home && session.scene !== scene) session.place = home.id;
  session.scene = scene;
  if (!document.map.places.some((p) => p.id === session.place))
    session.place = home?.id ?? document.map.places[0]?.id;
  const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const result = window.document.createElement(tag);
    if (text !== undefined) result.textContent = text;
    return result;
  };
  const canvas = node('canvas');
  canvas.width = 640;
  canvas.height = 360;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', 'City map');
  const details = node('div'),
    controls = node('div'),
    authoring = node('section'),
    mode = node('div'),
    place = node('select'),
    cityNav = node('div'),
    pending = () => {
      const sources = liveSources(context);
      return validatePendingCity(sources.get('city-source'), sources);
    };
  let editor: WorkbenchHandle | undefined;
  session.editing ??= { expanded: new Map() };
  session.mode ??= 'Place';
  function editSelection() {
    editor?.();
    editor = undefined;
    authoring.replaceChildren();
    editor =
      session.mode === 'Districts'
        ? mountDistrictAuthoring(authoring, context, session.editing!.expanded)
        : mountCityAuthoring(authoring, context, {
            section:
              session.mode === 'Place' ? 'place' : session.mode === 'Travel' ? 'travel' : 'map',
            place: session.place,
            session: session.editing,
            openSection: (section) =>
              setMode(
                section === 'travel'
                  ? 'Travel'
                  : section === 'map'
                    ? 'Map layout & discovery'
                    : 'Place',
              ),
          });
  }
  mode.className = 'world-tabs';
  mode.setAttribute('role', 'tablist');
  mode.setAttribute('aria-label', 'Map editing section');
  const setMode = (value: (typeof MODES)[number]) => {
    session.mode = value;
    for (const b of mode.children) b.setAttribute('aria-selected', String(b.textContent === value));
    editSelection();
    renderCity();
  };
  for (const title of MODES) {
    const tab = node('button', title);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(title === session.mode));
    tab.onclick = () => setMode(title);
    mode.append(tab);
  }
  const openLayout = node('button');
  openLayout.type = 'button';
  openLayout.className = 'world-open-layout';
  const inspect = (selection: WorldPlaceInspection) => {
    session.place = selection.place.id;
    place.value = selection.place.id;
    const city = pending(),
      colour = selection.place.district
        ? city.DISTRICT_MAP[selection.place.district]?.col
        : undefined,
      district = node('p', selection.district?.name ?? 'Transit'),
      swatch = node('span');
    swatch.className = 'world-swatch';
    if (colour) swatch.style.background = 'rgb(' + colour + ')';
    district.prepend(swatch);
    district.className = 'world-place-district';
    details.replaceChildren(node('strong', selection.place.name), district);
    if (selection.blocked) details.append(node('p', `Travel rule: ${selection.blocked}`));
    // Other scenes of a multi-scene place; the entrance opens from the map's corner button.
    const entrance = city.PLACES.find((p) => p.id === selection.place.id)?.entrance;
    for (const scene of selection.scenes)
      if (scene.id !== entrance) {
        const button = node('button', `Open ${scene.id}`);
        button.type = 'button';
        button.onclick = () => preview.openScene(scene.id);
        details.append(button);
      }
    openLayout.textContent = `Open ${selection.place.name} in Layout →`;
    openLayout.hidden = !entrance;
    openLayout.onclick = () => entrance && preview.openScene(entrance);
    if (session.mode === 'Place' || !editor) editSelection();
    renderCity();
  };
  const preview = createWorldMapPreview({
    world,
    canvas,
    document,
    preview: session.preview,
    onSelection: inspect,
    onOpenScene: (scene) => openScene(scene),
    drawBackground(context, width, height) {
      context.fillStyle = '#030201';
      context.fillRect(0, 0, width, height);
    },
  });
  const label = (text: string, input: HTMLElement) => {
    const wrap = node('label', text + ' ');
    wrap.append(input);
    controls.append(wrap);
  };
  place.setAttribute('aria-label', 'Inspect place');
  for (const entry of document.map.places) {
    const option = node('option', entry.name);
    option.value = entry.id;
    place.append(option);
  }
  if (session.place) place.value = session.place;
  place.onchange = () => {
    preview.selectPlace(place.value as WorldDocument['map']['places'][number]['id']);
    preview.draw();
  };
  const placeLabel = node('label', 'Place ');
  placeLabel.append(place);
  const layer = node('select');
  layer.setAttribute('aria-label', 'Map layer');
  for (const id of ['street', 'metro', 'above', 'below'] as const) {
    const option = node('option', id);
    option.value = id;
    layer.append(option);
  }
  layer.value = preview.getPreview().layer;
  layer.onchange = () =>
    preview.setPreview({ layer: layer.value as ReturnType<typeof preview.getPreview>['layer'] });
  label('Layer', layer);
  for (const [key, title] of [
    ['harborOpen', 'Preview harbor open'],
    ['reduced', 'Map reduced motion'],
    ['flat', 'Flat map'],
  ] as const) {
    const input = node('input');
    input.type = 'checkbox';
    input.checked = preview.getPreview()[key];
    input.onchange = () => preview.setPreview({ [key]: input.checked });
    label(title, input);
  }
  const time = node('input');
  time.type = 'number';
  time.min = '0';
  time.step = '1';
  time.value = String(preview.getPreview().time);
  time.style.width = '65px';
  time.onchange = () => {
    const value = Number(time.value);
    if (Number.isFinite(value) && value >= 0) preview.setPreview({ time: value });
  };
  label('Map frame', time);
  const previewSettings = node('details');
  previewSettings.append(node('summary', 'Map display'), controls);
  const stage = node('div');
  stage.className = 'world-stage';
  stage.append(canvas, previewBar(), addPlace(), openLayout);
  const layout = createFrame(
    host,
    { nav: [cityNav], stage: [stage], inspector: [mode, details, authoring, previewSettings] },
    'City map',
  );
  placeLabel.hidden = true;
  /** Dashed preview bar: what the map shows, never what the game saves. */
  function previewBar() {
    const bar = node('div'),
      badge = node('span', 'Preview only'),
      discovery = node('select');
    bar.className = 'world-preview-bar';
    bar.title = 'These choices change only what this map shows. Saves and source are untouched.';
    badge.className = 'world-preview-badge';
    discovery.setAttribute('aria-label', 'Preview discovery');
    for (const [value, text] of [
      ['all', 'all places'],
      ['start', 'start of game'],
    ]) {
      const option = node('option', text);
      option.value = value;
      discovery.append(option);
    }
    discovery.value = preview.getPreview().seenSceneIds === 'all' ? 'all' : 'start';
    discovery.onchange = () =>
      preview.setPreview({
        seenSceneIds: discovery.value === 'all' ? 'all' : ['downtown' as SceneId],
      });
    const discoveryLabel = node('label', 'Discovery ');
    discoveryLabel.append(discovery);
    bar.append(badge, discoveryLabel);
    // Preview conditions use the same exit flags/keys, never a separate gate-open override.
    const keys = [
        ...new Set(
          document.scenes.flatMap((s) => s.exits.flatMap((e) => (e.needs ? [e.needs.key] : []))),
        ),
      ],
      flags = [
        ...new Set(
          document.scenes.flatMap((s) => s.exits.flatMap((e) => (e.requires ? [e.requires] : []))),
        ),
      ];
    const chips = (
      title: string,
      ids: string[],
      held: (id: string) => boolean,
      toggle: (id: string, on: boolean) => void,
    ) => {
      if (!ids.length) return;
      const group = node('span');
      group.className = 'world-preview-chips';
      group.append(node('span', title));
      for (const id of ids) {
        const chip = node('button', id);
        chip.type = 'button';
        chip.setAttribute('aria-pressed', String(held(id)));
        chip.setAttribute('aria-label', 'Preview ' + title.toLowerCase() + ' ' + id);
        chip.onclick = () => {
          const on = chip.getAttribute('aria-pressed') !== 'true';
          toggle(id, on);
          chip.setAttribute('aria-pressed', String(on));
        };
        group.append(chip);
      }
      bar.append(group);
    };
    chips(
      'Keys held',
      keys,
      (k) => preview.getPreview().keyring.includes(k),
      (k, on) => {
        const held = preview.getPreview().keyring;
        preview.setPreview({ keyring: on ? [...held, k] : held.filter((v) => v !== k) });
      },
    );
    chips(
      'Flags',
      flags,
      (f) => !!preview.getPreview().flags[f],
      (f, on) => preview.setPreview({ flags: { ...preview.getPreview().flags, [f]: on } }),
    );
    return bar;
  }
  /** ＋ Place: split one scene out of a multi-scene place (or adopt an unplaced scene) as a new place. */
  function addPlace() {
    const wrap = node('div'),
      toggle = node('button', '＋ Place'),
      form = node('form'),
      id = node('input'),
      scene = node('select'),
      add = node('button', 'Add place'),
      error = node('p');
    wrap.className = 'world-add';
    toggle.type = 'button';
    form.hidden = true;
    id.placeholder = 'place id';
    id.setAttribute('aria-label', 'New place ID');
    scene.setAttribute('aria-label', 'New place scene');
    error.setAttribute('role', 'alert');
    toggle.onclick = () => {
      form.hidden = !form.hidden;
      if (form.hidden) return;
      const city = pending(),
        owned = new Map(city.PLACES.flatMap((p) => p.scenes.map((s) => [s as string, p] as const)));
      scene.replaceChildren();
      for (const s of new Set([...document.scenes.map((s) => s.id as string), ...owned.keys()])) {
        const owner = owned.get(s);
        if (owner && owner.scenes.length === 1) continue;
        const option = node('option', owner ? s + ' (from ' + owner.name + ')' : s);
        option.value = s;
        scene.append(option);
      }
      add.disabled = !scene.options.length;
      error.textContent = scene.options.length ? '' : 'Every scene is the only scene of its place.';
      id.focus();
    };
    form.onsubmit = (event) => {
      event.preventDefault();
      try {
        const sources = liveSources(context),
          d = validatePendingCity(sources.get('city-source'), sources),
          newId = id.value.trim(),
          s = scene.value as CitySource['PLACES'][number]['entrance'];
        if (!/^[a-z][a-z0-9-]*$/.test(newId))
          throw Error('Use lower-case letters, digits and dashes');
        if (d.PLACES.some((p) => p.id === newId)) throw Error('Place already exists');
        const owner = d.PLACES.find((p) => p.scenes.includes(s));
        if (owner) {
          owner.scenes = owner.scenes.filter((v) => v !== s);
          if (owner.entrance === s) {
            owner.entrance = owner.scenes[0];
            delete owner.at;
          }
        }
        d.PLACES.push({
          id: newId,
          name: newId.toUpperCase(),
          district: null,
          entrance: s,
          scenes: [s],
        });
        session.place = newId;
        session.mode = 'Place';
        context.authoring!.edit('city-source', 'Add place ' + newId, d);
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
      }
    };
    add.type = 'submit';
    form.append(id, scene, add, error);
    wrap.append(toggle, form);
    return wrap;
  }
  /** Left column: places with their district colour, districts with climate, travel stops. */
  function renderCity() {
    let list;
    try {
      list = cityList(pending(), session.filter ?? '');
    } catch (e) {
      cityNav.replaceChildren(node('p', String(e)));
      return;
    }
    const filter = node('input');
    filter.type = 'search';
    filter.placeholder = 'Filter places, districts, travel';
    filter.setAttribute('aria-label', 'Filter city list');
    filter.value = session.filter ?? '';
    filter.oninput = () => {
      session.filter = filter.value;
      const at = filter.selectionStart;
      renderCity();
      const next = cityNav.querySelector('input');
      next?.focus();
      if (at !== null) next?.setSelectionRange(at, at);
    };
    cityNav.className = 'world-city';
    cityNav.replaceChildren(filter);
    const group = (title: string, count: number) => {
      const h = node('h3', title + ' · ' + count),
        ul = node('ul');
      cityNav.append(h, ul);
      return ul;
    };
    const row = (
      ul: HTMLElement,
      name: string,
      detail: string,
      colour: string | undefined,
      pressed: boolean,
      open: () => void,
    ) => {
      const li = node('li'),
        button = node('button'),
        swatch = node('span');
      button.type = 'button';
      swatch.className = 'world-swatch';
      if (colour) swatch.style.background = 'rgb(' + colour + ')';
      else swatch.classList.add('none');
      const label = node('span', name),
        info = node('small', detail);
      button.append(swatch, label, info);
      button.setAttribute('aria-pressed', String(pressed));
      button.onclick = open;
      li.append(button);
      ul.append(li);
    };
    const places = group('Places', list.places.length);
    for (const p of list.places)
      row(
        places,
        p.name,
        p.districtName,
        p.colour,
        session.mode === 'Place' && p.id === session.place,
        () => {
          if (session.mode !== 'Place') setMode('Place');
          preview.selectPlace(p.id as WorldDocument['map']['places'][number]['id']);
        },
      );
    const districts = group('Districts', list.districts.length);
    for (const x of list.districts)
      row(
        districts,
        x.name,
        x.climate,
        x.colour,
        session.mode === 'Districts' && !!session.editing?.expanded?.get('district:' + x.id),
        () => {
          session.editing!.expanded ??= new Map();
          for (const k of session.editing!.expanded.keys())
            if (k.startsWith('district:')) session.editing!.expanded.delete(k);
          session.editing!.expanded.set('district:' + x.id, true);
          setMode('Districts');
          authoring.querySelector('details[open]')?.scrollIntoView({ block: 'start' });
        },
      );
    const travel = group('Travel', list.travel.length);
    for (const t of list.travel)
      row(travel, t.label, t.detail, undefined, false, () => {
        const open = (session.editing!.expanded ??= new Map());
        if (t.kind === 'metro') {
          open.set('Station routes', true);
          open.set('Station routing ' + t.id, true);
        } else if (t.kind === 'taxi') open.set('Taxi · ' + t.id, true);
        else open.set('Travel', true);
        setMode('Travel');
      });
  }
  /** The map fills the stage at 16:9 and is backed at the device pixel ratio, so it stays sharp at any size. */
  const fit = () => {
    const box = layout.stage,
      style = getComputedStyle(box),
      room = (side: 'Left' | 'Right' | 'Top' | 'Bottom') =>
        parseFloat(style[`padding${side}`]) || 0;
    const width = Math.max(320, box.clientWidth - room('Left') - room('Right')),
      height = Math.max(
        180,
        Math.min((width * 9) / 16, box.clientHeight - room('Top') - room('Bottom') - 4),
      );
    const w = Math.round(Math.min(width, (height * 16) / 9)),
      h = Math.round((w * 9) / 16),
      ratio = window.devicePixelRatio || 1;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = Math.round(w * ratio);
    canvas.height = Math.round(h * ratio);
    preview.setViewport(w, h, ratio);
  };
  const resize = new ResizeObserver(fit);
  resize.observe(layout.stage);
  const coordinates = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  canvas.onpointermove = (event) => {
    const p = coordinates(event);
    canvas.style.cursor = preview.pointer(p.x, p.y, false) ? 'pointer' : 'default';
  };
  canvas.onpointerdown = (event) => {
    if (event.button !== 0) return;
    canvas.focus();
    const p = coordinates(event);
    preview.pointer(p.x, p.y, true);
  };
  canvas.onkeydown = (event) => {
    if (
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(
        event.key,
      ) &&
      event.key !== 'Tab'
    ) {
      event.preventDefault();
      preview.key(event.key);
    }
  };
  preview.selectPlace(session.place ?? document.map.places[0].id);
  let active = true,
    frame = 0;
  const draw = () => {
    if (!active) return;
    runFrame(() => preview.draw());
    frame = requestAnimationFrame(draw);
  };
  draw();
  return () => {
    editor?.();
    editor = undefined;
    resize.disconnect();
    session.preview = preview.getPreview();
    active = false;
    cancelAnimationFrame(frame);
    canvas.onpointermove = canvas.onpointerdown = canvas.onkeydown = null;
  };
}
