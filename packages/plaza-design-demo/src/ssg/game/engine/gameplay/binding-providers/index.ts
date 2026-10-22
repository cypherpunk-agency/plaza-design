import {terminal} from './terminal';
import {vehicleProvider} from './vehicle';
import {station} from './station';
import {harborProvider} from './harbor';
import {trainProvider} from './train';
import {downtown} from './downtown';
/**
 * Registered binding providers: a source name `<provider>.<key>` asks the provider for `key`.
 * A provider works out everything it offers once per frame from the scene as it stands (its
 * model, its artwork, its gameplay); a folder scene names a provider only through its
 * composition's bindings. One file per provider in this folder, one line here.
 */
/** A provider declares the `keys` it offers (binding-keys.ts) and, optionally, the presentation `signals` it reads. */
import {sceneProvider} from './scene';
import {flowProvider} from './flow';
export type {BindingProvider} from '../binding-keys';
import type {BindingProvider} from '../binding-keys';
export const BINDING_PROVIDERS:Readonly<Record<string,BindingProvider>>={
 scene:sceneProvider,
 flow:flowProvider,
 vehicle:vehicleProvider,
 terminal,
 station,
 harbor:harborProvider,
 train:trainProvider,
 downtown,
};
