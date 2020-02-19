// pages/chat/hat.js
const { getTime } = require('./utils/formatTime');
const socket = require('./utils/rtcSocket').callSocket;
const log = require('./utils/log');
const { seatLog } = require('./utils/request');
const app = getApp();
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
    }, () => { socket.open() })
  },
  onReady: function() {},
  onShow: function() {},
  onHide: function() {
      this.onHandleExitRoomEvent()
  },
  onUnload: function () {
    socket.close()
    this.onHandleExitRoomEvent()
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
