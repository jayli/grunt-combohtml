/*
 * Modifyed @ 2013-12-26 代码很乱，需要重构
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */

var util = require('util');
var fs = require('fs');
var http = require('http');
var mock = require('./mock.js');
var Juicer = require("juicer");
var ssi = require('./ssi').ssi,
	ssiChunk = require('./ssi').ssiChunk,
	events = require('events'),
	url  = require('url'),
	chunkParser = require('./chunk').parse,
	combineAssets = require('./url_combine').parse,
	path = require('path');

var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');
var tidy = require('./tidy');
var civet = require('civet');
var extract = require('./extract');
var relativeParse = require('./relative').parse;
var concat = require('./concat').concat;
var HTMLFragments = require('./html-fragments');

// 一定是utf8格式
function mockFilter(chunk){
	if(mock.checkDef(chunk)){
		var pageParam = mock.getMockData(chunk);
		chunk = Juicer(chunk, pageParam);
		// chunk = delPageParamArea(chunk);
		chunk = tidy(chunk);
	}
	return chunk;
}

module.exports = function(grunt) {

	grunt.registerMultiTask('combohtml', 'combohtml.', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options();
		var sholdtidy = true;

		var done = this.async();
		var comboMapFile = options.comboMapFile;

		var that = this;
		var pwd = process.cwd();
		this.files.forEach(function(v,k){
			console.log(v.dest);
			var p = v.src[0];
			var bf = read(p);
			var dirname = path.dirname(v.dest);
            var fDestName = path.basename(v.dest,path.extname(v.dest));
			var filep = path.join(dirname, fDestName);

            var ext = '.combo';
            if(options.comboExt != undefined && options.comboExt != null){
                ext = options.comboExt;
            }

			// combo后的js地址
			var dest_js = filep + ext+ '.js';
			// combo后的css地址
			var dest_css = filep + ext + '.css';

			// 一定是utf8格式的
			var chunk = ssiChunk(p,bf.toString('utf8'));

			// TODO: 这里的逻辑需要重构了
			if(typeof options.relative !== "undefined"){
				// 相对路径编译成绝对路径
				chunk = relativeParse(chunk,options.relative,filep).content;
				if(options.combineAssets){
					chunk = combineAssets(chunk,comboMapFile).content;
				}
			} else {
				// 相对路径执行静态合并
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
					chunk = chunk.replace('@@script', fDestName + ext + '.js');
				}

				if(typeof options.comboCSS == 'undefined' || options.comboCSS === true){
					chunk = chunk.replace('@@style', fDestName + ext + '.css');
				}

			}

			if(typeof options.convert2vm == "undefined" || options.convert2vm == true){
				outputVmFile(chunk,filep);
				sholdtidy = false;
			}

			if(typeof options.convert2php == "undefined" || options.convert2php == true){
				outputPhpFile(chunk,filep);
				sholdtidy = false;
			}

			if(sholdtidy && options.tidy){
				chunk = tidy(chunk,{
			      'indent_size': 4,
			      'indent_char': ' ',
			      'brace_style': 'expand',
			      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u','script']
				});
			}

			chunkParser(chunk,function(chunk){
				if(options.mockFilter){
					chunk = mockFilter(chunk);
				}
				chunk = teardownChunk(chunk,options.encoding);
				if(!(chunk instanceof Buffer)){
					chunk = new Buffer(chunk);
				}
				if(options.encoding == 'gbk'){
					chunk = iconv.encode(iconv.decode(chunk, 'utf8'),'gbk');
				}
				fs.writeFileSync(v.dest,chunk);
				done();
			});
			
		});

        // HTML 区块代理
        if(options.htmlProxy){
            HTMLFragments.process(options.htmlProxy, options.htmlProxyDestDir, done);
        }

        // done();
		return;
	});

};

// 传入的chunk一定是utf8的
function teardownChunk(chunk,encoding){
	if(!(chunk instanceof Buffer)){
		chunk = new Buffer(chunk);
	}
	if(encoding == 'gbk'){
		chunk = iconv.encode(iconv.decode(chunk, 'utf8'),'gbk');
	}
	return chunk;
}

function outputVmFile(content,fp){
	var ctxt = civet.juicer2vm(content);
    fs.writeFileSync(fp + '.vm.html', ctxt);
}

function outputPhpFile(content,fp){
	var ctxt = civet.juicer2php(content);
    fs.writeFileSync(fp + '.php.html', ctxt);
}

function writeFile(page, prjInfo, pageContent) {
    var pagePathDir = path.dirname(page);
    if (prjInfo.charset[0].match(/gbk/i)) {
        pageContent = iconv.encode(pageContent, 'gbk');
    }   
    fs.writeFileSync(page, pageContent);
    return;
}


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
