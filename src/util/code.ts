import * as Diff from 'diff';

/**
 * Formats a line of code for diffing. We ignore some
 * trailing characters, like commas, to produce a higher
 * number of matches.
 */
export const formatLineForDiff = (value = '') => {
  value = value.trim();
  if (value.length > 3) {
    return value.replace(/[,;\>]$/g, '');
  } else {
    // Note: this may produce unwanted matches in files with many closing
    // brackets, such as JSON. Keep an eye on it.
    return value;
  }
};

export const countLeadingWhitespace = (line: string) => Math.max(line.search(/\S/), 0);

/**
 * Compares two code documents and returns a list of changes.
 *
 * @param {string} fromContent
 * @param {string} toContent
 * @returns { addedLines, removedLines }
 */
export const diffCode = (fromContent: string, toContent: string) => {
  return diffCodeCustom(fromContent, toContent);
};

type LineDiff = {
  line: number;
  key: string;
  leading: number;
  matches: any[];
  matchConfidence?: number;
  confidence?: number;
};

type LineMatch = {
  from: number;
  to: number;
  leading: number;
};

const diffCodeCustom = (fromContent: string, toContent: string) => {
  const fromArray = fromContent.split(/[\n\r]/).map((text, line) => ({
    line: line + 1,
    key: formatLineForDiff(text),
    leading: countLeadingWhitespace(text),
    matches: [],
    matchConfidence: 0,
  }));

  const toArray = toContent.split(/[\n\r]/).map((text, line) => ({
    line: line + 1,
    key: formatLineForDiff(text),
    leading: countLeadingWhitespace(text),
    matches: [],
  }));

  const addedLines: { [key: number]: boolean } = {};
  const removedLines: { [key: number]: boolean } = {};
  const pairedLines: { [key: number]: LineMatch } = {};

  const toMap: { [key: string]: LineDiff[] } = {};

  const keyValidator = /\S+/;

  // Create a map that groups all to-lines by their keys
  toArray.forEach((to) => {
    // Ignore invalid keys
    if (keyValidator.test(to.key) === false) return;

    toMap[to.key] = toMap[to.key] || [];
    toMap[to.key].push(to);
  });

  // Find all matching from and to line pairs
  fromArray.forEach((from) => {
    const candidates = toMap[from.key];

    if (candidates && candidates.length > 0) {
      findPairs(from, candidates, fromArray, toArray);
    }
  });

  // Sort the array by the quality of the match, this ensures
  // that we'll prioritize matches with high confidence
  // Note: this mutates the original array
  fromArray.sort((a, b) => b.matchConfidence - a.matchConfidence);

  // Create pairs for all matches
  fromArray.forEach((from) => {
    // Ignore invalid keys
    if (keyValidator.test(from.key) === false) return;

    const candidates: Array<LineDiff | null> = toMap[from.key];

    if (candidates && candidates.length > 0) {
      // Find the match with the highest confidence
      for (let i = 0; i < from.matches.length; i++) {
        const index = from.matches[i];
        const to = candidates[index];

        // Some candidates may already be taken, if so we
        // move on to the next-best match
        if (to) {
          pairedLines[to.line] = { from: from.line, to: to.line, leading: to.leading };
          candidates[index] = null;
          return;
        }
      }
    }

    // No match, so this line was removed
    removedLines[from.line] = true;
  });

  // Any remaining to-lines are new
  Object.values(toMap).forEach((candidates) => {
    candidates
      .filter((to) => to !== null)
      .forEach((to) => {
        addedLines[to.line] = true;
      });
  });

  return { addedLines, removedLines, pairedLines };
};

