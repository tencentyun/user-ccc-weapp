module.exports = function (config, devConfig) {
  const dev = wx.getAccountInfoSync().miniProgram.appId === devConfig.appId;;
  config = Object.assign(config, {
    userInfo: null,
    openId: null,
    imUserSig: null,
    host: 'https://ccclogic.pstn.avc.qcloud.com',
    wsHost: 'cccstate.pstn.avc.qcloud.com',
    appId: wx.getAccountInfoSync().miniProgram.appId,
  })
  if (dev) {
    config = Object.assign(config, devConfig)
  }
  return config
}