// Preload script for hidden print window
// Prevents the remote page from invoking window.print(), which would show the OS dialog

(function disableWindowPrint() {
  try {
    Object.defineProperty(window, 'print', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: function () {
        console.log('window.print() blocked in hidden print worker')
      },
    })
  } catch (error) {
    console.warn('Unable to override window.print in print worker:', error)
  }
})()
