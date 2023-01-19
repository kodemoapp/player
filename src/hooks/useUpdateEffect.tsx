import React from 'react';

/**
 * A custom useEffect hook that only triggers on updates, not on initial mount
 * Source: https://stackoverflow.com/questions/55075604/react-hooks-useeffect-only-on-update
 *
 * @param {Function} effect
 * @param {Array<any>} dependencies
 */
export default function useUpdateEffect(effect: () => void, dependencies = []) {
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      return effect();
    }
  }, dependencies);
}
