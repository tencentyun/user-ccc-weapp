// components/messageType/imageMessage/imageMessage.js
Component({
  properties: {
    message: {
      type: Object,
      value: {}
    }
  },
  data: {

  },
  methods: {
    previewImage(event) {
      const src = event.target.dataset.src
      wx.previewImage({
        current: src,
        urls: [src]
      })
    }
  }
})
