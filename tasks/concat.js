// 'use strict';
var util = require('util');
var fs = require('fs');
var path = require('path');
var pwd = process.cwd();
var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');

// ['a.js','b.js']
// 'output.js'
// 'src/'
// 'src/~page/index.html'
// {from:/src/,to:'build'}
function concat(a,o,dest,p,replacement){

	var content = '';
	// console.log(a);
	// var a = a.reverse();
	var rel = path.dirname(path.relative(dest,p));
	fs.writeFileSync(o,'',{
		encoding:'utf8'	
	});
	a.forEach(function(v){
		// var ap = path.resolve(pwd,dest,v);
		var ap = path.resolve(pwd,dest,rel,v);
		if(replacement){
			ap = ap.replace(replacement.from,replacement.to);
		}
		if(!fs.existsSync(ap)){
			return;
		}
		var str = read(ap).toString('utf8');
		str += '\n';
		fs.appendFileSync(o,str);
	});
	return read(o).toString('utf8');
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

exports.concat = concat;
