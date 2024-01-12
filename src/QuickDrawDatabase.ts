import {fetchJson, randomChoice} from './Utils';

const QUICKDRAW_ROOT = 'sketches';
// If words start with this, don't add an article.
const NO_ARTICLE_PREFIXES = ['The', 'animal migration']
// If words end with this, add an article, even though they end in 's'.
const SINGULAR_SUFFIXES = ['asparagus', 'bus', 'cactus', 'compass', 'hourglass',
  'octopus', 'rhinoceros', 'glass']
const VOWELS = ['a', 'e', 'i', 'o', 'u'];

export default class QuickDrawDatabase {
  labels: Array<any>
  labelUrl: string
  lastLabel: string

  constructor(labelUrl: string) {
    this.labelUrl = labelUrl;
    this.lastLabel = null;
  }

  load() {
    return fetchJson(this.labelUrl).then((json:Array<any>) => {
      this.labels = json;
      return json;
    });
  }

  /**
   * Return a random sketch with the specified label.
   */
  getRandomSketch(label="", index=null) {
    if (!label) {
      label = this.getRandomLabel();
    }
    this.lastLabel = label;

    let url = `${QUICKDRAW_ROOT}/${label}.ndjson`;
    return fetchJson(url, true).then((json: Array<any>) => {
      let sketch = index == null ? randomChoice(json) : json[index];
      return sketch.drawing;
    });
  }

  getLabels() {
    return this.labels;
  }

  getRandomLabel() {
    return randomChoice(this.labels);
  }

  getLastLabel() {
    return this.lastLabel;
  }

  getLastArticle() {
    let label = this.lastLabel;
    if (!label) {
      return '';
    }
    // First handle exceptions: words that don't need an article.
    for (let prefix of NO_ARTICLE_PREFIXES) {
      if (label.startsWith(prefix)) {
        return '';
      }
    }

    // Then deal with words that end with s, but keep in mind that there are
    // exceptions.
    for (let suffix of SINGULAR_SUFFIXES) {
      let lastLetter = label[label.length - 1];
      if (!label.endsWith(suffix) && lastLetter == 's') {
        return '';
      }
    }

    // The general case is that we need to decide between a and an, based on
    // whether or not the first letter is a vowel.
    let firstLetter = label[0];
    return (VOWELS.indexOf(firstLetter) >= 0 ? 'an' : 'a');
  }
}
