import { useRef, useEffect, MutableRefObject } from "react";
import * as monaco from "monaco-editor";

// @ts-ignore
// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: any, label: string) {
    if (label === "json") {
      return "./json.worker.js";
    }
    if (label === "css" || label === "scss" || label === "less") {
      return "./css.worker.js";
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return "./html.worker.js";
    }
    if (label === "typescript" || label === "javascript") {
      return "./ts.worker.js";
    }
    return "./editor.worker.js";
  },
};

export default function Editor({
  v,
  n,
  language,
}: {
  v: string;
  n: (string) => void;
  language: string;
}) {
  const divEl = useRef<HTMLDivElement>(null);
  let editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  useEffect(() => {
    console.log(divEl.current, editor.current);
    if (divEl.current && editor.current !== null) {
      if (editor.current.getValue() !== v) {
        editor.current.setValue(v);
      }
    }
    if (divEl.current && editor.current === null) {
      editor.current = monaco.editor.create(divEl.current, {
        value: v,
        language,
        minimap: { enabled: false },
        automaticLayout: true,
      });
      editor.current.onDidChangeModelContent((e) => {
        if (editor.current) {
          n(editor.current.getValue());
        }
      });
    }
    return () => {};
  }, [v]);
  return (
    <div className="editor-container">
      <label>{language.toUpperCase()}</label>
      <div className="editor" ref={divEl}></div>
    </div>
  );
}
