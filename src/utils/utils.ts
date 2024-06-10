import {
  KEY,
  ALERT_KEY,
  GRAPHQL_MOCK_EXTENSION_ID,
  WEBAPP_AUTH_TOKEN_KEY,
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

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

export const isValidApp = (app: App) => !app.disabled && app.name && app.value;


export const preventDefault = (e: Event) => {
  e.preventDefault();
};


const checkExtensionIsInstalled = () =>
  !!document.getElementById(GRAPHQL_MOCK_EXTENSION_ID);


const preventPageUnload = (e: BeforeUnloadEvent) => {
  e.preventDefault();
  return (e.returnValue = "Are you sure you want to exit?");
};

export const handlePageUnload = () => {
  window.removeEventListener("beforeunload", preventPageUnload, {
    capture: true,
  });
};


export const overwriteGlobalVariable = function () {
  let rules: Rules = { ajaxRules: [], staticResourceRules: [] };
  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
  const originalAppendChild = Element.prototype.appendChild;
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);

  const customFetch: typeof originalFetch = async function (...args) {
    console.log("customFetch called with args:", args);
    const [url, options] = (() => {
      if (args[0] instanceof Request) {
        const { url, ...init } = args[0] as Request;
        console.log(
          "args[0] is an instance of Request, url and init extracted:",
          url,
          init
        );
        return [url, init];
      } else {
        console.log(
          "args[0] is not an instance of Request, args returned:",
          args
        );
        return args;
      }
    })();

    console.log("url and options:", url, options);

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

    console.log("hint:", hint);

    if (hint) {
      console.log("hint exists");
      let nextUrl = url;
      let nextOptions = options;
      const { modifyRequest, modifyResponse, statusCode, type } = hint;
      if (modifyRequest) {
        console.log("modifyRequest exists");
        const request = modifyRequest({
          method: "GET",
          url,
          headers: (options?.headers as Record<string, string>) ?? {},
        });
        console.log("request:", request);
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
          console.log("request.delay exists:", request.delay);
          await sleep(request.delay);
        }
      }
      const response = await originalFetch(nextUrl, nextOptions);
      console.log("response:", response);
      if (modifyResponse) {
        console.log("modifyResponse exists");
        return new Response(modifyResponse(response), {
          status: statusCode || 200,
        });
      } else {
        console.log("modifyResponse does not exist");
        return response;
      }
    } else {
      console.log("hint does not exist");
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
      const isGraphQLRequest = hint.type === TYPE.GraphQL;
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
          if (
            this.readyState === 4 &&
            contentType.startsWith("application/json")
          ) {
            try {
              let response = {};
              try {
                response = JSON.parse(this.responseText);
              } catch (e) {
                try {
                  response = this.response;
                } catch (e) {
                  console.error(e);
                }
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

  const customAppendChild = function (node: Element) {
    if (["SCRIPT", "IMG", "LINK"].includes(node.tagName)) {
      const src =
        node.getAttribute(node.tagName === "LINK" ? "href" : "src") || "";
      const hint = rules.staticResourceRules.find((rule) => rule.filter(src));
      if (hint) {
        node.setAttribute(
          node.tagName === "LINK" ? "href" : "src",
          hint.target(src)
        );
      }
    }

    return originalAppendChild.call(this, node);
  };

  const customSetItem: typeof window.localStorage.setItem = function (
    key,
    value
  ) {
    if (key === WEBAPP_AUTH_TOKEN_KEY) {
      window.postMessage(
        {
          key,
          value,
        },
        "*"
      );
    }
    return originalSetItem(key, value);
  };

  if (
    checkExtensionIsInstalled() &&
    window.location.hostname === "staging.graphQL.com"
  ) {
    window.localStorage.setItem = customSetItem;
    const params = new window.URLSearchParams(window.location.search);
    if (
      params.get("redirect")?.includes("ngrok") &&
      !window.location.pathname.includes("/login")
    ) {
      window.location.href = params.get("redirect")!;
    }
  }

  return function updateRules(newRules: Rules) {
    console.log("updateRules called with newRules:", newRules);

    rules = newRules;
    console.log("rules updated:", rules);

    window.fetch = rules.ajaxRules.length ? customFetch : originalFetch;
    console.log("window.fetch updated:", window.fetch);

    XMLHttpRequest.prototype.open = rules.ajaxRules.length
      ? customOpen
      : originalXhrOpen;
    console.log(
      "XMLHttpRequest.prototype.open updated:",
      XMLHttpRequest.prototype.open
    );

    XMLHttpRequest.prototype.send = rules.ajaxRules.length
      ? customSend
      : originalSend;
    console.log(
      "XMLHttpRequest.prototype.send updated:",
      XMLHttpRequest.prototype.send
    );

    XMLHttpRequest.prototype.setRequestHeader = rules.ajaxRules.length
      ? customSetRequestHeader
      : originalSetRequestHeader;
    console.log(
      "XMLHttpRequest.prototype.setRequestHeader updated:",
      XMLHttpRequest.prototype.setRequestHeader
    );

    const originalAppendChild = Element.prototype.appendChild;
    console.log("originalAppendChild:", originalAppendChild);

    // @ts-ignore
    Element.prototype.appendChild = rules.staticResourceRules.length
      ? customAppendChild
      : originalAppendChild;
    console.log(
      "Element.prototype.appendChild updated:",
      Element.prototype.appendChild
    );

    if (document.head) {
      console.log("document.head exists");
      // @ts-ignore
      document.head.appendChild = rules.staticResourceRules.length
        ? customAppendChild
        : originalAppendChild;
      console.log(
        "document.head.appendChild updated:",
        document.head.appendChild
      );
    }
  };
};

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



// The effective period is 12 hours
export const isEffectivePluginSwitch = (lastEffectiveTimestamp: number) =>
  (Date.now() - lastEffectiveTimestamp) / (60 * 60 * 1000) < 12;

export const buildGraphqlInterceptorSetting = (
  storage: Partial<StorageValue>
): StorageValue => ({
  ...DEFAULT_CONFIGURATION,
  ...storage,
  interceptorSwitchOn:
    !!storage.interceptorSwitchOn &&
    isEffectivePluginSwitch(storage.lastEffectiveTimestamp ?? Date.now()),
});

const buildMockResponseRules = (
  graphQLInterceptorSetting: StorageValue
): AjaxRule[] => {
  if (!graphQLInterceptorSetting.interceptorSwitchOn) {
    return [];
  }

  const mockResponseApps = graphQLInterceptorSetting.interceptorSwitchOn
    ? (graphQLInterceptorSetting.interceptorMockResponseList || []).filter(
        isValidApp
      )
    : [];
  console.log("mockResponseApps: ", mockResponseApps);
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
            if (responseSetting.type === TYPE.GraphQL) {
              return (
                pathname.endsWith(name) &&
                parsedBody.operationName === responseSetting.operationName
              );
            } else {
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

export const handleMessageEvent = async (generate: Generate) => {
  let isFirstExecution = true;
  // ！！重要
  const updateRules = overwriteGlobalVariable();
  const isExtentionInstalled =
    checkExtensionIsInstalled();

  if (isExtentionInstalled && isFirstExecution) {
    window.graphQLInterceptor = {
    };
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
        const graphQLInterceptorSetting = buildGraphqlInterceptorSetting(
          data.value ?? {}
        );

        const {
          entrypoints = [],
          blockResourceRules = [],
          ajaxRules = [],
          staticResourceRules = [],
          mainFrameText,
        } = await generate(graphQLInterceptorSetting, isFirstExecution);

        ajaxRules.unshift(
          ...buildMockResponseRules(graphQLInterceptorSetting)
        );
        console.log("ajaxRulesafter: ", ajaxRules);

        const isInterceptorEnabled =
          entrypoints.length > 0 ||
          blockResourceRules.length > 0 ||
          ajaxRules.length > 0 ||
          staticResourceRules.length > 0;

          console.log(
            `Graphql easy mock is now ${
              isInterceptorEnabled ? "activated 🚀" : "deactivated 🔒"
            } on your website.`
          );
        if (isInterceptorEnabled && !window.sessionStorage.getItem(ALERT_KEY)) {
          window.sessionStorage.setItem(ALERT_KEY, "true");
          if (isFirstExecution) {
            console.log("🚀 Graphql interceptor is running in your website for the first time!");
          }
        }

        if (isFirstExecution) {
          !isExtentionInstalled &&
            window.graphQLInterceptor?.blockObserver?.disconnect();

          // !mainFrameText && reExecuteAllowedScripts(blockResourceRules);

          if (entrypoints.length > 0 && !mainFrameText) {
            // injectEntrypoints(entrypoints, "");
          }

          if (mainFrameText) {
            document.write(mainFrameText);
          }

          if (isInterceptorEnabled) {
            document.title = `${document.title} (Interceptor)`;
          }
        }

        isFirstExecution = false;
        updateRules({ ajaxRules, staticResourceRules });
        handlePageUnload();
      } catch (error) {
        console.log(error);
      }
    }
  });
};

export const openComponentInEditor = () => {
  type DebugSource = {
    columnNumber?: number;
    fileName?: string;
    lineNumber?: number;
  };
  type FiberNode = {
    _debugSource?: DebugSource;
    _debugOwner?: FiberNode;
  };

  const getFallbackDebugSourceFromElement = (element: HTMLElement) => {
    const parentElement = element.parentElement;
    if (element.tagName === "HTML" || parentElement === null) {
      console.warn("Couldn't find a React instance for the element");
      return;
    }
    let fiberNodeInstance: FiberNode;
    for (const key in element) {
      if (
        key.startsWith("__reactInternalInstance") ||
        key.startsWith("__reactFiber$")
      ) {
        fiberNodeInstance = element[key];
      }
    }
    const { _debugSource } = fiberNodeInstance ?? {};
    if (_debugSource) return _debugSource;
    return getFallbackDebugSourceFromElement(parentElement);
  };

  const getFallbackDebugSource = (
    fiberNodeInstance: FiberNode,
    element: HTMLElement
  ) => {
    if (fiberNodeInstance?._debugOwner) {
      if (fiberNodeInstance._debugOwner._debugSource) {
        return fiberNodeInstance._debugOwner._debugSource;
      } else {
        return getFallbackDebugSource(fiberNodeInstance._debugOwner, element);
      }
    } else {
      return getFallbackDebugSourceFromElement(element);
    }
  };

  const getDebugSource = (element: HTMLElement) => {
    let fiberNodeInstance: FiberNode;
    for (const key in element) {
      if (
        key.startsWith("__reactInternalInstance") ||
        key.startsWith("__reactFiber$")
      ) {
        fiberNodeInstance = element[key];
      }
    }
    const { _debugSource } = fiberNodeInstance ?? {};
    if (_debugSource) return _debugSource;
    const fallbackDebugSource = getFallbackDebugSource(
      fiberNodeInstance,
      element
    );
    return fallbackDebugSource;
  };

  // Option(Alt) + Click
  window.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.altKey) {
      const { target } = event;
      if (target instanceof HTMLElement) {
        const debugSource: DebugSource = getDebugSource(target);
        if (!debugSource) return;
        const { columnNumber, fileName, lineNumber } = debugSource;
        let url = "";
        url = `vscode://file/${fileName}:${lineNumber}:${columnNumber}`;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = url;
        document.body.appendChild(iframe);
        setTimeout(() => {
          iframe.remove();
        }, 100);
      }
    }
  });
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
