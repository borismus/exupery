/**
 * X20 does not like the fetch API. Using this as a kludge.
 */
export function fetchJson(url: string, isNDJson: boolean=false) {
  return new Promise((resolve, reject) => {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function(e) {
      let data = null;
      if (xhr.status == 200) {
        try {
          if (isNDJson) {
            let lines = xhr.response.split('\n');
            data = lines.map((line: string) => { return JSON.parse(line); });
          } else {
            data = JSON.parse(xhr.response);
          }
          resolve(data);
        } catch(e) {
          reject(`Failed to parse JSON at ${url}: ${e}.`);
        }
        resolve(data);
      } else {
        reject(`Failed statusCode: ${xhr.status}.`);
      }
    };

    xhr.send();

  });
}

export function calculateBounds(strokes: Array<Array<Array<number>>>) {
  let min = {
    x: Infinity,
    y: Infinity,
  };
  let max = {
    x: -Infinity,
    y: -Infinity,
  }
  for (let stroke of strokes) {
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
  return new Rect(min.x, min.y, max.x - min.x, max.y - min.y);
}

export function randomChoice(array: Array<any>) {
  let index = Math.floor(Math.random() * array.length);
  return array[index];
}


export class Rect {
  x: number
  y: number
  width: number
  height: number

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  multiply(width: number, height: number) {
    return new Rect(this.x * width, this.y * height,
      this.width * width, this.height * height);
  }

  pad(padX: number, padY: number) {
    return new Rect(this.x - padX, this.y - padY,
      this.width - 2*padX, this.height - 2*padY);
  }

  left() { return this.x; }
  top() { return this.y; }
  bottom() { return this.y + this.height; }
  right() { return this.x + this.width; }

  intersects(rect: Rect) {
    return (this.left() <= rect.right() &&
      rect.left() <= this.right() &&
      this.top() <= rect.bottom() &&
      rect.top() <= this.bottom() );
  }

  static copy(rect: Rect) {
    return new Rect(rect.x, rect.y, rect.width, rect.height);
  }
}

export class Point {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  scale(w: number, h: number) {
    let out = new Point(this.x, this.y);
    out.x *= w;
    out.y *= h;
    return out;
  }
}

export class Size {
  width: number
  height: number

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
}
