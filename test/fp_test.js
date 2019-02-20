'use strict';

const { it } = require('./logtest');
const { fetchCsdbData } = require('../bin/fp_data');

describe('fpdata test', function() {
    it.only('fetchCsdbData', async function() {
        for await (const {index, idcard, name, detail, complain} of fetchCsdbData({
            date: '201902',
            xlsx: 'D:\\精准扶贫\\201902\\2019年2月城市名册.xlsx',
            beginRow: 2,
            endRow: 100,
            complain: true
        })) {
            it.log(detail);
        }
    });
});