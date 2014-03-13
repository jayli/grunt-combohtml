# grunt-combohtml

合并带有SSI的html代码，并提取其中引用的本地css和js，将他们合并为一个js和一个css，并输出构建好的html

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
			encoding:'utf8',//输出文件编码
			replacement:{		// 抓取js/css文件时路径替换规则，留空为不替换
				from:/src\//,
				to:'build/'
			},
			relative:'http://g.tbcdn.cn/group/trip/1.2.3/',// 本地资源文件名替换的前缀
			convert2vm:false,// 是否将juicer语法块转换为vm格式
			convert2php:false,// 是否将juicer语法块转换为php格式
			convert2tms:false,// 是否将juicer语法块转换为php格式
			comboJS:true, // 是否静态合并当前页面引用的本地js
			comboCSS:true // 是否静态合并当前页面引用的css
			comboExt: '-combo', // 合并后的js和css后缀
		},  
		main:{
			files: [
				{   
					expand: true,
					cwd:'src',
					src: ['**/*.htm'], 
					dest: 'build/',
					ext: '.htm'
				}   
			]   
		}   

	}
});

```

> relative和comboJS与comboCSS的配置互斥

## 执行任务

	task.run(['combohtml']);

## 功能说明

### SSI 

该服务依赖[jayli-server](https://npmjs.org/package/jayli-server)，支持标准格式的 SSI include

	<!--#include virtual="file.html" -->

