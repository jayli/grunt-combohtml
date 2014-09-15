// 'use strict';
var util = require('util');
var fs = require('fs');
var path = require('path');
var pwd = process.cwd();
var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');

var scriptExtern = '<script[^>]*? src=[\'"](.+?)[\'"].*<\/script>';
var styleExtern = '<link[^>]*? href=[\'"]([^\'"]+\.css)[\'"].*>';

var JS_Files = [];
var CSS_Files = [];
var CONTENT = '';
var comboJS = true;
var comboCSS = true;

/*
 // 这里只combine 绝对路径表示的css和js,相对路径都忽略
 var x = read('xx.html');
 console.log(parse(x.toString('utf8')));
 console.log(JS_Files);
 console.log(CSS_Files);
 */

// comboMapFile 一定是绝对路径的
function parse(content, comboMapFile, o) {
	CONTENT = '';
	var source_content = content;
	JS_Files = [];
	CSS_Files = [];
	comboCSS = true;
	comboJS = true;
	content = css(content);
	content = js(content);
	if (comboMapFile) {
		JS_Files = insertComboMapFile(JS_Files, comboMapFile);
	}
	var combinedJS = getCombinedAssets(JS_Files);
	var combinedCSS = getCombinedAssets(CSS_Files);
	return {
		content: insertScript(recall(content), combinedJS, combinedCSS),
		js: distinct(JS_Files),
		css: distinct(CSS_Files)
	};
}

function insertComboMapFile(jss, comboFile) {
	var a = [];
	var flag = false;
	for (var i = 0; i < jss.length; i++) {
		a.push(jss[i]);
		if (jss[i].match('kissy')) {
			flag = true;
			a.push(comboFile);
		}
	}
	if (!flag) {
		a.push(comboFile);
	}
	return a;
}

function getCombinedAssets(arr) {
	var baseUrl = 'g.tbcdn.cn';
	var source = [];
	for (var i = 0; i < arr.length; i++) {
		if (!arr[i].match(baseUrl)) {
			continue;
		}
		source.push(arr[i].replace('http://' + baseUrl + '/', ''));
	}
	return ('http://' + baseUrl + '/??' + source.join(',')).replace('????', '??');
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
function insertScript(content, js, css) {
	return content.replace(/(<script\s|<\/head>)/i, function () {
		var comboStr = '';
		if (comboJS) {
			comboStr += '<script src="' + js + '"></script>\n';
		}
		if (comboCSS) {
			comboStr += '<link href="' + css + '" rel="stylesheet" />\n';
		}
		comboStr += arguments[0];
		return comboStr;
	});
}

function recall(content) {

	content = content.replace(new RegExp('(<!--css:([^>]*?)-->)', 'gi'), function () {
		var args = arguments;
		if (!/http:\/\/g.tbcdn.cn/i.test(args[2])) {
			return '<link rel="stylesheet" href="' + args[2] + '" />';
		} else {
			return '';//args[0];
		}
	});

	content = content.replace(new RegExp('(<!--js:([^>]*?)-->)', 'gi'), function () {
		var args = arguments;
		if (!/^http:\/\/g\.tbcdn\.cn/i.test(args[2])) {
			return '<script src="' + args[2] + '"></script>';
		} else {
			return '';//args[0];
		}
	});

	return content;
}

function js(content) {
	// {file:xx,content:xxx}
	var o = getFirstIncludes(content, 'js');
	var firstInclude = o.file;
	var r;
	if (firstInclude) {
		JS_Files.push(firstInclude);
		r = js(o.content);
	}
	return r ? r : content;
}

function css(content) {
	var o = getFirstIncludes(content, 'css');
	var firstInclude = o.file;
	var r;
	if (firstInclude) {
		CSS_Files.push(firstInclude);
		r = css(o.content);
	}
	return r ? r : content;
}

function getFirstIncludes(content, type) {

	var reg = type == 'js' ? scriptExtern : styleExtern;
	var r = content.match(new RegExp(reg, 'i'));
	if (r) {
		var f = RegExp.$1;
		content = content.replace(new RegExp(reg, 'i'), function () {
			var args = arguments;
			return '<!--' + type + ':' + args[1] + '-->';
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

