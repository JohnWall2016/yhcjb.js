'use strict';

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
    }
};

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