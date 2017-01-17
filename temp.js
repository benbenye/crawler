/**
 * Created by bby on 17/1/16.
 */

// 主要抓取程序
await
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




