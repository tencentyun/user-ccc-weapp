class NonceEvent {
  constructor() {
    this.events = {}
  }
  on(nonce, fn) {
    this.events[nonce] = fn
  }
  emit(nonce, data) {
    if (this.events[nonce]) {
      this.events[nonce](data)
      delete this.events[nonce]
    }
  }
}
module.exports = new NonceEvent()