/** Default opening-story facade. Private games inject their own validated OpeningStoryModel. */
import {openingStoryModel} from './opening-source';
export {createOpeningModel,validateOpeningSource,openingStoryModel,pick,resolveOpeningTarget} from './opening-source';
export type {OpeningStoryModel,OpeningSource,OpeningSourceContext,OpeningState,OpeningTarget,OpeningTargetScene,StoryChip,ExitRule,PingTarget,PerScene} from './opening-source';
export const {OPENING,OPENING_FLAGS,OPENING_LEVELS,OPENING_TIME,OPENING_GOAL,OPENING_INTRO,OPENING_LINES,OPENING_EVERYDAY,OPENING_EXITS,OPENING_TARGETS,OPENING_PINGS,IDLE_PING,HOME_RUN,TURNSTILE,SLEEP,MORNING,WAKE_LINES,MOTH_MESSAGE,UPLINK_LINES,DECK_BEFORE,openingState,openingResume,openingLevel,hackLocked,isBefore}=openingStoryModel;
