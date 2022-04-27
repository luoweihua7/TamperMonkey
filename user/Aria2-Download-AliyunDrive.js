// ==UserScript==
// @name         阿里云盘导出到 Aria2 下载
// @version      1.0
// @description  阿里云盘文件，导出到 Aria2 下载
// @author       Larify
// @match        *://www.aliyundrive.com/drive/*
// @icon         https://img.aliyundrive.com/avatar/024f976175904d97a5779f2c26e6a7b9.png
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_setClipboard
// @connect      api.aliyundrive.com
// @connect      aliyundrive.com
// @connect      alicloudccp.com
// @connect      websv.aliyundrive.com
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const aria2 = {
    // 配置，按照实际修改，后续会做成UI配置化
    config: {
      protocol: 'http', // 协议，一般是走http下载，后续支持websocket等
      host: 'www.example.com', // aria2 的地址，可以是ip也可以是域名
      port: '6800', // aria2 的端口，一般是6800，如果做了端口转发，则按照实际配置即可
      path: 'jsonrpc', // 通过jsonrpc模式下载，一般不需要修改，暂未测试使用ws下
      token: '123123123', // 密码，不支持老 user/password 模式
    },
    getRPC() {
      const { protocol, host, port, path, token } = this.config;
      return `${protocol}://${host}:${port}/${path}?token=${token}`;
    },
    uuid() {
      // 这里可以直接使用 Date.now() 和 Math.random() 组合生成唯一ID
      // Copy from https://stackoverflow.com/a/8809472
      var d = new Date().getTime(); //Timestamp
      var d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0; //Time in microseconds since page-load or 0 if unsupported
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16; //random number between 0 and 16
        if (d > 0) {
          //Use timestamp until depleted
          r = (d + r) % 16 | 0;
          d = Math.floor(d / 16);
        } else {
          //Use microseconds since page-load if supported
          r = (d2 + r) % 16 | 0;
          d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
    },
    request({ method, params } = {}, callback = () => {}) {
      const { token } = this.config;
      const url = this.getRPC();
      const options = {
        jsonrpc: '2.0',
        id: this.uuid(),
        method,
        params: [`token:${token}`, ...params],
      };

      // 调用油猴接口发起请求
      GM_xmlhttpRequest({
        method: 'POST',
        url,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        data: JSON.stringify(options),
        onload: callback,
        onerror: callback,
      });
    },
    addTask(url, { headers = [], fileName } = {}, callback) {
      const params = {
        method: 'aria2.addUri',
        params: [[url], { header: headers, out: fileName }],
      };

      this.request(params, callback);
    },
  };

  // 一些帮助方法
  const utils = {
    debounce(fn, delay = 500) {
      let timer = null;
      return (...args) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          fn(...args);
        }, delay);
      };
    },
    throttle(fn, delay = 500) {
      let timer = null;
      return (...args) => {
        if (!timer) {
          timer = setTimeout(() => {
            fn(...args);
            timer = null;
          }, delay);
        }
      };
    },
  };

  // 主入口
  const app = {
    init() {
      // 绑定DOM变更事件
      const callback = this.bindEvents.bind(this);
      const observer = new MutationObserver(utils.debounce(callback, 250));
      observer.observe(document.body, { childList: true, subtree: true });
    },
    bindEvents() {
      const container = document.querySelector('div[class*="node-list-table-view"]');
      const tbody = container?.querySelector('div[class*="tbody"]');
      if (tbody) {
        console.log(`页面列表处理化完成`, tbody);
        const elems = [...tbody.querySelectorAll('div[class*="tr-wrapper"]')];
        elems.forEach((el) => {
          const col = el.querySelector('div[data-col-key="name"]');

          this.addAriaButton(col);
        });
      }
    },
    addAriaButton(el) {
      const btnOld = document.querySelector('.btn-download-aria2');

      if (!btnOld) {
        const header = document.querySelector('header > div[class*="actions"]');
        const btnAdd = header.querySelector('div[class*="action"]');

        if (btnAdd) {
          const btnAria2 = btnAdd.cloneNode(true);
          const span = btnAria2?.querySelector('span');

          if (span) {
            span.dataset.iconType = 'PDSDownLoad';
            span.innerHTML = `<svg viewBox="0 0 1024 1024"><use xlink:href="#PDSDownLoad"></use></svg>`;
          }

          if (btnAria2) {
            btnAria2.classList.add('btn-download-aria2');
            header.appendChild(btnAria2);

            btnAria2.addEventListener('click', (e) => {
              // 绑定点击事件，下载选择的文件
            });
          }
        }
      }
    },
    downloadFiles() {
      const files = this.getSelected();
      if (files?.length > 0) {
        //
      } else {
        // 没有选择文件
      }
    },
    getSelected() {
      // 批量选择时，返回勾选的对象列表
      const container = document.querySelector('div[class*="node-list-table-view"]');
      const k = Object.keys(container)?.filter((k) => k?.startsWith('__reactFiber'))?.[0];

      const props = container[k]?.return?.pendingProps?.value || {};
      const { selectedKeys, dataSource } = props;
      const keys = selectedKeys.split(',');
      const selected = dataSource.filter((item) => keys.indexOf(item.fileId) > -1);

      return selected;
    },
    showTips(tip) {},
  };

  app.init();

  // 调试用
  const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  win.app = app;
  win.aria2 = aria2;
})();
