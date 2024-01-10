import CanvasRenderer from './CanvasRenderer';
import {EventEmitter} from 'eventemitter3';
import SketchPlayer from './SketchPlayer';
import {Point} from './Utils';

/**
 * Sketches a pencil/pen that is then used for future drawings. This is done at
 * the intro screen. Once the writing utensil is complete, it move around with
 * the actual pen as future sketches are created.
 */
export default class SelfDrawingPencil extends EventEmitter {
  selector: string
  penOrigin: Point
  canvasRenderer: CanvasRenderer

  constructor(selector: string) {
    super();
    this.selector = selector;
    this.canvasRenderer = new CanvasRenderer(this.selector);
    this.canvasRenderer.setStrokeStyle('red');
  }

  /**
   * Origin is the position (in relative coordinates) of the pencil point.
   */
  create(strokes: Array<Array<Array<number>>>, origin: Point) {
    this.penOrigin = origin;

    let sketchPlayer = new SketchPlayer({
      renderers: [this.canvasRenderer],
      playbackSpeed: 3,
      isPerfectPlayback: true,
    });

    sketchPlayer.load(strokes);
    sketchPlayer.start();
    sketchPlayer.on('end', () => {
      this.emit('created');
    });
  }

  /**
   * Given that the point is in NDC, we need to convert.
   */
  setPosition(point: Point, mainCanvas: HTMLCanvasElement) {
    let el = this.canvasRenderer.getCanvasElement();
    el.style.position = 'absolute';

    let penLeft = -this.penOrigin.x * el.offsetWidth;
    let penTop = -this.penOrigin.y * el.offsetHeight;

    let left = point.x + mainCanvas.offsetLeft + penLeft;
    let top = point.y + mainCanvas.offsetTop + penTop;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  setDrawingState(isDrawing: boolean) {
    let el = this.canvasRenderer.getCanvasElement();
    if (isDrawing) {
      el.classList.add('drawing');
    } else {
      el.classList.remove('drawing');
    }
  }
}
