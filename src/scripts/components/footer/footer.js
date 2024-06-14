import Screenshot from '@services/screenshot.js';
import Util from '@services/util.js';
import './footer.scss';

/** Class representing a media screen */
export default class Footer {
  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = params;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-set-footer');

    /*this.logo = document.createElement('div');
    this.logo.classList.add('h5p-personality-quiz-set-footer-logo');
    this.dom.append(this.logo);

    this.text = document.createElement('div');
    this.text.classList.add('h5p-personality-quiz-set-footer-text');
    this.text.innerText = this.params.text ?? '';
    this.dom.append(this.text);*/
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get base64 image representation.
   * @returns {string} Base64 image representation.
   */
  async getBase64() {
    const domClone = this.dom.cloneNode(true);
    domClone.classList.add('export');
    domClone.classList.add('offscreen');
    document.body.append(domClone);

    await Util.delay(0);

    const screenshot = await Screenshot.takeScreenshot(
      { element: domClone, enforceImage: true, format: 'base64' }
    );

    domClone.remove();

    return screenshot;
  }
}
