const fs = require('fs');
const _path = require("path");
const tools = require('./tools');

const writeFileAsync = tools.promisify(fs.writeFile);
const mkdirAsync = tools.promisify(fs.mkdir);
const appendFileAsync = tools.promisify(fs.appendFile);
const readFileAsync = tools.promisify(fs.readFile);

const style = process.argv[2];
const pathFile = process.argv[3];
let result = {success: true, arr: []};

let getList = function () {
  'use strict'
  return tools.makeReq({
    url: 'http://www.pufei.net/manhua/20/',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
    cookie: '__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
    host: 'www.pufei.net',
    referer: 'http://www.pufei.net/manhua/',
    isCharset: true,
  })
};
let getPicList = function (info) {
  return tools.makeReq({
    url: 'http://www.pufei.net' + info.href,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
    cookie: '__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
    host: 'www.pufei.net',
    referer: 'http://www.pufei.net/manhua/20',
    isCharset: false
  })
}
let getPicReq = function (href, refererHref) {
  return tools.makeReq({
    isCharset: false,
    Accept: 'image/webp,*/*;q=0.8',
    url: 'http://ziniao.zgkouqiang.cn/' + href,
    cookie: '_cfduid=dc43da4fb68265e15bb28840d3550a9c31480774326',
    host: 'ziniao.zgkouqiang.cn',
    referer: 'http://www.pufei.net' + refererHref,
  })
}
if (style == 'getLastStatus' || style == 'gls') {
  // 获取上次抓取进度
  readFileAsync(pathFile)
    .then(function (data) {
      let objData = JSON.parse(data.toString());
      console.log(objData.last)
    })
    .catch(function (err) {
      console.log(err)
    })
  return true
}

// 检查更新
if (style == 'checkUpdate') {
  getList().then((list)=> {
    readFileAsync(pathFile)
      .then((data)=> {
        let objData = JSON.parse(data.toString());
        console.log(
          '本地进度:',
          objData.allList[0].title,
          '\n抓取进度:',
          tools.dealListHtml(list.text)[0].title
        )
      })
      .catch((err)=> {
        console.log(err)
      })
  }).catch((err)=> {
    console.log(err)
  })
  return;
}

// 主要抓取程序
(async()=> {
  try{
    let list = await getList();
    result.arr = tools.dealListHtml(list.text);
    console.log('------------总共', result.arr.length, '章节--------------');
    await writeFileAsync(pathFile, JSON.stringify({last: [0, 0], allList: result.arr}))
    console.log('write ', pathFile, 'ok');
    result.arr.forEach(async(e, i) => {
      try {
        let picList = await getPicList(e);
        e.pic = tools.dealPicListHtml(picList.text);
        console.log('------获取', e.title, '的图片列表，共', e.pic.length, '张-----------');
        await writeFileAsync(pathFile, JSON.stringify({last: [0, 0], allList: result.arr}))

        e.pic.forEach(async(picHref, j) => {
          if (!picHref) return;
          try {
            let picReq = await getPicReq(picHref, e.href);
            if (!picReq) return new Error('not image');

            let path = _path.join('imgfile2', e.title);
            let imgPath = _path.join(path, j + '.jpg');
            console.log('write start:', 'http://ziniao.zgkouqiang.cn/' + e.pic[j])
            try {
              await writeFileAsync(imgPath, picReq.body)
              console.log('write OK:', imgPath)
            }
            catch (err) {
              await mkdirAsync(path);
              await writeFileAsync(imgPath, picReq.body);
              console.log('write file retry finished:', imgPath)
            }
            await writeFileAsync(pathFile, JSON.stringify({last: [i, j], allList: result.arr}))
          }
          catch(err){
              console.error('图片：' + err.message)
          }
        })
      }
      catch (err) {
        console.log("第" + e.title + "" + err.message)
      }
    })
  }
  catch (err){
   console.log('获取章节:', err.message);
  }

})()