const findPairs = (from: LineDiff, candidates: LineDiff[], fromArray: LineDiff[], toArray: LineDiff[]) => {
  // Find matches based on the number of adjacent lines that match
  candidates.forEach((to, index) => {
    // We look further up to give more weight to preceding lines
    let confidence =
      countAdjacentPairs(-1, 7, fromArray, toArray, from.line, to.line) +
      countAdjacentPairs(1, 3, fromArray, toArray, from.line, to.line);

    if (confidence > 0) {
      if (from.leading === to.leading) {
        confidence += 0.5;
      }

      from.matchConfidence = Math.max(confidence, from.matchConfidence || 0);
      from.matches.push({ confidence, index });
    }
  });

  // Fall back on finding matches with the same leading space
  candidates.forEach(({ key: toKey, leading: toLeading }, index) => {
    if (toKey === from.key && (from.leading === toLeading || toKey.length > 3)) {
      from.matches.push({ confidence: 0, index });
    }
  });

  from.matches.sort((a, b) => b.confidence - a.confidence);
  from.matches = from.matches.map((m) => m.index);
};

/**
 * Counts to the number of adjacent lines that match in both
 * directions. This helps determine if two lines are part of
 * a larger block of code that was moved.
 */
const countAdjacentPairs = (
  direction: -1 | 1,
  viewDistance: number,
  fromArray: LineDiff[],
  toArray: LineDiff[],
  fromLine: number,
  toLine: number
) => {
  let result = 0;

  for (let i = 1; i < viewDistance; i++) {
    // All indices offset by 1, since line numbers are 1-based
    const to = toArray[direction === 1 ? toLine + i - 1 : toLine - i - 1];
    const toPrev = toArray[direction === 1 ? toLine + i - 2 : toLine - i];
    const from = fromArray[direction === 1 ? fromLine + i - 1 : fromLine - i - 1];
    const fromPrev = fromArray[direction === 1 ? fromLine + i - 2 : fromLine - i];

    // Matches must have the same value and the same relative leading whitespace
    if (to && from && to.key === from.key && to.leading - toPrev.leading === from.leading - fromPrev.leading) {
      result += 1;
    } else {
      break;
    }
  }

  return result;
};

const diffCodeAsArray = (fromContent: string, toContent: string) => {
  const fromArray = fromContent.split(/[\n\r]/).map((t) => formatLineForDiff(t));
  const toArray = toContent.split(/[\n\r]/).map((t) => formatLineForDiff(t));
  const arrayDiff = Diff.diffArrays(fromArray, toArray, {
    comparator: (a, b) => a === b,
  });

  let lineCount = 1;
  const addedLines: { [key: number]: string } = {};
  const removedLines: { [key: number]: string } = {};

  arrayDiff.forEach((diff) => {
    let lines = diff.value;

    if (diff.added) {
      lines.forEach((text) => {
        addedLines[lineCount] = formatLineForDiff(text);
        lineCount += 1;
      });
    } else if (diff.removed) {
      let removeCount = 0;
      lines.forEach((text) => {
        removedLines[lineCount + removeCount] = formatLineForDiff(text);
        removeCount += 1;
      });
    } else {
      lineCount += lines.length;
    }
  });

  return { addedLines, removedLines };
};

const diffCodeAsLines = (fromContent: string, toContent: string) => {
  // @ts-ignore
  const lineDiff = Diff.diffLines(fromContent, toContent, { diffTrimmedLines: true, newlineIsToken: false });

  let lineCount = 1;
  const addedLines: { [key: number]: string } = {};
  const removedLines: { [key: number]: string } = {};

  // Collect a map over added and removed lines
  lineDiff.forEach((diff) => {
    let lines = diff.value.replace(/(?:\r\n|\r|\n)$/g, '').split('\n');

    if (diff.added) {
      lines.forEach((text) => {
        addedLines[lineCount] = text;
        lineCount += 1;
      });
    } else if (diff.removed) {
      let removeCount = 0;
      lines.forEach((text) => {
        removedLines[lineCount + removeCount] = text;
        removeCount += 1;
      });
    } else {
      lineCount += lines.length;
    }
  });

  return { addedLines, removedLines };
};
