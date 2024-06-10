/** @jsx jsx */
import { jsx, css } from '@emotion/react';
import { CSSProperties, useEffect, useRef } from 'react';
import JSONEditor, { JSONEditorOptions } from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';

interface Props {
  jsonString: string;
  onChange?: (jsonString: string) => void;
  style?: CSSProperties;
}

export default function ReactJsonEditor({
  jsonString,
  onChange,
  ...rest
}: Props) {
  const containerRef = useRef<any>(null);
  const editorRef = useRef<any>(null);

  const options: JSONEditorOptions = {
    mode: 'code',
    onChangeText: (jsonString) => {
      try {
        onChange?.(jsonString);
      } catch (err) {
        console.error(err);
      }
    },
  };

  useEffect(() => {
    editorRef.current = new JSONEditor(containerRef.current, options);
    editorRef.current.setText(jsonString);
  }, []);

  useEffect(() => {
    editorRef.current.updateText(jsonString);
  }, [jsonString]);

  return (
    <div
      ref={containerRef}
      {...rest}
      css={css`
        .jsoneditor-menu {
          display: none;
        }
        .jsoneditor {
          border: thin solid lightgrey;
          border-radius: 4px;
          overflow: hidden;
        }
      `}
    />
  );
}
