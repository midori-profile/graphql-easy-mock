// 导入所需的类型和常量
import { Storage, Changes, StorageValue } from './utils/types';
import {
  KEY,
} from './utils/constant';

// 初始化 id
let id = 1;

// 初始化应用设置
let appSetting: StorageValue = {
  pluginSwitchOn: false,
};

// 定义除 XMR 外的所有资源类型
const ALL_RESOURCE_TYPES_EXCEPT_XMR = [
  chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
  chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
  chrome.declarativeNetRequest.ResourceType.STYLESHEET,
  chrome.declarativeNetRequest.ResourceType.SCRIPT,
  chrome.declarativeNetRequest.ResourceType.IMAGE,
  chrome.declarativeNetRequest.ResourceType.FONT,
  chrome.declarativeNetRequest.ResourceType.OBJECT,
  chrome.declarativeNetRequest.ResourceType.PING,
  chrome.declarativeNetRequest.ResourceType.MEDIA,
];

// 生成动态规则
const generateDynamicRules = (): chrome.declarativeNetRequest.Rule[] => {
  const rules: chrome.declarativeNetRequest.Rule[] = [];

  // 如果拦截器开关关闭，则返回空规则
  if (!appSetting.pluginSwitchOn) {
    return rules;
  }
  return rules;
};

// 更新规则
const updateRules = async () => {
  // 根据拦截器开关设置图标
  chrome.action.setIcon({
    path: appSetting.pluginSwitchOn
      ? '/images/graphql.png'
      : '/images/graphql-disable.png',
  });

  // 获取当前规则 ID
  const currentRuleIds = (
    await chrome.declarativeNetRequest.getDynamicRules()
  ).map((rule) => rule.id);
  if (currentRuleIds.length > 0) {
    id = Math.max(...currentRuleIds) + 1;
  }

  // 更新动态规则
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: generateDynamicRules(),
    removeRuleIds: currentRuleIds,
  });
};

// 初始化
const initialize = () => {
  console.log('service initialize')
  // 读取存储
  // 这个函数从 Chrome 的本地存储中读取数据。这些数据包括拦截器的开关状态、客户端应用列表和一些工具设置。
  const readStorage = () => {
    chrome.storage.local.get(KEY, async (storage: Storage) => {
      if (storage[KEY]?.pluginSwitchOn) {
        chrome.action.setIcon({ path: '/images/graphql.png' });
        appSetting = {
          pluginSwitchOn: storage[KEY].pluginSwitchOn || false,
        };
        updateRules();
      } else {
        chrome.action.setIcon({ path: '/images/graphql-disable.png' });
      }
    });
  };

  // 读取存储
  readStorage();
  console.log('service readStorage')

  // 监听存储变化
  // 这个监听器会在本地存储的数据发生变化时触发。如果变化的数据是我们关心的数据（由 KEY 指定），那么就会更新 appSetting，并调用 updateRules() 更新规则
  chrome.storage.onChanged.addListener(async (changes: Changes, areaName) => {
    if (areaName === 'local' && changes[KEY]) {
      appSetting = {
        pluginSwitchOn: changes[KEY].newValue.pluginSwitchOn || false,
      };
      updateRules();
    }
  });

  console.log('chrome.storage.onChanged.addListener')

  // 监听启动事件
  chrome.runtime.onStartup.addListener(readStorage);
  console.log('chrome.runtime.onStartup.addListener(readStorage);')
};

// 初始化
initialize();