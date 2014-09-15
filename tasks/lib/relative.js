// 'use strict';
var util = require('util');
var fs = require('fs');
var path = require('path');
var pwd = process.cwd();
var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');

var scriptExtern = '<script[^>]*? src=[\'"](.+?)[\'"].*<\/script>';
var styleExtern = '<link[^>]*? href=[\'"](.+?)[\'"].*>';

var JS_Files = [];
var CSS_Files = [];
var CONTENT = '';

/*
 var x = read('xx.html');
 console.log(parse(x.toString('utf8')));
 console.log(JS_Files);
 console.log(CSS_Files);
 */

function parse(content, relative, filep) {
    var relative = relative || '';
    CONTENT = '';
    JS_Files = [];
    CSS_Files = [];
    content = css(content, relative, filep);
    content = js(content, relative, filep);
    return {
        // content:insertScript(recall(content)),
        content: recall(content),
        js: distinct(JS_Files),
        css: distinct(CSS_Files)
    };
}

function inArray(v, a) {
    var o = false;
    for (var i = 0, m = a.length; i < m; i++) {
        if (a[i] == v) {
            o = true;
            break;
        }
    }
    return o;
}

function distinct(A) {
    var that = this;
    if (!(A instanceof Array) || A.length <= 1)return A;
    A = A.reverse();
    var a = [], b = [];
    for (var i = 1; i < A.length; i++) {
        for (var j = 0; j < i; j++) {
            if (inArray(j, b))continue;
            if (A[j] == A[i]) {
                b.push(j);
            }
        }
    }
    for (var i = 0; i < A.length; i++) {
        if (inArray(i, b))continue;
        a.push(A[i]);
    }
    return a.reverse();
}
// 
function insertScript(content) {
    return content.replace(/<\/head>/i, function () {
        var comboStr = '';
        if (comboJS) {
            comboStr += '<!--comboJS--><script src="@@script"></script>\n';
        }
        if (comboCSS) {
            comboStr += '<!--comboCSS--><link href="@@style" rel="stylesheet" />\n';
        }
        comboStr += '</head>';
        return comboStr;
    });
}

function recall(content) {

    //return content;
    content = content.replace(new RegExp('(<!--css:([^>]*?)-->)', 'gi'), function () {
        var args = arguments;
        if (/http:/i.test(args[2])) {
            if (/\.ico$/i.test(args[2])) {
                return '<link type="image/x-icon" rel="shortcut icon" href="' + args[2] + '" />';
            }
            return '<link rel="stylesheet" href="' + args[2] + '" />';
        } else {
            return args[0];
        }
    });

    content = content.replace(new RegExp('(<!--js:([^>]*?)-->)', 'gi'), function () {
        var args = arguments;
        if (/http:/i.test(args[2])) {
            return '<script src="' + args[2] + '"></script>';
        } else {
            return args[0];
        }
    });

    content = content.replace(new RegExp('({!--link:([^}]*?)--})', 'gi'), function () {
        var args = arguments;
        return args[2].replace('!link', '<link');
    });

    return content;
}

function js(content, relative, filep) {
    // {file:xx,content:xxx}
    var o = getFirstIncludes(content, 'js', relative, filep);
    var firstInclude = o.file;
    var r;
    if (firstInclude) {
        JS_Files.push(firstInclude);
        r = js(o.content, relative, filep);
    }
    return r ? r : content;
}

function css(content, relative, filep) {
    var o = getFirstIncludes(content, 'css', relative, filep);
    var firstInclude = o.file;
    var r;
    if (firstInclude) {
        CSS_Files.push(firstInclude);
        r = css(o.content, relative, filep);
    }
    return r ? r : content;
}

function getFirstIncludes(content, type, relative, filep) {

    var reg = type == 'js' ? scriptExtern : styleExtern;
    var r = content.match(new RegExp(reg, 'i'));
    if (r) {
        var f = RegExp.$1;
        content = content.replace(new RegExp(reg, 'i'), function () {
            var args = arguments;
            var str = '';
            if (type === 'js') {
                if (!/http:/i.test(args[1])) {
                    var alp = relative +
                        path.join(path.dirname(filep).
                                split(path.sep).join('/').replace(/^build\//, ''),
                            args[1].replace(/\.js$/, '-min.js')).split(path.sep).join('/');
                    str = '<!--js:' + alp + '-->';
                } else {
                    str = '<!--js:' + args[1] + '-->';
                }
            } else if (type === 'css') {
                if (!/http:/i.test(args[1]) && /stylesheet/i.test(args[0])) {

                    var alp = relative +
                        path.join(path.dirname(filep).
                                split(path.sep).join('/').replace(/^build\//, ''),
                            args[1].replace(/\.css$/, '-min.css')).split(path.sep).join('/');
                    str = '<!--css:' + alp + '-->';
                } else {
                    str = '{!--link:' + args[0].replace('<link', '!link') + '--}';
                }
            }
            return str;
        });
        CONTENT = content;
        return {
            file: f,
            content: content
        };
    } else {
        return false;
    }
}

// 得到的一定是utf8编码的buffer
function read(file) {
    var fd = fs.readFileSync(file),
        bf;

    if (isUtf8(fd)) {
        bf = fs.readFileSync(file);
    } else {
        bf = iconv.encode(iconv.decode(fd, 'gbk'), 'utf8');
    }
    return bf;
}

exports.js = js;
exports.css = css;
exports.parse = parse;

