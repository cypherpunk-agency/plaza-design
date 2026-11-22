/** One chunk's scene and gameplay sources, validated and edited together through ComposerModel. */
import { liveSources } from './validation-snapshot';
import { sourceGameplay } from '../engine/gameplay/shared-state';
import { pendingScene } from './pending-scene';
import { pendingNetworkContext } from './pending-network';
import { deviceSourceIdentity } from './device-document-ids';
import { gameplayScene } from './gameplay-scenes';
import type { GameplayDefinition } from '../engine/gameplay/types';
import type { SceneDocument } from '../engine/gameplay/scene-document';
import type { WorkbenchContext } from './contracts';

export type SceneLogicSource = ReturnType<typeof sceneLogicSource>;
/**
 * Shared by Interactions & story and the rule view so both read, validate and write the same
 * documents. `edit` groups the scene and gameplay change into one history step when both change.
 */
export function sceneLogicSource(context: WorkbenchContext, scene: () => string) {
  const api = context.authoring!;
  const selected = () => gameplayScene(scene(), context.documents);
  const identity = () => deviceSourceIdentity(selected().id);
  const gameplay = (): GameplayDefinition =>
    selected().validateGameplay(api.get(selected().gameplayId).value);
  const pendingDocuments = () => liveSources(context);
  const targetContext = (source: unknown) => {
    const documents = pendingDocuments(),
      ids = deviceSourceIdentity(selected().id),
      network = pendingNetworkContext(documents);
    return {
      scene: pendingScene(
        selected().id,
        api.get(ids.composition).value,
        {
          sceneDocument: source,
          gameplay: gameplay(),
          devices: api.get(ids.devices).value,
          sharedState: documents.get('state-owners'),
          catalogue: documents.get('authored-scenes'),
        },
        network,
      ),
      network,
    };
  };
  const validate = (source: unknown): SceneDocument => {
    if ((source as SceneDocument)?.nativeTargets !== undefined) {
      const assembled = targetContext(source);
      return selected().validateScene(source, gameplay(), {
        phase: 'assembled',
        data: assembled.scene.data!,
        network: assembled.network,
      });
    }
    return selected().validateScene(source, gameplay());
  };
  const doc = () => validate(api.get(identity().scene).value);
  const edit = (label: string, fn: (d: SceneDocument, g: GameplayDefinition) => void) => {
    const d = doc(),
      g = sourceGameplay(gameplay()),
      before = JSON.stringify(g);
    fn(d, g);
    if (JSON.stringify(g) !== before) {
      if (!api.editDocuments)
        throw new Error('Conversation editing requires grouped source history');
      api.editDocuments(
        [
          { id: identity().scene, value: d },
          { id: selected().gameplayId, value: g },
        ],
        label,
      );
    } else {
      validate(d);
      api.edit(identity().scene, label, d);
    }
  };
  /** Gameplay-only edits (chunk triggers); the shared validator runs before the source changes. */
  const editGameplay = (label: string, fn: (g: GameplayDefinition) => void) => {
    const next = sourceGameplay(gameplay());
    fn(next);
    selected().validateGameplay(next);
    api.edit(selected().gameplayId, label, next);
  };
  return {
    api,
    selected,
    identity,
    gameplay,
    pendingDocuments,
    targetContext,
    validate,
    doc,
    edit,
    editGameplay,
  };
}
