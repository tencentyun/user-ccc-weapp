// components/chatAvatar/chatAvatar.js
Component({
  properties: {
    message: {
      type: Object,
      value: {}
    },
    userInfo: {
      type: Object,
      value: {}
    },
    serviceName: {
      type: String,
      value: ''
    },
    staff: {
      type: Object,
      value: {
        mobile: '',
        nickName: '',
        roleId: '',
        sdkAppId: '',
        staffName: '',
        staffNo: '',
        userId: '',
      }
    }
  }
})
