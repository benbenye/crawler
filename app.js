var express = require('express')
var app = express()
let fs = require('fs');
let _path = require("path");
let tools = require('./tools');

const writeFileAsync = tools.promisify(fs.writeFile);
const mkdirAsync = tools.promisify(fs.mkdir);
const appendFileAsync = tools.promisify(fs.appendFile);
const readFileAsync = tools.promisify(fs.readFile);
const style = process.argv[2];
const pathFile = process.argv[3];
let result = {success: true,arr:[]}
let getList = function(){
	return tools.makeReq({
		url: 'http://www.pufei.net/manhua/20/',
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
		cookie:'__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
		host:'www.pufei.net',
		referer:'http://www.pufei.net/manhua/',
		isCharset:true,
		cb:function(err){console.log('获取章节：'+err.message)}
	})
}

if(style == 'getLastStatus' || style == 'gls'){
	// 获取上次抓取进度
	readFileAsync(pathFile)
		.then(function(data){
			let objData = JSON.parse(data.toString());
			console.log(objData.last)
		})
		.catch(function(err){
			console.log(err)
		})	
	return true
}

	// 检查更新
async function main(){
	if(style == 'checkUpdate'){
		getList().then((list)=>{
			readFileAsync(pathFile)
				.then((data)=>{
				let objData = JSON.parse(data.toString());
					console.log(
						'本地进度:',
						objData.allList[0].title,
						'\n抓取进度:',
						tools.dealListHtml(list.text)[0].title
					)
				})
				.catch((err)=>{
					console.log(err)
				})
		}).catch((err)=>{console.log(err)})
	}else{
		// 主要抓取程序
		getList()
			.then((list)=>{
				result.arr = tools.dealListHtml(list.text);
				console.log('------------总共', result.arr.length, '章节--------------');
				tools.writeLogJson(pathFile, {last:[0,0],allList:result.arr})
				(async ()=>{
					for(let i = 0, l = result.arr.length; i < l; ++i) {
						let picList = await tools.makeReq({
							url: 'http://www.pufei.net' + result.arr[i].href,
							Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
							cookie:'__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
							host:'www.pufei.net',
							referer:'http://www.pufei.net/manhua/20',
							isCharset:false,
							cb:function(err){console.log("第"+result.arr[i].title+""+err.message)}
						});

						if(!picList) continue;
						result.arr[i].pic = tools.dealPicListHtml(picList.text)
						tools.writeLogJson(pathFile, {last:[0,0],allList:result.arr})

						console.log('------获取', result.arr[i].title,'的图片列表，共',result.arr[i].pic.length,'张-----------');


						for (let j = 1, jl = result.arr[i].pic.length; j <= jl; ++j) {
							let _pic = await tools.makeReq({
								isCharset:false,
								Accept:'image/webp,*/*;q=0.8',
								url: 'http://ziniao.zgkouqiang.cn/' + result.arr[i].pic[j],
								cookie:'_cfduid=dc43da4fb68265e15bb28840d3550a9c31480774326',
								host:'ziniao.zgkouqiang.cn',
								referer:'http://www.pufei.net'+result.arr[i].href,
								cb:function(err){console.log('图片：'+err.message)}
							});

							if(!_pic) continue;
							let path = _path.join('imgfile' , result.arr[i].title);
							let imgPath = _path.join(path, j + '.jpg');

							console.log('write start:', 'http://ziniao.zgkouqiang.cn/' + result.arr[i].pic[j])
							let finishSave = await writeFileAsync(imgPath, _pic.body)
							.then(function () {
								console.log('write OK:', imgPath)
							})
							.catch(function () {
								console.log('write err:', imgPath)
								mkdirAsync(path)
								.then(function () {
									return writeFileAsync(imgPath, _pic.body)
								})
								.then(function () {
									console.log('write file retry finished:', imgPath)
								})
								.catch(function (err) {
									console.log('retry err', err)
									throw  err;
								});
							});

						tools.writeLogJson(pathFile, {last:[i,j],allList:result.arr})
						}
					}
				})
			})
	}
}
main().catch((err)=>{console.log(err)})

