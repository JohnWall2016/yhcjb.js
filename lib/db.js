'use strict';

const Sequelize = require('sequelize');
const tmp = require('tmp');
const fs = require('fs');
const Xlsx = require('xlsx-populate');

class Database extends Sequelize {
    // mappings = { 'A':'N', 'B':'S' }
    async loadXlsx({
        tableName, xlsx, startRow, endRow, mappings
    }) {
        async function createCvs() {
            const tmpFile = tmp.fileSync({
                keep: true
            });
            const workbook = await Xlsx.fromFileAsync(xlsx);
            const sheet = workbook.sheet(0);
            for (let row = startRow; row <= endRow; row++) {
                const values = [];
                for (const [k, v] of Object.entries(mappings)) {
                    const value = sheet.cell(`${k}${row}`).value();
                    switch (v) {
                        case 'N': // number
                            values.push(`${value}`);
                            break;
                        case 'S': // string
                            values.push(`'${value}'`);
                            break;
                        default:  // other
                            values.push(v);
                            break;
                    }
                }
                fs.writeSync(tmpFile.fd, values.join(',') + '\n');
            }
            fs.closeSync(tmpFile.fd);
            return tmpFile.name;
        }
        
        let fn = await createCvs();
        fn = fn.replace(/\\/g, '/');
        const loadSql = `load data infile '${ fn }' into table \`${ tableName }\` ` +
            `CHARACTER SET utf8 FIELDS TERMINATED BY ',' ` +
            `OPTIONALLY ENCLOSED BY '\\'' LINES TERMINATED BY '\\n'`;
        return this.query(loadSql);
    }
}


/**
 * 创建扶贫数据库
 * 
 * @returns { Database }
 */
function createFpDb() {
    return new Database({
        dialect:  'mysql',
        host:     'localhost',
        port:     3306,
        database: 'jzfp',
        username: 'root',
        password: 'root',
        define:   {
            charset: 'utf8'
        },
        logging: false,
        operatorsAliases: false
    });
}

/**
 * 定义扶贫数据台账
 * 
 * @param { Database } db 
 */
function defineFpTable(db) {
    return db.define('扶贫数据台账20190128', {
        no: {
            field: '序号',
            type:  Database.INTEGER,
            //primaryKey: true
        },
        district: {
            field: '区划',
            type:  Database.STRING
        },
        area: {
            field: '区域',
            type:  Database.STRING
        },
        address: {
            field: '地址',
            type:  Database.STRING
        },
        name: {
            field: '姓名',
            type:  Database.STRING
        },
        idcard: {
            field: '身份证号码',
            type:  Database.STRING,
            primaryKey: true
        },
        birthDay: {
            field: '出生日期',
            type:  Database.INTEGER,
        },
        type: {
            field: '人员类型',
            type:  Database.STRING
        }
    }, { 
        freezeTableName: true,
        createdAt: false,
        updatedAt: false
    });
}

/**
 * 定义扶贫数据底册
 * 
 * @param { Database } db 
 */
function defineFpBook(db) {
    return db.define('扶贫数据底册20190219', {
        no: {
            field: '序号',
            type:  Database.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        xzj: {
            field: '乡镇街',
            type:  Database.STRING
        },
        csq: {
            field: '村社区',
            type:  Database.STRING
        },
        address: {
            field: '地址',
            type:  Database.STRING
        },
        name: {
            field: '姓名',
            type:  Database.STRING
        },
        idcard: {
            field: '身份证号码',
            type:  Database.STRING,
            primaryKey: true
        },
        birthDay: {
            field: '出生日期',
            type:  Database.STRING,
        },
        pkrk: {
            field: '贫困人口',
            type:  Database.STRING
        },
        pkrk_date: { // 记录录入数据的月份 201902
            field: '贫困人口日期',
            type:  Database.STRING
        },
        tkry: {
            field: '特困人员',
            type:  Database.STRING
        },
        tkry_date: { // 记录录入数据的月份 201902
            field: '特困人员日期',
            type:  Database.STRING
        },
        qedb: {
            field: '全额低保人员',
            type:  Database.STRING
        },
        qedb_date: { // 记录录入数据的月份 201902
            field: '全额低保人员日期',
            type:  Database.STRING
        },
        cedb: {
            field: '差额低保人员',
            type:  Database.STRING
        },
        cedb_date: { // 记录录入数据的月份 201902
            field: '差额低保人员日期',
            type:  Database.STRING
        },
        yejc: {
            field: '一二级残疾人员',
            type:  Database.STRING
        },
        yejc_date: { // 记录录入数据的月份 201902
            field: '一二级残疾人员日期',
            type:  Database.STRING
        },
        ssjc: {
            field: '三四级残疾人员',
            type:  Database.STRING
        },
        ssjc_date: { // 记录录入数据的月份 201902
            field: '三四级残疾人员日期',
            type:  Database.STRING
        },
        jbrdsf: {
            field: '居保认定身份',
            type: Database.STRING
        },
        jbrdsf_first_date: {
            field: '居保认定身份最初日期',
            type: Database.STRING
        },
        jbrdsf_last_date: {
            field: '居保认定身份最后日期',
            type: Database.STRING
        },
        jbcbqk: {
            field: '居保参保情况',
            type: Database.STRING
        }
    }, { 
        freezeTableName: true,
        createdAt: false,
        updatedAt: false
    });
}

/**
 * 定义居保参保人员明细表
 * 
 * @param { Database } db 
 */
function defineJbTable(db) {
    return db.define('居保参保人员明细表20190221', {
        xzqh: {
            field: '行政区划',
            type:  Database.STRING
        },
        hjxz: {
            field: '户籍性质',
            type:  Database.STRING
        },
        name: {
            field: '姓名',
            type:  Database.STRING
        },
        idcard: {
            field: '身份证号码',
            type:  Database.STRING,
            primaryKey: true
        },
        sex: {
            field: '性别',
            type:  Database.STRING
        },
        birthDay: {
            field: '出生日期',
            type:  Database.INTEGER,
        },
        cbsf: {
            field: '参保身份',
            type:  Database.STRING
        },
        cbzt: {
            field: '参保状态',
            type:  Database.STRING
        },
        jfzt: {
            field: '缴费状态',
            type:  Database.STRING
        },
        cbsj: {
            field: '参保时间',
            type:  Database.STRING
        }
    }, { 
        freezeTableName: true,
        createdAt: false,
        updatedAt: false
    });
}

module.exports = {
    Database, createFpDb, defineFpTable, defineFpBook, defineJbTable
}