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
                                if (typeof field === 'function') {
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

// 个人综合查询

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

    state: (rep) => jbState(rep.aac008, rep.aac031)
}

function jbState(cbzt, jfzt) {
    switch (jfzt) {
        case '3':
            switch (cbzt) {
                case '1': return '正常待遇人员';
                case '2': return '暂停待遇人员';
                case '4': return '终止参保人员';
                default:  return '其他终止缴费人员';
            }
        case '1':
            switch (cbzt) {
                case '1': return '正常缴费人员';
                default:  return '其他参保缴费人员';
            }
        case '2':
            switch (cbzt) {
                case '2': return '暂停缴费人员';
                default:  return '其他暂停缴费人员';
            }
        default: return '其他未知类型人员';
    }
}

// 待遇核定信息

class DyhdInfoRequest extends PageRequest {
    constructor(dlny, { 
        yssj = '1',  cbzt = '1', sbbd = '1',
        options = {
            page: 1, pagesize: 500, 
            sorting: [{"dataKey":"xzqh","sortDirection":"ascending"}]
        },
    }={}) {
        super('dyryQuery', {
            "aaf013":"","aaf030":"","dlny":dlny,"yssj":yssj,
            "aac009":"","qfbz":"","aac002":"","aac008":cbzt,
            "sb_type":sbbd
        }, options);
    }
}

class DyhdInfoResponse extends Response {}

