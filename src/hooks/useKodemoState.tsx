import { create, StoreApi, UseBoundStore } from 'zustand';
import produce, { enablePatches, Patch } from 'immer';
import { subscribeWithSelector } from 'zustand/middleware';
import _get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import mitt from 'mitt';
import { generateSubjectID, generateVersionID } from '../util/util';
import { migrateDocument } from '../util/doc';
import { TimelineSegment, TimelineSegmentDataPartial, Effect } from '../KodemoPlayer';

enablePatches();

export const DOCUMENT_CHANGE_EVENT = 'document-changed';
export const DOCUMENT_REPLACED_EVENT = 'document-replaced';
export const SUBJECT_ADDED_EVENT = 'subject-added';

export interface IVersion {
  [key: string]: any;
}

export interface ISubject {
  type: string;
  name: string;
  created_at?: number;
  versionIndex: string[];
  versions: {
    [key: string]: IVersion;
  };
}

export type IVersionPartial = Partial<IVersion>;
export type ISubjectPartial = Partial<ISubject>;

export interface ISubjects {
  [key: string]: ISubject;
}

export interface KodemoDocument {
  id?: string;
  title?: string;
  version?: string;
  updated_at?: number;
  story: string;
  subjectIndex: string[];
  subjects: ISubjects;
}

export interface IKodemoState {
  document: KodemoDocument | null;

  /**
   * The player width/height in pixels.
   */
  dimensions: Dimensions;

  /**
   * The offset between the top left corner of the page and the
   * top left corner of the player.
   */
  offset: Point;

  documentCycle: number;

  scrollContainer: HTMLElement | null;
  scrollTop: number;

  /**
   * Set to true once the story has been rendered and measured.
   */
  layoutComplete: boolean;

  playheadFixedTop: number | null;

  /**
   * Bounding box of the story wrapper element.
   */
  storyMeasurements: any;

  /**
   * Bounding box of the story content element.
   */
  storyContentMeasurements: any;

  /**
   * Bounding box for the timeline playhead.
   */
  playheadMeasurements: any;

  /**
   * Flags whether we are editing or viewing a document.
   */
  editing: boolean;

  currentEffect: Effect | null;
  lastSetEffect: Effect | null;
  previewEffect: Effect | null;
  currentEffectIsFixed: boolean;

  timelineSegments: TimelineSegment[];
  activeTimelineSegmentId: string | null;

  addSubject: (subject: ISubject, version: IVersion) => string | undefined;
  removeSubject: (subjectId: string) => void;
  addSubjectVersion: (subjectId: string, afterVersionId: string, versionData: IVersionPartial) => string | undefined;
  removeSubjectVersion: (subjectId: string, versionId: string) => void;
  removeAllSubjects: () => void;

  emit: (event: string, data: any) => void;
  on: (event: string, data: any) => void;
  off: (event: string, data: any) => void;

  [key: string]: any;
}

export interface IKodemoStateStore extends UseBoundStore<StoreApi<IKodemoState>> {}

interface Dimensions {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

export class DocumentChange {
  patches: Patch[];
  inversePatches: Patch[];
  context: any;

  constructor(patches: Patch[], inversePatches: Patch[], context = {}) {
    this.patches = patches;
    this.inversePatches = inversePatches;
    this.context = context;
  }
}

/**
 * State selectors for a Kodemo document.
 */
export class DocumentSelectors {
  static document = (state: IKodemoState) => state.document;
  static title = (state: IKodemoState) => _get(state.document, `title`);
  static story = (state: IKodemoState) => _get(state.document, `story`);
  static subjects = (state: IKodemoState): ISubjects => _get(state.document, `subjects`) as ISubjects;
  static subject = (state: IKodemoState, subjectId: string): ISubject =>
    _get(state.document, `subjects.${subjectId}`) as unknown as ISubject;
  static version = (state: IKodemoState, subjectId: string, versionId: string): IVersion =>
    _get(state.document, `subjects.${subjectId}.versions.${versionId}`) as unknown as IVersion;
  static subjectIndex = (state: IKodemoState) => _get(state.document, `subjectIndex`);
  static versionIndex = (state: IKodemoState, subjectId: string) =>
    _get(state.document, `subjectIndex.subjects.${subjectId}.versionIndex`);
}

/**
 * State selectors for the Kodemo player.
 */
export class KodemoStateSelectors {
  static currentEffect = (state: IKodemoState) => state.currentEffect;
  static currentNonPreviewEffect = (state: IKodemoState) => state.lastSetEffect;

