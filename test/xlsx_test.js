'use strict';

const { it } = require('./logtest');


describe('xlsx test', function() {
    it.only('single-quoted string', async function() {
        const Xlsx = require('xlsx-populate');
        const workbook = await Xlsx.fromFileAsync('D:\\精准扶贫\\201902\\2019年2月雨湖区农村低保名册.xlsx');
        const sheet = workbook.sheet(0);

        let cell = sheet.row(1468).cell('I');
        it.log(cell);
        let value = cell.value();
        it.log(value);
        it.log(value[0].children);
        it.log(value[1].children);

        /*
        cell = sheet.row(1469).cell('I');
        it.log(cell);
        value = cell.value();
        it.log(value);
        */
    });
});