import { DeleteOutlined } from "@ant-design/icons";
import { Button, Switch } from "antd";
import React from "react";

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

export default Header;