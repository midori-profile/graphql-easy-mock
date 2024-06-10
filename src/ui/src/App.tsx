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

type InterceptorApp = {
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
  const interceptorSwitchOnRef = useRef(
    DEFAULT_CONFIGURATION.interceptorSwitchOn
  );
  const interceptorAppsMapRef = useRef<Record<ProxySide, InterceptorApp[]>>({
    [ProxySide.MockResponse]: DEFAULT_CONFIGURATION.interceptorMockResponseList,
  });
  const utilsRef = useRef(DEFAULT_CONFIGURATION.utils);

  const collect = useCallback(() => {
    try {

    } catch (error) {
      console.log(error);
    }
  }, []);

  const store = useCallback(() => {
    const value = {
      interceptorSwitchOn: interceptorSwitchOnRef.current,
      interceptorMockResponseList:
        interceptorAppsMapRef.current[ProxySide.MockResponse],
      utils: utilsRef.current,
    };
    if (isChromeExtensionEnv) {
      chrome.storage.local.set({
        [KEY]: value.interceptorSwitchOn
          ? { ...value, lastEffectiveTimestamp: Date.now() }
          : value,
      });
    } else {
      window.localStorage.setItem(KEY, JSON.stringify(value));
      document.cookie = `${SWITCH_COOKIE_KEY}=${
        interceptorSwitchOnRef.current ? "ON" : "OFF"
      }; path=/; max-age=${
        60 * 60 * 12
      }; samesite=strict;`;
    }
    // collect();
  }, []);

  const refreshPage = useCallback(() => {
    const storedValue =
      getConfigurationFromUrl() ?? getConfigurationFromStorage();

    if (storedValue) {
      interceptorSwitchOnRef.current = storedValue.interceptorSwitchOn ?? false;
      interceptorAppsMapRef.current = {
        [ProxySide.MockResponse]:
          (storedValue.interceptorMockResponseList || []).length > 0
            ? (storedValue.interceptorMockResponseList as InterceptorApp[])
            : DEFAULT_CONFIGURATION.interceptorMockResponseList,
      };
      utilsRef.current = DEFAULT_CONFIGURATION.utils;
      forceUpdate();
      store();
      window.history.replaceState(
        {},
        "",
        window.location.href.replace(/\?configuration=.+$/g, "")
      );
    }
  }, [forceUpdate, store]);

  useEffect(() => {
    if (isChromeExtensionEnv) {
      chrome.storage.local.get(USER_ID_KEY, (userIdStorage) => {
        userId = userIdStorage[USER_ID_KEY];

        if (!userId) {
          userId = uuid();
          chrome.storage.local.set({
            [USER_ID_KEY]: userId,
          });
        }
      });
      chrome.storage.local.get(KEY, (storage: Storage) => {
        if (storage[KEY]) {
          interceptorSwitchOnRef.current =
            storage[KEY].interceptorSwitchOn ?? false;
          interceptorAppsMapRef.current = {
            [ProxySide.MockResponse]:
              storage[KEY].interceptorMockResponseList ??
              DEFAULT_CONFIGURATION.interceptorMockResponseList,
          };
          utilsRef.current = DEFAULT_CONFIGURATION.utils;
          forceUpdate();
          // collect();
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
    interceptorSwitchOnRef,
    interceptorAppsMapRef,
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
          disabled={!interceptorSwitchOnRef.current}
          onChange={(checked) => {
            interceptorAppsMapRef.current[ProxySide.MockResponse][idx].disabled = !checked;
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
          Enable this mock rule21333
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {(idx > 0 || interceptorAppsMapRef.current[ProxySide.MockResponse].length > 1) && (
          <Button
            icon={<DeleteOutlined />}
            disabled={!interceptorSwitchOnRef.current}
            onClick={() => {
              interceptorAppsMapRef.current[ProxySide.MockResponse].splice(idx, 1);
              forceUpdate();
              store();
            }}
            style={{ marginLeft: '8px' }} // Optional: Add some space between the switch and the delete button
          />
        )}
      </div>
    </div>
  );
  

  return (
    <div
      className="app"
      style={{
        margin: 24,
        width: "600px",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Switch
            checked={interceptorSwitchOnRef.current}
            onChange={(checked) => {
              interceptorSwitchOnRef.current = checked;
              forceUpdate();
              store();
            }}
          />
          <span 
            style={{
              fontSize: '16px',
              marginLeft: '8px',
              fontWeight: 'normal',
              color:  interceptorSwitchOnRef.current ? 'black' : 'gray',
            }}>
            Enable GraphQL Mock Extension
          </span>
        </div>
      </div>

      <Suspense fallback={<Spin />}>
        {interceptorAppsMapRef.current[ProxySide.MockResponse].map(
          (app, idx) => {
            const labelPlaceholder = "acquiring";
            const valuePlaceholder = "acquiring";

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
                      interceptorSwitchOnRef={interceptorSwitchOnRef}
                      interceptorAppsMapRef={interceptorAppsMapRef}
                      forceUpdate={forceUpdate}
                      store={store}
                      ProxySide={ProxySide}
                    />
                  }
                  name={app.name}
                  value={app.value}
                  disabled={app.disabled || !interceptorSwitchOnRef.current}
                  onNameChange={(name) => {
                    interceptorAppsMapRef.current[
                      ProxySide.MockResponse
                    ][idx].name = name;
                    forceUpdate();
                  }}
                  onNameBlur={store}
                  onValueChange={(value) => {
                    interceptorAppsMapRef.current[
                      ProxySide.MockResponse
                    ][idx].value = value;
                    store();
                  }}
                  style={{
                    ...itemStyle,
                    flex: 4,
                  }}
                />

                <div
                  style={{
                    ...itemStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                  }}
                >
                </div>
              </div>
            );
          }
        )}
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <Button
            icon={<PlusOutlined />}
            disabled={!interceptorSwitchOnRef.current}
            onClick={() => {
              interceptorAppsMapRef.current[ProxySide.MockResponse].push({
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
