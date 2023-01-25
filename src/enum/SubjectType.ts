import { CodeSubject, IframeSubject, ImageSubject, MathSubject } from '../subjects';

enum SubjectType {
  CODE = 'code',
  MATH = 'latex',
  IMAGE = 'image',
  IFRAME = 'iframe',
}

export default SubjectType;

export const subjectDictionary = {
  [SubjectType.CODE]: {
    component: CodeSubject,
    versioned: true,
  },
  [SubjectType.MATH]: {
    component: MathSubject,
    versioned: false,
  },
  [SubjectType.IMAGE]: {
    component: ImageSubject,
    versioned: true,
  },
  [SubjectType.IFRAME]: {
    component: IframeSubject,
    versioned: false,
  },
};
