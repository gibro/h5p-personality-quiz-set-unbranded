import Util from '@services/util.js';
import ChatMessage from '@components/chat-message/chat-message.js';
import './results.scss';

export default class Results {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onRestart] Callback when retry.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      libraryParams: {}
    }, params);

    this.callbacks = Util.extend({
      onRestart: () => {},
      onExportPDF: () => {}
    }, callbacks);

    this.dom = document.createElement('section');
    this.dom.classList.add('h5p-personality-quiz-set-results');

    this.reset();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Show.
   */
  show() {
    if (this.isShown) {
      return;
    }

    this.isShown = true;

    this.dom.classList.remove('display-none');

    if (this.introMessage) {
      this.introMessage.show();
    }
    else {
      this.showResults();
    }
  }

  /**
   * Hide.
   */
  hide() {
    if (this.isShown === false) {
      return;
    }

    this.isShown = false;

    this.resultsDOM.classList.add('display-none');
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   */
  reset() {
    this.dom.innerHTML = '';
    this.personalityImages = [];

    if (this.params.introText) {
      this.introMessage = new ChatMessage({
        globals: this.params.globals,
        text: this.params.introText
      }, {
        onMessageDone: () => {
          this.showResults();
        }
      });
      this.dom.append(this.introMessage.getDOM());
    }

    this.resultsDOM = document.createElement('ul');
    this.resultsDOM.classList.add('h5p-personality-quiz-set-results-panels');
    this.resultsDOM.classList.add('display-none');
    this.dom.append(this.resultsDOM);

    this.hide();
  }

  /**
   * Set results.
   * @param {object[]} results Results.
   */
  setResults(results) {
    const resultsParams = this.params.globals.get('params').results;

    // Prepare results
    this.results = results.map((result) => {
      // Purify title
      if (result.title) {
        result.title = Util.purifyHTML(result.title);
      }

      if (result.image?.file?.path) {
        const image = document.createElement('img');
        image.classList.add('h5p-personality-quiz-set-results-panel-image');
        image.setAttribute('alt', ''); // Merely decorational
        H5P.setSource(
          image, result.image.file, this.params.globals.get('contentId')
        );

        result.image = image;
      }
      else {
        delete result.image;
      }

      if (
        result.personality && (
          resultsParams.showPersonality ||
          !result.description && !result.image?.file?.path
        )
      ) {
        let personalityText = Util.purifyHTML(
          resultsParams.personalityTextPrefix ?? ''
        );
        if (personalityText.length > 0 && personalityText.slice(-1) !== ' ') {
          personalityText = `${personalityText} `;
        }
        personalityText =
          `${personalityText}${Util.purifyHTML(result.personality)}`;

        result.personality = personalityText;
      }

      return result;
    });

    this.resultsDOM.innerHTML = '';

    results.forEach((result) => {
      this.resultsDOM.append(this.createResultsPanel(result));
    });
  }

  /**
   * Get results dom prepared for export.
   * @returns {HTMLElement} Results DOM for export.
   */
  getExport() {
    const resultsDOM = this.resultsDOM.cloneNode(true);

    resultsDOM.style.background = '#ffffff';
    resultsDOM.style.boxShadow = 'none';
    resultsDOM.style.padding = '0';

    const title = resultsDOM.querySelector(
      '.h5p-personality-quiz-set-results-panel-title'
    );
    if (title) {
      title.style.fontSize = '1.5rem';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '1rem';
    }

    const personalities = resultsDOM.querySelectorAll(
      '.h5p-personality-quiz-set-results-panel-personality'
    );
    personalities.forEach((personality) => {
      personality.style.fontStyle = 'italic';
      personality.style.marginBottom = '0.5rem';
    });

    const panels = resultsDOM.querySelectorAll(
      '.h5p-personality-quiz-set-results-panel'
    );
    panels.forEach((panel) => {
      panel.style.marginBottom = '2rem';
    });

    return resultsDOM;
  }

  /**
   * Set exporting state.
   * @param {boolean} state Exporting state.
   */
  setExportingState(state) {
    if (state) {
      this.buttonExportPDF.setAttribute('disabled', 'disabled');
    }
    else {
      this.buttonExportPDF.removeAttribute('disabled');
    }

    this.buttonExportPDF.classList.toggle('is-exporting', state);
  }

  /**
   * Show results.
   */
  showResults() {
    this.resultsDOM.classList.remove('display-none');

    /*
     * Scale image proportionally while setting maxHeight. Would be easier with
     * object-fit, but then screenshots don't work.
     */
    window.requestAnimationFrame(() => {
      this.personalityImages.forEach((image) => {
        // quick and dirty coversion of rem (em treated as rem) to px or px directly...
        let maxHeight = getComputedStyle(image)
          .getPropertyValue('--max-height') ?? '10rem';

        if (maxHeight.slice(-2) === 'em') {
          const rootFontSize = parseFloat(
            getComputedStyle(document.documentElement).fontSize
          );
          maxHeight = rootFontSize * parseFloat(maxHeight);
        }
        else {
          maxHeight = parseFloat(maxHeight);
        }

        image.style.maxWidth =
          `min(100%, ${image.naturalWidth / image.naturalHeight * maxHeight}px)`;
      });
    });

    const buttonWrapper = document.createElement('div');
    buttonWrapper.classList.add('h5p-personality-quiz-set-results-buttons');
    this.dom.append(buttonWrapper);

    const buttonRestart = document.createElement('button');
    buttonRestart.classList.add('h5p-personality-quiz-set-results-button');
    buttonRestart.classList.add('restart');
    buttonRestart.innerText = this.params.dictionary.get('l10n.restart');
    buttonRestart.addEventListener('click', () => {
      this.callbacks.onRestart();
    });
    buttonWrapper.append(buttonRestart);

    this.buttonExportPDF = document.createElement('button');
    this.buttonExportPDF.classList.add('h5p-personality-quiz-set-results-button');
    this.buttonExportPDF.classList.add('export-pdf');

    this.buttonExportPDF.innerText = this.params.dictionary.get('l10n.exportPDF');
    this.buttonExportPDF.addEventListener('click', () => {
      this.callbacks.onExportPDF();
    });
    buttonWrapper.append(this.buttonExportPDF);

    this.params.globals.get('resize')();

    // This is not so good practice, but we need the focus on the text section
    this.resultsDOM.setAttribute('tabindex', '0');
    window.setTimeout(() => {
      this.resultsDOM.focus();
      this.resultsDOM.setAttribute('tabindex', '-1');
      window.requestAnimationFrame(() => {
        this.resultsDOM.blur();
      });
    }, 50); // Let resize do it's magic first
  }

  /**
   * Create results panel.
   * @param {object} params Parameters.
   * @returns {HTMLElement} Results panel.
   */
  createResultsPanel(params) {
    const resultsParams = this.params.globals.get('params').results;

    const resultsPanel = document.createElement('li');
    resultsPanel.classList.add('h5p-personality-quiz-set-results-panel');

    // Optional title
    if (params.title) {
      const title = document.createElement('div');
      title.classList.add('h5p-personality-quiz-set-results-panel-title');
      title.innerText = params.title;

      resultsPanel.append(title);
    }

    if (params.image) {
      this.personalityImages.push(params.image);
      resultsPanel.append(params.image);
    }

    // Personality type name
    if (
      params.personality && (
        resultsParams.showPersonality ||
        !params.description && !params.image?.file?.path
      )
    ) {
      const personality = document.createElement('div');
      personality.classList.add(
        'h5p-personality-quiz-set-results-panel-personality'
      );
      personality.innerText = params.personality;

      resultsPanel.append(personality);
    }

    // Personality type description
    if (params.description?.length > 0) {
      const description = document.createElement('div');
      description.classList.add(
        'h5p-personality-quiz-set-results-panel-description'
      );
      description.innerHTML = params.description;

      resultsPanel.append(description);
    }

    return resultsPanel;
  }
}
