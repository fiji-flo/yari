import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { Placement } from "../document/organisms/toc/placement";
import { Button } from "../ui/atoms/button";
import { Loading } from "../ui/atoms/loading";
import { Logo } from "../ui/atoms/logo";
import { Footer } from "../ui/organisms/footer";
import { TopNavigationMain } from "../ui/organisms/top-navigation-main";

import "./index.scss";

const Editor = React.lazy(() => import("./editor"));

const HTML_DEFAULT = "<!-- HTML goes here -->";
const CSS_DEFAULT = "/* CSS goes here */";
const JS_DEFAULT = "/* JavaScript goes here */";

export interface State {
  css: string;
  html: string;
  js: string;
}

export interface Message {
  typ: string;
  state: State;
}

function update(iframe: HTMLIFrameElement | null, state: State | null) {
  console.log(iframe, state);
  if (!iframe || !state) {
    return;
  }

  const message: Message = {
    typ: "init",
    state,
  };
  iframe.contentWindow!.postMessage(message, {
    targetOrigin: "*",
  });
}

async function save(state: State) {
  const res = await fetch("/api/v1/play/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: JSON.stringify(state) }),
  });
  let { id } = await res.json();
  let url = new URL(document.URL);
  url.search = new URLSearchParams([["gist", id]]).toString();
  return url;
}

export function Playground() {
  let [searchParams, setSearchParams] = useSearchParams();
  let [url, setUrl] = useState<string | null>(null);
  let [prompt, setPrompt] = useState<string>("");
  let [loading, setLoading] = useState(false);
  let gistId = searchParams.get("gist");
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
    }
  );
  let [html, setHtml] = useState<string>(code?.html ?? HTML_DEFAULT);
  let [css, setCss] = useState<string>(code?.css ?? CSS_DEFAULT);
  let [js, setJs] = useState<string>(code?.js ?? JS_DEFAULT);
  useEffect(() => {
    if (code) {
      console.log(code);
      setHtml(code.html || HTML_DEFAULT);
      setCss(code.css || CSS_DEFAULT);
      setJs(code.js || JS_DEFAULT);
    }
  }, [code]);
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const diaRef = useRef<HTMLDialogElement | null>(null);
  const askRef = useRef<HTMLDialogElement | null>(null);
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
      body: JSON.stringify({ prompt: JSON.stringify(prompt) }),
    });
    const code = await res.json();
    setLoading(false);
    askRef.current?.close();
    setHtml(code.html || HTML_DEFAULT);
    setCss(code.css || CSS_DEFAULT);
    setJs(code.js || JS_DEFAULT);
  };
  const reset = async () => {
    if (window.confirm("Do you really want to reset everything?")) {
      setSearchParams([]);
      setHtml(HTML_DEFAULT);
      setCss(CSS_DEFAULT);
      setJs(JS_DEFAULT);
    }
  };
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
                askRef.current?.showModal();
              }}
            >
              ask
            </Button>
            <Button
              onClickHandler={() => update(iframe.current, { css, js, html })}
            >
              run
            </Button>
            <Button
              onClickHandler={async () => {
                const url = await save({ css, js, html });
                setUrl(url.toString());
                diaRef.current?.showModal();
              }}
            >
              share
            </Button>
            <Button onClickHandler={reset}>reset</Button>
          </aside>
          <Editor v={html} n={setHtml} language="html"></Editor>
          <Editor v={css} n={setCss} language="css"></Editor>
          <Editor v={js} n={setJs} language="javascript"></Editor>
        </section>
        <section className="preview">
          <iframe title="runner" ref={iframeRef} src="./runner.html"></iframe>
          <Placement></Placement>
        </section>
      </main>
      <Footer />
    </>
  );
}
