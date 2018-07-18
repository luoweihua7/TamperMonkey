// ==UserScript==
// @name         百度云密码自动填充
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  自动填充百度云密码
// @author       larify
// @run-at       document-idle
// @match        *//pan.baidu.com/share/*
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/BaiduYun-Password.user.js
// @icon         https://www.baidu.com/favicon.ico
// @grant        GM_xmlhttpRequest
// ==/UserScript==

setTimeout(() => {
    function getUrlParam(key) {
        let list = location.search.split(/[?|&]/) || [];
        let params = {};

        list.forEach(query => {
            let para = query.split('=');
            if (para[1]) {
                params[para[0]] = para[1];
            }
        })

        return params[key] || '';
    }


    let form = document.querySelector('[name=accessForm]');
    let surl = getUrlParam('surl');

    if (form && surl) {
        let link = `https://ypsuperkey.meek.com.cn/api/v1/items/BDY-${surl}?client_version=2018.9`;
        GM_xmlhttpRequest({
            method: "GET",
            url: link,
            onload: function(response) {
                try {
                    let data = JSON.parse(response.responseText || '');
                    let pwdEl = form.querySelector('input');
                    let wrapper = pwdEl.parentElement;

                    if (data.access_code) {
                        pwdEl.value = data.access_code;

                        setTimeout(() => {
                            let button = wrapper.querySelector('a');
                            button.click();
                        }, 300);
                    } else {
                        let div = document.createElement('div');

                        div.innerHTML = `<img src="data:image/png;base64,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" style="width:14px;margin-right:5px;margin-bottom:2px;vertical-align:middle;"><span style="color:#999; font-size:12px">暂无该分享的提取密码，请手动输入提取密码</span>`;
                        div.style.marginTop = '15px'
                        wrapper.after(div);
                    }
                } catch (e) {}
            }
        })
    }
}, 1000);
