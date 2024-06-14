import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Format language tag (RFC 5646). Assuming "language-coutry". No validation.
   * Cmp. https://tools.ietf.org/html/rfc5646
   * @param {string} languageCode Language tag.
   * @returns {string} Formatted language tag.
   */
  static formatLanguageCode(languageCode) {
    if (typeof languageCode !== 'string') {
      return languageCode;
    }

    /*
     * RFC 5646 states that language tags are case insensitive, but
     * recommendations may be followed to improve human interpretation
     */
    const segments = languageCode.split('-');
    segments[0] = segments[0].toLowerCase(); // ISO 639 recommendation
    if (segments.length > 1) {
      segments[1] = segments[1].toUpperCase(); // ISO 3166-1 recommendation
    }
    languageCode = segments.join('-');

    return languageCode;
  }

  /**
   * Handle once visible in content DOM.
   * @param {HTMLElement} contentDOM Content DOM.
   * @param {function} callback Callback function.
   */
  static handleOnceVisible(contentDOM, callback = () => {}) {
    if (!contentDOM || Util.onceVisibleObserver) {
      return;
    }

    // idleCallback prevents timing issues when embedding content
    const idleCallback = window.requestIdleCallback ?
      window.requestIdleCallback :
      window.requestAnimationFrame;

    idleCallback(() => {
      Util.onceVisibleObserver = Util.onceVisibleObserver ||
        new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting) {
            Util.onceVisibleObserver.disconnect();
            Util.onceVisibleObserver = true;

            callback();
          }
        }, {
          root: document.documentElement,
          threshold: 0
        });

      Util.onceVisibleObserver.observe(contentDOM);
    });
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }

  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
  }

  /**
   * Fill canvas context with wrapping text.
   * @param {object} params Parameters.
   */
  static fillTextWrap(params = {}) {
    params = Util.extend({
      text: '', x: 0, y: 0, maxWidth: Infinity, lineHeight: 16
    }, params);

    if (!(params.context instanceof CanvasRenderingContext2D)) {
      return; // No context found.
    }

    const words = params.text.split(' ');
    let line = words.shift();

    words.forEach((word) => {
      const testLine = `${line} ${word}`;
      const testWidth = params.context.measureText(testLine).width;

      if (testWidth > params.maxWidth) {
        params.context.fillText(line, params.x, params.y);
        line = word;
        params.y += params.lineHeight;
      }
      else {
        line = testLine;
      }
    });

    params.context.fillText(line, params.x, params.y);
  }

  /**
   * Wait for time in milliseconds.
   * @param {number} timeMS Time in milli seconds.
   * @returns {object} Dummy return value.
   */
  static async delay(timeMS) {
    return await new Promise((resolve) => {
      setTimeout(resolve, timeMS);
    });
  }
}
