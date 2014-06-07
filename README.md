# grunt-combohtml

HTML代码的构建,合并SSI,并提取其中引用的本地css和js，执行动态和静态合并,并输出构建好的html

## Getting Started

依赖 Grunt 版本`~0.4.1`

安装

```shell
npm install grunt-combohtml --save-dev
```

安装后，在 Gruntfile.js 中载入任务

```js
grunt.loadNpmTasks('grunt-combohtml');
```

## 任务配置

### 步骤

在 `grunt.initConfig()` 中添加 combohtml 的配置：

```js
grunt.initConfig({
	combohtml:{
		options:{
			encoding:'utf8',
			replacement:{
				from:/src\//,
				to:'build/'
			},
			// 本地文件引用替换为线上地址的前缀
			relative:'http://g.tbcdn.cn/path/to/project/',
			// 配合relative使用,将页面中所有以CDN引用的JS/CSS文件名进行拼合
			combineAssets: true, 
			// KISSY Modules Maps File 地址
			comboMapFile:'http://g.tbcdn.cn/path/to/maps.js',
			tidy:false,  // 是否重新格式化HTML
			mockFilter:true, // 是否过滤Demo中的JuicerMock
			comboJS:false, // 是否静态合并当前页面引用的本地js为一个文件
			comboCSS:false, // 是否静态合并当前页面引用的css为一个文件
			convert2vm:false,// 是否将juicer语法块转换为vm格式
			convert2php:false, // 是否将juicer语法块转换为php格式
			comboExt:'-combo', // 静态合并后的js和css后缀
			htmlProxy: '<%= pkg.htmlProxy %>',      // htmlProxy 配置，用于产出线上页面区块替换为本地模块页面
			htmlProxyDestDir: 'html-fragments'      // html 代理区块页面生成到的目标目录
			meta: {
				'pageid': '<%= pkg.name%>/${path|regexp,"pages/",""}'
			}
		},
		main:{
			files: [
				{
					expand: true,
					cwd:'build',
					// 对'*.php'文件进行HTML合并解析
					src: ['**/*.php'],
					dest: 'build/'
				}
			]
		}
	}
});
```

### 配置说明

#### 资源文件合并配置 

**说明:relative 和 comboJS与comboCSS 的配置互斥！**

合并文件提供两种模式：

1. 代码静态合并：即页面中相对路径引用的资源文件都会被抓取合并为一个:

	```
	options:{
		encoding:'utf8',
		replacement:{
			from:/src\//,
			to:'build/'
		},
		comboJS:true, 
		comboCSS:true,
		comboExt:'-combo'
	}
	```

2. combo模式合并：若希望页面中引用的相对路径都编译为绝对路径并组成combo的模式`http://url/??a.js,b.js`,需要开始`relative`字段,这时`comboJS`和`comboCSS`字段不起作用

	``` javascript
	options:{
		encoding:'utf8',
		replacement:{
			from:/src\//,
			to:'build/'
		},
		// 本地文件引用替换为线上地址的前缀
		relative:'http://g.tbcdn.cn/path/to/project/',
		// 配合relative使用,将页面中所有以CDN引用的JS/CSS文件名进行拼合
		combineAssets: true, 
		// KISSY Modules Maps File 地址,根据需要添加
		comboMapFile:'http://g.tbcdn.cn/path/to/maps.js'
	}
	```

#### html-proxy html 区块代理配置

其中 `htmlProxy` 的配置在 `abc.json` 中指定，这里读取配置，示例配置如下：

```js
  ...
  ,
  "htmlProxy": [{
      "urlReg": "http://tiehang.demo.taobao.net/ksdemo/html-proxy.html", // 要匹配的 url 正则表达式/页面url
      "replacements": [{	// 需要替换的各个区块和对应的选择器
          "fragment": "mods/demo/index.html",
          "selector": "#demo"
      }]
  }, {
      "urlReg": "^http://www.baidu.com/$",
      "demoPage": "http://www.baidu.com",	// 当urlReg 为正则表达式时，给定一个遵循该正则的示例页面用于做 html 区块合并
      "replacements": [{
          "fragment": "mods/demo/index.html",
          "selector": "#lg"
      }, {
          "fragment": "mods/nav/index.html",
          "selector": "#nv"
      }]
  }, {
      "urlReg": "^http://www.taobao.com/$",
      "demoPage": "http://www.taobao.com",
      "replacements": [{
          "fragment": "mods/demo/index.html",
          "selector": "#J_Promo"
      }, {
          "fragment": "mods/nav/index.html",
          "selector": "#J_Nav"
      }]
  }]
```

#### Juicer Mock

页面中的 JuicerMock 片段可以通过`mockFilter`字段来配置,原理参照[grunt-flexcombo](http://npmjs.org/grunt-flexcombo)

#### Meta 标签嵌入

通过 `options` 中的 `meta` 配置，以键值对形式传入每个 `meta` 的 key 和 value，构建时会自动生成对应的一条条 `<meta>` 标签嵌入 `</head>` 前。

除了可以通过 `<%=pkg.attribute %>` 读取环境变量之外，还提供了额外的环境属性，在 `meta` 中可按需配置，使用时遵循 [`Juicer`](http://juicer.name/docs/docs_zh_cn.html) 语法：

- `path`：当前处理的文件路径（以 `src` 路径为起点，如 `"pages/search/index.html"` ）
- `ts`: 时间戳

此外提供一个 `Juicer` 辅助函数 `regexp`，按需对上面的环境属性通过正则表达式进行截取或替换，如上面配置中的：

``` javascript
meta: {
	'pageid': '<%= pkg.name%>/${path|regexp,"pages/",""}'
}
```

代表将 `path` 中的 `pages/` 正则表达式字符串替换为 ""，也就是拿掉。


## 执行任务

	task.run(['combohtml']);

## 功能说明

### SSI 

该服务依赖[jayli-server](https://npmjs.org/package/jayli-server)，支持标准格式的 SSI include

	<!--#include virtual="file.html" -->

