const puppeteer = require('puppeteer');
const fs = require('fs');

// 常量定义
const host = 'https://look.163.com'; // 直播平台域名
const homeHost = `${host}/hot`; // 直播间首页地址
const isLoop = true; // 是否需要循环截取同一直播间的图片
const loopTime = 10000; // 循环间隔
const openedNum = 7; // 一个浏览器实例只能打开的直播间个数
const endCondition = false; // 什么情况下结束程序? 
const loadingTime = 10000; // 等直播加载出来 视网络情况调整
const playBtnShowTime = 5000; // 等播放按钮加载出来
const launchConfig = {
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    slowMo: 100,
    args: []
}

// 生成文件目录
function createDir(dirName = '') {
    if (!fs.existsSync(`screenShot/${dirName}`)) {
        fs.mkdirSync(`screenShot/${dirName}`);
    }
}

// 从链接获取房间号
function getRoomId(roomLink = '') {
    if (!roomLink) return ''
    return roomLink.split('?')[1].split('&')[0].split('=')[1]
}


/**
 * 处理直播间截图
 * @Author   cheerylong
 * @DateTime 2018-11-20
 * @param    {[type]}   page     [description]
 * @param    {[type]}   roomLink [description]
 * @return   {[type]}            [description]
 */
async function handleRoomScreenShot(page, roomLink, browser, isEnd, num) {
    let roomId = getRoomId(roomLink);
    createDir(roomId);
    await page.setViewport({ width: 1920, height: 1080 })
    await page.goto(roomLink, { waitUntil: ['domcontentloaded'] });
    await page.waitFor(loadingTime)
    await page.click('#lvp_player_private_portal_id_private > div > i') // 点击播放按钮
    await page.waitFor(playBtnShowTime)
    let videoInfo = await page.$eval('.m-lvp-container>video', (el) => {
        return {
            x: el.getBoundingClientRect().x,
            y: el.getBoundingClientRect().y,
            width: el.getBoundingClientRect().width,
            height: el.getBoundingClientRect().height
        }
    });

    console.log('位置信息: ');
    console.log(videoInfo);

    await page.screenshot({
        path: `screenshot/${roomId}/${new Date().toLocaleString()}.png`,
        clip: videoInfo
    });

    if (isLoop) {
        setInterval(async () => {
            await page.screenshot({
                path: `screenshot/${roomId}/${new Date().toLocaleString()}.png`,
                clip: videoInfo
            });
        }, loopTime)
    } else {
        await page.close();
        if (isEnd) {
            await browser.close();
        }
    }
};

/**
 * 获取房间链接列表
 * @Author   cheerylong
 * @DateTime 2018-11-21
 * @return   {[type]}   [description]
 */
async function getRoomList(homePage) {
    return await homePage.$$eval('.m-lc1Dft-YP9>a', (rooms = []) => {
        let urls = [];
        rooms.forEach(room => {
            urls.push(room.href);
        });
        return urls
    })
}

/**
 * 程序入口
 * @Author   cheerylong
 * @DateTime 2018-11-20
 * @return   {[type]}   [description]
 */
async function start() {
    let browser = await puppeteer.launch(launchConfig);
    const homePage = await browser.newPage();

    // 获取首页所有直播间链接
    homePage.once('domcontentloaded', async () => {

        console.log('直播首页加载完成');

        await homePage.waitFor(1000);
        let roomList = await getRoomList(homePage)

        console.log('所有直播间:' + roomList);

        for (let num = 0; num < roomList.length; num++) {
            if (((num + 1) % openedNum) === 1 && num !== 0) {
                // 打开定量窗口后 新开一个浏览器
                browser = await puppeteer.launch(launchConfig);
            }
            let page = await browser.newPage()
            handleRoomScreenShot(page, roomList[num], browser, (num && ((num + 1) % openedNum === 0)), num);
        }
    })
    await homePage.goto(homeHost, {
        waitUntil: ['domcontentloaded']
    })
}

start();



