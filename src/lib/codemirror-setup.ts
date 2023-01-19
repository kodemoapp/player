import { EditorView, Decoration, gutter, GutterMarker, gutterLineClass } from '@codemirror/view';
import { EditorState, StateField, StateEffect, RangeSet, Facet } from '@codemirror/state';
import { indentMore, indentLess } from '@codemirror/commands';
import {
  indentOnInput,
  bracketMatching,
  defaultHighlightStyle,
  syntaxHighlighting,
  StreamLanguage,
} from '@codemirror/language';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap } from '@codemirror/lint';
import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  lineNumbers,
  highlightActiveLineGutter,
} from '@codemirror/view';

import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { php } from '@codemirror/lang-php';
// import { java } from '@codemirror/lang-java';
// import { python } from '@codemirror/lang-python';
// import { xml } from '@codemirror/lang-xml';
// import { cpp } from '@codemirror/lang-cpp';
// import { rust } from '@codemirror/lang-rust';

// https://github.com/codemirror/legacy-modes
// import { javascript, json, typescript } from '@codemirror/legacy-modes/mode/javascript';
// import { html } from '@codemirror/legacy-modes/mode/xml';
// import { css } from '@codemirror/legacy-modes/mode/css';
import { python } from '@codemirror/legacy-modes/mode/python';
import { xml } from '@codemirror/legacy-modes/mode/xml';
import { cpp, java } from '@codemirror/legacy-modes/mode/clike';
import { rust } from '@codemirror/legacy-modes/mode/rust';
import { go } from '@codemirror/legacy-modes/mode/go';
import { kotlin } from '@codemirror/legacy-modes/mode/clike';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { yaml } from '@codemirror/legacy-modes/mode/yaml';

import { theme as codeMirrorTheme } from './codemirror-theme';

const jsx = () => javascript({ jsx: true });
const tsx = () => javascript({ jsx: true, typescript: true });

// A map of all supported languages
const languageMap = {
  javascript: jsx,
  typescript: tsx,
  html,
  css,
  json,
  markdown,
  php,

  // java,
  // python,
  // xml,
  // cpp,
  // rust,

  // javascript: () => StreamLanguage.define(javascript),
  // typescript: () => StreamLanguage.define(typescript),
  // html: () => StreamLanguage.define(html),
  // css: () => StreamLanguage.define(css),
  // json: () => StreamLanguage.define(json),

  java: () => StreamLanguage.define(java),
  python: () => StreamLanguage.define(python),
  xml: () => StreamLanguage.define(xml),
  cpp: () => StreamLanguage.define(cpp),
  rust: () => StreamLanguage.define(rust),

  go: () => StreamLanguage.define(go),
  kotlin: () => StreamLanguage.define(kotlin),
  ruby: () => StreamLanguage.define(ruby),
  shell: () => StreamLanguage.define(shell),
  swift: () => StreamLanguage.define(swift),
  yaml: () => StreamLanguage.define(yaml),
};

// Additional custom keyboard bindings
const keyMap = [
  {
    key: 'Tab',
    run: indentMore,
  },
  {
    key: 'Shift-Tab',
    run: indentLess,
  },
];

// Line highlights
export const addHighlight = StateEffect.define();
export const resetHighlight = StateEffect.define();

const highlightDecoration = Decoration.line({ class: 'cm-highlight' });

const highlightField = StateField.define({
  create() {
    return Decoration.none;
  },
  update(highlights, tr) {
    highlights = highlights.map(tr.changes);
    for (let e of tr.effects) {
      // When we encounter a reset effect, reset all highlight decorations
      if (e.is(resetHighlight)) {
        highlights = RangeSet.empty;
      }
      // Append new highlight decorations
      else if (e.is(addHighlight) && e?.value) {
        highlights = highlights.update({
          // @ts-ignore
          add: [highlightDecoration.range(e.value.from)],
        });
      }
    }
    return highlights;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Gutter highlights
class HighlightGutterMarker extends GutterMarker {
  elementClass = 'cm-gutter-highlight';
}

const highlightGutterMarker = new HighlightGutterMarker();

const highlightGutter = gutterLineClass.compute([highlightField], (state) => {
  const highlights = state.field(highlightField);
  let marks: any = [];

  highlights.between(0, Number.MAX_VALUE, (pos) => {
    let linePos = state.doc.lineAt(pos).from;
    if (linePos) {
      marks.push(highlightGutterMarker.range(linePos));
    }
  });

  return RangeSet.of(marks);
});

/**
 * Generates a list of CodeMirror extensions.
 */
export const getExtensions = ({
  language,
  editable = false,
  onContentChange,
  onFocus,
  onBlur,
}: {
  language: string;
  editable?: boolean;
  onContentChange?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}) => {
  const extensions = [
    lineNumbers(),
    highlightSpecialChars(),
    drawSelection(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    indentOnInput(),

    EditorState.allowMultipleSelections.of(true),

    highlightField,
    highlightGutter,

    EditorState.tabSize.of(2),

    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...lintKeymap, ...keyMap]),

    codeMirrorTheme,
  ];

  if (editable) {
    extensions.push(
      history(),
      closeBrackets(),
      bracketMatching(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      highlightSelectionMatches()
    );
  } else {
    extensions.push(EditorView.editable.of(false));
  }

  const languageExtension = languageMap[language as keyof typeof languageMap];
  if (languageExtension) {
    extensions.push(languageExtension());
  }
  // Warn for unmatched languages
  else if (language !== '') {
    console.warn(`No syntax highlight language matches "${language}"`);
  }

  if (typeof onFocus === 'function') {
    extensions.push(
      EditorView.domEventHandlers({
        focus: onFocus,
      })
    );
  }

  if (typeof onBlur === 'function') {
    extensions.push(
      EditorView.domEventHandlers({
        blur: onBlur,
      })
    );
  }

  return extensions;
};

/*
For future reference; we should be able to highlight elements
in the line number gutter via lineNumberMarkers.

This may be helpful: https://github.com/codemirror/view/blob/main/src/active-line.ts

lineNumberMarkers

const emptyMarker = new (class extends GutterMarker {
  toDOM() {
    return document.createTextNode('ø');
  }
})();

const emptyLineGutter = gutter({
  lineMarker(view, line) {
    return line.from == line.to ? emptyMarker : null;
  },
  initialSpacer: () => emptyMarker,
});
*/

/*
export const gutterLineClass = Facet.define();

const activeLineGutterMarker = new (class extends GutterMarker {
  elementClass = 'cm-activeLineGutter';
})();

const highlightedLineGutterMarker = gutterLineClass.compute(['highlights'], (state) => {
  let marks = [],
    last = -1;
  console.log(state);
  for (let range of state.selection.ranges)
    if (range.empty) {
      let linePos = state.doc.lineAt(range.head).from;
      if (linePos > last) {
        last = linePos;
        marks.push(activeLineGutterMarker.range(linePos));
      }
    }
  return RangeSet.of(marks);
});

export function highlightGutter() {
  return highlightedLineGutterMarker;
}
*/