  static timelineSegments = (state: IKodemoState) => state.timelineSegments;
  static activeTimelineSegmentId = (state: IKodemoState) => state.activeTimelineSegmentId;
  static timelineSegment = (state: IKodemoState, id: string) =>
    state.timelineSegments.find((s: TimelineSegment) => s.id === id);

  static playheadFixedTop = (state: IKodemoState) => state.playheadFixedTop;
  static playheadMeasurements = (state: IKodemoState) => state.playheadMeasurements;
  static storyMeasurements = (state: IKodemoState) => state.storyMeasurements;
  static storyContentMeasurements = (state: IKodemoState) => state.storyContentMeasurements;
  static scrollTop = (state: IKodemoState) => state.scrollTop;
  static dimensions = (state: IKodemoState) => state.dimensions;
  static offset = (state: IKodemoState) => state.offset;

  static scrollContainer = (state: IKodemoState) => state.scrollContainer;
  static documentCycle = (state: IKodemoState) => state.documentCycle;
}

export class KodemoStateEqualityFunctions {
  // 1. Array has the same length
  // 2. Array values are in the same order (by value.id)
  static arrayLengthAndOrderById = (prev: { id: string }[], next: { id: string }[]) =>
    prev.length === next.length &&
    prev.every((entry, i) => {
      return entry.id === next[i].id;
    });
}

export class KodemoStateSideEffects {
  static measureAndSortTimelineSegments = (state: IKodemoState) => {
    state.timelineSegments.forEach((segment: TimelineSegment) => (segment.top = segment.measure().top));
    state.timelineSegments.sort((a: TimelineSegment, b: TimelineSegment) => {
      if (typeof a.top === 'number' && typeof b.top === 'number') {
        a.top - b.top;
      }

      return 0;
    });
  };

  static updateActiveTimelineSegments = (state: IKodemoState) => {
    if (state.currentEffect) {
      state.timelineSegments.forEach((segment: TimelineSegment) => {
        if (state.currentEffect!.id === segment.effect.id) {
          state.activeTimelineSegmentId = segment.id;
        }
      });
    } else {
      state.activeTimelineSegmentId = null;
    }
  };

