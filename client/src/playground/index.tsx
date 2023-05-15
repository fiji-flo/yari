import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import prettier from "prettier/esm/standalone.mjs";
import parserBabel from "prettier/esm/parser-babel.mjs";
import parserCSS from "prettier/esm/parser-postcss.mjs";
import parserHTML from "prettier/esm/parser-html.mjs";

import { Button } from "../ui/atoms/button";
import Editor, { EditorHandle } from "./editor";
import { SidePlacement } from "../ui/organisms/placement";
import { EditorContent, update } from "./utils";

import "./index.scss";

const HTML_DEFAULT = "<!-- HTML goes here -->";
const CSS_DEFAULT = "/* CSS goes here */";
const JS_DEFAULT = "/* JavaScript goes here */";

enum State {
  initial,
  remote,
  modified,
}

export function resetIframe(iframe: HTMLIFrameElement | null) {
  iframe?.contentWindow?.postMessage(
    { typ: "reset" },
    {
      targetOrigin: "*",
    }
  );
}

async function save(editorContent: EditorContent) {
  const res = await fetch("/api/v1/play/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: JSON.stringify(editorContent) }),
  });
  let { id } = await res.json();
  let url = new URL(document.URL);
  url.search = new URLSearchParams([["gist", id]]).toString();
  return url;
}

export default function Playground() {
  let [searchParams, setSearchParams] = useSearchParams();
  let [shared, setShared] = useState(false);
  let [url, setUrl] = useState<string | null>(null);
  let [vConsole, setVConsole] = useState<{ prop: string; message: string }[]>(
    []
  );
  let [state, setState] = useState(State.initial);
  let [version, setVersion] = useState<number>(0);
  let gistId = searchParams.get("gist");
  let localKey = searchParams.get("local");
  let { data: code } = useSWR<EditorContent>(
    !shared && gistId ? `/api/v1/play/${encodeURIComponent(gistId)}` : null,
    async (url) => {
      const response = await fetch(url);

      if (!response.ok) {
        throw Error(response.statusText);
      }

      return JSON.parse((await response.json())?.code || "null");
    },
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      fallbackData:
        (!gistId &&
          localKey &&
          JSON.parse(sessionStorage.getItem(localKey) || "{}")) ||
        undefined,
    }
  );
  const versionRef = useRef<number>(version);
  const htmlRef = useRef<EditorHandle | null>(null);
  const cssRef = useRef<EditorHandle | null>(null);
  const jsRef = useRef<EditorHandle | null>(null);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const diaRef = useRef<HTMLDialogElement | null>(null);
  let messageListener = useCallback(({ data: { typ, prop, message } }) => {
    console.log(typ, prop, message);
    if (typ === "console") {
      if (prop === "clear") {
        setVConsole([]);
      } else {
        setVConsole((vConsole) => [...vConsole, { prop, message }]);
      }
    } else if (typ === "ready") {
      console.log(prop, versionRef.current);
      if (prop === versionRef.current) {
        console.log("updating");
        update(iframe.current, getEditorContent());
      }
    }
  }, []);
  useEffect(() => {
    if (state === State.initial) {
      if (code && Object.values(code).some(Boolean)) {
        htmlRef.current?.setContent(code?.html);
        cssRef.current?.setContent(code?.css);
        jsRef.current?.setContent(code?.js);
        setState(State.remote);
      } else {
        htmlRef.current?.setContent(HTML_DEFAULT);
        cssRef.current?.setContent(CSS_DEFAULT);
        jsRef.current?.setContent(JS_DEFAULT);
      }
    }
  }, [code, state]);
  useEffect(() => {
    window.addEventListener("message", messageListener);
    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, [messageListener]);
  const iframeRef = useCallback((node: HTMLIFrameElement | null) => {
    iframe.current = node;
  }, []);
  const reset = async () => {
    setSearchParams([]);
    htmlRef.current?.setContent(HTML_DEFAULT);
    cssRef.current?.setContent(CSS_DEFAULT);
    jsRef.current?.setContent(JS_DEFAULT);
    resetIframe(iframe.current);
  };
  const resetConfirm = async () => {
    if (window.confirm("Do you really want to reset everything?")) {
      await reset();
    }
  };

  const getEditorContent = () => {
    return {
      html: htmlRef.current?.getContent() || HTML_DEFAULT,
      css: cssRef.current?.getContent() || CSS_DEFAULT,
      js: jsRef.current?.getContent() || JS_DEFAULT,
    };
  };

  const updateWithEditorContent = () => {
    setVersion((v) => v + 1);
    versionRef.current += 1;
  };

  const format = () => {
    const { html, css, js } = getEditorContent();

    try {
      const formatted = {
        html: prettier.format(html, { parser: "html", plugins: [parserHTML] }),
        css: prettier.format(css, { parser: "css", plugins: [parserCSS] }),
        js: prettier.format(js, { parser: "babel", plugins: [parserBabel] }),
      };
      htmlRef.current?.setContent(formatted.html);
      cssRef.current?.setContent(formatted.css);
      jsRef.current?.setContent(formatted.js);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <>
      <main className="play container">
        <dialog id="playDialog" ref={diaRef}>
          <div>
            <span>Share your code via this Permalink:</span>
            {url && <a href={url}>{url}</a>}
          </div>
        </dialog>
        <section className="editors">
          <aside>
            <Button id="format" icon="quote" onClickHandler={format}></Button>
            <Button
              id="run"
              icon="next"
              onClickHandler={updateWithEditorContent}
            ></Button>
            <Button
              id="share"
              icon="external"
              onClickHandler={async () => {
                const url = await save(getEditorContent());
                setUrl(url.toString());
                setSearchParams(url.searchParams);
                setShared(true);
                diaRef.current?.showModal();
              }}
            ></Button>
            <Button
              id="reset"
              icon="cancel"
              extraClasses="red"
              onClickHandler={resetConfirm}
            ></Button>
          </aside>
          <Editor
            ref={htmlRef}
            language="html"
            callback={updateWithEditorContent}
          ></Editor>
          <Editor
            ref={cssRef}
            language="css"
            callback={updateWithEditorContent}
          ></Editor>
          <Editor
            ref={jsRef}
            language="javascript"
            callback={updateWithEditorContent}
          ></Editor>
        </section>
        <section className="preview">
          {gistId && (
            <a className="flag-example" href="/">
              Seeing something inappropriate?
            </a>
          )}
          <iframe
            title="runner"
            ref={iframeRef}
            src={`${
              code?.src || "http://localhost:5042/runner.html"
            }?v=${version}`}
            sandbox="allow-scripts"
          ></iframe>
          <ul>
            {vConsole.map(({ prop, message }) => {
              return (
                <li>
                  <code>{message}</code>
                </li>
              );
            })}
          </ul>
          <SidePlacement></SidePlacement>
        </section>
      </main>
    </>
  );
}
