/*
 * 
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

var util = require('util');
var fs = require('fs');
var http = require('http');
var ssi = require('./ssi').ssi,
	ssiChunk = require('./ssi').ssiChunk,
	events = require('events'),
	url  = require('url'),
	path = require('path');

var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');
var tidy = require('./tidy');
var extract = require('./extract');
var concat = require('./concat').concat;

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

	grunt.registerMultiTask('combohtml', 'combohtml.', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options();

		var that = this;
		var pwd = process.cwd();
		this.files.forEach(function(v,k){
			console.log(v.dest);
			var p = v.src[0];
			var bf = read(p);
			var dirname = path.dirname(v.dest);
			var filep = path.join(dirname,path.basename(v.dest,path.extname(v.dest)));
			// combo后的js地址
			var dest_js = filep + '.js';
			// combo后的css地址
			var dest_css = filep + '.css';

			// 一定是utf8格式的
			var chunk = ssiChunk(p,bf.toString('utf8'));

			var result = extract.parse(chunk,{
				comboJS:typeof options.comboJS == 'undefined' || options.comboJS === true,
				comboCSS:typeof options.comboCSS == 'undefined' || options.comboCSS === true
			});
			chunk = result.content;

			if(typeof options.comboJS == 'undefined' || options.comboJS === true){
				var js_content = concat(result.js,dest_js,v.orig.cwd,p,options.replacement);
			}
			if(typeof options.comboCSS == 'undefined' || options.comboCSS === true){
				var css_content = concat(result.css,dest_css,v.orig.cwd,p,options.replacement);
			}
			
			if(typeof options.comboJS == 'undefined' || options.comboJS === true){
				chunk = chunk.replace('@@script',path.basename(v.dest,path.extname(v.dest)) + '.js');
			}
			if(typeof options.comboCSS == 'undefined' || options.comboCSS === true){
				chunk = chunk.replace('@@style',path.basename(v.dest,path.extname(v.dest)) + '.css');
			}
			chunk = tidy(chunk);

			if(!(chunk instanceof Buffer)){
				chunk = new Buffer(chunk);
			}
			if(options.encoding == 'gbk'){
				chunk = iconv.encode(iconv.decode(chunk, 'utf8'),'gbk');
			}

			fs.writeFileSync(v.dest,chunk);
			
		});
		return;
	});

};


function consoleColor(str,num){
	if (!num) {
		num = '32';
	}
	return "\033[" + num +"m" + str + "\033[0m";
}

function green(str){
	return consoleColor(str,32);
}

function yellow(str){
	return consoleColor(str,33);
}

function red(str){
	return consoleColor(str,31);
}

function blue(str){
	return consoleColor(str,34);
}

function log(statCode, url, err) {
  var logStr = blue(statCode) + ' - ' + url ;
  if (err)
    logStr += ' - ' + red(err);
  console.log(logStr);
}

function getDirFiles(dir){
	var files = fs.readdirSync(dir);
	var res_f = []; 
	var res_d = [];
	var r = '';
	files.forEach(function(file){
		var stat = fs.lstatSync(path.resolve(dir,file));

		if (!stat.isDirectory()){
			res_f.push(file);
		} else {
			res_d.push(file);
		}   
	});

	
	r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1WNlnFadjXXaSQP_X-16-16.png" /> <a href="../">parent dir</a></p><hr size=1 />';

	res_d.forEach(function(file){
		r += '<p><img src="http://img03.taobaocdn.com/tps/i3/T1nHRTFmNXXXaSQP_X-16-16.png" /> <a href="'+file+'/">'+file+'</a></p>';
	});

	res_f.forEach(function(file){
		r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1Y7tPFg8eXXaSQP_X-16-16.png" /> <a href="'+file+'">'+file+'</a></p>';
	});

	return r;
}

function isDir(dir){
	if(fs.existsSync(dir)){
		var stat = fs.lstatSync(dir);
		return stat.isDirectory();
	} else {
		return false;
	}
}

function isFile(dir){
	if(fs.existsSync(dir)){
		var stat = fs.lstatSync(dir);
		return stat.isFile();
	} else {
		return false;
	}
}

// 得到的一定是utf8编码的buffer
function read(file){
	var fd = fs.readFileSync(file);

	if(isUtf8(fd)){
		var bf = fs.readFileSync(file);
	} else {
		var bf = iconv.encode(iconv.decode(fd, 'gbk'),'utf8');
	}
	return bf;
}

function die(){
	console.log.apply(this,arguments)
	process.exit();
}
