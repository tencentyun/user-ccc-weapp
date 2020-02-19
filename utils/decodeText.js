module.exports = function (message, emojiMap) {
  if(!message || !message.payload || !message.payload.text) {
    return []
  }
  var renderDom = []
  // 文本消息
  var temp = message.payload.text.replace(/\&amp\;/g, '&')
  var left = -1
  var right = -1

  Object.keys(emojiMap).forEach(function(item) {
    temp = temp.split(item).join('「' + item + '」')
  })

  while (temp !== '') {
    left = temp.indexOf('「')
    right = temp.indexOf('」')
    switch (left) {
      case 0:
        if (right === -1) {
          renderDom.push({
            name: 'text',
            text: temp
          })
          temp = ''
        } else {
          var _emoji = temp.slice(1, right)
          if (emojiMap[_emoji]) {
            renderDom.push({
              name: 'img',
              src: emojiMap[_emoji]
            })
            temp = temp.substring(right + 1)
          } else {
            renderDom.push({
              name: 'text',
              text: '「'
            })
            temp = temp.slice(1)
          }
        }
        break
      case -1:
        renderDom.push({
          name: 'text',
          text: temp
        })
        temp = ''
        break
      default:
        renderDom.push({
          name: 'text',
          text: temp.slice(0, left)
        })
        temp = temp.substring(left)
        break
    }
  }
  return renderDom
}
