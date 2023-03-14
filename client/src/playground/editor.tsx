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
    callback = () => {},
  }: {
    language: string;
    callback: () => void;
  },
  ref
) {
  const timer = useRef<number | null>(null);
  const divEl = useRef<HTMLDivElement>(null);
  let editor = useRef<EditorView | null>(null);
  const updateListenerExtension = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      if (timer.current !== null && timer.current !== -1) {
        clearTimeout(timer.current);
      }
      timer.current = window?.setTimeout(() => {
        timer.current = -1;
        callback();
      }, 1000);
    }
  });
  const lineWrapperExtension = EditorView.lineWrapping;
  useEffect(() => {
    if (divEl.current && editor.current === null) {
      let startState = EditorState.create({
        extensions: [
          basicSetup,
          updateListenerExtension,
          lineWrapperExtension,
          ...lang(language),
        ],
      });
      editor.current = new EditorView({
        state: startState,
        parent: divEl.current,
      });
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
            extensions: [
              basicSetup,
              updateListenerExtension,
              lineWrapperExtension,
              ...lang(language),
            ],
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
