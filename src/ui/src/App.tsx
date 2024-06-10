import React, {
  useEffect,
  useRef,
  useCallback,
  CSSProperties,
  lazy,
  Suspense,
} from "react";
import { useUpdate } from "react-use";
import { Switch, Button, Spin } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { v4 as uuid } from "uuid";
import {
  KEY,
  USER_ID_KEY,
  DEFAULT_CONFIGURATION,
  SWITCH_COOKIE_KEY,
} from "../../utils/constant";
import {
  Storage,
  StorageValue,
  App as Application,
} from "../../utils/types";
const ResponseEditor = lazy(() => import("./components/mockForm"));

type PluginApp = {
  name: string;
  value: string;
  disabled: boolean;
};

enum ProxySide {
  MockResponse = "MockResponse",
}

const isValidApp = (app: Application) => !app.disabled && app.name && app.value;

const isChromeExtensionEnv =
  typeof window.chrome?.storage?.local?.set === "function";

const getConfigurationFromStorage = () => {
  const storedValueStr = window.localStorage.getItem(KEY) ?? "";
  try {
    return JSON.parse(storedValueStr) as StorageValue;
  } catch (error) {
    return null;
  }
};

const getConfigurationFromUrl = () => {
  try {
    return JSON.parse(
      decodeURIComponent(
        new URLSearchParams(window.location.search).get("configuration") ?? ""
      )
    ) as StorageValue;
  } catch (error) {
    return null;
  }
};

let userId = "";

