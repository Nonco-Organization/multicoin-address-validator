(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.WAValidator = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'
// base-x encoding / decoding
// Copyright (c) 2018 base-x contributors
// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
// @ts-ignore
var _Buffer = require('safe-buffer').Buffer
function base (ALPHABET) {
  if (ALPHABET.length >= 255) { throw new TypeError('Alphabet too long') }
  var BASE_MAP = new Uint8Array(256)
  for (var j = 0; j < BASE_MAP.length; j++) {
    BASE_MAP[j] = 255
  }
  for (var i = 0; i < ALPHABET.length; i++) {
    var x = ALPHABET.charAt(i)
    var xc = x.charCodeAt(0)
    if (BASE_MAP[xc] !== 255) { throw new TypeError(x + ' is ambiguous') }
    BASE_MAP[xc] = i
  }
  var BASE = ALPHABET.length
  var LEADER = ALPHABET.charAt(0)
  var FACTOR = Math.log(BASE) / Math.log(256) // log(BASE) / log(256), rounded up
  var iFACTOR = Math.log(256) / Math.log(BASE) // log(256) / log(BASE), rounded up
  function encode (source) {
    if (Array.isArray(source) || source instanceof Uint8Array) { source = _Buffer.from(source) }
    if (!_Buffer.isBuffer(source)) { throw new TypeError('Expected Buffer') }
    if (source.length === 0) { return '' }
        // Skip & count leading zeroes.
    var zeroes = 0
    var length = 0
    var pbegin = 0
    var pend = source.length
    while (pbegin !== pend && source[pbegin] === 0) {
      pbegin++
      zeroes++
    }
        // Allocate enough space in big-endian base58 representation.
    var size = ((pend - pbegin) * iFACTOR + 1) >>> 0
    var b58 = new Uint8Array(size)
        // Process the bytes.
    while (pbegin !== pend) {
      var carry = source[pbegin]
            // Apply "b58 = b58 * 256 + ch".
      var i = 0
      for (var it1 = size - 1; (carry !== 0 || i < length) && (it1 !== -1); it1--, i++) {
        carry += (256 * b58[it1]) >>> 0
        b58[it1] = (carry % BASE) >>> 0
        carry = (carry / BASE) >>> 0
      }
      if (carry !== 0) { throw new Error('Non-zero carry') }
      length = i
      pbegin++
    }
        // Skip leading zeroes in base58 result.
    var it2 = size - length
    while (it2 !== size && b58[it2] === 0) {
      it2++
    }
        // Translate the result into a string.
    var str = LEADER.repeat(zeroes)
    for (; it2 < size; ++it2) { str += ALPHABET.charAt(b58[it2]) }
    return str
  }
  function decodeUnsafe (source) {
    if (typeof source !== 'string') { throw new TypeError('Expected String') }
    if (source.length === 0) { return _Buffer.alloc(0) }
    var psz = 0
        // Skip and count leading '1's.
    var zeroes = 0
    var length = 0
    while (source[psz] === LEADER) {
      zeroes++
      psz++
    }
        // Allocate enough space in big-endian base256 representation.
    var size = (((source.length - psz) * FACTOR) + 1) >>> 0 // log(58) / log(256), rounded up.
    var b256 = new Uint8Array(size)
        // Process the characters.
    while (source[psz]) {
            // Decode character
      var carry = BASE_MAP[source.charCodeAt(psz)]
            // Invalid character
      if (carry === 255) { return }
      var i = 0
      for (var it3 = size - 1; (carry !== 0 || i < length) && (it3 !== -1); it3--, i++) {
        carry += (BASE * b256[it3]) >>> 0
        b256[it3] = (carry % 256) >>> 0
        carry = (carry / 256) >>> 0
      }
      if (carry !== 0) { throw new Error('Non-zero carry') }
      length = i
      psz++
    }
        // Skip leading zeroes in b256.
    var it4 = size - length
    while (it4 !== size && b256[it4] === 0) {
      it4++
    }
    var vch = _Buffer.allocUnsafe(zeroes + (size - it4))
    vch.fill(0x00, 0, zeroes)
    var j = zeroes
    while (it4 !== size) {
      vch[j++] = b256[it4++]
    }
    return vch
  }
  function decode (string) {
    var buffer = decodeUnsafe(string)
    if (buffer) { return buffer }
    throw new Error('Non-base' + BASE + ' character')
  }
  return {
    encode: encode,
    decodeUnsafe: decodeUnsafe,
    decode: decode
  }
}
module.exports = base

},{"safe-buffer":36}],2:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  for (var i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/* bignumber.js v1.3.0 https://github.com/MikeMcl/bignumber.js/LICENCE */

/*jslint bitwise: true, eqeq: true, plusplus: true, sub: true, white: true, maxerr: 500 */
/*global module */

/*
  bignumber.js v1.3.0
  A JavaScript library for arbitrary-precision arithmetic.
  https://github.com/MikeMcl/bignumber.js
  Copyright (c) 2012 Michael Mclaughlin <M8ch88l@gmail.com>
  MIT Expat Licence
*/

/*********************************** DEFAULTS ************************************/

/*
 * The default values below must be integers within the stated ranges (inclusive).
 * Most of these values can be changed during run-time using BigNumber.config().
 */

/*
 * The limit on the value of DECIMAL_PLACES, TO_EXP_NEG, TO_EXP_POS, MIN_EXP,
 * MAX_EXP, and the argument to toFixed, toPrecision and toExponential, beyond
 * which an exception is thrown (if ERRORS is true).
 */
var MAX = 1E9,                                   // 0 to 1e+9

    // Limit of magnitude of exponent argument to toPower.
    MAX_POWER = 1E6,                             // 1 to 1e+6

    // The maximum number of decimal places for operations involving division.
    DECIMAL_PLACES = 20,                         // 0 to MAX

    /*
     * The rounding mode used when rounding to the above decimal places, and when
     * using toFixed, toPrecision and toExponential, and round (default value).
     * UP         0 Away from zero.
     * DOWN       1 Towards zero.
     * CEIL       2 Towards +Infinity.
     * FLOOR      3 Towards -Infinity.
     * HALF_UP    4 Towards nearest neighbour. If equidistant, up.
     * HALF_DOWN  5 Towards nearest neighbour. If equidistant, down.
     * HALF_EVEN  6 Towards nearest neighbour. If equidistant, towards even neighbour.
     * HALF_CEIL  7 Towards nearest neighbour. If equidistant, towards +Infinity.
     * HALF_FLOOR 8 Towards nearest neighbour. If equidistant, towards -Infinity.
     */
    ROUNDING_MODE = 4,                           // 0 to 8

    // EXPONENTIAL_AT : [TO_EXP_NEG , TO_EXP_POS]

    // The exponent value at and beneath which toString returns exponential notation.
    // Number type: -7
    TO_EXP_NEG = -7,                             // 0 to -MAX

    // The exponent value at and above which toString returns exponential notation.
    // Number type: 21
    TO_EXP_POS = 21,                             // 0 to MAX

    // RANGE : [MIN_EXP, MAX_EXP]

    // The minimum exponent value, beneath which underflow to zero occurs.
    // Number type: -324  (5e-324)
    MIN_EXP = -MAX,                              // -1 to -MAX

    // The maximum exponent value, above which overflow to Infinity occurs.
    // Number type:  308  (1.7976931348623157e+308)
    MAX_EXP = MAX,                               // 1 to MAX

    // Whether BigNumber Errors are ever thrown.
    // CHANGE parseInt to parseFloat if changing ERRORS to false.
    ERRORS = true,                               // true or false
    parse = parseInt,                            // parseInt or parseFloat

/***********************************************************************************/

    P = BigNumber.prototype,
    DIGITS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_',
    outOfRange,
    id = 0,
    isValid = /^-?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i,
    trim = String.prototype.trim || function () {return this.replace(/^\s+|\s+$/g, '')},
    ONE = BigNumber(1);


// CONSTRUCTOR


/*
 * The exported function.
 * Create and return a new instance of a BigNumber object.
 *
 * n {number|string|BigNumber} A numeric value.
 * [b] {number} The base of n. Integer, 2 to 64 inclusive.
 */
function BigNumber( n, b ) {
    var e, i, isNum, digits, valid, orig,
        x = this;

    // Enable constructor usage without new.
    if ( !(x instanceof BigNumber) ) {
        return new BigNumber( n, b )
    }

    // Duplicate.
    if ( n instanceof BigNumber ) {
        id = 0;

        // e is undefined.
        if ( b !== e ) {
            n += ''
        } else {
            x['s'] = n['s'];
            x['e'] = n['e'];
            x['c'] = ( n = n['c'] ) ? n.slice() : n;
            return;
        }
    }

    // If number, check if minus zero.
    if ( typeof n != 'string' ) {
        n = ( isNum = typeof n == 'number' ||
            Object.prototype.toString.call(n) == '[object Number]' ) &&
                n === 0 && 1 / n < 0 ? '-0' : n + '';
    }

    orig = n;

    if ( b === e && isValid.test(n) ) {

        // Determine sign.
        x['s'] = n.charAt(0) == '-' ? ( n = n.slice(1), -1 ) : 1;

    // Either n is not a valid BigNumber or a base has been specified.
    } else {

        // Enable exponential notation to be used with base 10 argument.
        // Ensure return value is rounded to DECIMAL_PLACES as with other bases.
        if ( b == 10 ) {

            return setMode( n, DECIMAL_PLACES, ROUNDING_MODE );
        }

        n = trim.call(n).replace( /^\+(?!-)/, '' );

        x['s'] = n.charAt(0) == '-' ? ( n = n.replace( /^-(?!-)/, '' ), -1 ) : 1;

        if ( b != null ) {

            if ( ( b == (b | 0) || !ERRORS ) &&
              !( outOfRange = !( b >= 2 && b < 65 ) ) ) {

                digits = '[' + DIGITS.slice( 0, b = b | 0 ) + ']+';

                // Before non-decimal number validity test and base conversion
                // remove the `.` from e.g. '1.', and replace e.g. '.1' with '0.1'.
                n = n.replace( /\.$/, '' ).replace( /^\./, '0.' );

                // Any number in exponential form will fail due to the e+/-.
                if ( valid = new RegExp(
                  '^' + digits + '(?:\\.' + digits + ')?$', b < 37 ? 'i' : '' ).test(n) ) {

                    if ( isNum ) {

                        if ( n.replace( /^0\.0*|\./, '' ).length > 15 ) {

                            // 'new BigNumber() number type has more than 15 significant digits: {n}'
                            ifExceptionsThrow( orig, 0 );
                        }

                        // Prevent later check for length on converted number.
                        isNum = !isNum;
                    }
                    n = convert( n, 10, b, x['s'] );

                } else if ( n != 'Infinity' && n != 'NaN' ) {

                    // 'new BigNumber() not a base {b} number: {n}'
                    ifExceptionsThrow( orig, 1, b );
                    n = 'NaN';
                }
            } else {

                // 'new BigNumber() base not an integer: {b}'
                // 'new BigNumber() base out of range: {b}'
                ifExceptionsThrow( b, 2 );

                // Ignore base.
                valid = isValid.test(n);
            }
        } else {
            valid = isValid.test(n);
        }

        if ( !valid ) {

            // Infinity/NaN
            x['c'] = x['e'] = null;

            // NaN
            if ( n != 'Infinity' ) {

                // No exception on NaN.
                if ( n != 'NaN' ) {

                    // 'new BigNumber() not a number: {n}'
                    ifExceptionsThrow( orig, 3 );
                }
                x['s'] = null;
            }
            id = 0;

            return;
        }
    }

    // Decimal point?
    if ( ( e = n.indexOf('.') ) > -1 ) {
        n = n.replace( '.', '' );
    }

    // Exponential form?
    if ( ( i = n.search( /e/i ) ) > 0 ) {

        // Determine exponent.
        if ( e < 0 ) {
            e = i;
        }
        e += +n.slice( i + 1 );
        n = n.substring( 0, i );

    } else if ( e < 0 ) {

        // Integer.
        e = n.length;
    }

    // Determine leading zeros.
    for ( i = 0; n.charAt(i) == '0'; i++ ) {
    }

    b = n.length;

    // Disallow numbers with over 15 significant digits if number type.
    if ( isNum && b > 15 && n.slice(i).length > 15 ) {

        // 'new BigNumber() number type has more than 15 significant digits: {n}'
        ifExceptionsThrow( orig, 0 );
    }
    id = 0;

    // Overflow?
    if ( ( e -= i + 1 ) > MAX_EXP ) {

        // Infinity.
        x['c'] = x['e'] = null;

    // Zero or underflow?
    } else if ( i == b || e < MIN_EXP ) {

        // Zero.
        x['c'] = [ x['e'] = 0 ];
    } else {

        // Determine trailing zeros.
        for ( ; n.charAt(--b) == '0'; ) {
        }

        x['e'] = e;
        x['c'] = [];

        // Convert string to array of digits (without leading and trailing zeros).
        for ( e = 0; i <= b; x['c'][e++] = +n.charAt(i++) ) {
        }
    }
}


// CONSTRUCTOR PROPERTIES/METHODS


BigNumber['ROUND_UP'] = 0;
BigNumber['ROUND_DOWN'] = 1;
BigNumber['ROUND_CEIL'] = 2;
BigNumber['ROUND_FLOOR'] = 3;
BigNumber['ROUND_HALF_UP'] = 4;
BigNumber['ROUND_HALF_DOWN'] = 5;
BigNumber['ROUND_HALF_EVEN'] = 6;
BigNumber['ROUND_HALF_CEIL'] = 7;
BigNumber['ROUND_HALF_FLOOR'] = 8;

/*
 * Create an instance from a Buffer
 */
BigNumber['fromBuffer'] = function (buf, opts) {

    if (!opts) opts = {};

    var endian = { 1 : 'big', '-1' : 'little' }[opts.endian]
        || opts.endian || 'big'
    ;

    var size = opts.size === 'auto' ? Math.ceil(buf.length) : (opts.size || 1);

    if (buf.length % size !== 0) {
        throw new RangeError('Buffer length (' + buf.length + ')'
            + ' must be a multiple of size (' + size + ')'
        );
    }

    var hex = [];
    for (var i = 0; i < buf.length; i += size) {
        var chunk = [];
        for (var j = 0; j < size; j++) {
            chunk.push(buf[
                i + (endian === 'big' ? j : (size - j - 1))
            ]);
        }

        hex.push(chunk
            .map(function (c) {
                return (c < 16 ? '0' : '') + c.toString(16);
            })
            .join('')
        );
    }

    return BigNumber(hex.join(''), 16);

};

/*
 * Configure infrequently-changing library-wide settings.
 *
 * Accept an object or an argument list, with one or many of the following
 * properties or parameters respectively:
 * [ DECIMAL_PLACES [, ROUNDING_MODE [, EXPONENTIAL_AT [, RANGE [, ERRORS ]]]]]
 *
 * E.g.
 * BigNumber.config(20, 4) is equivalent to
 * BigNumber.config({ DECIMAL_PLACES : 20, ROUNDING_MODE : 4 })
 * Ignore properties/parameters set to null or undefined.
 *
 * Return an object with the properties current values.
 */
BigNumber['config'] = function () {
    var v, p,
        i = 0,
        r = {},
        a = arguments,
        o = a[0],
        c = 'config',
        inRange = function ( n, lo, hi ) {
          return !( ( outOfRange = n < lo || n > hi ) ||
            parse(n) != n && n !== 0 );
        },
        has = o && typeof o == 'object'
          ? function () {if ( o.hasOwnProperty(p) ) return ( v = o[p] ) != null}
          : function () {if ( a.length > i ) return ( v = a[i++] ) != null};

    // [DECIMAL_PLACES] {number} Integer, 0 to MAX inclusive.
    if ( has( p = 'DECIMAL_PLACES' ) ) {

        if ( inRange( v, 0, MAX ) ) {
            DECIMAL_PLACES = v | 0;
        } else {

            // 'config() DECIMAL_PLACES not an integer: {v}'
            // 'config() DECIMAL_PLACES out of range: {v}'
            ifExceptionsThrow( v, p, c );
        }
    }
    r[p] = DECIMAL_PLACES;

    // [ROUNDING_MODE] {number} Integer, 0 to 8 inclusive.
    if ( has( p = 'ROUNDING_MODE' ) ) {

        if ( inRange( v, 0, 8 ) ) {
            ROUNDING_MODE = v | 0;
        } else {

            // 'config() ROUNDING_MODE not an integer: {v}'
            // 'config() ROUNDING_MODE out of range: {v}'
            ifExceptionsThrow( v, p, c );
        }
    }
    r[p] = ROUNDING_MODE;

    /*
     * [EXPONENTIAL_AT] {number|number[]} Integer, -MAX to MAX inclusive or
     * [ integer -MAX to 0 inclusive, 0 to MAX inclusive ].
     */
    if ( has( p = 'EXPONENTIAL_AT' ) ) {

        if ( inRange( v, -MAX, MAX ) ) {
            TO_EXP_NEG = -( TO_EXP_POS = ~~( v < 0 ? -v : +v ) );
        } else if ( !outOfRange && v && inRange( v[0], -MAX, 0 ) &&
          inRange( v[1], 0, MAX ) ) {
            TO_EXP_NEG = ~~v[0];
            TO_EXP_POS = ~~v[1];
        } else {

            // 'config() EXPONENTIAL_AT not an integer or not [integer, integer]: {v}'
            // 'config() EXPONENTIAL_AT out of range or not [negative, positive: {v}'
            ifExceptionsThrow( v, p, c, 1 );
        }
    }
    r[p] = [ TO_EXP_NEG, TO_EXP_POS ];

    /*
     * [RANGE][ {number|number[]} Non-zero integer, -MAX to MAX inclusive or
     * [ integer -MAX to -1 inclusive, integer 1 to MAX inclusive ].
     */
    if ( has( p = 'RANGE' ) ) {

        if ( inRange( v, -MAX, MAX ) && ~~v ) {
            MIN_EXP = -( MAX_EXP = ~~( v < 0 ? -v : +v ) );
        } else if ( !outOfRange && v && inRange( v[0], -MAX, -1 ) &&
          inRange( v[1], 1, MAX ) ) {
            MIN_EXP = ~~v[0], MAX_EXP = ~~v[1];
        } else {

            // 'config() RANGE not a non-zero integer or not [integer, integer]: {v}'
            // 'config() RANGE out of range or not [negative, positive: {v}'
            ifExceptionsThrow( v, p, c, 1, 1 );
        }
    }
    r[p] = [ MIN_EXP, MAX_EXP ];

    // [ERRORS] {boolean|number} true, false, 1 or 0.
    if ( has( p = 'ERRORS' ) ) {

        if ( v === !!v || v === 1 || v === 0 ) {
            parse = ( outOfRange = id = 0, ERRORS = !!v )
              ? parseInt
              : parseFloat;
        } else {

            // 'config() ERRORS not a boolean or binary digit: {v}'
            ifExceptionsThrow( v, p, c, 0, 0, 1 );
        }
    }
    r[p] = ERRORS;

    return r;
};


// PRIVATE FUNCTIONS


// Assemble error messages. Throw BigNumber Errors.
function ifExceptionsThrow( arg, i, j, isArray, isRange, isErrors) {

    if ( ERRORS ) {
        var error,
            method = ['new BigNumber', 'cmp', 'div', 'eq', 'gt', 'gte', 'lt',
                 'lte', 'minus', 'mod', 'plus', 'times', 'toFr'
                ][ id ? id < 0 ? -id : id : 1 / id < 0 ? 1 : 0 ] + '()',
            message = outOfRange ? ' out of range' : ' not a' +
              ( isRange ? ' non-zero' : 'n' ) + ' integer';

        message = ( [
            method + ' number type has more than 15 significant digits',
            method + ' not a base ' + j + ' number',
            method + ' base' + message,
            method + ' not a number' ][i] ||
              j + '() ' + i + ( isErrors
                ? ' not a boolean or binary digit'
                : message + ( isArray
                  ? ' or not [' + ( outOfRange
                    ? ' negative, positive'
                    : ' integer, integer' ) + ' ]'
                  : '' ) ) ) + ': ' + arg;

        outOfRange = id = 0;
        error = new Error(message);
        error['name'] = 'BigNumber Error';

        throw error;
    }
}


/*
 * Convert a numeric string of baseIn to a numeric string of baseOut.
 */
function convert( nStr, baseOut, baseIn, sign ) {
    var e, dvs, dvd, nArr, fracArr, fracBN;

    // Convert string of base bIn to an array of numbers of baseOut.
    // Eg. strToArr('255', 10) where baseOut is 16, returns [15, 15].
    // Eg. strToArr('ff', 16)  where baseOut is 10, returns [2, 5, 5].
    function strToArr( str, bIn ) {
        var j,
            i = 0,
            strL = str.length,
            arrL,
            arr = [0];

        for ( bIn = bIn || baseIn; i < strL; i++ ) {

            for ( arrL = arr.length, j = 0; j < arrL; arr[j] *= bIn, j++ ) {
            }

            for ( arr[0] += DIGITS.indexOf( str.charAt(i) ), j = 0;
                  j < arr.length;
                  j++ ) {

                if ( arr[j] > baseOut - 1 ) {

                    if ( arr[j + 1] == null ) {
                        arr[j + 1] = 0;
                    }
                    arr[j + 1] += arr[j] / baseOut ^ 0;
                    arr[j] %= baseOut;
                }
            }
        }

        return arr.reverse();
    }

    // Convert array to string.
    // E.g. arrToStr( [9, 10, 11] ) becomes '9ab' (in bases above 11).
    function arrToStr( arr ) {
        var i = 0,
            arrL = arr.length,
            str = '';

        for ( ; i < arrL; str += DIGITS.charAt( arr[i++] ) ) {
        }

        return str;
    }

    if ( baseIn < 37 ) {
        nStr = nStr.toLowerCase();
    }

    /*
     * If non-integer convert integer part and fraction part separately.
     * Convert the fraction part as if it is an integer than use division to
     * reduce it down again to a value less than one.
     */
    if ( ( e = nStr.indexOf( '.' ) ) > -1 ) {

        /*
         * Calculate the power to which to raise the base to get the number
         * to divide the fraction part by after it has been converted as an
         * integer to the required base.
         */
        e = nStr.length - e - 1;

        // Use toFixed to avoid possible exponential notation.
        dvs = strToArr( new BigNumber(baseIn)['pow'](e)['toF'](), 10 );

        nArr = nStr.split('.');

        // Convert the base of the fraction part (as integer).
        dvd = strToArr( nArr[1] );

        // Convert the base of the integer part.
        nArr = strToArr( nArr[0] );

        // Result will be a BigNumber with a value less than 1.
        fracBN = divide( dvd, dvs, dvd.length - dvs.length, sign, baseOut,
          // Is least significant digit of integer part an odd number?
          nArr[nArr.length - 1] & 1 );

        fracArr = fracBN['c'];

        // e can be <= 0  ( if e == 0, fracArr is [0] or [1] ).
        if ( e = fracBN['e'] ) {

            // Append zeros according to the exponent of the result.
            for ( ; ++e; fracArr.unshift(0) ) {
            }

            // Append the fraction part to the converted integer part.
            nStr = arrToStr(nArr) + '.' + arrToStr(fracArr);

        // fracArr is [1].
        // Fraction digits rounded up, so increment last digit of integer part.
        } else if ( fracArr[0] ) {

            if ( nArr[ e = nArr.length - 1 ] < baseOut - 1 ) {
                ++nArr[e];
                nStr = arrToStr(nArr);
            } else {
                nStr = new BigNumber( arrToStr(nArr),
                  baseOut )['plus'](ONE)['toS'](baseOut);
            }

        // fracArr is [0]. No fraction digits.
        } else {
            nStr = arrToStr(nArr);
        }
    } else {

        // Simple integer. Convert base.
        nStr = arrToStr( strToArr(nStr) );
    }

    return nStr;
}


// Perform division in the specified base. Called by div and convert.
function divide( dvd, dvs, exp, s, base, isOdd ) {
    var dvsL, dvsT, next, cmp, remI,
        dvsZ = dvs.slice(),
        dvdI = dvsL = dvs.length,
        dvdL = dvd.length,
        rem = dvd.slice( 0, dvsL ),
        remL = rem.length,
        quo = new BigNumber(ONE),
        qc = quo['c'] = [],
        qi = 0,
        dig = DECIMAL_PLACES + ( quo['e'] = exp ) + 1;

    quo['s'] = s;
    s = dig < 0 ? 0 : dig;

    // Add zeros to make remainder as long as divisor.
    for ( ; remL++ < dvsL; rem.push(0) ) {
    }

    // Create version of divisor with leading zero.
    dvsZ.unshift(0);

    do {

        // 'next' is how many times the divisor goes into the current remainder.
        for ( next = 0; next < base; next++ ) {

            // Compare divisor and remainder.
            if ( dvsL != ( remL = rem.length ) ) {
                cmp = dvsL > remL ? 1 : -1;
            } else {
                for ( remI = -1, cmp = 0; ++remI < dvsL; ) {

                    if ( dvs[remI] != rem[remI] ) {
                        cmp = dvs[remI] > rem[remI] ? 1 : -1;
                        break;
                    }
                }
            }

            // Subtract divisor from remainder (if divisor < remainder).
            if ( cmp < 0 ) {

                // Remainder cannot be more than one digit longer than divisor.
                // Equalise lengths using divisor with extra leading zero?
                for ( dvsT = remL == dvsL ? dvs : dvsZ; remL; ) {

                    if ( rem[--remL] < dvsT[remL] ) {

                        for ( remI = remL;
                          remI && !rem[--remI];
                            rem[remI] = base - 1 ) {
                        }
                        --rem[remI];
                        rem[remL] += base;
                    }
                    rem[remL] -= dvsT[remL];
                }
                for ( ; !rem[0]; rem.shift() ) {
                }
            } else {
                break;
            }
        }

        // Add the 'next' digit to the result array.
        qc[qi++] = cmp ? next : ++next;

        // Update the remainder.
        rem[0] && cmp
          ? ( rem[remL] = dvd[dvdI] || 0 )
          : ( rem = [ dvd[dvdI] ] );

    } while ( ( dvdI++ < dvdL || rem[0] != null ) && s-- );

    // Leading zero? Do not remove if result is simply zero (qi == 1).
    if ( !qc[0] && qi != 1 ) {

        // There can't be more than one zero.
        --quo['e'];
        qc.shift();
    }

    // Round?
    if ( qi > dig ) {
        rnd( quo, DECIMAL_PLACES, base, isOdd, rem[0] != null );
    }

    // Overflow?
    if ( quo['e'] > MAX_EXP ) {

        // Infinity.
        quo['c'] = quo['e'] = null;

    // Underflow?
    } else if ( quo['e'] < MIN_EXP ) {

        // Zero.
        quo['c'] = [quo['e'] = 0];
    }

    return quo;
}


/*
 * Return a string representing the value of BigNumber n in normal or
 * exponential notation rounded to the specified decimal places or
 * significant digits.
 * Called by toString, toExponential (exp 1), toFixed, and toPrecision (exp 2).
 * d is the index (with the value in normal notation) of the digit that may be
 * rounded up.
 */
function format( n, d, exp ) {

    // Initially, i is the number of decimal places required.
    var i = d - (n = new BigNumber(n))['e'],
        c = n['c'];

    // +-Infinity or NaN?
    if ( !c ) {
        return n['toS']();
    }

    // Round?
    if ( c.length > ++d ) {
        rnd( n, i, 10 );
    }

    // Recalculate d if toFixed as n['e'] may have changed if value rounded up.
    i = c[0] == 0 ? i + 1 : exp ? d : n['e'] + i + 1;

    // Append zeros?
    for ( ; c.length < i; c.push(0) ) {
    }
    i = n['e'];

    /*
     * toPrecision returns exponential notation if the number of significant
     * digits specified is less than the number of digits necessary to
     * represent the integer part of the value in normal notation.
     */
    return exp == 1 || exp == 2 && ( --d < i || i <= TO_EXP_NEG )

      // Exponential notation.
      ? ( n['s'] < 0 && c[0] ? '-' : '' ) + ( c.length > 1
        ? ( c.splice( 1, 0, '.' ), c.join('') )
        : c[0] ) + ( i < 0 ? 'e' : 'e+' ) + i

      // Normal notation.
      : n['toS']();
}


// Round if necessary.
// Called by divide, format, setMode and sqrt.
function rnd( x, dp, base, isOdd, r ) {
    var xc = x['c'],
        isNeg = x['s'] < 0,
        half = base / 2,
        i = x['e'] + dp + 1,

        // 'next' is the digit after the digit that may be rounded up.
        next = xc[i],

        /*
         * 'more' is whether there are digits after 'next'.
         * E.g.
         * 0.005 (e = -3) to be rounded to 0 decimal places (dp = 0) gives i = -2
         * The 'next' digit is zero, and there ARE 'more' digits after it.
         * 0.5 (e = -1) dp = 0 gives i = 0
         * The 'next' digit is 5 and there are no 'more' digits after it.
         */
        more = r || i < 0 || xc[i + 1] != null;

    r = ROUNDING_MODE < 4
      ? ( next != null || more ) &&
        ( ROUNDING_MODE == 0 ||
           ROUNDING_MODE == 2 && !isNeg ||
             ROUNDING_MODE == 3 && isNeg )
      : next > half || next == half &&
        ( ROUNDING_MODE == 4 || more ||

          /*
           * isOdd is used in base conversion and refers to the least significant
           * digit of the integer part of the value to be converted. The fraction
           * part is rounded by this method separately from the integer part.
           */
          ROUNDING_MODE == 6 && ( xc[i - 1] & 1 || !dp && isOdd ) ||
            ROUNDING_MODE == 7 && !isNeg ||
              ROUNDING_MODE == 8 && isNeg );

    if ( i < 1 || !xc[0] ) {
        xc.length = 0;
        xc.push(0);

        if ( r ) {

            // 1, 0.1, 0.01, 0.001, 0.0001 etc.
            xc[0] = 1;
            x['e'] = -dp;
        } else {

            // Zero.
            x['e'] = 0;
        }

        return x;
    }

    // Remove any digits after the required decimal places.
    xc.length = i--;

    // Round up?
    if ( r ) {

        // Rounding up may mean the previous digit has to be rounded up and so on.
        for ( --base; ++xc[i] > base; ) {
            xc[i] = 0;

            if ( !i-- ) {
                ++x['e'];
                xc.unshift(1);
            }
        }
    }

    // Remove trailing zeros.
    for ( i = xc.length; !xc[--i]; xc.pop() ) {
    }

    return x;
}


// Round after setting the appropriate rounding mode.
// Handles ceil, floor and round.
function setMode( x, dp, rm ) {
    var r = ROUNDING_MODE;

    ROUNDING_MODE = rm;
    x = new BigNumber(x);
    x['c'] && rnd( x, dp, 10 );
    ROUNDING_MODE = r;

    return x;
}


// PROTOTYPE/INSTANCE METHODS


/*
 * Return a new BigNumber whose value is the absolute value of this BigNumber.
 */
P['abs'] = P['absoluteValue'] = function () {
    var x = new BigNumber(this);

    if ( x['s'] < 0 ) {
        x['s'] = 1;
    }

    return x;
};

/*
 * Return the bit length of the number.
 */
P['bitLength'] = function () {
    return this.toString(2).length;
};


/*
 * Return a new BigNumber whose value is the value of this BigNumber
 * rounded to a whole number in the direction of Infinity.
 */
P['ceil'] = function () {
    return setMode( this, 0, 2 );
};


/*
 * Return
 * 1 if the value of this BigNumber is greater than the value of BigNumber(y, b),
 * -1 if the value of this BigNumber is less than the value of BigNumber(y, b),
 * 0 if they have the same value,
 * or null if the value of either is NaN.
 */
P['comparedTo'] = P['cmp'] = function ( y, b ) {
    var a,
        x = this,
        xc = x['c'],
        yc = ( id = -id, y = new BigNumber( y, b ) )['c'],
        i = x['s'],
        j = y['s'],
        k = x['e'],
        l = y['e'];

    // Either NaN?
    if ( !i || !j ) {
        return null;
    }

    a = xc && !xc[0], b = yc && !yc[0];

    // Either zero?
    if ( a || b ) {
        return a ? b ? 0 : -j : i;
    }

    // Signs differ?
    if ( i != j ) {
        return i;
    }

    // Either Infinity?
    if ( a = i < 0, b = k == l, !xc || !yc ) {
        return b ? 0 : !xc ^ a ? 1 : -1;
    }

    // Compare exponents.
    if ( !b ) {
        return k > l ^ a ? 1 : -1;
    }

    // Compare digit by digit.
    for ( i = -1,
          j = ( k = xc.length ) < ( l = yc.length ) ? k : l;
          ++i < j; ) {

        if ( xc[i] != yc[i] ) {
            return xc[i] > yc[i] ^ a ? 1 : -1;
        }
    }
    // Compare lengths.
    return k == l ? 0 : k > l ^ a ? 1 : -1;
};


/*
 *  n / 0 = I
 *  n / N = N
 *  n / I = 0
 *  0 / n = 0
 *  0 / 0 = N
 *  0 / N = N
 *  0 / I = 0
 *  N / n = N
 *  N / 0 = N
 *  N / N = N
 *  N / I = N
 *  I / n = I
 *  I / 0 = I
 *  I / N = N
 *  I / I = N
 *
 * Return a new BigNumber whose value is the value of this BigNumber
 * divided by the value of BigNumber(y, b), rounded according to
 * DECIMAL_PLACES and ROUNDING_MODE.
 */
P['dividedBy'] = P['div'] = function ( y, b ) {
    var xc = this['c'],
        xe = this['e'],
        xs = this['s'],
        yc = ( id = 2, y = new BigNumber( y, b ) )['c'],
        ye = y['e'],
        ys = y['s'],
        s = xs == ys ? 1 : -1;

    // Either NaN/Infinity/0?
    return !xe && ( !xc || !xc[0] ) || !ye && ( !yc || !yc[0] )

      // Either NaN?
      ? new BigNumber( !xs || !ys ||

        // Both 0 or both Infinity?
        ( xc ? yc && xc[0] == yc[0] : !yc )

          // Return NaN.
          ? NaN

          // x is 0 or y is Infinity?
          : xc && xc[0] == 0 || !yc

            // Return +-0.
            ? s * 0

            // y is 0. Return +-Infinity.
            : s / 0 )

      : divide( xc, yc, xe - ye, s, 10 );
};


/*
 * Return true if the value of this BigNumber is equal to the value of
 * BigNumber(n, b), otherwise returns false.
 */
P['equals'] = P['eq'] = function ( n, b ) {
    id = 3;
    return this['cmp']( n, b ) === 0;
};


/*
 * Return a new BigNumber whose value is the value of this BigNumber
 * rounded to a whole number in the direction of -Infinity.
 */
P['floor'] = function () {
    return setMode( this, 0, 3 );
};


/*
 * Return true if the value of this BigNumber is greater than the value of
 * BigNumber(n, b), otherwise returns false.
 */
P['greaterThan'] = P['gt'] = function ( n, b ) {
    id = 4;
    return this['cmp']( n, b ) > 0;
};


/*
 * Return true if the value of this BigNumber is greater than or equal to
 * the value of BigNumber(n, b), otherwise returns false.
 */
P['greaterThanOrEqualTo'] = P['gte'] = P['gt'] = function ( n, b ) {
    id = 5;
    return ( b = this['cmp']( n, b ) ) == 1 || b === 0;
};


/*
 * Return true if the value of this BigNumber is a finite number, otherwise
 * returns false.
 */
P['isFinite'] = P['isF'] = function () {
    return !!this['c'];
};


/*
 * Return true if the value of this BigNumber is NaN, otherwise returns
 * false.
 */
P['isNaN'] = function () {
    return !this['s'];
};


/*
 * Return true if the value of this BigNumber is negative, otherwise
 * returns false.
 */
P['isNegative'] = P['isNeg'] = function () {
    return this['s'] < 0;
};


/*
 * Return true if the value of this BigNumber is 0 or -0, otherwise returns
 * false.
 */
P['isZero'] = P['isZ'] = function () {
    return !!this['c'] && this['c'][0] == 0;
};


/*
 * Return true if the value of this BigNumber is less than the value of
 * BigNumber(n, b), otherwise returns false.
 */
P['lessThan'] = P['lt'] = function ( n, b ) {
    id = 6;
    return this['cmp']( n, b ) < 0;
};


/*
 * Return true if the value of this BigNumber is less than or equal to the
 * value of BigNumber(n, b), otherwise returns false.
 */
P['lessThanOrEqualTo'] = P['lte'] = P['le'] = function ( n, b ) {
    id = 7;
    return ( b = this['cmp']( n, b ) ) == -1 || b === 0;
};


/*
 *  n - 0 = n
 *  n - N = N
 *  n - I = -I
 *  0 - n = -n
 *  0 - 0 = 0
 *  0 - N = N
 *  0 - I = -I
 *  N - n = N
 *  N - 0 = N
 *  N - N = N
 *  N - I = N
 *  I - n = I
 *  I - 0 = I
 *  I - N = N
 *  I - I = N
 *
 * Return a new BigNumber whose value is the value of this BigNumber minus
 * the value of BigNumber(y, b).
 */
P['minus'] = P['sub'] = function ( y, b ) {
    var d, i, j, xLTy,
        x = this,
        a = x['s'];

    b = ( id = 8, y = new BigNumber( y, b ) )['s'];

    // Either NaN?
    if ( !a || !b ) {
        return new BigNumber(NaN);
    }

    // Signs differ?
    if ( a != b ) {
        return y['s'] = -b, x['plus'](y);
    }

    var xc = x['c'],
        xe = x['e'],
        yc = y['c'],
        ye = y['e'];

    if ( !xe || !ye ) {

        // Either Infinity?
        if ( !xc || !yc ) {
            return xc ? ( y['s'] = -b, y ) : new BigNumber( yc ? x : NaN );
        }

        // Either zero?
        if ( !xc[0] || !yc[0] ) {

            // y is non-zero?
            return yc[0]
              ? ( y['s'] = -b, y )

              // x is non-zero?
              : new BigNumber( xc[0]
                ? x

                // Both are zero.
                // IEEE 754 (2008) 6.3: n - n = -0 when rounding to -Infinity
                : ROUNDING_MODE == 3 ? -0 : 0 );
        }
    }

    // Determine which is the bigger number.
    // Prepend zeros to equalise exponents.
    if ( xc = xc.slice(), a = xe - ye ) {
        d = ( xLTy = a < 0 ) ? ( a = -a, xc ) : ( ye = xe, yc );

        for ( d.reverse(), b = a; b--; d.push(0) ) {
        }
        d.reverse();
    } else {

        // Exponents equal. Check digit by digit.
        j = ( ( xLTy = xc.length < yc.length ) ? xc : yc ).length;

        for ( a = b = 0; b < j; b++ ) {

            if ( xc[b] != yc[b] ) {
                xLTy = xc[b] < yc[b];
                break;
            }
        }
    }

    // x < y? Point xc to the array of the bigger number.
    if ( xLTy ) {
        d = xc, xc = yc, yc = d;
        y['s'] = -y['s'];
    }

    /*
     * Append zeros to xc if shorter. No need to add zeros to yc if shorter
     * as subtraction only needs to start at yc.length.
     */
    if ( ( b = -( ( j = xc.length ) - yc.length ) ) > 0 ) {

        for ( ; b--; xc[j++] = 0 ) {
        }
    }

    // Subtract yc from xc.
    for ( b = yc.length; b > a; ){

        if ( xc[--b] < yc[b] ) {

            for ( i = b; i && !xc[--i]; xc[i] = 9 ) {
            }
            --xc[i];
            xc[b] += 10;
        }
        xc[b] -= yc[b];
    }

    // Remove trailing zeros.
    for ( ; xc[--j] == 0; xc.pop() ) {
    }

    // Remove leading zeros and adjust exponent accordingly.
    for ( ; xc[0] == 0; xc.shift(), --ye ) {
    }

    /*
     * No need to check for Infinity as +x - +y != Infinity && -x - -y != Infinity
     * when neither x or y are Infinity.
     */

    // Underflow?
    if ( ye < MIN_EXP || !xc[0] ) {

        /*
         * Following IEEE 754 (2008) 6.3,
         * n - n = +0  but  n - n = -0 when rounding towards -Infinity.
         */
        if ( !xc[0] ) {
            y['s'] = ROUNDING_MODE == 3 ? -1 : 1;
        }

        // Result is zero.
        xc = [ye = 0];
    }

    return y['c'] = xc, y['e'] = ye, y;
};


/*
 *   n % 0 =  N
 *   n % N =  N
 *   0 % n =  0
 *  -0 % n = -0
 *   0 % 0 =  N
 *   0 % N =  N
 *   N % n =  N
 *   N % 0 =  N
 *   N % N =  N
 *
 * Return a new BigNumber whose value is the value of this BigNumber modulo
 * the value of BigNumber(y, b).
 */
P['modulo'] = P['mod'] = function ( y, b ) {
    var x = this,
        xc = x['c'],
        yc = ( id = 9, y = new BigNumber( y, b ) )['c'],
        i = x['s'],
        j = y['s'];

    // Is x or y NaN, or y zero?
    b = !i || !j || yc && !yc[0];

    if ( b || xc && !xc[0] ) {
        return new BigNumber( b ? NaN : x );
    }

    x['s'] = y['s'] = 1;
    b = y['cmp'](x) == 1;
    x['s'] = i, y['s'] = j;

    return b
      ? new BigNumber(x)
      : ( i = DECIMAL_PLACES, j = ROUNDING_MODE,
        DECIMAL_PLACES = 0, ROUNDING_MODE = 1,
          x = x['div'](y),
            DECIMAL_PLACES = i, ROUNDING_MODE = j,
              this['minus']( x['times'](y) ) );
};


/*
 * Return a new BigNumber whose value is the value of this BigNumber
 * negated, i.e. multiplied by -1.
 */
P['negated'] = P['neg'] = function () {
    var x = new BigNumber(this);

    return x['s'] = -x['s'] || null, x;
};


/*
 *  n + 0 = n
 *  n + N = N
 *  n + I = I
 *  0 + n = n
 *  0 + 0 = 0
 *  0 + N = N
 *  0 + I = I
 *  N + n = N
 *  N + 0 = N
 *  N + N = N
 *  N + I = N
 *  I + n = I
 *  I + 0 = I
 *  I + N = N
 *  I + I = I
 *
 * Return a new BigNumber whose value is the value of this BigNumber plus
 * the value of BigNumber(y, b).
 */
P['plus'] = P['add'] = function ( y, b ) {
    var d,
        x = this,
        a = x['s'];

    b = ( id = 10, y = new BigNumber( y, b ) )['s'];

    // Either NaN?
    if ( !a || !b ) {
        return new BigNumber(NaN);
    }

    // Signs differ?
    if ( a != b ) {
        return y['s'] = -b, x['minus'](y);
    }

    var xe = x['e'],
        xc = x['c'],
        ye = y['e'],
        yc = y['c'];

    if ( !xe || !ye ) {

        // Either Infinity?
        if ( !xc || !yc ) {

            // Return +-Infinity.
            return new BigNumber( a / 0 );
        }

        // Either zero?
        if ( !xc[0] || !yc[0] ) {

            // y is non-zero?
            return yc[0]
              ? y

              // x is non-zero?
              : new BigNumber( xc[0]
                ? x

                // Both are zero. Return zero.
                : a * 0 );
        }
    }

    // Prepend zeros to equalise exponents.
    // Note: Faster to use reverse then do unshifts.
    if ( xc = xc.slice(), a = xe - ye ) {
        d = a > 0 ? ( ye = xe, yc ) : ( a = -a, xc );

        for ( d.reverse(); a--; d.push(0) ) {
        }
        d.reverse();
    }

    // Point xc to the longer array.
    if ( xc.length - yc.length < 0 ) {
        d = yc, yc = xc, xc = d;
    }

    /*
     * Only start adding at yc.length - 1 as the
     * further digits of xc can be left as they are.
     */
    for ( a = yc.length, b = 0; a;
         b = ( xc[--a] = xc[a] + yc[a] + b ) / 10 ^ 0, xc[a] %= 10 ) {
    }

    // No need to check for zero, as +x + +y != 0 && -x + -y != 0

    if ( b ) {
        xc.unshift(b);

        // Overflow? (MAX_EXP + 1 possible)
        if ( ++ye > MAX_EXP ) {

            // Infinity.
            xc = ye = null;
        }
    }

     // Remove trailing zeros.
    for ( a = xc.length; xc[--a] == 0; xc.pop() ) {
    }

    return y['c'] = xc, y['e'] = ye, y;
};


/*
 * Return a BigNumber whose value is the value of this BigNumber raised to
 * the power e. If e is negative round according to DECIMAL_PLACES and
 * ROUNDING_MODE.
 *
 * e {number} Integer, -MAX_POWER to MAX_POWER inclusive.
 */
P['toPower'] = P['pow'] = function ( e ) {

    // e to integer, avoiding NaN or Infinity becoming 0.
    var i = e * 0 == 0 ? e | 0 : e,
        x = new BigNumber(this),
        y = new BigNumber(ONE);

    // Use Math.pow?
    // Pass +-Infinity for out of range exponents.
    if ( ( ( ( outOfRange = e < -MAX_POWER || e > MAX_POWER ) &&
      (i = e * 1 / 0) ) ||

         /*
          * Any exponent that fails the parse becomes NaN.
          *
          * Include 'e !== 0' because on Opera -0 == parseFloat(-0) is false,
          * despite -0 === parseFloat(-0) && -0 == parseFloat('-0') is true.
          */
         parse(e) != e && e !== 0 && !(i = NaN) ) &&

          // 'pow() exponent not an integer: {e}'
          // 'pow() exponent out of range: {e}'
          !ifExceptionsThrow( e, 'exponent', 'pow' ) ||

            // Pass zero to Math.pow, as any value to the power zero is 1.
            !i ) {

        // i is +-Infinity, NaN or 0.
        return new BigNumber( Math.pow( x['toS'](), i ) );
    }

    for ( i = i < 0 ? -i : i; ; ) {

        if ( i & 1 ) {
            y = y['times'](x);
        }
        i >>= 1;

        if ( !i ) {
            break;
        }
        x = x['times'](x);
    }

    return e < 0 ? ONE['div'](y) : y;
};


/*
 * Return a BigNumber whose value is the value of this BigNumber raised to
 * the power m modulo n.
 *
 * m {BigNumber} the value to take the power of
 * n {BigNumber} the value to modulo by
 */
P['powm'] = function ( m, n ) {
    return this.pow(m).mod(n);
};


/*
 * Return a new BigNumber whose value is the value of this BigNumber
 * rounded to a maximum of dp decimal places using rounding mode rm, or to
 * 0 and ROUNDING_MODE respectively if omitted.
 *
 * [dp] {number} Integer, 0 to MAX inclusive.
 * [rm] {number} Integer, 0 to 8 inclusive.
 */
P['round'] = function ( dp, rm ) {

    dp = dp == null || ( ( ( outOfRange = dp < 0 || dp > MAX ) ||
      parse(dp) != dp ) &&

        // 'round() decimal places out of range: {dp}'
        // 'round() decimal places not an integer: {dp}'
        !ifExceptionsThrow( dp, 'decimal places', 'round' ) )
          ? 0
          : dp | 0;

    rm = rm == null || ( ( ( outOfRange = rm < 0 || rm > 8 ) ||

      // Include '&& rm !== 0' because with Opera -0 == parseFloat(-0) is false.
      parse(rm) != rm && rm !== 0 ) &&

        // 'round() mode not an integer: {rm}'
        // 'round() mode out of range: {rm}'
        !ifExceptionsThrow( rm, 'mode', 'round' ) )
          ? ROUNDING_MODE
          : rm | 0;

    return setMode( this, dp, rm );
};


/*
 *  sqrt(-n) =  N
 *  sqrt( N) =  N
 *  sqrt(-I) =  N
 *  sqrt( I) =  I
 *  sqrt( 0) =  0
 *  sqrt(-0) = -0
 *
 * Return a new BigNumber whose value is the square root of the value of
 * this BigNumber, rounded according to DECIMAL_PLACES and ROUNDING_MODE.
 */
P['squareRoot'] = P['sqrt'] = function () {
    var n, r, re, t,
        x = this,
        c = x['c'],
        s = x['s'],
        e = x['e'],
        dp = DECIMAL_PLACES,
        rm = ROUNDING_MODE,
        half = new BigNumber('0.5');

    // Negative/NaN/Infinity/zero?
    if ( s !== 1 || !c || !c[0] ) {

        return new BigNumber( !s || s < 0 && ( !c || c[0] )
          ? NaN
          : c ? x : 1 / 0 );
    }

    // Initial estimate.
    s = Math.sqrt( x['toS']() );
    ROUNDING_MODE = 1;

    /*
      Math.sqrt underflow/overflow?
      Pass x to Math.sqrt as integer, then adjust the exponent of the result.
     */
    if ( s == 0 || s == 1 / 0 ) {
        n = c.join('');

        if ( !( n.length + e & 1 ) ) {
            n += '0';
        }
        r = new BigNumber( Math.sqrt(n) + '' );

        // r may still not be finite.
        if ( !r['c'] ) {
            r['c'] = [1];
        }
        r['e'] = ( ( ( e + 1 ) / 2 ) | 0 ) - ( e < 0 || e & 1 );
    } else {
        r = new BigNumber( n = s.toString() );
    }
    re = r['e'];
    s = re + ( DECIMAL_PLACES += 4 );

    if ( s < 3 ) {
        s = 0;
    }
    e = s;

    // Newton-Raphson iteration.
    for ( ; ; ) {
        t = r;
        r = half['times']( t['plus']( x['div'](t) ) );

        if ( t['c'].slice( 0, s ).join('') === r['c'].slice( 0, s ).join('') ) {
            c = r['c'];

            /*
              The exponent of r may here be one less than the final result
              exponent (re), e.g 0.0009999 (e-4) --> 0.001 (e-3), so adjust
              s so the rounding digits are indexed correctly.
             */
            s = s - ( n && r['e'] < re );

            /*
              The 4th rounding digit may be in error by -1 so if the 4 rounding
              digits are 9999 or 4999 (i.e. approaching a rounding boundary)
              continue the iteration.
             */
            if ( c[s] == 9 && c[s - 1] == 9 && c[s - 2] == 9 &&
                    ( c[s - 3] == 9 || n && c[s - 3] == 4 ) ) {

                /*
                  If 9999 on first run through, check to see if rounding up
                  gives the exact result as the nines may infinitely repeat.
                 */
                if ( n && c[s - 3] == 9 ) {
                    t = r['round']( dp, 0 );

                    if ( t['times'](t)['eq'](x) ) {
                        ROUNDING_MODE = rm;
                        DECIMAL_PLACES = dp;

                        return t;
                    }
                }
                DECIMAL_PLACES += 4;
                s += 4;
                n = '';
            } else {

                /*
                  If the rounding digits are null, 0000 or 5000, check for an
                  exact result. If not, then there are further digits so
                  increment the 1st rounding digit to ensure correct rounding.
                 */
                if ( !c[e] && !c[e - 1] && !c[e - 2] &&
                        ( !c[e - 3] || c[e - 3] == 5 ) ) {

                    // Truncate to the first rounding digit.
                    if ( c.length > e - 2 ) {
                        c.length = e - 2;
                    }

                    if ( !r['times'](r)['eq'](x) ) {

                        while ( c.length < e - 3 ) {
                            c.push(0);
                        }
                        c[e - 3]++;
                    }
                }
                ROUNDING_MODE = rm;
                rnd( r, DECIMAL_PLACES = dp, 10 );

                return r;
            }
        }
    }
};


/*
 *  n * 0 = 0
 *  n * N = N
 *  n * I = I
 *  0 * n = 0
 *  0 * 0 = 0
 *  0 * N = N
 *  0 * I = N
 *  N * n = N
 *  N * 0 = N
 *  N * N = N
 *  N * I = N
 *  I * n = I
 *  I * 0 = N
 *  I * N = N
 *  I * I = I
 *
 * Return a new BigNumber whose value is the value of this BigNumber times
 * the value of BigNumber(y, b).
 */
P['times'] = P['mul'] = function ( y, b ) {
    var c,
        x = this,
        xc = x['c'],
        yc = ( id = 11, y = new BigNumber( y, b ) )['c'],
        i = x['e'],
        j = y['e'],
        a = x['s'];

    y['s'] = a == ( b = y['s'] ) ? 1 : -1;

    // Either NaN/Infinity/0?
    if ( !i && ( !xc || !xc[0] ) || !j && ( !yc || !yc[0] ) ) {

        // Either NaN?
        return new BigNumber( !a || !b ||

          // x is 0 and y is Infinity  or  y is 0 and x is Infinity?
          xc && !xc[0] && !yc || yc && !yc[0] && !xc

            // Return NaN.
            ? NaN

            // Either Infinity?
            : !xc || !yc

              // Return +-Infinity.
              ? y['s'] / 0

              // x or y is 0. Return +-0.
              : y['s'] * 0 );
    }
    y['e'] = i + j;

    if ( ( a = xc.length ) < ( b = yc.length ) ) {
        c = xc, xc = yc, yc = c, j = a, a = b, b = j;
    }

    for ( j = a + b, c = []; j--; c.push(0) ) {
    }

    // Multiply!
    for ( i = b - 1; i > -1; i-- ) {

        for ( b = 0, j = a + i;
              j > i;
              b = c[j] + yc[i] * xc[j - i - 1] + b,
              c[j--] = b % 10 | 0,
              b = b / 10 | 0 ) {
        }

        if ( b ) {
            c[j] = ( c[j] + b ) % 10;
        }
    }

    b && ++y['e'];

    // Remove any leading zero.
    !c[0] && c.shift();

    // Remove trailing zeros.
    for ( j = c.length; !c[--j]; c.pop() ) {
    }

    // No zero check needed as only x * 0 == 0 etc.

    // Overflow?
    y['c'] = y['e'] > MAX_EXP

      // Infinity.
      ? ( y['e'] = null )

      // Underflow?
      : y['e'] < MIN_EXP

        // Zero.
        ? [ y['e'] = 0 ]

        // Neither.
        : c;

    return y;
};

/*
 * Return a buffer containing the 
 */
P['toBuffer'] = function ( opts ) {

    if (typeof opts === 'string') {
        if (opts !== 'mpint') return 'Unsupported Buffer representation';

        var abs = this.abs();
        var buf = abs.toBuffer({ size : 1, endian : 'big' });
        var len = buf.length === 1 && buf[0] === 0 ? 0 : buf.length;
        if (buf[0] & 0x80) len ++;

        var ret = new Buffer(4 + len);
        if (len > 0) buf.copy(ret, 4 + (buf[0] & 0x80 ? 1 : 0));
        if (buf[0] & 0x80) ret[4] = 0;

        ret[0] = len & (0xff << 24);
        ret[1] = len & (0xff << 16);
        ret[2] = len & (0xff << 8);
        ret[3] = len & (0xff << 0);

        // two's compliment for negative integers:
        var isNeg = this.lt(0);
        if (isNeg) {
            for (var i = 4; i < ret.length; i++) {
                ret[i] = 0xff - ret[i];
            }
        }
        ret[4] = (ret[4] & 0x7f) | (isNeg ? 0x80 : 0);
        if (isNeg) ret[ret.length - 1] ++;

        return ret;
    }

    if (!opts) opts = {};

    var endian = { 1 : 'big', '-1' : 'little' }[opts.endian]
        || opts.endian || 'big'
    ;

    var hex = this.toString(16);
    if (hex.charAt(0) === '-') throw new Error(
        'converting negative numbers to Buffers not supported yet'
    );

    var size = opts.size === 'auto' ? Math.ceil(hex.length / 2) : (opts.size || 1);

    var len = Math.ceil(hex.length / (2 * size)) * size;
    var buf = new Buffer(len);

    // zero-pad the hex string so the chunks are all `size` long
    while (hex.length < 2 * len) hex = '0' + hex;

    var hx = hex
        .split(new RegExp('(.{' + (2 * size) + '})'))
        .filter(function (s) { return s.length > 0 })
    ;

    hx.forEach(function (chunk, i) {
        for (var j = 0; j < size; j++) {
            var ix = i * size + (endian === 'big' ? j : size - j - 1);
            buf[ix] = parseInt(chunk.slice(j*2,j*2+2), 16);
        }
    });

    return buf;
};

/*
 * Return a string representing the value of this BigNumber in exponential
 * notation to dp fixed decimal places and rounded using ROUNDING_MODE if
 * necessary.
 *
 * [dp] {number} Integer, 0 to MAX inclusive.
 */
P['toExponential'] = P['toE'] = function ( dp ) {

    return format( this,
      ( dp == null || ( ( outOfRange = dp < 0 || dp > MAX ) ||

        /*
         * Include '&& dp !== 0' because with Opera -0 == parseFloat(-0) is
         * false, despite -0 == parseFloat('-0') && 0 == -0 being true.
         */
        parse(dp) != dp && dp !== 0 ) &&

          // 'toE() decimal places not an integer: {dp}'
          // 'toE() decimal places out of range: {dp}'
          !ifExceptionsThrow( dp, 'decimal places', 'toE' ) ) && this['c']
            ? this['c'].length - 1
            : dp | 0, 1 );
};


/*
 * Return a string representing the value of this BigNumber in normal
 * notation to dp fixed decimal places and rounded using ROUNDING_MODE if
 * necessary.
 *
 * Note: as with JavaScript's number type, (-0).toFixed(0) is '0',
 * but e.g. (-0.00001).toFixed(0) is '-0'.
 *
 * [dp] {number} Integer, 0 to MAX inclusive.
 */
P['toFixed'] = P['toF'] = function ( dp ) {
    var n, str, d,
        x = this;

    if ( !( dp == null || ( ( outOfRange = dp < 0 || dp > MAX ) ||
        parse(dp) != dp && dp !== 0 ) &&

        // 'toF() decimal places not an integer: {dp}'
        // 'toF() decimal places out of range: {dp}'
        !ifExceptionsThrow( dp, 'decimal places', 'toF' ) ) ) {
          d = x['e'] + ( dp | 0 );
    }

    n = TO_EXP_NEG, dp = TO_EXP_POS;
    TO_EXP_NEG = -( TO_EXP_POS = 1 / 0 );

    // Note: str is initially undefined.
    if ( d == str ) {
        str = x['toS']();
    } else {
        str = format( x, d );

        // (-0).toFixed() is '0', but (-0.1).toFixed() is '-0'.
        // (-0).toFixed(1) is '0.0', but (-0.01).toFixed(1) is '-0.0'.
        if ( x['s'] < 0 && x['c'] ) {

            // As e.g. -0 toFixed(3), will wrongly be returned as -0.000 from toString.
            if ( !x['c'][0] ) {
                str = str.replace(/^-/, '');

            // As e.g. -0.5 if rounded to -0 will cause toString to omit the minus sign.
            } else if ( str.indexOf('-') < 0 ) {
                str = '-' + str;
            }
        }
    }
    TO_EXP_NEG = n, TO_EXP_POS = dp;

    return str;
};


/*
 * Return a string array representing the value of this BigNumber as a
 * simple fraction with an integer numerator and an integer denominator.
 * The denominator will be a positive non-zero value less than or equal to
 * the specified maximum denominator. If a maximum denominator is not
 * specified, the denominator will be the lowest value necessary to
 * represent the number exactly.
 *
 * [maxD] {number|string|BigNumber} Integer >= 1 and < Infinity.
 */
P['toFraction'] = P['toFr'] = function ( maxD ) {
    var q, frac, n0, d0, d2, n, e,
        n1 = d0 = new BigNumber(ONE),
        d1 = n0 = new BigNumber('0'),
        x = this,
        xc = x['c'],
        exp = MAX_EXP,
        dp = DECIMAL_PLACES,
        rm = ROUNDING_MODE,
        d = new BigNumber(ONE);

    // NaN, Infinity.
    if ( !xc ) {
        return x['toS']();
    }

    e = d['e'] = xc.length - x['e'] - 1;

    // If max denominator is undefined or null...
    if ( maxD == null ||

         // or NaN...
         ( !( id = 12, n = new BigNumber(maxD) )['s'] ||

           // or less than 1, or Infinity...
           ( outOfRange = n['cmp'](n1) < 0 || !n['c'] ) ||

             // or not an integer...
             ( ERRORS && n['e'] < n['c'].length - 1 ) ) &&

               // 'toFr() max denominator not an integer: {maxD}'
               // 'toFr() max denominator out of range: {maxD}'
               !ifExceptionsThrow( maxD, 'max denominator', 'toFr' ) ||

                 // or greater than the maxD needed to specify the value exactly...
                 ( maxD = n )['cmp'](d) > 0 ) {

        // d is e.g. 10, 100, 1000, 10000... , n1 is 1.
        maxD = e > 0 ? d : n1;
    }

    MAX_EXP = 1 / 0;
    n = new BigNumber( xc.join('') );

    for ( DECIMAL_PLACES = 0, ROUNDING_MODE = 1; ; )  {
        q = n['div'](d);
        d2 = d0['plus']( q['times'](d1) );

        if ( d2['cmp'](maxD) == 1 ) {
            break;
        }

        d0 = d1, d1 = d2;

        n1 = n0['plus']( q['times']( d2 = n1 ) );
        n0 = d2;

        d = n['minus']( q['times']( d2 = d ) );
        n = d2;
    }

    d2 = maxD['minus'](d0)['div'](d1);
    n0 = n0['plus']( d2['times'](n1) );
    d0 = d0['plus']( d2['times'](d1) );

    n0['s'] = n1['s'] = x['s'];

    DECIMAL_PLACES = e * 2;
    ROUNDING_MODE = rm;

    // Determine which fraction is closer to x, n0 / d0 or n1 / d1?
    frac = n1['div'](d1)['minus'](x)['abs']()['cmp'](
      n0['div'](d0)['minus'](x)['abs']() ) < 1
      ? [ n1['toS'](), d1['toS']() ]
      : [ n0['toS'](), d0['toS']() ];

    return MAX_EXP = exp, DECIMAL_PLACES = dp, frac;
};


/*
 * Return a string representing the value of this BigNumber to sd significant
 * digits and rounded using ROUNDING_MODE if necessary.
 * If sd is less than the number of digits necessary to represent the integer
 * part of the value in normal notation, then use exponential notation.
 *
 * sd {number} Integer, 1 to MAX inclusive.
 */
P['toPrecision'] = P['toP'] = function ( sd ) {

    /*
     * ERRORS true: Throw if sd not undefined, null or an integer in range.
     * ERRORS false: Ignore sd if not a number or not in range.
     * Truncate non-integers.
     */
    return sd == null || ( ( ( outOfRange = sd < 1 || sd > MAX ) ||
      parse(sd) != sd ) &&

        // 'toP() precision not an integer: {sd}'
        // 'toP() precision out of range: {sd}'
        !ifExceptionsThrow( sd, 'precision', 'toP' ) )
          ? this['toS']()
          : format( this, --sd | 0, 2 );
};


/*
 * Return a string representing the value of this BigNumber in base b, or
 * base 10 if b is omitted. If a base is specified, including base 10,
 * round according to DECIMAL_PLACES and ROUNDING_MODE.
 * If a base is not specified, and this BigNumber has a positive exponent
 * that is equal to or greater than TO_EXP_POS, or a negative exponent equal
 * to or less than TO_EXP_NEG, return exponential notation.
 *
 * [b] {number} Integer, 2 to 64 inclusive.
 */
P['toString'] = P['toS'] = function ( b ) {
    var u, str, strL,
        x = this,
        xe = x['e'];

    // Infinity or NaN?
    if ( xe === null ) {
        str = x['s'] ? 'Infinity' : 'NaN';

    // Exponential format?
    } else if ( b === u && ( xe <= TO_EXP_NEG || xe >= TO_EXP_POS ) ) {
        return format( x, x['c'].length - 1, 1 );
    } else {
        str = x['c'].join('');

        // Negative exponent?
        if ( xe < 0 ) {

            // Prepend zeros.
            for ( ; ++xe; str = '0' + str ) {
            }
            str = '0.' + str;

        // Positive exponent?
        } else if ( strL = str.length, xe > 0 ) {

            if ( ++xe > strL ) {

                // Append zeros.
                for ( xe -= strL; xe-- ; str += '0' ) {
                }
            } else if ( xe < strL ) {
                str = str.slice( 0, xe ) + '.' + str.slice(xe);
            }

        // Exponent zero.
        } else {
            if ( u = str.charAt(0), strL > 1 ) {
                str = u + '.' + str.slice(1);

            // Avoid '-0'
            } else if ( u == '0' ) {
                return u;
            }
        }

        if ( b != null ) {

            if ( !( outOfRange = !( b >= 2 && b < 65 ) ) &&
              ( b == (b | 0) || !ERRORS ) ) {
                str = convert( str, b | 0, 10, x['s'] );

                // Avoid '-0'
                if ( str == '0' ) {
                    return str;
                }
            } else {

                // 'toS() base not an integer: {b}'
                // 'toS() base out of range: {b}'
                ifExceptionsThrow( b, 'base', 'toS' );
            }
        }

    }

    return x['s'] < 0 ? '-' + str : str;
};


/*
 * Return as toString, but do not accept a base argument.
 */
P['valueOf'] = function () {
    return this['toS']();
};


// Add aliases for BigDecimal methods.
//P['add'] = P['plus'];
//P['subtract'] = P['minus'];
//P['multiply'] = P['times'];
//P['divide'] = P['div'];
//P['remainder'] = P['mod'];
//P['compareTo'] = P['cmp'];
//P['negate'] = P['neg'];


// EXPORT
module.exports = BigNumber;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":4}],4:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

},{"base64-js":2,"ieee754":31}],5:[function(require,module,exports){
/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Patrick Gansterer <paroga@paroga.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(function(global, undefined) { "use strict";
var POW_2_24 = Math.pow(2, -24),
    POW_2_32 = Math.pow(2, 32),
    POW_2_53 = Math.pow(2, 53);

function encode(value) {
  var data = new ArrayBuffer(256);
  var dataView = new DataView(data);
  var lastLength;
  var offset = 0;

  function ensureSpace(length) {
    var newByteLength = data.byteLength;
    var requiredLength = offset + length;
    while (newByteLength < requiredLength)
      newByteLength *= 2;
    if (newByteLength !== data.byteLength) {
      var oldDataView = dataView;
      data = new ArrayBuffer(newByteLength);
      dataView = new DataView(data);
      var uint32count = (offset + 3) >> 2;
      for (var i = 0; i < uint32count; ++i)
        dataView.setUint32(i * 4, oldDataView.getUint32(i * 4));
    }

    lastLength = length;
    return dataView;
  }
  function write() {
    offset += lastLength;
  }
  function writeFloat64(value) {
    write(ensureSpace(8).setFloat64(offset, value));
  }
  function writeUint8(value) {
    write(ensureSpace(1).setUint8(offset, value));
  }
  function writeUint8Array(value) {
    var dataView = ensureSpace(value.length);
    for (var i = 0; i < value.length; ++i)
      dataView.setUint8(offset + i, value[i]);
    write();
  }
  function writeUint16(value) {
    write(ensureSpace(2).setUint16(offset, value));
  }
  function writeUint32(value) {
    write(ensureSpace(4).setUint32(offset, value));
  }
  function writeUint64(value) {
    var low = value % POW_2_32;
    var high = (value - low) / POW_2_32;
    var dataView = ensureSpace(8);
    dataView.setUint32(offset, high);
    dataView.setUint32(offset + 4, low);
    write();
  }
  function writeTypeAndLength(type, length) {
    if (length < 24) {
      writeUint8(type << 5 | length);
    } else if (length < 0x100) {
      writeUint8(type << 5 | 24);
      writeUint8(length);
    } else if (length < 0x10000) {
      writeUint8(type << 5 | 25);
      writeUint16(length);
    } else if (length < 0x100000000) {
      writeUint8(type << 5 | 26);
      writeUint32(length);
    } else {
      writeUint8(type << 5 | 27);
      writeUint64(length);
    }
  }
  
  function encodeItem(value) {
    var i;

    if (value === false)
      return writeUint8(0xf4);
    if (value === true)
      return writeUint8(0xf5);
    if (value === null)
      return writeUint8(0xf6);
    if (value === undefined)
      return writeUint8(0xf7);
  
    switch (typeof value) {
      case "number":
        if (Math.floor(value) === value) {
          if (0 <= value && value <= POW_2_53)
            return writeTypeAndLength(0, value);
          if (-POW_2_53 <= value && value < 0)
            return writeTypeAndLength(1, -(value + 1));
        }
        writeUint8(0xfb);
        return writeFloat64(value);

      case "string":
        var utf8data = [];
        for (i = 0; i < value.length; ++i) {
          var charCode = value.charCodeAt(i);
          if (charCode < 0x80) {
            utf8data.push(charCode);
          } else if (charCode < 0x800) {
            utf8data.push(0xc0 | charCode >> 6);
            utf8data.push(0x80 | charCode & 0x3f);
          } else if (charCode < 0xd800) {
            utf8data.push(0xe0 | charCode >> 12);
            utf8data.push(0x80 | (charCode >> 6)  & 0x3f);
            utf8data.push(0x80 | charCode & 0x3f);
          } else {
            charCode = (charCode & 0x3ff) << 10;
            charCode |= value.charCodeAt(++i) & 0x3ff;
            charCode += 0x10000;

            utf8data.push(0xf0 | charCode >> 18);
            utf8data.push(0x80 | (charCode >> 12)  & 0x3f);
            utf8data.push(0x80 | (charCode >> 6)  & 0x3f);
            utf8data.push(0x80 | charCode & 0x3f);
          }
        }

        writeTypeAndLength(3, utf8data.length);
        return writeUint8Array(utf8data);

      default:
        var length;
        if (Array.isArray(value)) {
          length = value.length;
          writeTypeAndLength(4, length);
          for (i = 0; i < length; ++i)
            encodeItem(value[i]);
        } else if (value instanceof Uint8Array) {
          writeTypeAndLength(2, value.length);
          writeUint8Array(value);
        } else {
          var keys = Object.keys(value);
          length = keys.length;
          writeTypeAndLength(5, length);
          for (i = 0; i < length; ++i) {
            var key = keys[i];
            encodeItem(key);
            encodeItem(value[key]);
          }
        }
    }
  }
  
  encodeItem(value);

  if ("slice" in data)
    return data.slice(0, offset);
  
  var ret = new ArrayBuffer(offset);
  var retView = new DataView(ret);
  for (var i = 0; i < offset; ++i)
    retView.setUint8(i, dataView.getUint8(i));
  return ret;
}

function decode(data, tagger, simpleValue) {
  var dataView = new DataView(data);
  var offset = 0;
  
  if (typeof tagger !== "function")
    tagger = function(value) { return value; };
  if (typeof simpleValue !== "function")
    simpleValue = function() { return undefined; };

  function read(value, length) {
    offset += length;
    return value;
  }
  function readArrayBuffer(length) {
    return read(new Uint8Array(data, offset, length), length);
  }
  function readFloat16() {
    var tempArrayBuffer = new ArrayBuffer(4);
    var tempDataView = new DataView(tempArrayBuffer);
    var value = readUint16();

    var sign = value & 0x8000;
    var exponent = value & 0x7c00;
    var fraction = value & 0x03ff;
    
    if (exponent === 0x7c00)
      exponent = 0xff << 10;
    else if (exponent !== 0)
      exponent += (127 - 15) << 10;
    else if (fraction !== 0)
      return fraction * POW_2_24;
    
    tempDataView.setUint32(0, sign << 16 | exponent << 13 | fraction << 13);
    return tempDataView.getFloat32(0);
  }
  function readFloat32() {
    return read(dataView.getFloat32(offset), 4);
  }
  function readFloat64() {
    return read(dataView.getFloat64(offset), 8);
  }
  function readUint8() {
    return read(dataView.getUint8(offset), 1);
  }
  function readUint16() {
    return read(dataView.getUint16(offset), 2);
  }
  function readUint32() {
    return read(dataView.getUint32(offset), 4);
  }
  function readUint64() {
    return readUint32() * POW_2_32 + readUint32();
  }
  function readBreak() {
    if (dataView.getUint8(offset) !== 0xff)
      return false;
    offset += 1;
    return true;
  }
  function readLength(additionalInformation) {
    if (additionalInformation < 24)
      return additionalInformation;
    if (additionalInformation === 24)
      return readUint8();
    if (additionalInformation === 25)
      return readUint16();
    if (additionalInformation === 26)
      return readUint32();
    if (additionalInformation === 27)
      return readUint64();
    if (additionalInformation === 31)
      return -1;
    throw "Invalid length encoding";
  }
  function readIndefiniteStringLength(majorType) {
    var initialByte = readUint8();
    if (initialByte === 0xff)
      return -1;
    var length = readLength(initialByte & 0x1f);
    if (length < 0 || (initialByte >> 5) !== majorType)
      throw "Invalid indefinite length element";
    return length;
  }

  function appendUtf16data(utf16data, length) {
    for (var i = 0; i < length; ++i) {
      var value = readUint8();
      if (value & 0x80) {
        if (value < 0xe0) {
          value = (value & 0x1f) <<  6
                | (readUint8() & 0x3f);
          length -= 1;
        } else if (value < 0xf0) {
          value = (value & 0x0f) << 12
                | (readUint8() & 0x3f) << 6
                | (readUint8() & 0x3f);
          length -= 2;
        } else {
          value = (value & 0x0f) << 18
                | (readUint8() & 0x3f) << 12
                | (readUint8() & 0x3f) << 6
                | (readUint8() & 0x3f);
          length -= 3;
        }
      }

      if (value < 0x10000) {
        utf16data.push(value);
      } else {
        value -= 0x10000;
        utf16data.push(0xd800 | (value >> 10));
        utf16data.push(0xdc00 | (value & 0x3ff));
      }
    }
  }

  function decodeItem() {
    var initialByte = readUint8();
    var majorType = initialByte >> 5;
    var additionalInformation = initialByte & 0x1f;
    var i;
    var length;

    if (majorType === 7) {
      switch (additionalInformation) {
        case 25:
          return readFloat16();
        case 26:
          return readFloat32();
        case 27:
          return readFloat64();
      }
    }

    length = readLength(additionalInformation);
    if (length < 0 && (majorType < 2 || 6 < majorType))
      throw "Invalid length";

    switch (majorType) {
      case 0:
        return length;
      case 1:
        return -1 - length;
      case 2:
        if (length < 0) {
          var elements = [];
          var fullArrayLength = 0;
          while ((length = readIndefiniteStringLength(majorType)) >= 0) {
            fullArrayLength += length;
            elements.push(readArrayBuffer(length));
          }
          var fullArray = new Uint8Array(fullArrayLength);
          var fullArrayOffset = 0;
          for (i = 0; i < elements.length; ++i) {
            fullArray.set(elements[i], fullArrayOffset);
            fullArrayOffset += elements[i].length;
          }
          return fullArray;
        }
        return readArrayBuffer(length);
      case 3:
        var utf16data = [];
        if (length < 0) {
          while ((length = readIndefiniteStringLength(majorType)) >= 0)
            appendUtf16data(utf16data, length);
        } else
          appendUtf16data(utf16data, length);
        return String.fromCharCode.apply(null, utf16data);
      case 4:
        var retArray;
        if (length < 0) {
          retArray = [];
          while (!readBreak())
            retArray.push(decodeItem());
        } else {
          retArray = new Array(length);
          for (i = 0; i < length; ++i)
            retArray[i] = decodeItem();
        }
        return retArray;
      case 5:
        var retObject = {};
        for (i = 0; i < length || length < 0 && !readBreak(); ++i) {
          var key = decodeItem();
          retObject[key] = decodeItem();
        }
        return retObject;
      case 6:
        return tagger(decodeItem(), length);
      case 7:
        switch (length) {
          case 20:
            return false;
          case 21:
            return true;
          case 22:
            return null;
          case 23:
            return undefined;
          default:
            return simpleValue(length);
        }
    }
  }

  var ret = decodeItem();
  if (offset !== data.byteLength)
    throw "Remaining bytes";
  return ret;
}

var obj = { encode: encode, decode: decode };

if (typeof define === "function" && define.amd)
  define("cbor/cbor", obj);
else if (typeof module !== 'undefined' && module.exports)
  module.exports = obj;
else if (!global.CBOR)
  global.CBOR = obj;

})(this);

},{}],6:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc1').default;

},{"./es6/crc1":17}],7:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc16').default;

},{"./es6/crc16":18}],8:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc16ccitt').default;

},{"./es6/crc16ccitt":19}],9:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc16kermit').default;

},{"./es6/crc16kermit":20}],10:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc16modbus').default;

},{"./es6/crc16modbus":21}],11:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc16xmodem').default;

},{"./es6/crc16xmodem":22}],12:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc24').default;

},{"./es6/crc24":23}],13:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc32').default;

},{"./es6/crc32":24}],14:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc8').default;

},{"./es6/crc8":25}],15:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crc81wire').default;

},{"./es6/crc81wire":26}],16:[function(require,module,exports){
'use strict';

module.exports = require('./es6/crcjam').default;

},{"./es6/crcjam":27}],17:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var crc1 = (0, _define_crc2.default)('crc1', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = ~~previous;
  var accum = 0;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    accum += byte;
  }

  crc += accum % 256;
  return crc % 256;
});

exports.default = crc1;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=crc-16 --generate=c`
// prettier-ignore
var TABLE = [0x0000, 0xc0c1, 0xc181, 0x0140, 0xc301, 0x03c0, 0x0280, 0xc241, 0xc601, 0x06c0, 0x0780, 0xc741, 0x0500, 0xc5c1, 0xc481, 0x0440, 0xcc01, 0x0cc0, 0x0d80, 0xcd41, 0x0f00, 0xcfc1, 0xce81, 0x0e40, 0x0a00, 0xcac1, 0xcb81, 0x0b40, 0xc901, 0x09c0, 0x0880, 0xc841, 0xd801, 0x18c0, 0x1980, 0xd941, 0x1b00, 0xdbc1, 0xda81, 0x1a40, 0x1e00, 0xdec1, 0xdf81, 0x1f40, 0xdd01, 0x1dc0, 0x1c80, 0xdc41, 0x1400, 0xd4c1, 0xd581, 0x1540, 0xd701, 0x17c0, 0x1680, 0xd641, 0xd201, 0x12c0, 0x1380, 0xd341, 0x1100, 0xd1c1, 0xd081, 0x1040, 0xf001, 0x30c0, 0x3180, 0xf141, 0x3300, 0xf3c1, 0xf281, 0x3240, 0x3600, 0xf6c1, 0xf781, 0x3740, 0xf501, 0x35c0, 0x3480, 0xf441, 0x3c00, 0xfcc1, 0xfd81, 0x3d40, 0xff01, 0x3fc0, 0x3e80, 0xfe41, 0xfa01, 0x3ac0, 0x3b80, 0xfb41, 0x3900, 0xf9c1, 0xf881, 0x3840, 0x2800, 0xe8c1, 0xe981, 0x2940, 0xeb01, 0x2bc0, 0x2a80, 0xea41, 0xee01, 0x2ec0, 0x2f80, 0xef41, 0x2d00, 0xedc1, 0xec81, 0x2c40, 0xe401, 0x24c0, 0x2580, 0xe541, 0x2700, 0xe7c1, 0xe681, 0x2640, 0x2200, 0xe2c1, 0xe381, 0x2340, 0xe101, 0x21c0, 0x2080, 0xe041, 0xa001, 0x60c0, 0x6180, 0xa141, 0x6300, 0xa3c1, 0xa281, 0x6240, 0x6600, 0xa6c1, 0xa781, 0x6740, 0xa501, 0x65c0, 0x6480, 0xa441, 0x6c00, 0xacc1, 0xad81, 0x6d40, 0xaf01, 0x6fc0, 0x6e80, 0xae41, 0xaa01, 0x6ac0, 0x6b80, 0xab41, 0x6900, 0xa9c1, 0xa881, 0x6840, 0x7800, 0xb8c1, 0xb981, 0x7940, 0xbb01, 0x7bc0, 0x7a80, 0xba41, 0xbe01, 0x7ec0, 0x7f80, 0xbf41, 0x7d00, 0xbdc1, 0xbc81, 0x7c40, 0xb401, 0x74c0, 0x7580, 0xb541, 0x7700, 0xb7c1, 0xb681, 0x7640, 0x7200, 0xb2c1, 0xb381, 0x7340, 0xb101, 0x71c0, 0x7080, 0xb041, 0x5000, 0x90c1, 0x9181, 0x5140, 0x9301, 0x53c0, 0x5280, 0x9241, 0x9601, 0x56c0, 0x5780, 0x9741, 0x5500, 0x95c1, 0x9481, 0x5440, 0x9c01, 0x5cc0, 0x5d80, 0x9d41, 0x5f00, 0x9fc1, 0x9e81, 0x5e40, 0x5a00, 0x9ac1, 0x9b81, 0x5b40, 0x9901, 0x59c0, 0x5880, 0x9841, 0x8801, 0x48c0, 0x4980, 0x8941, 0x4b00, 0x8bc1, 0x8a81, 0x4a40, 0x4e00, 0x8ec1, 0x8f81, 0x4f40, 0x8d01, 0x4dc0, 0x4c80, 0x8c41, 0x4400, 0x84c1, 0x8581, 0x4540, 0x8701, 0x47c0, 0x4680, 0x8641, 0x8201, 0x42c0, 0x4380, 0x8341, 0x4100, 0x81c1, 0x8081, 0x4040];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc16 = (0, _define_crc2.default)('crc-16', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = ~~previous;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = (TABLE[(crc ^ byte) & 0xff] ^ crc >> 8) & 0xffff;
  }

  return crc;
});

exports.default = crc16;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],19:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=ccitt --generate=c`
// prettier-ignore
var TABLE = [0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7, 0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef, 0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6, 0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de, 0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485, 0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d, 0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4, 0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc, 0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823, 0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b, 0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12, 0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a, 0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41, 0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49, 0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70, 0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78, 0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f, 0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067, 0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e, 0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256, 0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d, 0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405, 0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c, 0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634, 0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab, 0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3, 0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a, 0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92, 0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9, 0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1, 0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8, 0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc16ccitt = (0, _define_crc2.default)('ccitt', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = typeof previous !== 'undefined' ? ~~previous : 0xffff;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = (TABLE[(crc >> 8 ^ byte) & 0xff] ^ crc << 8) & 0xffff;
  }

  return crc;
});

exports.default = crc16ccitt;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],20:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=kermit --generate=c`
// prettier-ignore
var TABLE = [0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf, 0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7, 0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e, 0x9cc9, 0x8d40, 0xbfdb, 0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876, 0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd, 0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5, 0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c, 0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974, 0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb, 0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3, 0x5285, 0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a, 0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72, 0x6306, 0x728f, 0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9, 0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1, 0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738, 0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862, 0x9af9, 0x8b70, 0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7, 0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff, 0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036, 0x18c1, 0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e, 0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5, 0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd, 0xb58b, 0xa402, 0x9699, 0x8710, 0xf3af, 0xe226, 0xd0bd, 0xc134, 0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c, 0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1, 0xa33a, 0xb2b3, 0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb, 0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232, 0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a, 0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1, 0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9, 0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330, 0x7bc7, 0x6a4e, 0x58d5, 0x495c, 0x3de3, 0x2c6a, 0x1ef1, 0x0f78];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc16kermit = (0, _define_crc2.default)('kermit', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = typeof previous !== 'undefined' ? ~~previous : 0x0000;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = (TABLE[(crc ^ byte) & 0xff] ^ crc >> 8) & 0xffff;
  }

  return crc;
});

exports.default = crc16kermit;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],21:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=crc-16-modbus --generate=c`
// prettier-ignore
var TABLE = [0x0000, 0xc0c1, 0xc181, 0x0140, 0xc301, 0x03c0, 0x0280, 0xc241, 0xc601, 0x06c0, 0x0780, 0xc741, 0x0500, 0xc5c1, 0xc481, 0x0440, 0xcc01, 0x0cc0, 0x0d80, 0xcd41, 0x0f00, 0xcfc1, 0xce81, 0x0e40, 0x0a00, 0xcac1, 0xcb81, 0x0b40, 0xc901, 0x09c0, 0x0880, 0xc841, 0xd801, 0x18c0, 0x1980, 0xd941, 0x1b00, 0xdbc1, 0xda81, 0x1a40, 0x1e00, 0xdec1, 0xdf81, 0x1f40, 0xdd01, 0x1dc0, 0x1c80, 0xdc41, 0x1400, 0xd4c1, 0xd581, 0x1540, 0xd701, 0x17c0, 0x1680, 0xd641, 0xd201, 0x12c0, 0x1380, 0xd341, 0x1100, 0xd1c1, 0xd081, 0x1040, 0xf001, 0x30c0, 0x3180, 0xf141, 0x3300, 0xf3c1, 0xf281, 0x3240, 0x3600, 0xf6c1, 0xf781, 0x3740, 0xf501, 0x35c0, 0x3480, 0xf441, 0x3c00, 0xfcc1, 0xfd81, 0x3d40, 0xff01, 0x3fc0, 0x3e80, 0xfe41, 0xfa01, 0x3ac0, 0x3b80, 0xfb41, 0x3900, 0xf9c1, 0xf881, 0x3840, 0x2800, 0xe8c1, 0xe981, 0x2940, 0xeb01, 0x2bc0, 0x2a80, 0xea41, 0xee01, 0x2ec0, 0x2f80, 0xef41, 0x2d00, 0xedc1, 0xec81, 0x2c40, 0xe401, 0x24c0, 0x2580, 0xe541, 0x2700, 0xe7c1, 0xe681, 0x2640, 0x2200, 0xe2c1, 0xe381, 0x2340, 0xe101, 0x21c0, 0x2080, 0xe041, 0xa001, 0x60c0, 0x6180, 0xa141, 0x6300, 0xa3c1, 0xa281, 0x6240, 0x6600, 0xa6c1, 0xa781, 0x6740, 0xa501, 0x65c0, 0x6480, 0xa441, 0x6c00, 0xacc1, 0xad81, 0x6d40, 0xaf01, 0x6fc0, 0x6e80, 0xae41, 0xaa01, 0x6ac0, 0x6b80, 0xab41, 0x6900, 0xa9c1, 0xa881, 0x6840, 0x7800, 0xb8c1, 0xb981, 0x7940, 0xbb01, 0x7bc0, 0x7a80, 0xba41, 0xbe01, 0x7ec0, 0x7f80, 0xbf41, 0x7d00, 0xbdc1, 0xbc81, 0x7c40, 0xb401, 0x74c0, 0x7580, 0xb541, 0x7700, 0xb7c1, 0xb681, 0x7640, 0x7200, 0xb2c1, 0xb381, 0x7340, 0xb101, 0x71c0, 0x7080, 0xb041, 0x5000, 0x90c1, 0x9181, 0x5140, 0x9301, 0x53c0, 0x5280, 0x9241, 0x9601, 0x56c0, 0x5780, 0x9741, 0x5500, 0x95c1, 0x9481, 0x5440, 0x9c01, 0x5cc0, 0x5d80, 0x9d41, 0x5f00, 0x9fc1, 0x9e81, 0x5e40, 0x5a00, 0x9ac1, 0x9b81, 0x5b40, 0x9901, 0x59c0, 0x5880, 0x9841, 0x8801, 0x48c0, 0x4980, 0x8941, 0x4b00, 0x8bc1, 0x8a81, 0x4a40, 0x4e00, 0x8ec1, 0x8f81, 0x4f40, 0x8d01, 0x4dc0, 0x4c80, 0x8c41, 0x4400, 0x84c1, 0x8581, 0x4540, 0x8701, 0x47c0, 0x4680, 0x8641, 0x8201, 0x42c0, 0x4380, 0x8341, 0x4100, 0x81c1, 0x8081, 0x4040];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc16modbus = (0, _define_crc2.default)('crc-16-modbus', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = typeof previous !== 'undefined' ? ~~previous : 0xffff;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = (TABLE[(crc ^ byte) & 0xff] ^ crc >> 8) & 0xffff;
  }

  return crc;
});

exports.default = crc16modbus;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var crc16xmodem = (0, _define_crc2.default)('xmodem', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = typeof previous !== 'undefined' ? ~~previous : 0x0;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    var code = crc >>> 8 & 0xff;

    code ^= byte & 0xff;
    code ^= code >>> 4;
    crc = crc << 8 & 0xffff;
    crc ^= code;
    code = code << 5 & 0xffff;
    crc ^= code;
    code = code << 7 & 0xffff;
    crc ^= code;
  }

  return crc;
});

exports.default = crc16xmodem;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-drive --model=crc-24 --generate=c`
// prettier-ignore
var TABLE = [0x000000, 0x864cfb, 0x8ad50d, 0x0c99f6, 0x93e6e1, 0x15aa1a, 0x1933ec, 0x9f7f17, 0xa18139, 0x27cdc2, 0x2b5434, 0xad18cf, 0x3267d8, 0xb42b23, 0xb8b2d5, 0x3efe2e, 0xc54e89, 0x430272, 0x4f9b84, 0xc9d77f, 0x56a868, 0xd0e493, 0xdc7d65, 0x5a319e, 0x64cfb0, 0xe2834b, 0xee1abd, 0x685646, 0xf72951, 0x7165aa, 0x7dfc5c, 0xfbb0a7, 0x0cd1e9, 0x8a9d12, 0x8604e4, 0x00481f, 0x9f3708, 0x197bf3, 0x15e205, 0x93aefe, 0xad50d0, 0x2b1c2b, 0x2785dd, 0xa1c926, 0x3eb631, 0xb8faca, 0xb4633c, 0x322fc7, 0xc99f60, 0x4fd39b, 0x434a6d, 0xc50696, 0x5a7981, 0xdc357a, 0xd0ac8c, 0x56e077, 0x681e59, 0xee52a2, 0xe2cb54, 0x6487af, 0xfbf8b8, 0x7db443, 0x712db5, 0xf7614e, 0x19a3d2, 0x9fef29, 0x9376df, 0x153a24, 0x8a4533, 0x0c09c8, 0x00903e, 0x86dcc5, 0xb822eb, 0x3e6e10, 0x32f7e6, 0xb4bb1d, 0x2bc40a, 0xad88f1, 0xa11107, 0x275dfc, 0xdced5b, 0x5aa1a0, 0x563856, 0xd074ad, 0x4f0bba, 0xc94741, 0xc5deb7, 0x43924c, 0x7d6c62, 0xfb2099, 0xf7b96f, 0x71f594, 0xee8a83, 0x68c678, 0x645f8e, 0xe21375, 0x15723b, 0x933ec0, 0x9fa736, 0x19ebcd, 0x8694da, 0x00d821, 0x0c41d7, 0x8a0d2c, 0xb4f302, 0x32bff9, 0x3e260f, 0xb86af4, 0x2715e3, 0xa15918, 0xadc0ee, 0x2b8c15, 0xd03cb2, 0x567049, 0x5ae9bf, 0xdca544, 0x43da53, 0xc596a8, 0xc90f5e, 0x4f43a5, 0x71bd8b, 0xf7f170, 0xfb6886, 0x7d247d, 0xe25b6a, 0x641791, 0x688e67, 0xeec29c, 0x3347a4, 0xb50b5f, 0xb992a9, 0x3fde52, 0xa0a145, 0x26edbe, 0x2a7448, 0xac38b3, 0x92c69d, 0x148a66, 0x181390, 0x9e5f6b, 0x01207c, 0x876c87, 0x8bf571, 0x0db98a, 0xf6092d, 0x7045d6, 0x7cdc20, 0xfa90db, 0x65efcc, 0xe3a337, 0xef3ac1, 0x69763a, 0x578814, 0xd1c4ef, 0xdd5d19, 0x5b11e2, 0xc46ef5, 0x42220e, 0x4ebbf8, 0xc8f703, 0x3f964d, 0xb9dab6, 0xb54340, 0x330fbb, 0xac70ac, 0x2a3c57, 0x26a5a1, 0xa0e95a, 0x9e1774, 0x185b8f, 0x14c279, 0x928e82, 0x0df195, 0x8bbd6e, 0x872498, 0x016863, 0xfad8c4, 0x7c943f, 0x700dc9, 0xf64132, 0x693e25, 0xef72de, 0xe3eb28, 0x65a7d3, 0x5b59fd, 0xdd1506, 0xd18cf0, 0x57c00b, 0xc8bf1c, 0x4ef3e7, 0x426a11, 0xc426ea, 0x2ae476, 0xaca88d, 0xa0317b, 0x267d80, 0xb90297, 0x3f4e6c, 0x33d79a, 0xb59b61, 0x8b654f, 0x0d29b4, 0x01b042, 0x87fcb9, 0x1883ae, 0x9ecf55, 0x9256a3, 0x141a58, 0xefaaff, 0x69e604, 0x657ff2, 0xe33309, 0x7c4c1e, 0xfa00e5, 0xf69913, 0x70d5e8, 0x4e2bc6, 0xc8673d, 0xc4fecb, 0x42b230, 0xddcd27, 0x5b81dc, 0x57182a, 0xd154d1, 0x26359f, 0xa07964, 0xace092, 0x2aac69, 0xb5d37e, 0x339f85, 0x3f0673, 0xb94a88, 0x87b4a6, 0x01f85d, 0x0d61ab, 0x8b2d50, 0x145247, 0x921ebc, 0x9e874a, 0x18cbb1, 0xe37b16, 0x6537ed, 0x69ae1b, 0xefe2e0, 0x709df7, 0xf6d10c, 0xfa48fa, 0x7c0401, 0x42fa2f, 0xc4b6d4, 0xc82f22, 0x4e63d9, 0xd11cce, 0x575035, 0x5bc9c3, 0xdd8538];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc24 = (0, _define_crc2.default)('crc-24', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = typeof previous !== 'undefined' ? ~~previous : 0xb704ce;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = (TABLE[(crc >> 16 ^ byte) & 0xff] ^ crc << 8) & 0xffffff;
  }

  return crc;
});

exports.default = crc24;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],24:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=crc-32 --generate=c`
// prettier-ignore
var TABLE = [0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f, 0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9, 0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc32 = (0, _define_crc2.default)('crc-32', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = previous === 0 ? 0 : ~~previous ^ -1;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = TABLE[(crc ^ byte) & 0xff] ^ crc >>> 8;
  }

  return crc ^ -1;
});

exports.default = crc32;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],25:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=crc-8 --generate=c`
// prettier-ignore
var TABLE = [0x00, 0x07, 0x0e, 0x09, 0x1c, 0x1b, 0x12, 0x15, 0x38, 0x3f, 0x36, 0x31, 0x24, 0x23, 0x2a, 0x2d, 0x70, 0x77, 0x7e, 0x79, 0x6c, 0x6b, 0x62, 0x65, 0x48, 0x4f, 0x46, 0x41, 0x54, 0x53, 0x5a, 0x5d, 0xe0, 0xe7, 0xee, 0xe9, 0xfc, 0xfb, 0xf2, 0xf5, 0xd8, 0xdf, 0xd6, 0xd1, 0xc4, 0xc3, 0xca, 0xcd, 0x90, 0x97, 0x9e, 0x99, 0x8c, 0x8b, 0x82, 0x85, 0xa8, 0xaf, 0xa6, 0xa1, 0xb4, 0xb3, 0xba, 0xbd, 0xc7, 0xc0, 0xc9, 0xce, 0xdb, 0xdc, 0xd5, 0xd2, 0xff, 0xf8, 0xf1, 0xf6, 0xe3, 0xe4, 0xed, 0xea, 0xb7, 0xb0, 0xb9, 0xbe, 0xab, 0xac, 0xa5, 0xa2, 0x8f, 0x88, 0x81, 0x86, 0x93, 0x94, 0x9d, 0x9a, 0x27, 0x20, 0x29, 0x2e, 0x3b, 0x3c, 0x35, 0x32, 0x1f, 0x18, 0x11, 0x16, 0x03, 0x04, 0x0d, 0x0a, 0x57, 0x50, 0x59, 0x5e, 0x4b, 0x4c, 0x45, 0x42, 0x6f, 0x68, 0x61, 0x66, 0x73, 0x74, 0x7d, 0x7a, 0x89, 0x8e, 0x87, 0x80, 0x95, 0x92, 0x9b, 0x9c, 0xb1, 0xb6, 0xbf, 0xb8, 0xad, 0xaa, 0xa3, 0xa4, 0xf9, 0xfe, 0xf7, 0xf0, 0xe5, 0xe2, 0xeb, 0xec, 0xc1, 0xc6, 0xcf, 0xc8, 0xdd, 0xda, 0xd3, 0xd4, 0x69, 0x6e, 0x67, 0x60, 0x75, 0x72, 0x7b, 0x7c, 0x51, 0x56, 0x5f, 0x58, 0x4d, 0x4a, 0x43, 0x44, 0x19, 0x1e, 0x17, 0x10, 0x05, 0x02, 0x0b, 0x0c, 0x21, 0x26, 0x2f, 0x28, 0x3d, 0x3a, 0x33, 0x34, 0x4e, 0x49, 0x40, 0x47, 0x52, 0x55, 0x5c, 0x5b, 0x76, 0x71, 0x78, 0x7f, 0x6a, 0x6d, 0x64, 0x63, 0x3e, 0x39, 0x30, 0x37, 0x22, 0x25, 0x2c, 0x2b, 0x06, 0x01, 0x08, 0x0f, 0x1a, 0x1d, 0x14, 0x13, 0xae, 0xa9, 0xa0, 0xa7, 0xb2, 0xb5, 0xbc, 0xbb, 0x96, 0x91, 0x98, 0x9f, 0x8a, 0x8d, 0x84, 0x83, 0xde, 0xd9, 0xd0, 0xd7, 0xc2, 0xc5, 0xcc, 0xcb, 0xe6, 0xe1, 0xe8, 0xef, 0xfa, 0xfd, 0xf4, 0xf3];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc8 = (0, _define_crc2.default)('crc-8', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = ~~previous;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = TABLE[(crc ^ byte) & 0xff] & 0xff;
  }

  return crc;
});

exports.default = crc8;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],26:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=dallas-1-wire --generate=c`
// prettier-ignore
var TABLE = [0x00, 0x5e, 0xbc, 0xe2, 0x61, 0x3f, 0xdd, 0x83, 0xc2, 0x9c, 0x7e, 0x20, 0xa3, 0xfd, 0x1f, 0x41, 0x9d, 0xc3, 0x21, 0x7f, 0xfc, 0xa2, 0x40, 0x1e, 0x5f, 0x01, 0xe3, 0xbd, 0x3e, 0x60, 0x82, 0xdc, 0x23, 0x7d, 0x9f, 0xc1, 0x42, 0x1c, 0xfe, 0xa0, 0xe1, 0xbf, 0x5d, 0x03, 0x80, 0xde, 0x3c, 0x62, 0xbe, 0xe0, 0x02, 0x5c, 0xdf, 0x81, 0x63, 0x3d, 0x7c, 0x22, 0xc0, 0x9e, 0x1d, 0x43, 0xa1, 0xff, 0x46, 0x18, 0xfa, 0xa4, 0x27, 0x79, 0x9b, 0xc5, 0x84, 0xda, 0x38, 0x66, 0xe5, 0xbb, 0x59, 0x07, 0xdb, 0x85, 0x67, 0x39, 0xba, 0xe4, 0x06, 0x58, 0x19, 0x47, 0xa5, 0xfb, 0x78, 0x26, 0xc4, 0x9a, 0x65, 0x3b, 0xd9, 0x87, 0x04, 0x5a, 0xb8, 0xe6, 0xa7, 0xf9, 0x1b, 0x45, 0xc6, 0x98, 0x7a, 0x24, 0xf8, 0xa6, 0x44, 0x1a, 0x99, 0xc7, 0x25, 0x7b, 0x3a, 0x64, 0x86, 0xd8, 0x5b, 0x05, 0xe7, 0xb9, 0x8c, 0xd2, 0x30, 0x6e, 0xed, 0xb3, 0x51, 0x0f, 0x4e, 0x10, 0xf2, 0xac, 0x2f, 0x71, 0x93, 0xcd, 0x11, 0x4f, 0xad, 0xf3, 0x70, 0x2e, 0xcc, 0x92, 0xd3, 0x8d, 0x6f, 0x31, 0xb2, 0xec, 0x0e, 0x50, 0xaf, 0xf1, 0x13, 0x4d, 0xce, 0x90, 0x72, 0x2c, 0x6d, 0x33, 0xd1, 0x8f, 0x0c, 0x52, 0xb0, 0xee, 0x32, 0x6c, 0x8e, 0xd0, 0x53, 0x0d, 0xef, 0xb1, 0xf0, 0xae, 0x4c, 0x12, 0x91, 0xcf, 0x2d, 0x73, 0xca, 0x94, 0x76, 0x28, 0xab, 0xf5, 0x17, 0x49, 0x08, 0x56, 0xb4, 0xea, 0x69, 0x37, 0xd5, 0x8b, 0x57, 0x09, 0xeb, 0xb5, 0x36, 0x68, 0x8a, 0xd4, 0x95, 0xcb, 0x29, 0x77, 0xf4, 0xaa, 0x48, 0x16, 0xe9, 0xb7, 0x55, 0x0b, 0x88, 0xd6, 0x34, 0x6a, 0x2b, 0x75, 0x97, 0xc9, 0x4a, 0x14, 0xf6, 0xa8, 0x74, 0x2a, 0xc8, 0x96, 0x15, 0x4b, 0xa9, 0xf7, 0xb6, 0xe8, 0x0a, 0x54, 0xd7, 0x89, 0x6b, 0x35];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crc81wire = (0, _define_crc2.default)('dallas-1-wire', function (buf, previous) {
  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = ~~previous;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = TABLE[(crc ^ byte) & 0xff] & 0xff;
  }

  return crc;
});

exports.default = crc81wire;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],27:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var _create_buffer = require('./create_buffer');

var _create_buffer2 = _interopRequireDefault(_create_buffer);

var _define_crc = require('./define_crc');

var _define_crc2 = _interopRequireDefault(_define_crc);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Generated by `./pycrc.py --algorithm=table-driven --model=jam --generate=c`
// prettier-ignore
var TABLE = [0x00000000, 0x77073096, 0xee0e612c, 0x990951ba, 0x076dc419, 0x706af48f, 0xe963a535, 0x9e6495a3, 0x0edb8832, 0x79dcb8a4, 0xe0d5e91e, 0x97d2d988, 0x09b64c2b, 0x7eb17cbd, 0xe7b82d07, 0x90bf1d91, 0x1db71064, 0x6ab020f2, 0xf3b97148, 0x84be41de, 0x1adad47d, 0x6ddde4eb, 0xf4d4b551, 0x83d385c7, 0x136c9856, 0x646ba8c0, 0xfd62f97a, 0x8a65c9ec, 0x14015c4f, 0x63066cd9, 0xfa0f3d63, 0x8d080df5, 0x3b6e20c8, 0x4c69105e, 0xd56041e4, 0xa2677172, 0x3c03e4d1, 0x4b04d447, 0xd20d85fd, 0xa50ab56b, 0x35b5a8fa, 0x42b2986c, 0xdbbbc9d6, 0xacbcf940, 0x32d86ce3, 0x45df5c75, 0xdcd60dcf, 0xabd13d59, 0x26d930ac, 0x51de003a, 0xc8d75180, 0xbfd06116, 0x21b4f4b5, 0x56b3c423, 0xcfba9599, 0xb8bda50f, 0x2802b89e, 0x5f058808, 0xc60cd9b2, 0xb10be924, 0x2f6f7c87, 0x58684c11, 0xc1611dab, 0xb6662d3d, 0x76dc4190, 0x01db7106, 0x98d220bc, 0xefd5102a, 0x71b18589, 0x06b6b51f, 0x9fbfe4a5, 0xe8b8d433, 0x7807c9a2, 0x0f00f934, 0x9609a88e, 0xe10e9818, 0x7f6a0dbb, 0x086d3d2d, 0x91646c97, 0xe6635c01, 0x6b6b51f4, 0x1c6c6162, 0x856530d8, 0xf262004e, 0x6c0695ed, 0x1b01a57b, 0x8208f4c1, 0xf50fc457, 0x65b0d9c6, 0x12b7e950, 0x8bbeb8ea, 0xfcb9887c, 0x62dd1ddf, 0x15da2d49, 0x8cd37cf3, 0xfbd44c65, 0x4db26158, 0x3ab551ce, 0xa3bc0074, 0xd4bb30e2, 0x4adfa541, 0x3dd895d7, 0xa4d1c46d, 0xd3d6f4fb, 0x4369e96a, 0x346ed9fc, 0xad678846, 0xda60b8d0, 0x44042d73, 0x33031de5, 0xaa0a4c5f, 0xdd0d7cc9, 0x5005713c, 0x270241aa, 0xbe0b1010, 0xc90c2086, 0x5768b525, 0x206f85b3, 0xb966d409, 0xce61e49f, 0x5edef90e, 0x29d9c998, 0xb0d09822, 0xc7d7a8b4, 0x59b33d17, 0x2eb40d81, 0xb7bd5c3b, 0xc0ba6cad, 0xedb88320, 0x9abfb3b6, 0x03b6e20c, 0x74b1d29a, 0xead54739, 0x9dd277af, 0x04db2615, 0x73dc1683, 0xe3630b12, 0x94643b84, 0x0d6d6a3e, 0x7a6a5aa8, 0xe40ecf0b, 0x9309ff9d, 0x0a00ae27, 0x7d079eb1, 0xf00f9344, 0x8708a3d2, 0x1e01f268, 0x6906c2fe, 0xf762575d, 0x806567cb, 0x196c3671, 0x6e6b06e7, 0xfed41b76, 0x89d32be0, 0x10da7a5a, 0x67dd4acc, 0xf9b9df6f, 0x8ebeeff9, 0x17b7be43, 0x60b08ed5, 0xd6d6a3e8, 0xa1d1937e, 0x38d8c2c4, 0x4fdff252, 0xd1bb67f1, 0xa6bc5767, 0x3fb506dd, 0x48b2364b, 0xd80d2bda, 0xaf0a1b4c, 0x36034af6, 0x41047a60, 0xdf60efc3, 0xa867df55, 0x316e8eef, 0x4669be79, 0xcb61b38c, 0xbc66831a, 0x256fd2a0, 0x5268e236, 0xcc0c7795, 0xbb0b4703, 0x220216b9, 0x5505262f, 0xc5ba3bbe, 0xb2bd0b28, 0x2bb45a92, 0x5cb36a04, 0xc2d7ffa7, 0xb5d0cf31, 0x2cd99e8b, 0x5bdeae1d, 0x9b64c2b0, 0xec63f226, 0x756aa39c, 0x026d930a, 0x9c0906a9, 0xeb0e363f, 0x72076785, 0x05005713, 0x95bf4a82, 0xe2b87a14, 0x7bb12bae, 0x0cb61b38, 0x92d28e9b, 0xe5d5be0d, 0x7cdcefb7, 0x0bdbdf21, 0x86d3d2d4, 0xf1d4e242, 0x68ddb3f8, 0x1fda836e, 0x81be16cd, 0xf6b9265b, 0x6fb077e1, 0x18b74777, 0x88085ae6, 0xff0f6a70, 0x66063bca, 0x11010b5c, 0x8f659eff, 0xf862ae69, 0x616bffd3, 0x166ccf45, 0xa00ae278, 0xd70dd2ee, 0x4e048354, 0x3903b3c2, 0xa7672661, 0xd06016f7, 0x4969474d, 0x3e6e77db, 0xaed16a4a, 0xd9d65adc, 0x40df0b66, 0x37d83bf0, 0xa9bcae53, 0xdebb9ec5, 0x47b2cf7f, 0x30b5ffe9, 0xbdbdf21c, 0xcabac28a, 0x53b39330, 0x24b4a3a6, 0xbad03605, 0xcdd70693, 0x54de5729, 0x23d967bf, 0xb3667a2e, 0xc4614ab8, 0x5d681b02, 0x2a6f2b94, 0xb40bbe37, 0xc30c8ea1, 0x5a05df1b, 0x2d02ef8d];

if (typeof Int32Array !== 'undefined') TABLE = new Int32Array(TABLE);

var crcjam = (0, _define_crc2.default)('jam', function (buf) {
  var previous = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : -1;

  if (!_buffer.Buffer.isBuffer(buf)) buf = (0, _create_buffer2.default)(buf);

  var crc = previous === 0 ? 0 : ~~previous;

  for (var index = 0; index < buf.length; index++) {
    var byte = buf[index];
    crc = TABLE[(crc ^ byte) & 0xff] ^ crc >>> 8;
  }

  return crc;
});

exports.default = crcjam;

},{"./create_buffer":28,"./define_crc":29,"buffer":4}],28:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _buffer = require('buffer');

var createBuffer = _buffer.Buffer.from && _buffer.Buffer.alloc && _buffer.Buffer.allocUnsafe && _buffer.Buffer.allocUnsafeSlow ? _buffer.Buffer.from : // support for Node < 5.10
function (val) {
  return new _buffer.Buffer(val);
};

exports.default = createBuffer;

},{"buffer":4}],29:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (model, calc) {
  var fn = function fn(buf, previous) {
    return calc(buf, previous) >>> 0;
  };
  fn.signed = calc;
  fn.unsigned = fn;
  fn.model = model;

  return fn;
};

},{}],30:[function(require,module,exports){
'use strict';

module.exports = {
  crc1: require('./crc1'),
  crc8: require('./crc8'),
  crc81wire: require('./crc8_1wire'),
  crc16: require('./crc16'),
  crc16ccitt: require('./crc16_ccitt'),
  crc16modbus: require('./crc16_modbus'),
  crc16xmodem: require('./crc16_xmodem'),
  crc16kermit: require('./crc16_kermit'),
  crc24: require('./crc24'),
  crc32: require('./crc32'),
  crcjam: require('./crcjam')
};

},{"./crc1":6,"./crc16":7,"./crc16_ccitt":8,"./crc16_kermit":9,"./crc16_modbus":10,"./crc16_xmodem":11,"./crc24":12,"./crc32":13,"./crc8":14,"./crc8_1wire":15,"./crcjam":16}],31:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],32:[function(require,module,exports){
(function (process,global){(function (){
/*
 * [js-sha512]{@link https://github.com/emn178/js-sha512}
 *
 * @version 0.8.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2018
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var INPUT_ERROR = 'input is invalid type';
  var FINALIZE_ERROR = 'finalize already called';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA512_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA512_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA512_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_SHA512_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var K = [
    0x428A2F98, 0xD728AE22, 0x71374491, 0x23EF65CD,
    0xB5C0FBCF, 0xEC4D3B2F, 0xE9B5DBA5, 0x8189DBBC,
    0x3956C25B, 0xF348B538, 0x59F111F1, 0xB605D019,
    0x923F82A4, 0xAF194F9B, 0xAB1C5ED5, 0xDA6D8118,
    0xD807AA98, 0xA3030242, 0x12835B01, 0x45706FBE,
    0x243185BE, 0x4EE4B28C, 0x550C7DC3, 0xD5FFB4E2,
    0x72BE5D74, 0xF27B896F, 0x80DEB1FE, 0x3B1696B1,
    0x9BDC06A7, 0x25C71235, 0xC19BF174, 0xCF692694,
    0xE49B69C1, 0x9EF14AD2, 0xEFBE4786, 0x384F25E3,
    0x0FC19DC6, 0x8B8CD5B5, 0x240CA1CC, 0x77AC9C65,
    0x2DE92C6F, 0x592B0275, 0x4A7484AA, 0x6EA6E483,
    0x5CB0A9DC, 0xBD41FBD4, 0x76F988DA, 0x831153B5,
    0x983E5152, 0xEE66DFAB, 0xA831C66D, 0x2DB43210,
    0xB00327C8, 0x98FB213F, 0xBF597FC7, 0xBEEF0EE4,
    0xC6E00BF3, 0x3DA88FC2, 0xD5A79147, 0x930AA725,
    0x06CA6351, 0xE003826F, 0x14292967, 0x0A0E6E70,
    0x27B70A85, 0x46D22FFC, 0x2E1B2138, 0x5C26C926,
    0x4D2C6DFC, 0x5AC42AED, 0x53380D13, 0x9D95B3DF,
    0x650A7354, 0x8BAF63DE, 0x766A0ABB, 0x3C77B2A8,
    0x81C2C92E, 0x47EDAEE6, 0x92722C85, 0x1482353B,
    0xA2BFE8A1, 0x4CF10364, 0xA81A664B, 0xBC423001,
    0xC24B8B70, 0xD0F89791, 0xC76C51A3, 0x0654BE30,
    0xD192E819, 0xD6EF5218, 0xD6990624, 0x5565A910,
    0xF40E3585, 0x5771202A, 0x106AA070, 0x32BBD1B8,
    0x19A4C116, 0xB8D2D0C8, 0x1E376C08, 0x5141AB53,
    0x2748774C, 0xDF8EEB99, 0x34B0BCB5, 0xE19B48A8,
    0x391C0CB3, 0xC5C95A63, 0x4ED8AA4A, 0xE3418ACB,
    0x5B9CCA4F, 0x7763E373, 0x682E6FF3, 0xD6B2B8A3,
    0x748F82EE, 0x5DEFB2FC, 0x78A5636F, 0x43172F60,
    0x84C87814, 0xA1F0AB72, 0x8CC70208, 0x1A6439EC,
    0x90BEFFFA, 0x23631E28, 0xA4506CEB, 0xDE82BDE9,
    0xBEF9A3F7, 0xB2C67915, 0xC67178F2, 0xE372532B,
    0xCA273ECE, 0xEA26619C, 0xD186B8C7, 0x21C0C207,
    0xEADA7DD6, 0xCDE0EB1E, 0xF57D4F7F, 0xEE6ED178,
    0x06F067AA, 0x72176FBA, 0x0A637DC5, 0xA2C898A6,
    0x113F9804, 0xBEF90DAE, 0x1B710B35, 0x131C471B,
    0x28DB77F5, 0x23047D84, 0x32CAAB7B, 0x40C72493,
    0x3C9EBE0A, 0x15C9BEBC, 0x431D67C4, 0x9C100D4C,
    0x4CC5D4BE, 0xCB3E42B6, 0x597F299C, 0xFC657E2A,
    0x5FCB6FAB, 0x3AD6FAEC, 0x6C44198C, 0x4A475817
  ];

  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

  var blocks = [];

  if (root.JS_SHA512_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA512_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (outputType, bits) {
    return function (message) {
      return new Sha512(bits, true).update(message)[outputType]();
    };
  };

  var createMethod = function (bits) {
    var method = createOutputMethod('hex', bits);
    method.create = function () {
      return new Sha512(bits);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type, bits);
    }
    return method;
  };

  var createHmacOutputMethod = function (outputType, bits) {
    return function (key, message) {
      return new HmacSha512(key, bits, true).update(message)[outputType]();
    };
  };

  var createHmacMethod = function (bits) {
    var method = createHmacOutputMethod('hex', bits);
    method.create = function (key) {
      return new HmacSha512(key, bits);
    };
    method.update = function (key, message) {
      return method.create(key).update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createHmacOutputMethod(type, bits);
    }
    return method;
  };

  function Sha512(bits, sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[1] = blocks[2] = blocks[3] = blocks[4] =
      blocks[5] = blocks[6] = blocks[7] = blocks[8] =
      blocks[9] = blocks[10] = blocks[11] = blocks[12] =
      blocks[13] = blocks[14] = blocks[15] = blocks[16] =
      blocks[17] = blocks[18] = blocks[19] = blocks[20] =
      blocks[21] = blocks[22] = blocks[23] = blocks[24] =
      blocks[25] = blocks[26] = blocks[27] = blocks[28] =
      blocks[29] = blocks[30] = blocks[31] = blocks[32] = 0;
      this.blocks = blocks;
    } else {
      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    if (bits == 384) {
      this.h0h = 0xCBBB9D5D;
      this.h0l = 0xC1059ED8;
      this.h1h = 0x629A292A;
      this.h1l = 0x367CD507;
      this.h2h = 0x9159015A;
      this.h2l = 0x3070DD17;
      this.h3h = 0x152FECD8;
      this.h3l = 0xF70E5939;
      this.h4h = 0x67332667;
      this.h4l = 0xFFC00B31;
      this.h5h = 0x8EB44A87;
      this.h5l = 0x68581511;
      this.h6h = 0xDB0C2E0D;
      this.h6l = 0x64F98FA7;
      this.h7h = 0x47B5481D;
      this.h7l = 0xBEFA4FA4;
    } else if (bits == 256) {
      this.h0h = 0x22312194;
      this.h0l = 0xFC2BF72C;
      this.h1h = 0x9F555FA3;
      this.h1l = 0xC84C64C2;
      this.h2h = 0x2393B86B;
      this.h2l = 0x6F53B151;
      this.h3h = 0x96387719;
      this.h3l = 0x5940EABD;
      this.h4h = 0x96283EE2;
      this.h4l = 0xA88EFFE3;
      this.h5h = 0xBE5E1E25;
      this.h5l = 0x53863992;
      this.h6h = 0x2B0199FC;
      this.h6l = 0x2C85B8AA;
      this.h7h = 0x0EB72DDC;
      this.h7l = 0x81C52CA2;
    } else if (bits == 224) {
      this.h0h = 0x8C3D37C8;
      this.h0l = 0x19544DA2;
      this.h1h = 0x73E19966;
      this.h1l = 0x89DCD4D6;
      this.h2h = 0x1DFAB7AE;
      this.h2l = 0x32FF9C82;
      this.h3h = 0x679DD514;
      this.h3l = 0x582F9FCF;
      this.h4h = 0x0F6D2B69;
      this.h4l = 0x7BD44DA8;
      this.h5h = 0x77E36F73;
      this.h5l = 0x04C48942;
      this.h6h = 0x3F9D85A8;
      this.h6l = 0x6A1D36C8;
      this.h7h = 0x1112E6AD;
      this.h7l = 0x91D692A1;
    } else { // 512
      this.h0h = 0x6A09E667;
      this.h0l = 0xF3BCC908;
      this.h1h = 0xBB67AE85;
      this.h1l = 0x84CAA73B;
      this.h2h = 0x3C6EF372;
      this.h2l = 0xFE94F82B;
      this.h3h = 0xA54FF53A;
      this.h3l = 0x5F1D36F1;
      this.h4h = 0x510E527F;
      this.h4l = 0xADE682D1;
      this.h5h = 0x9B05688C;
      this.h5l = 0x2B3E6C1F;
      this.h6h = 0x1F83D9AB;
      this.h6l = 0xFB41BD6B;
      this.h7h = 0x5BE0CD19;
      this.h7l = 0x137E2179;
    }
    this.bits = bits;

    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
  }

  Sha512.prototype.update = function (message) {
    if (this.finalized) {
      throw new Error(FINALIZE_ERROR);
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var code, index = 0, i, length = message.length, blocks = this.blocks;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[1] = blocks[2] = blocks[3] = blocks[4] =
        blocks[5] = blocks[6] = blocks[7] = blocks[8] =
        blocks[9] = blocks[10] = blocks[11] = blocks[12] =
        blocks[13] = blocks[14] = blocks[15] = blocks[16] =
        blocks[17] = blocks[18] = blocks[19] = blocks[20] =
        blocks[21] = blocks[22] = blocks[23] = blocks[24] =
        blocks[25] = blocks[26] = blocks[27] = blocks[28] =
        blocks[29] = blocks[30] = blocks[31] = blocks[32] = 0;
      }

      if(notString) {
        for (i = this.start; index < length && i < 128; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < 128; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }

      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 128) {
        this.block = blocks[32];
        this.start = i - 128;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };

  Sha512.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[32] = this.block;
    blocks[i >> 2] |= EXTRA[i & 3];
    this.block = blocks[32];
    if (i >= 112) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = this.block;
      blocks[1] = blocks[2] = blocks[3] = blocks[4] =
      blocks[5] = blocks[6] = blocks[7] = blocks[8] =
      blocks[9] = blocks[10] = blocks[11] = blocks[12] =
      blocks[13] = blocks[14] = blocks[15] = blocks[16] =
      blocks[17] = blocks[18] = blocks[19] = blocks[20] =
      blocks[21] = blocks[22] = blocks[23] = blocks[24] =
      blocks[25] = blocks[26] = blocks[27] = blocks[28] =
      blocks[29] = blocks[30] = blocks[31] = blocks[32] = 0;
    }
    blocks[30] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[31] = this.bytes << 3;
    this.hash();
  };

  Sha512.prototype.hash = function () {
    var h0h = this.h0h, h0l = this.h0l, h1h = this.h1h, h1l = this.h1l,
      h2h = this.h2h, h2l = this.h2l, h3h = this.h3h, h3l = this.h3l,
      h4h = this.h4h, h4l = this.h4l, h5h = this.h5h, h5l = this.h5l,
      h6h = this.h6h, h6l = this.h6l, h7h = this.h7h, h7l = this.h7l,
      blocks = this.blocks, j, s0h, s0l, s1h, s1l, c1, c2, c3, c4,
      abh, abl, dah, dal, cdh, cdl, bch, bcl,
      majh, majl, t1h, t1l, t2h, t2l, chh, chl;

    for (j = 32; j < 160; j += 2) {
      t1h = blocks[j - 30];
      t1l = blocks[j - 29];
      s0h = ((t1h >>> 1) | (t1l << 31)) ^ ((t1h >>> 8) | (t1l << 24)) ^ (t1h >>> 7);
      s0l = ((t1l >>> 1) | (t1h << 31)) ^ ((t1l >>> 8) | (t1h << 24)) ^ ((t1l >>> 7) | t1h << 25);

      t1h = blocks[j - 4];
      t1l = blocks[j - 3];
      s1h = ((t1h >>> 19) | (t1l << 13)) ^ ((t1l >>> 29) | (t1h << 3)) ^ (t1h >>> 6);
      s1l = ((t1l >>> 19) | (t1h << 13)) ^ ((t1h >>> 29) | (t1l << 3)) ^ ((t1l >>> 6) | t1h << 26);

      t1h = blocks[j - 32];
      t1l = blocks[j - 31];
      t2h = blocks[j - 14];
      t2l = blocks[j - 13];

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF) + (s0l & 0xFFFF) + (s1l & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (s0l >>> 16) + (s1l >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (s0h & 0xFFFF) + (s1h & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (s0h >>> 16) + (s1h >>> 16) + (c3 >>> 16);

      blocks[j] = (c4 << 16) | (c3 & 0xFFFF);
      blocks[j + 1] = (c2 << 16) | (c1 & 0xFFFF);
    }

    var ah = h0h, al = h0l, bh = h1h, bl = h1l, ch = h2h, cl = h2l, dh = h3h, dl = h3l, eh = h4h, el = h4l, fh = h5h, fl = h5l, gh = h6h, gl = h6l, hh = h7h, hl = h7l;
    bch = bh & ch;
    bcl = bl & cl;
    for (j = 0; j < 160; j += 8) {
      s0h = ((ah >>> 28) | (al << 4)) ^ ((al >>> 2) | (ah << 30)) ^ ((al >>> 7) | (ah << 25));
      s0l = ((al >>> 28) | (ah << 4)) ^ ((ah >>> 2) | (al << 30)) ^ ((ah >>> 7) | (al << 25));

      s1h = ((eh >>> 14) | (el << 18)) ^ ((eh >>> 18) | (el << 14)) ^ ((el >>> 9) | (eh << 23));
      s1l = ((el >>> 14) | (eh << 18)) ^ ((el >>> 18) | (eh << 14)) ^ ((eh >>> 9) | (el << 23));

      abh = ah & bh;
      abl = al & bl;
      majh = abh ^ (ah & ch) ^ bch;
      majl = abl ^ (al & cl) ^ bcl;

      chh = (eh & fh) ^ (~eh & gh);
      chl = (el & fl) ^ (~el & gl);

      t1h = blocks[j];
      t1l = blocks[j + 1];
      t2h = K[j];
      t2l = K[j + 1];

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF) + (chl & 0xFFFF) + (s1l & 0xFFFF) + (hl & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (hl >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (chh & 0xFFFF) + (s1h & 0xFFFF) + (hh & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (hh >>> 16) + (c3 >>> 16);

      t1h = (c4 << 16) | (c3 & 0xFFFF);
      t1l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (majl & 0xFFFF) + (s0l & 0xFFFF);
      c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
      c3 = (majh & 0xFFFF) + (s0h & 0xFFFF) + (c2 >>> 16);
      c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);

      t2h = (c4 << 16) | (c3 & 0xFFFF);
      t2l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (dl & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (dl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (dh & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (dh >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      hh = (c4 << 16) | (c3 & 0xFFFF);
      hl = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      dh = (c4 << 16) | (c3 & 0xFFFF);
      dl = (c2 << 16) | (c1 & 0xFFFF);

      s0h = ((dh >>> 28) | (dl << 4)) ^ ((dl >>> 2) | (dh << 30)) ^ ((dl >>> 7) | (dh << 25));
      s0l = ((dl >>> 28) | (dh << 4)) ^ ((dh >>> 2) | (dl << 30)) ^ ((dh >>> 7) | (dl << 25));

      s1h = ((hh >>> 14) | (hl << 18)) ^ ((hh >>> 18) | (hl << 14)) ^ ((hl >>> 9) | (hh << 23));
      s1l = ((hl >>> 14) | (hh << 18)) ^ ((hl >>> 18) | (hh << 14)) ^ ((hh >>> 9) | (hl << 23));

      dah = dh & ah;
      dal = dl & al;
      majh = dah ^ (dh & bh) ^ abh;
      majl = dal ^ (dl & bl) ^ abl;

      chh = (hh & eh) ^ (~hh & fh);
      chl = (hl & el) ^ (~hl & fl);

      t1h = blocks[j + 2];
      t1l = blocks[j + 3];
      t2h = K[j + 2];
      t2l = K[j + 3];

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF) + (chl & 0xFFFF) + (s1l & 0xFFFF) + (gl & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (gl >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (chh & 0xFFFF) + (s1h & 0xFFFF) + (gh & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (gh >>> 16) + (c3 >>> 16);

      t1h = (c4 << 16) | (c3 & 0xFFFF);
      t1l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (majl & 0xFFFF) + (s0l & 0xFFFF);
      c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
      c3 = (majh & 0xFFFF) + (s0h & 0xFFFF) + (c2 >>> 16);
      c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);

      t2h = (c4 << 16) | (c3 & 0xFFFF);
      t2l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (cl & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (cl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (ch & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (ch >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      gh = (c4 << 16) | (c3 & 0xFFFF);
      gl = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      ch = (c4 << 16) | (c3 & 0xFFFF);
      cl = (c2 << 16) | (c1 & 0xFFFF);

      s0h = ((ch >>> 28) | (cl << 4)) ^ ((cl >>> 2) | (ch << 30)) ^ ((cl >>> 7) | (ch << 25));
      s0l = ((cl >>> 28) | (ch << 4)) ^ ((ch >>> 2) | (cl << 30)) ^ ((ch >>> 7) | (cl << 25));

      s1h = ((gh >>> 14) | (gl << 18)) ^ ((gh >>> 18) | (gl << 14)) ^ ((gl >>> 9) | (gh << 23));
      s1l = ((gl >>> 14) | (gh << 18)) ^ ((gl >>> 18) | (gh << 14)) ^ ((gh >>> 9) | (gl << 23));

      cdh = ch & dh;
      cdl = cl & dl;
      majh = cdh ^ (ch & ah) ^ dah;
      majl = cdl ^ (cl & al) ^ dal;

      chh = (gh & hh) ^ (~gh & eh);
      chl = (gl & hl) ^ (~gl & el);

      t1h = blocks[j + 4];
      t1l = blocks[j + 5];
      t2h = K[j + 4];
      t2l = K[j + 5];

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF) + (chl & 0xFFFF) + (s1l & 0xFFFF) + (fl & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (fl >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (chh & 0xFFFF) + (s1h & 0xFFFF) + (fh & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (fh >>> 16) + (c3 >>> 16);

      t1h = (c4 << 16) | (c3 & 0xFFFF);
      t1l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (majl & 0xFFFF) + (s0l & 0xFFFF);
      c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
      c3 = (majh & 0xFFFF) + (s0h & 0xFFFF) + (c2 >>> 16);
      c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);

      t2h = (c4 << 16) | (c3 & 0xFFFF);
      t2l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (bl & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (bl >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (bh & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (bh >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      fh = (c4 << 16) | (c3 & 0xFFFF);
      fl = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      bh = (c4 << 16) | (c3 & 0xFFFF);
      bl = (c2 << 16) | (c1 & 0xFFFF);

      s0h = ((bh >>> 28) | (bl << 4)) ^ ((bl >>> 2) | (bh << 30)) ^ ((bl >>> 7) | (bh << 25));
      s0l = ((bl >>> 28) | (bh << 4)) ^ ((bh >>> 2) | (bl << 30)) ^ ((bh >>> 7) | (bl << 25));

      s1h = ((fh >>> 14) | (fl << 18)) ^ ((fh >>> 18) | (fl << 14)) ^ ((fl >>> 9) | (fh << 23));
      s1l = ((fl >>> 14) | (fh << 18)) ^ ((fl >>> 18) | (fh << 14)) ^ ((fh >>> 9) | (fl << 23));

      bch = bh & ch;
      bcl = bl & cl;
      majh = bch ^ (bh & dh) ^ cdh;
      majl = bcl ^ (bl & dl) ^ cdl;

      chh = (fh & gh) ^ (~fh & hh);
      chl = (fl & gl) ^ (~fl & hl);

      t1h = blocks[j + 6];
      t1l = blocks[j + 7];
      t2h = K[j + 6];
      t2l = K[j + 7];

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF) + (chl & 0xFFFF) + (s1l & 0xFFFF) + (el & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (chl >>> 16) + (s1l >>> 16) + (el >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (chh & 0xFFFF) + (s1h & 0xFFFF) + (eh & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (chh >>> 16) + (s1h >>> 16) + (eh >>> 16) + (c3 >>> 16);

      t1h = (c4 << 16) | (c3 & 0xFFFF);
      t1l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (majl & 0xFFFF) + (s0l & 0xFFFF);
      c2 = (majl >>> 16) + (s0l >>> 16) + (c1 >>> 16);
      c3 = (majh & 0xFFFF) + (s0h & 0xFFFF) + (c2 >>> 16);
      c4 = (majh >>> 16) + (s0h >>> 16) + (c3 >>> 16);

      t2h = (c4 << 16) | (c3 & 0xFFFF);
      t2l = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (al & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (al >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (ah & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (ah >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      eh = (c4 << 16) | (c3 & 0xFFFF);
      el = (c2 << 16) | (c1 & 0xFFFF);

      c1 = (t2l & 0xFFFF) + (t1l & 0xFFFF);
      c2 = (t2l >>> 16) + (t1l >>> 16) + (c1 >>> 16);
      c3 = (t2h & 0xFFFF) + (t1h & 0xFFFF) + (c2 >>> 16);
      c4 = (t2h >>> 16) + (t1h >>> 16) + (c3 >>> 16);

      ah = (c4 << 16) | (c3 & 0xFFFF);
      al = (c2 << 16) | (c1 & 0xFFFF);
    }

    c1 = (h0l & 0xFFFF) + (al & 0xFFFF);
    c2 = (h0l >>> 16) + (al >>> 16) + (c1 >>> 16);
    c3 = (h0h & 0xFFFF) + (ah & 0xFFFF) + (c2 >>> 16);
    c4 = (h0h >>> 16) + (ah >>> 16) + (c3 >>> 16);

    this.h0h = (c4 << 16) | (c3 & 0xFFFF);
    this.h0l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h1l & 0xFFFF) + (bl & 0xFFFF);
    c2 = (h1l >>> 16) + (bl >>> 16) + (c1 >>> 16);
    c3 = (h1h & 0xFFFF) + (bh & 0xFFFF) + (c2 >>> 16);
    c4 = (h1h >>> 16) + (bh >>> 16) + (c3 >>> 16);

    this.h1h = (c4 << 16) | (c3 & 0xFFFF);
    this.h1l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h2l & 0xFFFF) + (cl & 0xFFFF);
    c2 = (h2l >>> 16) + (cl >>> 16) + (c1 >>> 16);
    c3 = (h2h & 0xFFFF) + (ch & 0xFFFF) + (c2 >>> 16);
    c4 = (h2h >>> 16) + (ch >>> 16) + (c3 >>> 16);

    this.h2h = (c4 << 16) | (c3 & 0xFFFF);
    this.h2l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h3l & 0xFFFF) + (dl & 0xFFFF);
    c2 = (h3l >>> 16) + (dl >>> 16) + (c1 >>> 16);
    c3 = (h3h & 0xFFFF) + (dh & 0xFFFF) + (c2 >>> 16);
    c4 = (h3h >>> 16) + (dh >>> 16) + (c3 >>> 16);

    this.h3h = (c4 << 16) | (c3 & 0xFFFF);
    this.h3l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h4l & 0xFFFF) + (el & 0xFFFF);
    c2 = (h4l >>> 16) + (el >>> 16) + (c1 >>> 16);
    c3 = (h4h & 0xFFFF) + (eh & 0xFFFF) + (c2 >>> 16);
    c4 = (h4h >>> 16) + (eh >>> 16) + (c3 >>> 16);

    this.h4h = (c4 << 16) | (c3 & 0xFFFF);
    this.h4l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h5l & 0xFFFF) + (fl & 0xFFFF);
    c2 = (h5l >>> 16) + (fl >>> 16) + (c1 >>> 16);
    c3 = (h5h & 0xFFFF) + (fh & 0xFFFF) + (c2 >>> 16);
    c4 = (h5h >>> 16) + (fh >>> 16) + (c3 >>> 16);

    this.h5h = (c4 << 16) | (c3 & 0xFFFF);
    this.h5l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h6l & 0xFFFF) + (gl & 0xFFFF);
    c2 = (h6l >>> 16) + (gl >>> 16) + (c1 >>> 16);
    c3 = (h6h & 0xFFFF) + (gh & 0xFFFF) + (c2 >>> 16);
    c4 = (h6h >>> 16) + (gh >>> 16) + (c3 >>> 16);

    this.h6h = (c4 << 16) | (c3 & 0xFFFF);
    this.h6l = (c2 << 16) | (c1 & 0xFFFF);

    c1 = (h7l & 0xFFFF) + (hl & 0xFFFF);
    c2 = (h7l >>> 16) + (hl >>> 16) + (c1 >>> 16);
    c3 = (h7h & 0xFFFF) + (hh & 0xFFFF) + (c2 >>> 16);
    c4 = (h7h >>> 16) + (hh >>> 16) + (c3 >>> 16);

    this.h7h = (c4 << 16) | (c3 & 0xFFFF);
    this.h7l = (c2 << 16) | (c1 & 0xFFFF);
  };

  Sha512.prototype.hex = function () {
    this.finalize();

    var h0h = this.h0h, h0l = this.h0l, h1h = this.h1h, h1l = this.h1l,
      h2h = this.h2h, h2l = this.h2l, h3h = this.h3h, h3l = this.h3l,
      h4h = this.h4h, h4l = this.h4l, h5h = this.h5h, h5l = this.h5l,
      h6h = this.h6h, h6l = this.h6l, h7h = this.h7h, h7l = this.h7l,
      bits = this.bits;

    var hex = HEX_CHARS[(h0h >> 28) & 0x0F] + HEX_CHARS[(h0h >> 24) & 0x0F] +
      HEX_CHARS[(h0h >> 20) & 0x0F] + HEX_CHARS[(h0h >> 16) & 0x0F] +
      HEX_CHARS[(h0h >> 12) & 0x0F] + HEX_CHARS[(h0h >> 8) & 0x0F] +
      HEX_CHARS[(h0h >> 4) & 0x0F] + HEX_CHARS[h0h & 0x0F] +
      HEX_CHARS[(h0l >> 28) & 0x0F] + HEX_CHARS[(h0l >> 24) & 0x0F] +
      HEX_CHARS[(h0l >> 20) & 0x0F] + HEX_CHARS[(h0l >> 16) & 0x0F] +
      HEX_CHARS[(h0l >> 12) & 0x0F] + HEX_CHARS[(h0l >> 8) & 0x0F] +
      HEX_CHARS[(h0l >> 4) & 0x0F] + HEX_CHARS[h0l & 0x0F] +
      HEX_CHARS[(h1h >> 28) & 0x0F] + HEX_CHARS[(h1h >> 24) & 0x0F] +
      HEX_CHARS[(h1h >> 20) & 0x0F] + HEX_CHARS[(h1h >> 16) & 0x0F] +
      HEX_CHARS[(h1h >> 12) & 0x0F] + HEX_CHARS[(h1h >> 8) & 0x0F] +
      HEX_CHARS[(h1h >> 4) & 0x0F] + HEX_CHARS[h1h & 0x0F] +
      HEX_CHARS[(h1l >> 28) & 0x0F] + HEX_CHARS[(h1l >> 24) & 0x0F] +
      HEX_CHARS[(h1l >> 20) & 0x0F] + HEX_CHARS[(h1l >> 16) & 0x0F] +
      HEX_CHARS[(h1l >> 12) & 0x0F] + HEX_CHARS[(h1l >> 8) & 0x0F] +
      HEX_CHARS[(h1l >> 4) & 0x0F] + HEX_CHARS[h1l & 0x0F] +
      HEX_CHARS[(h2h >> 28) & 0x0F] + HEX_CHARS[(h2h >> 24) & 0x0F] +
      HEX_CHARS[(h2h >> 20) & 0x0F] + HEX_CHARS[(h2h >> 16) & 0x0F] +
      HEX_CHARS[(h2h >> 12) & 0x0F] + HEX_CHARS[(h2h >> 8) & 0x0F] +
      HEX_CHARS[(h2h >> 4) & 0x0F] + HEX_CHARS[h2h & 0x0F] +
      HEX_CHARS[(h2l >> 28) & 0x0F] + HEX_CHARS[(h2l >> 24) & 0x0F] +
      HEX_CHARS[(h2l >> 20) & 0x0F] + HEX_CHARS[(h2l >> 16) & 0x0F] +
      HEX_CHARS[(h2l >> 12) & 0x0F] + HEX_CHARS[(h2l >> 8) & 0x0F] +
      HEX_CHARS[(h2l >> 4) & 0x0F] + HEX_CHARS[h2l & 0x0F] +
      HEX_CHARS[(h3h >> 28) & 0x0F] + HEX_CHARS[(h3h >> 24) & 0x0F] +
      HEX_CHARS[(h3h >> 20) & 0x0F] + HEX_CHARS[(h3h >> 16) & 0x0F] +
      HEX_CHARS[(h3h >> 12) & 0x0F] + HEX_CHARS[(h3h >> 8) & 0x0F] +
      HEX_CHARS[(h3h >> 4) & 0x0F] + HEX_CHARS[h3h & 0x0F];
    if (bits >= 256) {
      hex += HEX_CHARS[(h3l >> 28) & 0x0F] + HEX_CHARS[(h3l >> 24) & 0x0F] +
        HEX_CHARS[(h3l >> 20) & 0x0F] + HEX_CHARS[(h3l >> 16) & 0x0F] +
        HEX_CHARS[(h3l >> 12) & 0x0F] + HEX_CHARS[(h3l >> 8) & 0x0F] +
        HEX_CHARS[(h3l >> 4) & 0x0F] + HEX_CHARS[h3l & 0x0F];
    }
    if (bits >= 384) {
      hex += HEX_CHARS[(h4h >> 28) & 0x0F] + HEX_CHARS[(h4h >> 24) & 0x0F] +
        HEX_CHARS[(h4h >> 20) & 0x0F] + HEX_CHARS[(h4h >> 16) & 0x0F] +
        HEX_CHARS[(h4h >> 12) & 0x0F] + HEX_CHARS[(h4h >> 8) & 0x0F] +
        HEX_CHARS[(h4h >> 4) & 0x0F] + HEX_CHARS[h4h & 0x0F] +
        HEX_CHARS[(h4l >> 28) & 0x0F] + HEX_CHARS[(h4l >> 24) & 0x0F] +
        HEX_CHARS[(h4l >> 20) & 0x0F] + HEX_CHARS[(h4l >> 16) & 0x0F] +
        HEX_CHARS[(h4l >> 12) & 0x0F] + HEX_CHARS[(h4l >> 8) & 0x0F] +
        HEX_CHARS[(h4l >> 4) & 0x0F] + HEX_CHARS[h4l & 0x0F] +
        HEX_CHARS[(h5h >> 28) & 0x0F] + HEX_CHARS[(h5h >> 24) & 0x0F] +
        HEX_CHARS[(h5h >> 20) & 0x0F] + HEX_CHARS[(h5h >> 16) & 0x0F] +
        HEX_CHARS[(h5h >> 12) & 0x0F] + HEX_CHARS[(h5h >> 8) & 0x0F] +
        HEX_CHARS[(h5h >> 4) & 0x0F] + HEX_CHARS[h5h & 0x0F] +
        HEX_CHARS[(h5l >> 28) & 0x0F] + HEX_CHARS[(h5l >> 24) & 0x0F] +
        HEX_CHARS[(h5l >> 20) & 0x0F] + HEX_CHARS[(h5l >> 16) & 0x0F] +
        HEX_CHARS[(h5l >> 12) & 0x0F] + HEX_CHARS[(h5l >> 8) & 0x0F] +
        HEX_CHARS[(h5l >> 4) & 0x0F] + HEX_CHARS[h5l & 0x0F];
    }
    if (bits == 512) {
      hex += HEX_CHARS[(h6h >> 28) & 0x0F] + HEX_CHARS[(h6h >> 24) & 0x0F] +
        HEX_CHARS[(h6h >> 20) & 0x0F] + HEX_CHARS[(h6h >> 16) & 0x0F] +
        HEX_CHARS[(h6h >> 12) & 0x0F] + HEX_CHARS[(h6h >> 8) & 0x0F] +
        HEX_CHARS[(h6h >> 4) & 0x0F] + HEX_CHARS[h6h & 0x0F] +
        HEX_CHARS[(h6l >> 28) & 0x0F] + HEX_CHARS[(h6l >> 24) & 0x0F] +
        HEX_CHARS[(h6l >> 20) & 0x0F] + HEX_CHARS[(h6l >> 16) & 0x0F] +
        HEX_CHARS[(h6l >> 12) & 0x0F] + HEX_CHARS[(h6l >> 8) & 0x0F] +
        HEX_CHARS[(h6l >> 4) & 0x0F] + HEX_CHARS[h6l & 0x0F] +
        HEX_CHARS[(h7h >> 28) & 0x0F] + HEX_CHARS[(h7h >> 24) & 0x0F] +
        HEX_CHARS[(h7h >> 20) & 0x0F] + HEX_CHARS[(h7h >> 16) & 0x0F] +
        HEX_CHARS[(h7h >> 12) & 0x0F] + HEX_CHARS[(h7h >> 8) & 0x0F] +
        HEX_CHARS[(h7h >> 4) & 0x0F] + HEX_CHARS[h7h & 0x0F] +
        HEX_CHARS[(h7l >> 28) & 0x0F] + HEX_CHARS[(h7l >> 24) & 0x0F] +
        HEX_CHARS[(h7l >> 20) & 0x0F] + HEX_CHARS[(h7l >> 16) & 0x0F] +
        HEX_CHARS[(h7l >> 12) & 0x0F] + HEX_CHARS[(h7l >> 8) & 0x0F] +
        HEX_CHARS[(h7l >> 4) & 0x0F] + HEX_CHARS[h7l & 0x0F];
    }
    return hex;
  };

  Sha512.prototype.toString = Sha512.prototype.hex;

  Sha512.prototype.digest = function () {
    this.finalize();

    var h0h = this.h0h, h0l = this.h0l, h1h = this.h1h, h1l = this.h1l,
      h2h = this.h2h, h2l = this.h2l, h3h = this.h3h, h3l = this.h3l,
      h4h = this.h4h, h4l = this.h4l, h5h = this.h5h, h5l = this.h5l,
      h6h = this.h6h, h6l = this.h6l, h7h = this.h7h, h7l = this.h7l,
      bits = this.bits;

    var arr = [
      (h0h >> 24) & 0xFF, (h0h >> 16) & 0xFF, (h0h >> 8) & 0xFF, h0h & 0xFF,
      (h0l >> 24) & 0xFF, (h0l >> 16) & 0xFF, (h0l >> 8) & 0xFF, h0l & 0xFF,
      (h1h >> 24) & 0xFF, (h1h >> 16) & 0xFF, (h1h >> 8) & 0xFF, h1h & 0xFF,
      (h1l >> 24) & 0xFF, (h1l >> 16) & 0xFF, (h1l >> 8) & 0xFF, h1l & 0xFF,
      (h2h >> 24) & 0xFF, (h2h >> 16) & 0xFF, (h2h >> 8) & 0xFF, h2h & 0xFF,
      (h2l >> 24) & 0xFF, (h2l >> 16) & 0xFF, (h2l >> 8) & 0xFF, h2l & 0xFF,
      (h3h >> 24) & 0xFF, (h3h >> 16) & 0xFF, (h3h >> 8) & 0xFF, h3h & 0xFF
    ];

    if (bits >= 256) {
      arr.push((h3l >> 24) & 0xFF, (h3l >> 16) & 0xFF, (h3l >> 8) & 0xFF, h3l & 0xFF);
    }
    if (bits >= 384) {
      arr.push(
        (h4h >> 24) & 0xFF, (h4h >> 16) & 0xFF, (h4h >> 8) & 0xFF, h4h & 0xFF,
        (h4l >> 24) & 0xFF, (h4l >> 16) & 0xFF, (h4l >> 8) & 0xFF, h4l & 0xFF,
        (h5h >> 24) & 0xFF, (h5h >> 16) & 0xFF, (h5h >> 8) & 0xFF, h5h & 0xFF,
        (h5l >> 24) & 0xFF, (h5l >> 16) & 0xFF, (h5l >> 8) & 0xFF, h5l & 0xFF
      );
    }
    if (bits == 512) {
      arr.push(
        (h6h >> 24) & 0xFF, (h6h >> 16) & 0xFF, (h6h >> 8) & 0xFF, h6h & 0xFF,
        (h6l >> 24) & 0xFF, (h6l >> 16) & 0xFF, (h6l >> 8) & 0xFF, h6l & 0xFF,
        (h7h >> 24) & 0xFF, (h7h >> 16) & 0xFF, (h7h >> 8) & 0xFF, h7h & 0xFF,
        (h7l >> 24) & 0xFF, (h7l >> 16) & 0xFF, (h7l >> 8) & 0xFF, h7l & 0xFF
      );
    }
    return arr;
  };

  Sha512.prototype.array = Sha512.prototype.digest;

  Sha512.prototype.arrayBuffer = function () {
    this.finalize();

    var bits = this.bits;
    var buffer = new ArrayBuffer(bits / 8);
    var dataView = new DataView(buffer);
    dataView.setUint32(0, this.h0h);
    dataView.setUint32(4, this.h0l);
    dataView.setUint32(8, this.h1h);
    dataView.setUint32(12, this.h1l);
    dataView.setUint32(16, this.h2h);
    dataView.setUint32(20, this.h2l);
    dataView.setUint32(24, this.h3h);

    if (bits >= 256) {
      dataView.setUint32(28, this.h3l);
    }
    if (bits >= 384) {
      dataView.setUint32(32, this.h4h);
      dataView.setUint32(36, this.h4l);
      dataView.setUint32(40, this.h5h);
      dataView.setUint32(44, this.h5l);
    }
    if (bits == 512) {
      dataView.setUint32(48, this.h6h);
      dataView.setUint32(52, this.h6l);
      dataView.setUint32(56, this.h7h);
      dataView.setUint32(60, this.h7l);
    }
    return buffer;
  };

  Sha512.prototype.clone = function () {
    var hash = new Sha512(this.bits, false);
    this.copyTo(hash);
    return hash;
  };

  Sha512.prototype.copyTo = function (hash) {
    var i = 0, attrs = [
      'h0h', 'h0l', 'h1h', 'h1l', 'h2h', 'h2l', 'h3h', 'h3l', 'h4h', 'h4l', 'h5h', 'h5l', 'h6h', 'h6l', 'h7h', 'h7l',
      'start', 'bytes', 'hBytes', 'finalized', 'hashed', 'lastByteIndex'
    ];
    for (i = 0; i < attrs.length; ++i) {
      hash[attrs[i]] = this[attrs[i]];
    }
    for (i = 0; i < this.blocks.length; ++i) {
      hash.blocks[i] = this.blocks[i];
    }
  };

  function HmacSha512(key, bits, sharedMemory) {
    var notString, type = typeof key;
    if (type !== 'string') {
      if (type === 'object') {
        if (key === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
          key = new Uint8Array(key);
        } else if (!Array.isArray(key)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var length = key.length;
    if (!notString) {
      var bytes = [], length = key.length, index = 0, code;
      for (var i = 0; i < length; ++i) {
        code = key.charCodeAt(i);
        if (code < 0x80) {
          bytes[index++] = code;
        } else if (code < 0x800) {
          bytes[index++] = (0xc0 | (code >> 6));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes[index++] = (0xe0 | (code >> 12));
          bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (key.charCodeAt(++i) & 0x3ff));
          bytes[index++] = (0xf0 | (code >> 18));
          bytes[index++] = (0x80 | ((code >> 12) & 0x3f));
          bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        }
      }
      key = bytes;
    }

    if (key.length > 128) {
      key = (new Sha512(bits, true)).update(key).array();
    }

    var oKeyPad = [], iKeyPad = [];
    for (var i = 0; i < 128; ++i) {
      var b = key[i] || 0;
      oKeyPad[i] = 0x5c ^ b;
      iKeyPad[i] = 0x36 ^ b;
    }

    Sha512.call(this, bits, sharedMemory);

    this.update(iKeyPad);
    this.oKeyPad = oKeyPad;
    this.inner = true;
    this.sharedMemory = sharedMemory;
  }
  HmacSha512.prototype = new Sha512();

  HmacSha512.prototype.finalize = function () {
    Sha512.prototype.finalize.call(this);
    if (this.inner) {
      this.inner = false;
      var innerHash = this.array();
      Sha512.call(this, this.bits, this.sharedMemory);
      this.update(this.oKeyPad);
      this.update(innerHash);
      Sha512.prototype.finalize.call(this);
    }
  };

  HmacSha512.prototype.clone = function () {
    var hash = new HmacSha512([], this.bits, false);
    this.copyTo(hash);
    hash.inner = this.inner;
    for (var i = 0; i < this.oKeyPad.length; ++i) {
      hash.oKeyPad[i] = this.oKeyPad[i];
    }
    return hash;
  };

  var exports = createMethod(512);
  exports.sha512 = exports;
  exports.sha384 = createMethod(384);
  exports.sha512_256 = createMethod(256);
  exports.sha512_224 = createMethod(224);
  exports.sha512.hmac = createHmacMethod(512);
  exports.sha384.hmac = createHmacMethod(384);
  exports.sha512_256.hmac = createHmacMethod(256);
  exports.sha512_224.hmac = createHmacMethod(224);

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    root.sha512 = exports.sha512;
    root.sha384 = exports.sha384;
    root.sha512_256 = exports.sha512_256;
    root.sha512_224 = exports.sha512_224;
    if (AMD) {
      define(function () {
        return exports;
      });
    }
  }
})();

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":35}],33:[function(require,module,exports){
/*
 A JavaScript implementation of the SHA family of hashes, as
 defined in FIPS PUB 180-4 and FIPS PUB 202, as well as the corresponding
 HMAC implementation as defined in FIPS PUB 198a

 Copyright 2008-2020 Brian Turek, 1998-2009 Paul Johnston & Contributors
 Distributed under the BSD License
 See http://caligatio.github.com/jsSHA/ for more information
*/
'use strict';(function(aa){function C(d,b,a){var h=0,k=[],m=0,g,l,c,f,n,q,u,r,I=!1,v=[],x=[],t,y=!1,z=!1,w=-1;a=a||{};g=a.encoding||"UTF8";t=a.numRounds||1;if(t!==parseInt(t,10)||1>t)throw Error("numRounds must a integer >= 1");if("SHA-1"===d)n=512,q=K,u=ba,f=160,r=function(b){return b.slice()};else if(0===d.lastIndexOf("SHA-",0))if(q=function(b,h){return L(b,h,d)},u=function(b,h,k,a){var e,f;if("SHA-224"===d||"SHA-256"===d)e=(h+65>>>9<<4)+15,f=16;else if("SHA-384"===d||"SHA-512"===d)e=(h+129>>>10<<
5)+31,f=32;else throw Error("Unexpected error in SHA-2 implementation");for(;b.length<=e;)b.push(0);b[h>>>5]|=128<<24-h%32;h=h+k;b[e]=h&4294967295;b[e-1]=h/4294967296|0;k=b.length;for(h=0;h<k;h+=f)a=L(b.slice(h,h+f),a,d);if("SHA-224"===d)b=[a[0],a[1],a[2],a[3],a[4],a[5],a[6]];else if("SHA-256"===d)b=a;else if("SHA-384"===d)b=[a[0].a,a[0].b,a[1].a,a[1].b,a[2].a,a[2].b,a[3].a,a[3].b,a[4].a,a[4].b,a[5].a,a[5].b];else if("SHA-512"===d)b=[a[0].a,a[0].b,a[1].a,a[1].b,a[2].a,a[2].b,a[3].a,a[3].b,a[4].a,
a[4].b,a[5].a,a[5].b,a[6].a,a[6].b,a[7].a,a[7].b];else throw Error("Unexpected error in SHA-2 implementation");return b},r=function(b){return b.slice()},"SHA-224"===d)n=512,f=224;else if("SHA-256"===d)n=512,f=256;else if("SHA-384"===d)n=1024,f=384;else if("SHA-512"===d)n=1024,f=512;else throw Error("Chosen SHA variant is not supported");else if(0===d.lastIndexOf("SHA3-",0)||0===d.lastIndexOf("SHAKE",0)){var F=6;q=D;r=function(b){var d=[],a;for(a=0;5>a;a+=1)d[a]=b[a].slice();return d};w=1;if("SHA3-224"===
d)n=1152,f=224;else if("SHA3-256"===d)n=1088,f=256;else if("SHA3-384"===d)n=832,f=384;else if("SHA3-512"===d)n=576,f=512;else if("SHAKE128"===d)n=1344,f=-1,F=31,z=!0;else if("SHAKE256"===d)n=1088,f=-1,F=31,z=!0;else throw Error("Chosen SHA variant is not supported");u=function(b,d,a,h,k){a=n;var e=F,f,g=[],m=a>>>5,l=0,c=d>>>5;for(f=0;f<c&&d>=a;f+=m)h=D(b.slice(f,f+m),h),d-=a;b=b.slice(f);for(d%=a;b.length<m;)b.push(0);f=d>>>3;b[f>>2]^=e<<f%4*8;b[m-1]^=2147483648;for(h=D(b,h);32*g.length<k;){b=h[l%
5][l/5|0];g.push(b.b);if(32*g.length>=k)break;g.push(b.a);l+=1;0===64*l%a&&(D(null,h),l=0)}return g}}else throw Error("Chosen SHA variant is not supported");c=M(b,g,w);l=A(d);this.setHMACKey=function(b,a,k){var e;if(!0===I)throw Error("HMAC key already set");if(!0===y)throw Error("Cannot set HMAC key after calling update");if(!0===z)throw Error("SHAKE is not supported for HMAC");g=(k||{}).encoding||"UTF8";a=M(a,g,w)(b);b=a.binLen;a=a.value;e=n>>>3;k=e/4-1;for(e<b/8&&(a=u(a,b,0,A(d),f));a.length<=
k;)a.push(0);for(b=0;b<=k;b+=1)v[b]=a[b]^909522486,x[b]=a[b]^1549556828;l=q(v,l);h=n;I=!0};this.update=function(b){var d,a,e,f=0,g=n>>>5;d=c(b,k,m);b=d.binLen;a=d.value;d=b>>>5;for(e=0;e<d;e+=g)f+n<=b&&(l=q(a.slice(e,e+g),l),f+=n);h+=f;k=a.slice(f>>>5);m=b%n;y=!0};this.getHash=function(b,a){var e,g,c,n;if(!0===I)throw Error("Cannot call getHash after setting HMAC key");c=N(a);if(!0===z){if(-1===c.shakeLen)throw Error("shakeLen must be specified in options");f=c.shakeLen}switch(b){case "HEX":e=function(b){return O(b,
f,w,c)};break;case "B64":e=function(b){return P(b,f,w,c)};break;case "BYTES":e=function(b){return Q(b,f,w)};break;case "ARRAYBUFFER":try{g=new ArrayBuffer(0)}catch(p){throw Error("ARRAYBUFFER not supported by this environment");}e=function(b){return R(b,f,w)};break;case "UINT8ARRAY":try{g=new Uint8Array(0)}catch(p){throw Error("UINT8ARRAY not supported by this environment");}e=function(b){return S(b,f,w)};break;default:throw Error("format must be HEX, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");}n=u(k.slice(),
m,h,r(l),f);for(g=1;g<t;g+=1)!0===z&&0!==f%32&&(n[n.length-1]&=16777215>>>24-f%32),n=u(n,f,0,A(d),f);return e(n)};this.getHMAC=function(b,a){var e,g,c,p;if(!1===I)throw Error("Cannot call getHMAC without first setting HMAC key");c=N(a);switch(b){case "HEX":e=function(b){return O(b,f,w,c)};break;case "B64":e=function(b){return P(b,f,w,c)};break;case "BYTES":e=function(b){return Q(b,f,w)};break;case "ARRAYBUFFER":try{e=new ArrayBuffer(0)}catch(v){throw Error("ARRAYBUFFER not supported by this environment");
}e=function(b){return R(b,f,w)};break;case "UINT8ARRAY":try{e=new Uint8Array(0)}catch(v){throw Error("UINT8ARRAY not supported by this environment");}e=function(b){return S(b,f,w)};break;default:throw Error("outputFormat must be HEX, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");}g=u(k.slice(),m,h,r(l),f);p=q(x,A(d));p=u(g,f,n,p,f);return e(p)}}function a(d,b){this.a=d;this.b=b}function T(d,b,a,h){var k,m,g,l,c;b=b||[0];a=a||0;m=a>>>3;c=-1===h?3:0;for(k=0;k<d.length;k+=1)l=k+m,g=l>>>2,b.length<=g&&b.push(0),
b[g]|=d[k]<<8*(c+l%4*h);return{value:b,binLen:8*d.length+a}}function O(a,b,e,h){var k="";b/=8;var m,g,c;c=-1===e?3:0;for(m=0;m<b;m+=1)g=a[m>>>2]>>>8*(c+m%4*e),k+="0123456789abcdef".charAt(g>>>4&15)+"0123456789abcdef".charAt(g&15);return h.outputUpper?k.toUpperCase():k}function P(a,b,e,h){var k="",m=b/8,g,c,p,f;f=-1===e?3:0;for(g=0;g<m;g+=3)for(c=g+1<m?a[g+1>>>2]:0,p=g+2<m?a[g+2>>>2]:0,p=(a[g>>>2]>>>8*(f+g%4*e)&255)<<16|(c>>>8*(f+(g+1)%4*e)&255)<<8|p>>>8*(f+(g+2)%4*e)&255,c=0;4>c;c+=1)8*g+6*c<=b?k+=
"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt(p>>>6*(3-c)&63):k+=h.b64Pad;return k}function Q(a,b,e){var h="";b/=8;var k,c,g;g=-1===e?3:0;for(k=0;k<b;k+=1)c=a[k>>>2]>>>8*(g+k%4*e)&255,h+=String.fromCharCode(c);return h}function R(a,b,e){b/=8;var h,k=new ArrayBuffer(b),c,g;g=new Uint8Array(k);c=-1===e?3:0;for(h=0;h<b;h+=1)g[h]=a[h>>>2]>>>8*(c+h%4*e)&255;return k}function S(a,b,e){b/=8;var h,k=new Uint8Array(b),c;c=-1===e?3:0;for(h=0;h<b;h+=1)k[h]=a[h>>>2]>>>8*(c+h%4*e)&
255;return k}function N(a){var b={outputUpper:!1,b64Pad:"=",shakeLen:-1};a=a||{};b.outputUpper=a.outputUpper||!1;!0===a.hasOwnProperty("b64Pad")&&(b.b64Pad=a.b64Pad);if(!0===a.hasOwnProperty("shakeLen")){if(0!==a.shakeLen%8)throw Error("shakeLen must be a multiple of 8");b.shakeLen=a.shakeLen}if("boolean"!==typeof b.outputUpper)throw Error("Invalid outputUpper formatting option");if("string"!==typeof b.b64Pad)throw Error("Invalid b64Pad formatting option");return b}function M(a,b,e){switch(b){case "UTF8":case "UTF16BE":case "UTF16LE":break;
default:throw Error("encoding must be UTF8, UTF16BE, or UTF16LE");}switch(a){case "HEX":a=function(b,a,d){var g=b.length,c,p,f,n,q,u;if(0!==g%2)throw Error("String of HEX type must be in byte increments");a=a||[0];d=d||0;q=d>>>3;u=-1===e?3:0;for(c=0;c<g;c+=2){p=parseInt(b.substr(c,2),16);if(isNaN(p))throw Error("String of HEX type contains invalid characters");n=(c>>>1)+q;for(f=n>>>2;a.length<=f;)a.push(0);a[f]|=p<<8*(u+n%4*e)}return{value:a,binLen:4*g+d}};break;case "TEXT":a=function(a,d,c){var g,
l,p=0,f,n,q,u,r,t;d=d||[0];c=c||0;q=c>>>3;if("UTF8"===b)for(t=-1===e?3:0,f=0;f<a.length;f+=1)for(g=a.charCodeAt(f),l=[],128>g?l.push(g):2048>g?(l.push(192|g>>>6),l.push(128|g&63)):55296>g||57344<=g?l.push(224|g>>>12,128|g>>>6&63,128|g&63):(f+=1,g=65536+((g&1023)<<10|a.charCodeAt(f)&1023),l.push(240|g>>>18,128|g>>>12&63,128|g>>>6&63,128|g&63)),n=0;n<l.length;n+=1){r=p+q;for(u=r>>>2;d.length<=u;)d.push(0);d[u]|=l[n]<<8*(t+r%4*e);p+=1}else if("UTF16BE"===b||"UTF16LE"===b)for(t=-1===e?2:0,l="UTF16LE"===
b&&1!==e||"UTF16LE"!==b&&1===e,f=0;f<a.length;f+=1){g=a.charCodeAt(f);!0===l&&(n=g&255,g=n<<8|g>>>8);r=p+q;for(u=r>>>2;d.length<=u;)d.push(0);d[u]|=g<<8*(t+r%4*e);p+=2}return{value:d,binLen:8*p+c}};break;case "B64":a=function(b,a,d){var c=0,l,p,f,n,q,u,r,t;if(-1===b.search(/^[a-zA-Z0-9=+\/]+$/))throw Error("Invalid character in base-64 string");p=b.indexOf("=");b=b.replace(/\=/g,"");if(-1!==p&&p<b.length)throw Error("Invalid '=' found in base-64 string");a=a||[0];d=d||0;u=d>>>3;t=-1===e?3:0;for(p=
0;p<b.length;p+=4){q=b.substr(p,4);for(f=n=0;f<q.length;f+=1)l="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(q.charAt(f)),n|=l<<18-6*f;for(f=0;f<q.length-1;f+=1){r=c+u;for(l=r>>>2;a.length<=l;)a.push(0);a[l]|=(n>>>16-8*f&255)<<8*(t+r%4*e);c+=1}}return{value:a,binLen:8*c+d}};break;case "BYTES":a=function(b,a,d){var c,l,p,f,n,q;a=a||[0];d=d||0;p=d>>>3;q=-1===e?3:0;for(l=0;l<b.length;l+=1)c=b.charCodeAt(l),n=l+p,f=n>>>2,a.length<=f&&a.push(0),a[f]|=c<<8*(q+n%4*e);return{value:a,
binLen:8*b.length+d}};break;case "ARRAYBUFFER":try{a=new ArrayBuffer(0)}catch(h){throw Error("ARRAYBUFFER not supported by this environment");}a=function(b,a,d){return T(new Uint8Array(b),a,d,e)};break;case "UINT8ARRAY":try{a=new Uint8Array(0)}catch(h){throw Error("UINT8ARRAY not supported by this environment");}a=function(b,a,d){return T(b,a,d,e)};break;default:throw Error("format must be HEX, TEXT, B64, BYTES, ARRAYBUFFER, or UINT8ARRAY");}return a}function y(a,b){return a<<b|a>>>32-b}function U(d,
b){return 32<b?(b-=32,new a(d.b<<b|d.a>>>32-b,d.a<<b|d.b>>>32-b)):0!==b?new a(d.a<<b|d.b>>>32-b,d.b<<b|d.a>>>32-b):d}function x(a,b){return a>>>b|a<<32-b}function t(d,b){var e=null,e=new a(d.a,d.b);return e=32>=b?new a(e.a>>>b|e.b<<32-b&4294967295,e.b>>>b|e.a<<32-b&4294967295):new a(e.b>>>b-32|e.a<<64-b&4294967295,e.a>>>b-32|e.b<<64-b&4294967295)}function V(d,b){var e=null;return e=32>=b?new a(d.a>>>b,d.b>>>b|d.a<<32-b&4294967295):new a(0,d.a>>>b-32)}function ca(a,b,e){return a&b^~a&e}function da(d,
b,e){return new a(d.a&b.a^~d.a&e.a,d.b&b.b^~d.b&e.b)}function W(a,b,e){return a&b^a&e^b&e}function ea(d,b,e){return new a(d.a&b.a^d.a&e.a^b.a&e.a,d.b&b.b^d.b&e.b^b.b&e.b)}function fa(a){return x(a,2)^x(a,13)^x(a,22)}function ga(d){var b=t(d,28),e=t(d,34);d=t(d,39);return new a(b.a^e.a^d.a,b.b^e.b^d.b)}function ha(a){return x(a,6)^x(a,11)^x(a,25)}function ia(d){var b=t(d,14),e=t(d,18);d=t(d,41);return new a(b.a^e.a^d.a,b.b^e.b^d.b)}function ja(a){return x(a,7)^x(a,18)^a>>>3}function ka(d){var b=t(d,
1),e=t(d,8);d=V(d,7);return new a(b.a^e.a^d.a,b.b^e.b^d.b)}function la(a){return x(a,17)^x(a,19)^a>>>10}function ma(d){var b=t(d,19),e=t(d,61);d=V(d,6);return new a(b.a^e.a^d.a,b.b^e.b^d.b)}function G(a,b){var e=(a&65535)+(b&65535);return((a>>>16)+(b>>>16)+(e>>>16)&65535)<<16|e&65535}function na(a,b,e,h){var c=(a&65535)+(b&65535)+(e&65535)+(h&65535);return((a>>>16)+(b>>>16)+(e>>>16)+(h>>>16)+(c>>>16)&65535)<<16|c&65535}function H(a,b,e,h,c){var m=(a&65535)+(b&65535)+(e&65535)+(h&65535)+(c&65535);
return((a>>>16)+(b>>>16)+(e>>>16)+(h>>>16)+(c>>>16)+(m>>>16)&65535)<<16|m&65535}function oa(d,b){var e,h,c;e=(d.b&65535)+(b.b&65535);h=(d.b>>>16)+(b.b>>>16)+(e>>>16);c=(h&65535)<<16|e&65535;e=(d.a&65535)+(b.a&65535)+(h>>>16);h=(d.a>>>16)+(b.a>>>16)+(e>>>16);return new a((h&65535)<<16|e&65535,c)}function pa(d,b,e,h){var c,m,g;c=(d.b&65535)+(b.b&65535)+(e.b&65535)+(h.b&65535);m=(d.b>>>16)+(b.b>>>16)+(e.b>>>16)+(h.b>>>16)+(c>>>16);g=(m&65535)<<16|c&65535;c=(d.a&65535)+(b.a&65535)+(e.a&65535)+(h.a&65535)+
(m>>>16);m=(d.a>>>16)+(b.a>>>16)+(e.a>>>16)+(h.a>>>16)+(c>>>16);return new a((m&65535)<<16|c&65535,g)}function qa(d,b,e,h,c){var m,g,l;m=(d.b&65535)+(b.b&65535)+(e.b&65535)+(h.b&65535)+(c.b&65535);g=(d.b>>>16)+(b.b>>>16)+(e.b>>>16)+(h.b>>>16)+(c.b>>>16)+(m>>>16);l=(g&65535)<<16|m&65535;m=(d.a&65535)+(b.a&65535)+(e.a&65535)+(h.a&65535)+(c.a&65535)+(g>>>16);g=(d.a>>>16)+(b.a>>>16)+(e.a>>>16)+(h.a>>>16)+(c.a>>>16)+(m>>>16);return new a((g&65535)<<16|m&65535,l)}function B(d,b){return new a(d.a^b.a,d.b^
b.b)}function A(d){var b=[],e;if("SHA-1"===d)b=[1732584193,4023233417,2562383102,271733878,3285377520];else if(0===d.lastIndexOf("SHA-",0))switch(b=[3238371032,914150663,812702999,4144912697,4290775857,1750603025,1694076839,3204075428],e=[1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225],d){case "SHA-224":break;case "SHA-256":b=e;break;case "SHA-384":b=[new a(3418070365,b[0]),new a(1654270250,b[1]),new a(2438529370,b[2]),new a(355462360,b[3]),new a(1731405415,
b[4]),new a(41048885895,b[5]),new a(3675008525,b[6]),new a(1203062813,b[7])];break;case "SHA-512":b=[new a(e[0],4089235720),new a(e[1],2227873595),new a(e[2],4271175723),new a(e[3],1595750129),new a(e[4],2917565137),new a(e[5],725511199),new a(e[6],4215389547),new a(e[7],327033209)];break;default:throw Error("Unknown SHA variant");}else if(0===d.lastIndexOf("SHA3-",0)||0===d.lastIndexOf("SHAKE",0))for(d=0;5>d;d+=1)b[d]=[new a(0,0),new a(0,0),new a(0,0),new a(0,0),new a(0,0)];else throw Error("No SHA variants supported");
return b}function K(a,b){var e=[],h,c,m,g,l,p,f;h=b[0];c=b[1];m=b[2];g=b[3];l=b[4];for(f=0;80>f;f+=1)e[f]=16>f?a[f]:y(e[f-3]^e[f-8]^e[f-14]^e[f-16],1),p=20>f?H(y(h,5),c&m^~c&g,l,1518500249,e[f]):40>f?H(y(h,5),c^m^g,l,1859775393,e[f]):60>f?H(y(h,5),W(c,m,g),l,2400959708,e[f]):H(y(h,5),c^m^g,l,3395469782,e[f]),l=g,g=m,m=y(c,30),c=h,h=p;b[0]=G(h,b[0]);b[1]=G(c,b[1]);b[2]=G(m,b[2]);b[3]=G(g,b[3]);b[4]=G(l,b[4]);return b}function ba(a,b,e,c){var k;for(k=(b+65>>>9<<4)+15;a.length<=k;)a.push(0);a[b>>>5]|=
128<<24-b%32;b+=e;a[k]=b&4294967295;a[k-1]=b/4294967296|0;b=a.length;for(k=0;k<b;k+=16)c=K(a.slice(k,k+16),c);return c}function L(d,b,e){var h,k,m,g,l,p,f,n,q,u,r,t,v,x,y,A,z,w,F,B,C,D,E=[],J;if("SHA-224"===e||"SHA-256"===e)u=64,t=1,D=Number,v=G,x=na,y=H,A=ja,z=la,w=fa,F=ha,C=W,B=ca,J=c;else if("SHA-384"===e||"SHA-512"===e)u=80,t=2,D=a,v=oa,x=pa,y=qa,A=ka,z=ma,w=ga,F=ia,C=ea,B=da,J=X;else throw Error("Unexpected error in SHA-2 implementation");e=b[0];h=b[1];k=b[2];m=b[3];g=b[4];l=b[5];p=b[6];f=b[7];
for(r=0;r<u;r+=1)16>r?(q=r*t,n=d.length<=q?0:d[q],q=d.length<=q+1?0:d[q+1],E[r]=new D(n,q)):E[r]=x(z(E[r-2]),E[r-7],A(E[r-15]),E[r-16]),n=y(f,F(g),B(g,l,p),J[r],E[r]),q=v(w(e),C(e,h,k)),f=p,p=l,l=g,g=v(m,n),m=k,k=h,h=e,e=v(n,q);b[0]=v(e,b[0]);b[1]=v(h,b[1]);b[2]=v(k,b[2]);b[3]=v(m,b[3]);b[4]=v(g,b[4]);b[5]=v(l,b[5]);b[6]=v(p,b[6]);b[7]=v(f,b[7]);return b}function D(d,b){var e,c,k,m,g=[],l=[];if(null!==d)for(c=0;c<d.length;c+=2)b[(c>>>1)%5][(c>>>1)/5|0]=B(b[(c>>>1)%5][(c>>>1)/5|0],new a(d[c+1],d[c]));
for(e=0;24>e;e+=1){m=A("SHA3-");for(c=0;5>c;c+=1){k=b[c][0];var p=b[c][1],f=b[c][2],n=b[c][3],q=b[c][4];g[c]=new a(k.a^p.a^f.a^n.a^q.a,k.b^p.b^f.b^n.b^q.b)}for(c=0;5>c;c+=1)l[c]=B(g[(c+4)%5],U(g[(c+1)%5],1));for(c=0;5>c;c+=1)for(k=0;5>k;k+=1)b[c][k]=B(b[c][k],l[c]);for(c=0;5>c;c+=1)for(k=0;5>k;k+=1)m[k][(2*c+3*k)%5]=U(b[c][k],Y[c][k]);for(c=0;5>c;c+=1)for(k=0;5>k;k+=1)b[c][k]=B(m[c][k],new a(~m[(c+1)%5][k].a&m[(c+2)%5][k].a,~m[(c+1)%5][k].b&m[(c+2)%5][k].b));b[0][0]=B(b[0][0],Z[e])}return b}var c,
X,Y,Z;c=[1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,
4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];X=[new a(c[0],3609767458),new a(c[1],602891725),new a(c[2],3964484399),new a(c[3],2173295548),new a(c[4],4081628472),new a(c[5],3053834265),new a(c[6],2937671579),new a(c[7],3664609560),new a(c[8],2734883394),new a(c[9],1164996542),new a(c[10],1323610764),new a(c[11],3590304994),new a(c[12],4068182383),new a(c[13],
991336113),new a(c[14],633803317),new a(c[15],3479774868),new a(c[16],2666613458),new a(c[17],944711139),new a(c[18],2341262773),new a(c[19],2007800933),new a(c[20],1495990901),new a(c[21],1856431235),new a(c[22],3175218132),new a(c[23],2198950837),new a(c[24],3999719339),new a(c[25],766784016),new a(c[26],2566594879),new a(c[27],3203337956),new a(c[28],1034457026),new a(c[29],2466948901),new a(c[30],3758326383),new a(c[31],168717936),new a(c[32],1188179964),new a(c[33],1546045734),new a(c[34],1522805485),
new a(c[35],2643833823),new a(c[36],2343527390),new a(c[37],1014477480),new a(c[38],1206759142),new a(c[39],344077627),new a(c[40],1290863460),new a(c[41],3158454273),new a(c[42],3505952657),new a(c[43],106217008),new a(c[44],3606008344),new a(c[45],1432725776),new a(c[46],1467031594),new a(c[47],851169720),new a(c[48],3100823752),new a(c[49],1363258195),new a(c[50],3750685593),new a(c[51],3785050280),new a(c[52],3318307427),new a(c[53],3812723403),new a(c[54],2003034995),new a(c[55],3602036899),
new a(c[56],1575990012),new a(c[57],1125592928),new a(c[58],2716904306),new a(c[59],442776044),new a(c[60],593698344),new a(c[61],3733110249),new a(c[62],2999351573),new a(c[63],3815920427),new a(3391569614,3928383900),new a(3515267271,566280711),new a(3940187606,3454069534),new a(4118630271,4000239992),new a(116418474,1914138554),new a(174292421,2731055270),new a(289380356,3203993006),new a(460393269,320620315),new a(685471733,587496836),new a(852142971,1086792851),new a(1017036298,365543100),new a(1126000580,
2618297676),new a(1288033470,3409855158),new a(1501505948,4234509866),new a(1607167915,987167468),new a(1816402316,1246189591)];Z=[new a(0,1),new a(0,32898),new a(2147483648,32906),new a(2147483648,2147516416),new a(0,32907),new a(0,2147483649),new a(2147483648,2147516545),new a(2147483648,32777),new a(0,138),new a(0,136),new a(0,2147516425),new a(0,2147483658),new a(0,2147516555),new a(2147483648,139),new a(2147483648,32905),new a(2147483648,32771),new a(2147483648,32770),new a(2147483648,128),new a(0,
32778),new a(2147483648,2147483658),new a(2147483648,2147516545),new a(2147483648,32896),new a(0,2147483649),new a(2147483648,2147516424)];Y=[[0,36,3,41,18],[1,44,10,45,2],[62,6,43,15,61],[28,55,25,21,56],[27,20,39,8,14]];"function"===typeof define&&define.amd?define(function(){return C}):"undefined"!==typeof exports?("undefined"!==typeof module&&module.exports&&(module.exports=C),exports=C):aa.jsSHA=C})(this);

},{}],34:[function(require,module,exports){
(function (global){(function (){
/**
 * Lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright JS Foundation and other contributors <https://js.foundation/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the size to enable large array optimizations. */
var LARGE_ARRAY_SIZE = 200;

/** Used to stand-in for `undefined` hash values. */
var HASH_UNDEFINED = '__lodash_hash_undefined__';

/** Used to compose bitmasks for value comparisons. */
var COMPARE_PARTIAL_FLAG = 1,
    COMPARE_UNORDERED_FLAG = 2;

/** Used as references for various `Number` constants. */
var MAX_SAFE_INTEGER = 9007199254740991;

/** `Object#toString` result references. */
var argsTag = '[object Arguments]',
    arrayTag = '[object Array]',
    asyncTag = '[object AsyncFunction]',
    boolTag = '[object Boolean]',
    dateTag = '[object Date]',
    errorTag = '[object Error]',
    funcTag = '[object Function]',
    genTag = '[object GeneratorFunction]',
    mapTag = '[object Map]',
    numberTag = '[object Number]',
    nullTag = '[object Null]',
    objectTag = '[object Object]',
    promiseTag = '[object Promise]',
    proxyTag = '[object Proxy]',
    regexpTag = '[object RegExp]',
    setTag = '[object Set]',
    stringTag = '[object String]',
    symbolTag = '[object Symbol]',
    undefinedTag = '[object Undefined]',
    weakMapTag = '[object WeakMap]';

var arrayBufferTag = '[object ArrayBuffer]',
    dataViewTag = '[object DataView]',
    float32Tag = '[object Float32Array]',
    float64Tag = '[object Float64Array]',
    int8Tag = '[object Int8Array]',
    int16Tag = '[object Int16Array]',
    int32Tag = '[object Int32Array]',
    uint8Tag = '[object Uint8Array]',
    uint8ClampedTag = '[object Uint8ClampedArray]',
    uint16Tag = '[object Uint16Array]',
    uint32Tag = '[object Uint32Array]';

/**
 * Used to match `RegExp`
 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
 */
var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

/** Used to detect host constructors (Safari). */
var reIsHostCtor = /^\[object .+?Constructor\]$/;

/** Used to detect unsigned integer values. */
var reIsUint = /^(?:0|[1-9]\d*)$/;

/** Used to identify `toStringTag` values of typed arrays. */
var typedArrayTags = {};
typedArrayTags[float32Tag] = typedArrayTags[float64Tag] =
typedArrayTags[int8Tag] = typedArrayTags[int16Tag] =
typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] =
typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] =
typedArrayTags[uint32Tag] = true;
typedArrayTags[argsTag] = typedArrayTags[arrayTag] =
typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] =
typedArrayTags[dataViewTag] = typedArrayTags[dateTag] =
typedArrayTags[errorTag] = typedArrayTags[funcTag] =
typedArrayTags[mapTag] = typedArrayTags[numberTag] =
typedArrayTags[objectTag] = typedArrayTags[regexpTag] =
typedArrayTags[setTag] = typedArrayTags[stringTag] =
typedArrayTags[weakMapTag] = false;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Detect free variable `exports`. */
var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

/** Detect free variable `module`. */
var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

/** Detect the popular CommonJS extension `module.exports`. */
var moduleExports = freeModule && freeModule.exports === freeExports;

/** Detect free variable `process` from Node.js. */
var freeProcess = moduleExports && freeGlobal.process;

/** Used to access faster Node.js helpers. */
var nodeUtil = (function() {
  try {
    return freeProcess && freeProcess.binding && freeProcess.binding('util');
  } catch (e) {}
}());

/* Node.js helper references. */
var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;

/**
 * A specialized version of `_.filter` for arrays without support for
 * iteratee shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {Array} Returns the new filtered array.
 */
function arrayFilter(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length,
      resIndex = 0,
      result = [];

  while (++index < length) {
    var value = array[index];
    if (predicate(value, index, array)) {
      result[resIndex++] = value;
    }
  }
  return result;
}

/**
 * Appends the elements of `values` to `array`.
 *
 * @private
 * @param {Array} array The array to modify.
 * @param {Array} values The values to append.
 * @returns {Array} Returns `array`.
 */
function arrayPush(array, values) {
  var index = -1,
      length = values.length,
      offset = array.length;

  while (++index < length) {
    array[offset + index] = values[index];
  }
  return array;
}

/**
 * A specialized version of `_.some` for arrays without support for iteratee
 * shorthands.
 *
 * @private
 * @param {Array} [array] The array to iterate over.
 * @param {Function} predicate The function invoked per iteration.
 * @returns {boolean} Returns `true` if any element passes the predicate check,
 *  else `false`.
 */
function arraySome(array, predicate) {
  var index = -1,
      length = array == null ? 0 : array.length;

  while (++index < length) {
    if (predicate(array[index], index, array)) {
      return true;
    }
  }
  return false;
}

/**
 * The base implementation of `_.times` without support for iteratee shorthands
 * or max array length checks.
 *
 * @private
 * @param {number} n The number of times to invoke `iteratee`.
 * @param {Function} iteratee The function invoked per iteration.
 * @returns {Array} Returns the array of results.
 */
function baseTimes(n, iteratee) {
  var index = -1,
      result = Array(n);

  while (++index < n) {
    result[index] = iteratee(index);
  }
  return result;
}

/**
 * The base implementation of `_.unary` without support for storing metadata.
 *
 * @private
 * @param {Function} func The function to cap arguments for.
 * @returns {Function} Returns the new capped function.
 */
function baseUnary(func) {
  return function(value) {
    return func(value);
  };
}

/**
 * Checks if a `cache` value for `key` exists.
 *
 * @private
 * @param {Object} cache The cache to query.
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function cacheHas(cache, key) {
  return cache.has(key);
}

/**
 * Gets the value at `key` of `object`.
 *
 * @private
 * @param {Object} [object] The object to query.
 * @param {string} key The key of the property to get.
 * @returns {*} Returns the property value.
 */
function getValue(object, key) {
  return object == null ? undefined : object[key];
}

/**
 * Converts `map` to its key-value pairs.
 *
 * @private
 * @param {Object} map The map to convert.
 * @returns {Array} Returns the key-value pairs.
 */
function mapToArray(map) {
  var index = -1,
      result = Array(map.size);

  map.forEach(function(value, key) {
    result[++index] = [key, value];
  });
  return result;
}

/**
 * Creates a unary function that invokes `func` with its argument transformed.
 *
 * @private
 * @param {Function} func The function to wrap.
 * @param {Function} transform The argument transform.
 * @returns {Function} Returns the new function.
 */
function overArg(func, transform) {
  return function(arg) {
    return func(transform(arg));
  };
}

/**
 * Converts `set` to an array of its values.
 *
 * @private
 * @param {Object} set The set to convert.
 * @returns {Array} Returns the values.
 */
function setToArray(set) {
  var index = -1,
      result = Array(set.size);

  set.forEach(function(value) {
    result[++index] = value;
  });
  return result;
}

/** Used for built-in method references. */
var arrayProto = Array.prototype,
    funcProto = Function.prototype,
    objectProto = Object.prototype;

/** Used to detect overreaching core-js shims. */
var coreJsData = root['__core-js_shared__'];

/** Used to resolve the decompiled source of functions. */
var funcToString = funcProto.toString;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/** Used to detect methods masquerading as native. */
var maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
  return uid ? ('Symbol(src)_1.' + uid) : '';
}());

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var nativeObjectToString = objectProto.toString;

/** Used to detect if a method is native. */
var reIsNative = RegExp('^' +
  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
);

/** Built-in value references. */
var Buffer = moduleExports ? root.Buffer : undefined,
    Symbol = root.Symbol,
    Uint8Array = root.Uint8Array,
    propertyIsEnumerable = objectProto.propertyIsEnumerable,
    splice = arrayProto.splice,
    symToStringTag = Symbol ? Symbol.toStringTag : undefined;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeGetSymbols = Object.getOwnPropertySymbols,
    nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined,
    nativeKeys = overArg(Object.keys, Object);

/* Built-in method references that are verified to be native. */
var DataView = getNative(root, 'DataView'),
    Map = getNative(root, 'Map'),
    Promise = getNative(root, 'Promise'),
    Set = getNative(root, 'Set'),
    WeakMap = getNative(root, 'WeakMap'),
    nativeCreate = getNative(Object, 'create');

/** Used to detect maps, sets, and weakmaps. */
var dataViewCtorString = toSource(DataView),
    mapCtorString = toSource(Map),
    promiseCtorString = toSource(Promise),
    setCtorString = toSource(Set),
    weakMapCtorString = toSource(WeakMap);

/** Used to convert symbols to primitives and strings. */
var symbolProto = Symbol ? Symbol.prototype : undefined,
    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

/**
 * Creates a hash object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Hash(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the hash.
 *
 * @private
 * @name clear
 * @memberOf Hash
 */
function hashClear() {
  this.__data__ = nativeCreate ? nativeCreate(null) : {};
  this.size = 0;
}

/**
 * Removes `key` and its value from the hash.
 *
 * @private
 * @name delete
 * @memberOf Hash
 * @param {Object} hash The hash to modify.
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the hash value for `key`.
 *
 * @private
 * @name get
 * @memberOf Hash
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate) {
    var result = data[key];
    return result === HASH_UNDEFINED ? undefined : result;
  }
  return hasOwnProperty.call(data, key) ? data[key] : undefined;
}

/**
 * Checks if a hash value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Hash
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate ? (data[key] !== undefined) : hasOwnProperty.call(data, key);
}

/**
 * Sets the hash `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Hash
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the hash instance.
 */
function hashSet(key, value) {
  var data = this.__data__;
  this.size += this.has(key) ? 0 : 1;
  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
  return this;
}

// Add methods to `Hash`.
Hash.prototype.clear = hashClear;
Hash.prototype['delete'] = hashDelete;
Hash.prototype.get = hashGet;
Hash.prototype.has = hashHas;
Hash.prototype.set = hashSet;

/**
 * Creates an list cache object.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function ListCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the list cache.
 *
 * @private
 * @name clear
 * @memberOf ListCache
 */
function listCacheClear() {
  this.__data__ = [];
  this.size = 0;
}

/**
 * Removes `key` and its value from the list cache.
 *
 * @private
 * @name delete
 * @memberOf ListCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function listCacheDelete(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    return false;
  }
  var lastIndex = data.length - 1;
  if (index == lastIndex) {
    data.pop();
  } else {
    splice.call(data, index, 1);
  }
  --this.size;
  return true;
}

/**
 * Gets the list cache value for `key`.
 *
 * @private
 * @name get
 * @memberOf ListCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function listCacheGet(key) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  return index < 0 ? undefined : data[index][1];
}

/**
 * Checks if a list cache value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf ListCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function listCacheHas(key) {
  return assocIndexOf(this.__data__, key) > -1;
}

/**
 * Sets the list cache `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf ListCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the list cache instance.
 */
function listCacheSet(key, value) {
  var data = this.__data__,
      index = assocIndexOf(data, key);

  if (index < 0) {
    ++this.size;
    data.push([key, value]);
  } else {
    data[index][1] = value;
  }
  return this;
}

// Add methods to `ListCache`.
ListCache.prototype.clear = listCacheClear;
ListCache.prototype['delete'] = listCacheDelete;
ListCache.prototype.get = listCacheGet;
ListCache.prototype.has = listCacheHas;
ListCache.prototype.set = listCacheSet;

/**
 * Creates a map cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function MapCache(entries) {
  var index = -1,
      length = entries == null ? 0 : entries.length;

  this.clear();
  while (++index < length) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}

/**
 * Removes all key-value entries from the map.
 *
 * @private
 * @name clear
 * @memberOf MapCache
 */
function mapCacheClear() {
  this.size = 0;
  this.__data__ = {
    'hash': new Hash,
    'map': new (Map || ListCache),
    'string': new Hash
  };
}

/**
 * Removes `key` and its value from the map.
 *
 * @private
 * @name delete
 * @memberOf MapCache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function mapCacheDelete(key) {
  var result = getMapData(this, key)['delete'](key);
  this.size -= result ? 1 : 0;
  return result;
}

/**
 * Gets the map value for `key`.
 *
 * @private
 * @name get
 * @memberOf MapCache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function mapCacheGet(key) {
  return getMapData(this, key).get(key);
}

/**
 * Checks if a map value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf MapCache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapCacheHas(key) {
  return getMapData(this, key).has(key);
}

/**
 * Sets the map `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf MapCache
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the map cache instance.
 */
function mapCacheSet(key, value) {
  var data = getMapData(this, key),
      size = data.size;

  data.set(key, value);
  this.size += data.size == size ? 0 : 1;
  return this;
}

// Add methods to `MapCache`.
MapCache.prototype.clear = mapCacheClear;
MapCache.prototype['delete'] = mapCacheDelete;
MapCache.prototype.get = mapCacheGet;
MapCache.prototype.has = mapCacheHas;
MapCache.prototype.set = mapCacheSet;

/**
 *
 * Creates an array cache object to store unique values.
 *
 * @private
 * @constructor
 * @param {Array} [values] The values to cache.
 */
function SetCache(values) {
  var index = -1,
      length = values == null ? 0 : values.length;

  this.__data__ = new MapCache;
  while (++index < length) {
    this.add(values[index]);
  }
}

/**
 * Adds `value` to the array cache.
 *
 * @private
 * @name add
 * @memberOf SetCache
 * @alias push
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache instance.
 */
function setCacheAdd(value) {
  this.__data__.set(value, HASH_UNDEFINED);
  return this;
}

/**
 * Checks if `value` is in the array cache.
 *
 * @private
 * @name has
 * @memberOf SetCache
 * @param {*} value The value to search for.
 * @returns {number} Returns `true` if `value` is found, else `false`.
 */
function setCacheHas(value) {
  return this.__data__.has(value);
}

// Add methods to `SetCache`.
SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
SetCache.prototype.has = setCacheHas;

/**
 * Creates a stack cache object to store key-value pairs.
 *
 * @private
 * @constructor
 * @param {Array} [entries] The key-value pairs to cache.
 */
function Stack(entries) {
  var data = this.__data__ = new ListCache(entries);
  this.size = data.size;
}

/**
 * Removes all key-value entries from the stack.
 *
 * @private
 * @name clear
 * @memberOf Stack
 */
function stackClear() {
  this.__data__ = new ListCache;
  this.size = 0;
}

/**
 * Removes `key` and its value from the stack.
 *
 * @private
 * @name delete
 * @memberOf Stack
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
 */
function stackDelete(key) {
  var data = this.__data__,
      result = data['delete'](key);

  this.size = data.size;
  return result;
}

/**
 * Gets the stack value for `key`.
 *
 * @private
 * @name get
 * @memberOf Stack
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the entry value.
 */
function stackGet(key) {
  return this.__data__.get(key);
}

/**
 * Checks if a stack value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf Stack
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function stackHas(key) {
  return this.__data__.has(key);
}

/**
 * Sets the stack `key` to `value`.
 *
 * @private
 * @name set
 * @memberOf Stack
 * @param {string} key The key of the value to set.
 * @param {*} value The value to set.
 * @returns {Object} Returns the stack cache instance.
 */
function stackSet(key, value) {
  var data = this.__data__;
  if (data instanceof ListCache) {
    var pairs = data.__data__;
    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
      pairs.push([key, value]);
      this.size = ++data.size;
      return this;
    }
    data = this.__data__ = new MapCache(pairs);
  }
  data.set(key, value);
  this.size = data.size;
  return this;
}

// Add methods to `Stack`.
Stack.prototype.clear = stackClear;
Stack.prototype['delete'] = stackDelete;
Stack.prototype.get = stackGet;
Stack.prototype.has = stackHas;
Stack.prototype.set = stackSet;

/**
 * Creates an array of the enumerable property names of the array-like `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @param {boolean} inherited Specify returning inherited property names.
 * @returns {Array} Returns the array of property names.
 */
function arrayLikeKeys(value, inherited) {
  var isArr = isArray(value),
      isArg = !isArr && isArguments(value),
      isBuff = !isArr && !isArg && isBuffer(value),
      isType = !isArr && !isArg && !isBuff && isTypedArray(value),
      skipIndexes = isArr || isArg || isBuff || isType,
      result = skipIndexes ? baseTimes(value.length, String) : [],
      length = result.length;

  for (var key in value) {
    if ((inherited || hasOwnProperty.call(value, key)) &&
        !(skipIndexes && (
           // Safari 9 has enumerable `arguments.length` in strict mode.
           key == 'length' ||
           // Node.js 0.10 has enumerable non-index properties on buffers.
           (isBuff && (key == 'offset' || key == 'parent')) ||
           // PhantomJS 2 has enumerable non-index properties on typed arrays.
           (isType && (key == 'buffer' || key == 'byteLength' || key == 'byteOffset')) ||
           // Skip index properties.
           isIndex(key, length)
        ))) {
      result.push(key);
    }
  }
  return result;
}

/**
 * Gets the index at which the `key` is found in `array` of key-value pairs.
 *
 * @private
 * @param {Array} array The array to inspect.
 * @param {*} key The key to search for.
 * @returns {number} Returns the index of the matched value, else `-1`.
 */
function assocIndexOf(array, key) {
  var length = array.length;
  while (length--) {
    if (eq(array[length][0], key)) {
      return length;
    }
  }
  return -1;
}

/**
 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
 * symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {Function} keysFunc The function to get the keys of `object`.
 * @param {Function} symbolsFunc The function to get the symbols of `object`.
 * @returns {Array} Returns the array of property names and symbols.
 */
function baseGetAllKeys(object, keysFunc, symbolsFunc) {
  var result = keysFunc(object);
  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
}

/**
 * The base implementation of `getTag` without fallbacks for buggy environments.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
function baseGetTag(value) {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return (symToStringTag && symToStringTag in Object(value))
    ? getRawTag(value)
    : objectToString(value);
}

/**
 * The base implementation of `_.isArguments`.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 */
function baseIsArguments(value) {
  return isObjectLike(value) && baseGetTag(value) == argsTag;
}

/**
 * The base implementation of `_.isEqual` which supports partial comparisons
 * and tracks traversed objects.
 *
 * @private
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @param {boolean} bitmask The bitmask flags.
 *  1 - Unordered comparison
 *  2 - Partial comparison
 * @param {Function} [customizer] The function to customize comparisons.
 * @param {Object} [stack] Tracks traversed `value` and `other` objects.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 */
function baseIsEqual(value, other, bitmask, customizer, stack) {
  if (value === other) {
    return true;
  }
  if (value == null || other == null || (!isObjectLike(value) && !isObjectLike(other))) {
    return value !== value && other !== other;
  }
  return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
}

/**
 * A specialized version of `baseIsEqual` for arrays and objects which performs
 * deep comparisons and tracks traversed objects enabling objects with circular
 * references to be compared.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} [stack] Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
  var objIsArr = isArray(object),
      othIsArr = isArray(other),
      objTag = objIsArr ? arrayTag : getTag(object),
      othTag = othIsArr ? arrayTag : getTag(other);

  objTag = objTag == argsTag ? objectTag : objTag;
  othTag = othTag == argsTag ? objectTag : othTag;

  var objIsObj = objTag == objectTag,
      othIsObj = othTag == objectTag,
      isSameTag = objTag == othTag;

  if (isSameTag && isBuffer(object)) {
    if (!isBuffer(other)) {
      return false;
    }
    objIsArr = true;
    objIsObj = false;
  }
  if (isSameTag && !objIsObj) {
    stack || (stack = new Stack);
    return (objIsArr || isTypedArray(object))
      ? equalArrays(object, other, bitmask, customizer, equalFunc, stack)
      : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
  }
  if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
    var objIsWrapped = objIsObj && hasOwnProperty.call(object, '__wrapped__'),
        othIsWrapped = othIsObj && hasOwnProperty.call(other, '__wrapped__');

    if (objIsWrapped || othIsWrapped) {
      var objUnwrapped = objIsWrapped ? object.value() : object,
          othUnwrapped = othIsWrapped ? other.value() : other;

      stack || (stack = new Stack);
      return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
    }
  }
  if (!isSameTag) {
    return false;
  }
  stack || (stack = new Stack);
  return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
}

/**
 * The base implementation of `_.isNative` without bad shim checks.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a native function,
 *  else `false`.
 */
function baseIsNative(value) {
  if (!isObject(value) || isMasked(value)) {
    return false;
  }
  var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource(value));
}

/**
 * The base implementation of `_.isTypedArray` without Node.js optimizations.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 */
function baseIsTypedArray(value) {
  return isObjectLike(value) &&
    isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
}

/**
 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 */
function baseKeys(object) {
  if (!isPrototype(object)) {
    return nativeKeys(object);
  }
  var result = [];
  for (var key in Object(object)) {
    if (hasOwnProperty.call(object, key) && key != 'constructor') {
      result.push(key);
    }
  }
  return result;
}

/**
 * A specialized version of `baseIsEqualDeep` for arrays with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Array} array The array to compare.
 * @param {Array} other The other array to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `array` and `other` objects.
 * @returns {boolean} Returns `true` if the arrays are equivalent, else `false`.
 */
function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      arrLength = array.length,
      othLength = other.length;

  if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
    return false;
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(array);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var index = -1,
      result = true,
      seen = (bitmask & COMPARE_UNORDERED_FLAG) ? new SetCache : undefined;

  stack.set(array, other);
  stack.set(other, array);

  // Ignore non-index properties.
  while (++index < arrLength) {
    var arrValue = array[index],
        othValue = other[index];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, arrValue, index, other, array, stack)
        : customizer(arrValue, othValue, index, array, other, stack);
    }
    if (compared !== undefined) {
      if (compared) {
        continue;
      }
      result = false;
      break;
    }
    // Recursively compare arrays (susceptible to call stack limits).
    if (seen) {
      if (!arraySome(other, function(othValue, othIndex) {
            if (!cacheHas(seen, othIndex) &&
                (arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              return seen.push(othIndex);
            }
          })) {
        result = false;
        break;
      }
    } else if (!(
          arrValue === othValue ||
            equalFunc(arrValue, othValue, bitmask, customizer, stack)
        )) {
      result = false;
      break;
    }
  }
  stack['delete'](array);
  stack['delete'](other);
  return result;
}

/**
 * A specialized version of `baseIsEqualDeep` for comparing objects of
 * the same `toStringTag`.
 *
 * **Note:** This function only supports comparing values with tags of
 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {string} tag The `toStringTag` of the objects to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
  switch (tag) {
    case dataViewTag:
      if ((object.byteLength != other.byteLength) ||
          (object.byteOffset != other.byteOffset)) {
        return false;
      }
      object = object.buffer;
      other = other.buffer;

    case arrayBufferTag:
      if ((object.byteLength != other.byteLength) ||
          !equalFunc(new Uint8Array(object), new Uint8Array(other))) {
        return false;
      }
      return true;

    case boolTag:
    case dateTag:
    case numberTag:
      // Coerce booleans to `1` or `0` and dates to milliseconds.
      // Invalid dates are coerced to `NaN`.
      return eq(+object, +other);

    case errorTag:
      return object.name == other.name && object.message == other.message;

    case regexpTag:
    case stringTag:
      // Coerce regexes to strings and treat strings, primitives and objects,
      // as equal. See http://www.ecma-international.org/ecma-262/7.0/#sec-regexp.prototype.tostring
      // for more details.
      return object == (other + '');

    case mapTag:
      var convert = mapToArray;

    case setTag:
      var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
      convert || (convert = setToArray);

      if (object.size != other.size && !isPartial) {
        return false;
      }
      // Assume cyclic values are equal.
      var stacked = stack.get(object);
      if (stacked) {
        return stacked == other;
      }
      bitmask |= COMPARE_UNORDERED_FLAG;

      // Recursively compare objects (susceptible to call stack limits).
      stack.set(object, other);
      var result = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
      stack['delete'](object);
      return result;

    case symbolTag:
      if (symbolValueOf) {
        return symbolValueOf.call(object) == symbolValueOf.call(other);
      }
  }
  return false;
}

/**
 * A specialized version of `baseIsEqualDeep` for objects with support for
 * partial deep comparisons.
 *
 * @private
 * @param {Object} object The object to compare.
 * @param {Object} other The other object to compare.
 * @param {number} bitmask The bitmask flags. See `baseIsEqual` for more details.
 * @param {Function} customizer The function to customize comparisons.
 * @param {Function} equalFunc The function to determine equivalents of values.
 * @param {Object} stack Tracks traversed `object` and `other` objects.
 * @returns {boolean} Returns `true` if the objects are equivalent, else `false`.
 */
function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
  var isPartial = bitmask & COMPARE_PARTIAL_FLAG,
      objProps = getAllKeys(object),
      objLength = objProps.length,
      othProps = getAllKeys(other),
      othLength = othProps.length;

  if (objLength != othLength && !isPartial) {
    return false;
  }
  var index = objLength;
  while (index--) {
    var key = objProps[index];
    if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
      return false;
    }
  }
  // Assume cyclic values are equal.
  var stacked = stack.get(object);
  if (stacked && stack.get(other)) {
    return stacked == other;
  }
  var result = true;
  stack.set(object, other);
  stack.set(other, object);

  var skipCtor = isPartial;
  while (++index < objLength) {
    key = objProps[index];
    var objValue = object[key],
        othValue = other[key];

    if (customizer) {
      var compared = isPartial
        ? customizer(othValue, objValue, key, other, object, stack)
        : customizer(objValue, othValue, key, object, other, stack);
    }
    // Recursively compare objects (susceptible to call stack limits).
    if (!(compared === undefined
          ? (objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack))
          : compared
        )) {
      result = false;
      break;
    }
    skipCtor || (skipCtor = key == 'constructor');
  }
  if (result && !skipCtor) {
    var objCtor = object.constructor,
        othCtor = other.constructor;

    // Non `Object` object instances with different constructors are not equal.
    if (objCtor != othCtor &&
        ('constructor' in object && 'constructor' in other) &&
        !(typeof objCtor == 'function' && objCtor instanceof objCtor &&
          typeof othCtor == 'function' && othCtor instanceof othCtor)) {
      result = false;
    }
  }
  stack['delete'](object);
  stack['delete'](other);
  return result;
}

/**
 * Creates an array of own enumerable property names and symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names and symbols.
 */
function getAllKeys(object) {
  return baseGetAllKeys(object, keys, getSymbols);
}

/**
 * Gets the data for `map`.
 *
 * @private
 * @param {Object} map The map to query.
 * @param {string} key The reference key.
 * @returns {*} Returns the map data.
 */
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable(key)
    ? data[typeof key == 'string' ? 'string' : 'hash']
    : data.map;
}

/**
 * Gets the native function at `key` of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @param {string} key The key of the method to get.
 * @returns {*} Returns the function if it's native, else `undefined`.
 */
function getNative(object, key) {
  var value = getValue(object, key);
  return baseIsNative(value) ? value : undefined;
}

/**
 * A specialized version of `baseGetTag` which ignores `Symbol.toStringTag` values.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the raw `toStringTag`.
 */
function getRawTag(value) {
  var isOwn = hasOwnProperty.call(value, symToStringTag),
      tag = value[symToStringTag];

  try {
    value[symToStringTag] = undefined;
    var unmasked = true;
  } catch (e) {}

  var result = nativeObjectToString.call(value);
  if (unmasked) {
    if (isOwn) {
      value[symToStringTag] = tag;
    } else {
      delete value[symToStringTag];
    }
  }
  return result;
}

/**
 * Creates an array of the own enumerable symbols of `object`.
 *
 * @private
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of symbols.
 */
var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
  if (object == null) {
    return [];
  }
  object = Object(object);
  return arrayFilter(nativeGetSymbols(object), function(symbol) {
    return propertyIsEnumerable.call(object, symbol);
  });
};

/**
 * Gets the `toStringTag` of `value`.
 *
 * @private
 * @param {*} value The value to query.
 * @returns {string} Returns the `toStringTag`.
 */
var getTag = baseGetTag;

// Fallback for data views, maps, sets, and weak maps in IE 11 and promises in Node.js < 6.
if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
    (Map && getTag(new Map) != mapTag) ||
    (Promise && getTag(Promise.resolve()) != promiseTag) ||
    (Set && getTag(new Set) != setTag) ||
    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
  getTag = function(value) {
    var result = baseGetTag(value),
        Ctor = result == objectTag ? value.constructor : undefined,
        ctorString = Ctor ? toSource(Ctor) : '';

    if (ctorString) {
      switch (ctorString) {
        case dataViewCtorString: return dataViewTag;
        case mapCtorString: return mapTag;
        case promiseCtorString: return promiseTag;
        case setCtorString: return setTag;
        case weakMapCtorString: return weakMapTag;
      }
    }
    return result;
  };
}

/**
 * Checks if `value` is a valid array-like index.
 *
 * @private
 * @param {*} value The value to check.
 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
 */
function isIndex(value, length) {
  length = length == null ? MAX_SAFE_INTEGER : length;
  return !!length &&
    (typeof value == 'number' || reIsUint.test(value)) &&
    (value > -1 && value % 1 == 0 && value < length);
}

/**
 * Checks if `value` is suitable for use as unique object key.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
 */
function isKeyable(value) {
  var type = typeof value;
  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
    ? (value !== '__proto__')
    : (value === null);
}

/**
 * Checks if `func` has its source masked.
 *
 * @private
 * @param {Function} func The function to check.
 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
 */
function isMasked(func) {
  return !!maskSrcKey && (maskSrcKey in func);
}

/**
 * Checks if `value` is likely a prototype object.
 *
 * @private
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
 */
function isPrototype(value) {
  var Ctor = value && value.constructor,
      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

  return value === proto;
}

/**
 * Converts `value` to a string using `Object.prototype.toString`.
 *
 * @private
 * @param {*} value The value to convert.
 * @returns {string} Returns the converted string.
 */
function objectToString(value) {
  return nativeObjectToString.call(value);
}

/**
 * Converts `func` to its source code.
 *
 * @private
 * @param {Function} func The function to convert.
 * @returns {string} Returns the source code.
 */
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch (e) {}
    try {
      return (func + '');
    } catch (e) {}
  }
  return '';
}

/**
 * Performs a
 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
 * comparison between two values to determine if they are equivalent.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.eq(object, object);
 * // => true
 *
 * _.eq(object, other);
 * // => false
 *
 * _.eq('a', 'a');
 * // => true
 *
 * _.eq('a', Object('a'));
 * // => false
 *
 * _.eq(NaN, NaN);
 * // => true
 */
function eq(value, other) {
  return value === other || (value !== value && other !== other);
}

/**
 * Checks if `value` is likely an `arguments` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
 *  else `false`.
 * @example
 *
 * _.isArguments(function() { return arguments; }());
 * // => true
 *
 * _.isArguments([1, 2, 3]);
 * // => false
 */
var isArguments = baseIsArguments(function() { return arguments; }()) ? baseIsArguments : function(value) {
  return isObjectLike(value) && hasOwnProperty.call(value, 'callee') &&
    !propertyIsEnumerable.call(value, 'callee');
};

/**
 * Checks if `value` is classified as an `Array` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
 * @example
 *
 * _.isArray([1, 2, 3]);
 * // => true
 *
 * _.isArray(document.body.children);
 * // => false
 *
 * _.isArray('abc');
 * // => false
 *
 * _.isArray(_.noop);
 * // => false
 */
var isArray = Array.isArray;

/**
 * Checks if `value` is array-like. A value is considered array-like if it's
 * not a function and has a `value.length` that's an integer greater than or
 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
 * @example
 *
 * _.isArrayLike([1, 2, 3]);
 * // => true
 *
 * _.isArrayLike(document.body.children);
 * // => true
 *
 * _.isArrayLike('abc');
 * // => true
 *
 * _.isArrayLike(_.noop);
 * // => false
 */
function isArrayLike(value) {
  return value != null && isLength(value.length) && !isFunction(value);
}

/**
 * Checks if `value` is a buffer.
 *
 * @static
 * @memberOf _
 * @since 4.3.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
 * @example
 *
 * _.isBuffer(new Buffer(2));
 * // => true
 *
 * _.isBuffer(new Uint8Array(2));
 * // => false
 */
var isBuffer = nativeIsBuffer || stubFalse;

/**
 * Performs a deep comparison between two values to determine if they are
 * equivalent.
 *
 * **Note:** This method supports comparing arrays, array buffers, booleans,
 * date objects, error objects, maps, numbers, `Object` objects, regexes,
 * sets, strings, symbols, and typed arrays. `Object` objects are compared
 * by their own, not inherited, enumerable properties. Functions and DOM
 * nodes are compared by strict equality, i.e. `===`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to compare.
 * @param {*} other The other value to compare.
 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
 * @example
 *
 * var object = { 'a': 1 };
 * var other = { 'a': 1 };
 *
 * _.isEqual(object, other);
 * // => true
 *
 * object === other;
 * // => false
 */
function isEqual(value, other) {
  return baseIsEqual(value, other);
}

/**
 * Checks if `value` is classified as a `Function` object.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
 * @example
 *
 * _.isFunction(_);
 * // => true
 *
 * _.isFunction(/abc/);
 * // => false
 */
function isFunction(value) {
  if (!isObject(value)) {
    return false;
  }
  // The use of `Object#toString` avoids issues with the `typeof` operator
  // in Safari 9 which returns 'object' for typed arrays and other constructors.
  var tag = baseGetTag(value);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}

/**
 * Checks if `value` is a valid array-like length.
 *
 * **Note:** This method is loosely based on
 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
 * @example
 *
 * _.isLength(3);
 * // => true
 *
 * _.isLength(Number.MIN_VALUE);
 * // => false
 *
 * _.isLength(Infinity);
 * // => false
 *
 * _.isLength('3');
 * // => false
 */
function isLength(value) {
  return typeof value == 'number' &&
    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return value != null && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return value != null && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a typed array.
 *
 * @static
 * @memberOf _
 * @since 3.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a typed array, else `false`.
 * @example
 *
 * _.isTypedArray(new Uint8Array);
 * // => true
 *
 * _.isTypedArray([]);
 * // => false
 */
var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;

/**
 * Creates an array of the own enumerable property names of `object`.
 *
 * **Note:** Non-object values are coerced to objects. See the
 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
 * for more details.
 *
 * @static
 * @since 0.1.0
 * @memberOf _
 * @category Object
 * @param {Object} object The object to query.
 * @returns {Array} Returns the array of property names.
 * @example
 *
 * function Foo() {
 *   this.a = 1;
 *   this.b = 2;
 * }
 *
 * Foo.prototype.c = 3;
 *
 * _.keys(new Foo);
 * // => ['a', 'b'] (iteration order is not guaranteed)
 *
 * _.keys('hi');
 * // => ['0', '1']
 */
function keys(object) {
  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
}

/**
 * This method returns a new empty array.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {Array} Returns the new empty array.
 * @example
 *
 * var arrays = _.times(2, _.stubArray);
 *
 * console.log(arrays);
 * // => [[], []]
 *
 * console.log(arrays[0] === arrays[1]);
 * // => false
 */
function stubArray() {
  return [];
}

/**
 * This method returns `false`.
 *
 * @static
 * @memberOf _
 * @since 4.13.0
 * @category Util
 * @returns {boolean} Returns `false`.
 * @example
 *
 * _.times(2, _.stubFalse);
 * // => [false, false]
 */
function stubFalse() {
  return false;
}

module.exports = isEqual;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],35:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],36:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":4}],37:[function(require,module,exports){
var cbor = require('cbor-js');
var CRC = require('crc');
var base58 = require('./crypto/base58');
var BIP173Validator = require('./bip173_validator')

function getDecoded(address) {
    try {
        var decoded = base58.decode(address);
        return cbor.decode(new Uint8Array(decoded).buffer);
    } catch (e) {
        // if decoding fails, assume invalid address
        return null;
    }
}

function isValidAddressV1(address) {
    var decoded = getDecoded(address);

    if (!decoded || (!Array.isArray(decoded) && decoded.length != 2)) {
        return false;
    }

    var tagged = decoded[0];
    var validCrc = decoded[1];
    if (typeof (validCrc) != 'number') {
        return false;
    }

    // get crc of the payload
    var crc = CRC.crc32(tagged);

    return crc == validCrc;
}

function isValidAddressShelley(address, currency, opts) {
    // shelley address are just bip 173 - bech32 addresses (https://cips.cardano.org/cips/cip4/)
    return BIP173Validator.isValidAddress(address, currency, opts);
}

module.exports = {
    isValidAddress: function (address, currency, opts = {}) {
        return isValidAddressV1(address) || isValidAddressShelley(address, currency, opts);
    }
};

},{"./bip173_validator":41,"./crypto/base58":44,"cbor-js":5,"crc":30}],38:[function(require,module,exports){
const cryptoUtils = require('./crypto/utils');

const ALGORAND_CHECKSUM_BYTE_LENGTH = 4;
const ALGORAND_ADDRESS_LENGTH = 58;

module.exports = {
    isValidAddress: function (address, currency, opts = {}) {
        const { networkType = 'prod' } = opts;

        return this.verifyChecksum(address)
    },

    verifyChecksum: function (address) {
        if (address.length !== ALGORAND_ADDRESS_LENGTH) {
            return false
        } else {
            // Decode base32 Address
            const decoded = cryptoUtils.base32.b32decode(address);
            const addr = decoded.slice(0, decoded.length - ALGORAND_CHECKSUM_BYTE_LENGTH)
            const checksum = cryptoUtils.byteArray2hexStr(decoded.slice(-4)).toString('HEX')

            // Hash Address - Checksum
            const code = cryptoUtils.sha512_256(cryptoUtils.byteArray2hexStr(addr)).substr(-ALGORAND_CHECKSUM_BYTE_LENGTH * 2);

            return code === checksum
        }
    }
}

},{"./crypto/utils":52}],39:[function(require,module,exports){
const base58 = require('./crypto/base58');

// simple base58 validator.  Just checks if it can be decoded.
module.exports = {
    isValidAddress: function (address, currency, opts = {}) {
        try {
            if (!address || address.length == 0) {
                return false;
            }

            if (currency.minLength && (address.length < currency.minLength)) {
                return false;
            }

            if (currency.maxLength && (address.length > currency.maxLength)) {
                return false;
            }
            try {
                const decoded = base58.decode(address);
                if (!decoded || !decoded.length) {
                    return false;
                }
            } catch (e) {
                // if decoding fails, assume invalid address
                return false;
            }
            return true;
        } catch (e) {
            return false;
        }
    }
};

},{"./crypto/base58":44}],40:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils');
var bech32 = require('./crypto/bech32');
var BTCValidator = require('./bitcoin_validator');

function validateAddress(address, currency, opts) {
    var networkType = opts ? opts.networkType : ''
    var prefix = 'bitcoincash';
    var regexp = new RegExp(currency.regexp);
    var raw_address;

    var res = address.split(':');
    if (res.length === 1) {
        raw_address = address
    } else {
        if (res[0] !== 'bitcoincash') {
            return false;
        }
        raw_address = res[1];
    }

    if (!regexp.test(raw_address)) {
        return false;
    }

    if (raw_address.toLowerCase() != raw_address && raw_address.toUpperCase() != raw_address) {
        return false;
    }

    var decoded = cryptoUtils.base32.b32decode(raw_address);
    if (networkType === 'testnet') {
        prefix = 'bchtest';
    }

    try {
        if (bech32.verifyChecksum(prefix, decoded, bech32.encodings.BECH32)) {
            return false;
        }
    } catch(e) {
        return false;
    }
    return true;
}

module.exports = {
    isValidAddress: function (address, currency, networkType) {
        return validateAddress(address, currency, networkType) || BTCValidator.isValidAddress(address, currency, networkType);
    }
}

},{"./bitcoin_validator":42,"./crypto/bech32":45,"./crypto/utils":52}],41:[function(require,module,exports){
var bech32 = require('./crypto/bech32');

// bip 173 bech 32 addresses (https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki)
module.exports = {
    isValidAddress: function (address, currency, opts = {}) {
        const { networkType = 'prod' } = opts;
        const decoded = bech32.decode(address, bech32.encodings.BECH32);
        if (!decoded) {
            return false;
        }

        const bech32Hrp = decoded.hrp;
        let correctBech32Hrps;
        if (networkType === 'prod' || networkType === 'testnet') {
            correctBech32Hrps = currency.bech32Hrp[networkType];
        } else if (currency.bech32Hrp) {
            correctBech32Hrps = currency.bech32Hrp.prod.concat(currency.bech32Hrp.testnet)
        } else {
            return false;
        }

        if (correctBech32Hrps.indexOf(bech32Hrp) === -1) {
            return false;
        }

        return true;
    }
};

},{"./crypto/bech32":45}],42:[function(require,module,exports){
(function (Buffer){(function (){
var base58 = require('./crypto/base58');
var segwit = require('./crypto/segwit_addr');
var cryptoUtils = require('./crypto/utils');

var DEFAULT_NETWORK_TYPE = 'prod';

function getDecoded(address) {
    try {
        return base58.decode(address);
    } catch (e) {
        // if decoding fails, assume invalid address
        return null;
    }
}

function getChecksum(hashFunction, payload) {
    // Each currency may implement different hashing algorithm
    switch (hashFunction) {
        // blake then keccak hash chain
        case 'blake256keccak256':
            var blake = cryptoUtils.blake2b256(payload);
            return cryptoUtils.keccak256Checksum(Buffer.from(blake, 'hex'));
        case 'blake256':
            return cryptoUtils.blake256Checksum(payload);
        case 'keccak256':
            return cryptoUtils.keccak256Checksum(payload);
        case 'sha256':
        default:
            return cryptoUtils.sha256Checksum(payload);
    }
}

function getAddressType(address, currency) {
    currency = currency || {};
    // should be 25 bytes per btc address spec and 26 decred
    var expectedLength = currency.expectedLength || 25;
    var hashFunction = currency.hashFunction || 'sha256';
    var decoded = getDecoded(address);

    if (decoded) {
        var length = decoded.length;

        if (length !== expectedLength) {
            return null;
        }

        if(currency.regex) {
            if(!currency.regex.test(address)) {
                return false;
            }
        }

        var checksum = cryptoUtils.toHex(decoded.slice(length - 4, length)),
            body = cryptoUtils.toHex(decoded.slice(0, length - 4)),
            goodChecksum = getChecksum(hashFunction, body);

        return checksum === goodChecksum ? cryptoUtils.toHex(decoded.slice(0, expectedLength - 24)) : null;
    }

    return null;
}

function isValidP2PKHandP2SHAddress(address, currency, opts) {
    const { networkType = DEFAULT_NETWORK_TYPE} = opts;

    var correctAddressTypes;
    var addressType = getAddressType(address, currency);

    if (addressType) {
        if (networkType === 'prod' || networkType === 'testnet') {
            correctAddressTypes = currency.addressTypes[networkType]
        } else if (currency.addressTypes) {
            correctAddressTypes = currency.addressTypes.prod.concat(currency.addressTypes.testnet);
        } else {
            return false;
        }

        return correctAddressTypes.indexOf(addressType) >= 0;
    }

    return false;
}

module.exports = {
    isValidAddress: function (address, currency, opts = {}) {
        return isValidP2PKHandP2SHAddress(address, currency, opts) || segwit.isValidAddress(address, currency, opts);
    }
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"./crypto/base58":44,"./crypto/segwit_addr":50,"./crypto/utils":52,"buffer":4}],43:[function(require,module,exports){
var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

 /**
* Encode a string to base32
*/
var b32encode = function(s) {
    var parts = [];
    var quanta = Math.floor((s.length / 5));
    var leftover = s.length % 5;

     if (leftover != 0) {
        for (var i = 0; i < (5 - leftover); i++) {
            s += '\x00';
        }
        quanta += 1;
    }

     for (var i = 0; i < quanta; i++) {
        parts.push(alphabet.charAt(s.charCodeAt(i * 5) >> 3));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5) & 0x07) << 2) | (s.charCodeAt(i * 5 + 1) >> 6)));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 1) & 0x3F) >> 1)));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 1) & 0x01) << 4) | (s.charCodeAt(i * 5 + 2) >> 4)));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 2) & 0x0F) << 1) | (s.charCodeAt(i * 5 + 3) >> 7)));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 3) & 0x7F) >> 2)));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 3) & 0x03) << 3) | (s.charCodeAt(i * 5 + 4) >> 5)));
        parts.push(alphabet.charAt(((s.charCodeAt(i * 5 + 4) & 0x1F))));
    }

     var replace = 0;
    if (leftover == 1) replace = 6;
    else if (leftover == 2) replace = 4;
    else if (leftover == 3) replace = 3;
    else if (leftover == 4) replace = 1;

     for (var i = 0; i < replace; i++) parts.pop();
    for (var i = 0; i < replace; i++) parts.push("=");

     return parts.join("");
}

/**
* Decode a base32 string.
* This is made specifically for our use, deals only with proper strings
*/
var b32decode = function(s) {
    var r = new ArrayBuffer(s.length * 5 / 8);
    var b = new Uint8Array(r);
    for (var j = 0; j < s.length / 8; j++) {
        var v = [0, 0, 0, 0, 0, 0, 0, 0];
        for (var i = 0; i < 8; ++i) {
            v[i] = alphabet.indexOf(s[j * 8 + i]);
        }
        var i = 0;
        b[j * 5 + 0] = (v[i + 0] << 3) | (v[i + 1] >> 2);
        b[j * 5 + 1] = ((v[i + 1] & 0x3) << 6) | (v[i + 2] << 1) | (v[i + 3] >> 4);
        b[j * 5 + 2] = ((v[i + 3] & 0xf) << 4) | (v[i + 4] >> 1);
        b[j * 5 + 3] = ((v[i + 4] & 0x1) << 7) | (v[i + 5] << 2) | (v[i + 6] >> 3);
        b[j * 5 + 4] = ((v[i + 6] & 0x7) << 5) | (v[i + 7]);
    }
    return b;
}

module.exports = {
    b32decode: b32decode,
    b32encode: b32encode
};
},{}],44:[function(require,module,exports){
// Base58 encoding/decoding
// Originally written by Mike Hearn for BitcoinJ
// Copyright (c) 2011 Google Inc
// Ported to JavaScript by Stefan Thomas
// Merged Buffer refactorings from base58-native by Stephen Pair
// Copyright (c) 2013 BitPay Inc

var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
var ALPHABET_MAP = {};
for (var i = 0; i < ALPHABET.length; ++i) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}
var BASE = ALPHABET.length;

module.exports = {
    decode: function(string) {
        if (string.length === 0) return [];

        var i, j, bytes = [0];
        for (i = 0; i < string.length; ++i) {
            var c = string[i];
            if (!(c in ALPHABET_MAP)) throw new Error('Non-base58 character');

            for (j = 0; j < bytes.length; ++j) bytes[j] *= BASE
            bytes[0] += ALPHABET_MAP[c];

            var carry = 0;
            for (j = 0; j < bytes.length; ++j) {
                bytes[j] += carry;
                carry = bytes[j] >> 8;
                bytes[j] &= 0xff
            }

            while (carry) {
                bytes.push(carry & 0xff);
                carry >>= 8;
            }
        }
        // deal with leading zeros
        for (i = 0; string[i] === '1' && i < string.length - 1; ++i){
            bytes.push(0);
        }

        return bytes.reverse();
    }
};

},{}],45:[function(require,module,exports){
// Copyright (c) 2017, 2021 Pieter Wuille
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
var GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const encodings = {
    BECH32: "bech32",
    BECH32M: "bech32m",
};

module.exports = {
    decode: decode,
    encode: encode,
    encodings: encodings,
    verifyChecksum: verifyChecksum
};

function getEncodingConst (enc) {
    if (enc == encodings.BECH32) {
        return 1;
    } else if (enc == encodings.BECH32M) {
        return 0x2bc830a3;
    } else {
        return null;
    }
}

function polymod (values) {
    var chk = 1;
    for (var p = 0; p < values.length; ++p) {
        var top = chk >> 25;
        chk = (chk & 0x1ffffff) << 5 ^ values[p];
        for (var i = 0; i < 5; ++i) {
            if ((top >> i) & 1) {
                chk ^= GENERATOR[i];
            }
        }
    }
    return chk;
}

function hrpExpand (hrp) {
    var ret = [];
    var p;
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) & 31);
    }
    return ret;
}

function verifyChecksum (hrp, data, enc) {
    return polymod(hrpExpand(hrp).concat(data)) === getEncodingConst(enc);
}

function createChecksum (hrp, data, enc) {
    var values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    var mod = polymod(values) ^ getEncodingConst(enc);
    var ret = [];
    for (var p = 0; p < 6; ++p) {
        ret.push((mod >> 5 * (5 - p)) & 31);
    }
    return ret;
}

function encode (hrp, data, enc) {
    var combined = data.concat(createChecksum(hrp, data, enc));
    var ret = hrp + '1';
    for (var p = 0; p < combined.length; ++p) {
        ret += CHARSET.charAt(combined[p]);
    }
    return ret;
}

function decode (bechString, enc) {
    var p;
    var has_lower = false;
    var has_upper = false;
    for (p = 0; p < bechString.length; ++p) {
        if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
            return null;
        }
        if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
            has_lower = true;
        }
        if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
            has_upper = true;
        }
    }
    if (has_lower && has_upper) {
        return null;
    }
    bechString = bechString.toLowerCase();
    var pos = bechString.lastIndexOf('1');
    if (pos < 1 || pos + 7 > bechString.length || bechString.length > 110) {
        return null;
    }
    var hrp = bechString.substring(0, pos);
    var data = [];
    for (p = pos + 1; p < bechString.length; ++p) {
        var d = CHARSET.indexOf(bechString.charAt(p));
        if (d === -1) {
            return null;
        }
        data.push(d);
    }
    if (!verifyChecksum(hrp, data, enc)) {
        return null;
    }
    return {hrp: hrp, data: data.slice(0, data.length - 6)};
}

},{}],46:[function(require,module,exports){
/*
	JavaScript BigInteger library version 0.9.1
	http://silentmatt.com/biginteger/
	Copyright (c) 2009 Matthew Crumley <email@matthewcrumley.com>
	Copyright (c) 2010,2011 by John Tobey <John.Tobey@gmail.com>
	Licensed under the MIT license.
	Support for arbitrary internal representation base was added by
	Vitaly Magerya.
*/

/*
	File: biginteger.js
	Exports:
		<BigInteger>
*/
(function(exports) {
    "use strict";
    /*
        Class: BigInteger
        An arbitrarily-large integer.
        <BigInteger> objects should be considered immutable. None of the "built-in"
        methods modify *this* or their arguments. All properties should be
        considered private.
        All the methods of <BigInteger> instances can be called "statically". The
        static versions are convenient if you don't already have a <BigInteger>
        object.
        As an example, these calls are equivalent.
        > BigInteger(4).multiply(5); // returns BigInteger(20);
        > BigInteger.multiply(4, 5); // returns BigInteger(20);
        > var a = 42;
        > var a = BigInteger.toJSValue("0b101010"); // Not completely useless...
    */
    
    var CONSTRUCT = {}; // Unique token to call "private" version of constructor
    
    /*
        Constructor: BigInteger()
        Convert a value to a <BigInteger>.
        Although <BigInteger()> is the constructor for <BigInteger> objects, it is
        best not to call it as a constructor. If *n* is a <BigInteger> object, it is
        simply returned as-is. Otherwise, <BigInteger()> is equivalent to <parse>
        without a radix argument.
        > var n0 = BigInteger();      // Same as <BigInteger.ZERO>
        > var n1 = BigInteger("123"); // Create a new <BigInteger> with value 123
        > var n2 = BigInteger(123);   // Create a new <BigInteger> with value 123
        > var n3 = BigInteger(n2);    // Return n2, unchanged
        The constructor form only takes an array and a sign. *n* must be an
        array of numbers in little-endian order, where each digit is between 0
        and BigInteger.base.  The second parameter sets the sign: -1 for
        negative, +1 for positive, or 0 for zero. The array is *not copied and
        may be modified*. If the array contains only zeros, the sign parameter
        is ignored and is forced to zero.
        > new BigInteger([5], -1): create a new BigInteger with value -5
        Parameters:
            n - Value to convert to a <BigInteger>.
        Returns:
            A <BigInteger> value.
        See Also:
            <parse>, <BigInteger>
    */
    function BigInteger(n, s, token) {
        
        if (token !== CONSTRUCT) {
            if (n instanceof BigInteger) {
                return n;
            }
            else if (typeof n === "undefined") {
                return ZERO;
            }
            return BigInteger.parse(n);
        }
    
        n = n || [];  // Provide the nullary constructor for subclasses.
        while (n.length && !n[n.length - 1]) {
            --n.length;
        }
        this._d = n;
        this._s = n.length ? (s || 1) : 0;
    }
    
    BigInteger._construct = function(n, s) {
        return new BigInteger(n, s, CONSTRUCT);
    };
    
    // Base-10 speedup hacks in parse, toString, exp10 and log functions
    // require base to be a power of 10. 10^7 is the largest such power
    // that won't cause a precision loss when digits are multiplied.
    var BigInteger_base = 10000000;
    var BigInteger_base_log10 = 7;
    
    BigInteger.base = BigInteger_base;
    BigInteger.base_log10 = BigInteger_base_log10;
    
    var ZERO = new BigInteger([], 0, CONSTRUCT);
    // Constant: ZERO
    // <BigInteger> 0.
    BigInteger.ZERO = ZERO;
    
    var ONE = new BigInteger([1], 1, CONSTRUCT);
    // Constant: ONE
    // <BigInteger> 1.
    BigInteger.ONE = ONE;
    
    var M_ONE = new BigInteger(ONE._d, -1, CONSTRUCT);
    // Constant: M_ONE
    // <BigInteger> -1.
    BigInteger.M_ONE = M_ONE;
    
    // Constant: _0
    // Shortcut for <ZERO>.
    BigInteger._0 = ZERO;
    
    // Constant: _1
    // Shortcut for <ONE>.
    BigInteger._1 = ONE;
    
    /*
        Constant: small
        Array of <BigIntegers> from 0 to 36.
        These are used internally for parsing, but useful when you need a "small"
        <BigInteger>.
        See Also:
            <ZERO>, <ONE>, <_0>, <_1>
    */
    BigInteger.small = [
        ZERO,
        ONE,
        /* Assuming BigInteger_base > 36 */
        new BigInteger( [2], 1, CONSTRUCT),
        new BigInteger( [3], 1, CONSTRUCT),
        new BigInteger( [4], 1, CONSTRUCT),
        new BigInteger( [5], 1, CONSTRUCT),
        new BigInteger( [6], 1, CONSTRUCT),
        new BigInteger( [7], 1, CONSTRUCT),
        new BigInteger( [8], 1, CONSTRUCT),
        new BigInteger( [9], 1, CONSTRUCT),
        new BigInteger([10], 1, CONSTRUCT),
        new BigInteger([11], 1, CONSTRUCT),
        new BigInteger([12], 1, CONSTRUCT),
        new BigInteger([13], 1, CONSTRUCT),
        new BigInteger([14], 1, CONSTRUCT),
        new BigInteger([15], 1, CONSTRUCT),
        new BigInteger([16], 1, CONSTRUCT),
        new BigInteger([17], 1, CONSTRUCT),
        new BigInteger([18], 1, CONSTRUCT),
        new BigInteger([19], 1, CONSTRUCT),
        new BigInteger([20], 1, CONSTRUCT),
        new BigInteger([21], 1, CONSTRUCT),
        new BigInteger([22], 1, CONSTRUCT),
        new BigInteger([23], 1, CONSTRUCT),
        new BigInteger([24], 1, CONSTRUCT),
        new BigInteger([25], 1, CONSTRUCT),
        new BigInteger([26], 1, CONSTRUCT),
        new BigInteger([27], 1, CONSTRUCT),
        new BigInteger([28], 1, CONSTRUCT),
        new BigInteger([29], 1, CONSTRUCT),
        new BigInteger([30], 1, CONSTRUCT),
        new BigInteger([31], 1, CONSTRUCT),
        new BigInteger([32], 1, CONSTRUCT),
        new BigInteger([33], 1, CONSTRUCT),
        new BigInteger([34], 1, CONSTRUCT),
        new BigInteger([35], 1, CONSTRUCT),
        new BigInteger([36], 1, CONSTRUCT)
    ];
    
    // Used for parsing/radix conversion
    BigInteger.digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    
    /*
        Method: toString
        Convert a <BigInteger> to a string.
        When *base* is greater than 10, letters are upper case.
        Parameters:
            base - Optional base to represent the number in (default is base 10).
                   Must be between 2 and 36 inclusive, or an Error will be thrown.
        Returns:
            The string representation of the <BigInteger>.
    */
    BigInteger.prototype.toString = function(base) {
        base = +base || 10;
        if (base < 2 || base > 36) {
            throw new Error("illegal radix " + base + ".");
        }
        if (this._s === 0) {
            return "0";
        }
        if (base === 10) {
            var str = this._s < 0 ? "-" : "";
            str += this._d[this._d.length - 1].toString();
            for (var i = this._d.length - 2; i >= 0; i--) {
                var group = this._d[i].toString();
                while (group.length < BigInteger_base_log10) group = '0' + group;
                str += group;
            }
            return str;
        }
        else {
            var numerals = BigInteger.digits;
            base = BigInteger.small[base];
            var sign = this._s;
    
            var n = this.abs();
            var digits = [];
            var digit;
    
            while (n._s !== 0) {
                var divmod = n.divRem(base);
                n = divmod[0];
                digit = divmod[1];
                // TODO: This could be changed to unshift instead of reversing at the end.
                // Benchmark both to compare speeds.
                digits.push(numerals[digit.valueOf()]);
            }
            return (sign < 0 ? "-" : "") + digits.reverse().join("");
        }
    };
    
    // Verify strings for parsing
    BigInteger.radixRegex = [
        /^$/,
        /^$/,
        /^[01]*$/,
        /^[012]*$/,
        /^[0-3]*$/,
        /^[0-4]*$/,
        /^[0-5]*$/,
        /^[0-6]*$/,
        /^[0-7]*$/,
        /^[0-8]*$/,
        /^[0-9]*$/,
        /^[0-9aA]*$/,
        /^[0-9abAB]*$/,
        /^[0-9abcABC]*$/,
        /^[0-9a-dA-D]*$/,
        /^[0-9a-eA-E]*$/,
        /^[0-9a-fA-F]*$/,
        /^[0-9a-gA-G]*$/,
        /^[0-9a-hA-H]*$/,
        /^[0-9a-iA-I]*$/,
        /^[0-9a-jA-J]*$/,
        /^[0-9a-kA-K]*$/,
        /^[0-9a-lA-L]*$/,
        /^[0-9a-mA-M]*$/,
        /^[0-9a-nA-N]*$/,
        /^[0-9a-oA-O]*$/,
        /^[0-9a-pA-P]*$/,
        /^[0-9a-qA-Q]*$/,
        /^[0-9a-rA-R]*$/,
        /^[0-9a-sA-S]*$/,
        /^[0-9a-tA-T]*$/,
        /^[0-9a-uA-U]*$/,
        /^[0-9a-vA-V]*$/,
        /^[0-9a-wA-W]*$/,
        /^[0-9a-xA-X]*$/,
        /^[0-9a-yA-Y]*$/,
        /^[0-9a-zA-Z]*$/
    ];
    
    /*
        Function: parse
        Parse a string into a <BigInteger>.
        *base* is optional but, if provided, must be from 2 to 36 inclusive. If
        *base* is not provided, it will be guessed based on the leading characters
        of *s* as follows:
        - "0x" or "0X": *base* = 16
        - "0c" or "0C": *base* = 8
        - "0b" or "0B": *base* = 2
        - else: *base* = 10
        If no base is provided, or *base* is 10, the number can be in exponential
        form. For example, these are all valid:
        > BigInteger.parse("1e9");              // Same as "1000000000"
        > BigInteger.parse("1.234*10^3");       // Same as 1234
        > BigInteger.parse("56789 * 10 ** -2"); // Same as 567
        If any characters fall outside the range defined by the radix, an exception
        will be thrown.
        Parameters:
            s - The string to parse.
            base - Optional radix (default is to guess based on *s*).
        Returns:
            a <BigInteger> instance.
    */
    BigInteger.parse = function(s, base) {
        // Expands a number in exponential form to decimal form.
        // expandExponential("-13.441*10^5") === "1344100";
        // expandExponential("1.12300e-1") === "0.112300";
        // expandExponential(1000000000000000000000000000000) === "1000000000000000000000000000000";
        function expandExponential(str) {
            str = str.replace(/\s*[*xX]\s*10\s*(\^|\*\*)\s*/, "e");
    
            return str.replace(/^([+\-])?(\d+)\.?(\d*)[eE]([+\-]?\d+)$/, function(x, s, n, f, c) {
                c = +c;
                var l = c < 0;
                var i = n.length + c;
                x = (l ? n : f).length;
                c = ((c = Math.abs(c)) >= x ? c - x + l : 0);
                var z = (new Array(c + 1)).join("0");
                var r = n + f;
                return (s || "") + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0) + (i < r.length ? "." + r.substr(i) : "");
            });
        }
    
        s = s.toString();
        if (typeof base === "undefined" || +base === 10) {
            s = expandExponential(s);
        }
    
        var prefixRE;
        if (typeof base === "undefined") {
            prefixRE = '0[xcb]';
        }
        else if (base == 16) {
            prefixRE = '0x';
        }
        else if (base == 8) {
            prefixRE = '0c';
        }
        else if (base == 2) {
            prefixRE = '0b';
        }
        else {
            prefixRE = '';
        }
        var parts = new RegExp('^([+\\-]?)(' + prefixRE + ')?([0-9a-z]*)(?:\\.\\d*)?$', 'i').exec(s);
        if (parts) {
            var sign = parts[1] || "+";
            var baseSection = parts[2] || "";
            var digits = parts[3] || "";
    
            if (typeof base === "undefined") {
                // Guess base
                if (baseSection === "0x" || baseSection === "0X") { // Hex
                    base = 16;
                }
                else if (baseSection === "0c" || baseSection === "0C") { // Octal
                    base = 8;
                }
                else if (baseSection === "0b" || baseSection === "0B") { // Binary
                    base = 2;
                }
                else {
                    base = 10;
                }
            }
            else if (base < 2 || base > 36) {
                throw new Error("Illegal radix " + base + ".");
            }
    
            base = +base;
    
            // Check for digits outside the range
            if (!(BigInteger.radixRegex[base].test(digits))) {
                throw new Error("Bad digit for radix " + base);
            }
    
            // Strip leading zeros, and convert to array
            digits = digits.replace(/^0+/, "").split("");
            if (digits.length === 0) {
                return ZERO;
            }
    
            // Get the sign (we know it's not zero)
            sign = (sign === "-") ? -1 : 1;
    
            // Optimize 10
            if (base == 10) {
                var d = [];
                while (digits.length >= BigInteger_base_log10) {
                    d.push(parseInt(digits.splice(digits.length-BigInteger.base_log10, BigInteger.base_log10).join(''), 10));
                }
                d.push(parseInt(digits.join(''), 10));
                return new BigInteger(d, sign, CONSTRUCT);
            }
    
            // Do the conversion
            var d = ZERO;
            base = BigInteger.small[base];
            var small = BigInteger.small;
            for (var i = 0; i < digits.length; i++) {
                d = d.multiply(base).add(small[parseInt(digits[i], 36)]);
            }
            return new BigInteger(d._d, sign, CONSTRUCT);
        }
        else {
            throw new Error("Invalid BigInteger format: " + s);
        }
    };
    
    /*
        Function: add
        Add two <BigIntegers>.
        Parameters:
            n - The number to add to *this*. Will be converted to a <BigInteger>.
        Returns:
            The numbers added together.
        See Also:
            <subtract>, <multiply>, <quotient>, <next>
    */
    BigInteger.prototype.add = function(n) {
        if (this._s === 0) {
            return BigInteger(n);
        }
    
        n = BigInteger(n);
        if (n._s === 0) {
            return this;
        }
        if (this._s !== n._s) {
            n = n.negate();
            return this.subtract(n);
        }
    
        var a = this._d;
        var b = n._d;
        var al = a.length;
        var bl = b.length;
        var sum = new Array(Math.max(al, bl) + 1);
        var size = Math.min(al, bl);
        var carry = 0;
        var digit;
    
        for (var i = 0; i < size; i++) {
            digit = a[i] + b[i] + carry;
            sum[i] = digit % BigInteger_base;
            carry = (digit / BigInteger_base) | 0;
        }
        if (bl > al) {
            a = b;
            al = bl;
        }
        for (i = size; carry && i < al; i++) {
            digit = a[i] + carry;
            sum[i] = digit % BigInteger_base;
            carry = (digit / BigInteger_base) | 0;
        }
        if (carry) {
            sum[i] = carry;
        }
    
        for ( ; i < al; i++) {
            sum[i] = a[i];
        }
    
        return new BigInteger(sum, this._s, CONSTRUCT);
    };
    
    /*
        Function: negate
        Get the additive inverse of a <BigInteger>.
        Returns:
            A <BigInteger> with the same magnatude, but with the opposite sign.
        See Also:
            <abs>
    */
    BigInteger.prototype.negate = function() {
        return new BigInteger(this._d, (-this._s) | 0, CONSTRUCT);
    };
    
    /*
        Function: abs
        Get the absolute value of a <BigInteger>.
        Returns:
            A <BigInteger> with the same magnatude, but always positive (or zero).
        See Also:
            <negate>
    */
    BigInteger.prototype.abs = function() {
        return (this._s < 0) ? this.negate() : this;
    };
    
    /*
        Function: subtract
        Subtract two <BigIntegers>.
        Parameters:
            n - The number to subtract from *this*. Will be converted to a <BigInteger>.
        Returns:
            The *n* subtracted from *this*.
        See Also:
            <add>, <multiply>, <quotient>, <prev>
    */
    BigInteger.prototype.subtract = function(n) {
        if (this._s === 0) {
            return BigInteger(n).negate();
        }
    
        n = BigInteger(n);
        if (n._s === 0) {
            return this;
        }
        if (this._s !== n._s) {
            n = n.negate();
            return this.add(n);
        }
    
        var m = this;
        // negative - negative => -|a| - -|b| => -|a| + |b| => |b| - |a|
        if (this._s < 0) {
            m = new BigInteger(n._d, 1, CONSTRUCT);
            n = new BigInteger(this._d, 1, CONSTRUCT);
        }
    
        // Both are positive => a - b
        var sign = m.compareAbs(n);
        if (sign === 0) {
            return ZERO;
        }
        else if (sign < 0) {
            // swap m and n
            var t = n;
            n = m;
            m = t;
        }
    
        // a > b
        var a = m._d;
        var b = n._d;
        var al = a.length;
        var bl = b.length;
        var diff = new Array(al); // al >= bl since a > b
        var borrow = 0;
        var i;
        var digit;
    
        for (i = 0; i < bl; i++) {
            digit = a[i] - borrow - b[i];
            if (digit < 0) {
                digit += BigInteger_base;
                borrow = 1;
            }
            else {
                borrow = 0;
            }
            diff[i] = digit;
        }
        for (i = bl; i < al; i++) {
            digit = a[i] - borrow;
            if (digit < 0) {
                digit += BigInteger_base;
            }
            else {
                diff[i++] = digit;
                break;
            }
            diff[i] = digit;
        }
        for ( ; i < al; i++) {
            diff[i] = a[i];
        }
    
        return new BigInteger(diff, sign, CONSTRUCT);
    };
    
    (function() {
        function addOne(n, sign) {
            var a = n._d;
            var sum = a.slice();
            var carry = true;
            var i = 0;
    
            while (true) {
                var digit = (a[i] || 0) + 1;
                sum[i] = digit % BigInteger_base;
                if (digit <= BigInteger_base - 1) {
                    break;
                }
                ++i;
            }
    
            return new BigInteger(sum, sign, CONSTRUCT);
        }
    
        function subtractOne(n, sign) {
            var a = n._d;
            var sum = a.slice();
            var borrow = true;
            var i = 0;
    
            while (true) {
                var digit = (a[i] || 0) - 1;
                if (digit < 0) {
                    sum[i] = digit + BigInteger_base;
                }
                else {
                    sum[i] = digit;
                    break;
                }
                ++i;
            }
    
            return new BigInteger(sum, sign, CONSTRUCT);
        }
    
        /*
            Function: next
            Get the next <BigInteger> (add one).
            Returns:
                *this* + 1.
            See Also:
                <add>, <prev>
        */
        BigInteger.prototype.next = function() {
            switch (this._s) {
            case 0:
                return ONE;
            case -1:
                return subtractOne(this, -1);
            // case 1:
            default:
                return addOne(this, 1);
            }
        };
    
        /*
            Function: prev
            Get the previous <BigInteger> (subtract one).
            Returns:
                *this* - 1.
            See Also:
                <next>, <subtract>
        */
        BigInteger.prototype.prev = function() {
            switch (this._s) {
            case 0:
                return M_ONE;
            case -1:
                return addOne(this, -1);
            // case 1:
            default:
                return subtractOne(this, 1);
            }
        };
    })();
    
    /*
        Function: compareAbs
        Compare the absolute value of two <BigIntegers>.
        Calling <compareAbs> is faster than calling <abs> twice, then <compare>.
        Parameters:
            n - The number to compare to *this*. Will be converted to a <BigInteger>.
        Returns:
            -1, 0, or +1 if *|this|* is less than, equal to, or greater than *|n|*.
        See Also:
            <compare>, <abs>
    */
    BigInteger.prototype.compareAbs = function(n) {
        if (this === n) {
            return 0;
        }
    
        if (!(n instanceof BigInteger)) {
            if (!isFinite(n)) {
                return(isNaN(n) ? n : -1);
            }
            n = BigInteger(n);
        }
    
        if (this._s === 0) {
            return (n._s !== 0) ? -1 : 0;
        }
        if (n._s === 0) {
            return 1;
        }
    
        var l = this._d.length;
        var nl = n._d.length;
        if (l < nl) {
            return -1;
        }
        else if (l > nl) {
            return 1;
        }
    
        var a = this._d;
        var b = n._d;
        for (var i = l-1; i >= 0; i--) {
            if (a[i] !== b[i]) {
                return a[i] < b[i] ? -1 : 1;
            }
        }
    
        return 0;
    };
    
    /*
        Function: compare
        Compare two <BigIntegers>.
        Parameters:
            n - The number to compare to *this*. Will be converted to a <BigInteger>.
        Returns:
            -1, 0, or +1 if *this* is less than, equal to, or greater than *n*.
        See Also:
            <compareAbs>, <isPositive>, <isNegative>, <isUnit>
    */
    BigInteger.prototype.compare = function(n) {
        if (this === n) {
            return 0;
        }
    
        n = BigInteger(n);
    
        if (this._s === 0) {
            return -n._s;
        }
    
        if (this._s === n._s) { // both positive or both negative
            var cmp = this.compareAbs(n);
            return cmp * this._s;
        }
        else {
            return this._s;
        }
    };
    
    /*
        Function: isUnit
        Return true iff *this* is either 1 or -1.
        Returns:
            true if *this* compares equal to <BigInteger.ONE> or <BigInteger.M_ONE>.
        See Also:
            <isZero>, <isNegative>, <isPositive>, <compareAbs>, <compare>,
            <BigInteger.ONE>, <BigInteger.M_ONE>
    */
    BigInteger.prototype.isUnit = function() {
        return this === ONE ||
            this === M_ONE ||
            (this._d.length === 1 && this._d[0] === 1);
    };
    
    /*
        Function: multiply
        Multiply two <BigIntegers>.
        Parameters:
            n - The number to multiply *this* by. Will be converted to a
            <BigInteger>.
        Returns:
            The numbers multiplied together.
        See Also:
            <add>, <subtract>, <quotient>, <square>
    */
    BigInteger.prototype.multiply = function(n) {
        // TODO: Consider adding Karatsuba multiplication for large numbers
        if (this._s === 0) {
            return ZERO;
        }
    
        n = BigInteger(n);
        if (n._s === 0) {
            return ZERO;
        }
        if (this.isUnit()) {
            if (this._s < 0) {
                return n.negate();
            }
            return n;
        }
        if (n.isUnit()) {
            if (n._s < 0) {
                return this.negate();
            }
            return this;
        }
        if (this === n) {
            return this.square();
        }
    
        var r = (this._d.length >= n._d.length);
        var a = (r ? this : n)._d; // a will be longer than b
        var b = (r ? n : this)._d;
        var al = a.length;
        var bl = b.length;
    
        var pl = al + bl;
        var partial = new Array(pl);
        var i;
        for (i = 0; i < pl; i++) {
            partial[i] = 0;
        }
    
        for (i = 0; i < bl; i++) {
            var carry = 0;
            var bi = b[i];
            var jlimit = al + i;
            var digit;
            for (var j = i; j < jlimit; j++) {
                digit = partial[j] + bi * a[j - i] + carry;
                carry = (digit / BigInteger_base) | 0;
                partial[j] = (digit % BigInteger_base) | 0;
            }
            if (carry) {
                digit = partial[j] + carry;
                carry = (digit / BigInteger_base) | 0;
                partial[j] = digit % BigInteger_base;
            }
        }
        return new BigInteger(partial, this._s * n._s, CONSTRUCT);
    };
    
    // Multiply a BigInteger by a single-digit native number
    // Assumes that this and n are >= 0
    // This is not really intended to be used outside the library itself
    BigInteger.prototype.multiplySingleDigit = function(n) {
        if (n === 0 || this._s === 0) {
            return ZERO;
        }
        if (n === 1) {
            return this;
        }
    
        var digit;
        if (this._d.length === 1) {
            digit = this._d[0] * n;
            if (digit >= BigInteger_base) {
                return new BigInteger([(digit % BigInteger_base)|0,
                        (digit / BigInteger_base)|0], 1, CONSTRUCT);
            }
            return new BigInteger([digit], 1, CONSTRUCT);
        }
    
        if (n === 2) {
            return this.add(this);
        }
        if (this.isUnit()) {
            return new BigInteger([n], 1, CONSTRUCT);
        }
    
        var a = this._d;
        var al = a.length;
    
        var pl = al + 1;
        var partial = new Array(pl);
        for (var i = 0; i < pl; i++) {
            partial[i] = 0;
        }
    
        var carry = 0;
        for (var j = 0; j < al; j++) {
            digit = n * a[j] + carry;
            carry = (digit / BigInteger_base) | 0;
            partial[j] = (digit % BigInteger_base) | 0;
        }
        if (carry) {
            partial[j] = carry;
        }
    
        return new BigInteger(partial, 1, CONSTRUCT);
    };
    
    /*
        Function: square
        Multiply a <BigInteger> by itself.
        This is slightly faster than regular multiplication, since it removes the
        duplicated multiplcations.
        Returns:
            > this.multiply(this)
        See Also:
            <multiply>
    */
    BigInteger.prototype.square = function() {
        // Normally, squaring a 10-digit number would take 100 multiplications.
        // Of these 10 are unique diagonals, of the remaining 90 (100-10), 45 are repeated.
        // This procedure saves (N*(N-1))/2 multiplications, (e.g., 45 of 100 multiplies).
        // Based on code by Gary Darby, Intellitech Systems Inc., www.DelphiForFun.org
    
        if (this._s === 0) {
            return ZERO;
        }
        if (this.isUnit()) {
            return ONE;
        }
    
        var digits = this._d;
        var length = digits.length;
        var imult1 = new Array(length + length + 1);
        var product, carry, k;
        var i;
    
        // Calculate diagonal
        for (i = 0; i < length; i++) {
            k = i * 2;
            product = digits[i] * digits[i];
            carry = (product / BigInteger_base) | 0;
            imult1[k] = product % BigInteger_base;
            imult1[k + 1] = carry;
        }
    
        // Calculate repeating part
        for (i = 0; i < length; i++) {
            carry = 0;
            k = i * 2 + 1;
            for (var j = i + 1; j < length; j++, k++) {
                product = digits[j] * digits[i] * 2 + imult1[k] + carry;
                carry = (product / BigInteger_base) | 0;
                imult1[k] = product % BigInteger_base;
            }
            k = length + i;
            var digit = carry + imult1[k];
            carry = (digit / BigInteger_base) | 0;
            imult1[k] = digit % BigInteger_base;
            imult1[k + 1] += carry;
        }
    
        return new BigInteger(imult1, 1, CONSTRUCT);
    };
    
    /*
        Function: quotient
        Divide two <BigIntegers> and truncate towards zero.
        <quotient> throws an exception if *n* is zero.
        Parameters:
            n - The number to divide *this* by. Will be converted to a <BigInteger>.
        Returns:
            The *this* / *n*, truncated to an integer.
        See Also:
            <add>, <subtract>, <multiply>, <divRem>, <remainder>
    */
    BigInteger.prototype.quotient = function(n) {
        return this.divRem(n)[0];
    };
    
    /*
        Function: divide
        Deprecated synonym for <quotient>.
    */
    BigInteger.prototype.divide = BigInteger.prototype.quotient;
    
    /*
        Function: remainder
        Calculate the remainder of two <BigIntegers>.
        <remainder> throws an exception if *n* is zero.
        Parameters:
            n - The remainder after *this* is divided *this* by *n*. Will be
                converted to a <BigInteger>.
        Returns:
            *this* % *n*.
        See Also:
            <divRem>, <quotient>
    */
    BigInteger.prototype.remainder = function(n) {
        return this.divRem(n)[1];
    };
    
    /*
        Function: divRem
        Calculate the integer quotient and remainder of two <BigIntegers>.
        <divRem> throws an exception if *n* is zero.
        Parameters:
            n - The number to divide *this* by. Will be converted to a <BigInteger>.
        Returns:
            A two-element array containing the quotient and the remainder.
            > a.divRem(b)
            is exactly equivalent to
            > [a.quotient(b), a.remainder(b)]
            except it is faster, because they are calculated at the same time.
        See Also:
            <quotient>, <remainder>
    */
    BigInteger.prototype.divRem = function(n) {
        n = BigInteger(n);
        if (n._s === 0) {
            throw new Error("Divide by zero");
        }
        if (this._s === 0) {
            return [ZERO, ZERO];
        }
        if (n._d.length === 1) {
            return this.divRemSmall(n._s * n._d[0]);
        }
    
        // Test for easy cases -- |n1| <= |n2|
        switch (this.compareAbs(n)) {
        case 0: // n1 == n2
            return [this._s === n._s ? ONE : M_ONE, ZERO];
        case -1: // |n1| < |n2|
            return [ZERO, this];
        }
    
        var sign = this._s * n._s;
        var a = n.abs();
        var b_digits = this._d;
        var b_index = b_digits.length;
        var digits = n._d.length;
        var quot = [];
        var guess;
    
        var part = new BigInteger([], 0, CONSTRUCT);
    
        while (b_index) {
            part._d.unshift(b_digits[--b_index]);
            part = new BigInteger(part._d, 1, CONSTRUCT);
    
            if (part.compareAbs(n) < 0) {
                quot.push(0);
                continue;
            }
            if (part._s === 0) {
                guess = 0;
            }
            else {
                var xlen = part._d.length, ylen = a._d.length;
                var highx = part._d[xlen-1]*BigInteger_base + part._d[xlen-2];
                var highy = a._d[ylen-1]*BigInteger_base + a._d[ylen-2];
                if (part._d.length > a._d.length) {
                    // The length of part._d can either match a._d length,
                    // or exceed it by one.
                    highx = (highx+1)*BigInteger_base;
                }
                guess = Math.ceil(highx/highy);
            }
            do {
                var check = a.multiplySingleDigit(guess);
                if (check.compareAbs(part) <= 0) {
                    break;
                }
                guess--;
            } while (guess);
    
            quot.push(guess);
            if (!guess) {
                continue;
            }
            var diff = part.subtract(check);
            part._d = diff._d.slice();
        }
    
        return [new BigInteger(quot.reverse(), sign, CONSTRUCT),
               new BigInteger(part._d, this._s, CONSTRUCT)];
    };
    
    // Throws an exception if n is outside of (-BigInteger.base, -1] or
    // [1, BigInteger.base).  It's not necessary to call this, since the
    // other division functions will call it if they are able to.
    BigInteger.prototype.divRemSmall = function(n) {
        var r;
        n = +n;
        if (n === 0) {
            throw new Error("Divide by zero");
        }
    
        var n_s = n < 0 ? -1 : 1;
        var sign = this._s * n_s;
        n = Math.abs(n);
    
        if (n < 1 || n >= BigInteger_base) {
            throw new Error("Argument out of range");
        }
    
        if (this._s === 0) {
            return [ZERO, ZERO];
        }
    
        if (n === 1 || n === -1) {
            return [(sign === 1) ? this.abs() : new BigInteger(this._d, sign, CONSTRUCT), ZERO];
        }
    
        // 2 <= n < BigInteger_base
    
        // divide a single digit by a single digit
        if (this._d.length === 1) {
            var q = new BigInteger([(this._d[0] / n) | 0], 1, CONSTRUCT);
            r = new BigInteger([(this._d[0] % n) | 0], 1, CONSTRUCT);
            if (sign < 0) {
                q = q.negate();
            }
            if (this._s < 0) {
                r = r.negate();
            }
            return [q, r];
        }
    
        var digits = this._d.slice();
        var quot = new Array(digits.length);
        var part = 0;
        var diff = 0;
        var i = 0;
        var guess;
    
        while (digits.length) {
            part = part * BigInteger_base + digits[digits.length - 1];
            if (part < n) {
                quot[i++] = 0;
                digits.pop();
                diff = BigInteger_base * diff + part;
                continue;
            }
            if (part === 0) {
                guess = 0;
            }
            else {
                guess = (part / n) | 0;
            }
    
            var check = n * guess;
            diff = part - check;
            quot[i++] = guess;
            if (!guess) {
                digits.pop();
                continue;
            }
    
            digits.pop();
            part = diff;
        }
    
        r = new BigInteger([diff], 1, CONSTRUCT);
        if (this._s < 0) {
            r = r.negate();
        }
        return [new BigInteger(quot.reverse(), sign, CONSTRUCT), r];
    };
    
    /*
        Function: isEven
        Return true iff *this* is divisible by two.
        Note that <BigInteger.ZERO> is even.
        Returns:
            true if *this* is even, false otherwise.
        See Also:
            <isOdd>
    */
    BigInteger.prototype.isEven = function() {
        var digits = this._d;
        return this._s === 0 || digits.length === 0 || (digits[0] % 2) === 0;
    };
    
    /*
        Function: isOdd
        Return true iff *this* is not divisible by two.
        Returns:
            true if *this* is odd, false otherwise.
        See Also:
            <isEven>
    */
    BigInteger.prototype.isOdd = function() {
        return !this.isEven();
    };
    
    /*
        Function: sign
        Get the sign of a <BigInteger>.
        Returns:
            * -1 if *this* < 0
            * 0 if *this* == 0
            * +1 if *this* > 0
        See Also:
            <isZero>, <isPositive>, <isNegative>, <compare>, <BigInteger.ZERO>
    */
    BigInteger.prototype.sign = function() {
        return this._s;
    };
    
    /*
        Function: isPositive
        Return true iff *this* > 0.
        Returns:
            true if *this*.compare(<BigInteger.ZERO>) == 1.
        See Also:
            <sign>, <isZero>, <isNegative>, <isUnit>, <compare>, <BigInteger.ZERO>
    */
    BigInteger.prototype.isPositive = function() {
        return this._s > 0;
    };
    
    /*
        Function: isNegative
        Return true iff *this* < 0.
        Returns:
            true if *this*.compare(<BigInteger.ZERO>) == -1.
        See Also:
            <sign>, <isPositive>, <isZero>, <isUnit>, <compare>, <BigInteger.ZERO>
    */
    BigInteger.prototype.isNegative = function() {
        return this._s < 0;
    };
    
    /*
        Function: isZero
        Return true iff *this* == 0.
        Returns:
            true if *this*.compare(<BigInteger.ZERO>) == 0.
        See Also:
            <sign>, <isPositive>, <isNegative>, <isUnit>, <BigInteger.ZERO>
    */
    BigInteger.prototype.isZero = function() {
        return this._s === 0;
    };
    
    /*
        Function: exp10
        Multiply a <BigInteger> by a power of 10.
        This is equivalent to, but faster than
        > if (n >= 0) {
        >     return this.multiply(BigInteger("1e" + n));
        > }
        > else { // n <= 0
        >     return this.quotient(BigInteger("1e" + -n));
        > }
        Parameters:
            n - The power of 10 to multiply *this* by. *n* is converted to a
            javascipt number and must be no greater than <BigInteger.MAX_EXP>
            (0x7FFFFFFF), or an exception will be thrown.
        Returns:
            *this* * (10 ** *n*), truncated to an integer if necessary.
        See Also:
            <pow>, <multiply>
    */
    BigInteger.prototype.exp10 = function(n) {
        n = +n;
        if (n === 0) {
            return this;
        }
        if (Math.abs(n) > Number(MAX_EXP)) {
            throw new Error("exponent too large in BigInteger.exp10");
        }
        // Optimization for this == 0. This also keeps us from having to trim zeros in the positive n case
        if (this._s === 0) {
            return ZERO;
        }
        if (n > 0) {
            var k = new BigInteger(this._d.slice(), this._s, CONSTRUCT);
    
            for (; n >= BigInteger_base_log10; n -= BigInteger_base_log10) {
                k._d.unshift(0);
            }
            if (n == 0)
                return k;
            k._s = 1;
            k = k.multiplySingleDigit(Math.pow(10, n));
            return (this._s < 0 ? k.negate() : k);
        } else if (-n >= this._d.length*BigInteger_base_log10) {
            return ZERO;
        } else {
            var k = new BigInteger(this._d.slice(), this._s, CONSTRUCT);
    
            for (n = -n; n >= BigInteger_base_log10; n -= BigInteger_base_log10) {
                k._d.shift();
            }
            return (n == 0) ? k : k.divRemSmall(Math.pow(10, n))[0];
        }
    };
    
    /*
        Function: pow
        Raise a <BigInteger> to a power.
        In this implementation, 0**0 is 1.
        Parameters:
            n - The exponent to raise *this* by. *n* must be no greater than
            <BigInteger.MAX_EXP> (0x7FFFFFFF), or an exception will be thrown.
        Returns:
            *this* raised to the *nth* power.
        See Also:
            <modPow>
    */
    BigInteger.prototype.pow = function(n) {
        if (this.isUnit()) {
            if (this._s > 0) {
                return this;
            }
            else {
                return BigInteger(n).isOdd() ? this : this.negate();
            }
        }
    
        n = BigInteger(n);
        if (n._s === 0) {
            return ONE;
        }
        else if (n._s < 0) {
            if (this._s === 0) {
                throw new Error("Divide by zero");
            }
            else {
                return ZERO;
            }
        }
        if (this._s === 0) {
            return ZERO;
        }
        if (n.isUnit()) {
            return this;
        }
    
        if (n.compareAbs(MAX_EXP) > 0) {
            throw new Error("exponent too large in BigInteger.pow");
        }
        var x = this;
        var aux = ONE;
        var two = BigInteger.small[2];
    
        while (n.isPositive()) {
            if (n.isOdd()) {
                aux = aux.multiply(x);
                if (n.isUnit()) {
                    return aux;
                }
            }
            x = x.square();
            n = n.quotient(two);
        }
    
        return aux;
    };
    
    /*
        Function: modPow
        Raise a <BigInteger> to a power (mod m).
        Because it is reduced by a modulus, <modPow> is not limited by
        <BigInteger.MAX_EXP> like <pow>.
        Parameters:
            exponent - The exponent to raise *this* by. Must be positive.
            modulus - The modulus.
        Returns:
            *this* ^ *exponent* (mod *modulus*).
        See Also:
            <pow>, <mod>
    */
    BigInteger.prototype.modPow = function(exponent, modulus) {
        var result = ONE;
        var base = this;
    
        while (exponent.isPositive()) {
            if (exponent.isOdd()) {
                result = result.multiply(base).remainder(modulus);
            }
    
            exponent = exponent.quotient(BigInteger.small[2]);
            if (exponent.isPositive()) {
                base = base.square().remainder(modulus);
            }
        }
    
        return result;
    };
    
    /*
        Function: log
        Get the natural logarithm of a <BigInteger> as a native JavaScript number.
        This is equivalent to
        > Math.log(this.toJSValue())
        but handles values outside of the native number range.
        Returns:
            log( *this* )
        See Also:
            <toJSValue>
    */
    BigInteger.prototype.log = function() {
        switch (this._s) {
        case 0:	 return -Infinity;
        case -1: return NaN;
        default: // Fall through.
        }
    
        var l = this._d.length;
    
        if (l*BigInteger_base_log10 < 30) {
            return Math.log(this.valueOf());
        }
    
        var N = Math.ceil(30/BigInteger_base_log10);
        var firstNdigits = this._d.slice(l - N);
        return Math.log((new BigInteger(firstNdigits, 1, CONSTRUCT)).valueOf()) + (l - N) * Math.log(BigInteger_base);
    };
    
    /*
        Function: valueOf
        Convert a <BigInteger> to a native JavaScript integer.
        This is called automatically by JavaScipt to convert a <BigInteger> to a
        native value.
        Returns:
            > parseInt(this.toString(), 10)
        See Also:
            <toString>, <toJSValue>
    */
    BigInteger.prototype.valueOf = function() {
        return parseInt(this.toString(), 10);
    };
    
    /*
        Function: toJSValue
        Convert a <BigInteger> to a native JavaScript integer.
        This is the same as valueOf, but more explicitly named.
        Returns:
            > parseInt(this.toString(), 10)
        See Also:
            <toString>, <valueOf>
    */
    BigInteger.prototype.toJSValue = function() {
        return parseInt(this.toString(), 10);
    };
    
    
    /*
     Function: lowVal
     Author: Lucas Jones
     */
    BigInteger.prototype.lowVal = function () {
        return this._d[0] || 0;
    };
    
    var MAX_EXP = BigInteger(0x7FFFFFFF);
    // Constant: MAX_EXP
    // The largest exponent allowed in <pow> and <exp10> (0x7FFFFFFF or 2147483647).
    BigInteger.MAX_EXP = MAX_EXP;
    
    (function() {
        function makeUnary(fn) {
            return function(a) {
                return fn.call(BigInteger(a));
            };
        }
    
        function makeBinary(fn) {
            return function(a, b) {
                return fn.call(BigInteger(a), BigInteger(b));
            };
        }
    
        function makeTrinary(fn) {
            return function(a, b, c) {
                return fn.call(BigInteger(a), BigInteger(b), BigInteger(c));
            };
        }
    
        (function() {
            var i, fn;
            var unary = "toJSValue,isEven,isOdd,sign,isZero,isNegative,abs,isUnit,square,negate,isPositive,toString,next,prev,log".split(",");
            var binary = "compare,remainder,divRem,subtract,add,quotient,divide,multiply,pow,compareAbs".split(",");
            var trinary = ["modPow"];
    
            for (i = 0; i < unary.length; i++) {
                fn = unary[i];
                BigInteger[fn] = makeUnary(BigInteger.prototype[fn]);
            }
    
            for (i = 0; i < binary.length; i++) {
                fn = binary[i];
                BigInteger[fn] = makeBinary(BigInteger.prototype[fn]);
            }
    
            for (i = 0; i < trinary.length; i++) {
                fn = trinary[i];
                BigInteger[fn] = makeTrinary(BigInteger.prototype[fn]);
            }
    
            BigInteger.exp10 = function(x, n) {
                return BigInteger(x).exp10(n);
            };
        })();
    })();
    
    exports.JSBigInt = BigInteger; // exports.BigInteger changed to exports.JSBigInt
    })(typeof exports !== 'undefined' ? exports : this);
},{}],47:[function(require,module,exports){
(function (Buffer){(function (){
'use strict';

/**
 * Credits to https://github.com/cryptocoinjs/blake-hash
 */
Blake256.sigma = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9],
    [12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11],
    [13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10],
    [6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5],
    [10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0],
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3],
    [11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4],
    [7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8],
    [9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13],
    [2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9]
]

Blake256.u256 = [
    0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344,
    0xa4093822, 0x299f31d0, 0x082efa98, 0xec4e6c89,
    0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
    0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5, 0xb5470917
]

Blake256.padding = Buffer.from([
    0x80, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
])

Blake256.prototype._length_carry = function (arr) {
    for (var j = 0; j < arr.length; ++j) {
        if (arr[j] < 0x0100000000) break
        arr[j] -= 0x0100000000
        arr[j + 1] += 1
    }
}

Blake256.prototype.update = function (data, encoding) {
    data = Buffer.from(data, encoding);
    var block = this._block
    var offset = 0

    while (this._blockOffset + data.length - offset >= block.length) {
        for (var i = this._blockOffset; i < block.length;) block[i++] = data[offset++]

        this._length[0] += block.length * 8
        this._length_carry(this._length)

        this._compress()
        this._blockOffset = 0
    }

    while (offset < data.length) block[this._blockOffset++] = data[offset++]
    return this;
}

var zo = Buffer.from([0x01])
var oo = Buffer.from([0x81])

function rot (x, n) {
    return ((x << (32 - n)) | (x >>> n)) >>> 0
}

function g (v, m, i, a, b, c, d, e) {
    var sigma = Blake256.sigma
    var u256 = Blake256.u256

    v[a] = (v[a] + ((m[sigma[i][e]] ^ u256[sigma[i][e + 1]]) >>> 0) + v[b]) >>> 0
    v[d] = rot(v[d] ^ v[a], 16)
    v[c] = (v[c] + v[d]) >>> 0
    v[b] = rot(v[b] ^ v[c], 12)
    v[a] = (v[a] + ((m[sigma[i][e + 1]] ^ u256[sigma[i][e]]) >>> 0) + v[b]) >>> 0
    v[d] = rot(v[d] ^ v[a], 8)
    v[c] = (v[c] + v[d]) >>> 0
    v[b] = rot(v[b] ^ v[c], 7)
}

function Blake256 () {
    this._h = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ]

    this._s = [0, 0, 0, 0]

    this._block = Buffer.allocUnsafe(64)
    this._blockOffset = 0
    this._length = [0, 0]

    this._nullt = false

    this._zo = zo
    this._oo = oo
}

Blake256.prototype._compress = function () {
    var u256 = Blake256.u256
    var v = new Array(16)
    var m = new Array(16)
    var i

    for (i = 0; i < 16; ++i) m[i] = this._block.readUInt32BE(i * 4)
    for (i = 0; i < 8; ++i) v[i] = this._h[i] >>> 0
    for (i = 8; i < 12; ++i) v[i] = (this._s[i - 8] ^ u256[i - 8]) >>> 0
    for (i = 12; i < 16; ++i) v[i] = u256[i - 8]

    if (!this._nullt) {
        v[12] = (v[12] ^ this._length[0]) >>> 0
        v[13] = (v[13] ^ this._length[0]) >>> 0
        v[14] = (v[14] ^ this._length[1]) >>> 0
        v[15] = (v[15] ^ this._length[1]) >>> 0
    }

    for (i = 0; i < 14; ++i) {
        /* column step */
        g(v, m, i, 0, 4, 8, 12, 0)
        g(v, m, i, 1, 5, 9, 13, 2)
        g(v, m, i, 2, 6, 10, 14, 4)
        g(v, m, i, 3, 7, 11, 15, 6)
        /* diagonal step */
        g(v, m, i, 0, 5, 10, 15, 8)
        g(v, m, i, 1, 6, 11, 12, 10)
        g(v, m, i, 2, 7, 8, 13, 12)
        g(v, m, i, 3, 4, 9, 14, 14)
    }

    for (i = 0; i < 16; ++i) this._h[i % 8] = (this._h[i % 8] ^ v[i]) >>> 0
    for (i = 0; i < 8; ++i) this._h[i] = (this._h[i] ^ this._s[i % 4]) >>> 0
}

Blake256.prototype._padding = function () {
    var lo = this._length[0] + this._blockOffset * 8
    var hi = this._length[1]
    if (lo >= 0x0100000000) {
        lo -= 0x0100000000
        hi += 1
    }

    var msglen = Buffer.allocUnsafe(8)
    msglen.writeUInt32BE(hi, 0)
    msglen.writeUInt32BE(lo, 4)

    if (this._blockOffset === 55) {
        this._length[0] -= 8
        this.update(this._oo)
    } else {
        if (this._blockOffset < 55) {
            if (this._blockOffset === 0) this._nullt = true
            this._length[0] -= (55 - this._blockOffset) * 8
            this.update(Blake256.padding.slice(0, 55 - this._blockOffset))
        } else {
            this._length[0] -= (64 - this._blockOffset) * 8
            this.update(Blake256.padding.slice(0, 64 - this._blockOffset))
            this._length[0] -= 55 * 8
            this.update(Blake256.padding.slice(1, 1 + 55))
            this._nullt = true
        }

        this.update(this._zo)
        this._length[0] -= 8
    }

    this._length[0] -= 64
    this.update(msglen)
}

Blake256.prototype.digest = function (encoding) {
    this._padding()

    var buffer = Buffer.allocUnsafe(32)
    for (var i = 0; i < 8; ++i) buffer.writeUInt32BE(this._h[i], i * 4)
    return buffer.toString(encoding);
}

module.exports = Blake256;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":4}],48:[function(require,module,exports){
'use strict';

/**
 * Credits to https://github.com/emilbayes/blake2b
 *
 * Copyright (c) 2017, Emil Bay github@tixz.dk
 *
 * Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

// 64-bit unsigned addition
// Sets v[a,a+1] += v[b,b+1]
// v should be a Uint32Array
function ADD64AA (v, a, b) {
  var o0 = v[a] + v[b]
  var o1 = v[a + 1] + v[b + 1]
  if (o0 >= 0x100000000) {
    o1++
  }
  v[a] = o0
  v[a + 1] = o1
}

// 64-bit unsigned addition
// Sets v[a,a+1] += b
// b0 is the low 32 bits of b, b1 represents the high 32 bits
function ADD64AC (v, a, b0, b1) {
  var o0 = v[a] + b0
  if (b0 < 0) {
    o0 += 0x100000000
  }
  var o1 = v[a + 1] + b1
  if (o0 >= 0x100000000) {
    o1++
  }
  v[a] = o0
  v[a + 1] = o1
}

// Little-endian byte access
function B2B_GET32 (arr, i) {
  return (arr[i] ^
  (arr[i + 1] << 8) ^
  (arr[i + 2] << 16) ^
  (arr[i + 3] << 24))
}

// G Mixing function
// The ROTRs are inlined for speed
function B2B_G (a, b, c, d, ix, iy) {
  var x0 = m[ix]
  var x1 = m[ix + 1]
  var y0 = m[iy]
  var y1 = m[iy + 1]

  ADD64AA(v, a, b) // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
  ADD64AC(v, a, x0, x1) // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits

  // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
  var xor0 = v[d] ^ v[a]
  var xor1 = v[d + 1] ^ v[a + 1]
  v[d] = xor1
  v[d + 1] = xor0

  ADD64AA(v, c, d)

  // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
  xor0 = v[b] ^ v[c]
  xor1 = v[b + 1] ^ v[c + 1]
  v[b] = (xor0 >>> 24) ^ (xor1 << 8)
  v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8)

  ADD64AA(v, a, b)
  ADD64AC(v, a, y0, y1)

  // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
  xor0 = v[d] ^ v[a]
  xor1 = v[d + 1] ^ v[a + 1]
  v[d] = (xor0 >>> 16) ^ (xor1 << 16)
  v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16)

  ADD64AA(v, c, d)

  // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
  xor0 = v[b] ^ v[c]
  xor1 = v[b + 1] ^ v[c + 1]
  v[b] = (xor1 >>> 31) ^ (xor0 << 1)
  v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1)
}

// Initialization Vector
var BLAKE2B_IV32 = new Uint32Array([
  0xF3BCC908, 0x6A09E667, 0x84CAA73B, 0xBB67AE85,
  0xFE94F82B, 0x3C6EF372, 0x5F1D36F1, 0xA54FF53A,
  0xADE682D1, 0x510E527F, 0x2B3E6C1F, 0x9B05688C,
  0xFB41BD6B, 0x1F83D9AB, 0x137E2179, 0x5BE0CD19
])

var SIGMA8 = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
  11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
  7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
  9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
  2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
  12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
  13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
  6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
  10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3
]

// These are offsets into a uint64 buffer.
// Multiply them all by 2 to make them offsets into a uint32 buffer,
// because this is Javascript and we don't have uint64s
var SIGMA82 = new Uint8Array(SIGMA8.map(function (x) { return x * 2 }))

// Compression function. 'last' flag indicates last block.
// Note we're representing 16 uint64s as 32 uint32s
var v = new Uint32Array(32)
var m = new Uint32Array(32)
function blake2bCompress (ctx, last) {
  var i = 0

  // init work variables
  for (i = 0; i < 16; i++) {
    v[i] = ctx.h[i]
    v[i + 16] = BLAKE2B_IV32[i]
  }

  // low 64 bits of offset
  v[24] = v[24] ^ ctx.t
  v[25] = v[25] ^ (ctx.t / 0x100000000)
  // high 64 bits not supported, offset may not be higher than 2**53-1

  // last block flag set ?
  if (last) {
    v[28] = ~v[28]
    v[29] = ~v[29]
  }

  // get little-endian words
  for (i = 0; i < 32; i++) {
    m[i] = B2B_GET32(ctx.b, 4 * i)
  }

  // twelve rounds of mixing
  for (i = 0; i < 12; i++) {
    B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1])
    B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3])
    B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5])
    B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7])
    B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9])
    B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11])
    B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13])
    B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15])
  }

  for (i = 0; i < 16; i++) {
    ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16]
  }
}

// reusable parameter_block
var parameter_block = new Uint8Array([
  0, 0, 0, 0,      //  0: outlen, keylen, fanout, depth
  0, 0, 0, 0,      //  4: leaf length, sequential mode
  0, 0, 0, 0,      //  8: node offset
  0, 0, 0, 0,      // 12: node offset
  0, 0, 0, 0,      // 16: node depth, inner length, rfu
  0, 0, 0, 0,      // 20: rfu
  0, 0, 0, 0,      // 24: rfu
  0, 0, 0, 0,      // 28: rfu
  0, 0, 0, 0,      // 32: salt
  0, 0, 0, 0,      // 36: salt
  0, 0, 0, 0,      // 40: salt
  0, 0, 0, 0,      // 44: salt
  0, 0, 0, 0,      // 48: personal
  0, 0, 0, 0,      // 52: personal
  0, 0, 0, 0,      // 56: personal
  0, 0, 0, 0       // 60: personal
])

// Creates a BLAKE2b hashing context
// Requires an output length between 1 and 64 bytes
// Takes an optional Uint8Array key
function Blake2b (outlen, key, salt, personal) {
  // zero out parameter_block before usage
  parameter_block.fill(0)
  // state, 'param block'

  this.b = new Uint8Array(128)
  this.h = new Uint32Array(16)
  this.t = 0 // input count
  this.c = 0 // pointer within buffer
  this.outlen = outlen // output length in bytes

  parameter_block[0] = outlen
  if (key) parameter_block[1] = key.length
  parameter_block[2] = 1 // fanout
  parameter_block[3] = 1 // depth

  if (salt) parameter_block.set(salt, 32)
  if (personal) parameter_block.set(personal, 48)

  // initialize hash state
  for (var i = 0; i < 16; i++) {
    this.h[i] = BLAKE2B_IV32[i] ^ B2B_GET32(parameter_block, i * 4)
  }

  // key the hash, if applicable
  if (key) {
    blake2bUpdate(this, key)
    // at the end
    this.c = 128
  }
}

Blake2b.prototype.update = function (input) {
  blake2bUpdate(this, input)
  return this
}

Blake2b.prototype.digest = function (out) {
  var buf = (!out || out === 'binary' || out === 'hex') ? new Uint8Array(this.outlen) : out
  blake2bFinal(this, buf)
  if (out === 'hex') return hexSlice(buf)
  return buf
}

Blake2b.prototype.final = Blake2b.prototype.digest

// Updates a BLAKE2b streaming hash
// Requires hash context and Uint8Array (byte array)
function blake2bUpdate (ctx, input) {
  for (var i = 0; i < input.length; i++) {
    if (ctx.c === 128) { // buffer full ?
      ctx.t += ctx.c // add counters
      blake2bCompress(ctx, false) // compress (not last)
      ctx.c = 0 // counter to zero
    }
    ctx.b[ctx.c++] = input[i]
  }
}

// Completes a BLAKE2b streaming hash
// Returns a Uint8Array containing the message digest
function blake2bFinal (ctx, out) {
  ctx.t += ctx.c // mark last block offset

  while (ctx.c < 128) { // fill up with zeros
    ctx.b[ctx.c++] = 0
  }
  blake2bCompress(ctx, true) // final block flag = 1

  for (var i = 0; i < ctx.outlen; i++) {
    out[i] = ctx.h[i >> 2] >> (8 * (i & 3))
  }
  return out
}

function hexSlice (buf) {
  var str = ''
  for (var i = 0; i < buf.length; i++) str += toHex(buf[i])
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

module.exports = Blake2b;

},{}],49:[function(require,module,exports){
var JSBigInt = require('./biginteger')['JSBigInt'];

/**
Copyright (c) 2017, moneroexamples

All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
may be used to endorse or promote products derived from this software without
specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

Parts of the project are originally copyright (c) 2014-2017, MyMonero.com
*/

var cnBase58 = (function () {
    var b58 = {};

    var alphabet_str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    var alphabet = [];
    for (var i = 0; i < alphabet_str.length; i++) {
        alphabet.push(alphabet_str.charCodeAt(i));
    }
    var encoded_block_sizes = [0, 2, 3, 5, 6, 7, 9, 10, 11];

    var alphabet_size = alphabet.length;
    var full_block_size = 8;
    var full_encoded_block_size = 11;

    var UINT64_MAX = new JSBigInt(2).pow(64);

    function hextobin(hex) {
        if (hex.length % 2 !== 0) throw "Hex string has invalid length!";
        var res = new Uint8Array(hex.length / 2);
        for (var i = 0; i < hex.length / 2; ++i) {
            res[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
        }
        return res;
    }

    function bintohex(bin) {
        var out = [];
        for (var i = 0; i < bin.length; ++i) {
            out.push(("0" + bin[i].toString(16)).slice(-2));
        }
        return out.join("");
    }

    function strtobin(str) {
        var res = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
            res[i] = str.charCodeAt(i);
        }
        return res;
    }

    function bintostr(bin) {
        var out = [];
        for (var i = 0; i < bin.length; i++) {
            out.push(String.fromCharCode(bin[i]));
        }
        return out.join("");
    }

    function uint8_be_to_64(data) {
        if (data.length < 1 || data.length > 8) {
            throw "Invalid input length";
        }
        var res = JSBigInt.ZERO;
        var twopow8 = new JSBigInt(2).pow(8);
        var i = 0;
        switch (9 - data.length) {
        case 1:
            res = res.add(data[i++]);
        case 2:
            res = res.multiply(twopow8).add(data[i++]);
        case 3:
            res = res.multiply(twopow8).add(data[i++]);
        case 4:
            res = res.multiply(twopow8).add(data[i++]);
        case 5:
            res = res.multiply(twopow8).add(data[i++]);
        case 6:
            res = res.multiply(twopow8).add(data[i++]);
        case 7:
            res = res.multiply(twopow8).add(data[i++]);
        case 8:
            res = res.multiply(twopow8).add(data[i++]);
            break;
        default:
            throw "Impossible condition";
        }
        return res;
    }

    function uint64_to_8be(num, size) {
        var res = new Uint8Array(size);
        if (size < 1 || size > 8) {
            throw "Invalid input length";
        }
        var twopow8 = new JSBigInt(2).pow(8);
        for (var i = size - 1; i >= 0; i--) {
            res[i] = num.remainder(twopow8).toJSValue();
            num = num.divide(twopow8);
        }
        return res;
    }

    b58.encode_block = function (data, buf, index) {
        if (data.length < 1 || data.length > full_encoded_block_size) {
            throw "Invalid block length: " + data.length;
        }
        var num = uint8_be_to_64(data);
        var i = encoded_block_sizes[data.length] - 1;
        // while num > 0
        while (num.compare(0) === 1) {
            var div = num.divRem(alphabet_size);
            // remainder = num % alphabet_size
            var remainder = div[1];
            // num = num / alphabet_size
            num = div[0];
            buf[index + i] = alphabet[remainder.toJSValue()];
            i--;
        }
        return buf;
    };

    b58.encode = function (hex) {
        var data = hextobin(hex);
        if (data.length === 0) {
            return "";
        }
        var full_block_count = Math.floor(data.length / full_block_size);
        var last_block_size = data.length % full_block_size;
        var res_size = full_block_count * full_encoded_block_size + encoded_block_sizes[last_block_size];

        var res = new Uint8Array(res_size);
        var i;
        for (i = 0; i < res_size; ++i) {
            res[i] = alphabet[0];
        }
        for (i = 0; i < full_block_count; i++) {
            res = b58.encode_block(data.subarray(i * full_block_size, i * full_block_size + full_block_size), res, i * full_encoded_block_size);
        }
        if (last_block_size > 0) {
            res = b58.encode_block(data.subarray(full_block_count * full_block_size, full_block_count * full_block_size + last_block_size), res, full_block_count * full_encoded_block_size)
        }
        return bintostr(res);
    };

    b58.decode_block = function (data, buf, index) {
        if (data.length < 1 || data.length > full_encoded_block_size) {
            throw "Invalid block length: " + data.length;
        }

        var res_size = encoded_block_sizes.indexOf(data.length);
        if (res_size <= 0) {
            throw "Invalid block size";
        }
        var res_num = new JSBigInt(0);
        var order = new JSBigInt(1);
        for (var i = data.length - 1; i >= 0; i--) {
            var digit = alphabet.indexOf(data[i]);
            if (digit < 0) {
                throw "Invalid symbol";
            }
            var product = order.multiply(digit).add(res_num);
            // if product > UINT64_MAX
            if (product.compare(UINT64_MAX) === 1) {
                throw "Overflow";
            }
            res_num = product;
            order = order.multiply(alphabet_size);
        }
        if (res_size < full_block_size && (new JSBigInt(2).pow(8 * res_size).compare(res_num) <= 0)) {
            throw "Overflow 2";
        }
        buf.set(uint64_to_8be(res_num, res_size), index);
        return buf;
    };

    b58.decode = function (enc) {
        enc = strtobin(enc);
        if (enc.length === 0) {
            return "";
        }
        var full_block_count = Math.floor(enc.length / full_encoded_block_size);
        var last_block_size = enc.length % full_encoded_block_size;
        var last_block_decoded_size = encoded_block_sizes.indexOf(last_block_size);
        if (last_block_decoded_size < 0) {
            throw "Invalid encoded length";
        }
        var data_size = full_block_count * full_block_size + last_block_decoded_size;
        var data = new Uint8Array(data_size);
        for (var i = 0; i < full_block_count; i++) {
            data = b58.decode_block(enc.subarray(i * full_encoded_block_size, i * full_encoded_block_size + full_encoded_block_size), data, i * full_block_size);
        }
        if (last_block_size > 0) {
            data = b58.decode_block(enc.subarray(full_block_count * full_encoded_block_size, full_block_count * full_encoded_block_size + last_block_size), data, full_block_count * full_block_size);
        }
        return bintohex(data);
    };

    return b58;
})();
module.exports = cnBase58;
},{"./biginteger":46}],50:[function(require,module,exports){
// Copyright (c) 2017, 2021 Pieter Wuille
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var bech32 = require('./bech32');

function convertbits (data, frombits, tobits, pad) {
    var acc = 0;
    var bits = 0;
    var ret = [];
    var maxv = (1 << tobits) - 1;
    for (var p = 0; p < data.length; ++p) {
        var value = data[p];
        if (value < 0 || (value >> frombits) !== 0) {
            return null;
        }
        acc = (acc << frombits) | value;
        bits += frombits;
        while (bits >= tobits) {
            bits -= tobits;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            ret.push((acc << (tobits - bits)) & maxv);
        }
    } else if (bits >= frombits || ((acc << (tobits - bits)) & maxv)) {
        return null;
    }
    return ret;
}

function decode (hrp, addr) {
    var bech32m = false;
    var dec = bech32.decode(addr, bech32.encodings.BECH32);
    if (dec === null) {
        dec = bech32.decode(addr, bech32.encodings.BECH32M);
        bech32m = true;
    }
    if (dec === null || dec.hrp !== hrp || dec.data.length < 1 || dec.data[0] > 16) {
        return null;
    }
    var res = convertbits(dec.data.slice(1), 5, 8, false);
    if (res === null || res.length < 2 || res.length > 40) {
        return null;
    }
    if (dec.data[0] === 0 && res.length !== 20 && res.length !== 32) {
        return null;
    }
    if (dec.data[0] === 0 && bech32m) {
        return null;
    }
    if (dec.data[0] !== 0 && !bech32m) {
        return null;
    }
    return {version: dec.data[0], program: res};
}

function encode (hrp, version, program) {
    var enc = bech32.encodings.BECH32;
    if (version > 0) {
        enc = bech32.encodings.BECH32M;
    }
    var ret = bech32.encode(hrp, [version].concat(convertbits(program, 8, 5, true)), enc);
    if (decode(hrp, ret, enc) === null) {
        return null;
    }
    return ret;
}

/////////////////////////////////////////////////////

var DEFAULT_NETWORK_TYPE = 'prod'

function isValidAddress(address, currency, opts = {}) {

    if(!currency.bech32Hrp || currency.bech32Hrp.length === 0) {
        return false;
    }

    const { networkType = DEFAULT_NETWORK_TYPE} = opts;

    var correctBech32Hrps;
    if (networkType === 'prod' || networkType === 'testnet') {
        correctBech32Hrps = currency.bech32Hrp[networkType];
    } else if(currency.bech32Hrp) {
        correctBech32Hrps = currency.bech32Hrp.prod.concat(currency.bech32Hrp.testnet)
    } else {
        return false;
    }

    for(var chrp of correctBech32Hrps) {
        var ret = decode(chrp, address);
        if(ret) {
            return encode(chrp, ret.version, ret.program) === address.toLowerCase();
        }
    }

    return false;
}

module.exports = {
    encode: encode,
    decode: decode,
    isValidAddress: isValidAddress,
};

},{"./bech32":45}],51:[function(require,module,exports){
(function (process,global){(function (){
/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.7.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2017
 * @license MIT
 */
/*jslint bitwise: true */
'use strict';

var ERROR = 'input is invalid type';
var WINDOW = typeof window === 'object';
var root = WINDOW ? window : {};
if (root.JS_SHA3_NO_WINDOW) {
    WINDOW = false;
}
var WEB_WORKER = !WINDOW && typeof self === 'object';
var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
if (NODE_JS) {
    root = global;
} else if (WEB_WORKER) {
    root = self;
}
var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
var HEX_CHARS = '0123456789abcdef'.split('');
var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
var KECCAK_PADDING = [1, 256, 65536, 16777216];
var PADDING = [6, 1536, 393216, 100663296];
var SHIFT = [0, 8, 16, 24];
var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
    0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
    2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
    2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
    2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
var BITS = [224, 256, 384, 512];
var SHAKE_BITS = [128, 256];
var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
var CSHAKE_BYTEPAD = {
    '128': 168,
    '256': 136
};

if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    };
}

if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
        return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
}

var createOutputMethod = function (bits, padding, outputType) {
    return function (message) {
        return new Keccak(bits, padding, bits).update(message)[outputType]();
    };
};

var createShakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits) {
        return new Keccak(bits, padding, outputBits).update(message)[outputType]();
    };
};

var createCshakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits, n, s) {
        return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
    };
};

var createKmacOutputMethod = function (bits, padding, outputType) {
    return function (key, message, outputBits, s) {
        return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
    };
};

var createOutputMethods = function (method, createMethod, bits, padding) {
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
        var type = OUTPUT_TYPES[i];
        method[type] = createMethod(bits, padding, type);
    }
    return method;
};

var createMethod = function (bits, padding) {
    var method = createOutputMethod(bits, padding, 'hex');
    method.create = function () {
        return new Keccak(bits, padding, bits);
    };
    method.update = function (message) {
        return method.create().update(message);
    };
    return createOutputMethods(method, createOutputMethod, bits, padding);
};

var createShakeMethod = function (bits, padding) {
    var method = createShakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits) {
        return new Keccak(bits, padding, outputBits);
    };
    method.update = function (message, outputBits) {
        return method.create(outputBits).update(message);
    };
    return createOutputMethods(method, createShakeOutputMethod, bits, padding);
};

var createCshakeMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createCshakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits, n, s) {
        if (!n && !s) {
            return methods['shake' + bits].create(outputBits);
        } else {
            return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
        }
    };
    method.update = function (message, outputBits, n, s) {
        return method.create(outputBits, n, s).update(message);
    };
    return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
};

var createKmacMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createKmacOutputMethod(bits, padding, 'hex');
    method.create = function (key, outputBits, s) {
        return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
    };
    method.update = function (key, message, outputBits, s) {
        return method.create(key, outputBits, s).update(message);
    };
    return createOutputMethods(method, createKmacOutputMethod, bits, padding);
};

var algorithms = [
    { name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod },
    { name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod },
    { name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
    { name: 'cshake', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
    { name: 'kmac', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
];

var methods = {}, methodNames = [];

for (var i = 0; i < algorithms.length; ++i) {
    var algorithm = algorithms[i];
    var bits = algorithm.bits;
    for (var j = 0; j < bits.length; ++j) {
        var methodName = algorithm.name + '_' + bits[j];
        methodNames.push(methodName);
        methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
        if (algorithm.name !== 'sha3') {
            var newMethodName = algorithm.name + bits[j];
            methodNames.push(newMethodName);
            methods[newMethodName] = methods[methodName];
        }
    }
}

function Keccak(bits, padding, outputBits) {
    this.blocks = [];
    this.s = [];
    this.padding = padding;
    this.outputBits = outputBits;
    this.reset = true;
    this.finalized = false;
    this.block = 0;
    this.start = 0;
    this.blockCount = (1600 - (bits << 1)) >> 5;
    this.byteCount = this.blockCount << 2;
    this.outputBlocks = outputBits >> 5;
    this.extraBytes = (outputBits & 31) >> 3;

    for (var i = 0; i < 50; ++i) {
        this.s[i] = 0;
    }
}

Keccak.prototype.update = function (message) {
    if (this.finalized) {
        return;
    }
    var notString, type = typeof message;
    if (type !== 'string') {
        if (type === 'object') {
            if (message === null) {
                throw ERROR;
            } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
                message = new Uint8Array(message);
            } else if (!Array.isArray(message)) {
                if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
                    throw ERROR;
                }
            }
        } else {
            throw ERROR;
        }
        notString = true;
    }
    var blocks = this.blocks, byteCount = this.byteCount, length = message.length,
        blockCount = this.blockCount, index = 0, s = this.s, i, code;

    while (index < length) {
        if (this.reset) {
            this.reset = false;
            blocks[0] = this.block;
            for (i = 1; i < blockCount + 1; ++i) {
                blocks[i] = 0;
            }
        }
        if (notString) {
            for (i = this.start; index < length && i < byteCount; ++index) {
                blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
            }
        } else {
            for (i = this.start; index < length && i < byteCount; ++index) {
                code = message.charCodeAt(index);
                if (code < 0x80) {
                    blocks[i >> 2] |= code << SHIFT[i++ & 3];
                } else if (code < 0x800) {
                    blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                } else if (code < 0xd800 || code >= 0xe000) {
                    blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                } else {
                    code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
                    blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
                    blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
                }
            }
        }
        this.lastByteIndex = i;
        if (i >= byteCount) {
            this.start = i - byteCount;
            this.block = blocks[blockCount];
            for (i = 0; i < blockCount; ++i) {
                s[i] ^= blocks[i];
            }
            f(s);
            this.reset = true;
        } else {
            this.start = i;
        }
    }
    return this;
};

Keccak.prototype.encode = function (x, right) {
    var o = x & 255, n = 1;
    var bytes = [o];
    x = x >> 8;
    o = x & 255;
    while (o > 0) {
        bytes.unshift(o);
        x = x >> 8;
        o = x & 255;
        ++n;
    }
    if (right) {
        bytes.push(n);
    } else {
        bytes.unshift(n);
    }
    this.update(bytes);
    return bytes.length;
};

Keccak.prototype.encodeString = function (str) {
    var notString, type = typeof str;
    if (type !== 'string') {
        if (type === 'object') {
            if (str === null) {
                throw ERROR;
            } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
                str = new Uint8Array(str);
            } else if (!Array.isArray(str)) {
                if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
                    throw ERROR;
                }
            }
        } else {
            throw ERROR;
        }
        notString = true;
    }
    var bytes = 0, length = str.length;
    if (notString) {
        bytes = length;
    } else {
        for (var i = 0; i < str.length; ++i) {
            var code = str.charCodeAt(i);
            if (code < 0x80) {
                bytes += 1;
            } else if (code < 0x800) {
                bytes += 2;
            } else if (code < 0xd800 || code >= 0xe000) {
                bytes += 3;
            } else {
                code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
                bytes += 4;
            }
        }
    }
    bytes += this.encode(bytes * 8);
    this.update(str);
    return bytes;
};

Keccak.prototype.bytepad = function (strs, w) {
    var bytes = this.encode(w);
    for (var i = 0; i < strs.length; ++i) {
        bytes += this.encodeString(strs[i]);
    }
    var paddingBytes = w - bytes % w;
    var zeros = [];
    zeros.length = paddingBytes;
    this.update(zeros);
    return this;
};

Keccak.prototype.finalize = function () {
    if (this.finalized) {
        return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
    blocks[i >> 2] |= this.padding[i & 3];
    if (this.lastByteIndex === this.byteCount) {
        blocks[0] = blocks[blockCount];
        for (i = 1; i < blockCount + 1; ++i) {
            blocks[i] = 0;
        }
    }
    blocks[blockCount - 1] |= 0x80000000;
    for (i = 0; i < blockCount; ++i) {
        s[i] ^= blocks[i];
    }
    f(s);
};

Keccak.prototype.toString = Keccak.prototype.hex = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
        extraBytes = this.extraBytes, i = 0, j = 0;
    var hex = '', block;
    while (j < outputBlocks) {
        for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
            block = s[i];
            hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
                HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
                HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
                HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
        }
        if (j % blockCount === 0) {
            f(s);
            i = 0;
        }
    }
    if (extraBytes) {
        block = s[i];
        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
        if (extraBytes > 1) {
            hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
        }
        if (extraBytes > 2) {
            hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
        }
    }
    return hex;
};

Keccak.prototype.arrayBuffer = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
        extraBytes = this.extraBytes, i = 0, j = 0;
    var bytes = this.outputBits >> 3;
    var buffer;
    if (extraBytes) {
        buffer = new ArrayBuffer((outputBlocks + 1) << 2);
    } else {
        buffer = new ArrayBuffer(bytes);
    }
    var array = new Uint32Array(buffer);
    while (j < outputBlocks) {
        for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
            array[j] = s[i];
        }
        if (j % blockCount === 0) {
            f(s);
        }
    }
    if (extraBytes) {
        array[i] = s[i];
        buffer = buffer.slice(0, bytes);
    }
    return buffer;
};

Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

Keccak.prototype.digest = Keccak.prototype.array = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
        extraBytes = this.extraBytes, i = 0, j = 0;
    var array = [], offset, block;
    while (j < outputBlocks) {
        for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
            offset = j << 2;
            block = s[i];
            array[offset] = block & 0xFF;
            array[offset + 1] = (block >> 8) & 0xFF;
            array[offset + 2] = (block >> 16) & 0xFF;
            array[offset + 3] = (block >> 24) & 0xFF;
        }
        if (j % blockCount === 0) {
            f(s);
        }
    }
    if (extraBytes) {
        offset = j << 2;
        block = s[i];
        array[offset] = block & 0xFF;
        if (extraBytes > 1) {
            array[offset + 1] = (block >> 8) & 0xFF;
        }
        if (extraBytes > 2) {
            array[offset + 2] = (block >> 16) & 0xFF;
        }
    }
    return array;
};

function Kmac(bits, padding, outputBits) {
    Keccak.call(this, bits, padding, outputBits);
}

Kmac.prototype = new Keccak();

Kmac.prototype.finalize = function () {
    this.encode(this.outputBits, true);
    return Keccak.prototype.finalize.call(this);
};

var f = function (s) {
    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
        b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
        b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
        b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
    for (n = 0; n < 48; n += 2) {
        c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
        c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
        c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
        c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
        c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
        c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
        c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
        c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
        c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
        c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

        h = c8 ^ ((c2 << 1) | (c3 >>> 31));
        l = c9 ^ ((c3 << 1) | (c2 >>> 31));
        s[0] ^= h;
        s[1] ^= l;
        s[10] ^= h;
        s[11] ^= l;
        s[20] ^= h;
        s[21] ^= l;
        s[30] ^= h;
        s[31] ^= l;
        s[40] ^= h;
        s[41] ^= l;
        h = c0 ^ ((c4 << 1) | (c5 >>> 31));
        l = c1 ^ ((c5 << 1) | (c4 >>> 31));
        s[2] ^= h;
        s[3] ^= l;
        s[12] ^= h;
        s[13] ^= l;
        s[22] ^= h;
        s[23] ^= l;
        s[32] ^= h;
        s[33] ^= l;
        s[42] ^= h;
        s[43] ^= l;
        h = c2 ^ ((c6 << 1) | (c7 >>> 31));
        l = c3 ^ ((c7 << 1) | (c6 >>> 31));
        s[4] ^= h;
        s[5] ^= l;
        s[14] ^= h;
        s[15] ^= l;
        s[24] ^= h;
        s[25] ^= l;
        s[34] ^= h;
        s[35] ^= l;
        s[44] ^= h;
        s[45] ^= l;
        h = c4 ^ ((c8 << 1) | (c9 >>> 31));
        l = c5 ^ ((c9 << 1) | (c8 >>> 31));
        s[6] ^= h;
        s[7] ^= l;
        s[16] ^= h;
        s[17] ^= l;
        s[26] ^= h;
        s[27] ^= l;
        s[36] ^= h;
        s[37] ^= l;
        s[46] ^= h;
        s[47] ^= l;
        h = c6 ^ ((c0 << 1) | (c1 >>> 31));
        l = c7 ^ ((c1 << 1) | (c0 >>> 31));
        s[8] ^= h;
        s[9] ^= l;
        s[18] ^= h;
        s[19] ^= l;
        s[28] ^= h;
        s[29] ^= l;
        s[38] ^= h;
        s[39] ^= l;
        s[48] ^= h;
        s[49] ^= l;

        b0 = s[0];
        b1 = s[1];
        b32 = (s[11] << 4) | (s[10] >>> 28);
        b33 = (s[10] << 4) | (s[11] >>> 28);
        b14 = (s[20] << 3) | (s[21] >>> 29);
        b15 = (s[21] << 3) | (s[20] >>> 29);
        b46 = (s[31] << 9) | (s[30] >>> 23);
        b47 = (s[30] << 9) | (s[31] >>> 23);
        b28 = (s[40] << 18) | (s[41] >>> 14);
        b29 = (s[41] << 18) | (s[40] >>> 14);
        b20 = (s[2] << 1) | (s[3] >>> 31);
        b21 = (s[3] << 1) | (s[2] >>> 31);
        b2 = (s[13] << 12) | (s[12] >>> 20);
        b3 = (s[12] << 12) | (s[13] >>> 20);
        b34 = (s[22] << 10) | (s[23] >>> 22);
        b35 = (s[23] << 10) | (s[22] >>> 22);
        b16 = (s[33] << 13) | (s[32] >>> 19);
        b17 = (s[32] << 13) | (s[33] >>> 19);
        b48 = (s[42] << 2) | (s[43] >>> 30);
        b49 = (s[43] << 2) | (s[42] >>> 30);
        b40 = (s[5] << 30) | (s[4] >>> 2);
        b41 = (s[4] << 30) | (s[5] >>> 2);
        b22 = (s[14] << 6) | (s[15] >>> 26);
        b23 = (s[15] << 6) | (s[14] >>> 26);
        b4 = (s[25] << 11) | (s[24] >>> 21);
        b5 = (s[24] << 11) | (s[25] >>> 21);
        b36 = (s[34] << 15) | (s[35] >>> 17);
        b37 = (s[35] << 15) | (s[34] >>> 17);
        b18 = (s[45] << 29) | (s[44] >>> 3);
        b19 = (s[44] << 29) | (s[45] >>> 3);
        b10 = (s[6] << 28) | (s[7] >>> 4);
        b11 = (s[7] << 28) | (s[6] >>> 4);
        b42 = (s[17] << 23) | (s[16] >>> 9);
        b43 = (s[16] << 23) | (s[17] >>> 9);
        b24 = (s[26] << 25) | (s[27] >>> 7);
        b25 = (s[27] << 25) | (s[26] >>> 7);
        b6 = (s[36] << 21) | (s[37] >>> 11);
        b7 = (s[37] << 21) | (s[36] >>> 11);
        b38 = (s[47] << 24) | (s[46] >>> 8);
        b39 = (s[46] << 24) | (s[47] >>> 8);
        b30 = (s[8] << 27) | (s[9] >>> 5);
        b31 = (s[9] << 27) | (s[8] >>> 5);
        b12 = (s[18] << 20) | (s[19] >>> 12);
        b13 = (s[19] << 20) | (s[18] >>> 12);
        b44 = (s[29] << 7) | (s[28] >>> 25);
        b45 = (s[28] << 7) | (s[29] >>> 25);
        b26 = (s[38] << 8) | (s[39] >>> 24);
        b27 = (s[39] << 8) | (s[38] >>> 24);
        b8 = (s[48] << 14) | (s[49] >>> 18);
        b9 = (s[49] << 14) | (s[48] >>> 18);

        s[0] = b0 ^ (~b2 & b4);
        s[1] = b1 ^ (~b3 & b5);
        s[10] = b10 ^ (~b12 & b14);
        s[11] = b11 ^ (~b13 & b15);
        s[20] = b20 ^ (~b22 & b24);
        s[21] = b21 ^ (~b23 & b25);
        s[30] = b30 ^ (~b32 & b34);
        s[31] = b31 ^ (~b33 & b35);
        s[40] = b40 ^ (~b42 & b44);
        s[41] = b41 ^ (~b43 & b45);
        s[2] = b2 ^ (~b4 & b6);
        s[3] = b3 ^ (~b5 & b7);
        s[12] = b12 ^ (~b14 & b16);
        s[13] = b13 ^ (~b15 & b17);
        s[22] = b22 ^ (~b24 & b26);
        s[23] = b23 ^ (~b25 & b27);
        s[32] = b32 ^ (~b34 & b36);
        s[33] = b33 ^ (~b35 & b37);
        s[42] = b42 ^ (~b44 & b46);
        s[43] = b43 ^ (~b45 & b47);
        s[4] = b4 ^ (~b6 & b8);
        s[5] = b5 ^ (~b7 & b9);
        s[14] = b14 ^ (~b16 & b18);
        s[15] = b15 ^ (~b17 & b19);
        s[24] = b24 ^ (~b26 & b28);
        s[25] = b25 ^ (~b27 & b29);
        s[34] = b34 ^ (~b36 & b38);
        s[35] = b35 ^ (~b37 & b39);
        s[44] = b44 ^ (~b46 & b48);
        s[45] = b45 ^ (~b47 & b49);
        s[6] = b6 ^ (~b8 & b0);
        s[7] = b7 ^ (~b9 & b1);
        s[16] = b16 ^ (~b18 & b10);
        s[17] = b17 ^ (~b19 & b11);
        s[26] = b26 ^ (~b28 & b20);
        s[27] = b27 ^ (~b29 & b21);
        s[36] = b36 ^ (~b38 & b30);
        s[37] = b37 ^ (~b39 & b31);
        s[46] = b46 ^ (~b48 & b40);
        s[47] = b47 ^ (~b49 & b41);
        s[8] = b8 ^ (~b0 & b2);
        s[9] = b9 ^ (~b1 & b3);
        s[18] = b18 ^ (~b10 & b12);
        s[19] = b19 ^ (~b11 & b13);
        s[28] = b28 ^ (~b20 & b22);
        s[29] = b29 ^ (~b21 & b23);
        s[38] = b38 ^ (~b30 & b32);
        s[39] = b39 ^ (~b31 & b33);
        s[48] = b48 ^ (~b40 & b42);
        s[49] = b49 ^ (~b41 & b43);

        s[0] ^= RC[n];
        s[1] ^= RC[n + 1];
    }
};

module.exports = methods;

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":35}],52:[function(require,module,exports){
(function (Buffer){(function (){
var jsSHA = require('jssha');
var sha512256 = require('js-sha512').sha512_256
var Blake256 = require('./blake256');
var keccak256 = require('./sha3')['keccak256'];
var Blake2B = require('./blake2b');
var base58 = require('./base58');
var base32 = require('./base32');
var BigNum = require('browserify-bignum');

function numberToHex(number, length) {
    var hex = number.toString(16);
    if (hex.length % 2 === 1) {
        hex = '0' + hex;
    }
    return hex.padStart(length, '0');
}

function isHexChar(c) {
    if ((c >= 'A' && c <= 'F') ||
        (c >= 'a' && c <= 'f') ||
        (c >= '0' && c <= '9')) {
        return 1;
    }
    return 0;
}

/* Convert a hex char to value */
function hexChar2byte(c) {
    var d = 0;
    if (c >= 'A' && c <= 'F') {
        d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    }
    else if (c >= 'a' && c <= 'f') {
        d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
    }
    else if (c >= '0' && c <= '9') {
        d = c.charCodeAt(0) - '0'.charCodeAt(0);
    }
    return d;
}

/* Convert a byte to string */
function byte2hexStr(byte) {
    var hexByteMap = "0123456789ABCDEF";
    var str = "";
    str += hexByteMap.charAt(byte >> 4);
    str += hexByteMap.charAt(byte & 0x0f);
    return str;
}

function byteArray2hexStr(byteArray) {
    var str = "";
    for (var i = 0; i < (byteArray.length - 1); i++) {
        str += byte2hexStr(byteArray[i]);
    }
    str += byte2hexStr(byteArray[i]);
    return str;
}

function hexStr2byteArray(str) {
    var byteArray = Array();
    var d = 0;
    var i = 0;
    var j = 0;
    var k = 0;

     for (i = 0; i < str.length; i++) {
        var c = str.charAt(i);
        if (isHexChar(c)) {
            d <<= 4;
            d += hexChar2byte(c);
            j++;
            if (0 === (j % 2)) {
                byteArray[k++] = d;
                d = 0;
            }
        }
    }
    return byteArray;
}

module.exports = {
    numberToHex: numberToHex,
    toHex: function (arrayOfBytes) {
        var hex = '';
        for (var i = 0; i < arrayOfBytes.length; i++) {
            hex += numberToHex(arrayOfBytes[i]);
        }
        return hex;
    },
    sha256: function (payload, format = 'HEX') {
        var sha = new jsSHA('SHA-256', format);
        sha.update(payload);
        return sha.getHash(format);
    },
    sha256x2: function (buffer, format = 'HEX') {
        return this.sha256(this.sha256(buffer, format), format);
    },
    sha256Checksum: function (payload) {
        return this.sha256(this.sha256(payload)).substr(0, 8);
    },
    sha512_256: function (payload, format = 'HEX') {
        const hash = sha512256.create()
        hash.update(Buffer.from(payload, format))
        return hash.hex().toUpperCase();
    },
    blake256: function (hexString) {
        return new Blake256().update(hexString, 'hex').digest('hex');
    },
    blake256Checksum: function (payload) {
        return this.blake256(this.blake256(payload)).substr(0, 8);
    },
    blake2b: function (hexString, outlen) {
        return new Blake2B(outlen).update(Buffer.from(hexString, 'hex')).digest('hex');
    },
    keccak256: function (hexString) {
        return keccak256(hexString);
    },
    keccak256Checksum: function (payload) {
        return keccak256(payload).toString().substr(0, 8);
    },
    blake2b256: function (hexString) {
        return new Blake2B(32).update(Buffer.from(hexString, 'hex'), 32).digest('hex');
    },
    base58: base58.decode,
    byteArray2hexStr: byteArray2hexStr,
    hexStr2byteArray: hexStr2byteArray,
    bigNumberToBuffer: function(bignumber, size){
        return new BigNum(bignumber).toBuffer({ size, endian: 'big' });
    },
    base32: base32
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"./base32":43,"./base58":44,"./blake256":47,"./blake2b":48,"./sha3":51,"browserify-bignum":3,"buffer":4,"js-sha512":32,"jssha":33}],53:[function(require,module,exports){
var XRPValidator = require('./ripple_validator');
var ETHValidator = require('./ethereum_validator');
var BTCValidator = require('./bitcoin_validator');
var ADAValidator = require('./ada_validator');
var XMRValidator = require('./monero_validator');
var NANOValidator = require('./nano_validator');
var SCValidator = require('./siacoin_validator');
var TRXValidator = require('./tron_validator');
var NEMValidator = require('./nem_validator');
var LSKValidator = require('./lisk_validator');
var BCHValidator = require('./bch_validator');
var XLMValidator = require('./stellar_validator');
var EOSValidator = require('./eos_validator');
var XTZValidator = require('./tezos_validator');
var USDTValidator = require('./usdt_validator');
var AlgoValidator = require('./algo_validator');
var DotValidator = require('./dot_validator');
var BIP173Validator = require('./bip173_validator')
var Base58Validator = require('./base58_validator')

// defines P2PKH and P2SH address types for standard (prod) and testnet networks
var CURRENCIES = [{
        name: 'Bitcoin',
        symbol: 'btc',
        addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4', '3c', '26'] },
        bech32Hrp: { prod: ['bc'], testnet: ['tb'] },
        validator: BTCValidator
    }, {
        name: 'BitcoinCash',
        symbol: 'bch',
        regexp: '^[qQpP]{1}[0-9a-zA-Z]{41}$',
        addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4'] },
        validator: BCHValidator
    }, {
        name: 'Bitcoin SV',
        symbol: 'bsv',
        regexp: '^[qQ]{1}[0-9a-zA-Z]{41}$',
        addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4'] },
        validator: BCHValidator
    }, {
        name: 'LiteCoin',
        symbol: 'ltc',
        addressTypes: { prod: ['30', '05', '32'], testnet: ['6f', 'c4', '3a'] },
        bech32Hrp: { prod: ['ltc'], testnet: ['tltc'] },
        validator: BTCValidator
    }, {
        name: 'PeerCoin',
        symbol: 'ppc',
        addressTypes: { prod: ['37', '75'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'DogeCoin',
        symbol: 'doge',
        addressTypes: { prod: ['1e', '16'], testnet: ['71', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'BeaverCoin',
        symbol: 'bvc',
        addressTypes: { prod: ['19', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator,
    }, {
        name: 'FreiCoin',
        symbol: 'frc',
        addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'ProtoShares',
        symbol: 'pts',
        addressTypes: { prod: ['38', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'MegaCoin',
        symbol: 'mec',
        addressTypes: { prod: ['32', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'PrimeCoin',
        symbol: 'xpm',
        addressTypes: { prod: ['17', '53'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'AuroraCoin',
        symbol: 'aur',
        addressTypes: { prod: ['17', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'NameCoin',
        symbol: 'nmc',
        addressTypes: { prod: ['34'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'BioCoin',
        symbol: 'bio',
        addressTypes: { prod: ['19', '14'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'GarliCoin',
        symbol: 'grlc',
        addressTypes: { prod: ['26', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'VertCoin',
        symbol: 'vtc',
        addressTypes: { prod: ['0x', '47', '71', '05'], testnet: ['6f', 'c4'] },
        validator: BTCValidator

    }, {
        name: 'BitcoinGold',
        symbol: 'btg',
        addressTypes: { prod: ['26', '17'], testnet: ['6f', 'c4'] },
        validator: BTCValidator
    }, {
        name: 'Komodo',
        symbol: 'kmd',
        addressTypes: { prod: ['3c', '55'], testnet: ['0', '5'] },
        validator: BTCValidator
    }, {
        name: 'BitcoinZ',
        symbol: 'btcz',
        expectedLength: 26,
        addressTypes: { prod: ['1cb8', '1cbd'], testnet: ['1d25', '1cba'] },
        validator: BTCValidator
    }, {
        name: 'BitcoinPrivate',
        symbol: 'btcp',
        expectedLength: 26,
        addressTypes: { prod: ['1325', '13af'], testnet: ['1957', '19e0'] },
        validator: BTCValidator
    }, {
        name: 'Hush',
        symbol: 'hush',
        expectedLength: 26,
        addressTypes: { prod: ['1cb8', '1cbd'], testnet: ['1d25', '1cba'] },
        validator: BTCValidator
    }, {
        name: 'SnowGem',
        symbol: 'sng',
        expectedLength: 26,
        addressTypes: { prod: ['1c28', '1c2d'], testnet: ['1d25', '1cba'] },
        validator: BTCValidator
    }, {
        name: 'ZCash',
        symbol: 'zec',
        expectedLength: 26,
        addressTypes: { prod: ['1cb8', '1cbd'], testnet: ['1d25', '1cba'] },
        validator: BTCValidator
    }, {
        name: 'ZClassic',
        symbol: 'zcl',
        expectedLength: 26,
        addressTypes: { prod: ['1cb8', '1cbd'], testnet: ['1d25', '1cba'] },
        validator: BTCValidator
    }, {
        name: 'ZenCash',
        symbol: 'zen',
        expectedLength: 26,
        addressTypes: { prod: ['2089', '2096'], testnet: ['2092', '2098'] },
        validator: BTCValidator
    }, {
        name: 'VoteCoin',
        symbol: 'vot',
        expectedLength: 26,
        addressTypes: { prod: ['1cb8', '1cbd'], testnet: ['1d25', '1cba'] },
        validator: BTCValidator
    }, {
        name: 'Decred',
        symbol: 'dcr',
        addressTypes: { prod: ['073f', '071a'], testnet: ['0f21', '0efc'] },
        hashFunction: 'blake256',
        expectedLength: 26,
        validator: BTCValidator
    }, {
        name: 'GameCredits',
        symbol: 'game',
        addressTypes: { prod: ['26', '05'], testnet: [] },
        validator: ETHValidator
    }, {
        name: 'PIVX',
        symbol: 'pivx',
        addressTypes: { prod: ['1e', '0d'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'SolarCoin',
        symbol: 'slr',
        addressTypes: { prod: ['12', '05'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'MonaCoin',
        symbol: 'mona',
        addressTypes: { prod: ['32', '37'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'DigiByte',
        symbol: 'dgb',
        addressTypes: { prod: ['1e', '3f'], testnet: [] },
        bech32Hrp: { prod: ['dgb', 'S'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'Tether',
        symbol: 'usdt',
        addressTypes: { prod: ['00', '05'], testnet: ['6f', 'c4'] },
        validator: USDTValidator
    }, {
        name: 'Ripple',
        symbol: 'xrp',
        validator: XRPValidator,
    }, {
        name: 'Dash',
        symbol: 'dash',
        addressTypes: { prod: ['4c', '10'], testnet: ['8c', '13'] },
        validator: BTCValidator
    }, {
        name: 'Neo',
        symbol: 'neo',
        addressTypes: { prod: ['17'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'NeoGas',
        symbol: 'gas',
        addressTypes: { prod: ['17'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'Qtum',
        symbol: 'qtum',
        addressTypes: { prod: ['3a', '32'], testnet: ['78', '6e'] },
        validator: BTCValidator
    }, {
        name: 'Waves',
        symbol: 'waves',
        addressTypes: { prod: ['0157'], testnet: ['0154'] },
        expectedLength: 26,
        hashFunction: 'blake256keccak256',
        regex: /^[a-zA-Z0-9]{35}$/,
        validator: BTCValidator
    }, {
        name: 'Ethereum',
        symbol: 'eth',
        validator: ETHValidator,
    }, {
        name: 'EtherZero',
        symbol: 'etz',
        validator: ETHValidator,
    }, {
        name: 'EthereumClassic',
        symbol: 'etc',
        validator: ETHValidator,
    }, {
        name: 'Callisto',
        symbol: 'clo',
        validator: ETHValidator,
    }, {
        name: 'Bankex',
        symbol: 'bkx',
        validator: ETHValidator
    }, {
        name: 'Cardano',
        symbol: 'ada',
        bech32Hrp: { prod: ['addr'], testnet: ['addr']},
        validator: ADAValidator
    }, {
        name: 'Monero',
        symbol: 'xmr',
        addressTypes: { prod: ['18', '42'], testnet: ['53', '63'], stagenet: ['24'] },
        iAddressTypes: { prod: ['19'], testnet: ['54'], stagenet: ['25'] },
        validator: XMRValidator
    }, {
        name: 'Aragon',
        symbol: 'ant',
        validator: ETHValidator
    }, {
        name: 'Basic Attention Token',
        symbol: 'bat',
        validator: ETHValidator
    }, {
        name: 'Bancor',
        symbol: 'bnt',
        validator: ETHValidator
    }, {
        name: 'Civic',
        symbol: 'cvc',
        validator: ETHValidator
    }, {
        name: 'District0x',
        symbol: 'dnt',
        validator: ETHValidator
    }, {
        name: 'Gnosis',
        symbol: 'gno',
        validator: ETHValidator
    }, {
        name: 'Golem (GNT)',
        symbol: 'gnt',
        validator: ETHValidator
    }, {
        name: 'Golem',
        symbol: 'glm',
        validator: ETHValidator
    },  {
        name: 'Matchpool',
        symbol: 'gup',
        validator: ETHValidator
    }, {
        name: 'Melon',
        symbol: 'mln',
        validator: ETHValidator
    }, {
        name: 'Numeraire',
        symbol: 'nmr',
        validator: ETHValidator
    }, {
        name: 'OmiseGO',
        symbol: 'omg',
        validator: ETHValidator
    }, {
        name: 'TenX',
        symbol: 'pay',
        validator: ETHValidator
    }, {
        name: 'Ripio Credit Network',
        symbol: 'rcn',
        validator: ETHValidator
    }, {
        name: 'Augur',
        symbol: 'rep',
        validator: ETHValidator
    }, {
        name: 'iExec RLC',
        symbol: 'rlc',
        validator: ETHValidator
    }, {
        name: 'Salt',
        symbol: 'salt',
        validator: ETHValidator
    }, {
        name: 'Status',
        symbol: 'snt',
        validator: ETHValidator
    }, {
        name: 'Storj',
        symbol: 'storj',
        validator: ETHValidator
    }, {
        name: 'Swarm City',
        symbol: 'swt',
        validator: ETHValidator
    }, {
        name: 'TrueUSD',
        symbol: 'tusd',
        validator: ETHValidator
    }, {
        name: 'Wings',
        symbol: 'wings',
        validator: ETHValidator
    }, {
        name: '0x',
        symbol: 'zrx',
        validator: ETHValidator
    }, {
        name: 'Expanse',
        symbol: 'exp',
        validator: ETHValidator
    }, {
        name: 'Viberate',
        symbol: 'vib',
        validator: ETHValidator
    }, {
        name: 'Odyssey',
        symbol: 'ocn',
        validator: ETHValidator
    }, {
        name: 'Polymath',
        symbol: 'poly',
        validator: ETHValidator
    }, {
        name: 'Storm',
        symbol: 'storm',
        validator: ETHValidator
    }, {
        name: 'Nano',
        symbol: 'nano',
        validator: NANOValidator,
    }, {
        name: 'RaiBlocks',
        symbol: 'xrb',
        validator: NANOValidator,
    }, {
        name: 'Siacoin',
        symbol: 'sc',
        validator: SCValidator
    }, {
        name: 'HyperSpace',
        symbol: 'xsc',
        validator: SCValidator
    }, {
        name: 'loki',
        symbol: 'loki',
        addressTypes: { prod: ['114', '115', '116'], testnet: [] },
        iAddressTypes: { prod: ['115'], testnet: [] },
        validator: XMRValidator
    }, {
        name: 'LBRY Credits',
        symbol: 'lbc',
        addressTypes: { prod: ['55'], testnet: [] },
        validator: BTCValidator
    }, {
        name: 'Tron',
        symbol: 'trx',
        addressTypes: { prod: [0x41], testnet: [0xa0] },
        validator: TRXValidator
    }, {
        name: 'Nem',
        symbol: 'xem',
        validator: NEMValidator
    }, {
        name: 'Lisk',
        symbol: 'lsk',
        validator: LSKValidator
    }, {
        name: 'Stellar',
        symbol: 'xlm',
        validator: XLMValidator,
    }, {
        name: 'BTU Protocol',
        symbol: 'btu',
        validator: ETHValidator,
    }, {
        name: 'Crypto.com Coin',
        symbol: 'cro',
        bech32Hrp: { prod: ['cro'], testnet: ['tcro']},
        validator: BIP173Validator,
    }, {
        name: 'Multi-collateral DAI',
        symbol: 'dai',
        validator: ETHValidator,
    }, {
        name: 'Enjin Coin',
        symbol: 'enj',
        validator: ETHValidator,
    }, {
        name: 'HedgeTrade',
        symbol: 'hedg',
        validator: ETHValidator,
    }, {
        name: 'Cred',
        symbol: 'lba',
        validator: ETHValidator,
    }, {
        name: 'Chainlink',
        symbol: 'link',
        validator: ETHValidator,
    }, {
        name: 'Loom Network',
        symbol: 'loom',
        validator: ETHValidator,
    }, {
        name: 'Maker',
        symbol: 'mkr',
        validator: ETHValidator,
    }, {
        name: 'Metal',
        symbol: 'mtl',
        validator: ETHValidator,
    }, {
        name: 'Ocean Protocol',
        symbol: 'ocean',
        validator: ETHValidator,
    }, {
        name: 'Quant',
        symbol: 'qnt',
        validator: ETHValidator,
    }, {
        name: 'Synthetix Network',
        symbol: 'snx',
        validator: ETHValidator,
    }, {
        name: 'SOLVE',
        symbol: 'solve',
        validator: ETHValidator,
    }, {
        name: 'Spendcoin',
        symbol: 'spnd',
        validator: ETHValidator,
    }, {
        name: 'TEMCO',
        symbol: 'temco',
        validator: ETHValidator,
    }, {
        name: 'EOS',
        symbol: 'eos',
        validator: EOSValidator
    }, {
        name: 'Tezos',
        symbol: 'xtz',
        validator: XTZValidator
    }, {
        name: 'VeChain',
        symbol: 'vet',
        validator: ETHValidator
    },
    {
        name: 'StormX',
        symbol: 'stmx',
        validator: ETHValidator
    },
    {
        name: 'AugurV2',
        symbol: 'repv2',
        validator: ETHValidator
    },
    {
        name: 'FirmaChain',
        symbol: 'fct',
        validator: ETHValidator
    },
    {
        name: 'BlockTrade',
        symbol: 'btt',
        validator: ETHValidator
    },
    {
        name: 'Quantum Resistant Ledger',
        symbol: 'qrl',
        validator: ETHValidator
    },
    {
        name: 'Serve',
        symbol: 'serv',
        validator: ETHValidator
    },
    {
        name: 'Tap',
        symbol: 'xtp',
        validator: ETHValidator
    },
    {
        name: 'Compound',
        symbol: 'comp',
        validator: ETHValidator
    },
    {
        name: 'Paxos',
        symbol: 'pax',
        validator: ETHValidator
    },
    {
        name: 'USD Coin',
        symbol: 'usdc',
        validator: ETHValidator
    },
    {
        name: 'CUSD',
        symbol: 'cusd',
        validator: ETHValidator
    },
    {
        name: 'Algorand',
        symbol: 'algo',
        validator: AlgoValidator
    },
    {
        name: 'Polkadot',
        symbol: 'dot',
        validator: DotValidator
    },
    {
        name: 'Uniswap Coin',
        symbol: 'uni',
        validator: ETHValidator
    },
    {
        name: 'Aave Coin',
        symbol: 'aave',
        validator: ETHValidator
    },
    {
        name: 'Matic',
        symbol: 'matic',
        validator: ETHValidator
    },
    {
        name: 'Decentraland',
        symbol: 'mana',
        validator: ETHValidator
    },
    {
        name: 'Solana',
        symbol: 'sol',
        validator: Base58Validator,
        maxLength: 44,
        minLength: 43
    },
    {
        name: 'Binance',
        symbol: 'bnb',
        validator: ETHValidator,
    },
    {
        name: 'Avalanche',
        symbol: 'avax',
        validator: ETHValidator,
    },
    {
        name: 'Ravencoin',
        symbol: 'rvn',
        validator: BTCValidator,
        addressTypes: { prod: ['3c', '7a'] }
    },
];


    module.exports = {
    getByNameOrSymbol: function (currencyNameOrSymbol) {
        var nameOrSymbol = currencyNameOrSymbol.toLowerCase();
        return CURRENCIES.find(function (currency) {
            return currency.name.toLowerCase() === nameOrSymbol || currency.symbol.toLowerCase() === nameOrSymbol
        });
    },
    getAll: function () {
        return CURRENCIES;
    }
};

////spit out details for readme.md
// CURRENCIES
//     .sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1)
//     .forEach(c => console.log(`* ${c.name}/${c.symbol} \`'${c.name}'\` or \`'${c.symbol}'\` `));

////spit out keywords for package.json
// CURRENCIES
//     .sort((a, b) => a.name.toUpperCase() > b.name.toUpperCase() ? 1 : -1)
//     .forEach(c => console.log(`"${c.name}","${c.symbol}",`));
//


},{"./ada_validator":37,"./algo_validator":38,"./base58_validator":39,"./bch_validator":40,"./bip173_validator":41,"./bitcoin_validator":42,"./dot_validator":54,"./eos_validator":55,"./ethereum_validator":56,"./lisk_validator":57,"./monero_validator":58,"./nano_validator":59,"./nem_validator":60,"./ripple_validator":61,"./siacoin_validator":62,"./stellar_validator":63,"./tezos_validator":64,"./tron_validator":65,"./usdt_validator":66}],54:[function(require,module,exports){
const cryptoUtils = require('./crypto/utils');

// from https://github.com/paritytech/substrate/wiki/External-Address-Format-(SS58)
const addressFormats = [
    { addressLength: 3, accountIndexLength: 1, checkSumLength: 1 },
    { addressLength: 4, accountIndexLength: 2, checkSumLength: 1 },
    { addressLength: 5, accountIndexLength: 2, checkSumLength: 2 },
    { addressLength: 6, accountIndexLength: 4, checkSumLength: 1 },
    { addressLength: 7, accountIndexLength: 4, checkSumLength: 2 },
    { addressLength: 8, accountIndexLength: 4, checkSumLength: 3 },
    { addressLength: 9, accountIndexLength: 4, checkSumLength: 4 },
    { addressLength: 10, accountIndexLength: 8, checkSumLength: 1 },
    { addressLength: 11, accountIndexLength: 8, checkSumLength: 2 },
    { addressLength: 12, accountIndexLength: 8, checkSumLength: 3 },
    { addressLength: 13, accountIndexLength: 8, checkSumLength: 4 },
    { addressLength: 14, accountIndexLength: 8, checkSumLength: 5 },
    { addressLength: 15, accountIndexLength: 8, checkSumLength: 6 },
    { addressLength: 16, accountIndexLength: 8, checkSumLength: 7 },
    { addressLength: 17, accountIndexLength: 8, checkSumLength: 8 },
    { addressLength: 34, accountIndexLength: 32, checkSumLength: 2 },
];

module.exports = {
    isValidAddress: function (address, currency, opts = {}) {
        const { networkType = 'prod' } = opts;

        return this.verifyChecksum(address)
    },

    verifyChecksum: function (address) {

        try {
            const preImage = '53533538505245'

            const decoded = cryptoUtils.base58(address);
            const addressType = cryptoUtils.byteArray2hexStr(decoded.slice(0, 1));
            const addressAndChecksum = decoded.slice(1)

            // get the address format
            const addressFormat = addressFormats.find(af => af.addressLength === addressAndChecksum.length);

            if (!addressFormat) {
                throw new Error('Invalid address length');
            }

            const decodedAddress = cryptoUtils.byteArray2hexStr(addressAndChecksum.slice(0, addressFormat.accountIndexLength));
            const checksum = cryptoUtils.byteArray2hexStr(addressAndChecksum.slice(-addressFormat.checkSumLength));

            const calculatedHash = cryptoUtils
                .blake2b(preImage + addressType + decodedAddress, 64)
                .substr(0, addressFormat.checkSumLength * 2)
                .toUpperCase();

            return calculatedHash == checksum;
        } catch(err) {
            return false;
        }
    }
}

},{"./crypto/utils":52}],55:[function(require,module,exports){
function isValidEOSAddress (address, currency, networkType) {
  var regex = /^[a-z0-9.]+$/g // Must be numbers, lowercase letters and decimal points only
  if (address.search(regex) !== -1 && address.length === 12) {
    return true
  } else {
    return false
  }
}

module.exports = {
  isValidAddress: function (address, currency, networkType) {
    return isValidEOSAddress(address, currency, networkType)
  }
}

},{}],56:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils');

module.exports = {
    isValidAddress: function (address) {
        if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
            // Check if it has the basic requirements of an address
            return false;
        }

        if (/^0x[0-9a-f]{40}$/.test(address) || /^0x?[0-9A-F]{40}$/.test(address)) {
            // If it's all small caps or all all caps, return true
            return true;
        }

        // Otherwise check each case
        return this.verifyChecksum(address);
    },
    verifyChecksum: function (address) {
        // Check each case
        address = address.replace('0x','');

        var addressHash = cryptoUtils.keccak256(address.toLowerCase());

        for (var i = 0; i < 40; i++ ) {
            // The nth letter should be uppercase if the nth digit of casemap is 1
            if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) ||
                (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
                return false;
            }
        }

        return true;
    }
};

},{"./crypto/utils":52}],57:[function(require,module,exports){
(function (Buffer){(function (){
var cryptoUtils = require('./crypto/utils');

var regexp = new RegExp('^[0-9]{1,20}L$');

module.exports = {
    isValidAddress: function(address) {
        if (!regexp.test(address)) {
            return false;
        }
        return this.verifyAddress(address)
    },

    verifyAddress: function(address) {
        var BUFFER_SIZE = 8;
        var bigNumber = address.substring(0, address.length - 1);
        var addressBuffer = cryptoUtils.bigNumberToBuffer(bigNumber);
        return Buffer.from(addressBuffer).slice(0, BUFFER_SIZE).equals(addressBuffer);
    }
};
}).call(this)}).call(this,require("buffer").Buffer)
},{"./crypto/utils":52,"buffer":4}],58:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils')
var cnBase58 = require('./crypto/cnBase58')

var DEFAULT_NETWORK_TYPE = 'prod'
var addressRegTest = new RegExp(
  '^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{95}$'
)
var integratedAddressRegTest = new RegExp(
  '^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{106}$'
)

function validateNetwork(decoded, currency, networkType, addressType) {
  var network = currency.addressTypes
  if (addressType == 'integrated') {
    network = currency.iAddressTypes
  }
  var at = parseInt(decoded.substr(0, 2), 16).toString()

  switch (networkType) {
    case 'prod':
      return network.prod.indexOf(at) >= 0
    case 'testnet':
      return network.testnet.indexOf(at) >= 0
    case 'stagenet':
      return network.stagenet.indexOf(at) >= 0
    case 'both':
      return network.prod.indexOf(at) >= 0 || network.testnet.indexOf(at) >= 0 || network.stagenet.indexOf(at) >= 0
    default:
      return false
  }
}

function hextobin(hex) {
  if (hex.length % 2 !== 0) return null
  var res = new Uint8Array(hex.length / 2)
  for (var i = 0; i < hex.length / 2; ++i) {
    res[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return res
}

module.exports = {
  isValidAddress: function(address, currency, opts = {}) {
    const { networkType = DEFAULT_NETWORK_TYPE} = opts;
    var addressType = 'standard'
    if (!addressRegTest.test(address)) {
      if (integratedAddressRegTest.test(address)) {
        addressType = 'integrated'
      } else {
        return false
      }
    }

    var decodedAddrStr = cnBase58.decode(address)
    if (!decodedAddrStr) return false

    if (!validateNetwork(decodedAddrStr, currency, networkType, addressType)) return false

    var addrChecksum = decodedAddrStr.slice(-8)
    var hashChecksum = cryptoUtils.keccak256Checksum(hextobin(decodedAddrStr.slice(0, -8)))

    return addrChecksum === hashChecksum
  }
}

},{"./crypto/cnBase58":49,"./crypto/utils":52}],59:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils');
var baseX = require('base-x');

var ALLOWED_CHARS = '13456789abcdefghijkmnopqrstuwxyz';

var codec = baseX(ALLOWED_CHARS);
// https://github.com/nanocurrency/raiblocks/wiki/Accounts,-Keys,-Seeds,-and-Wallet-Identifiers
var regexp = new RegExp('^(xrb|nano)_([' + ALLOWED_CHARS + ']{60})$');

module.exports = {
    isValidAddress: function (address) {
        if (regexp.test(address)) {
            return this.verifyChecksum(address);
        }

        return false;
    },

    verifyChecksum: function (address) {
        var bytes = codec.decode(regexp.exec(address)[2]).slice(-37);
        // https://github.com/nanocurrency/raiblocks/blob/master/rai/lib/numbers.cpp#L73
        var computedChecksum = cryptoUtils.blake2b(cryptoUtils.toHex(bytes.slice(0, -5)), 5);
        var checksum = cryptoUtils.toHex(bytes.slice(-5).reverse());

        return computedChecksum === checksum
    }
};

},{"./crypto/utils":52,"base-x":1}],60:[function(require,module,exports){
(function (Buffer){(function (){
var cryptoUtils = require('./crypto/utils');

 /**
* Check if an address is valid
*
* @param {string} _address - An address
*
* @return {boolean} - True if address is valid, false otherwise
*/
var isValidAddress = function(_address) {
    var address = _address.toString().toUpperCase().replace(/-/g, '');
    if (!address || address.length !== 40) {
        return false;
    }
    var decoded = cryptoUtils.toHex(cryptoUtils.base32.b32decode(address));
    var stepThreeChecksum = cryptoUtils.keccak256Checksum(Buffer.from(decoded.slice(0, 42), 'hex'));

    return stepThreeChecksum === decoded.slice(42);
};

module.exports = {
    isValidAddress: isValidAddress,
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"./crypto/utils":52,"buffer":4}],61:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils');
var baseX = require('base-x');

var ALLOWED_CHARS = 'rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz';

var codec = baseX(ALLOWED_CHARS);
var regexp = new RegExp('^r[' + ALLOWED_CHARS + ']{27,35}$');

module.exports = {
    /**
     * ripple address validation
     */
    isValidAddress: function (address) {
        if (regexp.test(address)) {
            return this.verifyChecksum(address);
        }

        return false;
    },

    verifyChecksum: function (address) {
        var bytes = codec.decode(address);
        var computedChecksum = cryptoUtils.sha256Checksum(cryptoUtils.toHex(bytes.slice(0, -4)));
        var checksum = cryptoUtils.toHex(bytes.slice(-4));

        return computedChecksum === checksum
    }
};

},{"./crypto/utils":52,"base-x":1}],62:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils')
var isEqual = require('lodash.isequal')

function hexToBytes(hex) {
  var bytes = []
  for (var c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }
  return bytes
}

module.exports = {
  isValidAddress: function(address) {
    if (address.length !== 76) {
      // Check if it has the basic requirements of an address
      return false
    }

    // Otherwise check each case
    return this.verifyChecksum(address)
  },
  verifyChecksum: function(address) {
    var checksumBytes = address.slice(0, 32*2)
    var check = address.slice(32*2, 38*2)
    var blakeHash = cryptoUtils.blake2b(checksumBytes, 32).slice(0, 6*2)
    return !!isEqual(blakeHash, check)
  }
}

},{"./crypto/utils":52,"lodash.isequal":34}],63:[function(require,module,exports){
var baseX = require('base-x');
var crc = require('crc');
var cryptoUtils = require('./crypto/utils');

var ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

var base32 = baseX(ALPHABET);
var regexp = new RegExp('^[' + ALPHABET + ']{56}$');
var ed25519PublicKeyVersionByte = (6 << 3);

function swap16(number) {
    var lower = number & 0xFF;
    var upper = (number >> 8) & 0xFF;
    return (lower << 8) | upper;
}

module.exports = {
    isValidAddress: function (address) {
        if (regexp.test(address)) {
            return this.verifyChecksum(address);
        }

        return false;
    },

    verifyChecksum: function (address) {
        // based on https://github.com/stellar/js-stellar-base/blob/master/src/strkey.js#L126
        var bytes = base32.decode(address);
        if (bytes[0] !== ed25519PublicKeyVersionByte) {
            return false;
        }

        var computedChecksum = cryptoUtils.numberToHex(swap16(crc.crc16xmodem(bytes.slice(0, -2))), 4);
        var checksum = cryptoUtils.toHex(bytes.slice(-2));

        return computedChecksum === checksum
    }
};

},{"./crypto/utils":52,"base-x":1,"crc":30}],64:[function(require,module,exports){
const base58 = require('./crypto/base58');
const cryptoUtils = require('./crypto/utils');

const prefix = new Uint8Array([6, 161, 159]);

function decodeRaw(buffer) {
    let payload = buffer.slice(0, -4);
    let checksum = buffer.slice(-4);
    let newChecksum = cryptoUtils.hexStr2byteArray(
        cryptoUtils.sha256x2(cryptoUtils.byteArray2hexStr(payload))
    );

    if (checksum[0] ^ newChecksum[0] |
        checksum[1] ^ newChecksum[1] |
        checksum[2] ^ newChecksum[2] |
        checksum[3] ^ newChecksum[3])
        return;
    return payload;
}

const isValidAddress = function(address) {
    try {
        let buffer = base58.decode(address);
        let payload = decodeRaw(buffer);
        if (!payload)
            return false;
        payload.slice(prefix.length);
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = {
    isValidAddress
};

},{"./crypto/base58":44,"./crypto/utils":52}],65:[function(require,module,exports){
var cryptoUtils = require('./crypto/utils');

function decodeBase58Address(base58Sting) {
    if (typeof (base58Sting) !== 'string') {
        return false;
    }
    if (base58Sting.length <= 4) {
        return false;
    }

    try {
        var address = cryptoUtils.base58(base58Sting);
    } catch (e) {
        return false
    }

    /*if (base58Sting.length <= 4) {
        return false;
    }*/
    var len = address.length;
    var offset = len - 4;
    var checkSum = address.slice(offset);
    address = address.slice(0, offset);
    var hash0 = cryptoUtils.sha256(cryptoUtils.byteArray2hexStr(address));
    var hash1 = cryptoUtils.hexStr2byteArray(cryptoUtils.sha256(hash0));
    var checkSum1 = hash1.slice(0, 4);
    if (checkSum[0] === checkSum1[0] && checkSum[1] === checkSum1[1] && checkSum[2]
        === checkSum1[2] && checkSum[3] === checkSum1[3]
    ) {
        return address;
    }

    return false;
}

function getEnv(currency, networkType) {
    var evn = networkType || 'prod';

    if (evn !== 'prod' && evn !== 'testnet') evn = 'prod';

    return currency.addressTypes[evn][0]
}

module.exports = {
    /**
     * tron address validation
     */
    isValidAddress: function (mainAddress, currency, opts) {
        var networkType = opts ? opts.networkType : '';
        var address = decodeBase58Address(mainAddress);

        if (!address) {
            return false;
        }

        if (address.length !== 21) {
            return false;
        }

        return getEnv(currency, networkType) === address[0];
    }
};

},{"./crypto/utils":52}],66:[function(require,module,exports){
var BTCValidator = require('./bitcoin_validator');
var ETHValidator = require('./ethereum_validator');

function checkBothValidators(address, currency, networkType) {
    var result = BTCValidator.isValidAddress(address, currency, networkType);
    return result ? result :
        ETHValidator.isValidAddress(address, currency, networkType);
}

module.exports = {
    isValidAddress: function (address, currency, opts) {
        if (opts) {
            if (opts.chainType === 'erc20') {
                return ETHValidator.isValidAddress(address, currency, opts.networkType);
            } else if (opts.chainType === 'omni') {
                return BTCValidator.isValidAddress(address, currency, opts.networkType);
            }
        }
        return checkBothValidators(address, currency, opts);
    }
};

},{"./bitcoin_validator":42,"./ethereum_validator":56}],67:[function(require,module,exports){
var currencies = require('./currencies');

var DEFAULT_CURRENCY_NAME = 'bitcoin';

module.exports = {
    //validate: function (address, currencyNameOrSymbol, networkType) {
    validate: function (address, currencyNameOrSymbol, opts) {
        var currency = currencies.getByNameOrSymbol(currencyNameOrSymbol || DEFAULT_CURRENCY_NAME);

        if (currency && currency.validator) {
            if (opts && typeof opts === 'string') {
                return currency.validator.isValidAddress(address, currency, { networkType: opts });
            }
            return currency.validator.isValidAddress(address, currency, opts);
        }

        throw new Error('Missing validator for currency: ' + currencyNameOrSymbol);
    },
    getCurrencies: function () {
        return currencies.getAll();
    },
    findCurrency: function(symbol) {
        return currencies.getByNameOrSymbol(symbol) || null ;
    }
};

},{"./currencies":53}]},{},[67])(67)
});
