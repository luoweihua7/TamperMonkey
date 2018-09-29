// ==UserScript==
// @name         知乎帖子外链直接打开
// @version      0.1
// @description  知乎帖子外链直接打开
// @author       larify
// @run-at       document-idle
// @include      *.zhihu.com/*
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/Zhihu-Url-Fix.user.js
// @icon         https://www.zhihu.com/favicon.ico
// @grant        none

// ==/UserScript==

(function () {
	let linkFix = () => {
		let elems = [...document.querySelectorAll('a.external'), ...document.querySelectorAll('a.LinkCard')];

		elems.forEach(link => {
			let tmp = link.href.split('target=');

			if (tmp.length === 2) {
				link.href = decodeURIComponent(tmp[1]);
			}
		});
	};
	let target = document.querySelector('body');
	let observer = new MutationObserver(function (mutations, itself) {
		linkFix();
	});
	let config = { childList: true, subtree: true };

	observer.observe(target, config);

	setTimeout(linkFix, 500);
})();
