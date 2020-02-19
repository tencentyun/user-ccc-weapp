const { getUserInfo, getPhoneNumber, requestLogin } = require('./utils/login');
const app = getApp();
const { appLogin } = require('./utils/login');

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    hasMobileInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  onLoad: function () {
    appLogin()
    app.dataSetCallback = data => {
      this.setData({
        ...data
      })
    };
  },
  getUserInfo: e => getUserInfo(e.detail),
  getPhoneNumber(e) {
    getPhoneNumber(e.detail)
      .then(e => {
        console.log(e);
        return requestLogin();
      })
  },
  navigatorTo(event) {
    wx.navigateTo({
      url: '/pages/ccc/ccc'
    })
  },
  toMine() {
    wx.navigateTo({
      url: '/pages/mine/mine'
    })
  }
})
