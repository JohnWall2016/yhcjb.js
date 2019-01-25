'use strict';

const dateFormat = require('dateformat');
const Xlsx = require('xlsx-populate');
const program = require('commander');
const util = require('../lib/util');
const Session = require('../lib/session');

const { 
    JfzzshInfoRequest, JfzzshInfoResponse,
    JfzzPerInfoRequest, JfzzPerInfoResponse,
    DyzzshInfoRequest, DyzzshInfoResponse,
    DyzzPerInfoRequest, DyzzPerInfoResponse,
    PaymentRequest, PaymentResponse,
    PaymentPeopleRequest, PaymentPeopleResponse,
} = require('../lib/service');

const paymentXlsx = `D:\\支付管理\\雨湖区居保个人账户返还表.xlsx`;

program
    .version('0.0.1')
    .description('财务支付单生成程序')
    .arguments('<发放年月> [业务状态]')
    .action((yearMonth, state) => {
        jbPayment(yearMonth, state);
    });

program.parse(process.argv);

async function jbPayment(yearMonth, state) {
    const workbook = await Xlsx.fromFileAsync(paymentXlsx);
    const sheet = workbook.sheet(0);

    const [year, month] = util.getYearMonth(yearMonth);
    const title = `${year}年${month}月个人账户返还表`;
    sheet.cell('A1').value(title);

    const date = dateFormat(new Date(), 'yyyymmdd');
    const dateChn = dateFormat(new Date(), 'yyyy年m月d日');
    const reportDate = `制表时间：${dateChn}`;
    sheet.cell('H2').value(reportDate);
    
    Session.use('002', session => {
        let [startRow, currentRow] = [5, 5];
        let sum = 0;

        session.send(new PaymentRequest(yearMonth, state));
        let response = new PaymentResponse(session.get());

        for (const data of response.datas) {
            if (data.objectType == '3') {
                session.send(new PaymentPeopleRequest({
                    paymentNO:   data.paymentNO,
                    yearMonth:   data.yearMonth,
                    state:       data.state,
                    paymentType: data.paymentType,
                }));
                response = new PaymentPeopleResponse(session.get());
                const payment = response.datas[0];

                let info, zzReason, bankName;
                session.send(new DyzzshInfoRequest(payment.idcard));
                response = new DyzzshInfoResponse(session.get());
                if (info = response.datas[0]) {
                    session.send(new DyzzPerInfoRequest(info));
                    response = new DyzzPerInfoResponse(session.get());
                    if (info = response.datas[0]) {
                        zzReason = info.zzReasonChn;
                        bankName = info.bankName;
                    }
                } else {
                    session.send(new JfzzshInfoRequest(payment.idcard));
                    response = new JfzzshInfoResponse(session.get());
                    if (info = response.datas[0]) {
                        session.send(new JfzzPerInfoRequest(info));
                        response = new JfzzPerInfoResponse(session.get());
                        if (info = response.datas[0]) {
                            zzReason = info.zzReasonChn;
                            bankName = info.bankName;
                        }
                    }
                }

                let row;
                if (currentRow > startRow)
                    row = sheet.insertAndCopyRow(currentRow, startRow, true);
                else
                    row = sheet.row(currentRow);

                row.cell('A').value(currentRow - startRow + 1);
                row.cell('B').value(payment.name);
                row.cell('C').value(payment.idcard);

                let zzType = payment.paymentTypeChn;
                if (zzReason) {
                    zzType = `${zzType}（${zzReason}）`;
                }
                row.cell('D').value(zzType);

                row.cell('E').value(payment.payList);

                const amount = payment.payAmount;
                row.cell('F').value(amount);
                row.cell('G').value(util.getMoneyChn(amount));

                row.cell('H').value(data.objectBankName);
                row.cell('I').value(data.objectBankAccount);
                row.cell('J').value(bankName);
                
                sum += amount;
                currentRow ++;
            }
        }
            
        let row = sheet.insertAndCopyRow(currentRow, startRow);
        row.cell('A').value('合计');
        row.cell('F').value(sum);

        workbook.toFileAsync(util.appendToFileName(paymentXlsx, `${date}`));
    });
}