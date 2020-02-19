const NonceEvent = require('nonceEvent')
const md5 = require('md5')
const app = getApp()
class RtcSocket {
  constructor(url) {
    this.socket = null
    this.url = url
    this.errCount = 0
  }

  createSocket() {
    return new Promise((resolve, reject) => {
      this.socket = wx.connectSocket({
        url: this.url,
        success(res) {
          resolve(res)
        },
        fail(err) {
          reject(err)
        }
      })
    })
  }

  on(event, cb) {
    switch (event) {
      case 'close':
        this.socket.onClose(cb)
        break
      case 'error':
        this.socket.onError(cb)
        break
      case 'message':
        this.socket.onMessage((event) => {
          const data = JSON.parse(event.data)
          if(data.command = 's2c') {
            this.send({
              data: {
                'errorCode': data.error || '0',
                'nonce': data.nonce,
                'msg': data.msg || 'message'
              }
            })
          }
          NonceEvent.emit(data.nonce, data)
          cb && cb(event)
        })
        break
      case 'open':
        this.socket.onOpen(cb)
        break
      default:
        break
    }
  }

  send(option, errorCb) {
    this.socket.send({
      data: JSON.stringify(option.data),
      fail: errorCb
    })
  }

  close() {
    this.socket.close()
  }

  request(type, option) {
    return new Promise((resolve, reject) => {
      const nonce = type + md5(+new Date())
      option.data.nonce = nonce
      this.send(option, err => reject(err))
      NonceEvent.on(nonce, e => resolve(e))
    })
  }
}

module.exports = {
  RtcSocket,
  callSocket: new RtcSocket(`wss://${app.globalData.wsHost}/staff`)
}
