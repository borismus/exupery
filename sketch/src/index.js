class QuickDrawDatabase {
  constructor(databasePath) {
    this.databasePath = databasePath;
  }

  /**
   * Return a random sketch with the specified label.
   */
  getRandomSketch(opt_label) {
  }
}


class SketchPlayer {
  constructor(strokeData, opt_options) {
    // Array of all strokes.
    this.strokes = strokeData;

    let options = opt_options || {};
    let selector = options.selector || 'canvas';

    this.canvas = document.querySelector(selector);

    // Current playback time.
    this.currentTime = 0;
    // Whether or not we're currently playing.
    this.isPlaying = false;
    // When was the RAF last called, null if it never was.
    this.lastTimestamp = null;
    // How fast to playback.
    this.playbackSpeed = options.playbackSpeed || 2;

    this.duration = this.calculateDuration_();
    this.bounds = this.calculateBounds_();
    this.padding = {
      x: 50,
      y: 50,
    }

    this.canvas.width = this.bounds.width + this.padding.x * 2;
    this.canvas.height = this.bounds.height + this.padding.y * 2;
  }

  start() {
    this.currentTime = 0;
    this.isPlaying = true;
    requestAnimationFrame(this.loop_.bind(this));
  }

  stop() {
    this.isPlaying = false;
    this.currentTime = 0;
  }

  calculateDuration_() {
    let endTimes = this.strokes.map(stroke => {
      let ts = stroke[2];
      return ts[ts.length - 1];
    });
    return max(endTimes) / 1000.0;
  }

  calculateBounds_() {
    let min = {
      x: Infinity,
      y: Infinity,
    };
    let max = {
      x: -Infinity,
      y: -Infinity,
    }
    for (let stroke of this.strokes) {
      for (let x of stroke[0]) {
        if (x < min.x) {
          min.x = x;
        }
        if (x > max.x) {
          max.x = x;
        }
      }
      for (let y of stroke[1]) {
        if (y < min.y) {
          min.y = y;
        }
        if (y > max.y) {
          max.y = y;
        }
      }
    }
    return {
      x: min.x,
      y: min.y,
      width: max.x - min.x,
      height: max.y - min.y,
    }
  }

  loop_(timestamp) {
    if (this.isPlaying) {
      requestAnimationFrame(this.loop_.bind(this));
    }

    if (this.lastTimestamp == null) {
      this.lastTimestamp = timestamp;
      return;
    }

    // Advance the current time and see which strokes need to be drawn.
    let delta = (timestamp - this.lastTimestamp) / 1000.0;
    let startTime = this.currentTime;
    let endTime = startTime + delta * this.playbackSpeed;

    // If we're done, stop looping.
    if (this.currentTime > this.duration) {
      this.stop();
    }

    // Which points should be drawn?
    let lines = this.getLinesBetween_(startTime, endTime + 0.1);
    if (lines.length > 0) {
      console.log(`Found ${lines[0].length} points between ${startTime} and ${endTime}.`);
    }
    this.renderLines_(lines);

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
  getLinesBetween_(startTime, endTime) {
    let lines = [];

    for (let stroke of this.strokes) {
      let xs = stroke[0];
      let ys = stroke[1];
      let ts = stroke[2];
      let line = [];

      for (let i = 0; i < xs.length; i++) {
        let x = xs[i];
        let y = ys[i];
        let t = ts[i] / 1000.0;

        if (startTime < t && t < endTime) {
          line.push({x: x, y: y});
        }
      }

      if (line.length != 0) {
        lines.push(line);
      }
    }
    return lines;
  }

  renderLines_(lines) {
    let ctx = this.canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    for (let line of lines) {
      ctx.beginPath();
      for (let point of line) {
        let x = point.x - this.bounds.x + this.padding.x;
        let y = point.y - this.bounds.y + this.padding.y;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

function max(array) {
  let out = -Infinity;
  for (let val of array) {
    if (val > out) {
      out = val;
    }
  }
  return out;
}

fetch('results-20170502-142318.json').then(response => {
  return response.json();
}).then(json => {
  let strokes = JSON.parse(json.i);
  let player = new SketchPlayer(strokes);
  player.start();
});
