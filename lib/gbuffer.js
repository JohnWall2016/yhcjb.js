'use strict'

class GrowableBuffer {
    constructor(initalSize = 512) {
        this._size = initalSize;
        this._offset = 0;
        this._buffer = Buffer.alloc(initalSize);
    }

    /**
     * Append data to this buffer.
     * @param {string} data 
     */
    append(data) {
        let len = Buffer.byteLength(data);
        while (this._offset + len > this._size) {
            this._grow();
        }
        this._offset += this._buffer.write(data, this._offset);
    }

    _grow() {
        let newBuffer = Buffer.alloc(this._size * 2);
        this._buffer.copy(newBuffer, 0, 0, this._offset);
        this._buffer = newBuffer;
        this._size = newBuffer.length;
    }

    /**
     * Convert to a string.
     * @param {string} encoding default: 'utf8'
     * @returns {string}
     */
    toString(encoding = 'utf8') {
        return this._buffer.toString(encoding, 0, this._offset);
    }
}

module.exports = GrowableBuffer;