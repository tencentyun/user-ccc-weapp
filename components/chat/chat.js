// components/chat/chat.js
const Behaviors = require('./behaviors.js');
const IM = require('../../utils/im');
const { request }  = require('../../utils/request')

let tim = null;
Component({
  behaviors: [Behaviors],
  externalClasses: ['class'],
  properties: {
    userSig: {
      type: String,
      value: null
    },
    ivrFinish: {
      type: Boolean,
      value: false
    },
    staff: {
      type: Object,
      value: {
        mobile: '',
        nickName: '',
        roleId: '',
        sdkAppId: '',
        staffName: '',
        staffNo: '',
        userId: '',
      },
      observer: function (newVal, oldVal) {}
    },
    callStatus: {
      type: String,
      value: null,
      observer: function(newVal, oldVal) {
        console.log('callStatus: ', newVal)
        console.log('callStatus: ', oldVal)
      }
    }
  },
  data: {
    sdkAppId: '',
    servingNum: '',
    userId: '',
    imUserSig: '',
    userInfo: {},
    chatObject: '',
    showLoading: false,
    showResendDialog: false,
    scrollTop: 0,
    messageList: [],
    targetMessageList: [],
    emojiMap: {}
  },
  observers: {
    'messageList': function (messageList) {
      this.setData({
        targetMessageList: JSON.parse(JSON.stringify(messageList)).reduce((pre, data) => {
          const newMessage = this.handleMessage(data)
          if (newMessage) {
            pre.push(newMessage)
          }
          return pre
        }, [])
      })
    }
  },
  lifetimes: {
    ready: function() {
      const app = getApp();
      const { sdkAppId, openId, userInfo, servingNum, imUserSig } = app.globalData
      request({
        url: '/ccc/omStateCheck',
        data: {
          group: openId,
          sdkAppId
        }
      }).then((msg) => {
        console.log('是否可以发起视频', msg)
        this.triggerEvent('ivr', {
          ivrFinish: msg.state === '1'
        }, {})
      })
      this.setData({
        sdkAppId,
        userInfo,
        servingNum,
        userId: openId,
        userSig: imUserSig,
        chatObject: '腾讯云联络中心'
      }, () => {
        tim = new IM({
          sdkAppId: this.data.sdkAppId,
          userSig: this.data.userSig,
          userID: this.data.userId,
          to: this.data.userId,
          getMessageListCb: this.getMessageListCallBack.bind(this),
          receivedEventCb: this.updateMessageList.bind(this),
          errorEventCb: this.onHandleIMError.bind(this)
        })
        tim.create()
        tim.login()
      })
      wx.request({
        url: `https://imgcache.qq.com/qcloud/public/gahouliao/emojiMap.2019121199240c0792e80d2a7f6497a2418576a7.json`,
        success: (emojiMap) => {
          this.setData({
            emojiMap: emojiMap.data
          })
        },
        error: (e) => {
          console.error('表请请求失败', e)
        }
      })
    },
    detached: function() {
      tim.logout();
      tim = null
    }
  },
  methods: {
    // 重发消息Dialog
    onHandleOpenResend() {
      this.setData({
        showResendDialog: true
      })
    },
    onHandleCloseResend() {
      this.setData({
        showResendDialog: false
      })
    },
    onHandleResendEvent(event) {
      if(event.detail.index === 0) {
        this.onHandleCloseResend()
      } else {
        //  TODO: 消息重发
        wx.showToast({
          title: '功能开发中',
          icon: 'none',
          success: () => {
            this.onHandleCloseResend()
          }
        })
      }
    },
    // 语音通话
    onHandleAudioCall() {
      if(Boolean(this.data.callStatus)) {
        wx.showToast({
          title: '正在通话中',
          icon: 'none'
        })
        return;
      }
      this.triggerEvent('event', { video: false }, {})
    },
    // 视频通话
    onHandleVideoCall() {
      if (Boolean(this.data.callStatus)) {
        wx.showToast({
          title: '正在通话中',
          icon: 'none'
        })
        return;
      }
      this.triggerEvent('event', { video: true }, {})
    },
    getMessageListCallBack(e) { // 首次登录拉取历史记录
      e.then(res => {
        wx.hideLoading();
        const { messageList } = this.data;
        messageList.unshift(...res.data.messageList);
        this.setData({
          messageList
        }, () => {
          this.scrollToBottom()
        })
      }).catch(err => {
        wx.hideLoading();
        console.log('挂取消息记录失败', err);
      })
    },
    createMessage({detail: {type, message}}) {
      let timMessage;
      const { messageList } = this.data;
      if(type === 'text') {
        timMessage = tim.createTextMessage(message);
      } else if(type === 'image') {
        timMessage = tim.createImageMessage(message)
      } else if(type === 'custom') {
        timMessage = tim.createCustomMessage(message)
      } else {}
      this.sendMessage(timMessage)
      messageList.push(timMessage);
      this.setData({
        messageList
      }, () => {
        this.scrollToBottom()
      });
    },
    sendMessage(message) {
      const { messageList } = this.data;
      tim.sendMessage(message).then(res => {
        console.log('im: send message success', res);
        this.setData({
          messageList
        });
      }).catch(err => {
        this.setData({
          messageList
        });
        console.error('im: send message fail', err);
      })
    },
    scrollToBottom(event) {
      let height = 0;
      if(event && event.detail && event.detail.height) height = event.detail.height;
      wx.createSelectorQuery().in(this).select('.chat-container').scrollOffset(res => {
        this.setData({
          scrollTop: res.scrollHeight + height,
          duration: 0
        })
      }).exec()
    },
    onHandleIMError(event) {
      console.error('im error: ', event)
      const code = event.data.code
      // ivr 协商成功
      // 10101 不再处理
      if(code === 10102) {
        console.log('会话已过期或不存在，需要重新发送协商信息。', event)
        tim.sendIvrConfirmMessage()
          .then(res => {
            console.log('im: send ivr confirm message success', res)
          })
          .catch(err => {
            console.error('im: send ivr confirm message fail', err)
          })
      }
      else if(code === 10103) {
        console.error('ivr confirm error', event)
      }
      else if(code === 10200) {
        console.error('内部错误', event)
      }
      else {
        console.warn('tim event error', event)
      }
    },
    handleMessage (data, cb) {
      switch (data.type) {
        case 'TIMGroupTipElem':
          return false
        case 'TIMCustomElem':
          if (typeof data.payload.data === 'string' && data.payload.data.includes('{')) {
            data.payload.data = JSON.parse(data.payload.data)
          }
          if (data.payload.data.src === '6') {
            // if (cb) return cb(data)
            return false
          }
          if (data._elements.length > 0) {
            data._elements.forEach(item => {
              if (item.type !== 'TIMCustomElem') {
                data.type = item.type
                data.payload = item.content
              }
            })
          }
          return data
        default:
          return data
      }
    },
    handleMessageAry (data, cb) {
      return data.reduce( (pre, item) => {
        const newMessage = this.handleMessage(item, cb)
        if (newMessage) {
          pre.push(item)
        }
        return pre
      }, [])
    },
    updateMessageList(e) {
      const { messageList } = this.data
      console.log('收到消息', e.data)
      const newData = this.handleMessageAry(e.data)
      messageList.push(...newData)
      this.setData({
        messageList
      }, () => {
        this.scrollToBottom()
      })
    }
  }
})
