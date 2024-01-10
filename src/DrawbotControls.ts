import DrawbotRenderer from './DrawbotRenderer';

interface Options {
  selector: string
  renderer: DrawbotRenderer
}

/**
 * An interactive canvas for playing around with the Drawbot.
 */
export default class DrawbotControls {
  renderer: DrawbotRenderer

  constructor(options: Options) {
    let el = document.querySelector(options.selector);
    el.addEventListener('mousedown', this.onMouseDown.bind(this));
    el.addEventListener('mousemove', this.onMouseMove.bind(this));
    el.addEventListener('mouseup', this.onMouseUp.bind(this));
    el.addEventListener('mouseout', this.onMouseOut.bind(this));
    (<HTMLElement>el).style.display = 'block';

    this.renderer = options.renderer;
  }

  private onMouseDown(e: MouseEvent) {
    this.renderer.lowerPen();
  }

  private onMouseMove(e: MouseEvent) {
    // TODO(smus): Maybe it should be offset* instead of outer*.
    let xp = e.offsetX / (<HTMLElement> e.target).offsetWidth;
    let yp = e.offsetY / (<HTMLElement> e.target).offsetHeight;

    if (this.renderer.isLowered) {
      console.log(`Setting position to (${xp}, ${yp}).`);
      this.renderer.setPosition(xp * 100, yp * 100).then(e => {
        console.log('Position set successfully!');
      });
    }
  }

  private onMouseUp(e: MouseEvent) {
    this.renderer.raisePen();
  }

  private onMouseOut(e: MouseEvent) {
    console.log('onMouseOut_');
    //renderer.unlockMotors();
  }
}