  /**
   * Ensures that the given effect has a valid version ID.
   * If not, fall back on the first version in the subject.
   */
  static validateEffectVersionStillExists = (state: IKodemoState, effect: Effect) => {
    if (effect) {
      const subjectId = effect.subject;

      if (typeof subjectId === 'string') {
        const subject = DocumentSelectors.subject(state, subjectId);

        if (subject) {
          const versionId = effect.version;

          if (typeof versionId === 'string') {
            const version = subject.versions[versionId];

            if (!version) {
              effect.version = Object.keys(subject.versions)[0];
            }
          }
        }
      }
    }
  };
}

const filterPatches = (patches: Patch[]) => {
  return patches.filter((patch: Patch) => {
    // Immer has a bug where it produces a replace patch for the array
    // length property when an item is added or removed from an array.
    // This results in arrays being persisted as objects. Follow here
    // for updates:
    // https://github.com/immerjs/immer/issues/208#issuecomment-996064385
    return patch.path[patch.path.length - 1] !== 'length';
  });
};

/**
 * A wrapper around immer to produce state changes that
 * should be persisted.
 */
const produceAndStore = (producer: any) => {
  const state = useKodemoState.getState();
  return produce(state, producer, (patches, inversePatches) => {
    useKodemoState
      .getState()
      .emit(
        DOCUMENT_CHANGE_EVENT,
        new DocumentChange(filterPatches(patches), filterPatches(inversePatches), state.context)
      );
  });
};

const emitter = mitt();

let previewTimeout: ReturnType<typeof setTimeout>;

const useKodemoState = create(
  subscribeWithSelector<IKodemoState>((set, get) => ({
    document: null,
    documentCycle: 1,

    scrollContainer: null,
    scrollTop: 0,

    // Set to true once the story has been rendered and measured
    layoutComplete: false,

    playheadFixedTop: null,

    // The player width/height in pixels
    dimensions: {
      width: 0,
      height: 0,
    },

    // The offset between the top left corner of the page
    // and the top left corner of the player
    offset: {
      x: 0,
      y: 0,
    },

    // Bounding box of the story wrapper element
    storyMeasurements: null,

    // Bounding box of the story content element
    storyContentMeasurements: null,

    // Bounding box for the timeline playhead
    playheadMeasurements: null,

    // Flags whether we are editing or viewing a document
    editing: false,

    currentEffect: null,
    lastSetEffect: null,
    previewEffect: null,
    currentEffectIsFixed: false,

    timelineSegments: [],
    activeTimelineSegmentId: null,

    /*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
     * DOM State
     *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/

    setScrollContainer: (element: HTMLElement) => {
      set(
        produce((state: IKodemoState) => {
          state.scrollContainer = element;
        })
      );
    },

    setScrollTop: (value: number) => {
      set(
        produce((state: IKodemoState) => {
          state.scrollTop = value;
        })
      );
    },

    setDimensions: (dimensions: Dimensions) => {
      set(
        produce((state: IKodemoState) => {
          state.dimensions.width = dimensions.width;
          state.dimensions.height = dimensions.height;
        })
      );
    },

    setOffset: (offset: Point) => {
      set(
        produce((state: IKodemoState) => {
          state.offset.x = offset.x;
          state.offset.y = offset.y;
        })
      );
    },

    /*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
     * Document State
     *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/

    reset: () => {
      set(
        produce((state: IKodemoState) => {
          state.document = null;
          state.currentEffect = null;
          state.lastSetEffect = null;
          state.previewEffect = null;
          state.currentEffectIsFixed = false;
          state.activeTimelineSegmentId = null;
          state.timelineSegments = [];
          state.scrollTop = 0;
          state.layoutComplete = false;
        })
      );
    },

    setDocument: (doc: KodemoDocument) => {
      set(
        produceAndStore((state: IKodemoState) => {
          doc = cloneDeep(doc || {});
          doc = migrateDocument(doc);

          // Don't set the same document repeatedly
          if (JSON.stringify(state.document) !== JSON.stringify(doc)) {
            get().reset();

            state.document = doc;
            state.documentCycle = state.documentCycle + 1;

            useKodemoState.getState().emit(DOCUMENT_REPLACED_EVENT, state.document);
          }
        })
      );
    },

    getDocument: (): KodemoDocument | null => {
      return DocumentSelectors.document(get());
    },

    getDocumentId: () => {
      return get().document?.id;
    },

    setDocumentTitle: (value: string) => {
      set(
        produceAndStore((state: IKodemoState) => {
          const doc = DocumentSelectors.document(state);
          if (doc) doc.title = value;
        })
      );
    },

    updateStory: (value: string) => {
      set(
        produceAndStore((state: IKodemoState) => {
          const doc = DocumentSelectors.document(state);

          // Avoid exceptions if this is called after the document
          // is reset/removed. This is likely to happen since story
          // updates occur asynchronously at a debounced rate.
          if (doc) {
            doc.story = value;
          }
        })
      );
    },

    addSubject: (data: any, firstVersion: IVersion): string | undefined => {
      let subjectId;
      let versionId;

      set(
        produceAndStore((state: IKodemoState) => {
          const doc = DocumentSelectors.document(state);
          if (doc) {
            const subjects = DocumentSelectors.subjects(state);
            subjectId = generateSubjectID({ subjectCount: Object.keys(subjects).length });

            versionId = generateVersionID({ subjectId, versionCount: 0 });
            const versions = { [versionId]: firstVersion };

            subjects[subjectId] = {
              created_at: Date.now(),
              versions,
              versionIndex: [versionId],
              ...data,
            };

            // Append our new subject to the index
            doc.subjectIndex.push(subjectId);
          }
        })
      );

      useKodemoState.getState().emit(SUBJECT_ADDED_EVENT, { subjectId, versionId });

      return subjectId;
    },

    updateSubject: (subjectId: string, data: ISubjectPartial) => {
      set(
        produceAndStore((state: IKodemoState) => {
          const subject = DocumentSelectors.subject(state, subjectId);
          if (subject) {
            Object.assign(subject, data);
          }
        })
      );
    },

    removeSubject: (subjectId) => {
      set(
        produceAndStore((state: IKodemoState) => {
          delete DocumentSelectors.subjects(state)[subjectId];

          const doc = DocumentSelectors.document(state);
          if (doc) {
            // remove from index
            const i = doc.subjectIndex.indexOf(subjectId);
            if (i !== -1) doc.subjectIndex.splice(i, 1);
          }
        })
      );
    },

    removeAllSubjects: () => {
      set(
        produceAndStore((state: IKodemoState) => {
          const doc = DocumentSelectors.document(state);
          if (doc) {
            doc.subjects = {};
            doc.subjectIndex = [];
          }
        })
      );
    },

    setSubjectIndex: (value: string[]) => {
      set(
        produceAndStore((state: IKodemoState) => {
          const doc = DocumentSelectors.document(state);
          if (doc) doc.subjectIndex = value;
          KodemoStateSideEffects.measureAndSortTimelineSegments(state);
        })
      );
    },

    /**
     * Adds a new subject version by duplicating the last version.
     * If an afterVersionId is provided, the new version will be
     * inserted after that version.
     *
     * @param {string} subjectId
     * @param {string} [afterVersionId]
     * @param {IVersionPartial} [versionData]
     */
    addSubjectVersion: (
      subjectId: string,
      afterVersionId: string,
      versionData: IVersionPartial
    ): string | undefined => {
      let versionId;

      set(
        produceAndStore((state: IKodemoState) => {
          const subject = DocumentSelectors.subject(state, subjectId);
          const versions = Object.values(subject.versions);

          // The version that we want to duplicate
          let sourceVersion = subject.versions[afterVersionId];

          // Fallback #1, if no id is provided look for the version
          // at the end of the index
          if (!sourceVersion && subject.versionIndex) {
            sourceVersion = subject.versions[subject.versionIndex[subject.versionIndex.length - 1]];
          }

          // Fallback #2, if no index is available, use the most
          // recently added version
          if (!sourceVersion) {
            sourceVersion = versions[versions.length - 1];
          }

          versionId = generateVersionID({ subjectId, versionCount: versions.length });

          // Add the new version
          subject.versions[versionId] = {
            created_at: Date.now(),
            ...sourceVersion,
            ...(versionData || {}),
          };

          let indexHasBeenInserted = false;

          // Are we inserting at a specific index?
          if (typeof afterVersionId === 'string') {
            const afterIndex = subject.versionIndex.indexOf(afterVersionId);
            if (afterIndex !== -1) {
              indexHasBeenInserted = true;
              subject.versionIndex = [
                ...subject.versionIndex.slice(0, afterIndex + 1),
                versionId,
                ...subject.versionIndex.slice(Math.min(afterIndex + 1, subject.versionIndex.length)),
              ];
            }
          }

          if (!indexHasBeenInserted) {
            subject.versionIndex.push(versionId);
          }
        })
      );

      return versionId;
    },

    updateSubjectVersion: (subjectId: string, versionId: string, versionData: IVersionPartial) => {
      set(
        produceAndStore((state: IKodemoState) => {
          const subject = DocumentSelectors.subject(state, subjectId);
          if (subject) {
            const version = subject.versions[versionId];
            if (version) {
              Object.assign(version, versionData);
            }
          }
        })
      );
    },

    removeSubjectVersion: (subjectId: string, versionId: string) => {
      set(
        produceAndStore((state: IKodemoState) => {
          delete DocumentSelectors.subject(state, subjectId).versions[versionId];

          // remove from index
          const i = DocumentSelectors.subject(state, subjectId).versionIndex.indexOf(versionId);
          if (i !== -1) DocumentSelectors.subject(state, subjectId).versionIndex.splice(i, 1);

          // In case the active effect was pointing to the removed version
          const currentEffect = KodemoStateSelectors.currentEffect(state);
          if (currentEffect) {
            KodemoStateSideEffects.validateEffectVersionStillExists(state, currentEffect);
          }
        })
      );
    },

    setSubjectVersionIndex: (subjectId: string, value: string[]) => {
      set(
        produceAndStore((state: IKodemoState) => {
          DocumentSelectors.subject(state, subjectId).versionIndex = value;
        })
      );
    },

    /*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
     * Effects
     *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/

    setCurrentEffect: (effect: Effect, { fixed = false } = {}) => {
      // Ensure there's no preview waiting...
      clearTimeout(previewTimeout);

      set(
        produce((state: IKodemoState) => {
          state.lastSetEffect = effect;
          if (
            !state.currentEffectIsFixed &&
            (!state.currentEffect || !effect || effect.id !== state.currentEffect.id)
          ) {
            state.currentEffect = effect;
            state.currentEffectIsFixed = fixed;
            state.previewEffect = null;

            KodemoStateSideEffects.validateEffectVersionStillExists(state, effect);
            KodemoStateSideEffects.updateActiveTimelineSegments(state);
          }
        })
      );
    },

    /**
     * Temporarily preview an effect, overrides the current
     * effect.
     */
    setPreviewEffect: (effect: Effect, { delay = 0 } = {}) => {
      // Ensure there's no preview waiting...
      clearTimeout(previewTimeout);

      const execute = () => {
        set(
          produce((state: IKodemoState) => {
            if (!state.currentEffectIsFixed) {
              // If the user previews an effect matching the last set non-preview
              // effect, clear the preview to ensure the same payload is applied.
              if (
                effect &&
                effect.hasPayload() === false &&
                state.lastSetEffect &&
                state.lastSetEffect.subject === effect.subject &&
                state.lastSetEffect.version === effect.version
              ) {
                state.currentEffect = state.lastSetEffect;
                state.previewEffect = null;
              } else {
                KodemoStateSideEffects.validateEffectVersionStillExists(state, effect);

                state.previewEffect = effect;
                state.currentEffect = effect;
              }
            }
          })
        );
      };

      // There can be a delay here to prevent immediate previews
      // when moving quickly through the UI
      if (delay > 0) {
        previewTimeout = setTimeout(execute, delay);
      } else {
        execute();
      }
    },

    /**
     * Rolls back a temporary effect preview.
     */
    clearPreviewEffect: (effect: Effect, { delay = 0 } = {}) => {
      // Ensure there's no preview waiting...
      clearTimeout(previewTimeout);

      const execute = () => {
        set(
          produce((state: IKodemoState) => {
            if (
              !state.currentEffectIsFixed &&
              (!effect || (state.previewEffect && state.previewEffect.id === effect.id))
            ) {
              state.currentEffect = state.lastSetEffect;
              state.previewEffect = null;
            }
          })
        );
      };

      // There can be a delay here to prevent immediate previews
      // when moving quickly through the UI
      if (delay > 0) {
        previewTimeout = setTimeout(execute, delay);
      } else {
        execute();
      }
    },

    clearFixedEffect: () => {
      set(
        produce((state: IKodemoState) => {
          if (state.currentEffectIsFixed) {
            state.currentEffectIsFixed = false;
            if (state.currentEffect && state.currentEffect.id !== state.lastSetEffect?.id) {
              state.currentEffect = state.lastSetEffect;
              state.previewEffect = null;
            }
          }
        })
      );
    },

    /*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*
     * Timeline
     *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*/

    registerTimelineSegments: (segments: TimelineSegment[]) => {
      set(
        produce((state: IKodemoState) => {
          segments.forEach((segment) => {
            if (!state.timelineSegments.some((e) => e.id === segment.id)) {
              state.timelineSegments.push(segment);
            }
          });
          KodemoStateSideEffects.measureAndSortTimelineSegments(state);
          KodemoStateSideEffects.updateActiveTimelineSegments(state);
        })
      );
    },

    unregisterTimelineSegments: (segments: TimelineSegment[]) => {
      const segmentIds = segments.map((segment: TimelineSegment) => segment.id);

      set(
        produce((state: IKodemoState) => {
          state.timelineSegments = state.timelineSegments.filter((e) => {
            return segmentIds.indexOf(e.id) === -1;
          });
        })
      );
    },

    updateTimelineSegment: (id: string, data: TimelineSegmentDataPartial) => {
      set(
        produce((state: IKodemoState) => {
          const segment = state.timelineSegments.find((s) => s.id === id);
          if (segment) Object.assign(segment, data);
          KodemoStateSideEffects.measureAndSortTimelineSegments(state);
        })
      );
    },

    updateTimelineSegments: (segmentsDataMap: Array<{ id: string; data: TimelineSegmentDataPartial }>) => {
      set(
        produce((state: IKodemoState) => {
          segmentsDataMap.forEach(({ id, data }) => {
            const segment = state.timelineSegments.find((s) => s.id === id);
            if (segment) Object.assign(segment, data);
          });
          KodemoStateSideEffects.measureAndSortTimelineSegments(state);
        })
      );
    },

    updateAllTimelineSegmentPositions: () => {
      set(
        produce((state: IKodemoState) => {
          KodemoStateSideEffects.measureAndSortTimelineSegments(state);
        })
      );
    },

    on: emitter.on,
    off: emitter.off,
    emit: emitter.emit,
  }))
);

export default useKodemoState;
