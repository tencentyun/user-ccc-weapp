const promisify = require('./promisify');
const { request, seatLog } = require('./request');
const options = {};
function index() {
  wx.showLoading({
    title: '加载中',
    mask: true
  });
  promisify(wx.checkSession)()
    .then(checkSessionRes => {
      if (checkSessionRes.errMsg !== 'checkSession:ok') return Promise.reject(checkSessionRes.errMsg);
      const openId = wx.getStorageSync('openid');
      if (openId === '') return Promise.reject('openid 不存在');
      else {
        options.openId = openId;
      }
      return checkSessionRes;
    })
    .catch(checkSessionErr => {
      console.log(checkSessionErr);
      return promisify(wx.login)();
    })
    // 用户信息
    .then(res => {
      if(res.code) options.jsCode = res.code;  // 未登录字段
      return promisify(wx.getUserInfo)();
    })
    .then(userInfoRes => {
      return getUserInfo(userInfoRes);
    })
    // userInfo catch
    .catch(getUserInfoErr => { // 获取用户信息失败
      console.warn('用户信息未授权', getUserInfoErr.errMsg);
      return Promise.reject(getUserInfoErr);
    })
    // 手机号码
    .then(e => {
      console.log(e);
      return hasMobile();
    })
    .then(e => {
      console.log(e);
      return requestLogin(options);
    })
    .catch(err => {
      console.log(err);
      wx.hideLoading();
      wx.hideToast();
    })
}

function hasMobile() {
  return new Promise(((resolve, reject) => {
    const app = getApp();
    const mobile = wx.getStorageSync('mobile');
    if(mobile === '') {
      app.dataSetCallback({
        hasMobileInfo: false
      });
      reject('号码不存在');
    } else {
      app.dataSetCallback({
        hasMobileInfo: true
      });
      resolve('号码存在');
    }
  }));
}
function getPhoneNumber(e) {
  return new Promise(((resolve, reject) => {
    const app = getApp();
    if(e.errMsg === 'getPhoneNumber:ok') {
      // 重新login 一次, 防止code失效
      promisify(wx.login)()
        .then(res => {
          app.dataSetCallback({
            hasMobileInfo: true
          });
          options.jsCode = res.code;
          setMobileInfo(e);
          resolve(e.errMsg);
        })
        .catch(loginErr => {
          app.dataSetCallback({
            hasMobileInfo: false
          });
          reject(loginErr);
        })
    }
  }))
}
function getUserInfo(e) {
  return new Promise(((resolve, reject) => {
    const app = getApp();
    if(e.errMsg === 'getUserInfo:ok') {
      app.dataSetCallback && app.dataSetCallback({
        hasUserInfo: true
      });
      app.globalData.userInfo = e.userInfo;
      setUserInfo(e);
      resolve(e.errMsg);
    } else {
      app.dataSetCallback && app.dataSetCallback({
        hasUserInfo: false
      });
      reject(e.errMsg);
    }
  }))
}

function setUserInfo(e) {
  // 未登录
  options.encryptedData = e.encryptedData;
  options.iv = e.iv;

  // 已登录
  options.nickName = e.userInfo.nickName;
  options.avatar = e.userInfo.avatarUrl;
}
function setMobileInfo(e) {
  options.mobileEnc = e.encryptedData;
  options.mobileIV = e.iv;
}

function requestLogin( args = {}, ) {
  const hasLogin = !!args.openId;
  wx.showLoading({
    title: '登录中'
  });
  return new Promise(((resolve, reject) => {
    if(hasLogin) {
      delete options.jsCode;
      delete options.encryptedData;
      delete options.iv;
      delete options.mobileEnc;
      delete options.mobileIV;
    } else {
      delete options.openId;
      delete options.nickName;
      delete options.avatar;
    }
    const app = getApp();
    request({
      url: '/ccc/wxlogin',
      data: {
        sdkAppId: app.globalData.sdkAppId,
        wxAppId: app.globalData.appId,
        ...options,
        ...args
      }
    }).then(res => {
      if(res.openid) wx.setStorageSync('openid', res.openid);
      if(res.mobile) wx.setStorageSync('mobile', res.mobile);
      app.globalData.openId = wx.getStorageSync('openid');
      app.globalData.imUserSig = res.im_sig;
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      if (!app.globalData.isDev) {
        wx.navigateTo({
          url: '/pages/ccc/ccc'
        })
      }
      resolve(res);
    }).catch(err => {
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none',
        success: () => {
          getApp().dataSetCallback && getApp().dataSetCallback({
            hasUserInfo: false,
            hasMobileInfo: false
          })
        }
      });
      reject(err);
    })
  }))
}
module.exports = {
  appLogin: index,
  getUserInfo,
  getPhoneNumber,
  requestLogin
};
