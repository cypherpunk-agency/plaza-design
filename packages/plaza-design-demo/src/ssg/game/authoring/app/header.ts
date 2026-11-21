/** The header row, breadcrumb, viewport options menu and environment controls. */
import { openMountPicker } from '../world-workspace-controls';
import { element, button, select, label } from '../controls';
import { compositionWorkspaces, workspaceDocuments } from '../workspace';
import { type ChunkDocument } from '../../art/core/composition';
import { readDocumentBundle } from '../document-bundle';
import type { EditorDocument, EnvironmentControl, ComposerConfig } from '../contracts';
import { message, type Composer } from './context';

export function headerArea(
  app: Composer,
): Pick<Composer, 'refreshHeader' | 'updateCrumb' | 'refreshOptions' | 'environmentControl'> {
  function refreshHeader() {
    const brand = element('div', 'brand');
    brand.append(element('strong', '', 'ACCESS DENIED'));
    brand.title = app.config.api ? 'Local composer' : 'Public editor';
    app.header.replaceChildren(
      brand,
      app.tools,
      app.documentSwitch,
      app.searchField,
      element('span', 'header-spacer'),
    );
    const actions = element('div', 'actions'),
      menu = element('details', 'menu'),
      menuItems = element('div', 'menu-items');
    menu.append(element('summary', '', 'More'), menuItems);
    const docs = app.documentsForView(),
      chooser = element('select', 'document-picker');
    chooser.setAttribute('aria-label', 'Composition or chunk');
    const unsaved = (doc: EditorDocument) =>
      app.model.dirty(doc.id) ||
      (doc.kind === 'composition' &&
        (app.config.sceneDocuments?.((doc.value as ChunkDocument).scene, docs) ?? []).some((id) =>
          app.model.dirty(id),
        ));
    const sequenceDoc = (doc: EditorDocument) =>
      doc.kind === 'composition' && !!(doc.value as ChunkDocument).sequence;
    const label = (doc: EditorDocument, text?: string) =>
      `${unsaved(doc) ? '● ' : ''}${text ?? app.sceneName((doc.value as ChunkDocument).scene)}`;
    const option = (doc: EditorDocument, text?: string) => {
      const node = element('option', '', label(doc, text));
      node.value = doc.id;
      return node;
    };
    const arrangements = compositionWorkspaces(docs);
    if (arrangements.length) {
      const group = element('optgroup');
      group.label = 'Compositions';
      for (const row of arrangements) {
        const option = element('option', '', row.name + ' · ' + row.chunks.length + ' chunks');
        option.value = '@composition/' + row.id;
        group.append(option);
      }
      chooser.append(group);
    }
    const places = docs.filter((d) => d.kind === 'composition' && !sequenceDoc(d)),
      listed = new Set<string>();
    // District → place → scene. A place with one scene is one entry; a place with several gets a heading and indented scenes.
    let tree: ReturnType<NonNullable<ComposerConfig['sceneTree']>> = [];
    try {
      tree = app.config.sceneTree?.(docs) ?? [];
    } catch {
      tree = [];
    }
    for (const district of tree) {
      const optgroup = element('optgroup');
      optgroup.label = district.label;
      for (const place of district.places) {
        const found = place.scenes.flatMap((scene) =>
          places.filter((d) => (d.value as ChunkDocument).scene === scene && !listed.has(d.id)),
        );
        if (!found.length) continue;
        found.forEach((d) => listed.add(d.id));
        if (found.length === 1) {
          optgroup.append(option(found[0], place.label));
          continue;
        }
        const heading = element('option', '', place.label);
        heading.disabled = true;
        heading.className = 'place-heading';
        optgroup.append(heading);
        for (const doc of found)
          optgroup.append(
            option(doc, '\u00a0\u00a0\u00a0' + app.sceneName((doc.value as ChunkDocument).scene)),
          );
      }
      if (optgroup.children.length) chooser.append(optgroup);
    }
    for (const [title, list] of [
      [tree.length ? 'Other chunks' : 'Chunks', places.filter((d) => !listed.has(d.id))],
      ['Sequences', docs.filter(sequenceDoc)],
    ] as const) {
      if (!list.length) continue;
      const optgroup = element('optgroup');
      optgroup.label = title;
      for (const doc of list) optgroup.append(option(doc));
      chooser.append(optgroup);
    }
    chooser.value = app.workspaceId ? '@composition/' + app.workspaceId : app.currentId;
    chooser.onchange = () =>
      chooser.value.startsWith('@composition/')
        ? app.openComposition(chooser.value.slice(13))
        : app.openDocument(chooser.value);
    app.sceneContext.replaceChildren();
    const newMenu = element('details', 'menu new-menu'),
      newItems = element('div', 'menu-items');
    newMenu.append(element('summary', '', '＋'), newItems);
    newMenu.querySelector('summary')!.title = 'New chunk or composition';
    app.documentSwitch.replaceChildren(chooser, newMenu);
    if (app.config.newScene) {
      const blocked = app.config.newScene.blocked(app.authoringApi()),
        add = button(
          '＋ Chunk',
          app.openNewScene,
          blocked || 'Create a new chunk source and open it here',
        );
      add.className = 'new-scene';
      add.textContent = 'New chunk…';
      add.disabled = !!blocked;
      newItems.append(add);
    }
    if (app.current()?.kind === 'composition') {
      const composition = button(
        'New composition…',
        () => openMountPicker(app.worldControls(), true),
        'Start a new composition',
      );
      newItems.append(composition);
      if (app.workspaceId) {
        const mount = button(
          'Mount chunk or group…',
          () => openMountPicker(app.worldControls()),
          'Mount a chunk or group into this composition',
        );
        newItems.append(mount);
      }
    }
    const dirty = element(
      'span',
      'state ' + (app.model.dirty() ? 'dirty' : 'muted'),
      app.model.dirty() ? 'Unsaved changes' : app.config.api ? 'Saved' : 'Published snapshot',
    );
    app.header.append(actions);
    const saveButton = button(
      app.saving ? 'Saving…' : app.config.api ? 'Save' : 'Download edits',
      () => void app.save(),
      app.config.api ? 'Save to source (Ctrl S)' : 'Download your edits as a file',
    );
    saveButton.className = 'primary';
    saveButton.disabled = app.saving || !app.model.dirty();
    const undo = button('Undo', () => app.run(() => app.model.undo()), app.model.undoLabel),
      redo = button('Redo', () => app.run(() => app.model.redo()));
    undo.disabled = !app.model.canUndo;
    redo.disabled = !app.model.canRedo;
    const discard = button(
      'Discard all changes',
      () => {
        app.stopPlay();
        app.playing = false;
        app.animating = false;
        app.editorSelection.chunk = undefined;
        app.editorSelection.timeline = undefined;
        app.editorSelection.instance = '';
        app.editorSelection.document = '';
        app.run(() => app.model.discard());
      },
      'Restore the last loaded or saved snapshot; Undo can recover discarded edits',
    );
    discard.disabled = app.saving || !app.model.dirty();
    undo.textContent = '↶';
    undo.className = 'icon';
    undo.setAttribute('aria-label', 'Undo');
    redo.textContent = '↷';
    redo.className = 'icon';
    redo.setAttribute('aria-label', 'Redo');
    actions.append(undo, redo, dirty, saveButton, menu);
    menuItems.append(
      discard,
      button(app.config.api ? 'Reload source' : 'Reset edits', () => void app.requestReload()),
      button(
        'Reset layout',
        app.resetLayout,
        'Restore default dock sizes and open docks in every workspace',
      ),
    );
    // A geometry gesture cannot change composition membership, checkpoints or toolbar choices.
    // Update its status/history without recompiling all of those unrelated menus on release.
    app.refreshHeaderActions = () => {
      const changed = app.model.dirty();
      dirty.textContent = changed
        ? 'Unsaved changes'
        : app.config.api
          ? 'Saved'
          : 'Published snapshot';
      dirty.className = 'state ' + (changed ? 'dirty' : 'muted');
      saveButton.disabled = discard.disabled = app.saving || !changed;
      undo.disabled = !app.model.canUndo;
      undo.title = app.model.undoLabel ?? '';
      redo.disabled = !app.model.canRedo;
      const ids = new Set([app.compositionDocument()?.id, app.viewCompositionDocument()?.id]);
      for (const row of chooser.options)
        if (ids.has(row.value)) {
          const doc = app.documentsForView().find((d) => d.id === row.value);
          if (doc)
            row.textContent =
              (unsaved(doc) ? '● ' : '') + (row.textContent ?? '').replace(/^● /, '');
        }
    };
    const bundleFile = element('input');
    bundleFile.type = 'file';
    bundleFile.accept = 'application/json,.json';
    bundleFile.hidden = true;
    bundleFile.setAttribute('aria-label', 'Import downloaded edits');
    bundleFile.onchange = async () => {
      const file = bundleFile.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB');
        const changes = readDocumentBundle(JSON.parse(await file.text()), app.documentsForView());
        app.run(() => {
          app.model.importDocuments(changes);
          app.syncSequence();
        });
      } catch (error) {
        app.notice(`Import failed: ${message(error)}`, true);
      } finally {
        bundleFile.value = '';
      }
    };
    menuItems.append(
      button('Import edits', () => bundleFile.click()),
      bundleFile,
    );
    if (
      app.config.newScene?.remove &&
      app.config.newScene.removable?.(app.authoringApi()).includes(app.viewScene())
    )
      menuItems.append(
        button('Remove chunk source', () => {
          const id = app.viewScene();
          app.openInspector({
            title: 'Remove source · ' + id,
            action: 'Remove source',
            build: (body) => {
              body.append(
                element(
                  'p',
                  '',
                  'This deletes the authored chunk source and its default checkpoints. To keep the source and remove it from this composition, use Unmount in the chunk inspector.',
                ),
              );
              return () => {
                app.config.newScene!.remove!(app.authoringApi(), id);
                app.refresh();
              };
            },
          });
        }),
      );
    menuItems.append(
      button('Export JSON', () => {
        const doc = app.activeDocument();
        if (!doc) return;
        const url = URL.createObjectURL(
          new Blob([JSON.stringify(doc.value, null, 2) + '\n'], { type: 'application/json' }),
        );
        const link = element('a');
        link.href = url;
        link.download = doc.id + '.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }),
    );
    const file = element('input');
    file.type = 'file';
    file.accept = '.json,application/json';
    file.hidden = true;
    file.onchange = async () => {
      const selectedFile = file.files?.[0];
      if (!selectedFile) return;
      try {
        if (selectedFile.size > 2 * 1024 * 1024) throw new Error('Import exceeds 2 MiB');
        const value: unknown = JSON.parse(await selectedFile.text());
        app.run(() => {
          const doc = app.activeDocument();
          if (!doc || doc.kind === 'world')
            throw new Error('Select an editable document to import');
          app.model.edit(doc.id, 'Import document', () => value);
          app.syncSequence();
        });
      } catch (e) {
        app.notice(`Import failed: ${message(e)}`, true);
      }
    };
    const importButton = button('Import JSON', () => file.click());
    importButton.disabled = app.activeDocument()?.kind === 'world';
    menuItems.append(importButton, file);
  }
  function updateCrumb() {
    const scene = app.sceneId(),
      node = app.editorSelection.instance && app.selected() ? app.editorSelection.instance : '';
    app.crumb.textContent = !scene
      ? ''
      : [app.sceneName(scene), app.editorSelection.chunk && !node ? 'chunk' : '', node]
          .filter(Boolean)
          .join(' › ');
  }
  function refreshOptions() {
    app.updateContextSummary = () => app.refreshMode();
    app.contextLine.textContent = '';
    app.options.replaceChildren();
    app.ambientLabel = undefined;
    app.syncWorldState();
    app.previewBar.replaceChildren();
    app.showSlot.replaceChildren();
    const bar = element('div', 'scene-toolbar'),
      composition = app.current()?.kind === 'composition';
    const cluster = (name: string) => {
      const node = element('div', 'toolbar-group');
      node.setAttribute('role', 'group');
      node.setAttribute('aria-label', name);
      bar.append(node);
      return node;
    };
    if (!app.playHost.hidden) {
      bar.append(
        element(
          'span',
          'toolbar-label',
          `Playing ${app.sceneName(app.worldState()?.checkpoint?.scene ?? app.sceneId())} · game camera · from ${app.playStartMode === 'preview' ? 'preview' : 'checkpoint start'}`,
        ),
      );
      app.options.append(bar);
      app.previewBar.hidden = true;
      app.refreshMode();
      return;
    }
    app.previewBar.hidden = !composition;
    updateCrumb();
    if (composition) {
      const add = button('＋ Add', () => app.openPicker(), 'Add artwork where you are looking (A)');
      add.disabled =
        !!app.workspaceId && !workspaceDocuments(app.workspaceId, app.documentsForView()).length;
      cluster('Assets').append(add);
      const animation = cluster('Ambient animation'),
        toggle = button(
          (app.sequence() ? app.playing : app.animating)
            ? '❚❚ Pause'
            : app.sequence()
              ? '▶ Play sequence'
              : '▶ Live motion',
          app.toggleAnimation,
          (app.sequence() ? app.playing : app.animating)
            ? 'Pause (Space)'
            : 'Run ambient animation, such as people, lights and signs, without playing the game (Space). Home returns to the first frame.',
        );
      toggle.setAttribute('aria-pressed', String(app.sequence() ? app.playing : app.animating));
      app.ambientLabel = element('span', 'time', `${app.time.toFixed(1)} s`);
      animation.append(
        toggle,
        app.ambientLabel,
        ...(!app.currentTimeline() ? [app.speedControl()] : []),
      );
      const choices = app.sequenceChoices();
      if (app.directionDocumentId && choices.length > 1) {
        const pick = select(
          choices.map((d) => ({
            value: d.id,
            label: 'Sequence · ' + (d.value as ChunkDocument).sequence!.id,
          })),
          app.directionDocumentId,
          (value) => {
            app.selectDirection(choices.find((d) => d.id === value));
            app.refresh();
            app.rememberView();
          },
        );
        pick.setAttribute('aria-label', 'Sequence');
        cluster('Sequence').append(pick);
      }
      const grid = select(
        [
          { value: '0', label: 'Snap off' },
          ...[1, 2, 4, 8, 16].map((n) => ({ value: String(n), label: `Snap ${n} px` })),
        ],
        String(app.snap),
        (value) => {
          app.snap = Number(value);
        },
      );
      grid.title = 'Dragging and arrow keys snap to this grid';
      grid.setAttribute('aria-label', 'Snap');
      cluster('Snap').append(grid);
    }
    const controls: EnvironmentControl[] = (
      app.config.environmentControls ?? [
        { key: 'cameraX', label: 'Camera X', kind: 'number', step: 10 },
        { key: 'zoom', label: 'Game camera zoom', kind: 'number', min: 0.1, max: 8, step: 0.1 },
      ]
    ).filter(
      (control) => !['cameraX', 'cameraH', 'zoom'].includes(control.key) || !app.currentTimeline(),
    );
    const quick = controls.filter((control) => control.quick);
    const states =
      composition && app.config.worldStates
        ? app.config.worldStates.list('', app.documentsForView())
        : [];
    if (states.length) {
      const chosen = app.worldState()?.id ?? '';
      const pick = select(
        [
          ...states.map((state) => ({ value: state.id, label: `Checkpoint · ${state.name}` })),
          { value: '', label: 'No checkpoint · play from here' },
        ],
        chosen,
        (value) => app.openCheckpoint(value),
      );
      pick.title =
        'The world this scene is shown in and Play starts from: time, weather and story flags. With a checkpoint chosen, time and weather edit it.';
      pick.setAttribute('aria-label', 'Checkpoint');
      cluster('Checkpoint').append(pick);
    }
    if (app.canPlay()) {
      const play = button(
        '▶ Play',
        app.playScene,
        app.worldState()
          ? 'Run the real game from this checkpoint (in Animate: from the playhead)'
          : 'Run the real game here from default world values; nothing is saved',
      );
      play.className = 'play-button';
      cluster('Play').append(play);
    }
    // With a checkpoint chosen, time and weather are part of it (saved, undoable); otherwise they only change the preview.
    if (composition && quick.length) {
      const stored = !!app.worldState();
      app.previewBar.classList.toggle('stored', stored);
      app.previewBar.title = stored
        ? 'Time and weather here edit the chosen checkpoint (saved, undoable).'
        : 'These settings change only the preview; nothing is saved.';
      app.previewBar.append(
        element('span', 'preview-label', stored ? 'Checkpoint world' : 'Preview only'),
      );
      for (const control of quick) app.previewBar.append(environmentControl(control, true));
    }
    // Named compositions always show their members. Standalone chunks may reveal connected neighbours.
    const joinedList =
      !app.workspaceId && composition && app.config.joinedScenes
        ? app.config.joinedScenes(app.sceneId(), app.documentsForView())
        : [];
    if (joinedList.length) {
      const on = app.environment.showJoined !== false,
        names = joinedList.map((j) => j.label).join(', ');
      const toggle = button(
        'Neighbours',
        () => {
          app.environment.showJoined = !on;
          refreshOptions();
          void app.draw();
        },
        `${on ? 'Hide' : 'Show'} ${names}, joined to this scene with no cut, beside it`,
      );
      toggle.className = 'toggle';
      toggle.setAttribute('aria-pressed', String(on));
      const frame = button(
        'Fit visible chunks',
        app.fitJoined,
        `Zoom out to show this scene with ${names}`,
      );
      frame.disabled = !on;
      app.showSlot.append(toggle, frame);
    }
    const comparable =
      composition && !app.workspaceId && !app.currentTimeline() ? app.compareOptions() : [];
    if (comparable.length) {
      const pick = select(
        [
          { value: '', label: 'Compare · off' },
          ...comparable.map((o) => ({ value: o.id, label: `Compare · ${o.label}` })),
        ],
        app.compareId,
        (value) => {
          app.compareId = value;
          void app.draw();
        },
      );
      pick.title =
        'Show another version beside this one, with the same camera, zoom, time and weather';
      pick.setAttribute('aria-label', 'Compare');
      app.showSlot.append(pick);
    }
    const motion = element('input');
    motion.type = 'checkbox';
    motion.checked = app.reduced;
    motion.onchange = () => {
      app.reduced = motion.checked;
      void app.draw();
    };
    app.showSlot.append(label('Reduced motion', motion));
    const pixels = element('input');
    pixels.type = 'checkbox';
    pixels.checked = app.pixelatedScaling;
    pixels.setAttribute('aria-label', 'Pixelated scaling');
    pixels.onchange = () => {
      app.pixelatedScaling = pixels.checked;
      app.refreshViewportTools();
      app.rememberView();
    };
    const pixelSetting = label('Pixelated scaling', pixels);
    pixelSetting.title =
      'Use crisp pixel edges when scaling the preview canvas. Off smooths canvas scaling; authored pixel shapes and the game remain unchanged.';
    app.showSlot.append(pixelSetting);
    for (const control of controls)
      if (!control.quick) app.showSlot.append(environmentControl(control, false));
    if (composition) {
      const checkpoint = app.worldState()?.checkpoint,
        summary = app.contextLine,
        prefix =
          'Checkpoint: ' +
          (checkpoint?.name ?? 'none') +
          (checkpoint
            ? ' (starts ' +
              (checkpoint.sequence
                ? checkpoint.sequence.id + ' at ' + checkpoint.sequence.time + ' s'
                : 'without a sequence') +
              ')'
            : '') +
          ' · Editing: ',
        editing = app.sequence() ? app.sequenceId : undefined,
        suffix = ' · View: ' + (app.cameraPreview ? 'game camera' : 'independent workspace');
      app.updateContextSummary = () => {
        app.refreshMode();
        summary.textContent =
          prefix +
          (editing ? editing + ' at ' + app.time.toFixed(3) + ' s' : 'base values') +
          suffix;
      };
      app.updateContextSummary();
      summary.title =
        'Selecting a sequence changes the editing context, not the checkpoint definition. Locate camera navigates the workspace explicitly.';
    }
    app.options.append(bar);
    app.refreshMode();
  }
  function environmentControl(control: EnvironmentControl, inToolbar: boolean): HTMLElement {
    const change = (value: string | number | boolean) => {
      app.environment[control.key] = value;
      // With a starting state chosen, time and weather are part of it: the change is a saved, undoable edit.
      const state = app.worldState(),
        stored =
          state &&
          app.config.worldStates!.edit(
            app.sceneId(),
            state.id,
            control.key,
            value,
            app.documentsForView(),
          );
      if (state && stored) {
        app.run(() =>
          app.model.edit(stored.id, `${state.name}: ${control.label}`, () => stored.value),
        );
        return;
      }
      void app.draw();
      if (inToolbar) refreshOptions();
    };
    if (control.choices && inToolbar) {
      const current = app.environment[control.key],
        known = control.choices.some((choice) => choice.value === current);
      const options = [
        ...(known
          ? []
          : [
              {
                value: String(current ?? ''),
                label:
                  typeof current === 'number'
                    ? `${String(Math.floor(current / 60)).padStart(2, '0')}:${String(current % 60).padStart(2, '0')}`
                    : String(current ?? ''),
              },
            ]),
        ...control.choices.map((choice) => ({ value: String(choice.value), label: choice.label })),
      ];
      const input = select(options, String(current ?? ''), (value) => {
        const choice = control.choices!.find((item) => String(item.value) === value);
        if (choice) change(choice.value);
      });
      input.setAttribute('aria-label', control.label);
      return input;
    }
    if (control.choices) {
      const row = element('div', 'segmented');
      row.setAttribute('role', 'group');
      row.setAttribute('aria-label', control.label);
      for (const choice of control.choices) {
        const pick = button(
          choice.label,
          () => change(choice.value),
          `${control.label}: ${choice.label}`,
        );
        pick.setAttribute('aria-pressed', String(app.environment[control.key] === choice.value));
        row.append(pick);
      }
      return inToolbar ? row : label(control.label, row);
    }
    if (control.kind === 'boolean' && inToolbar) {
      const toggle = button(
        control.label,
        () => change(!app.environment[control.key]),
        control.shortcut ? `${control.label} (${control.shortcut.toUpperCase()})` : undefined,
      );
      toggle.className = 'toggle';
      toggle.setAttribute('aria-pressed', String(!!app.environment[control.key]));
      return toggle;
    }
    if (control.kind === 'select') {
      const input = select(
        (control.options ?? []).map((v) => ({
          value: v,
          label: inToolbar ? `${control.label} · ${v}` : v,
        })),
        String(app.environment[control.key] ?? ''),
        change,
      );
      input.setAttribute('aria-label', control.label);
      return inToolbar ? input : label(control.label, input);
    }
    const input = element('input');
    input.type =
      control.kind === 'boolean' ? 'checkbox' : control.kind === 'text' ? 'text' : 'number';
    input.checked = !!app.environment[control.key];
    input.value = String(app.environment[control.key] ?? (control.kind === 'text' ? '' : 0));
    if (control.min !== undefined) input.min = String(control.min);
    if (control.max !== undefined) input.max = String(control.max);
    if (control.step !== undefined) input.step = String(control.step);
    input.onchange = () => {
      const value =
        control.kind === 'boolean'
          ? input.checked
          : control.kind === 'text'
            ? input.value
            : Number(input.value);
      if (typeof value === 'number' && !Number.isFinite(value)) return;
      change(value);
    };
    const row = label(control.label, input);
    if (control.kind === 'text') row.classList.add('wide');
    return row;
  }
  return { refreshHeader, updateCrumb, refreshOptions, environmentControl };
}
