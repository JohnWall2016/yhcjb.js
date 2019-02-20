const { createLogger } = require('../lib/util');

let log = createLogger();
log.info('日志记录');
log.error('错误日志记录');
log.info('日志记录1');
log.error('错误日志记录2');

log = createLogger('导库操作');
log.info('日志记录');
log.error('错误日志记录');
log.info('日志记录1');
log.error('错误日志记录2');
