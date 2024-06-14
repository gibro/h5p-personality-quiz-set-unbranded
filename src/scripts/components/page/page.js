import Util from '@services/util.js';
import H5PContent from './h5p-content.js';
import ChatMessage from '@components/chat-message/chat-message.js';
import './page.scss';

export default class Page {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {number} params.index Index of page.
   * @param {object} params.libraryParams Library parameters for content.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onCompleted] Callback when completed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      libraryParams: {}
    }, params);

    this.callbacks = Util.extend({
      onCompleted: () => {}
    }, callbacks);

    const previousState =
      this.params.globals.get('extras').previousState?.pages?.[this.params.index];

    this.position = previousState?.position ?? 0;

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-set-page');

    // Intro message
    if (this.params.introText) {
      const introduction = document.createElement('div');
      introduction.classList.add('h5p-personality-quiz-set-page-intro');
      this.dom.append(introduction);

      this.introMessage = new ChatMessage({
        globals: this.params.globals,
        text: this.params.introText
      }, {
        onMessageDone: () => {
          this.h5pContent.runInstance();
        }
      });
      introduction.append(this.introMessage.getDOM());
    }

    // Content
    this.h5pContent = new H5PContent(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        index: this.params.index,
        libraryParams: this.params.libraryParams
      },
      {
        onProgressed: (position) => {
          this.position = position;
          this.callbacks.onProgressed(position);
        },
        onCompleted: (index) => {
          this.handleContentCompleted(index);
        }
      }
    );
    this.dom.append(this.h5pContent.getDOM());
    this.title = this.h5pContent.getTitle();

    // Outro message
    if (this.params.outroText) {
      const outroduction = document.createElement('div');
      outroduction.classList.add('h5p-personality-quiz-set-page-outro');
      this.dom.append(outroduction);

      this.outroMessage = new ChatMessage({
        globals: this.params.globals,
        text: this.params.outroText
      }, {
        onMessageDone: () => {
          this.callbacks.onCompleted(this.params.index);
        }
      });
      outroduction.append(this.outroMessage.getDOM());
    }

    this.isShown = false;
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get number of questions.
   * Could be computed using params, but would duplicate sanitizing.
   * @returns {number} Number of questions.
   */
  getNumberOfQuestions() {
    return this.h5pContent.getNumberOfQuestions();
  }

  /**
   * Get results for page.
   * @returns {object} Results.
   */
  getResults() {
    const results = this.h5pContent.getResults();
    delete results.title; // Good to have, but we don't need that here.

    return {
      ...results,
      ...(this.params.resultsTitle && { title: this.params.resultsTitle }),
    };
  }

  /**
   * Show.
   * @param {object} [params] Parameters.
   */
  show(params = {}) {
    if (this.isShown) {
      return;
    }

    this.isShown = true;
    this.dom.classList.remove('display-none');

    if (params.showInstantly) {
      this.introMessage?.show({
        showInstantly: true,
        skipCallback: true
      });

      this.h5pContent.attachInstance();
      this.h5pContent.runInstance({ showInstantly: true });

      this.outroMessage?.show({
        showInstantly: true,
        skipCallback: true
      });

      return;
    }

    if (this.introMessage && this.position === 0) {
      this.introMessage.show({ focus: params.focus });
    }
    else {
      this.introMessage?.show({ showInstantly: true });
      this.h5pContent.attachInstance();
      this.h5pContent.runInstance();
    }
  }

  /**
   * Hide.
   */
  hide() {
    if (!this.isShown) {
      return;
    }

    this.isShown = false;

    this.dom.classList.add('display-none');
  }

  /**
   * Get position.
   * @returns {number} Current position.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Get title.
   * @returns {string} title.
   */
  getTitle() {
    return this.title;
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.h5pContent.getXAPIData();
  }

  /**
   * Find first focusable element and set focus.
   * @returns {boolean} True if could focus on first child, else false.
   */
  focusFirstChild() {
    return this.h5pContent.focusFirstChild();
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.h5pContent.getAnswerGiven();
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   */
  getScore() {
    return this.h5pContent.getScore();
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   */
  getMaxScore() {
    return this.h5pContent.getMaxScore();
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.h5pContent.showSolutions();
  }

  /**
   * Reset.
   */
  reset() {
    this.introContainer?.classList.add('display-none');
    this.introMessage?.reset();

    this.outroContainer?.classList.add('display-none');
    this.outroMessage?.reset();

    this.hide();

    this.position = 0;
    this.h5pContent.reset();
    this.h5pContent.hideInstance();
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      position: this.position,
      content: this.h5pContent.getCurrentState()
    };
  }

  /**
   * Get H5P subcontent instance.
   * @returns {H5P.ContentType} H5P subcontent instance.
   */
  getChildInstance() {
    return this.h5pContent.getInstance();
  }

  /**
   * Handle content was completed.
   * @param {number} index Index of content.
   */
  handleContentCompleted(index) {
    if (this.outroMessage) {
      this.outroMessage.show();
    }
    else {
      this.callbacks.onCompleted(index);
    }
  }
}
