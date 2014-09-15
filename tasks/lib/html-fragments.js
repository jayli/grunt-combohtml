/**
 * Created by 弘树<tiehang.lth@alibaba-inc.com> on 14-4-25.
 * @fileOverview HTML 区块代理合并
 */
var HTMLProxy = require('html-proxy'),
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    request = require('request'),
    tidy = require('./tidy'),
    iconv = require('iconv-lite');

exports.process = function (htmlProxyConfig, outputDir, done) {

    var asyncFns = [];

    var htmlProxy = new HTMLProxy({
        htmlProxyConfig: htmlProxyConfig,
        needServer: false
    });

    outputDir = outputDir || 'html-fragments';
    var destDir = path.join('build', outputDir);

    fs.mkdirSync(destDir);

    // 遍历各个需要区块代理的页面，分别做合并任务，push 到 asyncFns 里便于后面并行执行
    htmlProxyConfig.forEach(function (proxyItem) {

        var fn = function (callback) {

            var url = proxyItem.demoPage || proxyItem.urlReg;
            if (url) {

                request({
                    url: url,
                    encoding: null
                }, function (error, response, body) {

                    if (!error && response.statusCode == 200) {

                        var responseCharset = 'utf8',
                            responseHeaders = response.headers;

                        // 检测是否响应体为 utf-8 编码，便于后面转码处理
                        if (responseHeaders['content-type']) {
                            var contentType = responseHeaders['content-type'],
                                charsetMatch = contentType.match(/charset=([\w-]+)/ig);

                            if (charsetMatch && (charsetMatch.length != 0)) {
                                responseCharset = charsetMatch[0].split('=')[1];
                            }

                        }

                        var pageContent = iconv.decode(body, responseCharset);
						try {
                        var replacedHTML = htmlProxy.replaceDom(pageContent, proxyItem.replacements);
						} catch(e){
							console.log('>> fragment not found: '+ url);
							return callback();
						}
                        var encodedHTML = iconv.encode(tidy(replacedHTML), responseCharset);

                        var url2FileName = url.replace(/^http(s)?:\/\//, '').replace(/\/|\./g,'-'),
                            fileName = path.join(destDir, url2FileName + '.html');
                        fs.writeFileSync(fileName, encodedHTML);

                        console.log('>> File "' + fileName + '" created.');

                    } else {

                        console.log('failed to load remote page: ' + url);

                    }

                    callback();

                });
            }

        };

        asyncFns.push(fn);

    });

    async.parallel(asyncFns, function (err, result) {

        if (err) {

            console.warn('HTML 区块页面生成有错误');
            console.error(err);

        } else {

            console.log('HTML 区块页面均已生成到 ' + destDir);

        }

        done();

    });

};
