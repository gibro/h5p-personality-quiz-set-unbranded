import Util from '@services/util.js';
import './chat-message.scss';

export default class ChatMessage {

  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onMessageDone: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-personality-quiz-set-chat-message-container');

    this.messageDOM = document.createElement('div');
    this.messageDOM.classList.add('h5p-personality-quiz-set-chat-message');
    this.dom.append(this.messageDOM);

    this.typingDots = document.createElement('div');
    this.typingDots.classList.add('typing-animation-dots');
    this.messageDOM.append(this.typingDots);

    for (let i = 0; i < 3; i++) {
      const typingDot = document.createElement('div');
      typingDot.classList.add('typing-animation-dot');
      this.typingDots.append(typingDot);
    }

    this.hide();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} Chat message DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Read.
   */
  read() {
    if (document.activeElement === document.body) {
      return; // Current viewport not in focus
    }

    this.params.globals.get('read')(Util.purifyHTML(this.params.text));
  }

  /**
   * Show.
   * @param {object} params Parameters.
   */
  show(params = {}) {
    // Show the text
    const showText = (params = {}) => {
      this.messageDOM.innerHTML = this.params.text;
      this.params.globals.get('resize')();

      if (params.skipCallback) {
        return;
      }

      if (params.delayForDone === 0) {
        this.callbacks.onMessageDone();
      }
      else {
        window.setTimeout(() => {
          this.callbacks.onMessageDone();
        }, params.delayForDone);
      }
    };

    if (params.showInstantly) {
      showText({
        focus: params.focus,
        delayForDone: 0,
        skipCallback: true
      });
    }
    else {
      const delayTypingAnimation = Math.min(
        Util.purifyHTML(this.params.text).length * ChatMessage.DELAY_PER_CHAR_MS,
        ChatMessage.MAX_DELAY_TYPING_ANIMATION_MS
      );

      window.setTimeout(() => {
        showText({
          focus: params.focus,
          delayForDone: ChatMessage.DELAY_FOR_DONE_MS,
          skipCallback: params.skipCallback
        });
        this.read();
      }, delayTypingAnimation);
    }

    this.dom.classList.remove('display-none');
    this.params.globals.get('resize')();
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Reset.
   */
  reset() {
    this.hide();
    this.messageDOM.innerHTML = '';
    this.messageDOM.append(this.typingDots);
  }
}

/** @constant {number} DELAY_PER_CHAR_MS Time to delay showing the question per character. */
ChatMessage.DELAY_PER_CHAR_MS = 40;

/** @constant {number} MAX_DELAY_TYPING_ANIMATION_MS Maximum time to delay showing the question. */
ChatMessage.MAX_DELAY_TYPING_ANIMATION_MS = 2500;

/** @constant {number} DELAY_FOR_ANSWER_OPTIONS_S Time to delay showing the answer options. */
ChatMessage.DELAY_FOR_DONE_MS = 1000;
