const charset = require('superagent-charset');
const request = require('superagent');
const cheerio = require('cheerio');
const fs = require('fs')
const _path = require('path')
charset(request);

exports.promisify = function (func, option = {}) {
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
};

const writeFileAsync = exports.promisify(fs.writeFile);
const mkdirAsync = exports.promisify(fs.mkdir);

//	获取章节列表,
exports.dealListHtml = function (text) {
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
// 获取章节图片列表,
exports.dealPicListHtml = function (text) {
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
};

exports.writeLogJson = function (path, content) {
  return writeFileAsync(_path.join(path), JSON.stringify(content))
    .then(function () {
      console.log('write ', path, 'ok')
    })
    .catch(function () {
      console.log('write ', path, 'fail')
    })
};

exports.makeReq = function (option) {
  let _req = request.get(option.url)
    .set('Accept', option.Accept)
    .set('Accept-Encoding', 'gzip, deflate')
    .set('Accept-Language', 'zh-CN,zh;q=0.8,en;q=0.6')
    .set('Cache-Control', 'no-cache')
    .set('Connection', 'keep-alive')
    .set('Cookie', option.cookie)
    .set('Host', option.host)
    .set('Pragma', 'no-cache')
    .set('Referer', option.referer)
    .set('Upgrade-Insecure-Requests', '1')
    .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36')
  if (option.isCharset) {
    _req.charset('gbk');
  }
  return _req;
}

exports.forEachTask = function (arr, fun) {
  let promise = Promise.resolve();
  arr.forEach((a, i) => {
    promise = promise.then(() => {
      return fun(a, i);
    });
  });
  return promise;
}

exports.saveFile = function (option) {
  return exports.writeLogJson(option.logPath, JSON.stringify({last: option.last, allList: option.allList}))
    .then(()=> {
      return writeFileAsync(option.imgPath, option.body)
        .then(()=> {
          console.log('write img: ' + option.imgPath);
        })
        .catch(err=> {
          return mkdirAsync(option.path)
            .then(()=> {
              return writeFileAsync(option.imgPath, option.body)
                .then(()=> {
                  console.log('retry write img: ' + option.imgPath + 'OK!');
                })
            })
            .catch(err=> {
              console.log('write img retry fail' + err.message);
            })
        })
    })
}
