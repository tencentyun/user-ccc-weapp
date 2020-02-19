const md5 = require('md5');
const log = require('./log');

const request = ({url, data, ...args}) => new Promise((resolve, reject) => {
  const app = getApp();
  const options = {};
  const type = url.split('/').pop();
  const timestamp = Date.now();
  const nonce = type + timestamp + md5(timestamp);
  options.nonce = nonce;
  options.requestId = nonce;
  wx.request({
    url: app.globalData.host + url,
    method: 'post',
    data: {
      ...data,
      ...options
    },
    success: res => {
      if(res.data.errorCode === '0') {
        console.log(res);
        resolve(res.data);
      }
      else {
        if(url !== '/debug/seatLog') { seatLog(JSON.stringify({options, res, data})); }
        console.error(res);
        log.error(nonce);
        reject(res);
      }
    },
    fail: err => {
      if(url !== '/debug/seatLog') { seatLog(JSON.stringify({options, res, data})); }
      console.error(err);
      log.error(nonce);
      reject(err);
    },
    args
  })
});

const seatLog = (log, type = '') => {
  const app = getApp();
  const staff = {};
  const openId = wx.getStorageSync('openid') || '';
  const avatar = app.globalData.userInfo && app.globalData.userInfo.avatarUrl;
  staff.userId = 'user-' + (openId || avatar || 'seatLogStaff');
  try {
    if (log instanceof Array) {
      log = log.join('')
    } else if (typeof log === 'object') {
      log = JSON.stringify(log)
    } else {
      log = log + ''
    }
  } catch (e) {
    console.log(e, log)
  }
  log = type ? type + ':' + log : log
  request({
    url: '/ccc/debug/seatLog',
    data: {
      staff,
      log
    }
  }).then()
    .catch(err => console.log('seatlog error: ', err))
};

module.exports = {
  seatLog,
  request
};
