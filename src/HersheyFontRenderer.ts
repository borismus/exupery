import {EventEmitter} from 'eventemitter3';
import {calculateBounds, fetchJson} from './Utils';

// How long to draw each segment for, in seconds.
const SEGMENT_DURATION = 0.05;
// How wide is a space?
const SPACE_WIDTH = 10;

interface Options {
  fontName: string
}

const DEFAULT_OPTIONS = {
  fontName: 'cursive',
}

/**
 * Partially derived from https://github.com/techninja/hersheytextjs.
 * Which is in turn derived from
 * https://github.com/evil-mad/EggBot/blob/master/inkscape_driver/hersheydata.py.
 *
 * For our purposes, we need to parse SVG into canvas and actually do the
 * rendering ourselves.
 */
export default class HersheyFontRenderer extends EventEmitter {
  fonts: Array<Object>
  fontName: string

  constructor(options: Options=DEFAULT_OPTIONS) {
    super();
    this.fontName = options.fontName;

    // Load all of the fonts.
    fetchJson('/hersheytext.json').then((json: Array<Object>) => {
      console.log('Loaded fonts.', json);
      this.fonts = json;

      this.emit('ready');
    });
  }

  /**
   * Return the strokes that are expected for this font, in the same [X, Y, T]
   * format that SketchPlayer expects.
   */
  getStrokes(str: string) {
    let textStrokes = [];
    let font = this.fonts[this.fontName];
    let currentTime = 0;
    let offsetX = 0;
    for (let i = 0; i < str.length; i++) {
      let char = str[i];
      let index = str.charCodeAt(i) - 33;
      let glyph = font.chars[index];
      if (char == ' ') {
        // If it's a space, just offset it.
        offsetX += SPACE_WIDTH;
        continue;
      }
      if (!glyph) {
        console.warn(`No glyph found for character "${char}" in font
            ${this.fontName}.`);
        continue;
      }
      // Parse the svg glyph into multiple strokes in (xs, ys, ts) format.
      let strokes = parseSvgPathIntoStrokes(glyph.d)

      // Get the time for the last stroke.
      let lastStroke = strokes[strokes.length - 1];
      let lastTs = lastStroke[2];
      let lastTime = lastTs[lastTs.length - 1];

      // Run through all of the times, offsetting them by currentTime.
      // And also offset the x coordinates.
      for (let stroke of strokes) {
        for (let i = 0; i < stroke[2].length; i++) {
          stroke[2][i] += currentTime;
          stroke[0][i] += offsetX;
        }
      }

      let glyphSize = calculateBounds(strokes);

      // Add all of the new strokes to the complete output.
      for (let stroke of strokes) {
        textStrokes.push(stroke);
      }

      // Update the current time.
      currentTime += lastTime;
      // Offset the character.
      offsetX += glyphSize.width;
    }
    return textStrokes;
  }
}

/**
 * Given an SVG path, return an array of x and y coordinates.
 */
function parseSvgPathIntoStrokes(svgPath: string) {
  let currentTime = 0;
  let strokes = [];
  // First, split the glyph into multiple sub-paths.
  let svgSubPaths = svgPath.split('M');
  for (let svgSubPath of svgSubPaths) {
    if (svgSubPath == '') {
      continue;
    }
    let svgPoints = svgSubPath.split(/L| /);
    let xs = [];
    let ys = [];
    let ts = [];
    for (let svgPoint of svgPoints) {
      if (svgPoint == '') {
        continue;
      }
      let split = svgPoint.split(',');
      let x = parseFloat(split[0]);
      let y = parseFloat(split[1]);
      xs.push(x);
      ys.push(y);
      // Add a placeholder for time (to be populated later).
      ts.push(currentTime);
      // Times should be in millis for the SketchPlayer.
      currentTime += SEGMENT_DURATION * 1e3;
    }
    strokes.push([xs, ys, ts])
  }
  return strokes;
}
