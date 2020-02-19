import md5 from 'md5';
import NonceEvent  from './nonceEvent'

class Heartbeat {
    constructor({
        url,
        pingTimeout = 2000,
        pongTimeout = 5000,
        reconnectTimeout = 2000,
        repeatLimit = null
    }) {
        this.socket = null;
        this.url = url;

        this.repect = 0;

        this.pingTimeout = pingTimeout;
        this.pongTimeout = pongTimeout;
        this.reconnectTimeout = reconnectTimeout;
        this.repeatLimit = repeatLimit;

        this.handleCloseEvent = handleCloseEvent;
        this.handleErrorEvent = handleErrorEvent;
        this.handleOpenEvent = handleOpenEvent;
        this.handleMessageEvent = handleMessageEvent;
        this.handleReconnectEvent = handleReconnectEvent; // 重连过程处理
        this.handleReconnectOutOfLimit = handleReconnectOutOfLimit; // 重连超出次数处理
    }

    create() {
        this.socket = wx.connectSocket({
            url: this.url,
            success(res) {
                console.log('socket connect success')
                this.initEvent()
            },
            fail(err) {
                console.error('socket connect fail', err)
                this.reconnect();
            }
        })
    }

    initEvent() {
        this.socket.onClose(event => {
            this.handleCloseEvent(event);
            this.reconnect();
        });
        this.socket.onError(event => {
            this.handleErrorEvent(event);
            this.reconnect();
        });
        this.socket.onOpen(event => {
            // 重连次数
            this.repeat = 0;
            this.handleOpenEvent(event);
            this.heartCheck();
        });
        this.socket.onMessage(event => {
            console.log('socket receive message: ', event)
            this.handleMessageEvent(event);
            this.heartCheck();
        })
    }

    reconnect() {
        // 超过重连次数
        if (this.repeatLimit > 0  && this.repeatLimit < this.repect) {
            this.handleReconnectOutOfLimit();
            return false;
        }
        // 重连中或已关闭
        if (this.lockReconnect || this.hasClose) return false;
        this.lockReconnect = true;
        this.repeat++;
        this.handleReconnectEvent();
        setTimeout(() => {
            this.create();
            this.lockReconnect = false;
        }, this.reconnectTimeout)
    }

    send(option, errorCb) {
        this.socket.send({
            data: JSON.stringify(option.data),
            fail: errorCb
        })
    }

    request(type, option) {
        return new Promise((resolve, reject) => {
            const nonce = type + md5(+new Date())
            option.data.nonce = nonce
            this.send(option, err => reject(err))
            NonceEvent.on(nonce, e => resolve(e))
        })
    }

    // 心跳检测
    heartCheck() {
        this.heartReset();
        this.sendHeartBeat();
    }

    sendHeartBeat() {
        if (this.hasClose) return false;
        this.pingTimer = setTimeout(() => {
            this.heartbeat();
            //超过一定时间服务端没返回视为连接已断开
            this.pongTimer = setTimeout(() => {
                this.socket.close();
            }, this.pongTimeout)
        }, this.pingTimeout);
    }

    heartReset() {
        clearTimeout(this.pingTimer);
        clearTimeout(this.pongTimer);
    }

    // 主动关闭
    close() {
        this.hasClose = true;
        this.heartReset();
        this.socket.close();
    }

    heartbeat() {
        this.request('heartbeat')
            .then(e => {
                handleReplyS2C()
            })
            .catch(e => {
                // 心跳错误处理
                // 连续错误次数处理
            })
    }

    login() {

    }
}

function handleCloseEvent(event) {

}
function handleErrorEvent(event) {

}
function handleOpenEvent(event) {

}
function handleMessageEvent(event) {
    const data = JSON.parse(event.data);
    handleReplyS2C(data);
    handleHeartbeat(data);
}
function handleReconnectEvent(event) {

}

function handleReconnectOutOfLimit(event) {

}

function handleReplyS2C(data) {
    if (data.command === 's2c') {
        this.send({
            data: {
                'errorCode': data.error || '0',
                'nonce': data.nonce,
                'msg': data.msg || 'message'
            }
        })
    }
    NonceEvent.emit(data.nonce, data)
}
function handleHeartbeat() {}


