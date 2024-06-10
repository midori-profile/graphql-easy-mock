import {
  KEY,
  ALERT_KEY,
  GRAPHQL_MOCK_EXTENSION_ID,
  DEFAULT_CONFIGURATION,
  PAGE_READY_KEY,
} from "./constant";
import {
  StorageValue,
  Rules,
  Message,
  Generate,
  App,
  AjaxRule,
  TYPE,
  ResponseSetting,
  METHOD,
} from "./types";

// 工具函数
export const sleep = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const isValidApp = (app: App) => !app.disabled && app.name && app.value;

// export const preventDefault = (e: Event) => {
//   e.preventDefault();
// };

export const sendMessage = (value: StorageValue, pageLoad: boolean) => {
  window.postMessage(
    {
      key: KEY,
      value,
      pageLoad,
    },
    "*"
  );
};

export const getStorage = <StorageValue = any>(key: string) =>
  new Promise<StorageValue | null>((resolve) => {
    chrome.storage.local.get(key, (storage) => {
      resolve(storage[key]);
    });
  });

export const setStorage = <StorageValue = any>(
  key: string,
  value: StorageValue
) =>
  new Promise<StorageValue | null>((resolve) => {
    chrome.storage.local.set(
      {
        [key]: value,
      },
      () => resolve
    );
  });

// 页面卸载处理
// const preventPageUnload = (e: BeforeUnloadEvent) => {
//   e.preventDefault();
//   return (e.returnValue = "Are you sure you want to exit?");
// };

// export const handlePageUnload = () => {
//   window.removeEventListener("beforeunload", preventPageUnload, {
//     capture: true,
//   });
// };

// 插件安装检查
const checkExtensionIsInstalled = () =>
  !!document.getElementById(GRAPHQL_MOCK_EXTENSION_ID);

// 全局变量覆盖
export const overwriteGlobalVariable = function () {
  let rules: Rules = { ajaxRules: [], staticResourceRules: [] };
  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  const customFetch: typeof originalFetch = async function (...args) {
    const [url, options] = args[0] instanceof Request
      ? [args[0].url, args[0]]
      : args;

    const hint =
      typeof url === "string" &&
      rules.ajaxRules.find((rule) =>
        rule.filter({
          method: options?.method ?? "GET",
          url,
          headers: (options?.headers as Record<string, string>) ?? {},
          body: options?.body,
        })
      );

    if (hint) {
      let nextUrl = url;
      let nextOptions = options;
      const { modifyRequest, modifyResponse, statusCode } = hint;
      if (modifyRequest) {
        const request = modifyRequest({
          method: "GET",
          url,
          headers: (options?.headers as Record<string, string>) ?? {},
        });
        if (request.url) {
          nextUrl = request.url;
        }
        if (request.headers) {
          nextOptions = {
            ...(nextOptions ?? {}),
            headers: {
              ...(nextOptions?.headers ?? {}),
              ...(request.headers ?? {}),
            },
          };
        }
        if (request.delay) {
          await sleep(request.delay);
        }
      }
      const response = await originalFetch(nextUrl, nextOptions);
      return modifyResponse
        ? new Response(modifyResponse(response), { status: statusCode || 200 })
        : response;
    } else {
      return originalFetch(...args);
    }
  };

  const customOpen = function (method: string, url: string | URL) {
    if (typeof url === "string") {
      this.method = method;
      this.url = url;
    }
    originalXhrOpen.call(this, method, url);
  };

  const customSetRequestHeader = function (header: string, value: string) {
    this.headers = this.headers ?? {};
    this.headers[header] = value;
    originalSetRequestHeader.call(this, header, value);
  };

  const customSend = function (data?: any) {
    const hint =
      this.url &&
      rules.ajaxRules.find((rule) =>
        rule.filter({
          method: this.method,
          url: this.url,
          headers: this.headers,
          body: data,
        })
      );
    if (hint) {
      const isGraphQLRequest = hint.type === TYPE.GraphQL; // GraphQL Mock
      const { modifyRequest, modifyResponse, statusCode } = hint;
      if (modifyRequest) {
        const request = modifyRequest({
          method: this.method,
          url: this.url,
          headers: this.headers,
        });
        if (request.url) {
          this.url = request.url;
          this.open(this.method, this.url);
        }
        if (request.headers) {
          for (const header in request.headers) {
            this.setRequestHeader(header, request.headers[header]);
          }
        } else if (request.url) {
          Object.keys(this.headers ?? {}).forEach((key) => {
            originalSetRequestHeader.call(this, key, this.headers[key]);
          });
        }
        this.delay = request.delay ?? 0;
      }
      if (modifyResponse) {
        this.addEventListener("readystatechange", function () {
          const contentType = this.getResponseHeader("Content-Type");
          if (this.readyState === 4 && contentType.startsWith("application/json")) {
            try {
              let response = {};
              try {
                response = JSON.parse(this.responseText);
              } catch (e) {
                response = this.response;
              }
              Object.defineProperty(this, "responseText", {
                value: modifyResponse(response),
                writable: true,
              });
              Object.defineProperty(this, "response", {
                value: isGraphQLRequest
                  ? modifyResponse(response)
                  : JSON.parse(modifyResponse(response)),
                writable: true,
              });
              Object.defineProperty(this, "status", {
                value: statusCode || 200,
                writable: true,
              });
            } catch (error) {
              console.log(error);
            }
          }
        });
      }
    }

    if (this.delay > 0) {
      window.setTimeout(() => {
        originalSend.call(this, data);
      }, this.delay);
    } else {
      originalSend.call(this, data);
    }
  };

  return function updateRules(newRules: Rules) {
    rules = newRules;
    window.fetch = rules.ajaxRules.length ? customFetch : originalFetch;
    XMLHttpRequest.prototype.open = rules.ajaxRules.length
      ? customOpen
      : originalXhrOpen;
    XMLHttpRequest.prototype.send = rules.ajaxRules.length
      ? customSend
      : originalSend;
    XMLHttpRequest.prototype.setRequestHeader = rules.ajaxRules.length
      ? customSetRequestHeader
      : originalSetRequestHeader;
  };
};

