import Util from '@services/util.js';
import './h5p-content.scss';

export default class H5PContent {

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
      onProgressed: () => {},
      onCompleted: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-set-content-instance');

    this.initializeInstance();

    this.attachInstance();
  }

  /**
   * Get DOM with H5P exercise.
   * @returns {HTMLElement} DOM with H5P exercise.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.instance?.getXAPIData?.();
  }

  /**
   * Initialize H5P instance.
   */
  initializeInstance() {
    if (this.instance === null || this.instance) {
      return; // Only once, please
    }

    // Override Personality Quiz parameters
    const colorBase = this.params.globals.get('params')?.visual?.color;
    const libraryParams = Util.extend(this.params.libraryParams, {
      params: {
        showTitleScreen: false,
        visual: {
          showProgressBar: false,
          appearance: 'chat',
          colorButton: colorBase,
          colorProgressBar: colorBase
        },
        behaviour: {
          delegateResults: true,
          delegateRun: true
        },
        resultScreen: {
          animation: 'none'
        }
      }
    });

    const previousState =
      this.params.globals.get('extras').previousState?.pages?.[this.params.index].content;

    if (!this.instance) {
      this.instance = H5P.newRunnable(
        libraryParams,
        this.params.globals.get('contentId'),
        undefined,
        true,
        { previousState: previousState }
      );
    }

    if (!this.instance) {
      return;
    }

    // Resize parent when children resize
    this.bubbleUp(this.instance, 'resize', this.params.globals.get('mainInstance'));

    // Resize children to fit inside parent
    this.bubbleDown(this.params.globals.get('mainInstance'), 'resize', [this.instance]);

    // Determine when instance is completed
    this.instance.on('xAPI', (event) => {
      if (event.getVerb() === 'progressed') {
        this.callbacks.onProgressed(this.instance.getCurrentPosition());
      }
      else if (event.getVerb() === 'completed') {
        this.callbacks.onCompleted();
      }
    });
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {
      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets) {
    origin.on(eventName, (event) => {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
        // If not attached yet, some contents can fail (e. g. CP).
        if (this.isAttached) {
          target.trigger(eventName, event);
        }
      });
    });
  }

  /**
   * Attach instance to DOM.
   */
  attachInstance() {
    if (this.isAttached) {
      return; // Already attached. Listeners would go missing on re-attaching.
    }

    this.showInstance();

    this.instance.attach(H5P.jQuery(this.dom));
    this.isAttached = true;
  }

  /**
   * Show instance.
   */
  showInstance() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide instance.
   */
  hideInstance() {
    this.dom.classList.add('display-none');
  }

  /**
   * Get H5P content type instance.
   * @returns {H5P.ContentType} H5P content type instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Run instance.
   * @param {object} [params] Parameters.
   */
  runInstance(params = {}) {
    this.showInstance();
    this.instance?.run?.({
      focus: !params.showInstantly,
      showInstantly: params.showInstantly
    });
  }

  /**
   * Get number of questions.
   * Could be computed using params, but would duplicate sanitizing.
   * @returns {number} Number of questions.
   */
  getNumberOfQuestions() {
    return this.instance?.getNumberOfQuestions();
  }

  /**
   * Find first focusable element and set focus.
   * @returns {boolean} True if could focus on first child, else false.
   */
  focusFirstChild() {
    const focusableElementsString = [
      'a[href]:not([disabled])',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'video',
      'audio',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');

    const firstChild = [...this.dom.querySelectorAll(focusableElementsString)]
      .filter((element) => {
        const disabled = element.getAttribute('disabled');
        return disabled !== 'true' && disabled !== true;
      })
      .shift();

    firstChild?.focus();

    return !!firstChild;
  }

  /**
   * Get content title.
   * @returns {string} Content title.
   */
  getTitle() {
    if (this.instance?.getTitle) {
      return this.instance.getTitle();
    }

    return this.params.metadata?.title ||
      this.params.this.params.dictionary.get('l10n.noTitle');
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.instance?.getAnswerGiven?.() ?? false;
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   */
  getScore() {
    return this.instance?.getScore?.() ?? 0;
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   */
  getMaxScore() {
    return this.instance?.getMaxScore?.() ?? 0;
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    this.instance?.showSolutions?.();
  }

  /**
   * Reset.
   */
  reset() {
    /*
     * If not attached yet, some contents can fail (e. g. CP), but contents
     * that are not attached never had a previous state change, so okay
     */
    if (!this.isAttached) {
      this.attachInstance();
    }

    this.instance?.resetTask?.();
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return this.instance?.getCurrentState?.() || {};
  }

  /**
   * Get results for page.
   * @returns {object} Results.
   */
  getResults() {
    return this.instance?.getResults?.();
  }
}
