const TIM = require('tim-wx-sdk');
const COS = require('cos-wx-sdk-v5');
const { seatLog } = require('./request');

class IM {
  constructor({sdkAppId, userID, userSig, receivedEventCb,getMessageListCb, errorEventCb, to}) {
    this.tim = null;
    this.sdkAppId = sdkAppId;
    this.userID = userID;
    this.userSig = userSig;
    this.to = to;
    this.getMessageListCb = getMessageListCb;
    this.receivedEventCb = receivedEventCb;
    this.errorEventCb = errorEventCb;
  }

  create() {
    console.log('im: create');
    this.tim = TIM.create({
      SDKAppID: this.sdkAppId
    });
    this.tim.registerPlugin({'cos-wx-sdk': COS});
    this.initEvents();
  }

  login() {
    console.log('im: login');
    this.tim.login({
      userID: this.userID,
      userSig: this.userSig
    }).then(res => {
      console.log('im login success', res);
    }).catch(err => {
      console.error('im login fail', err);
      wx.showToast({
        title: '登录错误，请重试',
        success: () => {
          setTimeout(() => wx.navigateBack(), 2000);
        }
      })
    })
  }

  logout() {
    console.log('im: logout');
    this.tim.logout();
    this.removeEvents();
  }

  initEvents() {
    console.log('im: init events');
    this.tim.on(TIM.EVENT.MESSAGE_RECEIVED, this.imReceivedEvent, this);
    this.tim.on(TIM.EVENT.CONVERSATION_LIST_UPDATED, this.imListUpdateEvent, this);
    this.tim.on(TIM.EVENT.KICKED_OUT, this.imKickedOutEvent, this);
    this.tim.on(TIM.EVENT.ERROR, this.imErrorEvent, this);
    this.tim.on(TIM.EVENT.SDK_READY, this.imReadyEvent, this);
    this.tim.on(TIM.EVENT.SDK_NOT_READY, this.imNotReadyEvent, this);
  }

  removeEvents() {
    console.log('im: remove events');
    this.tim.off(TIM.EVENT.MESSAGE_RECEIVED, this.imReceivedEvent, this);
    this.tim.off(TIM.EVENT.CONVERSATION_LIST_UPDATED, this.imListUpdateEvent, this);
    this.tim.off(TIM.EVENT.KICKED_OUT, this.imKickedOutEvent, this);
    this.tim.off(TIM.EVENT.ERROR, this.imErrorEvent, this);
    this.tim.off(TIM.EVENT.SDK_READY, this.imReadyEvent, this);
    this.tim.off(TIM.EVENT.SDK_NOT_READY, this.imNotReadyEvent, this);
  }

  imReceivedEvent(e) {
    this.receivedEventCb(e);
  }

  imListUpdateEvent(e) {
    console.log(TIM.EVENT.CONVERSATION_LIST_UPDATED, e);
  }

  imKickedOutEvent(e) {
    console.log(TIM.EVENT.KICKED_OUT, e);
    wx.showToast({
      title: '重复登录，请重试',
      success: () => {
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      }
    })
  }

  imErrorEvent(e) {
    console.error(TIM.EVENT.ERROR, e);
    // seatLog(e);
    this.errorEventCb(e);
  }

  imReadyEvent(e) {
    console.log('im: ready', TIM.EVENT.SDK_READY, e);
    // console.log()
    this.getMessageListCb(this.getMessageList())
    // this.cb();
  }
  imNotReadyEvent(e) {
    console.log(TIM.EVENT.SDK_NOT_READY, e);
  }
  createCustomMessage(message) {
    console.log(this.to);
    return this.tim.createCustomMessage({
      to: this.to,
      conversationType: TIM.TYPES.CONV_GROUP,
      payload: {
        data: JSON.stringify(message)
      }
    })
  }

  createTextMessage(message) {
    console.log(this.to);
    return this.tim.createTextMessage({
      to: this.to,
      conversationType: TIM.TYPES.CONV_GROUP,
      payload: {
        text: message
      }
    })
  }

  createImageMessage(image) {
    return this.tim.createImageMessage({
      to: this.to,
      conversationType: TIM.TYPES.CONV_GROUP,
      payload: {
        file: image
      },
      onProgress: event => console.log('image upload progress ', event)
    })
  }

  sendIvrConfirmMessage() {
    const app = getApp()
    const message = this.tim.createCustomMessage({
      to: this.to,
      conversationType: TIM.TYPES.CONV_GROUP,
      payload: {
        data: JSON.stringify({
          src: "2",
          ivrId: app.globalData.ivrId
        })
      }
    });
    return this.tim.sendMessage(message);
  }

  sendMessage(message) {
    return this.sendIvrConfirmMessage()
      .then(res => {
        console.log('im: ivr confirm success', res);
      })
      .catch(err => {
        console.warn('im: ivr confirm fail', err);
        seatLog(JSON.stringify({err}));
        return Promise.resolve()
      })
      .then(() => {
        console.log('im: after ivr confirm');
        return this.tim.sendMessage(message);
      })
  }

  reSendMessage(message) {
    return this.tim.resendMessage(message);
  }

  getMessageList() {
    return new Promise((resolve, reject) => {
      this.tim.getMessageList({
        conversationID: 'GROUP' + this.to
      }).then(res => {
        console.log('拉取消息记录ID', 'GROUP' + this.to)
        console.log('拉取消息记录', res)
        this.setMessageRead();
        res.data.messageList = res.data.messageList.filter(message => {
          return message.payload.data !== '{"src":"2","ivrId":"90"}'  // 过滤ivr信息
        });
        resolve(res);
      }).catch(err => {
        reject(err);
      })
    })
  }

  setMessageRead() {
    this.tim.setMessageRead({conversationID: this.to})
      .then()
      .catch(err => {
        console.error('im: setMessageRead fail', err)
      })
  }
}

module.exports = IM;