// 插件设置构建
export const isEffectivePluginSwitch = (lastEffectiveTimestamp: number) =>
  (Date.now() - lastEffectiveTimestamp) / (60 * 60 * 1000) < 12;

export const buildGraphqlPluginSetting = (
  storage: Partial<StorageValue>
): StorageValue => ({
  ...DEFAULT_CONFIGURATION,
  ...storage,
  pluginSwitchOn:
    !!storage.pluginSwitchOn &&
    isEffectivePluginSwitch(storage.lastEffectiveTimestamp ?? Date.now()),
});

const buildMockResponseRules = (
  graphQLPluginSetting: StorageValue
): AjaxRule[] => {
  if (!graphQLPluginSetting.pluginSwitchOn) {
    return [];
  }

  const mockResponseApps = graphQLPluginSetting.pluginSwitchOn
    ? (graphQLPluginSetting.pluginMockResponseList || []).filter(isValidApp)
    : [];
  return mockResponseApps
    .filter(isValidApp)
    .map((app) => {
      const { name, value } = app;
      try {
        const responseSetting = JSON.parse(value) as ResponseSetting;
        return {
          filter: ({ method, url, body }) => {
            let pathname = (url || "").split("?")[0];
            let parsedBody = body || {};
            try {
              if (typeof body === "string") {
                parsedBody = JSON.parse(body);
              }
            } catch (e) {
              parsedBody = {};
            }
            if (responseSetting.type === TYPE.GraphQL) { // GraphQL Mock
              return (
                pathname.endsWith(name) &&
                parsedBody.operationName === responseSetting.operationName
              );
            } else { // RESTful Mock
              return (
                pathname.endsWith(name) &&
                method === (responseSetting.method || METHOD.GET)
              );
            }
          },
          modifyResponse: () => {
            try {
              return responseSetting.responseText;
            } catch (e) {
              return "";
            }
          },
          type: responseSetting.type,
          statusCode: Number(responseSetting.statusCode || "200"),
        };
      } catch (e) {
        return false;
      }
    })
    .filter(Boolean) as unknown as AjaxRule[];
};

// 消息处理
export const handleMessageEvent = async (generate: Generate) => {
  let isFirstExecution = true;
  const updateRules = overwriteGlobalVariable();
  const isExtensionInstalled = checkExtensionIsInstalled();

  if (isExtensionInstalled && isFirstExecution) {
    window.graphQLPlugin = {};
    window.postMessage(
      {
        key: PAGE_READY_KEY,
        value: true,
      },
      "*"
    );
  }

  window.addEventListener("message", async (e: MessageEvent<Message>) => {
    const { data } = e;

    if (data?.key === KEY) {
      try {
        const graphQLPluginSetting = buildGraphqlPluginSetting(data.value ?? {});

        const {
          entrypoints = [],
          blockResourceRules = [],
          ajaxRules = [],
          staticResourceRules = [],
          mainFrameText,
        } = await generate(graphQLPluginSetting, isFirstExecution);

        ajaxRules.unshift(...buildMockResponseRules(graphQLPluginSetting));

        const isPluginEnabled =
          entrypoints.length > 0 ||
          blockResourceRules.length > 0 ||
          ajaxRules.length > 0 ||
          staticResourceRules.length > 0;

        if (isPluginEnabled && !window.sessionStorage.getItem(ALERT_KEY)) {
          window.sessionStorage.setItem(ALERT_KEY, "true");
          if (isFirstExecution) {
            console.log(
              "🚀 Graphql Easy Mock is running in your website for the first time!"
            );
          }
        }

        if (isFirstExecution) {
          !isExtensionInstalled && window.graphQLPlugin?.blockObserver?.disconnect();

          if (mainFrameText) {
            document.write(mainFrameText);
          }

          if (isPluginEnabled) {
            document.title = `${document.title} (GraphQL Easy Mock)`;
          }
        }

        isFirstExecution = false;
        updateRules({ ajaxRules, staticResourceRules });
        // handlePageUnload();
      } catch (error) {
        console.log(error);
      }
    }
  });
};
