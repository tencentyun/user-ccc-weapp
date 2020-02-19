// components/chat/functionBar/functionBar.js
const { request }  = require('../../../utils/request')
Component({
  properties: {
    bottomStatus: {
      type: String,
      value: ''
    },
    ivrFinish: {
      type: Boolean,
      value: false
    },
    emojiMap: {
      type: Object,
      value: {}
    }
  },
  data: {
    textMessage: '',
    bottomStatus: '',
    keyboardHeight: 0,
    readOnly: false
  },
  lifetimes: {
    attached: function() {
      // 在组件实例进入页面节点树时执行
      this.createSelectorQuery().select('#editor').context( (res) => {
        this.editor = res.context
      }).exec()
    }
  },
  methods: {
    onHandleChangeInputMsg(e) {
      this.setData({
        textMessage: e.detail.html.replace(/\<img.+?alt="(.*?)".*?\>/g, '$1').replace(/\<[p|(img)|(span)|(br)].*?\>/g, '').replace(/\<\/p\>/g, '')
      })
    },
    onHandleEmoji(e) {
      const { textMessage } = this.data;
      const that = this
      this.setData({
        readOnly: true
      }, () => {
        this.editor.insertImage({
          src: `${this.properties.emojiMap[e.detail.value]}`,
          alt:  e.detail.value,
          extClass: 'text-img',
          width: '20rpx',
          height: '20rpx',
          success () {
            that.setData({
              readOnly: false
            })
          }
        })
      })
    },
    onHandleAudioCall() {
      this.triggerEvent('audio', {}, {});
    },
    onHandleVideoCall() {
      this.triggerEvent('video', {}, {});
    },
    onHandleClickBottomCircle(e){
      const bottomStatus = this.data.bottomStatus;
      const app = getApp()
      const { sdkAppId, openId } = app.globalData
      if (bottomStatus === '') {
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
          }, {
              bubbles: true,
              composed: true
          })
        })
      }
      this.setData({
        bottomStatus: bottomStatus === e.currentTarget.id ? '' : e.currentTarget.id
      },() => {
        this.triggerEvent('scroll', {}, {});
      })
    },
    sendTextMessage() {
      const that = this
      that.setData({
        textMessage: ''
      })
      this.editor.getContents({
        success (e) {
          let message = e.html.replace(/\<img.+?alt="(.*?)".*?\>/g, '$1').replace(/\<[p|(img)|(span)|(br)].*?\>/g, '').replace(/\<\/p\>/g, '')
          console.log('send Message', message)
          that.triggerEvent('message', {
            type: 'text',
            message
          }, {});
          that.editor.clear()
        }
      })
    },
    sendImageMessage(image) {
      this.triggerEvent('message', {
        type: 'image',
        message: image
      }, {})
    },
    onHandleOpenPhoto() {
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album'],
        success: res => {
          this.sendImageMessage(res)
        },
        fail: err => {
          console.log(err)
        }
      })
    },
    onHandleOpenCamera() {
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['camera'],
        success: res => {
          this.sendImageMessage(res)
        },
        fail: err => {
          console.log(err)
        }
      })
    },
    onHangleInputHeight(e) {
      const { height } = e.detail;
      this.setData({
        keyboardHeight: height,
        bottomStatus: ''
      }, () => {
        this.triggerEvent('scroll', {
          height
        }, {});
      })
    },
    onHandleCancelInputHeight() {
      this.setData({
        keyboardHeight: 0
      })
    },
  }
});
