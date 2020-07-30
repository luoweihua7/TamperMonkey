// ==UserScript==
// @name         微云下载助手
// @version      1.2.0
// @description  使用工具下载微云资源。核心代码使用了loo2k的逻辑。https://github.com/loo2k/WeiyunHelper/
// @author       larify
// @run-at       document-end
// @include      *
// @downloadURL  https://github.com/luoweihua7/TamperMonkey/raw/master/user/WeiYun-Download.user.js
// @grant        unsafeWindow

// ==/UserScript==

;(function () {
  const config = {
    aria2c: {
      host: 'ariang.com',
      port: '6800',
      secret: 'aria',
    },
  }
  // 下载任务
  function addDownloadTask(url, cookies, fileName = '') {
    //
  }

  // 实现原理：通过axios的响应拦截器，监测文件下载后处理
  const chunkId = Math.random().toString(36).substring(7)
  webpackJsonp(
    [7890],
    {
      [chunkId]: function (m, e, r) {
        // 查找Axios
        const modules = Object.values(r.c)
          .filter((x) => x.exports.Axios)
          .map((x) => x.exports)

        if (modules.length === 0) {
          return
        }

        const axios = modules[0]

        // 拦截下载请求，并获取下载数据
        axios.interceptors.response.use(
          (response) => {
            let { data, config } = response
            let isSuccess = data.data.rsp_header.retcode === 0
            let isDiskFileBatchDownload = config.url.indexOf('/webapp/json/weiyunQdiskClient/DiskFileBatchDownload') > -1
            let isDiskFilePackageDownload = config.url.indexOf('/webapp/json/weiyunQdisk/DiskFilePackageDownload') > -1

            if (isSuccess) {
              let rspBody = data?.data?.rsp_body?.RspMsg_body
              let isDownload = false
              let downloadUrl = ''
              let cookieName = ''
              let cookieValue = ''
              let fileName = ''

              if (isDiskFileBatchDownload) {
                // 单文件下载
                if (rspBody?.file_list?.lengh > 0) {
                  let [file] = rspBody.file_list
                  isDownload = true
                  downloadUrl = file.https_download_url
                  cookieName = file.cookie_name
                  cookieValue = file.cookie_value
                  let _uri = new URL(downloadUrl)
                  fileName = decodeURI(_uri.pathname.substr(_uri.pathname.lastIndexOf('/') + 1))
                }
              } else if (isDiskFilePackageDownload) {
                // 批量下载
                if (rspBody) {
                  isDownload = true
                  downloadUrl = rspBody.https_download_url
                  cookieName = rspBody.cookie_name
                  cookieValue = rspBody.cookie_value
                  fileName = `微云合并下载文件_${new Date().Format('yyyy-MM-dd hh:mm:ss')}.zip`
                }
              }

              if (isDownload) {
                let ariaNgUrl = `http://aria2.me/aria-ng/#!/new/task?url=${btoa(downloadUrl)}&header=Cookie:${cookieName}=${cookieValue}&out=${encodeURI(
                  fileName
                )}`

                console.log('文件名称:', fileName)
                console.log('下载地址:', downloadUrl)
                console.log('请求参数:', `Cookie:${cookieName}=${cookieValue}`)
                console.log('AriaNg URL:', ariaNgUrl)

                // 添加下载任务
                addDownloadTask(downloadUrl, { [cookieName]: cookieValue }, fileName)

                // 拦截默认的处理
                return Promise.reject(new Error('已通过插件下载'))
              }
            }

            return response
          },
          (error) => {
            console.log('发生错误', error)
            return Promise.reject(error)
          }
        )
      },
    },
    [chunkId]
  )
})
