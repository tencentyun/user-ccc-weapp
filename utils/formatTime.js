function getTime(time) {
  time = Number(time)
  var second = time % 60
  time = Math.floor(time / 60)
  var minute = time % 60
  time = Math.floor(time / 60)
  var hour = time

  if(second < 10) {
    second = '0' + second
  }
  if (minute < 10) {
    minute = '0' + minute
  }
  if (hour < 10) {
    hour = '0' + hour
  }

  return hour + ':' + minute + ':' + second
}

module.exports = {
  getTime: getTime
}