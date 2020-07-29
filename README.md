# TamperMonkey


## BaiduYun-Password.user.js
百度云密码自动填充，调用了 [云盘万能钥匙](https://ypsuperkey.meek.com.cn/) 插件的接口，仅作为开发用
<br>

## Open-In-iTunes.user.js
在Apple Store的页面，增加苹果去掉的 “在iTunes中打开” 按钮 (仅会在iPhone和iPad应用页面增加，Mac应用还有对应按钮)
<br>

## Remove-Redirect.user.js
知乎，掘金网站，链接点击直接打开。
之前用的其他开发者写的插件是不改url，绑定click事件打开，这里直接修改href内容，可以方便的打开和复制(个人用到比较多)
支持自定义配置站点。不过通用性暂时不是很强，后面再优化下

## Debug-Vue-In-Production.user.js
在生产环境开启Vue.js devtools调试


## WeiYun-Download.user.js
微云下载。
核心代码使用了 loo2k 的 [WeiyunHelper](https://github.com/loo2k/WeiyunHelper/)，增加了下载选项配置