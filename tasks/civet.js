/* index
 * xudafeng@126.com
 */
var lexicalParse = require('./lib/lexicalParse').lexicalParse;
var syntaxParse = require('./lib/syntaxParse').syntaxParse;
var convert2vm = require('./lib/convert2vm').convert2vm;
var convert2php = require('./lib/convert2php').convert2php;
var expsParse = require('./lib/expsParse').expsParse;
var passme = require('passme');
/**
 * juicer2vm，把一段juicer文本转换为vm文本。
 * @param juicerTpl juicer文本
 * @return vm文本
*/
var juicer2vm = function(juicerTpl){
    /**
     * 词法解析
     */
    var tokens = new lexicalParse({
        origin : juicerTpl
    });

    /**
     * 构建语法树
     */
    var tokensTree = new syntaxParse({
        tokens: tokens,
        expsParse:new expsParse(passme)
    });

    /**
     * vm转换
     */
    var vmTPL = new convert2vm({
        syntaxTree : tokensTree
    })['vmTPL'];
    return vmTPL;
};
var juicer2php = function(juicerTpl){
    /**
     * 词法解析
     */
    var tokens = new lexicalParse({
        origin : juicerTpl
    });

    /**
     * 构建语法树
     */
    var tokensTree = new syntaxParse({
        tokens: tokens,
        expsParse:new expsParse(passme)
    });

    /**
     * vm转换
     */
    var phpTPL = new convert2php({
        syntaxTree : tokensTree
    })['phpTPL'];
    return phpTPL;
};
exports.juicer2vm = juicer2vm;
exports.juicer2php = juicer2php;
