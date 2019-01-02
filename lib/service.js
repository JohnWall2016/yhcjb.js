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
}

Service.Page = {
    page: 1, pagesize: 15, 
    filtering: [], sorting: [], totals: []
};

Service.Grinfo = (pid, options = {}) => ({
    id: 'zhcxgrinfoQuery',
    params:
    {
        "aaf013":"","aaz070":"","aaf101":"","aac009":"",
        "aac008":"","aac031":"","aac006str":"","aac006end":"",
        "aac066":"","aae030str":"","aae030end":"",
        "aae476":"","aac003":"","aac002":pid,"aae478":"",
        ...Service.Page, ...options
    }
});

module.exports = Service;