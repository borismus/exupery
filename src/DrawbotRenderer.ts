import {Point, Rect} from './Utils';
const URL = 'http://localhost:8080/v1/pen';


// TODO(smus): Measure a wide post-it note.
const DEFAULT_DIMENSIONS = {
  width: 138,
  height: 67
};

const MAX_DIMENSIONS = {
  width: 300,
  height: 200,
}

interface Size {
  width: number
  height: number
}

interface Options {
  canvasDimensions: Size
}

export default class DrawbotRenderer {
  canvasDimensions: Size
  isLowered: boolean
  commandQueue: Array<Function>
  bounds: Rect

  constructor(options:Options) {
    // Dimensions of the canvas (in mm).
    this.canvasDimensions = options.canvasDimensions || DEFAULT_DIMENSIONS;

    // Whether or not the pen is lowered.
    this.isLowered = undefined;

    // Start with the pen raised.
    this.raisePen();

    // Make a command queue. We mustn't overwhelm the Drawbot with too many
    // commands at once, so rather than sending them in real time, queue them
    // up! This is actually an array of functions.
    this.commandQueue = [];
  }

  renderLines(lines: Array<Array<Point>>) {
    this.queueCommand(this.raisePen);
    for (let line of lines) {
      let isFirstPoint = true;
      for (let point of line) {
        // Get the x and y as a percentage of the full bounds.
        let xp = (point.x - this.bounds.x) / this.bounds.width;
        let yp = (point.y - this.bounds.y) / this.bounds.height;
        console.log(`Drawing point at (${xp}, ${yp}).`);

        // TODO(smus): calculate the proper percentages based on the size of the
        // target drawing surface.
        // For now, draw at 1/10th the size.
        xp *= 0.1
        yp *= 0.1

        this.queueCommand(this.setPosition, xp * 100, yp * 100);

        // After moving to the first point, make sure we lower the pen.
        if (isFirstPoint) {
          this.queueCommand(this.lowerPen);
          isFirstPoint = false;
        }
      }
      // After we're done drawing the line, raise the pen.
      this.queueCommand(this.raisePen);
    }
  }

  finish() {
    console.log('Drawbot rendering complete!');
    this.queueCommand(this.setPosition, 0, 0);
    this.queueCommand(this.unlockMotors);
  }

  unlockMotors() {
    let url = 'http://localhost:8080/v1/motors';
    let params = {
      method: 'DELETE',
    };
    return fetch(url, params);
  }

  setBounds(size) {
    console.log(`Setting bounds to: ${size}.`);
    this.bounds = size;
  }

  raisePen() {
    // If already raised, do nothing.
    if (this.isLowered !== true) {
      return Promise.resolve('Already raised.');
    }
    this.isLowered = false;
    return this.makePenRequest_({
      state: 'up'
    });
  }

  lowerPen() {
    // If already lowered, do nothing.
    if (this.isLowered === true) {
      return Promise.resolve('Already lowered.');
    }
    this.isLowered = true;
    return this.makePenRequest_({
      state: 'draw'
    });
  }

  /**
   * Sets the position of the pen, where x and y are percentages in [0, 100].
   */
  setPosition(x, y) {
    return this.makePenRequest_({
      x: x,
      y: y
    });
  }

  setPenHeight_(height) {
    return this.makePenRequest_({
      state: height,
    });
  }

  makePenRequest_(obj) {
    let headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let params = {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(obj),
    };
    return fetch(URL, params);
  }

  private queueCommand(func: Function, ...args: any[]) {
    let closure = () => {
      console.log(`Evaluating queued ${func.name} with ${args}.`);
      return func.apply(this, args);
    };
    this.commandQueue.push(closure);
    console.log(`Queued up ${func.name}. Queue size: ${this.commandQueue.length}.`);

    // If there's only one value in the queue, start evaluating it. Otherwise,
    // assume it's already being evaluated.
    if (this.commandQueue.length == 1) {
      console.log('Starting to evaluate command queue.');
      this.processCommandQueue_();
    }
  }

  processCommandQueue_() {
    if (this.commandQueue.length == 0) {
      // Nothing more to process, so we're done.
      console.log('Command queue finished.');
      return;
    }
    let command = this.commandQueue[0];
    // Run command, continue processing the queue when the promise resolves.
    command().then(e => {
      this.commandQueue.splice(0, 1);
      this.processCommandQueue_();
    });
  }
}
