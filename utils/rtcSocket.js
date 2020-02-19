const NonceEvent = require('nonceEvent')
const md5 = require('md5')
const app = getApp()
let heartbeatTimer = null
let heartbeatErrorCount = 0
class RtcSocket {
  constructor(url) {
    this.socket = null
    this.url = url
    this.errCount = 0
  }

  open() {
    this._createSocket()
      .then(res => {
        console.log('socket create success', res)
        this._initSocketEvent()
      })
      .catch(err => {
        seatLog(err, 'socket create fail')
        console.log('socket create fail', err)
        wx.showToast({
          title: '初始化失败！请联系管理员 ' + err,
          icon: 'none',
          success: () => {
            setTimeout(() => wx.navigateBack(), 2000)
          }
        })
      })
  }

  _createSocket() {
    const currentPages = getCurrentPages()
    const cccPage = currentPages[currentPages.length - 1]
    const self = this
    return new Promise((resolve, reject) => {
      console.log('socket connect')
      if (cccPage.route !== 'pages/ccc/ccc') reject('页面错误')
      if (!app.globalData.wsHost) reject('socket地址不存在')

      this.socket = wx.connectSocket({
        url: this.url,
        success(res) {
          console.log('socket connect success')
          resolve(res)
        },
        fail(err) {
          console.error('socket connect fail', err)
          reject(err)
        }
      })
    })
  }

  _login(relogin = false) {
    const { openId, sdkAppId } = app.globalData
    heartbeatErrorCount = 0
    const data = {
      staff: {
        userId: openId,
        sdkAppId
      },
      sessionKey: '',
      command: relogin ? 'relogin' : 'login'
    }
    this.request('login', { data })
      .then(event => {
        if (event.errorCode === '-9') this.goBackWithToast('初始化失败: socket login fail')
        else if (event.errorCode === '-10') this.goBackWithToast('账号重复登录')
        else if (event.errorCode !== '0') this.goBackWithToast('登录失败，请联系管理员 code:' + event.errorCode)
        else {
          this._sendHeartbeat('firstHeartbeat').then(msg => {
            console.log('socket first heartbeat', msg)
            this._heartbeat()
          })
        }
      }).catch(e => {
        console.error('socket login error: ', e)
        this.goBackWithToast('初始化失败: socket login fail')
      })
  }

  // 心跳请求
  _sendHeartbeat(type) {
    const { openId, sdkAppId } = app.globalData
    return this.request(type, {
      data: {
        staff: {
          userId: openId,
          sdkAppId
        },
        command: 'heartbeat'
      }
    }).then(e => {
      if (e.errorCode !== '0') {
        console.error('heartbeat error', e)
        log.error('heartbeat error', err)
        heartbeatErrorCount++

        // 心跳连续错误3次重新登录
        if (heartbeatErrorCount > 2) {
          this._login(true)
        }
      }
      heartbeatErrorCount = 0
      return e
    }).catch(err => {
      this._login(true)  // 错误重登录
    })
  }

  _heartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      this._sendHeartbeat('heartbeat')
    }, 2000)
  }

  _initSocketEvent() {
    const currentPages = getCurrentPages()
    const cccPage = currentPages[currentPages.length - 1]
    const self = this
    console.log('socket pages', cccPage)
    this.socket.onOpen(event => {
      this._login()
    })
    this.socket.onClose(event => {
      clearInterval(heartbeatTimer)
      console.log('socket close', event)
    })
    this.socket.onError(event => {
      console.error('socket error', event)
      this._login(true)
    })
    this.socket.onMessage(event => {
      console.log('socket receive message: ', event)
      const data = JSON.parse(event.data)
      if (data.command = 's2c') {
        this.send({
          data: {
            'errorCode': data.error || '0',
            'nonce': data.nonce,
            'msg': data.msg || 'message'
          }
        })
      }
      NonceEvent.emit(data.nonce, data)
      cccPage.onHandleSocketMessage && cccPage.onHandleSocketMessage(data)
      // 没有心跳重连
      if (data.event === '100') this._login(true)
    })
  }

  send(option, errorCb) {
    this.socket.send({
      data: JSON.stringify(option.data),
      fail: errorCb
    })
  }

  close() {
    this.socket.close();
  }

  request(type, option) {
    return new Promise((resolve, reject) => {
      const nonce = type + md5(+new Date())
      option.data.nonce = nonce
      this.send(option, err => reject(err))
      NonceEvent.on(nonce, e => resolve(e))
    })
  }

  goBackWithToast(title) {
    wx.showToast({
      title,
      icon: 'none',
      success: () => {
        setTimeout(() => wx.navigateBack(), 2000)
      }
    })
  }
}

module.exports = {
  RtcSocket,
  callSocket: new RtcSocket(`wss://${app.globalData.wsHost}/staff`)
}
