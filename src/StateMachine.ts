import {EventEmitter} from 'eventemitter3';

// How often to doodle when you're bored.
const BORED_PERIOD = [5, 10];
/**
 * Exports stateChange events.
 */
export default class StateMachine extends EventEmitter {
  boredomTimer: number
  currentState: string

  constructor() {
    super();
  }

  setState(state: string) {
    if (this.currentState == state) {
      // Do nothing.
      return;
    }
    document.querySelector('#status-code').innerHTML = state;
    if (state == 'idle') {
      this.startBoredom();
    } else {
      this.stopBoredom();
    }

    this.currentState = state;
    this.emit('stateChange', this.currentState);
  }

  getState() {
    return this.currentState;
  }

  private startBoredom() {
    this.stopBoredom();
    this.boredomTimer = window.setTimeout(this.drawDoodle.bind(this),
      this.getBoredomDelay() * 1000);
  }

  private drawDoodle() {
    this.setState('bored');
    this.emit('doodle');

    this.stopBoredom();
    this.boredomTimer = window.setTimeout(this.drawDoodle.bind(this),
      this.getBoredomDelay() * 1000)
  }

  private stopBoredom() {
    clearTimeout(this.boredomTimer);
  }

  private getBoredomDelay() {
    let [min, max] = BORED_PERIOD;
    let delay = min + Math.random() * (max - min);
    console.log(`getBoredomDelay: ${delay}.`);
    return delay;
  }
}

