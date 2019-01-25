'use strict';

const Xlsx = require('xlsx-populate')
const Session = require('../lib/session');
const HttpNetlink = require('../lib/netlink');
const { 
    Response, GrinfoRequest, DyshInfoRequest, DyshInfoResponse,
    BankAccountInfoRequest, BankAccountInfoResponse,
    JfzzshInfoRequest, JfzzshInfoResponse,
    JfzzPerInfoRequest, JfzzPerInfoResponse,
    DyzzshInfoRequest, DyzzshInfoResponse,
    DyzzPerInfoRequest, DyzzPerInfoResponse,
    PaymentRequest, PaymentResponse,
    PaymentPeopleRequest, PaymentPeopleResponse,
} = require('../lib/service');

describe('session', function() {

    const output = [];

    function log(msg) {
        output.push(msg);
    }

    beforeEach(function() {
        output.splice(0);
    });

    afterEach(function() {
        console.log("--------------------------------------------------------");
        for (const msg of output) {
            console.log(msg);
        }
        console.log("--------------------------------------------------------");
    });

    it('支付管理', function() {
        Session.use('002', session => {
            session.send(new PaymentRequest('201901', '1'));
            let response = new PaymentResponse(session.get());
            log(response.datas[0]);

            const data = response.datas[0];
            session.send(new PaymentPeopleRequest({
                paymentNO:   data.paymentNO,
                yearMonth:   data.yearMonth,
                state:       data.state,
                paymentType: data.paymentType,
            }));
            response = new PaymentPeopleResponse(session.get());
            log(response.datas[0]);
        });
    });

    it.only('终止审核', function() {
        Session.use('002', session => {
            let data;
            session.send(new JfzzshInfoRequest('430311196001310514'));
            let response = new JfzzshInfoResponse(session.get());
            log(response.datas[0]);
        
            session.send(new JfzzPerInfoRequest(response.datas[0]));
            response = new JfzzPerInfoResponse(session.get());
            log(data = response.datas[0]);
            log(`${data.zzReasonChn} ${data.bankName}`);
        
            session.send(new DyzzshInfoRequest('430321192802061524'));
            response = new DyzzshInfoResponse(session.get());
            log(response.datas[0]);
        
            session.send(new DyzzPerInfoRequest(response.datas[0]));
            response = new DyzzPerInfoResponse(session.get());
            log(data = response.datas[0]);
            log(`${data.zzReasonChn} ${data.bankName}`);
        });
    });

    it('参保查询', function() {
        Session.use('002', s => {
            s.send(new GrinfoRequest('430311195702091516'));
            let data = s.get();
            log(data);
            let rep = new Response(data);
            log(rep.datas[0], rep.datas[0].idcard);
        });
    });

});