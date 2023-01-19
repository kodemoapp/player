import ReactDOM from 'react-dom';
import { addHighlight, resetHighlight, getExtensions } from '../lib/codemirror-setup';
import { StateEffect } from '@codemirror/state';
import React from 'react';
import anime from 'animejs';
import { EditorView } from '@codemirror/view';
import { EditorState, EditorSelection } from '@codemirror/state';
import { keyframes } from 'styled-components';
import { countLeadingWhitespace, formatLineForDiff } from '../util/code';
import throttle from 'lodash/throttle';

const SCROLL_EASING = 'easeInOutQuint';
const SCROLL_DURATION = 1000;

const ADDED_LINE_DURATION = 800;
const ADDED_LINE_EASING = 'easeOutQuint';

const REMOVED_LINE_DURATION = 400;
const REMOVED_LINE_EASING = 'easeOutQuint';

const PAIRED_LINE_DURATION = 800;
const PAIRED_LINE_EASING = 'easeInOutQuint';

export const CodeEditor = React.forwardRef(({ value, language, editable, active, onContentChange }, forwardRef) => {
  const editor = React.useRef();
  const editorLanguage = React.useRef(null);
  const codeElementRef = React.useRef(null);
  const firstRenderRef = React.useRef(true);
  const highlights = React.useRef([]);
  const focusRange = React.useRef({ fromPos: 0, toPos: 0 });
  const previousFocusRange = React.useRef(null);
  const transitionableRange = React.useRef({ fromLine: 1, toLine: Number.MAX_VALUE });
  const inflatedContentHeight = React.useRef();

  // Epoch is used to offset animations since they start at different times
  const transitionStartTime = React.useRef(-1);

  // The total duration for our current transition
  const transitionDuration = React.useRef(0);

  // Timeout used to track when a transition is about to end
  const transitionEndTimeout = React.useRef(-1);

  // A list of dom elements that are currently animating
  const animatedElements = React.useRef({
    added: [],
    removed: [],
    paired: [],
  });

  // Transitions that will trigger when they move into view
  const stagedTransitions = React.useRef([]);

  /**
   * Transitions this code editor into view;
   * - Scrolls the first highlighted area into view
   * - Compares code against previously visible editor and animates
   *   the difference
   */
  const transition = (options) => {
    stopAllAnimations();

    onTransitionStart();

    if (editor.current) {
      calculateWhitespaceWidth(editor.current);
    }

    // Start from the current scroll position of the previous version
    if (options.fromVersion) {
      const fromView = options.fromVersion.getEditorView();

      inflateHeightToMatchFromView(fromView);

      // Scroll to our start position instantly
      scrollTo(fromView.scrollDOM.scrollTop);
    }

    // We need to measure first to get accurate layout values,
    // such as line and scroll positions
    editor.current.requestMeasure({
      read: () => {
        // Handle focus (if there is no highlight)
        if (!hasFocusRange()) applyFirstAddedLineFocus(options);
        if (!hasFocusRange()) applyPreviousFocus();

        // Scroll calculation
        const focusStartBlock = editor.current.lineBlockAt(focusRange.current.fromPos);
        const focusEndBlock = editor.current.lineBlockAt(focusRange.current.toPos);
        const scrollTop = getScrollTopTarget({ top: focusStartBlock.top, bottom: focusEndBlock.bottom });

        if (options.fromVersion) {
          const distanceFromFinalViewport =
            Math.abs(scrollTop - editor.current.scrollDOM.scrollTop) / editor.current.viewState.editorHeight;

          // Determine which part of the code we can transition (optimization)
          calculateTransitionableRange({ focusStartBlock, focusEndBlock, ...options });

          // Stage our transition
          stageTransition(getTransitionDelta(options), distanceFromFinalViewport);
        }

        // Scroll focused lines into view (if needed)
        if (typeof scrollTop === 'number') {
          scrollTo(scrollTop, !!options.fromVersion);
        }

        transitionStartTime.current = Date.now();

        if (stagedTransitions.current.length > 0) {
          // Run all transitions that are currently in view
          runTransitionsInView();

          // Wait for all transitions to finish then invoke out transition end callback
          transitionEndTimeout.current = setTimeout(() => onTransitionEnd(), transitionDuration.current);
        } else {
          // We're not running any transitions so callback directly
          onTransitionEnd();
        }
      },
    });
  };

  const onTransitionStart = () => {
    clearTimeout(transitionEndTimeout.current);
    codeElementRef.current.setAttribute('data-state', 'transitioning');
  };

  const onTransitionEnd = () => {
    clearTimeout(transitionEndTimeout.current);
    if (codeElementRef.current) {
      codeElementRef.current.setAttribute('data-state', 'idle');
    }
  };

  /**
   * If there are no focused/highlighted lines, this method will focus
   * and scroll the first modified lines into view instead (if there
   * are any).
   */
  const applyFirstAddedLineFocus = (options) => {
    if (options.addedLines) {
      let addedLineNumbers = Object.keys(options.addedLines).map((k) => parseInt(k, 10));

      const firstAddedLine = addedLineNumbers[0];
      const lastAddedLine = addedLineNumbers[addedLineNumbers.length - 1];

      if (typeof firstAddedLine === 'number' && typeof lastAddedLine === 'number') {
        focusRange.current.fromPos = editor.current.state.doc.line(firstAddedLine).from;
        focusRange.current.toPos = editor.current.state.doc.line(lastAddedLine).to;
        previousFocusRange.current = { ...focusRange.current };
      }
    }
  };

  const applyPreviousFocus = () => {
    if (previousFocusRange.current) {
      focusRange.current.fromPos = previousFocusRange.current.fromPos;
      focusRange.current.toPos = previousFocusRange.current.toPos;
    }
  };

  const hasFocusRange = () => {
    return focusRange.current.fromPos !== 0 || focusRange.current.toPos !== 0;
  };

  /**
   * Calculates the range of lines that will be in view during a
   * code transition. This covers all lines from the start viewport
   * through scrolling and into the final viewport.
   */
  const calculateTransitionableRange = React.useCallback(
    ({ addedLines, removedLines, focusStartBlock, focusEndBlock }) => {
      // Reset
      transitionableRange.current.fromLine = Number.MAX_VALUE;
      transitionableRange.current.toLine = 0;

      let { visibleTop, visibleBottom, editorHeight } = editor.current.viewState;

      const changedLines = Object.keys(addedLines).length + Object.keys(removedLines).length;
      const startPadding = Math.max(changedLines, 10) * editor.current.defaultLineHeight;

      // All we know about the final viewport is that focused/highlighted
      // lines, so we need to expand the range of visible lines to cover
      // the full viewport from there
      const endPadding = editorHeight * 0.75;

      // The CodeMirror visibleTop/bottom values are out of sync here
      // so we're resorting to reading the DOM scrollTop for now
      visibleTop = editor.current.scrollDOM.scrollTop;
      visibleBottom = visibleTop + editorHeight;

      const transitionableBlocks = [
        // Lines visible in the original viewport
        editor.current.lineBlockAtHeight(visibleTop - startPadding),
        editor.current.lineBlockAtHeight(visibleBottom + startPadding),

        // Lines visible in the final (scrolled) viewport
        editor.current.lineBlockAtHeight(focusStartBlock.top - endPadding),
        editor.current.lineBlockAtHeight(focusEndBlock.bottom + endPadding),
      ];

      transitionableBlocks.forEach((block) => {
        const data = editor.current.state.doc.lineAt(block.from);
        transitionableRange.current.fromLine = Math.min(transitionableRange.current.fromLine, data.number);
        transitionableRange.current.toLine = Math.max(transitionableRange.current.toLine, data.number);
      });
    },
    []
  );

  /**
   * Finds the delta between this code editor and the code editor
   * we're coming from. The delta tells us what lines that were
   * added, removed or changed location.
   */
  const getTransitionDelta = React.useCallback(({ fromVersion, pairedLines, addedLines, removedLines }) => {
    const delta = {
      pairs: [],
      added: [],
      removed: [],
    };

    const fromEditor = fromVersion.getEditorView();
    const toEditor = editor.current;

    Object.values(pairedLines).forEach(({ from, to }) => {
      const fromLineData = fromEditor.state.doc.line(from);
      const fromLineBlock = fromEditor.lineBlockAt(fromLineData.from);
      const fromLeadingSpace = countLeadingWhitespace(fromLineData.text);

      const toLineData = toEditor.state.doc.line(to);
      const toLineBlock = toEditor.lineBlockAt(toLineData.to);
      const toLeadingSpace = countLeadingWhitespace(toLineData.text);

      if (fromLineData.from !== toLineData.from || fromLineData.to !== toLineData.to) {
        delta.pairs.push({
          from: { lineData: fromLineData, lineBlock: fromLineBlock, leadingSpace: fromLeadingSpace },
          to: { lineData: toLineData, lineBlock: toLineBlock, leadingSpace: toLeadingSpace },
        });
      }
    });

    Object.keys(addedLines).forEach((lineNumber) => {
      const lineData = toEditor.state.doc.line(lineNumber);
      const lineBlock = toEditor.lineBlockAt(lineData.from);
      delta.added.push({ lineData, lineBlock });
    });

    // Removed lines
    Object.keys(removedLines).forEach((lineNumber) => {
      if (lineNumber < fromEditor.state.doc.lines) {
        const lineData = fromEditor.state.doc.line(lineNumber);
        const lineBlock = fromEditor.lineBlockAt(lineData.from);
        const dom = fromVersion.getLineElementFromPos(lineData.from);
        if (dom) {
          delta.removed.push({ dom, lineData, lineBlock });
        }
      }
    });

    return delta;
  }, []);

  /**
   * Prepares all of the transitions/animations required to
   * take us from the previous code version to this version.
   *
   * Note: DOM line elements may not exist at this point so
   * transitions are staged but not executed until they come
   * into view.
   */
  const stageTransition = React.useCallback((delta, distanceFromFinalViewport) => {
    stagedTransitions.current = [];

    const scrollDelay = distanceFromFinalViewport > 0.1 ? 100 + 100 * distanceFromFinalViewport : 0;

    // Paired lines ----------------------------------------
    delta.pairs.forEach(({ from, to }) => {
      stagedTransitions.current.push({
        pos: to.lineData.from,
        run: (dom, timeOffset) => {
          let animationOptions = {
            easing: PAIRED_LINE_EASING,
            duration: PAIRED_LINE_DURATION,
            autoplay: false,
            targets: dom,
            translateY: [from.lineBlock.top - to.lineBlock.top, 0],
          };

          // Some paired lines may have different amounts of leading space,
          // in this case we try to animate horizontally to compensate
          if (from.leadingSpace !== to.leadingSpace && whitespaceWidth > 0) {
            animationOptions.translateX = [(from.leadingSpace - to.leadingSpace) * whitespaceWidth, 0];
          }

          const animation = anime(animationOptions);
          animation.seek(timeOffset);
          animation.play();
          animatedElements.current.paired.push(dom);
        },
      });
    });

    // Added lines -----------------------------------------
    let addedDelay = 400;

    // Skip the delay if
    // - There are no other animations
    // - We're not scrolling any code into view
    if (delta.removed.length === 0 && delta.pairs.length === 0) {
      addedDelay = 0;
    }

    // Our baseline as we adjust delays based on the number of added lines
    const normalNumberOfAddedLines = 10;

    const timeBetweenAddedLines = 75 * Math.min(Math.max(normalNumberOfAddedLines / delta.added.length, 0.25), 1);

    delta.added.forEach((data) => {
      stagedTransitions.current.push({
        pos: data.lineData.from,
        run: (dom, timeOffset) => {
          animatedElements.current.added.push(dom);
          const computedStyles = window.getComputedStyle(dom);
          const animation = anime({
            easing: ADDED_LINE_EASING,
            duration: ADDED_LINE_DURATION,
            autoplay: false,
            targets: dom,
            translateX: [40, 0],
            opacity: [0, computedStyles.opacity],
            delay: scrollDelay + addedDelay + animatedElements.current.added.length * timeBetweenAddedLines,
          });

          animation.seek(timeOffset);
          animation.play();
        },
      });
    });

    // Removed lines ---------------------------------------

    // Clone nodes that need to animate out so that they aren't
    // immediately hidden when the previous page hides
    delta.removed.forEach((data) => {
      const computedStyles = window.getComputedStyle(data.dom);
      data.ghost = data.dom.cloneNode(true);
      data.ghost.style.position = 'absolute';
      data.ghost.style.top = 0;
      data.ghost.style.left = 0;
      data.ghost.style.opacity = computedStyles.opacity;
      data.ghost.style.transform = `translate(${data.dom.offsetLeft}px, ${data.dom.offsetTop}px)`;
      editor.current.scrollDOM.appendChild(data.ghost);
      animatedElements.current.removed.push(data.ghost);
    });

    // All removed elements are animated together
    anime({
      easing: REMOVED_LINE_EASING,
      duration: REMOVED_LINE_DURATION,
      delay: scrollDelay,
      targets: animatedElements.current.removed,
      opacity: 0,
      complete: () => {
        delta.removed.forEach((data) => data.ghost.remove());
      },
    });

    transitionDuration.current = Math.max(
      PAIRED_LINE_DURATION,
      ADDED_LINE_DURATION + scrollDelay + addedDelay + delta.added.length * timeBetweenAddedLines,
      REMOVED_LINE_DURATION + scrollDelay
    );
  });

  /**
   * Runs any staged transition that is currently in view.
   */
  const runTransitionsInView = () => {
    // const scrollTop = editor.current.scrollDOM.scrollTop;
    // const editorHeight = editor.current.viewState.editorHeight;

    // const padding = Math.max(editor.current.defaultLineHeight * 8, editorHeight * 0.5);

    // const viewportTop = scrollTop - padding;
    // const viewportBottom = scrollTop + editorHeight + padding;

    // stagedTransitions.current = stagedTransitions.current.filter((transition) => {
    //   if (transition.top >= viewportTop && transition.bottom <= viewportBottom) {
    //     const dom = getLineElementFromPos(transition.pos);
    //     if (dom) {
    //       transition.run(dom);
    //       return false;
    //     }
    //   }

    //   return true;
    // });

    // Force codemirror to update its scroll position, otherwise
    // it will be out of sync as we update the dom scrollTop
    // editor.current.inputState.runScrollHandlers(editor);
    // editor.current.measure(true);

    let from = Infinity;
    let to = -Infinity;

    editor.current.visibleRanges.forEach((range) => {
      from = Math.min(from, range.from);
      to = Math.max(to, range.to);
    });

    // This offset ensures that all animations run in sync, even
    // if they aren't started at the same time
    const timeOffset = Date.now() - transitionStartTime.current;

    stagedTransitions.current = stagedTransitions.current.filter((transition) => {
      if (transition.pos >= from && transition.pos <= to) {
        const dom = getLineElementFromPos(transition.pos);
        if (dom) {
          transition.run(dom, timeOffset);
          return false;
        }
      }

      return true;
    });
  };

  /**
   * Retrieves a CodeMirror line DOM element based on its position.
   *
   * @param {int} pos
   * @returns HTMLElement
   */
  const getLineElementFromPos = (pos) => {
    // After much trial and error, this seems to be the DOM-finding
    // approach that is most accurate as we update on scroll
    // let cmView = editor.current.docView.domAtPos(pos)?.node?.cmView;
    // if (cmView) {
    //   while ((cmView = cmView.parent)) {
    //     if (cmView.type === 0) {
    //       return cmView.dom;
    //     }
    //   }
    // }

    return editor.current.docView.domBoundsAround(pos, pos)?.startDOM;

    // return editor.current.docView.children.find((view) => {
    //   if (pos >= view.posAtStart && pos <= view.posAtEnd) {
    //     return true;
    //   }
    // })?.dom;
  };

  /**
   * Applies code highlights to the editor.
   *
   * @param {array} value See Effect class
   */
  const highlightLines = (value) => {
    if (!editor.current) return;

    highlights.current = value;

    const totalLines = editor.current.state.doc.lines;

    let effects = [];

    let fromPos = Number.MAX_VALUE;
    let toPos = 0;

    // Apply highlighting to the targeted lines
    highlights.current.forEach((value, lineNumber) => {
      if (value) {
        // Ensure we are within bounds
        if (lineNumber > 0 && lineNumber <= totalLines) {
          const lineData = editor.current.state.doc.line(lineNumber);
          effects.push(addHighlight.of(lineData));

          fromPos = Math.min(fromPos, lineData.from);
          toPos = Math.max(toPos, lineData.from);
        }
      }
    });

    if (codeElementRef.current) {
      if (effects.length === 0) {
        focusRange.current.fromPos = 0;
        focusRange.current.toPos = 0;

        codeElementRef.current.classList.remove('has-highlights');
      } else {
        focusRange.current.fromPos = fromPos;
        focusRange.current.toPos = toPos;

        codeElementRef.current.classList.add('has-highlights');
      }

      effects.unshift(resetHighlight.of());
      editor.current.dispatch({ effects });
    }
  };

  /**
   * Checks whether scrolling is required or not and returns
   * the target scroll top if it is.
   *
   * @param {{top}} Vertical start of the range in pixels
   * @param {{bottom}} Vertical end of the range in pixels
   */
  const getScrollTopTarget = ({ top, bottom }) => {
    const scrollContainer = editor.current.scrollDOM;

    const viewportHeight = scrollContainer.offsetHeight;
    const scrollHeight = scrollContainer.scrollHeight;
    const highlightHeight = bottom - top;

    let startTop = scrollContainer.scrollTop;
    let targetTop = top - (viewportHeight - highlightHeight) * 0.45;

    // If the highlight is taller than the viewport, place the top
    // of the highlight near the top of the viewport
    if (highlightHeight > viewportHeight * 0.8) {
      targetTop = top - viewportHeight * 0.2;
    }

    const { contentHeight, editorHeight } = editor.current.viewState;

    // If we have inflated the content height for smoother transitions
    // make sure we don't scroll further down that our "real" content
    // height
    targetTop = Math.min(targetTop, contentHeight - editorHeight);
    targetTop = Math.max(targetTop, 0);

    // Don't attempt to scroll if there is no overflow
    if (startTop !== targetTop && scrollHeight > viewportHeight) {
      return startTop + (targetTop - startTop);
    } else {
      return null;
    }
  };

  /**
   * Scrolls to the top position using a smooth animation.
   *
   * @param {int} scrollTop
   * @param {boolean} animate
   */
  const scrollTo = (scrollTop, animate) => {
    editor.current.scrollDOM.scrollLeft = 0;

    if (animate === true) {
      anime({
        targets: editor.current.scrollDOM,
        scrollTop,
        easing: SCROLL_EASING,
        duration: SCROLL_DURATION,
        update: throttle(runTransitionsInView, 50, { leading: false, trailing: true }),
        complete: () => deflateHeight(),
      });
    } else {
      editor.current.scrollDOM.scrollTop = scrollTop;
    }
  };

  /**
   * If the view we're coming from is taller, we need to match
   * its height to avoid an instant vertical shift during transition
   *
   * @param {EditorView} formView
   */
  const inflateHeightToMatchFromView = (fromView) => {
    if (editor.current.contentHeight < fromView.contentHeight) {
      inflatedContentHeight.current = fromView.contentHeight;
      editor.current.contentDOM.style.minHeight = inflatedContentHeight.current + 'px';
    }
  };

  const deflateHeight = () => {
    if (inflatedContentHeight.current) {
      inflatedContentHeight.current = null;
      editor.current.contentDOM.style.minHeight = '';
    }
  };

  const stopAllAnimations = () => {
    anime.remove(editor.current.scrollDOM);
    stagedTransitions.current = [];

    deflateHeight();

    // Remove added/paired animations
    if (animatedElements.current.added.length > 0 || animatedElements.current.paired.length > 0) {
      const animationsToStop = [...animatedElements.current.added, ...animatedElements.current.paired];
      anime.remove(animationsToStop);

      animationsToStop.forEach((element) => {
        element.style.transform = '';
        element.style.opacity = '';
      });

      animatedElements.current.added = [];
      animatedElements.current.paired = [];
    }

    // Remove ghost animations
    if (animatedElements.current.removed.length > 0) {
      animatedElements.current.removed.forEach((el) => {
        // These elements are ephemeral, created just for the animation
        anime.remove(el);
        el.remove();
      });

      animatedElements.current.removed = [];
    }
  };

  const getEditorView = () => editor.current;

  const handleBlur = (event, editorView) => {
    highlightLines(highlights.current);
  };

  const handleEditorUpdate = (v) => {
    if (v.docChanged && typeof onContentChange === 'function') {
      onContentChange(v.state.doc.toString());
    }

    if (v.viewportChanged) {
      // We started invoking transitions directly from our scroll callback,
      // we most likely don't need to do it here anymore but just in case...
      // runTransitionsInView();
    }

    // Show the editor once it has been measured. Fixes a flicker of
    // poorly rendered line height as codemirror inititalizes
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      codeElementRef.current.style.visibility = '';
    }
  };

  React.useEffect(() => {
    if (editor.current) {
      // Kill all animations when this is hidden from view
      if (!active) {
        stopAllAnimations();

        // Clear selection
        editor.current.dispatch({
          selection: EditorSelection.single(0),
        });
      }
    }
  }, [active, editor.current]);

  // Rebuild the editor if the language changes
  // TODO This should be reconfigurable without rebuilding,
  // need to dive into the CM API.
  React.useEffect(() => {
    if (editor.current && editorLanguage.current !== language) {
      editor.current.destroy();
      createEditor();
    }
  }, [language]);

  // Create the CodeMirror editor
  React.useEffect(() => {
    createEditor();

    return () => {
      editor.current.destroy();
      clearTimeout(transitionEndTimeout.current);
    };
  }, []);

  React.useImperativeHandle(forwardRef, () => ({
    highlightLines,
    transition,
    getEditorView,
    getLineElementFromPos,
  }));

  function createEditor() {
    editorLanguage.current = language;
    editor.current = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [
          ...getExtensions({
            language,
            editable,
            onBlur: handleBlur,
          }),
          EditorView.updateListener.of(handleEditorUpdate),
        ],
      }),
      parent: codeElementRef.current,
    });

    if (highlights.current) {
      highlightLines(highlights.current);
    }
  }

  return <code style={{ visibility: 'hidden' }} ref={codeElementRef}></code>;
});

let whitespaceWidth = 0;

/**
 * Calculates the width of a single whitespace character.
 * We need this in order to animate between paird lines
 * that have different leading space
 *
 * @param {EditorView} editorView
 * @returns
 */
const calculateWhitespaceWidth = (editorView) => {
  // Only calculate the width once
  // Prefer codemirror's built-in whitespace width
  if (typeof editorView.defaultCharacterWidth === 'number') {
    whitespaceWidth = editorView.defaultCharacterWidth;
  }
  // Find the first line that has leading space AND contains
  // a DOM element we can measure (some have only text nodes)
  else if (!whitespaceWidth) {
    const dom = editorView.contentDOM;
    Array.from(dom.querySelectorAll('.cm-line')).some((element) => {
      const firstChild = element.firstElementChild;
      const leadingSpace = countLeadingWhitespace(element.textContent);
      if (firstChild && leadingSpace > 1) {
        const offsetLeft = firstChild.offsetLeft;
        if (offsetLeft > 0) {
          whitespaceWidth = offsetLeft / leadingSpace;
          return true;
        }
      }
    });
  }
};
