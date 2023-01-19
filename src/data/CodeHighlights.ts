export class CodeHighlights {
  highlights: Array<boolean | undefined> = [];

  constructor() {}

  activateLines(from: number, to: number) {
    [from, to] = [from, to].sort((a, b) => a - b);

    this.highlights.length = Math.max(this.highlights.length, from + 1, to + 1);
    this.highlights.fill(true, from, to + 1);
  }

  deactivateLines(from: number, to: number) {
    [from, to] = [from, to].sort((a, b) => a - b);
    this.highlights.fill(undefined, from, to + 1);
  }

  toggleLines(from: number, to: number) {
    if (!this.highlights[to]) {
      this.activateLines(from, to);
    } else {
      this.deactivateLines(from, to);
    }
  }

  toArray() {
    return this.highlights;
  }

  toString() {
    const stringParts = [];
    let sequenceStart = -1;

    for (let lineNumber = 0; lineNumber <= this.highlights.length; lineNumber++) {
      // Is this a highlighted line number?
      if (this.highlights[lineNumber] === true) {
        // Start a new highlight sequence, unless one is already
        // in progress
        if (sequenceStart === -1) {
          sequenceStart = lineNumber;
        }
      }
      // Have we arrived at the end of the current sequence?
      else if (sequenceStart !== -1) {
        // Single line highlight
        if (lineNumber - sequenceStart === 1) {
          stringParts.push(sequenceStart);
        }
        // Range highlight
        else {
          stringParts.push(sequenceStart + '-' + (lineNumber - 1));
        }

        // Terminate the sequence
        sequenceStart = -1;
      }
    }

    return stringParts.join(', ');
  }

  static fromString(highlightsString: string) {
    let highlights = new CodeHighlights();

    try {
      (highlightsString.match(/[\d]+(-[\d]+)?/gi) || []).forEach((highlight: any) => {
        // Parse valid line numbers
        if (/^[\d-]+$/.test(highlight)) {
          highlight = highlight.split('-');

          const fromLine = Math.min(parseInt(highlight[0], 10), 10000);
          const toLine = Math.min(parseInt(highlight[1], 10), 10000);

          if (isNaN(toLine)) {
            highlights.activateLines(fromLine, fromLine);
          } else {
            highlights.activateLines(fromLine, toLine);
          }
        }
      });
    } catch (error) {
      console.warn(`Failed to parse code highlight "${highlightsString}"`);
    }

    return highlights;
  }
}

// const hl = CodeHighlights.fromString('6-10, 1, 2, 3, 2, 7, 18');
// console.log(hl.toArray());
// console.log(hl.toString());

// hl.toggleLines(3, 2);
// console.log(hl.toString());
