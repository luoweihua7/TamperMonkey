// ==UserScript==
// @name         Vue调试
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  在生产环境开启Vue.js devtools调试
// @author       larify
// @run-at       document-end
// @match        <all_urls>
// @include      *
// @grant        unsafeWindow
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/Debug-Vue-In-Production.user.js
// @icon         https://vuejs.org//images/logo.png
// ==/UserScript==

(function () {
  function findVueInstance($el) {
    // console.log(`Finding Vue: ${$el.tagName}`)
    let __vue__ = $el.__vue__;

    if (__vue__) {
      return __vue__;
    } else {
      let tagName = $el.tagName;
      if (["SCRIPT", "STYLE"].indexOf(tagName) === -1) {
        let children = [...$el.children];

        children.some($child => {
          __vue__ = findVueInstance($child);
          return __vue__;
        });

        return __vue__;
      } else {
        return;
      }
    }
  }

  function getVue(obj) {
    if (!!obj && obj._isVue) {
      let $constructor = obj.constructor;

      if (
        $constructor.config &&
        typeof $constructor.config.devtools === "boolean"
      ) {
        return obj.constructor;
      }

      if (
        $constructor.super &&
        $constructor.super.config &&
        typeof $constructor.super.config.devtools === "boolean"
      ) {
        return $constructor.super;
      }
    }

    return;
  }

  let window = unsafeWindow;

  setTimeout(() => {
    if (
      typeof window.__VUE_DEVTOOLS_GLOBAL_HOOK__ === "object" &&
      typeof __VUE_DEVTOOLS_GLOBAL_HOOK__.emit === "function"
    ) {
      let $vm = findVueInstance(document.querySelector("body"));
      let _Vue = getVue($vm);

      if (_Vue) {
        _Vue.config.devtools = true;
        __VUE_DEVTOOLS_GLOBAL_HOOK__.emit("init", _Vue);

        console.log(
          `已启用Vue生产环境调试，如果无法看到Vue调试Tab，请关闭DevTools再打开`
        );
      }
    }
  }, 500);
})();
