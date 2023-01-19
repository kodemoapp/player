import { immerable } from 'immer';
import { Effect } from './Effect';

export interface TimelineSegmentData {
  id?: string;
  effect: Effect;
  measure: Function;
}

export type TimelineSegmentDataPartial = Partial<TimelineSegmentData>;

let idCount = 1;

export class TimelineSegment {
  id: string;
  effect: Effect;
  active: boolean;
  measure: Function;
  top?: number;
  bottom?: number;

  constructor({ id, effect, measure }: TimelineSegmentData) {
    this.effect = effect;
    this.measure = measure;
    this.active = false;

    this.id = id || 'segment-' + idCount++;
  }
}

// (!) Setting [immerable] inside the class itself caused the UMD
// build to take 3 mins for some unknown reason
// @ts-ignore
TimelineSegment[immerable] = true;
