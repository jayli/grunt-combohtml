/*
  Copyright (C) 2012-2013 xudafeng <xudafeng@126.com>

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
;(function(root,factory){
    'use strict';
    /* amd like aml https://github.com/xudafeng/aml.git */
    if(typeof define === 'function' && define.amd) {
        return define(['exports'], factory);
    }else if(typeof exports !== 'undefined') {
        return factory(exports);
    }else{
    /* browser */
        factory(root['convert2vm'] || (root['convert2vm'] = {}));
    }
})(this,function(exports){
    /**
     * vm…˙≥…¿‡
     */
    function convert2vm(cfg){
        this.syntaxTree = cfg.syntaxTree;
        this.vmTPL = '';
        this.id = 0;
        this.init();
    }
    function _indexOf(item, arr) {
        for (var i = 0, len = arr.length; i < len; ++i) {
            if (arr[i] === item) {
                return i;
            }
        }
        return -1;
    }
    function inArray(item, arr) {
        return _indexOf(item, arr) > -1;
    }
    var EXCEPT = ['true','false','null'];
    convert2vm.prototype = {
        init:function(){
            this.tags = {
                IF :'#if'
                ,ELSE :'#else'
                ,END:'#end'
                ,FOREACH :'#foreach'
                ,$:'$!'
                ,single$:'$'
                ,LT:'('
                ,RT:')'
                ,Lt:'{'
                ,Rt:'}'
                ,SET:'#set'
                ,WRAP:'\n'
                ,BLANK:' '
                ,EQUAL:'='
                ,COUNT:'velocityCount - 1'
                ,MINUS:'-'
                ,IN:'in'
                ,If:'if'
            };
            this.create();
        }
        ,create:function(){
            this.parseSyntaxTree(this.syntaxTree);
        }
        ,parseSyntaxTree:function(syntaxTree){
            var self = this;
            function getId(){
                this.id ++;
                return this.id;
            };
            for(var i = 0;i< syntaxTree.length;i++){
                var _add = '';
                switch(syntaxTree[i].tag){
                    case 'text':
                        _add = syntaxTree[i].exp;
                        break;
                    case 'each':
                        _add = self.tags.FOREACH + self.tags.LT + self.contactEach(syntaxTree[i]);
                        break;
                    case 'else':
                        _add = self.tags.ELSE + self.contactElse(syntaxTree[i]);
                        break;
                    case '/each':
                        _add = self.tags.END;
                        break;
                    case 'if':
                        _add = self.tags.IF + self.tags.LT + self.contactIf(syntaxTree[i]) + self.tags.RT;
                        break;
                    case '/if':
                        _add = self.tags.END;
                        break;
                    case '$':
                        _add =  self.contact$(syntaxTree[i]);
                        break;
                }
                this.vmTPL += _add;
                if(syntaxTree[i].children){
                    this.parseSyntaxTree(syntaxTree[i].children);
                }
            }
        }
        ,contactEach:function(branch){
            var self = this;
            var t = branch.tokens;
            var _i = 0;
            var _q = {
                _index:[],
                _key:[],
                _list:[]
            };
            function contactList(a){
                var z ='';
                for(var i =0;i<a.length;i++){
                    if(i==0){
                        z += self.tags.$ + a[i];
                    }else {
                        z += '.' + a[i];
                    }
                }
                return z;
            }
            var _type = '_list';
            for(var i =0;i<t.length;i++){
                var _t = t[i];
                switch(_t.type){
                    case 'BooleanLiteral':
                        break;
                    case 'Identifier':
                        if(_t.value == 'length'){
                            _t.value = 'size()';
                        }

                        if(_t.value =='as'){
                            _type = '_index';
                        }else {
                            _q[_type].push(_t.value);                    
                        }
                        break;
                    case 'Keyword':
                        break;
                    case 'NullLiteral':
                        break;
                    case 'NumericLiteral':
                        break;
                    case 'Punctuator':
                        if(_t.value =='.'){
                            _type = '_list';
                        }else if(_t.value ==','){
                            _type = '_key';
                        }
                        break;
                    case 'StringLiteral':
                        break;
                    case 'RegularExpression':
                        break;
                    case 'Comment':
                        break;
                    case 'WhiteSpace':
                        break;
                }
            }
            function hasKey(){
                if(!_q['_key'][0]){
                    return '';
                }else {
                    return self.tags.WRAP + self.tags.SET + self.tags.LT + self.tags.single$ + _q['_key'][0] + self.tags.EQUAL + self.tags.$ + self.tags.COUNT + self.tags.RT;
                }
            }
            return self.tags.$ + _q['_index'][0] + self.tags.BLANK + self.tags.IN + self.tags.BLANK + contactList(_q['_list']) + self.tags.RT + hasKey();
        }
        ,contactIf:function(branch){
            var self = this;
            var t = branch.tokens;
            var h = '';
            
            for(var i =0;i<t.length;i++){
                var _t = t[i];
                switch(_t.type){
                    case 'BooleanLiteral':
                        break;
                    case 'Identifier':
                        if(_t.value == 'length'){
                            _t.value = 'size()';
                        }
                        if(inArray(_t.value,EXCEPT)){
                            h += _t.value
                        }else{
                            h += (t[i-1] && t[i-1].value === '.' ? '':self.tags.$) + _t.value;                    
                        }
                        break;
                    case 'Keyword':
                        h += self.tags.$ + _t.value;
                        break;
                    case 'NullLiteral':
                        h += _t.value;
                        break;
                    case 'NumericLiteral':
                        h += _t.value;
                        break;
                    case 'Punctuator':
                        if(_t.value=='.'){
                            h += _t.value;
                        }else {
                            h += self.tags.BLANK +_t.value + self.tags.BLANK;
                        }
                        break;
                    case 'StringLiteral':
                        h += _t.value;
                        break;
                    case 'RegularExpression':
                        h += _t.value;
                        break;
                    case 'Comment':
                        break;
                    case 'WhiteSpace':
                        break;
                }
            }
            return h;
        }
        ,contactElse:function(branch){
            var self = this;
            var t = branch.tokens;
            var hasIf = !!t.length && (t[0].value === 'if');
            var h = (hasIf ? 'if' + self.tags.LT : '');
            for(var i =0;i<t.length;i++){
                var _t = t[i];
                switch(_t.type){
                    case 'BooleanLiteral':
                        break;
                    case 'Identifier':
                        if(_t.value == 'length'){
                            _t.value = 'size()';
                        }
                        if(_t.value !=='if'){
                            if (inArray(_t.value,EXCEPT)){
                                h += _t.value;
                            }else {
                                h += (t[i-1] && t[i-1].value === '.' ? '':self.tags.$) + _t.value;
                            }
                        }
                        break;
                    case 'Keyword':
                        break;
                    case 'NullLiteral':
                        h += _t.value;
                        break;
                    case 'NumericLiteral':
                        h += _t.value;
                        break;
                    case 'Punctuator':
                        if(_t.value=='.'){
                            h += _t.value;
                        }else {
                            h += self.tags.BLANK +_t.value + self.tags.BLANK;
                        }
                        break;
                    case 'StringLiteral':
                        h += _t.value;
                        break;
                    case 'RegularExpression':
                        h += _t.value;
                        break;
                    case 'Comment':
                        break;
                    case 'WhiteSpace':
                        break;
                }
            }
            return h + (hasIf ? self.tags.RT :'');
        }
        ,contact$:function(branch){
            var self = this;
            var t = branch.tokens;
            if(!!~branch.exp.indexOf('stringify')){
                function concatStringify(){
                    var r = '';
                    for(var i =0;i<t.length;i++){
                        if(i!==0 && i!==1 && i !== t.length-1){
                            r += t[i].value;
                        }
                    }
                    return r;
                }
                return '$!securityUtil.escapeJson($!'+ concatStringify() +')';
            }else {
                if(branch.exp == 'url()'){
                    return '$rundata.getRequest().getRequestURI()';
                }else {
                    branch.exp = branch.exp.replace(/.length/,function(){
                        return '.size()';
                    })
                    return self.tags.$ + self.tags.Lt + branch.exp + self.tags.Rt;
                }
            }
        }
    };
    exports.convert2vm = convert2vm;
});
/* vim: set sw=4 ts=4 et tw=80 : */
