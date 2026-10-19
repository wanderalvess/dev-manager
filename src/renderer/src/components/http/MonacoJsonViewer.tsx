import React, { useEffect, useRef } from 'react';
import { monaco } from '../database/sqleditor/monacoEntry';

interface MonacoJsonViewerProps {
  value: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
  language?: string;
  placeholder?: string;
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Configuração do editor Monaco
    const editor = monaco.editor.create(containerRef.current, {
      value: value || '',
      language: language === 'json' ? 'json' : 'plaintext',
      theme: 'vs-dark',
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
      if (onChange) {
        onChange(editor.getValue());
      }
    });

    return () => {
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

  return <div ref={containerRef} className="w-full h-full min-h-[140px] bg-[#0d1117] rounded" />;
};
