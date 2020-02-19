// pages/chat/hat.js
const { getTime } = require('./utils/formatTime');
const socket = require('./utils/rtcSocket').callSocket;
const log = require('./utils/log');
const { seatLog } = require('./utils/request');
const app = getApp();
let heartbeatTimer = null;
let callTimer = null;
Page({
  data: {
    imUserSig: null,
    videoCall: false,
    small: false,
    sdkAppId: null,
    userId: null,
    userInfo: {},
    servingNum: null,
    callRoomId: null,
    callUserSig: null,
    callPrivateMapKey: null,
    callStatus: null,

    // socket 连接
    relogin: false,
    socketFreq: 0,
    // IM 转视频
    groupId: '',
    ivrFinish: false,
    callTime: 0,
    smallView: false
  },
  onLoad: function () {
    wx.showLoading({
      mask: true
    })
    this.setData({
      sdkAppId: app.globalData.sdkAppId,
      userId: app.globalData.openId,
      userInfo: app.globalData.userInfo,
      servingNum: app.globalData.servingNum,
      imUserSig: app.globalData.imUserSig
    }, () => { this.openSocket() })
  },
  onReady: function() {},
  onShow: function() {},
  onHide: function() {
      this.onHandleExitRoomEvent()
  },
  onUnload: function () {
    socket.close()
    clearInterval(heartbeatTimer)
    this.onHandleExitRoomEvent()
  },
  openSocket() {
    console.log('socket create')
    const { socketFreq } = this.data
    if(socketFreq === 2) { //  连续两次重连 停止5秒
      console.log('socket open timeout')
      log.error('socket open count:', socketFreq)
      setTimeout(() => {
        this.setData({
          socketFreq: 0
        }, () => {
          this.openSocket()
        })
      }, 3000)
      return
    }
    this.setData({
      socketFreq: socketFreq + 1
    })
    socket.createSocket()
      .then(res => {
        console.log('socket create success', res)
        this.initSocket()
      })
      .catch(err => {
        seatLog(err, 'socket create fail')
        console.log('socket create fail', err)
      })
  },
  initSocket() {
    socket.on('open', header => {
      console.log('socket open: ', header)
      this.socketLogin()
    })
    socket.on('error', error => {
      console.error('socket error: ', error)
      seatLog(error, 'socket error')
      this.openSocket()
    })
    socket.on('message', event => {
      console.log('socket event: ', event)
      const data = JSON.parse(event.data)
      this.onHandleSocketMessage(data)
    })
  },
  heartbeat() {
    this.setData({
      socketFreq: 0  // 登录成功清零
    })
    if(heartbeatTimer) clearInterval(heartbeatTimer)
    heartbeatTimer = setInterval(() => {
      this.sendHeartbeat('heartbeat')
    }, 2000)
  },
  sendHeartbeat(type) {
    const { userId, sdkAppId } = this.data
    return socket.request(type, {
      data: {
        staff: {
          userId,
          sdkAppId
        },
        command: 'heartbeat'
      }
    }).then(e => {
      if (e.errorCode !== '0') {
        console.error('heartbeat error', e)
        log.error('heartbeat error', err)
      }
      return e
    }).catch(err => {
      log.error('heartbeat error', err)
      this.openSocket()  // 错误重连
    })
  },
  socketLogin() {
    const { userId, sdkAppId } = this.data
    const data = {
      staff: {
        userId,
        sdkAppId
      },
      sessionKey: '',
      command: this.data.relogin ? 'relogin' : 'login'
    }
    socket.request('login', { data })
      .then(event => {
        this.setData({
          relogin: true
        })
        if (event.errorCode === '-9') {
          wx.showToast({
            title: '初始化失败！',
            success: () => {
              wx.navigateBack()
            },
          })
        } else if(event.errorCode === '-10') {
          wx.showToast({
            title: '账号重复登录',
            icon: 'none'
          })
        } else {
          this.sendHeartbeat('firstHeartbeat').then(msg => {
            console.log('first heartbeat', msg)
            this.heartbeat()
          })
        }
      }).catch(e => {
      console.error('socket login error: ', e)
      wx.showToast({
        title: '初始化失败！',
        success: () => {
          // wx.navigateBack()
        },
      })
    })
  },
  onHandleSocketMessage(data) {
    data.event && console.log('收到事件:', data.event)
    // IM 分配坐席
    if (data.event === '2') this.onHandleCustomerEvent(data)
    // 客服进房
    else if (data.event === '4') this.onHandleEnterRoomEvent(data)
    // 收到挂断事件
    else if (['5', '6', '1051', '1052', '1055'].includes(data.event)) this.onHandleExitRoomEvent(data)
    else if (['2000'].includes(data.event)) {
      this.setData({
        ivrFinish: true
      })
    }
    else if (['2001'].includes(data.event)) {
      this.setData({
        ivrFinish: false
      })
    }
    // 视频通话
    else if (data.event === '7') this.onHandleCallEvent(data)
    // 音频通话
    else if (data.event === '9') this.onHandleCallEvent(data)
  },
  onHandleCustomerEvent(data) {
    // 转入人工将与admin 消息设为已读
    seatLog(data);
    const { staff } = data
    // wx.showToast({
    //   title: '正在转入人工服务，请稍后',
    //   icon: 'none'
    // })
    this.setData({
      ivrFinish: true,
      staff
    })
  },
  // 结束通话
  onHandleExitRoomEvent(data) {
    if(this.data.callStatus === '' || this.data.callStatus === null) return;
    let message;
    if(this.data.videoCall) {
      console.log('通话时长', this.data.callTime)
      message = '视频通话结束  ' + getTime(this.data.callTime);
      if (this.data.callTime === 0) message = '视频通话已取消'
    } else {
      message = '语音通话结束  ' + getTime(this.data.callTime);
      if (this.data.callTime === 0) message = '语音通话已取消'
    }
    console.log('结束通话')
    this.setData({
      callRoomId: null,
      callUserSig: null,
      callPrivateMapKey: null,
      callStatus: null,
      videoCall: false,
      audioCall: false,
      callTime: 0
    })
    this.selectComponent('#chat').createMessage({
      detail: {
        type: 'custom',
        message: {
          type: 'mediaMessage',
          data: {
            type: this.data.videoCall ? 'video' : 'radio',
            actions: 'finish',
            text: message
          }
        }
      }
    });
    seatLog(data) // 挂断上报

    this.selectComponent('#call').endCall()
    clearInterval(callTimer)
  },
  // 开始通话
  onHandleCallEvent(data) {
    seatLog(data);
    const { callInInfo } = data;
    this.setData({
      callRoomId: callInInfo.roomId,
      callUserSig: callInInfo.userSig,
      callPrivateMapKey: callInInfo.privateMapKey,
      callStatus: 'calling'
    })
  },
  // 通话初始化
  onHandleStartCall(event) {
    if (this.selectComponent('#call').data.roomStatus === 'needExit') {
      wx.showToast({
        title: '初始化中...'
      })
      return
    }
    if(event.detail.video) {
      this.setData({
        videoCall: true,
        callStatus: 'ready'
      })
    } else {
      this.setData({
        audioCall: true,
        callStatus: 'ready'
      })
    }
  },
  // 进房通知
  onHandleEnterRoomEvent(data) {
    seatLog(data); // 进房通知上报
    console.error('进房')
    wx.showToast({
      title: '坐席进房',
    })
    this.setData({
      callStatus: 'answering'
    })
    callTimer = setInterval(() => {
      const { callTime } = this.data
      this.setData({
        callTime: callTime + 1
      })
    }, 1000)
  },
  onHandleViews(event) {
    this.setData({
      smallView: event.detail.smallView
    })
  },
  onHandleZoomOutView() {
    this.setData({
      smallView: false
    })
  },
  onHandleIvrEvent(event) {  // 会话结束，隐藏视频通话
    if(event.detail) {
      this.setData({
        ivrFinish: event.detail.ivrFinish
      })
    }
  }
})
