// ==UserScript==
// @name        115Downloader
// @namespace   https://github.com/luoweihua7/tampermonkey.115downloader
// @homepageURL https://github.com/luoweihua7/tampermonkey.115downloader
// @supportURL  https://github.com/luoweihua7/tampermonkey.115downloader/issues
// @description 115网盘下载插件,提供复制下载链接到剪贴板,添加到Aria下载功能
// @author      f0rger
// @icon        http://115.com/web_icon.jpg
// @include     http*://115.com/?ct=file*
// @include     http*://115.com/?aid=-1&search*
// @downloadURL https://github.com/luoweihua7/tampermonkey.115downloader/raw/master/115downloader.user.js
// @updateURL   https://github.com/luoweihua7/tampermonkey.115downloader/raw/master/115downloader.user.js
// @version     1.1.3
// @grant       unsafeWindow
// @grant       GM_setClipboard
// @grant       GM_setValue
// @grant       GM_getValue
// @run-at      document-end
// @require     http://115.com/static/js/jquery.js?v=1472810197
// ==/UserScript==

(function () {
    'use strict';

    /**
     * 配置
     */
    var CONFIG = {
        showCopy: 1,
        showAriaDownload: 1,
        directDownload: 1,
        MAX_COUNT: 50
    };

    // 115 内置对象
    var Core = top.Core;
    var DialogBase = Core.DialogBase;
    var MinMessage = Core.MinMessage;
    var Message = Core.Message;
    var DownloadAjax = top.UA$.ajax;
    var FilesAjax = top.APS$.ajax;

    /**
     * 请求相关
     * @type {{getDownloadUrl: API.getDownloadUrl, getSingleFolder: API.getSingleFolder, getDownloadUrls: API.getDownloadUrls, getFilesUrls: API.getFilesUrls, sequence: API.sequence}}
     */
    var API = {
        /**
         * 获取单个文件下载地址
         * @param data {Object} 参数 {filetype:0,pickcode:xxxx}
         * @param callback {Function} 回调方法, 参数{url:'downloadurl',filename:'filename'}
         */
        getDownloadUrl: function (data, callback) {
            var url = 'files/download?' + $.param({pickcode: data.pickcode});

            DownloadAjax({
                url: url,
                type: 'GET',
                dataType: 'json',
                cache: false,
                success: function (json) {
                    if (json && json.state) {
                        callback({url: json.file_url, filename: json.file_name});
                    } else {
                        callback();
                    }
                },
                error: function (err) {
                    callback(err);
                }
            });
        },
        getSingleFolder: function (data, callback) {
            var url = 'natsort/files.php?' + $.param({cid: data.cid, asc: 1, offset: 0, limit: data.limit || 50});

            FilesAjax({
                url: url,
                type: 'GET',
                dataType: 'json',
                cache: false,
                success: function (json) {
                    if (json && json.state) {
                        if (json.data.length < json.count) {
                            data = Object.assign({}, data, {limit: json.count + 1});
                            API.getSingleFolder(data, callback);
                        } else {
                            callback(json.data);
                        }
                    } else {
                        callback([]); // 容错,服务器返回数据错误,一般是115调整了接口导致
                    }
                },
                error: function (err) {
                    callback(err);
                }
            });
        },
        /**
         * 获取多个文件的下载地址
         * @param files
         */
        getDownloadUrls: function (files, callback) {
            if (!Array.isArray(files)) {
                throw 'files not array';
            }

            var urls = [];

            function action(data, resolve, reject) {
                API.getDownloadUrl(data, function (json) {
                    if (json instanceof Error || typeof json === 'undefined') {
                        reject();
                    } else {
                        urls.push(json);
                        resolve();
                    }
                });
            }

            function complete() {
                callback(urls);
            }

            API.sequence({
                data: files,
                action: action,
                complete: complete
            });
        },
        /**
         * 获取选中文件(夹)的下载地址
         * @param list {Object} 参数,其中filetype为1表示目录,0表示文件 [{filetype:1,cid:863173392625567454,filename:'目录名'},{filetype:0,filename:'文件名',pickcode:'cxqmf91c5rj1cddq8'}]
         * @param callback
         */
        getFilesUrls: function (list, callback) {
            if (!Array.isArray(list)) {
                callback(new Error('list not array'));
                return;
            }

            //文件pickcode列表,最终根据这个来获取所有的下载地址
            var files = [];

            function action(data, resolve, reject) {
                if (data.filetype == 0) {
                    // 目录,递归遍历自目录
                    API.getSingleFolder(data, function (list) {
                        if (list instanceof Error) {
                            reject();
                        } else {
                            list.forEach(function (file) {
                                files.push({
                                    filetype: 0,
                                    filename: file.n,  //name
                                    pickcode: file.pc  //pickcode
                                });
                            });
                            resolve();
                        }
                    });
                } else {
                    files.push(data);
                    resolve();
                }
            }

            function complete() {
                function goGetUrls() {
                    UI.showLoading();
                    API.getDownloadUrls(files, function (urls) {
                        UI.hideLoading();
                        callback(urls);
                    });
                }

                if (files.length > CONFIG.MAX_COUNT) {
                    UI.hideLoading();
                    Message.Confirm({
                        text: `有超过${CONFIG.MAX_COUNT}个文件需要处理,是否继续?`,
                        callback: function (confirm) {
                            if (confirm) {
                                goGetUrls();
                            }
                        }
                    });
                } else {
                    goGetUrls();
                }
            }

            UI.showLoading();

            API.sequence({
                data: list,
                action: action,
                complete: complete
            });
        },
        /**
         * 队列请求,不并发请求
         * @param params {Object} 请求参数
         * @param params.data {Array} 需要发起请求的数组
         * @param params.action {Function} 单个请求的处理
         * @param params.complete {Function} 处理完成后的请求
         */
        sequence: function (params) {
            var list = params.data;
            var action = params.action;
            var complete = params.complete;

            function handle(data) {
                return new Promise(function (resolve, reject) {
                    action(data, resolve, reject);
                });
            }

            var first = handle(list.shift());
            if (list.length == 0) {
                // 只有一个请求需要处理
                first.then(function () {
                    complete();
                }, function () {
                    complete();
                });
            } else {
                var promise = list.reduce(function (p, current) {
                    return p.then(function () {
                        return handle(current);
                    }, function () {
                        return handle(current);
                    });
                }, first);


                promise.then(function () {
                    complete();
                }, function () {
                    complete();
                });
            }
        }
    };

    /**
     * Aria2相关方法
     */
    var ARIA2 = {
        config: {
            key: 'aria2_conf',
            regex: /^(http\:\/\/|https\:\/\/)?((.*):(.*)?@)?([a-zA-Z0-9\.-_]*)(\:(\d+))\/jsonrpc$/,
            conf: '',
            url: '',
            protocol: '',
            token: '',
            host: 'localhost',
            port: 6800
        },
        init: function () {
            var conf = GM_getValue(ARIA2.config.key) || 'http://localhost:6800/jsonrpc';
            this.setConf(conf);

            // 添加Aria2的设置按钮
            var $container = $('#js_top_panel_box #js-ch-member-info_box .tup-logout');
            var $setting = $('<a href="javascript:;"><span>Aria2设置</span></a>');

            $container.prepend($setting);
            $setting.off('click').on('click', function (e) {
                ARIA2.showConf();
            });
        },
        setConf: function (conf, onSuccess, onFail) {
            var config = this.config;
            var regex = config.regex;

            if (regex.test(conf)) {
                GM_setValue(ARIA2.config.key, conf);
                conf.replace(regex, function (match, $1, $2, $3, $4, $5, $6, $7) {
                    // 兼容user:password的模式和token的模式
                    var user = '', password = '', token = '';
                    if ($3 && $4) {
                        if ($3 === 'token') {
                            token = $4;
                        } else {
                            user = $3;
                            password = $4;
                        }
                    }

                    config = Object.assign(config, {
                        conf: conf,
                        url: $1 + $5 + ($7 ? (':' + $7) : '') + '/jsonrpc',
                        protocol: $1,
                        token: token,
                        user: user,
                        password: password,
                        host: $5,
                        port: $7
                    });
                });
                typeof onSuccess === 'function' && onSuccess();
            } else {
                typeof onFail === 'function' && onFail();
            }
        },
        showConf: function () {
            var conf = this.config.conf;
            var content = `<div class="dialog-input"><input type="text" rel="txt" class="text" placeholder="http://localhost:6800/jsonrpc" /></div>`;
            var options = {
                content: content,
                title: '设置RPC地址'
            };
            var $input;
            var dialog = UI.confirm(options, function (e) {
                var val = $input.val();

                ARIA2.setConf(val, function () {
                    typeof dialog.Close === 'function' && dialog.Close();
                    UI.showMessage('RPC地址已保存', 'suc');
                }, function () {
                    e.cancel = true;
                    UI.showMessage('Aria2配置不正确', 'err');
                });
            });

            $input = dialog.$el.find('input.text');
            $input.val(conf);
        },
        /**
         * 添加下载任务
         * @param uri {String} 下载地址
         */
        addUri: function (uri, options, callback) {
            var config = this.config;
            var url = config.url + '?tm=' + Date.now();
            var params = [];
            var data;

            options = options || {};
            callback = callback || $.noop;

            if (config.token) {
                params.push('token:' + config.token);
            } else if (config.user && config.password) {
                params.push(config.user + ':' + config.password);
            }

            params.push([uri]);
            //这是Aria下载参数,使用默认,后续开放设置
            params.push({
                //文件名
                "out": options.out || '',

                //保存目录
                //"dir" '/data/downloads/',

                //分块下载
                "split": "5",

                //连接数
                "max-connection-per-server": "5",

                //分享率(BT)
                //"seed-ratio": "1.0",

                //做种时间(分钟)
                //"seed-time": "120",

                //自定义header头
                "header": "Cookie: " + unsafeWindow.document.cookie
            });

            data = [{
                jsonrpc: '2.0',
                method: 'aria2.addUri',
                id: Date.now(),
                params: params
            }];

            $.ajax({
                url: url,
                type: 'POST',
                data: JSON.stringify(data),
                success: callback,
                error: function () {
                    callback();
                }
            });
        }
    };

    /**
     * 插件界面UI(沿用115原生UI)
     */
    var UI = {
        buttons: [],
        showMessage: function (text, type, timeout) {
            MinMessage.Show({
                type: type,
                text: text,
                timeout: timeout || 2000
            });
        },
        showLoading: function (options) {
            options = options || {};
            MinMessage.Show({text: options.text || '处理中,请稍候', type: 'load', timeout: options.timeout || 0});
        },
        hideLoading: function () {
            MinMessage.Hide();
        },
        confirm: function (params, onSubmit, onCancel) {
            var buttomEl = `<div class="dialog-action"><a href="javascript:;" class="dgac-cancel" btn="cancel">取消</a><a href="javascript:;" class="dgac-confirm" btn="confirm">确定</a></div>`;
            var title = params.title;
            var $content = $(params.content + buttomEl);
            var dialog = new DialogBase({
                title: title,
                content: $content
            });

            dialog.Open(null);
            dialog.$el = $content.eq(0); // 只返回内容部分,title和按钮区域不返回
            dialog.$buttons = $content.eq(1);
            dialog.$buttons.find('.dgac-confirm').on('click', function (e) {
                typeof onSubmit === 'function' && onSubmit(e);

                if (e.cancel !== true) {
                    // 不关闭
                    typeof dialog.Close === 'function' && dialog.Close();
                }
            });
            dialog.$buttons.find('.dgac-cancel').on('click', function () {
                typeof onCancel === 'function' && onCancel();
                typeof dialog.Close === 'function' && dialog.Close();
            });

            return dialog;
        }
    };

    /**
     * 插件基本内容
     * @type {{init: App.init, addButtons: App.addButtons, addMenuButtons: App.addMenuButtons, copyUrls: App.copyUrls, aria2Download: App.aria2Download}}
     */
    var App = {
        init: function () {
            if (CONFIG.showCopy) {
                UI.buttons.push('copyUrls');
            }

            if (CONFIG.showAriaDownload) {
                ARIA2.init();
                UI.buttons.push('aria2Download');
            }

            // 监听列表变化,然后添加按钮
            var listObserver = new MutationObserver(App.addButtons);
            listObserver.observe(document.querySelector('#js_data_list'), {'childList': true});

            var menuObserver = new MutationObserver(App.addMenuButtons);
            menuObserver.observe(document.querySelector('#js_operate_box'), {'childList': true});
        },
        addButtons: function () {
            var opers = document.querySelectorAll("#js_data_list_outer .file-opr");
            var linkMap = {
                copyUrls: {icon: 'ico-copy', text: '复制下载链接'},
                aria2Download: {icon: 'ico-download', text: 'Aria2下载'}
            };
            var buttons = UI.buttons;
            var oper;

            function addButton(container, operate) {
                var link = linkMap[operate];
                var tpl = `<a><i class="icon ${link.icon}"></i><span>${link.text}</span></a>`;
                var $container = $(container);
                var $link = $(tpl);
                var $li = $container.closest('li');
                var $body = $(document.body);
                var filetype = $li.attr('file_type');
                var $download = null;

                $container.prepend($link);

                // 按钮点击事件
                $link.off('click').on('click', function (e) {
                    var _$li = $(e.target).closest('li');
                    var filetype = _$li.attr('file_type');
                    var action = App[operate];
                    var list;

                    if (filetype == 0) {
                        list = [{
                            filetype: filetype,
                            cid: _$li.attr('cate_id'),
                            filename: _$li.attr('title'),
                            pickcode: _$li.attr('pick_code')
                        }];

                        // 目录
                        API.getFilesUrls(list, action);
                    } else {
                        API.getDownloadUrl({pickcode: _$li.attr('pick_code')}, function (data) {
                            if (data instanceof Error) {
                                UI.showMessage('获取下载地址失败', 'err');
                                return;
                            }
                            action([data]);
                        });
                    }

                    e.stopPropagation();
                    e.preventDefault();
                });

                if (filetype != 0 && CONFIG.directDownload) {
                    //文件
                    $download = $('[menu="download_one"]');

                    $download.off('click').on('click', function (e) {
                        var _$li = $(e.target).closest('li');
                        API.getDownloadUrl({pickcode: _$li.attr('pick_code')}, function (data) {
                            var iframe = `<iframe src="${data.url}" style="width:0px;height:0px;display:none;"></iframe>`;

                            var $iframe = $(iframe);
                            $body.append($iframe);
                            setTimeout(function () {
                                $iframe.remove();
                            }, 5000);
                        });

                        e.stopPropagation();
                        e.preventDefault();
                    });
                }
            }

            for (var i in opers) {
                if (opers.hasOwnProperty(i)) {
                    oper = opers[i];

                    buttons.forEach(function (button) {
                        addButton(oper, button);
                    });
                }
            }
        },
        addMenuButtons: function () {
            var $menus = $('#js_operate_box ul');
            var buttons = UI.buttons;
            var buttonMap = {
                copyUrls: {action: 'copyUrls', text: '复制下载链接'},
                aria2Download: {action: 'aria2Download', text: 'Aria2下载'}
            };

            buttons.forEach(function (cmd) {
                var button = buttonMap[cmd];
                var menuTpl = `<li><span>${button.text}</span></li>`;
                var $menu = $(menuTpl);

                $menus.append($menu);
                $menu.off('click').on('click', function (e) {
                    var $lis = $("#js_data_list li.selected");
                    var list = [];

                    $lis.each(function () {
                        var filetype = this.getAttribute('file_type');
                        var cid = this.getAttribute('cate_id');
                        var pickcode = this.getAttribute('pick_code');
                        var filename = this.getAttribute('title');

                        list.push({
                            filetype: filetype,
                            cid: cid,
                            filename: filename,
                            pickcode: pickcode
                        });
                    });

                    API.getFilesUrls(list, App[button.action]);

                    e.stopPropagation();
                    e.preventDefault();
                });
            });
        },
        /**
         * 复制下载地址
         * @param data {Array} 需要下载的内容列表,[{url:'xxxx',filename:'xxx.mp4'}]
         */
        copyUrls: function (data) {
            var length = data.length;
            var urls = data.map(function (item) {
                return item.url;
            });
            var text = urls.join('\r\n');

            if (length == 0) {
                UI.showMessage(`所选内容无可下载的文件`, 'war');
            } else {
                GM_setClipboard(text);
                UI.showMessage(`${length}个文件下载地址已复制`, 'suc');
            }
        },
        /**
         * 添加到Aria2下载
         * @param data {Array} 需要下载的内容列表,[{url:'xxxx',filename:'xxx.mp4'}]
         */
        aria2Download: function (data) {
            var total = data.length;
            var resolveCount = 0;
            var rejectCount = 0;
            var errorCount = 0;
            var index = 0;

            function action(item, resolve, reject) {
                ARIA2.addUri(item.url, {out: item.filename}, function (json) {
                    index++;
                    UI.showLoading({text: `正在处理(${index}/${total})`});
                    if (typeof json === 'undefined') {
                        errorCount++;
                        reject();
                    } else {
                        if (Array.isArray(json)) {
                            json = json[0];
                        }

                        if (json && json.result) {
                            resolveCount++;
                            resolve();
                        } else {
                            rejectCount++;
                            reject();
                        }
                    }
                });
            }

            function complete() {
                var result = total === resolveCount ? 1 : (total === errorCount ? -1 : 0);
                var message, icon, timeout;

                UI.hideLoading();
                switch (result) {
                    case 1:
                        message = `已添加${total}个任务`;
                        icon = 'suc';
                        break;
                    case 0:
                        message = `${total}个任务添加失败<br><span style="font-size:14px;">请检查Aria2配置是否正确<br>或者Aria2服务是否启动</span>`;
                        icon = 'err';
                        timeout = 5000;
                        break;
                    case -1:
                        message = `已添加${resolveCount}个任务<br>${rejectCount}个任务添加失败`;
                        icon = 'war';
                        break;
                }

                UI.showMessage(message, icon, timeout);
            }

            if (total === 0) {
                UI.showMessage('所选内容无可下载的文件', 'war');
                return;
            }

            UI.showMessage('添加Aria2任务', 'load');
            API.sequence({
                data: data,
                action: action,
                complete: complete
            });
        }
    };

    App.init();
})();