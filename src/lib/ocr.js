export const recognizeAttendanceSheet = async (file, onProgress) => {
  // lazy load Tesseract
  const Tesseract = await import('tesseract.js');
  
  try {
    const worker = await Tesseract.createWorker({
      logger: m => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(m.progress);
        }
      }
    });

    await worker.loadLanguage('eng');
    await worker.initialize('eng');
    
    // We can restrict characters to P, A, p, a, spaces, and numbers for roll numbers if we want
    // But for a generic sheet, we just get text and parse lines
    const { data: { text, words, lines } } = await worker.recognize(file);
    await worker.terminate();

    return { text, words, lines };
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
