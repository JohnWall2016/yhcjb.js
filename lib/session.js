'use strict';

const Netlink = require('netlinkwrapper');
const GBuffer = require('./gbuffer');
const Service = require('./service');
const conf = require('./_config');

class Session {
    constructor(host, port, userId, password, encoding = 'utf8') {
        this._host = host;
        this._port = port;
        this._userId = userId;
        this._password = password;
        this._encoding = encoding;

        this._netlink = new Netlink();
        this._netlink.connect(this._port, this._host);
        this._netlink.blocking(true);
    }

    get url() {
        return `${this._host}:${this._port}`;
    }

    write(data) {
        this._netlink.write(data);
    }

    read(length) {
        return this._netlink.read(length);
    }

    readByte() {
        return this.read(1);
    }

    close() {
        this._netlink.disconnect();
    }

    readLine() {
        let buf = new GBuffer();
        let c, n, offset = 0;
        while (true) {
            c = this.readByte();
            if (!c) {
                if (offset > 0)
                    return buf.toString(this._encoding);
                else
                    return undefined;
            }
            if (c == '\r') {
                n = this.readByte();
                if (n == '\n') {
                    return buf.toString(this._encoding);
                }
                else if (!n) {
                    buf.append(c);
                    return buf.toString(this._encoding);
                } else {
                    buf.append(c);
                    buf.append(n);
                }
            } else {
                buf.append(c);
            }
        }
    }

    readHeader() {
        let buf = new GBuffer();
        while (true) {
            let line = this.readLine();
            if (!line || line == '') break;
            buf.append(line + '\n');
        }
        return buf.toString(this._encoding);
    }

    readBody(header = '') {
        let buf = new GBuffer();
        if (!header || header == '')
            header = this.readHeader();
        let m;
        if (m = header.match(/Transfer-Encoding: chunked/)) {
            while (true) {
                let len = Number.parseInt(this.readLine(), 16);
                if (len <= 0) {
                    this.readLine();
                    break;
                }
                while (len > 0) {
                    let data = this.read(len);
                    let rlen = Buffer.byteLength(data);
                    buf.append(data);
                    len -= rlen;
                }
                this.readLine();
            }
        } else if (m = header.match(/Content-Length: (\d+)/)) {
            let len = Number.parseInt(m[1], 10);
            while (len > 0) {
                let data = this.read(len);
                let rlen = Buffer.byteLength(data);
                buf.append(data);
                len -= rlen;
            }
        } else {
            throw new Error('Unsupported transfer mode');
        }
        return buf.toString(this._encoding);
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

    send({ id, params }) {
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

module.exports = { Session, Service };