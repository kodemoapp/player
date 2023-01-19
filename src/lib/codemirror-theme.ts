import { EditorView } from 'codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { theme as kodemoTheme } from '@kodemo/util';

const invalid = '#ffffff',
  ivory = '#abb2bf',
  stone = '#7d8799',
  highlightBackground = '#262b33',
  background = kodemoTheme.colors.bgSubjects,
  tooltipBackground = '#353a42',
  selection = '#3E4451',
  cursor = '#528bff',
  gutter = '#515a6b';

const color = {
  red: '#f92672',
  blue: '#66d9ef',
  grey: '#8292a2',
  green: '#a6e22e',
  white: '#ffffff',
  yellow: '#e6db74',
  purple: '#ae81ff',
};

/// Editor theme styles
const styles = EditorView.theme(
  {
    '&': {
      color: ivory,
      backgroundColor: background,
    },

    '&:focus, .cm-scroller:focus, .cm-content:focus': {
      outline: 'none',
    },

    '&, .cm-content, .cm-scroller': {
      minHeight: '100%',
    },

    '.cm-scroller': {
      fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
      lineHeight: 1.7,
    },

    '.cm-content': {
      caretColor: cursor,

      // If word-wrap is re-enabled, make sure that the scroll animation
      // that moves code into view works for lines of code that are far
      // outside of the current viewport
      // whiteSpace: 'pre-wrap',
      // width: '100%',
    },

    '.cm-line': {
      position: 'relative',
      padding: '0 2px 0 0',
    },

    // Never quite got this to work...
    // '.cm-line.cm-highlight:after': {
    //   content: '',
    //   backgroundColor: '#383e49',
    //   backgroundColor: 'red',
    //   height: '100%',
    //   left: '-40px',
    //   right: '-40px',
    //   position: 'absolute',
    //   zIndex: -1,
    //   top: 0,
    // },

    '.cm-cursor, .cm-dropCursor': { borderLeftColor: cursor },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: selection,
    },

    '.cm-panels': { backgroundColor: background, color: ivory },
    '.cm-panels.cm-panels-top': { borderBottom: '2px solid black' },
    '.cm-panels.cm-panels-bottom': { borderTop: '2px solid black' },

    '.cm-searchMatch': {
      backgroundColor: '#72a1ff59',
      outline: '1px solid #457dff',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#6199ff2f',
    },

    // '.cm-highlight': {},
    '.cm-gutter-highlight': { color: '#95a8ba' },
    '.cm-gutterElement': { transition: 'color 0.15s ease' },

    '.cm-activeLine': { backgroundColor: background },
    '.cm-activeLineGutter': { backgroundColor: background },
    '&.cm-focused .cm-activeLine': { backgroundColor: highlightBackground },
    '&.cm-focused .cm-activeLineGutter': { backgroundColor: highlightBackground },

    '.cm-selectionMatch': { backgroundColor: '#aafe661a' },

    '&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket': {
      backgroundColor: 'rgb(186,208,248,0.1)',
      borderRadius: '2px',
    },

    '&.cm-editor.cm-focused': {
      outline: 'none',
    },

    '.cm-gutters': {
      backgroundColor: background,
      color: gutter,
      border: 'none',
      userSelect: 'none',
    },

    '.cm-lineNumbers': {
      minWidth: '3.4em',
    },

    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 14px 0 5px',
    },

    '.cm-foldPlaceholder': {
      backgroundColor: 'transparent',
      border: 'none',
      color: '#ddd',
    },

    '.cm-tooltip': {
      border: 'none',
      backgroundColor: tooltipBackground,
    },
    '.cm-tooltip .cm-tooltip-arrow:before': {
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    '.cm-tooltip .cm-tooltip-arrow:after': {
      borderTopColor: tooltipBackground,
      borderBottomColor: tooltipBackground,
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: highlightBackground,
        color: ivory,
      },
    },
  },
  { dark: true }
);

/// Syntax highlighting styles
const highlightStyles = HighlightStyle.define([
  { tag: t.keyword, color: color.blue },
  { tag: [t.deleted, t.character, t.macroName], color: color.red },
  { tag: [t.propertyName], color: color.white },
  { tag: [t.function(t.variableName), t.labelName, t.name], color: color.yellow },
  { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: color.red },
  { tag: [t.definition(t.name), t.separator], color: color.grey },
  {
    tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace],
    color: color.red,
  },
  { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: color.grey },
  { tag: [t.meta, t.comment], color: color.grey },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: stone, textDecoration: 'underline' },
  { tag: t.heading, fontWeight: 'bold', color: color.red },
  { tag: [t.atom, t.bool, t.special(t.variableName)], color: color.purple },
  { tag: [t.processingInstruction, t.string, t.inserted], color: color.green },
  { tag: t.invalid, color: invalid },
]);

/// Extension to enable the theme
export const theme = [styles, syntaxHighlighting(highlightStyles)];
