import CanvasRenderer from './CanvasRenderer';
import DrawbotControls from './DrawbotControls';
import DrawbotRenderer from './DrawbotRenderer';
import DoodleTracker from './DoodleTracker';
import HersheyFontRenderer from './HersheyFontRenderer';
import LabelSpeechRecognizer from './LabelSpeechRecognizer';
import MicrophoneSketch from './MicrophoneSketch';
import QuickDrawDatabase from './QuickDrawDatabase';
import SelfDrawingPencil from './SelfDrawingPencil';
import SketchPlayer from './SketchPlayer';
import StateMachine from './StateMachine';
import {randomChoice, Point, Rect} from './Utils';

const DRAWING_RECT = new Rect(0.1, 0.1, 0.8, 0.6);
const LABEL_RECT = new Rect(0.2, 0.8, 0.6, 0.08);
const QUESTION_RECT = new Rect(0.95, 0.02, 0.03, 0.03);

// Which doodles to draw when bored.
const BORED_LABELS = ['zigzag', 'squiggle', 'line', 'snowflake',
  'animal migration'];

// Root coordinates of the pen.
const PEN_COORDS = new Point(0.8, 1);
// Two points for the microphone.
const MIC_POINTS = [new Point(0.25, 0.18), new Point(0.6, 0.18)];

let db: QuickDrawDatabase = null;
let player: SketchPlayer = null;
let reco: LabelSpeechRecognizer = null;
let fontRenderer = new HersheyFontRenderer();
let microphone = new MicrophoneSketch('#microphone');
let pencil = new SelfDrawingPencil('canvas#pencil');
let sm = new StateMachine();
let tracker = new DoodleTracker();


function init() {
  sm.setState('inactive');

  db = new QuickDrawDatabase('labels.json');
  db.load().then(e => {
    console.log('Loaded labels.');
    reco.setLabels(db.getLabels());
  });

  let canvasRenderer = new CanvasRenderer('canvas#display');
  if (getQueryParameter('drawbot')) {
    let drawbotRenderer = new DrawbotRenderer(
      {canvasDimensions: {width: 138, height: 67}});
    player = new SketchPlayer({
      renderers: [drawbotRenderer, canvasRenderer],
      playbackSpeed: 1,
      isPerfectPlayback: false,
    });

    // Debug only:
    let controls = new DrawbotControls({
      selector: '#controls',
      renderer: drawbotRenderer,
    });
  } else {
    // First show the splash screen where the self drawing pen draws itself.
    db.getRandomSketch('pencil', 0).then(sketch => {
      pencil.create(sketch, PEN_COORDS);
    })
    pencil.on('created', () => {
      // Show the begin button.
      document.querySelector('button').style.visibility = 'visible';
    });

    player = new SketchPlayer({
      renderers: [canvasRenderer],
      playbackSpeed: 2.0,
      isPerfectPlayback: true,
    });

    canvasRenderer.on('position', (position: Point) => {
      pencil.setPosition(position, canvasRenderer.getCanvasElement());
    });
    canvasRenderer.on('up', () => { pencil.setDrawingState(false); });
    canvasRenderer.on('down', () => { pencil.setDrawingState(true); });
  }

  reco = new LabelSpeechRecognizer();
  reco.on('start', e => {
    sm.setState('idle');
  });
  reco.on('listening', e => {
    sm.setState('listening');
  });
  reco.on('result', result => {
    if (result.type == 'command') {
      if (result.value == 'repeat') {
        onLabel(db.getLastLabel());
      } else if (result.value == 'random') {
        onLabel(db.getRandomLabel());
      }
    } else if (result.type == 'label') {
      onLabel(result.value)
    }
  });

  window.addEventListener('click', onStart);

  sm.on('stateChange', state => {
    console.log('StateMachine stateChange: ', state);
    if (state == 'idle') {
      microphone.setListening(true);
    } else if (state == 'drawing') {
      microphone.setListening(false);
    }
  });

  sm.on('doodle', () => {
    // Draw a doodle.
    drawRandomDoodle();
  });
}

function onStart() {
  // Only do this once.
  window.removeEventListener('click', onStart);

  // Sketch the microphone.
  let renderer = microphone.canvasRenderer;
  renderer.on('position', (position: Point) => {
    pencil.setPosition(position, renderer.getCanvasElement());
  });
  renderer.on('up', () => { pencil.setDrawingState(false); });
  renderer.on('down', () => { pencil.setDrawingState(true); });

  db.getRandomSketch('microphone', 23).then(sketch => {
    microphone.create(sketch, MIC_POINTS);
  });
  microphone.on('created', () => {
    reco.start();
  });
  (<HTMLElement>document.querySelector('canvas#display')).style.display = 'inline';
  (<HTMLElement>document.querySelector('#begin')).style.display = 'none';

  window.addEventListener('click', onClick);
}

function onClick() {
  let state = sm.getState();
  if (state == 'idle' || state == 'bored') {
    onLabel(null);
  }
}

function onLabel(label: string) {
  //console.log('Got Label', label);
  player.clear();

  // Restart the tracker.
  tracker.clear();
  tracker.addRect(DRAWING_RECT);
  tracker.addRect(LABEL_RECT);

  db.getRandomSketch(label).then(strokes => {
    player.load(strokes, DRAWING_RECT);
    player.start();

    // Pause recognition. We're drawing now!
    reco.pause();
    sm.setState('drawing');

    // When drawing finishes, render the label.
    player.once('end', () => {
      let label = db.getLastLabel();
      let strokes = fontRenderer.getStrokes(label);
      console.log(`Using ${strokes.length} strokes to render "${label}".`);

      player.load(strokes, LABEL_RECT);
      player.start();

      player.once('end', () => {
        sm.setState('idle');
        reco.resume();

        let question = fontRenderer.getStrokes('?');
        player.load(question, QUESTION_RECT);
        player.start();
      })
    });
  });
}

function getQueryParameter(name: string) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function drawRandomDoodle() {
  // Draw a random zigzag somewhere.
  let rect = tracker.getFreeRect({width: 0.05, height: 0.05});
  tracker.addRect(rect);
  db.getRandomSketch(randomChoice(BORED_LABELS)).then(strokes => {
    player.load(strokes, rect);
    player.start();
  });
}


window.addEventListener('load', init);
