import html2pdf from 'html2pdf.js';

export default class ExportPDF {
  /**
   * @class
   */
  constructor() {}

  /**
   * Export document.
   * @param {object} [params] Parameters of export.
   * @param {string} params.filename Filename for export.
   */
  async export(params = {}) {
    params.filename = params.filename ||
    `${H5P.createUUID()}-${Date.now()}.pdf`;

    const headerSize = await this.getImageDimensions(params.headerBase);
    const headerHeightMM = headerSize.height / ExportPDF.MM_EQUALS_PX;

    const footerSize = await this.getImageDimensions(params.footerBase);
    const footerHeightMM = footerSize.height / ExportPDF.MM_EQUALS_PX;

    html2pdf().from(params.results).set({
      margin: [
        headerHeightMM + ExportPDF.PAGE_MARGIN_MM,
        10,
        footerHeightMM + ExportPDF.PAGE_MARGIN_MM,
        10
      ],
      filename: params.filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    }).toPdf().get('pdf').then(async (pdf) => {
      const totalPages = pdf.internal.getNumberOfPages();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const headerHeight = (pdfWidth / headerSize.width) * headerSize.height;
      const footerHeight = (pdfWidth / footerSize.width) * footerSize.height;

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);

        pdf.addImage(
          params.headerBase,
          'PNG',
          0,
          0,
          pdfWidth,
          headerHeight
        );
        pdf.addImage(
          params.footerBase,
          'PNG',
          0,
          pdfHeight - footerHeight,
          pdfWidth,
          footerHeight
        );
      }
    }).save();
  }

  /**
   * Get image dimensions.
   * @param {string} base64String Base64 string.
   * @returns {Promise<object>} Image dimensions.
   */
  async getImageDimensions(base64String) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error('Failed to load the image'));
      };

      img.src = base64String;
    });
  }
}

/** @constant {number} Default gap between elements in mm. */
ExportPDF.PAGE_MARGIN_MM = 10; // Default gap between elements in mm

/** @constant {number} Pixels that equal one mm */
ExportPDF.MM_EQUALS_PX = 3.7795275591;
