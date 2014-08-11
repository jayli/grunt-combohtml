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
	chunkParser = require('./chunk').parse,
	combineAssets = require('./url_combine').parse,
	path = require('path');

var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');
var tidy = require('./tidy');
var civet = require('./civet');
var extract = require('./extract');
var relativeParse = require('./relative').parse;
var concat = require('./concat').concat;
var HTMLFragments = require('./html-fragments');
var async = require('async');

// 一定是utf8格式
function mockFilter(chunk){
	if(mock.checkDef(chunk)){
		var pageParam = mock.getMockData(chunk);
		chunk = Juicer(chunk, pageParam);
		chunk = mock.delPageParamArea(chunk);
		chunk = tidy(chunk);
	}
	chunk = mock.delPageParamArea(chunk);
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

        var asyncFns = [];
		this.files.forEach(function(v,k){

            var asyncFn = function (callback) {

                console.log(v.dest);
                var p = v.src[0];
                var bf = read(p);
                var dirname = path.dirname(v.dest);
                var fDestName = path.basename(v.dest,path.extname(v.dest));
                var filep = path.join(dirname, fDestName);

                var ext = '-combo';
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
				// 需要处理js路径
				if(typeof options.assetseParser == 'undefined' || (typeof options.assetseParser == 'undefined' && options.assetseParser !== false)){
					if(typeof options.relative !== "undefined"){
						// 相对路径编译成绝对路径
						chunk = relativeParse(chunk,options.relative,filep).content;
						if(options.combineAssets){
							chunk = combineAssets(chunk,comboMapFile).content;
						}
					} else {
						// 相对路径执行静态合并
						var isComboJS = !(options.comboJS == false),
							isComboCSS = !(options.comboCSS === false);

						var result = extract.parse(chunk,{
							comboJS: isComboJS,
							comboCSS: isComboCSS
						});

						chunk = result.content;

						// 未用到？
						if(isComboJS){
							var js_content = concat(result.js,dest_js,v.orig.cwd,p,options.replacement);
						}
						if(isComboCSS){
							var css_content = concat(result.css,dest_css,v.orig.cwd,p,options.replacement);
						}

						if(isComboJS){
							chunk = chunk.replace('@@script', fDestName + ext + '.js');
						}

						if(isComboCSS){
							chunk = chunk.replace('@@style', fDestName + ext + '.css');
						}
					}
				}

                if(!(options.convert2vm === false)){
                    outputVmFile(chunk,filep);
                    sholdtidy = false;
                }

                if(!(options.convert2php === false)){
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

                // meta 配置处理，加入到 </head> 前
                if(options.meta){
                    var metaElements = genMetas(options.meta, v.dest);
                    chunk = chunk.replace(/<\/head>/i, metaElements + '</head>');
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
                    callback();
                });

            };

            asyncFns.push(asyncFn);

		});

        async.parallel(asyncFns, function (err, result) {

            if (err) {

                console.warn('combohtml 生成有错误');
                console.error(err);

                done();

            } else {

                // HTML 区块代理
                if (options.htmlProxy) {
                    HTMLFragments.process(options.htmlProxy, options.htmlProxyDestDir, done);
                } else {
                    done();
                }

            }

        });

	});

};

/**
 * 生成 meta 元素
 * @param metaConfig 用户传入的 meta 键值对配置
 * @param filePath 待处理文件路径
 * @returns {string} 各个 meta 拼接后的字符串
 */
function genMetas (metaConfig, filePath) {

	/**
	 * 注册 regexp 辅助函数，通过正则自定义输出
	 */
	Juicer.register('regexp', function (value, regexp, replacement){
		regexp = new RegExp(regexp, 'igm');
		return value.replace(regexp, replacement);
	});

    var ret = [],
        ts = +new Date,
	    // 目前提供的可用变量
        metaReplacements = {
            'path': filePath.replace('build/', ''),     // 文件路径
            'ts': ts                                    // 时间戳
        },
        metaTpl = Juicer('<meta name="${metaKey}" content="${metaValue}">'),
	    platform = process.platform,
	    ctrlChar;

	// 根据操作提供选择合适的换行控制符
	if(platform == 'win32'){
		// Windows
		ctrlChar = '\n';
	} else if(platform == 'darwin'){
		// Mac OS
		ctrlChar = '\r';
	} else {
		// 否则视为 Linux
		ctrlChar = '\r\n';
	}

	// 遍历各个 meta Key
    for(var metaKey in metaConfig) {
        if(metaConfig.hasOwnProperty(metaKey)){
            var metaValue = metaConfig[metaKey];
            metaValue = Juicer(metaValue + '', metaReplacements);
            var metaStr = metaTpl.render({
                metaKey: metaKey,
                metaValue: metaValue
            });
            ret.push('\t' + metaStr);
        }
    }

    return ret.join(ctrlChar) + ctrlChar;

}

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
	var fd = fs.readFileSync(file),
        bf;

	if(isUtf8(fd)){
		bf = fs.readFileSync(file);
	} else {
		bf = iconv.encode(iconv.decode(fd, 'gbk'),'utf8');
	}
	return bf;
}

function die(){
	console.log.apply(this,arguments)
	process.exit();
}
