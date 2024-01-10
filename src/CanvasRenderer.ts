import {EventEmitter} from 'eventemitter3';
import {Point, Rect} from './Utils';

/**
 * Renders strokes onto an HTMLCanvasElement.
 *
 * Emits current position.
 */
export default class CanvasRenderer extends EventEmitter {
  canvas: HTMLCanvasElement
  targetRect: Rect
  strokeStyle: string

  constructor(selector: string) {
    super();

    this.canvas = <HTMLCanvasElement> document.querySelector(selector);
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
  }

  clear() {
    let ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Bounds is the bounding rectangle representing the maximum size of the
   * image.
   */
  setTargetRect(rect: Rect) {
    this.targetRect = rect;
  }

  renderLines(lines: Array<Array<Point>>) {
    let ctx = this.canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.strokeStyle;

    for (let line of lines) {
      ctx.beginPath();
      this.emit('down');
      for (let point of line) {
        let x = (this.targetRect.x + point.x * this.targetRect.width) * this.canvas.width;
        let y = (this.targetRect.y + point.y * this.targetRect.height) * this.canvas.height;
        ctx.lineTo(x, y);
        this.emit('position', new Point(x, y));
      }
      ctx.stroke();
      this.emit('up');
    }
  }

  /**
   * Renders the boundaries of this canvas.
   */
  renderDrawRect() {
    let ctx = this.canvas.getContext('2d');
    let rect = this.targetRect.multiply(this.canvas.width, this.canvas.height);
    // Draw the bounds.
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "red";
    ctx.setLineDash([]);
    ctx.stroke();
  }

  finish() {
    //console.log('All done!');
  }

  getCanvasElement() {
    return this.canvas;
  }

  setStrokeStyle(style) {
    this.strokeStyle = style;
  }
}
