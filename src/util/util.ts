import md5 from 'md5';
import { slugify } from '@kodemo/util';
import { ISubject } from '../KodemoPlayer';

/**
 * Sorts a key:value map of items based on an index array.
 *
 * @param {Object} items A key value map of items to sort
 * @param {Array} index An array containing keys in the order that
 * they should be sorted
 *
 * @returns An array containing the entries of items ordered by the
 * given index
 */
export const getOrderedCollectionAsEntries = (items: object, index: Array<string> = []): Array<[string, any]> => {
  const orderedItems: Array<[string, any]> = [];

  orderedItems.push(
    ...Object.entries(
      index.reduce((unorderedItems: any, key: string) => {
        // Retrieve and remove the item from the unordered list
        const { [key]: value, ...rest } = unorderedItems;

        // If a value existed at the index, push it to the ordered list
        if (value) orderedItems.push([key, value]);

        // Continue matching indexes to the remaining unordered items
        return rest;
      }, items)
    )
  );

  return orderedItems;
};

export const generateSubjectID = ({ subjectCount }: { subjectCount: number }): string => {
  return md5(`${subjectCount}-${Date.now()}`) as string;
};

export const generateVersionID = ({ subjectId, versionCount }: { subjectId: string; versionCount: number }): string => {
  return md5(`${subjectId}-${versionCount}-${Date.now()}`) as string;
};

/**
 * Draws a rounded rectangle path on the given canvas 2d
 * context.
 */
export const drawRoundedRect = function (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
};