DyhdInfoResponse.datasMap = {
    name:     'xm',
    idcard:   'sfz',
    birthDay: 'csrq',
    cbzt:     'rycbzt',    // 参保状态
    jfzt:     'aac031',    // 缴费状态
    qbzt:     'qysb_type', // 企保参保
    // gjnx 共缴年限
    // lqny 待遇领取年月
    // bz   备注 '应缴8年，实缴3年，欠费5年'
    // xzqh 行政区划

    state: (rep) => jbState(rep.rycbzt, rep.aac031),
    sex:　(rep) => {
        switch(rep.xb) {
            case '1': return '男';
            case '2': return '女';
            default: return '未知性别';
        }
    },
    hjxz: (rep) => { // 户籍性质
        switch(rep.aac009) {
            case '20': return '农村户籍';
            case '10': return '城市户籍';
            default: return '未知户籍';
        }
    },
    yjnx: (rep) => { // 应缴年限
        const birthDay = `${rep.csrq}`;
        let year = Number(birthDay.substring(0, 4));
        const month = Number(birthDay.substring(4, 6));
        year = year - 1951;
        if (year >= 15) {
            return 15;
        } else if (year < 0) {
            return 0;
        } else if (year == 0) {
            if (month >= 7) return 1;
            return 0;
        } else {
            return year;
        }
    },
    sjnx: (rep) => Number(rep.gjnx), // 实缴年限
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

class DyshInfoResponse extends Response {}

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

// 代发支付单查询

class OtherPayListRequest extends PageRequest {
    constructor({ type, yearMonth, state = '0', options = {} }) {
        super('dfpayffzfdjQuery', {
            "aaa121":type,"aaz031":"","aae002":yearMonth,
            "aae089":state
        }, options);
    }
}

class OtherPayListResponse extends Response {
    static otherPayTypeChn(type) {
        switch (type) {
            case "DF0001":
                return "独生子女";
            case "DF0002":
                return "乡村教师";
            case "DF0003":
                return "乡村医生";
            case "DF0007":
                return "电影放映员";
        }
        return "";
    }
}

OtherPayListResponse.datasMap = {
    typeChn:   'aaa121', // 业务类型中文名
    payList:   'aaz031'  // 付款单号
}

// 代发支付单明细查询

class OtherPayListDetailRequest extends PageRequest {
    constructor(payList, options = {page: 1, pagesize: 500}) {
        super('dfpayffzfdjmxQuery', {
            "aaz031":`${payList}`
        }, options);
    }
}

class OtherPayListDetailResponse extends Response {}

OtherPayListDetailResponse.datasMap = {
    ...Response.datasMap,
    region:     'aaf103',
    payFlag:    'aae117', // 支付标志
    yearMonth:  'aae002', // 代发年月
    payList:    'aaz031', // 付款单号
    perPayList: 'aaz220', // 个人单号
    payAmount:  'aae019', // 支付总金额
}

// 代发支付单个人明细查询

class OtherPerPayListDetailRequest extends PageRequest {
    constructor({ id, payList, perPayList, options = {page: 1, pagesize: 500} }) {
        super('dfpayffzfdjgrmxQuery', {
            "aac001":`${id}`, "aaz031":`${payList}`, "aaz220":`${perPayList}`
        }, options);
    }
}

class OtherPerPayListDetailResponse extends Response {}

OtherPerPayListDetailResponse.datasMap = {
    yearMonth: 'aae003', // 待遇日期
    payFlag:   'aae117', // 支付标志
    payDate:   'aae002', // 发放日期
    payList:   'aaz031', // 付款单号
    payAmount: 'aae019', // 支付金额
}

// 财务支付

class PaymentRequest extends PageRequest {
    constructor(yearMonth, state, options = {
        page: 1, pagesize: 1000, 
        totals: [{"dataKey":"aae169","aggregate": "sum"}]
    }) {
        super('cwzfglQuery', {
            "aaa121":"","aaz031":"","aae002":yearMonth,
            "aae089":state,"bie013":""
        }, options);
    }
}

class PaymentResponse extends Response {}

PaymentResponse.datasMap = {
    objectType:        'aaa079', // 支付对象类型: "3" - 个人支付
    paymentNO:         'aaz031', // 支付单号
    state:             'aae088', // 支付状态
    paymentType:       'aaa121', // 业务类型: "F10004" - 重复缴费退费; "F10007" - 缴费调整退款; "F10006" - 享受终止退保
    yearMonth:         'aae002', // 发放年月
    objectBankName:    'aae009', // 支付对象银行户名
    objectCode:        'bie013', // 支付对象编码（身份证号码）
    objectBankAccount: 'aae010', // 支付对象银行账号
}

class PaymentPeopleRequest extends PageRequest {
    constructor({paymentNO, yearMonth, state, paymentType, options = {
        page: 1, pagesize: 15, 
        totals: [{"dataKey":"aae019","aggregate": "sum"}]
    }}) {
        super('cwzfgl_zfdryQuery', {
            "aaf015":"","aac002":"","aac003":"",
            "aaz031":`${paymentNO}`,"aae088":`${state}`,
            "aaa121":`${paymentType}`,"aae002":`${yearMonth}`
        }, options);
    }
}

class PaymentPeopleResponse extends Response {}

PaymentPeopleResponse.datasMap = {
    ...Response.datasMap,
    payList:     "aaz031",
    payAmount:   "aae019",
    paymentType: "aaa121", // 业务类型: "F10004" - 重复缴费退费; "F10007" - 缴费调整退款; "F10006" - 享受终止退保
    paymentTypeChn: (rep) => {
        switch (rep.aaa121) {
            case "F10004":
                return "重复缴费退费";
            case "F10006":
                return "享受终止退保";
            case "F10007":
                return "缴费调整退款";
        }
        return "";
    }
}

// 终止审核

class JfzzshInfoRequest extends PageRequest {
    constructor(idcard) {
        super('cbzzfhPerInfoList', {
            "aaf013":"","aaf030":"","aae016":"",
            "aae011":"","aae036":"","aae036s":"",
            "aae014":"","aae015":"","aae015s":"",
            "aac002":idcard,"aac003":"","aac009":"",
            "aae0160":""
        });
    }
}

class JfzzshInfoResponse extends Response {}

JfzzshInfoResponse.datasMap = {
    ...Response.datasMap,
    zzYearMonth: "aae031", 
    shDate:      "aae015"
}

class JfzzPerInfoRequest extends Request {
    constructor(jfzzshInfo) {
        let { aaz038, aac001, aae160 } = jfzzshInfo;
        aaz038 = `${aaz038}`;
        aac001 = `${aac001}`;
        super('cbzzfhPerinfo', { aaz038, aac001, aae160 });
    }
}

class JfzzPerInfoResponse extends Response {}

JfzzPerInfoResponse.datasMap = {
    zzReason: "aae160", // 终止原因
    bankId:   "aaz065", // 银行类型
    zzReasonChn: (rep) => getZzReasonChn(rep.aae160),
    bankName: (rep) => getBankNameChn(rep.aaz065)
}

class DyzzshInfoRequest extends PageRequest {
    constructor(idcard) {
        super('dyzzfhPerInfoList', {
            "aaf013":"","aaf030":"","aae016":"",
            "aae011":"","aae036":"","aae036s":"",
            "aae014":"","aae015":"","aae015s":"",
            "aac002":idcard,"aac003":"","aac009":"",
            "aae0160":"","aic301":""
        });
    }
}

class DyzzshInfoResponse extends Response {}

DyzzshInfoResponse.datasMap = {
    ...Response.datasMap,
    zzYearMonth: "aic301", 
    shDate:      "aae015"
}

class DyzzPerInfoRequest extends Request {
    constructor(dyzzshInfo) {
        let { aaz176 } = dyzzshInfo;
        aaz176 = `${aaz176}`;
        super('dyzzfhPerinfo', { aaz176 });
    }
}

class DyzzPerInfoResponse extends Response {}

DyzzPerInfoResponse.datasMap = {
    zzReason: "aae160", // 终止原因
    bankId:   "aaz065", // 银行类型
    zzReasonChn: (rep) => getZzReasonChn(rep.aae160),
    bankName: (rep) => getBankNameChn(rep.aaz065)
}

function getZzReasonChn(zzReason) {
    switch (zzReason) {
        case "1401":
            return "死亡";
        case "1406":
            return "出外定居";
        case "1407":
            return "参加职保";
        case "1499":
            return "其他原因";
        case "6401":
            return "死亡";
        case "6406":
            return "出外定居";
        case "6407":
            return "参加职保";
        case "6499":
            return "其他原因";
    }
    return "";
}

function getBankNameChn(bankId) {
    switch (bankId) {
        case "LY":
            return "中国农业银行";
        case "ZG":
            return "中国银行";
        case "JS":
            return "中国建设银行";
        case "NH":
            return "农村信用合作社";
        case "YZ":
            return "邮政";
        case "JT":
            return "交通银行";
        case "GS":
            return "中国工商银行";
    }
    return "";
}

// 待遇暂停

class PausePayInfoRequest extends PageRequest {
    constructor(idcard = '', audited = '1') {
        super('queryAllPausePersonInfosForAuditService', {
            "aaf013":"","aaz070":"","aac002":idcard,
            "aae141":"","aae141s":"","aae016":audited,
            "aae036":"","aae036s":"","aac009":"",
            "aae015":"","aae015s":"","aae116":""
        });
    }
}

class PausePayInfoResponse extends Response {}

PausePayInfoResponse.datasMap = {
    ...Response.datasMap,
    pauseTime:   "aae141",
    pauseReason: "aae160",
    memo:        "aae013",

    pauseReasonChn: (rep) => {
        switch (rep.aae160) {
            case "1299":
                return "其他原因暂停养老待遇";
            case "1200":
                return "养老保险待遇暂停";
            case "1201":
                return "养老待遇享受人员未提供生存证明";
            default:
                return `其它未知类型${rep.aae160}`;
        }
    }
}

// 疑似死亡

class SuspectedDeathInfoRequest extends PageRequest {
    constructor(idcard = '') {
        super('dsznswcxQuery', {
            "aac003":"","aae037s":"","aae037e":"",
            "aac002":idcard,"aaf013":"","aaf101":"",
            "aac008":"","hsbz":""
        });
    }
}

class SuspectedDeathInfoResponse extends Response {}

SuspectedDeathInfoResponse.datasMap = {
    ...Response.datasMap,

    compareTime: "aae036",
    deathTime:   "aae037",
    jbzt:        "aac008",
    memo:        "bz",
    // hsbz 核实标志
    // bdzt 比对时状态
}

module.exports = { 
    Service, Request, Response,
    PageRequest, 
    GrinfoRequest, GrinfoResponse,
    DyhdInfoRequest, DyhdInfoResponse,
    DyshInfoRequest, DyshInfoResponse,
    BankAccountInfoRequest, BankAccountInfoResponse,
    OtherPaysRequest, OtherPaysResponse,
    OtherPayListRequest, OtherPayListResponse,
    OtherPayListDetailRequest, OtherPayListDetailResponse,
    OtherPerPayListDetailRequest, OtherPerPayListDetailResponse,
    PaymentRequest, PaymentResponse,
    PaymentPeopleRequest, PaymentPeopleResponse,
    JfzzshInfoRequest, JfzzshInfoResponse,
    JfzzPerInfoRequest, JfzzPerInfoResponse,
    DyzzshInfoRequest, DyzzshInfoResponse,
    DyzzPerInfoRequest, DyzzPerInfoResponse,
    PausePayInfoRequest, PausePayInfoResponse,
    SuspectedDeathInfoRequest, SuspectedDeathInfoResponse
};