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

module.exports.Database = Database;