function App() {
  const forceUpdate = useUpdate();
  const pluginSwitchOnRef = useRef(DEFAULT_CONFIGURATION.pluginSwitchOn);
  const pluginAppsMapRef = useRef<Record<ProxySide, PluginApp[]>>({
    [ProxySide.MockResponse]: DEFAULT_CONFIGURATION.pluginMockResponseList,
  });
  const utilsRef = useRef(DEFAULT_CONFIGURATION.utils);

  const store = useCallback(() => {
    const value = {
      pluginSwitchOn: pluginSwitchOnRef.current,
      pluginMockResponseList: pluginAppsMapRef.current[ProxySide.MockResponse],
      utils: utilsRef.current,
    };
    if (isChromeExtensionEnv) {
      chrome.storage.local.set({
        [KEY]: value.pluginSwitchOn
          ? { ...value, lastEffectiveTimestamp: Date.now() }
          : value,
      });
    } else {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      document.cookie = `${SWITCH_COOKIE_KEY}=${
        pluginSwitchOnRef.current ? "ON" : "OFF"
      }; path=/; max-age=${60 * 60 * 12}; samesite=strict;`;
    }
  }, []);

  const refreshPage = useCallback(() => {
    const storedValue = getConfigurationFromUrl() ?? getConfigurationFromStorage();

    if (storedValue) {
      pluginSwitchOnRef.current = storedValue.pluginSwitchOn ?? false;
      pluginAppsMapRef.current = {
        [ProxySide.MockResponse]:
          (storedValue.pluginMockResponseList || []).length > 0
            ? (storedValue.pluginMockResponseList as PluginApp[])
            : DEFAULT_CONFIGURATION.pluginMockResponseList,
      };
      utilsRef.current = DEFAULT_CONFIGURATION.utils;
      forceUpdate();
      store();
      window.history.replaceState({}, "", window.location.href.replace(/\?configuration=.+$/g, ""));
    }
  }, [forceUpdate, store]);

  useEffect(() => {
    if (isChromeExtensionEnv) {
      chrome.storage.local.get(USER_ID_KEY, (userIdStorage) => {
        userId = userIdStorage[USER_ID_KEY];

        if (!userId) {
          userId = uuid();
          chrome.storage.local.set({ [USER_ID_KEY]: userId });
        }
      });
      chrome.storage.local.get(KEY, (storage: Storage) => {
        if (storage[KEY]) {
          pluginSwitchOnRef.current = storage[KEY].pluginSwitchOn ?? false;
          pluginAppsMapRef.current = {
            [ProxySide.MockResponse]:
              storage[KEY].pluginMockResponseList ??
              DEFAULT_CONFIGURATION.pluginMockResponseList,
          };
          utilsRef.current = DEFAULT_CONFIGURATION.utils;
          forceUpdate();
        }
      });
    } else {
      userId = window.localStorage.getItem(USER_ID_KEY) ?? "";
      if (!userId) {
        userId = uuid();
        window.localStorage.setItem(USER_ID_KEY, userId);
      }

      refreshPage();
    }
  }, [refreshPage]);

  useEffect(() => {
    const visibilitychangeHandler = () => {
      if (document.visibilityState === "visible" && !isChromeExtensionEnv) {
        refreshPage();
      }
    };

    document.addEventListener("visibilitychange", visibilitychangeHandler);

    return () => {
      document.removeEventListener("visibilitychange", visibilitychangeHandler);
    };
  }, [refreshPage]);

  const Header = ({
    itemStyle,
    app,
    idx,
    pluginSwitchOnRef,
    pluginAppsMapRef,
    forceUpdate,
    store,
    ProxySide,
  }) => (
    <div
      style={{
        ...itemStyle,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div>
        <Switch
          checked={!app.disabled}
          disabled={!pluginSwitchOnRef.current}
          onChange={(checked) => {
            pluginAppsMapRef.current[ProxySide.MockResponse][idx].disabled = !checked;
            forceUpdate();
            store();
          }}
        />
        <span
          style={{
            marginLeft: '8px',
            fontWeight: 'normal',
            color: app.disabled ? 'gray' : 'black',
          }}
        >
          Enable this mock rule1
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {(idx > 0 || pluginAppsMapRef.current[ProxySide.MockResponse].length > 1) && (
          <Button
            icon={<DeleteOutlined />}
            disabled={!pluginSwitchOnRef.current}
            onClick={() => {
              pluginAppsMapRef.current[ProxySide.MockResponse].splice(idx, 1);
              forceUpdate();
              store();
            }}
            style={{ marginLeft: '8px' }}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className="app" style={{ margin: 24, width: "600px" }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Switch
            checked={pluginSwitchOnRef.current}
            onChange={(checked) => {
              pluginSwitchOnRef.current = checked;
              forceUpdate();
              store();
            }}
          />
          <span 
            style={{
              fontSize: '16px',
              marginLeft: '8px',
              fontWeight: 'normal',
              color:  pluginSwitchOnRef.current ? 'black' : 'gray',
            }}>
            Enable GraphQL Mock Extension
          </span>
        </div>
      </div>

      <Suspense fallback={<Spin />}>
        {pluginAppsMapRef.current[ProxySide.MockResponse].map((app, idx) => {
          const itemStyle: CSSProperties = {
            width: "auto",
            flex: 1,
            flexShrink: 0,
          };

          return (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                flexDirection: "row",
                marginBottom: 10,
              }}
            >
              <ResponseEditor
                header={
                  <Header
                    itemStyle={itemStyle}
                    app={app}
                    idx={idx}
                    pluginSwitchOnRef={pluginSwitchOnRef}
                    pluginAppsMapRef={pluginAppsMapRef}
                    forceUpdate={forceUpdate}
                    store={store}
                    ProxySide={ProxySide}
                  />
                }
                name={app.name}
                value={app.value}
                disabled={app.disabled || !pluginSwitchOnRef.current}
                onNameChange={(name) => {
                  pluginAppsMapRef.current[ProxySide.MockResponse][idx].name = name;
                  forceUpdate();
                }}
                onNameBlur={store}
                onValueChange={(value) => {
                  pluginAppsMapRef.current[ProxySide.MockResponse][idx].value = value;
                  store();
                }}
                style={{
                  ...itemStyle,
                  flex: 4,
                }}
              />
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Button
            icon={<PlusOutlined />}
            disabled={!pluginSwitchOnRef.current}
            onClick={() => {
              pluginAppsMapRef.current[ProxySide.MockResponse].push({
                name: "",
                value: "",
                disabled: false,
              });
              forceUpdate();
              store();
            }}
            block
            size="large"
          >
            Add a new mock rule
          </Button>
        </div>
      </Suspense>
    </div>
  );
}

export default App;
