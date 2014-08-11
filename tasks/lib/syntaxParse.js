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
        factory(root['syntaxParse'] || (root['syntaxParse'] = {}));
    }
})(this,function(exports){

    /**
     * 语法树生成类
     */
    function SyntaxTree(cfg){
        this.tokens = cfg.tokens;
        this.exParse = cfg.expsParse;
        this.init();
        return this.syntaxTree;
    }
    SyntaxTree.prototype = {
        init:function(){
            this.parse();
        },
        parse:function(){
            var self = this;
            var tokens = self.tokens;
            var _currentLevel = 0,
                _currentType = '',
                _currentIndex = '',
                syntaxTree = [],
                syntaxType = {
                    open :'opOpen'
                    ,close:'opClose'
                    ,varia :'variable'
                    ,comment:'comment'
                },
                currentP = [];
            for(var i = 0;i<tokens.length;i++){
                var _type;
                switch(tokens[i].tag){
                    case 'if':
                    case 'else':
                        _type = syntaxType.open;
                        self.expsParse(tokens[i]);
                        break;
                    case 'each':
                        _type = syntaxType.open;
                        self.expsParse(tokens[i]);
                        _currentIndex = self.exParse.index[self.exParse.index.length-1];
                        break;
                    case '/if':
                        _type = syntaxType.close;
                        _currentLevel --;
                        break;
                    case '/each':
                        _type = syntaxType.close;
                        _currentLevel --;
                        self.exParse.index.pop();
                        _currentIndex = self.exParse.index[self.exParse.index.length-1];
                        break;
                    case '$':
                        self.expsParse(tokens[i]);
                        _type = syntaxType.varia;
                        break;
                    case 'comment':
                        _type = syntaxType.comment;
                        break;
                    default:
                        _type = 'text';
                        _currentType == syntaxType.open && _currentLevel ++;
                        break;
                }
                _currentType = _type;
                tokens[i].type = _type;
                tokens[i].level = _currentLevel;
                tokens[i].currentIndex = _currentIndex;
                function createQuery(node){
                    node.children = node.children ? node.children : [];
                    return node;
                }
                if(i==0){
                    currentP.push(syntaxTree);
                }else{
                    if(_currentLevel > tokens[i-1].level){
                        currentP.push(createQuery(tokens[i-1]).children);
                    }else if(_currentLevel < tokens[i-1].level){
                        currentP.pop();
                    }
                }
                currentP[currentP.length-1].push(tokens[i]);
            }
            self.syntaxTree = syntaxTree;
        },
        expsParse:function(token){
            token['tokens']  = this.exParse.parse({
                exp : token['exp'],
                tag: token['tag']
            });
        }
    };
    exports.syntaxParse = SyntaxTree;
});
/* vim: set sw=4 ts=4 et tw=80 : */
