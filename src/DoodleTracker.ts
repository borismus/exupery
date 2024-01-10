import {Rect, Size} from './Utils';
/**
 * Keeps track of everything that has been drawn, and can return a blank canvas
 * of some specified size.
 */
export default class DoodleTracker {
  usedRects: Array<Rect>

  constructor() {
    this.usedRects = [];
  }

  clear() {
    this.usedRects = [];
  }

  addRect(rect: Rect) {
    this.usedRects.push(rect);
  }

  getFreeRect(size: Size) {
    // Look for an empty space somewhere randomly, then make sure it doesn't
    // intersect with any existing rectangles. Do this brute forcely for now,
    // since the canvas should be pretty sparse.

    while (true) {
      // Pick random coordinates for a rectangle, ensuring it all fits within
      // [0, 1]^2.
      let x = Math.random() * (1 - size.width);
      let y = Math.random() * (1 - size.height);
      let candidateRect = new Rect(x, y, size.width, size.height);

      // If the candidate rect doesn't intersect with any existing rectangle,
      // we're golden!
      let isIntersection = true;
      for (let rect of this.usedRects) {
        if (rect.intersects(candidateRect)) {
          isIntersection = false;
          break;
        }
      }
      if (isIntersection) {
        return candidateRect;
      }
    }
  }
}
