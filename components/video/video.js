// components/video/video.js
const md5 = require('md5');
const { request }  = require('../../utils/request')
const app = getApp();
let Sound = null;

Component({
  externalClasses: ['class'],
  properties: {
    userId: {
      type: String,
      value: null
    },
    sdkAppId: {
      type: String,
      value: null
    },
    userInfo: {
      type: Object,
      value: null
    },
    servingNum: {
      type: String,
      value: null
    },
    roomID: {
      type: String,
      value: null
    },
    userSig: {
      type: String,
      value: null
    },
    privateMapKey: {
      type: String,
      value: null
    },
    groupId: {
      type: String,
      value: null
    },
    status: {
      type: String,
      value: null
    },
    type: {
      type: String,
      value: null
    },
    small: {
      type: Boolean,
      value: false
    },
    callTime: {
      type: String,
      value: 0
    }
  },
  data: {
    template: 'bigsmall',
    debug: false,
    onRoomEvent: null,
    frontCamera: true,
    roomStatus: 'ready', // ready, needExit , hasEnter, hasExit
    autoplay: true,
    enableCamera: true,
    enableIM: false,
    muted: false,
    beauty: 0,
    minBitrate: 800,
    maxBitrate: 1200,
    aspect: '9:16',
    loadingImg: '',
    callingSmallView: {  // 呼叫中显示前置摄像头
      left: '0',
      top: '0',
      width: '100%',
      height: '100%',
    },
    answeringSmallView: {  // 通话中小窗显示
      left: 'calc(100vw - 30vw - 2vw)',
      top: '10vh',
      width: '30vw',
      height: '50vw'
    },
    miniSmallView: {  // 缩小后不显示
      left: '-9999rpx',
      top: '-9999rpx',
      width: '0',
      height: '0',
    },
    callingPlayView: {
      left: '0',
      top: '0',
      width: '0',
      height: '0',
    },
    hiddenPlayView: {
      left: '0',
      top: '0',
      width: '0',
      height: '0',
    },
    answeringPlayView: {
      left: '0',
      top: '0',
      width: '750rpx',
      height: '1334rpx',
    },

    roomName: null,
    roomCreator: null,
    sdkAppId: null,

    webrtcroomComponent: null,

    smallWindow: false,
    callRoomId: ''
  },
  observers: {
    'roomID, userSig, privateMapKey': function(roomID, userSig, privateMapKey) {
      if(
        roomID
        && userSig
        && privateMapKey
      ) {
        console.error('start call')
        console.error(roomID)
        console.error(userSig)
        console.error(privateMapKey)
        this.setData({
          callRoomId: roomID
        })
        this.startCall()
      }
    },
    'type, status': function(type, status) {
      console.log(type, status)
      if(status === 'ready') {
        if(type === 'video') {
            this.requestStartCall(type)
            this.setData({
              enableCamera: true
            })
        } else if (type === 'audio'){
          this.requestStartCall(type)
          this.setData({
            enableCamera: false
          })
        }
      } else if(status === 'answering') {
        if (Sound) Sound.destroy();
      }
    }
  },
  lifetimes: {
    attached: function () {
      // this.initSound()
      const { sdkAppId, openId, servingNum, userInfo } = app.globalData
      this.setData({
        sdkAppId,
        userId: openId,
        servingNum,
        userInfo,
      })
    },
    ready: function() {

    },
    detached: function () {
      // console.log('end call')
      // this.endCall()
      // if (Sound) Sound.destroy()
    }
  },
  methods: {
    initSound() {
      Sound = wx.createInnerAudioContext();
      Sound.src = 'https://imgcache.qq.com/qcloud/public/gahouliao/call-bg.0f22c6e6abf5129870dff6c32ffc1b5e.mp3'
      Sound.loop = true;
      Sound.play();
    },
    requestStartCall(type) {
      const { userId, sdkAppId, userInfo, servingNum, groupId } = this.data
      const self = this
      const options = {
        requestId: md5(+new Date()),
        nonce: type + 'Call' + md5(+new Date()),
        servingNum,
        direction: '0',
        callType: type === 'video' ? '1' : '0',
        caller: {
          sdkAppId,
          userId,
          userType: '1',
          avatar: userInfo.avatarUrl,
          wxNick: userInfo.nickName
        }
      }
      if (groupId) Object.assign(options, {groupId})
      wx.request({
        url: `${app.globalData.host}/ccc/startCall`,
        method: 'post',
        data: {
          ...options
        },
        success(res) {
          if(res.data.errorCode !== '0') {
            console.log('request start call message', options)
            wx.showToast({
              title: '发生错误，请重试',
              icon: 'none',
              success: () => {
                console.log('start Call fail', res)
                self.onHangUp()
              }
            })
          }
          console.log('startCall success: ', res)
        },
        fail(err) {
          console.error('startCall error: ', err)
        }
      })
    },
    startCall() {
      wx.showToast({
        title: '开始通话'
      })
      wx.nextTick(() => {
        this.selectComponent('#webrtcroom').start()
      })
      this.setData({
        roomStatus: 'ready'
      })
    },
    endCall() {
      // if (!hasEnterRoom) {
      //   console.log('短连接退房')
      //
      // }
      if (this.data.roomStatus === 'hasEnter') {
        this.selectComponent('#webrtcroom').stop()
        this.setData({
          roomStatus: 'hasExit'
        })
      } else {
        console.log('提前退房触发')
        this.setData({
          roomStatus: 'needExit'
        })
        this.requestExitRoom()
      }
      wx.showToast({
        title: '结束通话'
      })
    },
    onHangUp() {
      this.triggerEvent('event', {}, {})
    },
    requestExitRoom () {
      const {sdkAppId, callRoomId, userId} = this.data
      return request({
        url: '/ccc/wxclient/notify',
        data: {
          appId: sdkAppId,
          roomId: callRoomId,
          status: 'exit_succ',
          attendee: {
            userId,
            userType: '1'
          },
          timeStamp: parseInt(+new Date()/1000) + ''
        }
      }).then(function (e) {
        console.log('短连接退房成功')
        return e
      })
    },
    onRoomEvent(e) {
      var self = this;
      console.log('监听webrtc事件: ', e)
      switch (e.detail.tag) {
        case 'error':
          if (this.data.isErrorModalShow) {
            return;
          }
          this.data.isErrorModalShow = true;
          wx.showModal({
            title: '提示',
            content: e.detail.detail,
            showCancel: false,
            complete: function () {
              self.data.isErrorModalShow = false;
              self.setData({
                roomStatus: 'ready'
              })
              // self.goBack();
            }
          });
          this.requestExitRoom()
          break;
          case "enterRoom":
            console.log(
                'roomStatus', self.data.roomStatus)
            if (self.data.roomStatus === 'needExit') {
              console.log('提前退房成功')
              self.setData({
                roomStatus: 'hasExit'
              })
              self.selectComponent('#webrtcroom').stop()
            } else {
              self.setData({
                roomStatus: 'hasEnter'
              })
            }
            break
        default:
          break;
      }
    },
    onHandleZoomOut() {
      console.log('zoom out')
      if(this.data.smallView) return false;
      this.triggerEvent('zoom', {
        smallView: true
      }, {})
    },
    onHandleZoomIn() {
      console.log('zoom in')
      if(!this.data.smallView) return false;
      this.triggerEvent('zoom', {
        smallView: false
      }, {})
    },
    onHandleMuted() {
      this.setData({
        muted: !this.data.muted
      })
    },
    onHandleSwitchCamera() {
      this.selectComponent('#webrtcroom').switchCamera()
      this.setData({
        frontCamera: !this.data.frontCamera
      })
    }
  }
})
