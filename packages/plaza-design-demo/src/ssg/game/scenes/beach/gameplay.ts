import source from './gameplay.json';
import data from './devices.json';
import type {SceneData} from '../../data/types';
import {validateNativeContract} from '../../engine/gameplay/native-contract';
export const validateBeachGameplay=(value:unknown)=>validateNativeContract(value,source,data as unknown as SceneData);
export const BEACH_GAMEPLAY=validateBeachGameplay(source);
