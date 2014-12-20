/*
 * Modifyed @ 2013-12-26 代码很乱，需要重构
 *
 * Copyright (c) 2013 拔赤
 * Licensed under the MIT license.
 */
var fs = require('fs');
var http = require('http');
var path = require('path');

var async = require('async');
var iconv = require('iconv-lite');
var Juicer = require("juicer");

var isUtf8 = require('./lib/is-utf8');
var tidy = require('./lib/tidy');
var civet = require('./lib/civet');
var extract = require('./lib/extract');
var relativeParse = require('./lib/relative').parse;
var concat = require('./lib/concat').concat;
var mock = require('./lib/mock');
var ssi = require('./lib/ssi').ssi,
	ssiChunk = require('./lib/ssi').ssiChunk,
	chunkParser = require('./lib/chunk').parse,
	combineAssets = require('./lib/url_combine').parse;

// 一定是utf8格式
function mockFilter(chunk) {
	if (mock.checkDef(chunk)) {
		var pageParam = mock.getMockData(chunk);
		chunk = Juicer(chunk, pageParam);
		chunk = mock.delPageParamArea(chunk);
		chunk = tidy(chunk);
	}
	chunk = mock.delPageParamArea(chunk);
	return chunk;
}

module.exports = function (grunt) {

	grunt.registerMultiTask('combohtml', 'combohtml.', function () {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options();
		var sholdtidy = true;

		var done = this.async();
		var comboMapFile = options.comboMapFile;

		var that = this;
		var pwd = process.cwd();

		var asyncFns = [];
		this.files.forEach(function (v, k) {

			var asyncFn = function (callback) {

				console.log(v.dest);
				var p = v.src[0];
				var bf = read(p);
				var dirname = path.dirname(v.dest);
				var fDestName = path.basename(v.dest, path.extname(v.dest));
				var filep = path.join(dirname, fDestName);

				var ext = '-combo';
				if (options.comboExt != undefined && options.comboExt != null) {
					ext = options.comboExt;
				}

				// combo后的js地址
				var dest_js = filep + ext + '.js';
				// combo后的css地址
				var dest_css = filep + ext + '.css';

				// 一定是utf8格式的
				var chunk = ssiChunk(p, bf.toString('utf8'));

				// TODO: 这里的逻辑需要重构了
				// 需要处理js路径
				if (typeof options.assetseParser == 'undefined' || (typeof options.assetseParser == 'undefined' && options.assetseParser !== false)) {
					if (typeof options.relative !== "undefined") {
						// 相对路径编译成绝对路径
						chunk = relativeParse(chunk, options.relative, filep).content;
						if (options.combineAssets) {
							chunk = combineAssets(chunk, comboMapFile).content;
						}
					} else {
						// 相对路径执行静态合并
						var isComboJS = !(options.comboJS == false),
							isComboCSS = !(options.comboCSS === false);

						var result = extract.parse(chunk, {
							comboJS: isComboJS,
							comboCSS: isComboCSS
						});

						chunk = result.content;

						var resultJs = result.js,
							resultCss = result.css;
						if (isComboJS && resultJs.length > 0) {

							// resultJs 不为空时才处理
							concat(resultJs, dest_js, v.orig.cwd, p, options.replacement);
							chunk = chunk.replace('@@script', fDestName + ext + '.js');
						} else {
							chunk = chunk.replace('<!--comboJS--><script src="@@script"></script>\n', '');
						}

						if (isComboCSS && resultCss.length > 0) {

							// resultCss 不为空时才处理
							concat(resultCss, dest_css, v.orig.cwd, p, options.replacement);
							chunk = chunk.replace('@@style', fDestName + ext + '.css');
						} else {
							chunk = chunk.replace('<!--comboCSS--><link href="@@style" rel="stylesheet" />\n', '');
						}

					}
				}

				if (!(options.convert2vm === false)) {
					outputVmFile(chunk, filep);
					sholdtidy = false;
				}

				if (!(options.convert2php === false)) {
					outputPhpFile(chunk, filep);
					sholdtidy = false;
				}

				if (sholdtidy && options.tidy) {
					chunk = tidy(chunk, {
						'indent_size': 4,
						'indent_char': ' ',
						'brace_style': 'expand',
						'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u', 'script']
					});
				}

				// meta 配置处理，加入到 </head> 前
				if (options.meta) {
					var metaElements = genMetas(options.meta, v.dest);
					chunk = chunk.replace(/<\/head>/i, metaElements + '</head>');
				}

				if(that.target == 'offline') {
					// 离线包任务定制
					var tmsPrefix = 'trip.taobao.com/go/';
					var tms_include = '<!--TMS:([^,]+),(utf-8|utf8|gbk|gb2312),([0-9]*):TMS-->';
					chunk = chunk.replace(new RegExp(tms_include, 'ig'),function(fullMatch, tmsPath, encoding){
						return '<!--HTTP:http://' + path.join(tmsPrefix, tmsPath) + ',' + encoding + ':HTTP-->';
					});
				}

				chunkParser(chunk, function (chunk) {
					if (options.mockFilter) {
						chunk = mockFilter(chunk);
					}
					chunk = teardownChunk(chunk, options.encoding);
					if (!(chunk instanceof Buffer)) {
						chunk = new Buffer(chunk);
					}
					if (options.encoding == 'gbk') {
						chunk = iconv.encode(iconv.decode(chunk, 'utf8'), 'gbk');
					}
					fs.writeFileSync(v.dest, chunk);
					callback();
				});

			};

			asyncFns.push(asyncFn);

		});

		var HTMLFragments;
		if (options.htmlProxy) {
			HTMLFragments = require('./lib/html-fragments');
		}

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
function genMetas(metaConfig, filePath) {

	/**
	 * 注册 regexp 辅助函数，通过正则自定义输出
	 */
	Juicer.register('regexp', function (value, regexp, replacement) {
		regexp = new RegExp(regexp, 'igm');
		return value.replace(regexp, replacement);
	});

	var ret = [],
		ts = Date.now(),
	// 目前提供的可用变量
		metaReplacements = {
			'path': filePath.replace('build/', ''),     // 文件路径
			'ts': ts                                    // 时间戳
		},
		metaTpl = Juicer('<meta name="${metaKey}" content="${metaValue}">'),
		platform = process.platform,
		ctrlChar;

	// 根据操作提供选择合适的换行控制符
	if (platform == 'win32') {
		// Windows
		ctrlChar = '\n';
	} else if (platform == 'darwin') {
		// Mac OS
		ctrlChar = '\r';
	} else {
		// 否则视为 Linux
		ctrlChar = '\r\n';
	}

	// 遍历各个 meta Key
	for (var metaKey in metaConfig) {
		if (metaConfig.hasOwnProperty(metaKey)) {
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
function teardownChunk(chunk, encoding) {
	if (!(chunk instanceof Buffer)) {
		chunk = new Buffer(chunk);
	}
	if (encoding == 'gbk') {
		chunk = iconv.encode(iconv.decode(chunk, 'utf8'), 'gbk');
	}
	return chunk;
}

function outputVmFile(content, fp) {
	var ctxt = civet.juicer2vm(content);
	fs.writeFileSync(fp + '.vm.html', ctxt);
}

function outputPhpFile(content, fp) {
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


function consoleColor(str, num) {
	if (!num) {
		num = '32';
	}
	return "\033[" + num + "m" + str + "\033[0m";
}

function green(str) {
	return consoleColor(str, 32);
}

function yellow(str) {
	return consoleColor(str, 33);
}

function red(str) {
	return consoleColor(str, 31);
}

function blue(str) {
	return consoleColor(str, 34);
}

function log(statCode, url, err) {
	var logStr = blue(statCode) + ' - ' + url;
	if (err)
		logStr += ' - ' + red(err);
	console.log(logStr);
}

function isDir(dir) {
	if (fs.existsSync(dir)) {
		var stat = fs.lstatSync(dir);
		return stat.isDirectory();
	} else {
		return false;
	}
}

function isFile(dir) {
	if (fs.existsSync(dir)) {
		var stat = fs.lstatSync(dir);
		return stat.isFile();
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

function die() {
	console.log.apply(this, arguments);
	process.exit();
}
