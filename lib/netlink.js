'use strict'

const Netlink = require('netlinkwrapper');

const GBuffer = require('./gbuffer');

class HttpNetlink {
    constructor(host, port, encoding = 'utf8') {
        this._host = host;
        this._port = port;
        this._encoding = encoding;

        this._netlink = new Netlink();
        this._netlink.connect(this._port, this._host);
        this._netlink.blocking(true);
    }

    write(data) {
        this._netlink.write(data);
    }

    readBuffer(length) {
        return this._netlink.readBuffer(length);
    }

    readUInt8() {
        let buf = this.readBuffer(1);
        if (!buf || !buf[0]) return undefined;
        return buf[0];
    }

    readLine() {
        let buf = new GBuffer();
        let c, n;
        while (true) {
            c = this.readUInt8();
            if (!c) {
                return buf.toString(this._encoding);
            } else if (c == 0xd) { // \r
                n = this.readUInt8();
                if (!n) {
                    buf.addUInt8(c);
                    return buf.toString(this._encoding);
                } else if (n == 0xa) { // \n
                    return buf.toString(this._encoding);
                } else {
                    buf.addUInt8(c);
                    buf.addUInt8(n);
                }
            } else {
                buf.addUInt8(c);
            }
        }
    }

    readHeader() {
        let buf = new GBuffer();
        while (true) {
            let line = this.readLine();
            if (!line || line == '') break;
            buf.addString(line + '\n');
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
                    let data = this.readBuffer(len);
                    buf.addBuffer(data);
                    len -= data.length;
                }
                this.readLine();
            }
        } else if (m = header.match(/Content-Length: (\d+)/)) {
            let len = Number.parseInt(m[1], 10);
            while (len > 0) {
                let data = this.readBuffer(len);
                buf.addBuffer(data);
                len -= data.length;
            }
        } else {
            throw new Error('Unsupported transfer mode');
        }
        return buf.toString(this._encoding);
    }

    close() {
        this._netlink.disconnect();
    }

    get url() {
        return `${this._host}:${this._port}`;
    }

    getHttp(path) {
        let req = 
            `GET ${path} HTTP/1.1\n` +
            `Host: ${this.url}\n` +
            "Connection: keep-alive\n" +
            "Cache-Control: max-age=0\n" +
            "Upgrade-Insecure-Requests: 1\n" +
            "User-Agent: Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/71.0.3578.98 Safari/537.36\n" +
            "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8\n" +
            "Accept-Encoding: gzip, deflate\n" +
            "Accept-Language: zh-CN,zh;q=0.9\n\n";
        this.write(req);
    }
}

module.exports = HttpNetlink;