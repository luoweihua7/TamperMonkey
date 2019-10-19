// ==UserScript==
// @name         BaiduSu直链在线解析按钮
// @namespace    http://github.com/luoweihua7/
// @version      1.0
// @description  添加一个BaiduSu直链在线解析的按钮
// @author       larify
// @match        https://pan.baidu.com/s/*
// @match        https://pan.baidu.com/share/*
// @match        https://yun.baidu.com/s/*
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/BaiduSu.user.js
// @icon         https://www.baidu.com/favicon.ico
// ==/UserScript==

(function() {
    "use strict";
  
    // 先看下按钮元素在不在，不在表示被取消分享等情况
    let buttonEl = document.querySelector("a.g-button");
    let wrapEl = buttonEl && buttonEl.parentElement;
  
    if (wrapEl) {
      let link = location.href.replace("baidu.com", "baidusu.com");
      let outerHTML = `<a id="baidusu" href="${link}" target="_blank" class="g-button" href="javascript:;" title="直链解析"><span class="g-button-right"><span class="text" style="width: auto;">直链解析</span></span></a>`;
      let frag = document.createRange().createContextualFragment(outerHTML);
  
      wrapEl.appendChild(frag);
    }
  })();
  