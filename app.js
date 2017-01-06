var express = require('express')
var app = express()
let fs = require('fs');
let charset = require('superagent-charset')
let request = require('superagent');;
let cheerio = require('cheerio');
let _path = require("path");
charset(request);

let promisify = function (func, option = {}) {
	return (...arg) => new Promise((resolve, reject) => {
		return func.apply(option.context, [...arg, (err, ...data) => {
			if (err) {
				return reject(err);
			}
			if (option.multiArg) {
				return resolve(data)
			}
			return resolve(data[0]);
		}]);
	})
}

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const appendFileAsync = promisify(fs.appendFile);
const readFileAsync = promisify(fs.readFile);

process.argv.forEach((val, index) => {
  console.log(`${index}: ${val}`);
});
if(process.argv[2] == 'getLastStatus' || process.argv[2] == 'gls'){
	// 获取上次抓取进度
	readFileAsync('镇魂街.json')
		.then(function(data){
			console.log(data)
		})
		.catch(function(err){
			console.log(err)
		})	
	return true
}



let makeReq = function(option){
	let _req =request.get(option.url)
	.set('Accept',option.Accept)
	.set('Accept-Encoding','gzip, deflate')
	.set('Accept-Language','zh-CN,zh;q=0.8,en;q=0.6')
	.set('Cache-Control','no-cache')
	.set('Connection','keep-alive')
	.set('Cookie',option.cookie)
	.set('Host',option.host)
	.set('Pragma','no-cache')
	.set('Referer',option.referer)
	.set('Upgrade-Insecure-Requests','1')
	.set('User-Agent','Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36')
	if(option.isCharset){
		return _req.charset('gbk')
		.catch(option.cb)
	}else{
		return _req.catch(option.cb)
	}

}

	let result = {success: true,arr:[]}
	//	获取章节列表
	let dealListHtml = function(text){
		let $ = cheerio.load(text)
		let _dom = $('#play_0')
		let info = [];
		_dom.find('a').each(function (i, ele) {
			info[i] = {};
			info[i].href = $(this).attr('href')
			info[i].title = $(this).attr('title')
		});
		return info;
	}
	// 获取章节图片列表
	let dealPicListHtml = function(text){
		var p = text.match(/function base64decode.*/)[0];
		var s = {};
		p = p.replace('function base64decode', 's.base64decode = function')
		eval(p);
		let photosr = new Array();
		let base64decode = s.base64decode;
		let _paced = text.match(/packed=.*slice\(\d\)\)\)\;/)[0];
		_paced = _paced.replace('packed=', 'let packed=')
		eval(_paced);
		return photosr;
	}
	let writeLogJson = function(content){

		writeFileAsync(_path.join('镇魂街.json'), JSON.stringify(content))
		.then(function(){console.log('write 镇魂街.json ok')})
		.catch(function(){console.log('write 镇魂街.json fail')})
	}
	// 主程序
	async function name() {
		let manhuaList = await makeReq({
			url: 'http://www.pufei.net/manhua/20/',
			Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
			cookie:'__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
			host:'www.pufei.net',
			referer:'http://www.pufei.net/manhua/',
			isCharset:true,
			cb:function(err){console.log('获取章节：'+err.message)}
		})

		result.arr = dealListHtml(manhuaList.text);
		console.log('------------总共', result.arr.length, '章节--------------');
			writeLogJson({last:[0,0],allList:result.arr})

		for(let i = 0, l = result.arr.length; i < l; ++i) {
			let picList = await makeReq({
				url: 'http://www.pufei.net' + result.arr[i].href,
				Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
				cookie:'__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
				host:'www.pufei.net',
				referer:'http://www.pufei.net/manhua/20',
				isCharset:false,
				cb:function(err){console.log("第"+result.arr[i].title+""+err.message)}
			});

			if(!picList) continue;
			result.arr[i].pic = dealPicListHtml(picList.text)
			writeLogJson({last:[0,0],allList:result.arr})

			console.log('------获取', result.arr[i].title,'的图片列表，共',result.arr[i].pic.length,'张-----------');


			for (let j = 1, jl = result.arr[i].pic.length; j <= jl; ++j) {
				let _pic = await makeReq({
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

			writeLogJson({last:[i,j],allList:result.arr})
			}
		}
	}

	name()