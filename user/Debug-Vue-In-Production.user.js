// ==UserScript==
// @name         Vue调试
// @namespace    http://tampermonkey.net/
// @version      1.1.1
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
    // console.log(`Finding Vue: ${$el.tagName} - ${$el.className}`);
    let $vm = $el.__vue__;
    let result = { $vm, Vue: getVue($vm) };

    if (result.$vm && result.Vue) {
      return result;
    } else {
      let tagName = $el.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'SYMBOL'].indexOf(tagName) === -1) {
        let children = [...$el.children];

        children.some(($child) => {
          result = findVueInstance($child);
          return result && result.$vm && result.Vue;
        });

        return result;
      } else {
        return;
      }
    }
  }

  function getVue(obj) {
    if (!!obj && obj._isVue) {
      let $constructor = obj.constructor;

      if ($constructor.config && typeof $constructor.config.devtools === 'boolean') {
        return $constructor;
      }

      if ($constructor.super && $constructor.super.config && typeof $constructor.super.config.devtools === 'boolean') {
        return $constructor.super;
      }
    }

    return;
  }

  let win;
  if (typeof window !== 'undefined' && window.top === window) {
    win = window;
  } else if (typeof unsafeWindow !== 'undefined') {
    win = unsafeWindow;
  }

  if (!win) return;

  // Wait for Vue.js devtools ready
  setTimeout(() => {
    const devtoolHook = win.__VUE_DEVTOOLS_GLOBAL_HOOK__;

    if (typeof devtoolHook === 'object' && typeof devtoolHook.emit === 'function') {
      const { $vm, Vue } = findVueInstance(document.querySelector('body'));

      if (Vue && Vue.config.devtools === false) {
        Vue.config.devtools = true;

        // Init Vue Components
        devtoolHook.emit('init', Vue);

        // Init Vuex Store
        function devtoolPlugin(store) {
          if (!devtoolHook || !store) {
            return;
          }

          store._devtoolHook = devtoolHook;

          devtoolHook.emit('vuex:init', store);

          devtoolHook.on('vuex:travel-to-state', function (targetState) {
            store.replaceState(targetState);
          });

          store.subscribe(function (mutation, state) {
            devtoolHook.emit('vuex:mutation', mutation, state);
          });
        }
        devtoolPlugin($vm.$store);

        console.log(
          `%c vue-devtools %c 已启用Vue生产环境调试，如果无法看到Vue调试Tab，请关闭 Developer Tools 后再重新打开 %c`,
          'background:#35495e ; padding: 2px; border-radius: 3px 0 0 3px;  color: #fff',
          'background:#41b883 ; padding: 2px; border-radius: 0 3px 3px 0;  color: #fff',
          'background:transparent'
        );
      }
    }
  }, 500);
})();
