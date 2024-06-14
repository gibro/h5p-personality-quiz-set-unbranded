import html2canvas from 'html2canvas';

export default class Screenshot {

  /**
   * Take screenshot of DOM element.
   * @param {object} params Parameters.
   * @param {HTMLElement} [params.element] Element to
   *   take screenshot from.
   * @param {boolean} [params.enforceImage] If true, always return some image.
   * @param {string} [params.format] Format of the image: blob|base64.
   * @returns {Blob|string} Image blob or base64 string.
   */
  static async takeScreenshot(params = {}) {
    params.element = params.element ?? document.body;
    params.format = params.format ?? 'blob';

    const canvas = await html2canvas(params.element);
    if (params.enforceImage &&
      canvas.getAttribute('height') === '0' ||
      canvas.getAttribute('width') === '0'
    ) {
      canvas.setAttribute('height', '1');
      canvas.setAttribute('width', '1');
    }

    return await new Promise((resolve) => {
      if (params.format === 'base64') {
        resolve(canvas.toDataURL('image/png'));
      }
      else if (params.format === 'blob') {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      }
      else {
        return new Blob([], { type: 'image/png' });
      }
    });
  }
}
