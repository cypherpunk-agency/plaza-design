import type {Value} from '../../../art/core/composition';
import type {BindingContext} from '../binding-sources';
import {mallProvider} from './mall';
import {marketBindings} from './market';
import {laundry} from './laundry';
import {terminal} from './terminal';
import {station} from './station';
import {moth} from './moth';
import {harborProvider} from './harbor';
import {sandbox} from './sandbox';
import {yard} from './yard';
import {capsule} from './capsule';
import {beachProvider} from './beach';
import {trainProvider} from './train';
import {downtown} from './downtown';
/**
 * Registered binding providers: a source name `<provider>.<key>` asks the provider for `key`.
 * A provider works out everything it offers once per frame from the scene as it stands (its
 * model, its artwork, its gameplay); a folder scene names a provider only through its
 * composition's bindings. One file per provider in this folder, one line here.
 */
import {flagProvider} from './flag';
import {cueProvider} from './cue';
import {shiftProvider} from './shift';
/** `signals`: the presentation signals the provider reads (name and starting stamp); a scene's cues may target them. */
export type BindingProvider=((ctx:BindingContext)=>Record<string,Value>)&{signals?:Readonly<Record<string,number>>};
export const BINDING_PROVIDERS:Readonly<Record<string,BindingProvider>>={
 mall:mallProvider,
 flag:flagProvider,
 cue:cueProvider,
 shift:shiftProvider,
 market:marketBindings,
 laundry,
 terminal,
 station,
 moth,
 harbor:harborProvider,
 sandbox,
 yard,
 capsule,
 beach:beachProvider,
 train:trainProvider,
 downtown,
};
