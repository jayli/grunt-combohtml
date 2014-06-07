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
var x = read('xx.html');
console.log(parse(x.toString('utf8')));
console.log(JS_Files);
console.log(CSS_Files);
*/

function parse(content,o){
	CONTENT = '';
	JS_Files = [];
	CSS_Files = [];
	comboCSS = o.comboCSS;
	comboJS = o.comboJS;
	content = css(content);
	content = js(content);
	return {
		content:insertScript(recall(content)),
		js:distinct(JS_Files),
		css:distinct(CSS_Files)
	};
}

function inArray (v, a){
	var o = false;
	for(var i=0,m=a.length; i<m; i++){
		if(a[i] == v){
			o = true;
			break;
		}
	}
	return o;
}

function distinct(A){
	var that = this;
	if(!(A instanceof Array) || A.length <=1 )return A;
	A = A.reverse();
	var a = [],b=[];
	for(var i = 1;i<A.length;i++){
		for(var j = 0;j<i;j++){
			if(inArray(j,b))continue;
			if(A[j] == A[i]){
				b.push(j);
			}
		}
	}
	for(var i = 0;i<A.length;i++){
		if(inArray(i,b))continue;
		a.push(A[i]);
	}
	return a.reverse();
}
// 
function insertScript(content){
	return content.replace(/<\/head>/i,function(){
		var comboStr = '';
		if(comboJS){
			comboStr += '<!--comboJS--><script src="@@script"></script>\n';
		}
		if(comboCSS){
			comboStr += '<!--comboCSS--><link href="@@style" rel="stylesheet" />\n';
		}
		comboStr += '</head>';
		return comboStr;
	});
}

function recall(content){

	content = content.replace(new RegExp('(<!--css:([^>]*?)-->)','gi'),function(){
		var args = arguments;
		if(/http:/i.test(args[2]) || comboCSS === false){
			if(/\.ico$/i.test(args[2])){
				return '<link type="image/x-icon" rel="shortcut icon" href="'+args[2]+'" />';
			}
			return '<link rel="stylesheet" href="'+args[2]+'" />';
		} else {
			return args[0];
		}
	});

	content = content.replace(new RegExp('(<!--js:([^>]*?)-->)','gi'),function(){
		var args = arguments;
		if(/http:/i.test(args[2]) || comboJS === false){
			return '<script src="'+args[2]+'"></script>';
		} else {
			return args[0];
		}
	});

	return content;
}

function js(content) {
	// {file:xx,content:xxx}
	var o = getFirstIncludes(content,'js');
	var firstInclude = o.file;
	var r;
	if(firstInclude){
		JS_Files.push(firstInclude);
		r = js(o.content);
	}
	return r?r:content;
}

function css(content) {
	var o = getFirstIncludes(content,'css');
	var firstInclude = o.file;
	var r;
	if(firstInclude){
		CSS_Files.push(firstInclude);
		r = css(o.content);
	}
	return r?r:content;
}

function getFirstIncludes(content,type){

	var reg = type == 'js'? scriptExtern : styleExtern;
	var r = content.match(new RegExp(reg,'i'));
	if(r){
		var f = RegExp.$1;
		content = content.replace(new RegExp(reg,'i'),function(){
			var args = arguments;
			return '<!--'+ type +':' + args[1] + '-->';	
		});
		CONTENT = content;	
		return {
			file:f,
			content:content
		};
	} else {
		return false;
	}
}

// 得到的一定是utf8编码的buffer
function read(file){
	var fd = fs.readFileSync(file),
        bf;

	if(isUtf8(fd)){
		bf = fs.readFileSync(file);
	} else {
		bf = iconv.encode(iconv.decode(fd, 'gbk'),'utf8');
	}
	return bf;
}

exports.js = js;
exports.css = css;
exports.parse = parse;

