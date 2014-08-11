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
        factory(root['lexicalParse'] || (root['lexicalParse'] = {}));
    }
})(this,function(exports){

    /**
     * 词法分析
     * */
    function LexicalParse (cfg){
        this.origin = cfg.origin || '';
        this.init()
        return this.tokens;
    }
    LexicalParse.prototype = {
            init:function(){
                this.parser();
            },
            parser:function(){
                var TPL = this.origin + ' ',
                    length = TPL.length-1;
                var i = this.i = -1;
                var data = '',
                    token  = '',
                    tokens  = [];
                var tags = {
                    $Open : '{'
                    ,$At : '@'
                    ,$I : 'i'
                    ,$E : 'e'
                    ,$ : '$'
                    ,$L : 'l'
                    ,$A : 'a'
                    ,$Wrap :'\n'
                    ,$Close : '}'
                    ,$End :'/'
                    ,$Blank : ' '
                    ,$Lt:'<'
                    ,$Rt:'>'
                };
                function tokenization(){
                    if(token || data){
                        tokens.push({
                            tag: token || 'text',
                            exp: data
                        });
                        //console.log('create a exp :\n', tokens);
                        token = data = '';
                    }
                };
                var parseState = {
                    start:function(){
                        if(tags.$Open == TPL[i]){
                            return parseState.tagOpen;
                        }else{
                            data += TPL[i];
                            return parseState.textData;
                        }
                    }
                    ,tagOpen:function(){
                        if(tags.$At == TPL[i]){
                            tokenization();
                            token += TPL[i];
                            return parseState.identifyTag;
                        }else if(tags.$Close == TPL[i]){
                            return parseState.tagClose;
                        }else{
                            data += tags.$Open + TPL[i];
                            return parseState.textData;
                        }
                    }
                    ,tagClose:function(){
                        if(tags.$Open == TPL[i]){
                            return parseState.tagOpen;
                        }else if(tags.$ == TPL[i]){
                            token = tags.$;
                            return parseState.identifyVar;
                        }else{
                            data += TPL[i];
                            return parseState.textData;
                        }
                    }
                    ,tag$:function(){
                        if(tags.$Open == TPL[i]){
                            tokenization();
                            token = tags.$;
                            return parseState.identifyVar;
                        }else if(tags.$ == TPL[i]){
                            return parseState.tag$;
                        }else{
                            data += tags.$ + TPL[i];
                            return parseState.textData;
                        }
                    }
                    ,textData:function(){
                        if(this.i == length){
                            tokenization();
                        }else if(tags.$Open == TPL[i]){
                            return parseState.tagOpen;
                        }else if(tags.$Wrap == TPL[i]){
                            data += TPL[i];
                            return parseState.textData;
                        }else if(tags.$ == TPL[i]){
                            return parseState.tag$;
                        }else{
                            data += TPL[i];
                            if(TPL.length == i+1){
                                tokenization();
                                return;
                            }
                            return parseState.textData;
                        }
                    }
                    ,identifyTag:function(){
                        if(tags.$E == TPL[i] && token == tags.$At){
                            token = TPL[i];
                            return parseState.identifyTag;
                        }else if(tags.$A == TPL[i] && tags.$E == token){
                            token = 'each';
                            this.i += 2;
                            return parseState.identifyTag;
                        }else if(tags.$L == TPL[i] && tags.$E == token){
                            token = 'else';
                            this.i += 2;
                            return parseState.identifyTag;
                        }else if(tags.$I == TPL[i] && token == tags.$At){
                            token = 'if';
                            this.i ++;
                            return parseState.identifyTag;
                        }else if(tags.$End == TPL[i] && token == tags.$At){
                            token += TPL[i];
                            return parseState.identifyTag;
                        }else if(tags.$E == TPL[i] && token == tags.$At + tags.$End){
                            token = '/each';
                            this.i +=3;
                            tokenization();
                            return parseState.identifyTag;
                        }else if(tags.$I == TPL[i] && token == tags.$At + tags.$End){
                            token = '/if';
                            this.i ++;
                            tokenization();
                            return parseState.identifyTag;
                        }else if(tags.$Blank == TPL[i]){
                            data += TPL[i];
                            return parseState.identifyTag;
                        }else if(tags.$Close == TPL[i]){
                            tokenization();
                            return parseState.tagClose;
                        }else if (tags.$End == TPL[i] && tags.$At == token){
                            token += TPL[i];
                            return parseState.identifyTag;
                        }else if(tags.$Wrap == TPL[i]){
                            return parseState.identifyTag;
                        }else{
                            data += TPL[i];
                            return parseState.identifyTag;
                        }
                    }
                    ,identifyVar:function(){
                        if(tags.$Close == TPL[i]){
                            tokenization();
                            return parseState.tagClose;
                        }else if (tags.$Open == TPL[i]){
                            return parseState.identifyVar;
                        }else{
                            data += TPL[i];
                            return parseState.identifyVar;
                        }
                    }
                    ,identifyComment:function(){
                        if(tags.$Wrap == TPL[i]){
                            tokenization();
                            return parseState.textData;
                        }else{
                            data += TPL[i];
                            return parseState.identifyComment;
                        }
                    }
                    ,end:function(){

                    }
                    ,error:function(){

                    }
                };
                this.state = parseState.start;

                for(var i = 0; i < TPL.length;i++){
                    this.inputByChar(i);
                }
                this.tokens = tokens;
            },
            inputByChar:function(c){
                if(this.i < c){
                    this.i = c;
                    //console.log('current char :\n' + TPL[c]);
                    this.state = this.state();
                }else {
                    //console.log('ignore :\n' + TPL[c]);
                }
            }
        };
    exports.lexicalParse = LexicalParse;

});
/* vim: set sw=4 ts=4 et tw=80 : */
