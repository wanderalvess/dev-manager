import React, { useEffect, useRef } from 'react';
import { monaco } from '../database/sqleditor/monacoEntry';

interface MonacoJsonViewerProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  language?: string;
  placeholder?: string;
}

function getMonacoTheme(): 'vs' | 'vs-dark' {
  return document.documentElement.classList.contains('light') ? 'vs' : 'vs-dark';
}

export const MonacoJsonViewer: React.FC<MonacoJsonViewerProps> = ({
  value,
  onChange,
  readOnly = false,
  language = 'json'
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isUpdatingFromProp = useRef(false);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const editor = monaco.editor.create(containerRef.current, {
      value: initialValueRef.current || '',
      language: language === 'json' ? 'json' : 'plaintext',
      theme: getMonacoTheme(),
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      lineNumbers: 'on',
      tabSize: 2,
      wordWrap: 'on',
      fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
      formatOnPaste: true,
      folding: true,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      }
    });

    editorRef.current = editor;

    const disposable = editor.onDidChangeModelContent(() => {
      if (isUpdatingFromProp.current) return;
      onChangeRef.current?.(editor.getValue());
    });

    const observer = new MutationObserver(() => {
      monaco.editor.setTheme(getMonacoTheme());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      disposable.dispose();
      editor.dispose();
      editorRef.current = null;
    };
  }, [readOnly, language]);

  // Sincroniza valor quando muda externamente
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== value) {
      isUpdatingFromProp.current = true;
      const position = editor.getPosition();
      editor.setValue(value || '');
      if (position) editor.setPosition(position);
      isUpdatingFromProp.current = false;
    }
  }, [value]);

  return <div ref={containerRef} className="w-full h-full min-h-[140px] bg-card border border-border rounded" />;
};
