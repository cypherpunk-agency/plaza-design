/** Default opening-story facade. Private games inject their own validated OpeningStoryModel. */
import {openingStoryModel} from './opening-source';
export {createOpeningModel,validateOpeningSource,openingStoryModel,resolveOpeningTarget} from './opening-source';
export type {OpeningStoryModel,OpeningSource,OpeningSourceContext,OpeningState,OpeningWorkflow,OpeningPhase,OpeningStart,ScenePhase,StoryTarget,StoryChip,ExitRule,PingTarget,Cue,CardSpec,Trigger,GoalHint,Persona,WashRule} from './opening-source';
export const {OPENING,OPENING_FLAGS,OPENING_LEVELS,START,ATTENTION,CLOCK,CARDS,TRIGGERS,GOAL_HINTS,WORKFLOWS,openingState,openingResume,openingLevel,hackLocked,persona}=openingStoryModel;
