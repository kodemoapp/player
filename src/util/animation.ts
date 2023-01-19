type Delta = {
  pairs: {
    from: Element;
    to: Element;
  }[];
  added: {
    element: Element;
  }[];
  removed: {
    element: Element;
  }[];
};

/**
 * Returns a delta for the difference in elements found
 * inside of two container scopes.
 *
 * @param {HTMLElement} fromScope   Scope within the from element exists
 * @param {HTMLElement} toScope     Scope within the to element exists
 * @param {String} selector         CSS selector of the element to match
 * @param {Function} serialize      A function that accepts an HTMLElement and returns
 *                                  a stringified ID based on its contents
 */
export function getTransitionDelta(
  fromScope: HTMLElement,
  toScope: HTMLElement,
  selector: string,
  serialize: (element: Element) => string
) {
  const delta: Delta = {
    pairs: [],
    removed: [],
    added: [],
  };

  let fromMap: {
    [key: string]: Element[];
  } = {};
  let toMap: {
    [key: string]: Element[];
  } = {};

  fromScope.querySelectorAll(selector).forEach((element) => {
    const key = serialize(element);
    if (typeof key === 'string' && key.length) {
      fromMap[key] = fromMap[key] || [];
      fromMap[key].push(element);
    }
  });

  toScope.querySelectorAll(selector).forEach((element) => {
    const key = serialize(element);

    // Ignore invalid or empty keys, prevents empty nodes from
    // matching each other
    if (typeof key !== 'string' || key.length === 0) return;

    toMap[key] = toMap[key] || [];
    toMap[key].push(element);

    let fromElement;

    // if (key === '  controls: true,') {
    //   console.log('--------------------------------------');
    //   console.log(fromMap[key]);
    // }

    // Retrieve the 'from' element
    if (fromMap[key]) {
      const pimaryIndex = toMap[key].length - 1;
      const secondaryIndex = fromMap[key].length - 1;

      // If there are multiple identical from-elements, retrieve
      // the one at the same index as our to-element
      if (fromMap[key][pimaryIndex]) {
        fromElement = fromMap[key][pimaryIndex];
        delete fromMap[key][pimaryIndex];
      }
      // If there are no matching from-elements at the same index,
      // use the last one
      else if (fromMap[key][secondaryIndex]) {
        fromElement = fromMap[key][secondaryIndex];
        delete fromMap[key][secondaryIndex];
      }
    }

    // If we've got a matching pair, push it to the list of pairs
    if (fromElement) {
      delta.pairs.push({
        from: fromElement,
        to: element,
      });
    }
    // Otherwise this is a newly added element
    else {
      delta.added.push({ element });
    }
  });

  // All of the elements still remaining in the fromMap are elements
  // that were removed
  Object.values(fromMap).forEach((elements) => {
    elements.forEach((element) => {
      if (element !== null) delta.removed.push({ element });
    });
  });

  return delta;
}
