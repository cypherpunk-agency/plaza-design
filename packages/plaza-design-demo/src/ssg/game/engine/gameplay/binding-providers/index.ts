import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {moth} from './moth';
/**
 * Registered binding providers: a source name `<provider>.<key>` asks the provider for `key`.
 * A provider works out everything it offers once per frame from the scene as it stands (its
 * model, its artwork, its gameplay); a folder scene names a provider only through its
 * composition's bindings. One file per provider in this folder, one line here.
 */
export type BindingProvider=(ctx:BindingContext)=>Record<string,Value>;
export const BINDING_PROVIDERS:Readonly<Record<string,BindingProvider>>={
 moth,
};
