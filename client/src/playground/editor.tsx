import {
  useRef,
  useEffect,
  MutableRefObject,
  forwardRef,
  useImperativeHandle,
  ForwardedRef,
} from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";

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

function lang(language) {
  switch (language) {
    case "javascript":
      return [javascript()];
    case "html":
      return [html()];
    case "css":
      return [css()];
    default:
      return [];
  }
}

export interface EditorHandle {
  getContent(): string | undefined;
  setContent(content: string): void;
}

const Editor = forwardRef<EditorHandle, any>(function EditorInner(
  {
    language,
  }: {
    language: string;
  },
  ref
) {
  const divEl = useRef<HTMLDivElement>(null);
  let editor = useRef<EditorView | null>(null);
  useEffect(() => {
    console.log(divEl.current, editor.current);

    if (divEl.current && editor.current === null) {
      let startState = EditorState.create({
        extensions: [basicSetup, ...lang(language)],
      });

      editor.current = new EditorView({
        state: startState,
        parent: divEl.current,
      });
      //editor.current.onDidChangeModelContent((e) => {
      //  if (editor.current) {
      //    n(editor.current.getValue());
      //  }
      //});
    }
    return () => {};
  }, [language]);

  useImperativeHandle(
    ref,
    () => {
      return {
        getContent() {
          return editor.current?.state.doc.toString();
        },
        setContent(content: string) {
          let state = EditorState.create({
            doc: content,
            extensions: [basicSetup, ...lang(language)],
          });
          editor.current?.setState(state);
        },
      };
    },
    []
  );
  return (
    <div className="editor-container">
      <label>{language.toUpperCase()}</label>
      <div className="editor" ref={divEl}></div>
    </div>
  );
});

export default Editor;
