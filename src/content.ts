// 导入常量和类型
import {
  KEY,
  GRAPHQL_MOCK_EXTENSION_ID,
  WEBAPP_AUTH_TOKEN_KEY,
  PAGE_READY_KEY,
} from "./utils/constant";
import { Changes, StorageValue } from "./utils/types";
// 导入工具函数
import {
  isEffectivePluginSwitch,
  sendMessage,
  getStorage,
} from "./utils/utils";
// 导入 cypress 模块

// 定义一个函数，用于等待脚本加载完成
const waitScriptLoaded = (script: HTMLScriptElement) =>
  new Promise((resolve, reject) => {
    script.addEventListener("load", resolve); // 当脚本加载完成时，解决 Promise
    script.addEventListener("error", reject); // 当脚本加载出错时，拒绝 Promise
  });

// 定义主函数
const main = async function () {
  console.log('containmain')
  // cypress(); // 执行 cypress 模块
  // const currentPage = getCurrentPage(); // 获取当前页面
  if (true) {
    console.log('containbeforeinject')
    // 如果当前页面存在
    const script = document.createElement("script"); // 创建一个新的 script 元素
    script.setAttribute("type", "text/javascript"); // 设置 script 的类型为 text/javascript
    script.setAttribute("src", chrome.runtime.getURL(`utils.js`)); // 设置 script 的源为当前页面对应的 js 文件
    script.setAttribute("id", GRAPHQL_MOCK_EXTENSION_ID); // 设置 script 的 id 为 GRAPHQL_MOCK_EXTENSION_ID
    document.documentElement.appendChild(script); // 将 script 添加到文档的根元素
    console.log('afterinject')

    let observer: MutationObserver; // 定义一个 MutationObserver

    const value = ((
      await Promise.all([getStorage(KEY), waitScriptLoaded(script)])
    )[0] ?? {}) as StorageValue;

    // 如果拦截器开关打开，并且最后有效时间戳不是有效的，那么关闭拦截器开关，禁用生产环境，并将新的值存储到 KEY 中
    if (
      value.pluginSwitchOn &&
      !isEffectivePluginSwitch(value.lastEffectiveTimestamp ?? Date.now())
    ) {
      value.pluginSwitchOn = false;
      chrome.storage.local.set({ [KEY]: value });
    }

    // 添加一个 message 事件监听器
    window.addEventListener(
      "message",
      (event: MessageEvent<{ key: string; value: string }>) => {
        // 如果事件的数据的 key 是 WEBAPP_AUTH_TOKEN_KEY，并且 value 存在，那么将 value 存储到 WEBAPP_AUTH_TOKEN_KEY 中
        if (event.data.key === WEBAPP_AUTH_TOKEN_KEY && event.data.value) {
          chrome.storage.local.set({
            [WEBAPP_AUTH_TOKEN_KEY]: event.data.value,
          });
        }
        // 如果事件的数据的 key 是 PAGE_READY_KEY，并且 value 存在，那么发送一个 message 事件，数据是存储的值，并断开 observer 的连接
        if (event.data.key === PAGE_READY_KEY && event.data.value) {
          sendMessage(value, true);
          observer && observer.disconnect();
        }
      }
    );

    // 添加一个 onChanged 事件监听器
    chrome.storage.onChanged.addListener((changes: Changes, areaName) => {
      // 如果变化的区域是 local，并且变化的数据中包含 KEY，那么发送一个 message 事件，数据是新的值
      if (areaName === "local" && changes[KEY]) {
        sendMessage(changes[KEY].newValue, false);
      }
    });
  }
};

main(); // 执行主函数
