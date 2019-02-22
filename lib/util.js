'use strict';

function appendToFileName(fileName, appendStr) {
    const index = fileName.lastIndexOf('.');
    if (index >= 0) {
        return fileName.substring(0, index) + 
            appendStr + fileName.substring(index);
    } else {
        return fileName + appendStr;
    }
}

function stop(msg, code = -1) {
    console.error(msg);
    process.exit(code);
}

function getYearMonth(yearMonth) {
    let m
    if (m = yearMonth.match(/^(\d\d\d\d)(\d\d)$/)) {
        return [m[1], `${m[2][0]=='0'?m[2].substr(1):m[2]}`];
    } else {
        stop('年月格式有误');
    }
}

function getMoneyChn(num) {
    const mf = Math.floor;

    const bign = [
        '零', '壹', '贰', '叁', '肆', 
        '伍', '陆', '柒', '捌', '玖', 
    ];
    const place = [
        '', '拾', '佰', '仟', '万',
    ];
    const unit = [
        '元', '角', '分',
    ];
    const whole = '整';

    const snum = Number(num).toFixed(2);

    if (num > Math.pow(10, 8)) return snum;

    let [zw, fw] = snum.split('.');

    let ret = '';

    let zerop = false; // 上一位是否为零

    for (let i = 7; i >= 0; i--) {
        const ws = Math.pow(10, i);
        if (mf(zw/ws) > 0) {
            if (zerop) ret += bign[0];
            ret += bign[mf(zw/ws)] + place[i%4];
            zerop = false;
        } else if (mf(zw/ws) === 0 && ret) {
            zerop = true;
        }
        if (i === 4 && ret) ret += place[4];
        zw = zw % ws;
        if (zw === 0 && i != 0) {
            zerop = true;
            break;
        }
    }
    ret += unit[0];

    if (fw == 0) {
        ret += whole;
    } else if (fw%10 === 0) {
        if (zerop) ret += bign[0];
        ret += bign[mf(fw/10)] + unit[1] + whole;
    } else {
        if (zerop || mf(fw/10) === 0) ret += bign[0];
        if (mf(fw/10) !== 0) ret += bign[mf(fw/10)];
        if (mf(fw/10) > 0) ret += unit[1];
        ret += bign[fw%10] + unit[2];
    }

    return ret;
}

function getFormattedMonth() {
    var temp = new Date();
    return padZeroStr(temp.getFullYear()) +
        padZeroStr(1 + temp.getMonth());
}

function getFormattedDate() {
    var temp = new Date();
    return padZeroStr(temp.getFullYear()) +
        padZeroStr(1 + temp.getMonth()) +
        padZeroStr(temp.getDate());
}

function padZeroStr(num, digit = 2) {
    let pad = '';
    while (--digit > 0) {
        let limit = Math.pow(10, digit);
        if (num >= limit) {
            return `${pad}${num}`;
        } else {
            pad += '0';
        }
    }
    return `${pad}${num}`;
}

const createLogger = (name) => {
    const winston = require('winston');
    const { logDir } = require('../lib/_config.js');

    function fileName(name, type) {
        if (name) {
            return `${name}(${type})-${getFormattedDate()}.log`;
        } else {
            return `${type}-${getFormattedDate()}.log`;
        }
    }

    return winston.createLogger({
        level: 'info',
        format: winston.format.simple(),
        
        transports: [
            new winston.transports.Console({
                colorize: true
            }),
            new winston.transports.File({
                dirname:  logDir,
                filename: fileName(name, '异常日志'),
                level:    'error'
            }),
            new winston.transports.File({
                dirname:  logDir,
                filename: fileName(name, '全部日志')
            }),
        ]
    });
};

/**
 * Get the previous month
 * @param { string } yearMonth 'yyyymm'
 * @return { string } 'yyyymm'
 */
function previousMonth(yearMonth) {
    let ym = Number(yearMonth);
    let y = (ym / 100).toFixed();
    let m = ym % 100;
    m -= 1;
    if (m === 0) {
        m = 12, y -= 1;
    }
    return `${padZeroStr(y, 4)}${padZeroStr(m, 2)}`;
}

/**
 * Substract months
 * @param { string } firstYearMonth 'yyyymm'
 * @param { string } secondYearMonth 'yyyymm'
 * @returns { number }
 */
function substractMonth(firstYearMonth, secondYearMonth) {
    let first = Number(firstYearMonth),
        second = Number(secondYearMonth);
    let firstMonths = (first / 100).toFixed() * 12 + first % 100,
        secondMonths = (second / 100).toFixed() * 12 + second % 100;
    return firstMonths - secondMonths;
}

module.exports = {
    appendToFileName, 
    getYearMonth, 
    getFormattedMonth, getFormattedDate,
    previousMonth, substractMonth,
    padZeroStr,
    getMoneyChn, 
    createLogger
}