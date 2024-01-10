import CanvasRenderer from './CanvasRenderer';
import {EventEmitter} from 'eventemitter3';
import SketchPlayer from './SketchPlayer';
import {Point} from './Utils';

enum SpeakState {
  CAN_SPEAK = 1,
  SPEAKING,
  CANT_SPEAK
}

/**
 * Sketches a microphone which shows up when the user is expected to speak. It
 * has an animated membrane corresponding to the loudness of what it can hear.
 */
export default class MicrophoneSketch extends EventEmitter {
  selector: string
  canvasRenderer: CanvasRenderer
  levelPoints: Array<Point>
  levelCanvas: HTMLCanvasElement
  el: HTMLElement

  constructor(selector: string) {
    super();
    this.selector = selector;
    this.el = (<HTMLElement> document.querySelector(this.selector));

    this.canvasRenderer = new CanvasRenderer(`${this.selector} .mic-body`);
    this.canvasRenderer.setStrokeStyle('blue');

    let sel = `${this.selector} .mic-level`;
    this.levelCanvas = (<HTMLCanvasElement> document.querySelector(sel));
  }

  /**
   * Origin is the position (in relative coordinates) of the pencil point.
   */
  create(strokes: Array<Array<Array<number>>>, points: Array<Point>) {
    this.el.style.display = 'block';

    this.levelPoints = points;
    let sketchPlayer = new SketchPlayer({
      renderers: [this.canvasRenderer],
      playbackSpeed: 3,
      isPerfectPlayback: true,
    });

    sketchPlayer.load(strokes);
    sketchPlayer.start();
    sketchPlayer.on('end', this.onMicrophoneCreated.bind(this));
  }

  setListening(isListening: boolean) {
    if (isListening) {
      this.el.classList.add('listening')
      this.el.classList.remove('busy')
    } else {
      this.el.classList.remove('listening')
      this.el.classList.add('busy')
    }
  }

  private onMicrophoneCreated() {
    this.emit('created');

    // Start animating the wave line to indicate that you should speak.
    this.loop();
  }

  private loop() {
    let ctx = this.levelCanvas.getContext('2d');
    let w = this.levelCanvas.width;
    let h = this.levelCanvas.height;
    let yOffset = this.levelPoints[0].y;

    ctx.clearRect(0, 0, w, h);

    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    const t = new Date().valueOf() / 200;
    const amplitudeRange = [0.01, 0.02];
    let amplitude = amplitudeRange[0] + (1 + Math.sin(t)) * amplitudeRange[1];
    let data = this.getSineWave([this.levelPoints[0].x, this.levelPoints[1].x],
      amplitude);
    ctx.beginPath();
    for (let i = 0; i < data.length - 1; i++) {
      let point = data[i];
      let nextPoint = data[i+1];

      ctx.moveTo(point.x * w, (point.y + yOffset) * h);
      ctx.lineTo(nextPoint.x * w, (nextPoint.y + yOffset) * h);
    }
    ctx.stroke();

    requestAnimationFrame(this.loop.bind(this));
  }

  private getSineWave(range, amplitude) {
    const time = new Date().valueOf() / 3000;
    const total = 50.0;
    const span = range[1] - range[0];
    const periods = 6;

    let points = [];
    for (let i = 0; i < total; i++) {
      let x = range[0] + i/total * span;
      let t = x + time;
      let y = Math.sin(t * 2*Math.PI/span * periods) * amplitude;

      points.push(new Point(x, y));
    }
    return points;
  }
}
