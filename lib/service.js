'use strict';

const HttpNetlink = require('./netlink');

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

class Request {
    constructor(id, params, options = {}) {
        this._id = id;
        this._params = {};
        Object.assign(this._params, params, options);
    }

    get id() {
        return this._id;
    }

    get params() {
        return this._params;
    }
}

class Response {
    constructor(json) {
        Object.assign(this, JSON.parse(json));
        this._datas = this.datas;
        let self = this;
        this.datas = new Proxy(this._datas, {
            get: function(target, name) {
                let value;
                if (!target || !(value = target[name])) {
                    return undefined;
                }
                if (value instanceof Object) {
                    return new Proxy(value, {
                        get: function(target, name) {
                            let field;
                            if (self.constructor.datasMap &&
                                (field = self.constructor.datasMap[name])) {
                                if (typeof field == 'function') {
                                    return field(target);
                                }
                                return target[field];
                            }
                            return target[name];
                        }
                    });
                } else {
                    return value;
                }
            }
        });
    }
}

Response.datasMap = {
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

class PageRequest extends Request {
    constructor(id, params, options = {}) {
        super(id, {
            ...params,
            page: 1, pagesize: 15, 
            filtering: [], sorting: [], totals: [],
            ...options
        });
    }
}

class GrinfoRequest extends PageRequest {
    constructor(idcard = '', options = {}) {
        super('zhcxgrinfoQuery', {
            "aaf013":"","aaz070":"","aaf101":"","aac009":"",
            "aac008":"","aac031":"","aac006str":"","aac006end":"",
            "aac066":"","aae030str":"","aae030end":"",
            "aae476":"","aac003":"","aac002":idcard,"aae478":""
        }, options);
    }
}

class GrinfoResponse extends Response {}

GrinfoResponse.datasMap = {
    ...Response.datasMap,
    
    cbzt: 'aac008',
    jfzt: 'aac031',

    state: (rep) => {
        switch (rep.aac031) {
            case '3':
                switch (rep.aac008) {
                    case '1': return '正常待遇人员';
                    case '2': return '暂停待遇人员';
                    case '4': return '终止参保人员';
                    default:  return '其他终止缴费人员';
                }
            case '1':
                switch (rep.aac008) {
                    case '1': return '正常缴费人员';
                    default:  return '其他参保缴费人员';
                }
            case '2':
                switch (rep.aac008) {
                    case '2': return '暂停缴费人员';
                    default:  return '其他暂停缴费人员';
                }
            default: return '其他未知类型人员';
        }
    }
}

// 待遇审核信息

class DyshInfoRequest extends PageRequest {
    constructor ({idcard = '', shzt = '0', options = {}}={}) {
        super('dyfhQuery', {
            "aaf013":"","aaf030":"","aae016":shzt,"aae011":"",
            "aae036":"","aae036s":"","aae014":"","aae015":"",
            "aae015s":"","aac009":"","aac003":"","aac002":idcard
        }, options);
    }
};

class DyshInfoResponse extends Response {
}

DyshInfoResponse.datasMap = {
    payMonth:     'aic160', // 实际待遇开始月份,
    retireDate:   'aic162', // 到龄日期
    payAmount:    'aic166', // 月养老金
    accountMonth: 'aae211', // 财务月份
    ...Response.datasMap,
    paymentInfo: function(rep) {
        let net = new HttpNetlink('10.136.6.99', 7010);
        try {
            let path = `/hncjb/reports?method=htmlcontent&name=yljjs&` +
            `aaz170=${escape(rep.aaz170)}&aaz159=${escape(rep.aaz159)}&aac001=${escape(rep.aac001)}` +
            `&aaz157=${escape(rep.aaz157)}&aaa129=${escape(rep.aaa129)}&aae211=${escape(rep.aae211)}`;

            //console.log(path);
            let content = net.getHttp(path);;
            return content.match(DyshInfoResponse.regexPaymentInfo);
        } finally {
            if (net) net.close();
        }
    }
}

DyshInfoResponse.regexPaymentInfo =
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
      </tr>`;

// 银行账户信息

class BankAccountInfoRequest extends Request {
    constructor (idcard) {
        super('executeSncbgrBankinfoConQ', { "aac002":idcard });
    }
}

class BankAccountInfoResponse extends Response {
    static bankName(bankType) {
        return ({
            "LY":"中国农业银行",
            "ZG":"中国银行",
            "JS":"中国建设银行",
            "NH":"农村信用合作社",
            "YZ":"邮政",
            "JT":"交通银行",
            "GS":"中国工商银行",
        })[bankType];
    }
}

BankAccountInfoResponse.datasMap = {
    bankType: 'bie013', // 银行类型
    name:     'aae009', // 户名
    card:     'aae010', // 卡号
    bankName: (rep) => {
        return BankAccountInfoResponse.bankName(rep.bie013);
    }
}

// 代发人员名单查询

class OtherPaysRequest extends PageRequest {
    constructor(type, cbState, dfState, options = {}) {
        super('executeDfrymdQuery', {
            "aaf013":"","aaf030":"","aae100":cbState,
            "aac002":"","aac003":"","aae116":dfState,
            "aac082":"","aac066":type
        }, options);
    }
}

class OtherPaysResponse extends Response {
    static getTypeName(type) {
        switch (type) {
            case "801": return "独生子女";
	        case "802": return "乡村教师";
	        case "803":	return "乡村医生";
	        case "807":	return "电影放映员";
        }
        return "";
    }
}

function getJbStateChn(state) {
    switch (state) {
        case "1":
            return "正常参保";
        case "2":
            return "暂停参保";
        case "3":
            return "未参保";
        case "4":
            return "终止参保";
    }
    return "";
}

OtherPaysResponse.datasMap = {
    ...Response.datasMap,
    region:         'aaf103',
    startYearMonth: 'aic160',  // 代发开始年月
    standard:       'aae019',  // 代发标准
    type:           'aac066s', // 代发类型
    state:          'aae116',  // 代发状态
    jbState:        'aac008s', // 居保状态
    endYearMonth:   'aae002jz',// 代发截至成功发放年月
    totalSum:       'aae019jz', // 代发截至成功发放金额

    jbStateChn: (rep) => {
        return getJbStateChn(rep.aac008s);
    }
}

module.exports = { 
    Service, Request, Response,
    PageRequest, 
    GrinfoRequest, GrinfoResponse,
    DyshInfoRequest, DyshInfoResponse,
    BankAccountInfoRequest, BankAccountInfoResponse,
    OtherPaysRequest, OtherPaysResponse,
};