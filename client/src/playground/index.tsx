import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { Placement } from "../document/organisms/toc/placement";
import { Button } from "../ui/atoms/button";
import { Loading } from "../ui/atoms/loading";
import { Logo } from "../ui/atoms/logo";
import { Footer } from "../ui/organisms/footer";
import { TopNavigationMain } from "../ui/organisms/top-navigation-main";
import { EditorHandle } from "./editor";

import "./index.scss";

const Editor = React.lazy(() => import("./editor"));

const HTML_DEFAULT = "<!-- HTML goes here -->";
const CSS_DEFAULT = "/* CSS goes here */";
const JS_DEFAULT = "/* JavaScript goes here */";

enum State {
  initial,
  remote,
  modified,
}

export interface EditorContent {
  css: string;
  html: string;
  js: string;
}

export interface Message {
  typ: string;
  state: EditorContent;
}

export function update(
  iframe: HTMLIFrameElement | null,
  editorContent: EditorContent | null
) {
  console.log(iframe?.contentDocument?.readyState, editorContent);
  if (!iframe || !editorContent) {
    return;
  }

  const message: Message = {
    typ: "init",
    state: editorContent,
  };
  if (iframe.contentDocument?.readyState === "loading") {
    iframe.contentDocument?.addEventListener("DOMContentLoaded", () => {
      console.log("in the ****");
      iframe.contentWindow!.postMessage(message, {
        targetOrigin: "*",
      });
    });
  } else {
    console.log("wait what");
    iframe.contentWindow!.postMessage(message, {
      targetOrigin: "*",
    });
  }
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

function modified(
  old: EditorContent | undefined,
  current: EditorContent | undefined
): boolean {
  return (
    old?.css !== current?.css ||
    old?.html !== current?.html ||
    old?.js !== current?.js
  );
}

export function Playground() {
  let [searchParams, setSearchParams] = useSearchParams();
  let [url, setUrl] = useState<string | null>(null);
  let [prompt, setPrompt] = useState<string>("");
  let [context, setContext] = useState<Object | undefined>(undefined);
  let [remoteCode, setRemoteCode] = useState<EditorContent | undefined>(
    undefined
  );
  let [loading, setLoading] = useState(false);
  let [state, setState] = useState(State.initial);
  let gistId = searchParams.get("gist");
  let localKey = searchParams.get("local");
  let { data: code } = useSWR(
    gistId ? `/api/v1/play/${gistId}` : null,
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
  let htmlRef = useRef<EditorHandle | null>(null);
  let cssRef = useRef<EditorHandle | null>(null);
  let jsRef = useRef<EditorHandle | null>(null);
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
  }, [code]);
  console.log(code);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const diaRef = useRef<HTMLDialogElement | null>(null);
  const askRef = useRef<HTMLDialogElement | null>(null);
  const refRef = useRef<HTMLDialogElement | null>(null);
  const iframeRef = useCallback((node: HTMLIFrameElement | null) => {
    iframe.current = node;
  }, []);
  const ask = async (prompt) => {
    setLoading(true);
    const res = await fetch("/api/v1/chat/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    const { code, context } = await res.json();
    setLoading(false);
    setContext(context);
    setRemoteCode(code);
    askRef.current?.close();
    htmlRef.current?.setContent(code.html || HTML_DEFAULT);
    cssRef.current?.setContent(code.css || CSS_DEFAULT);
    jsRef.current?.setContent(code.js || JS_DEFAULT);
  };
  const refine = async (prompt) => {
    setLoading(true);
    const current = getEditorContent();
    const res = await fetch("/api/v1/chat/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        modified(remoteCode, current)
          ? { prompt, code: current, context }
          : { prompt, context }
      ),
    });
    const { code, context: ctx } = await res.json();
    setLoading(false);
    setContext(ctx);
    setRemoteCode(code);
    refRef.current?.close();
    code.html && htmlRef.current?.setContent(code.html);
    code.css && cssRef.current?.setContent(code.css);
    code.js && jsRef.current?.setContent(code.js);
  };
  const reset = async () => {
    if (window.confirm("Do you really want to reset everything?")) {
      setSearchParams([]);
      htmlRef.current?.setContent(HTML_DEFAULT);
      cssRef.current?.setContent(CSS_DEFAULT);
      jsRef.current?.setContent(JS_DEFAULT);
    }
  };

  const getEditorContent = () => {
    return {
      html: htmlRef.current?.getContent() || HTML_DEFAULT,
      css: cssRef.current?.getContent() || CSS_DEFAULT,
      js: jsRef.current?.getContent() || JS_DEFAULT,
    };
  };
  const updateWithEditorContent = () =>
    update(iframe.current, getEditorContent());
  return (
    <>
      <header className="play-menu">
        <Logo />
        <TopNavigationMain withoutMain={true}></TopNavigationMain>
      </header>
      <main className="play">
        <dialog id="playDialog" ref={diaRef}>
          {url && <a href={url}>{url}</a>}
        </dialog>
        <dialog id="refineDialog" ref={refRef}>
          <div>
            {loading ? (
              <Loading />
            ) : (
              <>
                <label>Change...</label>
                <textarea
                  cols={40}
                  rows={5}
                  onChange={(e) => setPrompt(e.target.value)}
                ></textarea>
                <Button onClickHandler={() => refine(prompt)}>Submit</Button>
              </>
            )}
          </div>
        </dialog>
        <dialog id="askDialog" ref={askRef}>
          <div>
            {loading ? (
              <Loading />
            ) : (
              <>
                <label>I want to build...</label>
                <textarea
                  cols={40}
                  rows={5}
                  onChange={(e) => setPrompt(e.target.value)}
                ></textarea>
                <Button onClickHandler={() => ask(prompt)}>Submit</Button>
              </>
            )}
          </div>
        </dialog>
        <section className="editors">
          <aside>
            <Button
              onClickHandler={() => {
                refRef.current?.showModal();
              }}
            >
              change
            </Button>
            <Button
              onClickHandler={() => {
                askRef.current?.showModal();
              }}
            >
              ask
            </Button>
            <Button onClickHandler={updateWithEditorContent}>run</Button>
            <Button
              onClickHandler={async () => {
                const url = await save(getEditorContent());
                setUrl(url.toString());
                diaRef.current?.showModal();
              }}
            >
              share
            </Button>
            <Button onClickHandler={reset}>reset</Button>
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
          <iframe
            title="runner"
            ref={iframeRef}
            src="./runner.html"
            sandbox="allow-scripts"
          ></iframe>
          <Placement></Placement>
        </section>
      </main>
      <Footer />
    </>
  );
}
