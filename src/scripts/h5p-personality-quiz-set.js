import Dictionary from '@services/dictionary.js';
import Globals from '@services/globals.js';
import Util from '@services/util.js';
import Screenreader from '@services/screenreader.js';
import Main from '@components/main.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import Color from 'color';

export default class PersonalityQuizSet extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(PersonalityQuizSet, [QuestionTypeContract, XAPI]);

    this.params = Util.extend({
      titleScreen: {
        title: {}
      },
      behaviour: {
        enableRetry: false, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-9}
        enableSolutionsButton: false, // @see {@link https://h5p.org/documentation/developers/contracts#guides-header-8}
        showProgressBar: true
      },
      results: {
        showPersonality: true,
        personalityTextPrefix: 'Personality type:'
      },
      visual: {
        showProgressBar: true,
        color: '#e05c00'
      },
      l10n: {
        currentOfTotal: '@current of @total',
        noTitle: 'Untitled',
        resultsIntro: 'Here are your results:',
        start: 'Start',
        restart: 'Restart',
        exportPDF: 'Export PDF',
        footerText: 'This research and development project is funded by the German Federal Ministry of Education and Research (BMBF) in the program "Future of Value Creation - Research on Production, Service and Work" and is supervised by the Project Management Agency Karlsruhe (PTKA). The responsibility for the content of this publication lies with the author.'
      },
      a11y: {
        progressBar: 'Progress bar',
        titleScreenWasOpened: 'The title screen was opened.'
      }
    }, params);

    this.contentId = contentId;
    this.extras = Util.extend({
      previousState: {}
    }, extras);

    // Fill dictionary
    this.dictionary = new Dictionary();
    this.dictionary.fill({
      l10n: this.params.l10n,
      a11y: this.params.a11y
    });

    // Screenreader for polite screen reading
    document.body.append(Screenreader.getDOM());

    // Set globals
    this.globals = new Globals();
    this.globals.set('mainInstance', this);
    this.globals.set('params', this.params);
    this.globals.set('contentId', this.contentId);
    this.globals.set('extras', this.extras);
    this.globals.set('read', (text) => {
      Screenreader.read(text);
    });
    this.globals.set('resize', () => {
      this.trigger('resize');
    });

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-set');

    this.setupColorScheme();

    this.main = new Main(
      {
        dictionary: this.dictionary,
        globals: this.globals
      },
      {
        onProgressed: (index) => {
          this.handleProgressed(index);
        },
        onCompleted: () => {
          this.handleCompleted();
        }
      }
    );
    this.dom.appendChild(this.main.getDOM());

    Util.handleOnceVisible(this.dom, () => {
      this.trigger('resize');

      if (this.getMaxScore() === 0) {
        return; // No valid content
      }

      window.setTimeout(() => {
        if (
          this.getScore() === 0 &&
          this.params.showTitleScreen
        ) {
          this.main.startScreen.show();
        }
        else if (this.getScore() === this.getMaxScore()) {
          this.main.showResults();
        }
        else {
          if (this.params.behaviour.showProgressBar) {
            this.main.showProgressBar();
          }
          const startIndex = this.extras.previousState.pageIndex ?? 0;
          this.main.showUpTo(startIndex);
        }
      }, 0);
    });
  }

  /**
   * Setup color scheme.
   */
  setupColorScheme() {
    const colorBase = Color(this.params.visual.color);
    const colorText = (colorBase.isDark()) ?
      '#ffffff' :
      '#000000';

    const colorHover = (colorBase.isDark()) ?
      colorBase.darken(0.25) :
      colorBase.lighten(0.25);

    const colorActive = (colorBase.isDark()) ?
      colorBase.darken(0.37) :
      colorBase.lighten(0.37);

    const colorTextActive = (colorActive.isDark()) ?
      '#ffffff' :
      '#000000';

    const colorPale = colorBase.mix(Color('#ffffff'), 0.9);

    this.dom.style.setProperty('--color-button-background', colorBase.hex());
    this.dom.style.setProperty('--color-button-text', colorText);
    this.dom.style.setProperty('--color-button-hover', colorHover);
    this.dom.style.setProperty('--color-button-active', colorActive);
    this.dom.style.setProperty('--color-button-text-active', colorTextActive);
    this.dom.style.setProperty('--color-button-pale', colorPale);
  }

  /**
   * Attach DOM to H5P wrapper.
   * @param {H5P.jQuery} $wrapper H5P wrapper.
   */
  attach($wrapper) {
    $wrapper.get(0).append(this.dom);
  }

  /**
   * Get context data. Contract used for confusion report.
   * @returns {object} Context data.
   */
  getContext() {
    return {
      type: 'page',
      value: this.main.getCurrentPageIndex() + 1
    };
  }

  /**
   * Handle progressed.
   */
  handleProgressed() {
    // Ensure subcontent's xAPI statement is triggered beforehand
    window.requestAnimationFrame(() => {
      this.triggerXAPIEvent('progressed');
    });
  }

  /**
   * Handle completed.
   */
  handleCompleted() {
    // Ensure subcontent's xAPI statement is triggered beforehand
    window.requestAnimationFrame(() => {
      this.triggerXAPIScored(this.getScore(), this.getMaxScore(), 'completed');
    });
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return this.main.getCurrentState();
  }
}
