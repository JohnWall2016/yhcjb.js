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

module.exports = {
    appendToFileName
}