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
        factory(root['convert2php'] || (root['convert2php'] = {}));
    }
})(this,function(exports){
    /**
     * vm生成类
     */

    var _tms_repeat_ = '_tms_repeat_';
    function convert2php(cfg){
        this.syntaxTree = cfg.syntaxTree;
        this.phpTPL = '<?php ';
        this.id = 0;
        this.init();
    }
    function length2Count(s){
        if(/\["length"\]/g.test(s)){
            return 'count(' + s.replace(/\["length"\]/g,function(){return ''}) + ')';
        }else {
            return s;
        }
    }
    convert2php.prototype = {
        init:function(){
            this.tags = {
                IF :'if'
                ,ELSE :'else'
                ,FOREACH :'foreach'
                ,$:'$'
                ,LT:'('
                ,RT:')'
                ,Lt:'{'
                ,Rt:'}'
                ,WRAP:'\n'
                ,BLANK:' '
                ,EQUAL:'='
                ,COMMEMT:'//'
                ,ECHO:'\necho'
                ,EOTSTART:'<<<EOT\n'
                ,EOTEND:'\nEOT'
                ,AS:'as'
                ,ARRO:'=>'
                ,SEM:';\n'
            }; 
            /**
             * temp
             */
            this.tmsEachTagFlag = [];


            this.create();
        }
        ,create:function(){
            this.parseSyntaxTree(this.syntaxTree);
            this.phpTPL += this.tags.WRAP + '?>';
        }
        ,parseSyntaxTree:function(syntaxTree){
            var self = this;
            function getId(){
                this.id ++;
                return this.id;
            };
            //console.log(syntaxTree)
            for(var i = 0;i< syntaxTree.length;i++){
                var _add = '';
                switch(syntaxTree[i].tag){
                    case 'text':
                        _add = self.tags.WRAP + self.tags.ECHO + self.tags.EOTSTART + syntaxTree[i].exp + self.tags.EOTEND + self.tags.SEM;
                        break;
                    case 'each':
                        _add = self.contactEach(syntaxTree[i]);
                        break;
                    case 'else':
                        _add = self.tags.Rt + self.tags.BLANK + self.tags.ELSE + self.contactElse(syntaxTree[i]) + self.tags.Lt;
                        break;
                    case '/each':
                        _add = self.contactEachEnd();
                        break;
                    case 'if':
                        _add = self.tags.IF + self.tags.LT + self.contactIf(syntaxTree[i]) + self.tags.RT + self.tags.Lt;
                        break;
                    case '/if':
                        _add = self.tags.Rt;
                        break;
                    case '$':
                        _add = self.tags.ECHO + self.contact$(syntaxTree[i]);
                        break;
                }
                self.phpTPL += _add;
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
                        z += '["'+ a[i] +'"]';
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
            //foreach ($sports as $key => $value) 
            //foreach (array as value)
            //console.log(branch)
            function hasKey(){
                if(!_q['_key'][0]){
                    return '';
                }else {
                    return self.tags.$ + _q['_key'][0] + self.tags.BLANK + self.tags.ARRO + self.tags.BLANK;
                }
            }
            var isTmsTag = !!~contactList(_q['_list']).indexOf(_tms_repeat_);
            this.tmsEachTagFlag.push(isTmsTag);
            var addTmsTag = '_tms_repeat_begin\(\'{"name":"'+ _q['_list'] +'"}\'\)\;';
            return isTmsTag ? addTmsTag :(self.tags.FOREACH + self.tags.LT +
                
                length2Count(contactList(_q['_list'])) + self.tags.BLANK + self.tags.AS + self.tags.BLANK + hasKey() + self.tags.$ + _q['_index'][0] + self.tags.RT +
                
                self.tags.Lt);
        }
        ,contactEachEnd:function(){
            var self = this;
            var isTmsTag = self.tmsEachTagFlag.pop();
            return isTmsTag ? '_tms_repeat_end();' : self.tags.Rt;
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
                        h += (t[i-1] && t[i-1].value === '.' ? '':self.tags.$) + _t.value + (t[i-1] && t[i-1].value === '.' ? '"]':'');
                        h = length2Count(h);
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
                            h += '["';
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
            var h = (hasIf ? 'if' + self.tags.BLANK + self.tags.LT : self.tags.BLANK);
            for(var i =0;i<t.length;i++){
                var _t = t[i];
                switch(_t.type){
                    case 'BooleanLiteral':
                        break;
                    case 'Identifier':
                        if(_t.value !=='if'){
                            h += (t[i-1] && t[i-1].value === '.' ? '':self.tags.$) + _t.value + (t[i-1] && t[i-1].value === '.' ? '"]':'');
                            if(/if\s*\(/g.test(h)){
                                h = 'if (' + length2Count(h.replace(/if\s*\(/g,''));
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
                        if(_t.value === '.'){
                            h += '["';    
                        }else{
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
            var self = this,
                t = branch.tokens;
            function contact$(){
                var r = self.tags.$;
                for(var i =0;i<t.length;i++){
                    if(t[i-1]&&t[i-1].value == '.'){
                        r += t[i].value + '"]';
                    }else {
                        if(t[i+1]){
                            r += (t[i].value == '.'? '' : t[i].value )+ (t[i+1].value=='.'?'["':'');
                        }else{
                            r += t[i].value;
                        }
                    }
                }
                return r;
            }
            return self.tags.BLANK + length2Count(contact$()) + self.tags.SEM;        
        }
    };
    exports.convert2php = convert2php;
});
/* vim: set sw=4 ts=4 et tw=80 : */
