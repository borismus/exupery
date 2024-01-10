import {EventEmitter} from 'eventemitter3';

window.SpeechRecognition =
  window.webkitSpeechRecognition || window.SpeechRecognition;

const COMMANDS = [
  {name: 'repeat', synonyms: [ 'again', 'more', 'another' ]},
  {name: 'random', synonyms: [ 'anything', 'something' ]}
];

/**
 * Emits events as the speech proceeds:
 *
 * - idle: The speech recognizer is idle and ready to be spoken to.
 * - listening: The speech recognizer heard someone and is now listening
 *   intently for additional speech.
 * - result: Heard a relevant label or command.
 */
export default class LabelSpeechRecognizer extends EventEmitter {
  recognition: SpeechRecognition
  labels: Array<string>
  isRunning: boolean
  isSomeoneSpeaking: boolean
  isPaused: boolean

  constructor() {
    super();
    console.log('hi');
    var recognition = new window.SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.addEventListener('result', this.onResult.bind(this));
    recognition.addEventListener('start', this.onStart.bind(this));
    recognition.addEventListener('end', this.onEnd.bind(this));

    this.recognition = recognition;
    this.labels = [];
    this.isRunning = false;
    this.isSomeoneSpeaking = false;
    this.isPaused = false;
  }

  start() {
    if (this.isRunning) {
      return;
    }
    console.log('Starting speech recognition.');
    this.recognition.start();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  setLabels(labels: Array<string>) {
    this.labels = labels;
  }

  private onStart() {
    this.isRunning = true;
    this.emit('start');
  }

  private onResult(e: SpeechRecognitionEvent) {
    if (this.isPaused) {
      return;
    }
    let maxScore = -Infinity;
    let bestLabel = null;

    // Get the last result.
    let lastResult = e.results[ e.results.length - 1 ];
    for (let alternative of lastResult) {
      if (!this.isSomeoneSpeaking) {
        // Suddenly someone is speaking! Emit an event.
        this.emit('listening');
        this.isSomeoneSpeaking = true;
      }
      let transcript = alternative.transcript.toLowerCase();
      let spokenWords = transcript.trim().split(' ');
      let score = alternative.confidence;
      console.log('Speech alternative', alternative);
      // See if we have a command.
      for (let command of COMMANDS) {
        let command_variants = getCommandVariants(command);
        for (let variant of command_variants) {
          if (spokenWords.indexOf(variant) != -1) {
            this.emitResult({
              value: command.name,
              type: 'command'
            });
            return;
          }
        }
      }
      for (let label of this.labels) {
        let labelWords = label.split(' ');
        if (labelWords.length > 1) {
          // For multiple word cases, match against the whole phrase.
          if (transcript.indexOf(label) != -1) {
            if (score > maxScore) {
              maxScore = score;
              bestLabel = label;
            }
          }
        } else {
          // For single words, match for precise words.
          if (spokenWords.indexOf(label) != -1) {
            if (score > maxScore) {
              maxScore = score;
              bestLabel = label;
            }
          }
        }
      }
    }

    if (bestLabel) {
      // Found a matching label.
      this.emitResult({
        value: bestLabel,
        type: 'label'
      });
    }
  }

  private emitResult(resultInfo) {
    this.emit('result', resultInfo);
    this.emit('idle');
    this.isSomeoneSpeaking = false;
  }

  private onEnd(e: SpeechRecognitionEvent) {
    console.log('onEnd_', e);
    this.isRunning = false;

    // Restart recognition. Keep it going!
    this.start();
  }

}

function getCommandVariants(command) {
  let out = command.synonyms.slice(0);
  out.push(command.name);
  return out;
}
