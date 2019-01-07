'use strict';

const { Service, Request } = require('./service');
const conf = require('./_config');
const HttpNetlink = require('./netlink');

class Session extends HttpNetlink {
    constructor(host, port, userId, password, encoding = 'utf8') {
        super(host, port, encoding);

        this._userId = userId;
        this._password = password;
    }

    buildRequest(content) {
        let request = 
            "POST /hncjb/reports/crud HTTP/1.1\n" +
            `Host: ${this.url}\n` +
            "Connection: keep-alive\n" +
            `Content-Length: ${Buffer.byteLength(content)}\n` +
            "Accept: application/json, text/javascript, */*; q=0.01\n" +
            `Origin: http://${this.url}\n` +
            "X-Requested-With: XMLHttpRequest\n" +
            "User-Agent: Mozilla/5.0 (Windows NT 5.1) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/39.0.2171.95 Safari/537.36\n" +
            "Content-Type: multipart/form-data;charset=UTF-8\n" +
            `Referer: http://${this.url}/hncjb/pages/html/index.html\n`+
            "Accept-Encoding: gzip, deflate\n" +
            "Accept-Language: zh-CN,zh;q=0.8\n";
        if (this._sessionId)
            request += `Cookie: jsessionid_ylzcbp=${this._sessionId}; ` +
                `cxcookie=${this._cxCookie}\n`;
        request += `\n${content}`;
        return request;
    }

    request(content) {
        let req = this.buildRequest(content);
        //console.log(`request: ${req}`);
        this.write(req);
    }

    /**
     * @param {Request} request 
     */
    send(request) {
        let [id, params] = [request.id, request.params]
        //console.log(id, params);
        this.request(Service.json(id, params, this._userId, this._password));
    }

    get() {
        return this.readBody();
    }

    login() {
        this.request(Service.json('loadCurrentUser'));
        let header = this.readHeader();
        
        let m = header.match(/Set-Cookie: jsessionid_ylzcbp=(.+?);/);
        if (m) this._sessionId = m[1];
        m = header.match(/Set-Cookie: cxcookie=(.+?);/);
        if (m) this._cxCookie = m[1];
        
        let body = this.readBody(header);

        this.request(Service.json('syslogin', {
            username: this._userId,
            passwd: this._password
        }));

        return this.get();
    }

    logout() {
        this.request(Service.json('syslogout'));
        return this.get();
    }

    /**
     * Connect by a user key and supply to use.
     * @param {string} user User key in config.
     * @param {(s: Session) => void} action The action supplied a session.
     */
    static use(user, action) {
        let s = new Session(conf.host, conf.ip, 
            conf.users[user].id, conf.users[user].pwd);
        try {
            s.login();
            action(s);
            s.logout();
        } finally {
            s.close();
        }
    }
}

module.exports = Session;