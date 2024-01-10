import {calculateBounds, Point, Rect} from './Utils';
import {EventEmitter} from 'eventemitter3';

interface Options {
  renderers: Array<any>
  isPerfectPlayback: boolean
  playbackSpeed: number
}

export default class SketchPlayer extends EventEmitter {
  currentTime: number
  isPlaying: boolean
  lastTimestamp: number
  duration: number
  playbackSpeed: number
  renderers: Array<any>
  // Array of strokes, each of which is an array of arrays.
  strokes: Array<Array<Array<number>>>
  bounds: Rect
  requestId: number
  isPerfectPlayback: boolean

  constructor(options: Options) {
    super();
    this.renderers = options.renderers;
    this.isPerfectPlayback = options.isPerfectPlayback;

    // Current playback time.
    this.currentTime = 0;
    // Whether or not we're currently playing.
    this.isPlaying = false;
    // When was the RAF last called, null if it never was.
    this.lastTimestamp = null;
    // How fast to playback.
    this.playbackSpeed = options.playbackSpeed || 1;
  }

  clear() {
    for (let renderer of this.renderers) {
      renderer.clear();
    }
  }

  /**
   * Loads an array of strokes to be drawn at the specified drawing area.
   * drawRect is a rectangle within the unit square, which is then scaled
   * depending on the renderer that we use.
   *
   * If the aspect ratio of the targetRect doesn't match the bounds of the
   * drawing, we scale the image down to fit inside the bounds. For instance, if
   * drawRect is [0.2, 0.2, 0.6, 0.6] (centered square), but our image bound
   * ends up being 2:1, we will end up with a 0.15 padding on the top and bottom
   * of the image.
   */
  load(strokes: Array<Array<Array<number>>>, idealRect: Rect=new Rect(0,0,1,1)) {
    // Array of all strokes.
    this.strokes = strokes;

    this.duration = this.calculateDuration();

    // Get the extents of the rectangle.
    this.bounds = calculateBounds(strokes);

    // Take into account aspect ratio of strokeRect to get the unitStrokeRect.
    let sourceAspect = this.bounds.width / this.bounds.height;
    let targetRect = Rect.copy(idealRect);
    let targetAspect = targetRect.width / targetRect.height;
    //console.log(`sourceAspect: ${sourceAspect}, targetAspect: ${targetAspect}.`);
    if (sourceAspect > targetAspect) {
      // Horizontal image means we have top and bottom padding.
      let newHeight = targetAspect/sourceAspect * targetRect.height;
      let delta = targetRect.height - newHeight;
      targetRect.y += delta/2;
      targetRect.height = newHeight;
    } else {
      // Vertical image means we have left and right padding.
      let newWidth = sourceAspect/targetAspect * targetRect.width;
      let delta = targetRect.width - newWidth;
      targetRect.x += delta/2;
      targetRect.width = newWidth;
    }

    //console.log(`targetRect dimensions: ${JSON.stringify(targetRect)}.`);

    for (let renderer of this.renderers) {
      renderer.setTargetRect(targetRect);
      // Debug only:
      //renderer.renderDrawRect();
    }
  }

  start() {
    this.currentTime = 0;
    this.isPlaying = true;
    this.lastTimestamp = null;
    this.requestId = requestAnimationFrame(this.loop.bind(this));
    this.emit('start');
  }

  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    cancelAnimationFrame(this.requestId);
  }

  private calculateDuration() {
    let endTimes = this.strokes.map((stroke: Array<Array<number>>) => {
      let ts = stroke[2];
      return ts[ts.length - 1];
    });
    return max(endTimes) / 1000.0;
  }

  private loop(timestamp: number) {
    if (!this.lastTimestamp) {
      //console.log('lastTimestamp not set yet. Setting to', timestamp);
      this.lastTimestamp = timestamp;
      this.requestId = requestAnimationFrame(this.loop.bind(this));
      return;
    }

    // Advance the current time and see which strokes need to be drawn.
    let delta = (timestamp - this.lastTimestamp) / 1000.0;
    let startTime = this.currentTime;
    let endTime = startTime + delta * this.playbackSpeed;

    // If we're done, stop looping.
    if (this.currentTime > this.duration) {
      for (let renderer of this.renderers) {
        renderer.finish();
      }
      this.stop();
      this.emit('end');
      return;
    }

    // Which points should be drawn?
    let lines = null;
    if (this.isPerfectPlayback) {
      lines = this.getLinesBetween(startTime, endTime, true);
    } else {
      lines = this.getCompleteLinesBetween(startTime, endTime, true);
    }

    if (lines.length > 0) {
      //console.log(`Found ${lines[0].length} points between ${startTime} and ${endTime}.`);
      for (let renderer of this.renderers) {
        renderer.renderLines(lines);
      }
    }

    if (this.isPlaying) {
      this.requestId = requestAnimationFrame(this.loop.bind(this));
    }
    this.lastTimestamp = timestamp;
    this.currentTime = endTime;
  }

  /**
   * Gets the lines between two times. If the times are close together, we
   * expect a single line (this is the usual case). But in some cases, you may
   * have multiple lines (eg. if the times are far apart) or no lines (if they
   * are too close together). Each line is an array of points. Each point is an
   * object with {x,y} properties.
   */
  private getLinesBetween(startTime: number, endTime: number, normalize=false) {
    let lines = [];

    for (let stroke of this.strokes) {
      let xs = stroke[0];
      let ys = stroke[1];
      let ts = stroke[2];
      let line = [];

      let i;
      for (i = 0; i < xs.length; i++) {
        let x = xs[i];
        let y = ys[i];
        let t = ts[i] / 1000.0;

        if (startTime <= t && t <= endTime) {
          let x2 = xs[i+1];
          let y2 = ys[i+1];
          if (normalize) {
            x = (x - this.bounds.x) / this.bounds.width;
            y = (y - this.bounds.y) / this.bounds.height;
            x2 = (x2 - this.bounds.x) / this.bounds.width;
            y2 = (y2 - this.bounds.y) / this.bounds.height;
          }
          line.push(new Point(x, y));
          line.push(new Point(x2, y2));
        }
      }

      if (line.length != 0) {
        lines.push(line);
      }
    }
    return lines;
  }

  /**
   * Gets the complete line starting between a certain start and end time.
   */
  private getCompleteLinesBetween(startTime: number, endTime: number, normalize=false) {
    let lines = [];
    for (let stroke of this.strokes) {
      let ts = stroke[2];
      let t0 = ts[0] / 1000.0;
      if (startTime <= t0 && t0 <= endTime) {
        let line = [];
        // Convert the whole line into the expected format.
        for (let i = 0; i < ts.length; i++) {
          let x = stroke[0][i];
          let y = stroke[1][i];
          // If we normalize, bring the coordinates into [0, 1].
          if (normalize) {
            x = (x - this.bounds.x) / this.bounds.width;
            y = (y - this.bounds.y) / this.bounds.height;
          }
          line.push({x: x, y: y});
        }
        lines.push(line)
      }
    }
    return lines;
  }
}

function max(array: Array<number>) {
  let out = -Infinity;
  for (let val of array) {
    if (val > out) {
      out = val;
    }
  }
  return out;
}
