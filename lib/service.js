'use strict';

const http = require('http');
const { URL } = require('url');

class Service {
    _init() {
        this.serviceid = '';
        this.target = '';
        this.sessionid = null;
        this.loginname = null;
        this.password = null;
        this.params = {};
        this.datas = [this.params];
    }

    constructor(id, params = {}, userId, password) {
        this._init();
        this.serviceid = id;
        this.loginname = userId;
        this.password = password;
        this.params = params;
        this.datas = [this.params];
    }

    toJson() {
        return JSON.stringify(this);
    }

    static json(id, params = {}, userId = null, password = null) {
        return new Service(id, params, userId, password).toJson();
    }

    static fromJson(json) {
        return JSON.parse(json);
    }
}

Service.Page = {
    page: 1, pagesize: 15, 
    filtering: [], sorting: [], totals: []
};

Service.Grinfo = ({idcard = '', options = {}}={}) => ({
    id: 'zhcxgrinfoQuery',
    params: {
        "aaf013":"","aaz070":"","aaf101":"","aac009":"",
        "aac008":"","aac031":"","aac006str":"","aac006end":"",
        "aac066":"","aae030str":"","aae030end":"",
        "aae476":"","aac003":"","aac002":idcard,"aae478":"",
        ...Service.Page, ...options
    }
});

Service.DyshInfo = {
    request: ({idcard = '', shzt = '0', options = {}}={}) => ({
        id: 'dyfhQuery',
        params: {
            "aaf013":"","aaf030":"","aae016":shzt,"aae011":"",
            "aae036":"","aae036s":"","aae014":"","aae015":"",
            "aae015s":"","aac009":"","aac003":"","aac002":idcard,
            ...Service.Page, ...options
        }
    }),
    response: {
        payMonth:     'aic160', // 实际待遇开始月份,
        retireDate:   'aic162', // 到龄日期
        payAmount:    'aic166', // 月养老金
        accountMonth: 'aae211', // 财务月份
    },
    /**
     * @returns {Promise<RegExpMatchArray | null>}
     */
    paymentInfo: function (rep) {
        let url = `http://10.136.6.99:7010/hncjb/reports?method=htmlcontent&name=yljjs&` +
            `aaz170=${rep.aaz170}&aaz159=${rep.aaz159}&aac001=${rep.aac001}` +
            `&aaz157=${rep.aaz157}&aaa129=${rep.aaa129}&aae211=${rep.aae211}`;
        return new Promise((resolve, reject) => {
            http.get(new URL(url), (res) => {
                res.setEncoding('utf8');
                let data = '';
                res.on('data', (d) => {
                    data += d;
                });
                res.on('end', () => { resolve(data) });
            }).on('error', e => { reject(e) });
        }).then(v => {
            return v.match(this.regexPaymentInfo)
        });
    },
    regexPaymentInfo: new RegExp(
     `<tr>
        <td height="32" align="center">姓名</td>
        <td align="center">性别</td>
        <td align="center" colspan="3">身份证</td>
        <td align="center" colspan="2">困难级别</td>
        <td align="center" colspan="3">户籍所在地</td>
        <td align="center" colspan="2">所在地行政区划编码</td>
      </tr>
      <tr class="detail" component="detail">
        <td height="39" align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center" colspan="3">(.+?)</td>
        <td align="center" colspan="2">(.+?)</td>
        <td align="center" colspan="3"(?:/>|>(.+?)</td>)
        <td align="center" colspan="2">(.+?)</td>
      </tr>
      <tr>
        <td height="77" align="center" rowspan="2">缴费起始年月</td>
        <td align="center" rowspan="2">累计缴费年限</td>
        <td align="center" rowspan="2" colspan="2">个人账户累计存储额</td>
        <td height="25" align="center" colspan="8">其中</td>
      </tr>
      <tr>
        <td height="30" align="center">个人缴费</td>
        <td align="center">省级补贴</td>
        <td align="center">市级补贴</td>
        <td align="center">县级补贴</td>
        <td align="center">集体补助</td>
        <td align="center">被征地补助</td>
        <td align="center">政府代缴</td>
        <td align="center">利息</td>
      </tr>
      <tr class="detail" component="detail">
        <td height="40" align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center" colspan="2">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
      </tr>
      <tr>
        <td align="center" rowspan="2">
          <p>领取养老金起始时间</p>
        </td>
        <td align="center" rowspan="2">月养老金</td>
        <td height="29" align="center" colspan="5">其中：基础养老金</td>
        <td align="center" colspan="5">个人账户养老金</td>
      </tr>
      <tr>
        <td height="31" align="center">国家补贴</td>
        <td height="31" align="center">省级补贴</td>
        <td align="center">市级补贴</td>
        <td align="center">县级补贴</td>
        <td align="center">加发补贴</td>
        <td align="center">个人实缴部分</td>
        <td align="center">缴费补贴部分</td>
        <td align="center">集体补助部分</td>
        <td align="center">被征地补助部分</td>
        <td align="center">政府代缴部分</td>
      </tr>
      <tr class="detail" component="detail">
        <td height="40" align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
        <td align="center">(.+?)</td>
      </tr>`
    )
};

Service.BankAccountInfo = {
    request: (idcard) => ({
        id: 'executeSncbgrBankinfoConQ',
        params: { "aac002":idcard }
    }),
    response: {
        bankType: 'bie013', // 银行类型
        name:     'aae009', // 户名
        card:     'aae010'  // 卡号
    }
}

class DataWrapper {
    _defineProperties(response = {}) {
        let props = {};
        for (let k of Object.keys(response)) {
            let v = response[k];
            if (this.hasOwnProperty(v))
                props[k] = { get: () => this[v] };
        }
        Object.defineProperties(this, props);
    }

    constructor(data, response) {
        Object.assign(this, data);
        this._defineProperties(DataWrapper.response);
        if (response)
            this._defineProperties(response);
    }
}

DataWrapper.response = {
    id:       'aac001', // ID号
    idcard:   'aac002', // 身份证
    name:     'aac003', // 姓名
    sex:      'aac004', // 性别
    nation:   'aac005', // 民族
    birthDay: 'aac006', // 生日
    houseHold:'aac009', // 户籍

    xzqh:     'aaa027', // 行政区划
    dwmc:     'aaa129', // 单位名称
}

Service.Data = DataWrapper;

module.exports = Service;