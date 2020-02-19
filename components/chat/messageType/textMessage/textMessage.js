// components/messageType/text/text.
const decodeText = require('../../../../utils/decodeText')
Component({
  properties: {
    emojiMap: {
      type: Object,
      value: {}
    },
    message: {
      type: Object,
      value: {},
      observer (newVal) {
        this.setData({
          messageList: decodeText(newVal, this.properties.emojiMap)
        })
      }
    }
  },
  data: {
    messageList: []
  },
  methods: {
    copy() {
      console.log(this.data.messageList)
      wx.setClipboardData({
        data: this.data.messageList.map(item => {
          if (item.name === 'img') return '[表情]'
          return item.text
        }).join('')
      })
    }
  }
})
