// ==UserScript==
// @name         去除Outlook右侧广告
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  去除Outlook右侧广告
// @author       larify
// @run-at       document-idle
// @match        https://outlook.live.com/*
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/Outlook-AD-Remover.user.js
// @icon         https://outlook.live.com/owa/favicon.ico
// @grant        none

// ==/UserScript==

(() => {
  let app;
  let observer;
  let throttle = (callback = () => {}, time = 300) => {
    let timer = -1;

    return (...args) => {
      clearTimeout(timer);

      timer = setTimeout(() => {
        callback(...args);
      }, time);
    };
  };
  let debounce = (callback = () => {}, time = 300) => {
    let timer = -1;

    return (...args) => {
      if (timer > -1) {
        return;
      }

      timer = setTimeout(() => {
        callback(...args);
        clearTimeout(timer);
        timer = -1;
      }, time);
    };
  };
  let removeOutlookAD = () => {
    if (document.querySelector('[aria-label="设置广告首选项"]')) {
      document.querySelector('[aria-label="设置广告首选项"]').parentElement.parentElement.parentElement.parentElement.remove();
      observer?.disconnect?.();
    }
  };

  app = document.querySelector('#app');
  observer = new MutationObserver(debounce(removeOutlookAD, 150));
  observer.observe(app, { childList: true, subtree: true });
})();
