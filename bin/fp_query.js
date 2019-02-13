'use strict';

const program = require('commander');
const { createFpDb, defineFpTable } = require('../lib/db');

program
    .version('0.0.1')
    .description('扶贫底册数据查询程序');

program
    .command('knqt')
    .arguments('<身份证号码>')
    .description(
        '建档立卡贫困人员、低保对象、特困人员查询'
    )
    .action(async idcard => {
        const db = createFpDb();
        const fpTable = defineFpTable(db);
        await fpTable.sync();
        const p = await fpTable.findOne({ where: { idcard } });
        console.log(p.dataValues);
        await db.close();
    });

program.parse(process.argv);