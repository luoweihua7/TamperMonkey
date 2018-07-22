// ==UserScript==
// @name         在iTunes中打开
// @namespace    http://tampermonkey.net/
// @version      0.2.2
// @description  给iOS对应的iTunes应用增加 "在这里查看：iTunes" 按钮
// @author       larify
// @run-at       document-idle
// @match        https://itunes.apple.com/*
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/Open-In-iTunes.user.js
// @icon         https://itunes.apple.com/favicon.ico
// @grant        none

// ==/UserScript==

setTimeout(() => {
    // 无按钮时才添加（MAS默认有）
    if (!document.querySelector('.product-header__routes')) {
        let domStr = `<div class="product-header__routes"><p class="product-header__routes__cta"><button aria-label="在 iTunes 中查看" class="we-button we-button--outlined we-button--external ember-view">在这里查看： <span class="we-button__app-text">iTunes </span></button></p></div>`;
        let targetEl = document.querySelector('.product-header__list');

        if (targetEl) {
            let tmp = document.createElement('div');
            tmp.innerHTML = domStr;

            let dom = tmp.firstChild;
            // chrome 54+
            targetEl.after(dom);

            let buttonEl = dom.querySelector('button');
            buttonEl.addEventListener('click', function (e) {
                let iframe = document.createElement('iframe');
                iframe.style = '';
                iframe.src = location.href.replace(location.protocol, 'itmss:');

                document.body.appendChild(iframe);
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 500);
            });
        }
    }
}, 1500);
