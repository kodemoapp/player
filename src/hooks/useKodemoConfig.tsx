import merge from 'lodash/merge';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { CODE_SUBJECT_TYPE, IFRAME_SUBJECT_TYPE, IMAGE_SUBJECT_TYPE, MATH_SUBJECT_TYPE } from '../enum/SubjectTypes';
import { CodeSubject, IframeSubject, ImageSubject, MathSubject } from '../subjects';
import { getExtensionFromFilename } from '../util/file';

export interface ISubjectFormatDefinition {
  type: string;
  extensions?: string[];
  language?: string;
  label?: string;
}

export interface ISubjectComponentDefinition {
  component: any;
  versioned: boolean;
}

export interface IKodemoConfig {
  /**
   * If enabled, keyboard pagination allows the viewer to paginate
   * between timeline segments using arrow keys and spacebar.
   */
  keyboardPagination: boolean;

  /**
   * If enabled, we'll show a button that lets users copy code
   * subjects to clipboard.
   */
  copyCode: boolean;

  /**
   * If enabled, we'll let users compare the current and previous
   * image versions.
   */
  compareImages: boolean;

  /**
   * A list of all supported subject formats. This is used to
   * map file extensions to subject types.
   */
  subjectFormats: ISubjectFormatDefinition[];

  /**
   * A map between subject types and the components they should
   * render
   */
  subjectComponents: {
    [key: string]: ISubjectComponentDefinition;
  };
}

export type IKodemoConfigPartial = Partial<IKodemoConfig>;

interface KodemoConfigState extends IKodemoConfig {
  codeSubjectFormats: ISubjectFormatDefinition[];
  subjectFileExtensions: string[];
  subjectsByFileExtension: { [key: string]: ISubjectFormatDefinition };
  getSubjectByFileExtension: (filename: string) => ISubjectFormatDefinition;
  getSubjectByFilename: (filename: string) => ISubjectFormatDefinition;
  getSubjectComponentByType: (type: string) => ISubjectComponentDefinition;
}

const defaultConfig: IKodemoConfig = {
  keyboardPagination: true,

  copyCode: true,

  compareImages: true,

  subjectFormats: [
    { type: CODE_SUBJECT_TYPE, extensions: ['cpp', 'cxx'], language: 'cpp', label: 'C++' },
    { type: CODE_SUBJECT_TYPE, extensions: ['css'], language: 'css', label: 'CSS' },
    { type: CODE_SUBJECT_TYPE, extensions: ['go'], language: 'go', label: 'Go' },
    { type: CODE_SUBJECT_TYPE, extensions: ['html'], language: 'html', label: 'HTML' },
    { type: CODE_SUBJECT_TYPE, extensions: ['java', 'class'], language: 'java', label: 'Java' },
    { type: CODE_SUBJECT_TYPE, extensions: ['js', 'jsx'], language: 'javascript', label: 'JavaScript' },
    { type: CODE_SUBJECT_TYPE, extensions: ['json'], language: 'json', label: 'JSON' },
    { type: CODE_SUBJECT_TYPE, extensions: ['kr'], language: 'kotlin', label: 'Kotlin' },
    { type: CODE_SUBJECT_TYPE, extensions: ['md'], language: 'markdown', label: 'Markdown' },
    { type: CODE_SUBJECT_TYPE, extensions: ['php'], language: 'php', label: 'PHP' },
    { type: CODE_SUBJECT_TYPE, extensions: ['python'], language: 'python', label: 'Python' },
    { type: CODE_SUBJECT_TYPE, extensions: ['rb', 'ruby', 'rake'], language: 'ruby', label: 'Ruby' },
    { type: CODE_SUBJECT_TYPE, extensions: ['sh', 'bash'], language: 'shell', label: 'Shell' },
    { type: CODE_SUBJECT_TYPE, extensions: ['swift'], language: 'swift', label: 'Swift' },
    { type: CODE_SUBJECT_TYPE, extensions: ['rust'], language: 'rust', label: 'Rust' },
    { type: CODE_SUBJECT_TYPE, extensions: ['ts', 'tsx'], language: 'typescript', label: 'TypeScript' },
    { type: CODE_SUBJECT_TYPE, extensions: ['txt'], language: '', label: 'Text' },
    { type: CODE_SUBJECT_TYPE, extensions: ['xml'], language: 'xml', label: 'XML' },
    { type: CODE_SUBJECT_TYPE, extensions: ['yaml', 'yml', 'syntax'], language: 'yaml', label: 'YAML' },

    { type: MATH_SUBJECT_TYPE, extensions: ['tex', 'latex'] },

    { type: IMAGE_SUBJECT_TYPE, extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
  ],

  subjectComponents: {
    [CODE_SUBJECT_TYPE]: {
      component: CodeSubject,
      versioned: true,
    },
    [MATH_SUBJECT_TYPE]: {
      component: MathSubject,
      versioned: false,
    },
    [IMAGE_SUBJECT_TYPE]: {
      component: ImageSubject,
      versioned: true,
    },
    [IFRAME_SUBJECT_TYPE]: {
      component: IframeSubject,
      versioned: false,
    },
  },
};

const useKodemoConfig = create(
  subscribeWithSelector<KodemoConfigState>((set, get) => ({
    ...defaultConfig,

    subjectsByFileExtension: {},
    codeSubjectFormats: [],
    subjectFileExtensions: [],

    getSubjectByFileExtension: (extension: string) => {
      return get().subjectsByFileExtension[extension];
    },

    getSubjectByFilename(filename: string) {
      const extension = getExtensionFromFilename(filename);

      return get().getSubjectByFileExtension(extension!);
    },

    getSubjectComponentByType(type: string) {
      return get().subjectComponents[type];
    },
  }))
);

// Any time the subjects change we need to update all
// derivative data structures
const afterSubjectsSet = (subjectFormats: ISubjectFormatDefinition[]) => {
  const codeSubjectFormats = subjectFormats.filter((fileFormat) => fileFormat.type === CODE_SUBJECT_TYPE);

  const subjectFileExtensions = subjectFormats.reduce((list: string[], format) => {
    if (format.extensions) {
      list.push(...format.extensions);
    }
    return list;
  }, []);

  // Create an extension:format map for all file formats so
  // that we can more efficiently look up formats
  const subjectsByFileExtension: { [key: string]: ISubjectFormatDefinition } = {};
  subjectFormats.forEach((format) => {
    if (format.extensions) {
      format.extensions.forEach((extension) => {
        subjectsByFileExtension[extension] = format;
      });
    }
  });

  useKodemoConfig.setState({
    codeSubjectFormats,
    subjectFileExtensions,
    subjectsByFileExtension,
  });
};

// Subscribe to subjects changing
useKodemoConfig.subscribe((state) => state.subjectFormats, afterSubjectsSet);
afterSubjectsSet(useKodemoConfig.getState().subjectFormats);

export const setKodemoConfig = (config: IKodemoConfigPartial) => {
  useKodemoConfig.setState(Object.assign({}, defaultConfig, config));
};

export const extendKodemoConfig = (config: IKodemoConfigPartial) => {
  useKodemoConfig.setState(merge({}, useKodemoConfig.getState(), config));
};

export default useKodemoConfig;
