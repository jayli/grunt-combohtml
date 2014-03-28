# grunt-combohtml

HTML代码的构建,合并SSI,并提取其中引用的本地css和js，执行动态和静态合并,并输出构建好的html

## Getting Started

依赖 Grunt 版本`~0.4.1`

安装

```shell
npm install grunt-combohtml --save-dev
```

安装后，在Gruntfile.js中载入任务

```js
grunt.loadNpmTasks('grunt-combohtml');
```

## 任务配置

### 步骤

在`grunt.initConfig()`中添加combohtml的配置：

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
			comboExt:'-combo' // 静态合并后的js和css后缀
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

说明:relative和comboJS与comboCSS的配置互斥

合并文件提供两种模式,代码静态合并,即页面中相对路径引用的资源文件都会被抓取合并为一个:

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

若希望页面中引用的相对路径都编译为绝对路径并组成combo的模式`http://url/??a.js,b.js`,需要开始`relative`字段,这时`comboJS`和`comboCSS`字段不起作用

```
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

页面中的 JuicerMock 片段可以通过`mockFilter`字段来配置,原理参照[grunt-flexcombo](http://npmjs.org/grunt-flexcombo)

## 执行任务

	task.run(['combohtml']);

## 功能说明

### SSI 

该服务依赖[jayli-server](https://npmjs.org/package/jayli-server)，支持标准格式的 SSI include

	<!--#include virtual="file.html" -->

