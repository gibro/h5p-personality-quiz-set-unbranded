import Util from '@services/util.js';

/**
 * Mixin containing methods for xapi stuff.
 */
export default class XAPI {

  /**
   * Trigger xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   */
  triggerXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEvent(verb);
    this.trigger(xAPIEvent);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @returns {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);

    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getXAPIDefinition()
    );

    if (verb === 'progressed') {
      xAPIEvent.data.statement.object.definition
        .extensions['http://id.tincanapi.com/extension/ending-point'] =
          this.main.getCurrentPageIndex() + 1;
    }

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @returns {object} XAPI definition.
   */
  getXAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];

    definition.description = {};
    definition.description[this.languageTag] = this.getDescription();
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];

    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'other';

    return definition;
  }

  /**
   * Get xAPI data from children.
   * @param {H5P.ContentType[]} children Child instances.
   * @returns {object[]} XAPI data objects used to build report.
   */
  getXAPIDataFromChildren(children = []) {
    return children
      .map((child) => {
        if (typeof child?.getXAPIData === 'function') {
          return child.getXAPIData();
        }
      })
      .filter((data) => !!data);
  }

  /**
   * Get tasks title.
   * @returns {string} Title.
   */
  getTitle() {
    let raw;
    if (this.extras.metadata) {
      raw = this.extras.metadata.title;
    }
    raw = raw || XAPI.DEFAULT_DESCRIPTION;

    // H5P Core function: createTitle
    return H5P.createTitle(raw);
  }

  /**
   * Get tasks description.
   * @returns {string} Description.
   */
  getDescription() {
    return this.params.taskDescription || XAPI.DEFAULT_DESCRIPTION;
  }
}

/** @constant {string} DEFAULT_DESCRIPTION Default description */
XAPI.DEFAULT_DESCRIPTION = 'Personality Quiz Set';
