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
    let app = $el.__vue__ || $el.__vue_app__;
    let result = { app, Vue: getVue(app), isVue2: $el.__vue__, isVue3: $el.__vue_app__ };

    if (result.app && result.Vue) {
      return result;
    } else {
      let tagName = $el.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'SYMBOL'].indexOf(tagName) === -1) {
        let children = [...$el.children];

        children.some(($child) => {
          result = findVueInstance($child);
          return result && result.app && result.Vue;
        });

        return result;
      } else {
        return;
      }
    }
  }

  function getVue(app) {
    if (!!app) {
      if (app._isVue) {
        // Vue2
        let ctor = app.constructor;

        if (ctor.config && typeof ctor.config.devtools === 'boolean') {
          return ctor;
        }

        if (ctor.super && ctor.super.config && typeof ctor.super.config.devtools === 'boolean') {
          return ctor.super;
        }
      } else if (app._container && app._container._vnode && app._container._vnode.component) {
        // Vue3
        return app;
      }
    }

    return;
  }

  function printLog(message, title = 'Vue Devtools') {
    console.log(
      `%c ${title} %c ${message} %c`,
      'background:#35495e ; padding: 2px; border-radius: 3px 0 0 3px;  color: #fff',
      'background:#41b883 ; padding: 2px; border-radius: 0 3px 3px 0;  color: #fff',
      'background:transparent'
    );
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
    const devtoolsHook = win.__VUE_DEVTOOLS_GLOBAL_HOOK__;

    if (typeof devtoolsHook === 'object' && typeof devtoolsHook.emit === 'function') {
      const { app, Vue, isVue2, isVue3 } = findVueInstance(document.querySelector('body'));

      if (isVue2 && Vue && Vue.config.devtools === false) {
        Vue.config.devtools = true;

        // Init Vue Components
        devtoolsHook.emit('init', Vue);

        // Init Vuex Store
        function devtoolPlugin(store) {
          if (!devtoolsHook || !store) {
            return;
          }

          store._devtoolsHook = devtoolsHook;

          devtoolsHook.emit('vuex:init', store);

          devtoolsHook.on('vuex:travel-to-state', function (targetState) {
            store.replaceState(targetState);
          });

          store.subscribe(function (mutation, state) {
            devtoolsHook.emit('vuex:mutation', mutation, state);
          });
        }
        devtoolPlugin(app.$store);

        printLog('已启用Vue2调试，如未看到Vue调试Tab，请关闭 Developer Tools 后再重新打开');
      } else if (isVue3 && app) {
        devtoolsHook.enabled = true;
        devtoolsHook.emit('app:init', app, app.version, {});
        printLog('已启用Vue3调试，如未看到Vue调试Tab，请关闭 Developer Tools 后再重新打开');
      } else {
        printLog('未检测到Vue实例');
      }
    } else {
      printLog('未检测到 Vue.js devtools 插件');
    }
  }, 500);
})();
