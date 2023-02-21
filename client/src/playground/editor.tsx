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
  language,
}: {
  v: MutableRefObject<string>;
  language: string;
}) {
  const divEl = useRef<HTMLDivElement>(null);
  let editor: monaco.editor.IStandaloneCodeEditor;
  useEffect(() => {
    if (divEl.current) {
      editor = monaco.editor.create(divEl.current, {
        value: v.current,
        language,
      });
      editor.onDidChangeModelContent((e) => {
        v.current = editor.getValue();
      });
    }
    return () => {
      editor.dispose();
    };
  }, []);
  return <div className="editor" ref={divEl}></div>;
}
