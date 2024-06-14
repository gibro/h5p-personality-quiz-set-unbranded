import ExportPDF from '@services/export-pdf.js';
import Util from '@services/util.js';
import FocusCatcher from '@components/focus-catcher/focus-catcher.js';
import Footer from '@components/footer/footer.js';
import Header from '@components/header/header.js';
import MediaScreen from '@components/media-screen/media-screen.js';
import ProgressBar from '@components/progress-bar/progress-bar';
import Page from '@components/page/page.js';
import Results from '@components/results/results.js';
import './main.scss';

/**
 * Main DOM component incl. main controller.
 */
export default class Main {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {object} [callbacks.onProgressed] Callback when user progressed.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onProgressed: () => {},
      onCompleted: () => {}
    }, callbacks);

    this.globalParams = this.params.globals.get('params');

    this.pdfExporter = new ExportPDF();

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-set-main');

    // Header
    this.header = new Header();
    this.dom.append(this.header.getDOM());

    // Focus catcher, not good practice, but avoid focus on body
    this.focusCatcher = new FocusCatcher();
    this.dom.append(this.focusCatcher.getDOM());

    // Title screen if set
    if (this.globalParams.showTitleScreen) {
      this.intro = document.createElement('div');
      this.intro.classList.add('h5p-personality-quiz-set-content-intro'); // TODO

      this.startScreen = new MediaScreen({
        id: 'start',
        contentId: this.params.globals.get('contentId'),
        introduction: this.globalParams.titleScreen.titleScreenIntroduction,
        medium: this.globalParams.titleScreen.titleScreenMedium,
        buttons: [
          { id: 'start', text: this.params.dictionary.get('l10n.start') }
        ],
        a11y: {
          screenOpened: this.params.dictionary.get('a11y.titleScreenWasOpened')
        }
      }, {
        onButtonClicked: () => {
          this.handleTitleScreenClosed();
        },
        onRead: (text) => {
          this.params.globals.get('read')(text);
        }
      });

      this.startScreen.hide();
      this.intro.append(this.startScreen.getDOM());

      this.dom.append(this.intro);
    }

    // Progressbar
    this.progressBar = new ProgressBar({
      baseColor: this.globalParams.visual.color,
      isAnimated: true,
      l10n: {
        currentOfTotal: this.params.dictionary.get('l10n.currentOfTotal')
      },
      a11y: {
        progressbar: this.params.dictionary.get('a11y.progressBar')
      }
    });
    this.progressBar.hide();

    this.dom.append(this.progressBar.getDOM());

    this.contents = document.createElement('div');
    this.contents.classList.add('h5p-personality-quiz-set-pages');
    this.dom.append(this.contents);

    this.currentPageIndex = -1;

    this.pages = [];

    // Pages
    this.globalParams.content.forEach((content, index) => {
      const currentIndex = index;

      const page = new Page(
        {
          dictionary: this.params.dictionary,
          globals: this.params.globals,
          index: currentIndex,
          libraryParams: content.libraryParams,
          introText: content.introText,
          outroText: content.outroText,
          ...(content.resultsTitle && { resultsTitle: content.resultsTitle })
        },
        {
          onProgressed: () => {
            this.handlePageProgressed();
          },
          onCompleted: () => {
            this.handlePageCompleted(index);
          }
        }
      );
      this.contents.append(page.getDOM());

      this.pages.push(page);
    });

    // Results
    this.results = new Results(
      {
        dictionary: this.params.dictionary,
        globals: this.params.globals,
        introText: this.params.dictionary.get('l10n.resultsIntro')
      },
      {
        onRestart: () => {
          this.reset();
        },
        onExportPDF: () => {
          this.exportPDF();
        }
      }
    );
    this.dom.append(this.results.getDOM());

    // Header
    this.footer = new Footer({
      text: this.params.dictionary.get('l10n.footerText')
    });
    this.dom.append(this.footer.getDOM());

    if (this.globalParams.behaviour.showProgressBar && this.getMaxScore() > 0) {
      this.progressBar.setMaxValue(this.getNumberOfQuestions());

      const pages = this.params.globals.get('extras')?.previousState?.pages ??
        [];
      const progress = pages.reduce((sum, page) => {
        return sum + (page.content?.answersGiven || []).length;
      }, 0);

      this.progressBar.setProgress(progress);
    }
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Content DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get current page index.
   * @returns {number} Current page index.
   */
  getCurrentPageIndex() {
    return this.currentPageIndex;
  }

  /**
   * Get total number of questions.
   * @returns {number} Total number of questions.
   */
  getNumberOfQuestions() {
    return this.pages.reduce((result, page) => {
      return result + page.getNumberOfQuestions();
    }, 0);
  }

  /**
   * Get current question.
   * @returns {number} Current question.
   */
  getCurrentQuestion() {
    return this.pages.reduce((result, page, index) => {
      if (index > this.currentPageIndex) {
        return result;
      }

      return result + page.getPosition() + 1;
    }, 0);
  }

  /**
   * Show progress bar.
   */
  showProgressBar() {
    this.progressBar.show();
  }

  /**
   * Show results.
   */
  showResults() {
    this.currentPageIndex = this.pages.length - 1;

    this.pages.forEach((page) => {
      page.show({ showInstantly: true });
    });

    this.results.setResults(this.pages.map((page) => {
      return page.getResults();
    }));

    this.progressBar.setProgress(this.getNumberOfQuestions());

    this.results.show();

    this.params.globals.get('resize')();
  }

  /**
   * Show page.
   * @param {number} [to] Page number to show.
   * @param {object} [params] Parameters.
   */
  showUpTo(to = -1, params = {}) {
    if (to < 0 || to > this.pages.length - 1) {
      return; // Swiping or out of bounds
    }

    to = (to + this.pages.length) % this.pages.length;

    let from = this.currentPageIndex;
    if (from === to) {
      return; // Nothing to do.
    }

    this.currentPageIndex = to;

    // Ensure to > from
    if (from > to) {
      const tmp = from;
      from = to;
      to = tmp;
    }

    this.pages.forEach((page, index) => {
      if (index < to) {
        page.show({ showInstantly: true });
      }
      else if (index === to) {
        page.show({ focus: !params.skipFocus }); // Initial focus
      }
      else {
        page.hide();
      }
    });

    this.params.globals.get('resize')();
  }

  /**
   * Handle title screen closed.
   */
  handleTitleScreenClosed() {
    if (this.globalParams.behaviour.showProgressBar) {
      this.progressBar.show();
    }
    this.showUpTo(0, { skipFocus: false });

    this.params.globals.get('resize')();
  }

  /**
   * Handle user progressed on page.
   * @param {number} offset Extra offset.
   */
  handlePageProgressed(offset = 0) {
    const currentQuestion = this.getCurrentQuestion() + offset;
    this.progressBar.setProgress(currentQuestion - 1);

    if (currentQuestion <= this.getNumberOfQuestions()) {
      this.callbacks.onProgressed(currentQuestion);
    }
  }

  /**
   * Handle page was completed by user.
   * @param {number} index Index of page that was completed.
   */
  handlePageCompleted(index) {
    this.showUpTo(index + 1);

    if (this.getScore() === this.getMaxScore()) {
      this.handleSetCompleted();
    }
  }

  /**
   * Handle set was completed.
   */
  handleSetCompleted() {
    this.handlePageProgressed(1);

    this.results.setResults(this.pages.map((page) => {
      return page.getResults();
    }));

    this.results.show();

    this.callbacks.onCompleted();
  }

  /**
   * Get H5P subcontent instances.
   * @returns {H5P.ContentType[]} H5P subcontent instances.
   */
  getChildInstances() {
    return this.pages.map((page) => {
      return page.getChildInstance();
    });
  }

  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   */
  getAnswerGiven() {
    return this.pages.some((page) => page.getAnswerGiven());
  }

  /**
   * Get current score.
   * @returns {number} Current score.
   */
  getScore() {
    return this.pages.reduce((score, page) => {
      return score + page.getScore();
    }, 0);
  }

  /**
   * Get maximum possible score.
   * @returns {number} Score necessary for mastering.
   */
  getMaxScore() {
    return this.pages.reduce((score, page) => {
      return score + page.getMaxScore();
    }, 0);
  }

  /**
   * Show solutions.
   */
  showSolutions() {
    this.pages.forEach((page) => {
      page.showSolutions();
    });
  }

  /**
   * Reset.
   */
  reset() {
    this.pages.forEach((page) => {
      page.reset();
    });
    this.results.reset();

    this.currentPageIndex = -1;
    this.progressBar.setProgress(0);
    this.focusCatcher.catch();

    if (this.globalParams.showTitleScreen) {
      this.progressBar.hide();
      this.startScreen.show();
    }
    else {
      if (this.globalParams.behaviour.showProgressBar) {
        this.progressBar.show();
      }
      this.showUpTo(0, { skipFocus: false });
    }
  }

  /**
   * Export PDF.
   */
  async exportPDF() {
    this.setExportingState(true);

    window.requestAnimationFrame(async () => {
      // Pass results to export
      const headerBase = await this.header.getBase64();
      const footerBase = await this.footer.getBase64();
      const results = await this.results.getExport();

      await this.pdfExporter.export({ results, headerBase, footerBase });

      this.setExportingState(false);
    });
  }

  /**
   * Set exporting state.
   * @param {boolean} state Exporting state.
   */
  setExportingState(state) {
    this.results.setExportingState(state);
  }

  /**
   * Get xAPI data from exercises.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIData() {
    return this.pages
      .map((page) => {
        return page.getXAPIData();
      })
      .filter((data) => !!data);
  }

  /**
   * Return H5P core's call to store current state.
   * @returns {object} Current state.
   */
  getCurrentState() {
    return {
      pageIndex: this.getCurrentPageIndex(),
      pages: this.pages.map((page) => page.getCurrentState())
    };
  }
}
