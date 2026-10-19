export class PdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfError';
  }
}
