const fs = require('fs');
const _path = require("path");
const tools = require('./tools');

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
    .catch(err=> {
      console.log('获取章节:', err.message);
    })
};
let getPicList = function (info) {
  return tools.makeReq({
    url: 'http://www.pufei.net' + info,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
    cookie: '__cfduid=d8ee8af0943f32d523ae9165ac4ef57351481265253; imgserver=1; playeds=20%7C6526%7C%E9%95%87%E9%AD%82%E8%A1%97%7C171%20%E6%9B%B9%E7%8E%84%E4%BA%AE04%7C1482217980%7C20; Hm_lvt_230837fdf572deef0b702c931922583f=1481265282; Hm_lpvt_230837fdf572deef0b702c931922583f=1482217981',
    host: 'www.pufei.net',
    referer: 'http://www.pufei.net/manhua/20',
    isCharset: false
  })
    .catch(err=> {
      console.log('获取图片列表:', err.message);
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
    .catch(err=> {
      console.log('获取图片:', err.message);
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
getList()
  .then(res => {
    //  将抓取的信息处理成可用的数据   body=》章节list
    result.arr = tools.dealListHtml(res.text);
    console.log('------------总共', result.arr.length, '章节--------------');

    //  打log 记录章节列表已成功抓取
    return tools.writeLogJson(pathFile, JSON.stringify({last: [0, 0], allList: result.arr}))
  })
  .then(() => {
    //  根据章节列表抓取对应章节下的图片列表
    return tools.forEachTask(result.arr, function (e, i) {
      return getPicList(e.href)
        .then(res => {
          //  将抓取到的信息处理成可用的数据,  body =》 图片列表
          e.pic = tools.dealPicListHtml(res.text)

          //  打log 记录章节对应的图片链接已成功抓取
          return tools.writeLogJson(pathFile, JSON.stringify({last: [e, 0], allList: result.arr}))
        })
        .then(()=> {
          // 抓取图片
          return tools.forEachTask(e.pic, function (imgHref, j) {
            return getPicReq(imgHref, e.href)
              .then(res => {
                //  图片抓取到了
                return tools.saveFile({
                  logPath: pathFile,
                  last: [i, j],
                  allList: result.arr,
                  body: res.body,
                  imgPath:_path.join('imgfile2', e.title, j + '.jpg'),
                  path: _path.join('imgfile2', e.title)
                })
              })
              .catch(err=> {
                console.error('图片:', i, '-', j, err.message)
              })
              .then(()=>{
                return setTimeout(()=>{},2000+Math.random())
              })
          })
        })
    })
  })
  .then(()=>{
    console.log('finished!')
  })
