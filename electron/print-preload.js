/**
 * Print Preload Script
 * 
 * This preload script is CRITICAL for silent printing to work.
 * It blocks window.print() which would otherwise show the native OS print dialog.
 * 
 * MUST be loaded with contextIsolation: false
 */

(function disableWindowPrint() {
  try {
    Object.defineProperty(window, 'print', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function () {
        console.log('window.print() blocked in hidden print worker');
      }
    });
    console.log('✅ window.print() successfully blocked for silent printing');
  } catch (error) {
    console.warn('Unable to override window.print in print worker:', error);
  }
})();
