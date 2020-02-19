// components/emoji/emoji.js
const { emojiMap } = require('../../../utils/emojiMap.js')
Component({
  properties: {
    emojiMap: {
      type: Object,
      value: {}
    }
  },
  data: {
    emojiList: []
  },
  lifetimes: {
    attached: function() {
      // 在组件实例进入页面节点树时执行
      const emojiList = [];
      const emoji = Object.keys(this.data.emojiMap)
      for(var i = 0; i < 3; i++) {
        emojiList.push(emoji.slice(44*i, 44*(i+1)))
      }
      this.setData({
        emojiList
      })
    }
  },
  methods: {
    setEmoji(e) {

      this.triggerEvent('emoji', {
        value: e.currentTarget.id
      }, {})
    }
  }
})
