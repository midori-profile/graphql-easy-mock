import React, { CSSProperties, useEffect, useState } from 'react';
import Editor from './editor';
import { Card, Radio, Select, Input, Form } from 'antd';

const { TextArea } = Input;

type Props = {
  name?: string;
  value?: string;
  disabled?: boolean;
  onNameChange?: (value: string) => void;
  onNameBlur?: () => void;
  onValueChange?: (value: string) => void;
  header: React.ReactNode;
  style?: CSSProperties;
};

enum TYPE {
  GraphQL = 'graphql',
  RESTFUL = 'RESTful',
}

enum METHOD {
  GET = 'GET',
  POST = 'POST',
  DELETE = 'DELETE',
  PUT = 'PUT',
}

type MockResponseValue = {
  type?: TYPE;
  operationName?: string;
  method?: METHOD;
  statusCode?: string;
  responseText?: string;
};

const ResponseEditor = ({
  name,
  value,
  disabled,
  onNameChange,
  onNameBlur,
  onValueChange,
  header,
  ...rest
}: Props) => {
  const [jsonValue, setJsonValue] = useState<MockResponseValue>();
  const [type, setType] = useState<TYPE>();

  useEffect(() => {
    if (value) {
      try {
        const parsedValue = JSON.parse(value);
        setJsonValue(parsedValue);
        setType(parsedValue.type);
      } catch (e) {
        console.log(e);
      }
    }
  }, [value]);

  useEffect(() => {
    if (jsonValue) {
      onValueChange?.(JSON.stringify(jsonValue));
    }
  }, [jsonValue]);

  const handleTypeChange = (e: any) => {
    const newType = e.target.value as TYPE;
    setType(newType);
    setJsonValue((prev) => ({
      ...prev,
      type: newType,
    }));
  };

  return (
    <Card title={header} style={{ padding: '20px', width:"100%"}}>
      <div {...rest}>
        <Form layout="vertical">
          <Form.Item label="Type">
            <Radio.Group
              options={[
                { label: 'GraphQL', value: TYPE.GraphQL },
                { label: 'RESTful', value: TYPE.RESTFUL },
              ]}
              onChange={handleTypeChange}
              value={type || TYPE.GraphQL}
              optionType="button"
              buttonStyle="solid"
              disabled={disabled}
            />
          </Form.Item>
          <Form.Item label="Path" required>
            <Input
              placeholder='Input path name, such as /api'
              value={name}
              disabled={disabled}
              onChange={(e) => {
                onNameChange?.((e.target.value ?? '').trim());
              }}
              onBlur={onNameBlur}
            />
          </Form.Item>
          {type === TYPE.GraphQL ? (
            <Form.Item label="Operation Name" required>
              <Input
                placeholder='Input operation name, such as GetItems'
                value={jsonValue?.operationName}
                onChange={(e) => {
                  setJsonValue((prev) => ({
                    ...prev,
                    operationName: e.target.value,
                  }));
                }}
                disabled={disabled}
              />
            </Form.Item>
          ) : (
            type === TYPE.RESTFUL && (
              <Form.Item label="Method" required>
                <Select
                  value={jsonValue?.method || METHOD.GET}
                  onChange={(value) => {
                    setJsonValue((prev) => ({
                      ...prev,
                      method: value as METHOD,
                    }));
                  }}
                  disabled={disabled}
                >
                  <Select.Option value={METHOD.GET}>{METHOD.GET}</Select.Option>
                  <Select.Option value={METHOD.POST}>{METHOD.POST}</Select.Option>
                  <Select.Option value={METHOD.PUT}>{METHOD.PUT}</Select.Option>
                  <Select.Option value={METHOD.DELETE}>{METHOD.DELETE}</Select.Option>
                </Select>
              </Form.Item>
            )
          )}
          <Form.Item label="HTTP(S) Status Code">
            <Input
              placeholder='200'
              value={jsonValue?.statusCode}
              onChange={(e) => {
                setJsonValue((prev) => ({
                  ...prev,
                  statusCode: e.target.value,
                }));
              }}
              disabled={disabled}
            />
          </Form.Item>
          <Form.Item label="Response Json" style={{marginBottom: 0}}>
            <Editor
              jsonString={jsonValue?.responseText || ''}
              onChange={(value) => {
                try {
                  const json = JSON.parse(value);
                  const formattedResponseText = JSON.stringify(json, null, 2);
                  setJsonValue((prev) => ({
                    ...prev,
                    responseText: formattedResponseText,
                  }));
                } catch (e) {
                  console.log(e);
                }
              }}
              style={{ marginTop: 8 }}
            />
          </Form.Item>
        </Form>
      </div>
    </Card>
  );
};

export default ResponseEditor;
