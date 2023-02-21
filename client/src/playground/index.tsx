import React, { useCallback, useEffect, useRef, useState } from "react";

import "./index.scss";

const Editor = React.lazy(() => import("./editor"));

export interface State {
  css: string;
  html: string;
  js: string;
}

const EMPTY_STATE = { css: "", html: "", js: "" };

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
  await fetch("/api/v1/play/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code: JSON.stringify(state) }),
  });
}

export function Playground() {
  let html = useRef<string>("");
  const iframe = useRef<HTMLIFrameElement | null>(null);
  const iframeRef = useCallback((node: HTMLIFrameElement | null) => {
    iframe.current = node;
    update(node, { ...EMPTY_STATE, html: html.current });
  }, []);
  return (
    <main>
      <section>
        <button
          onClick={() =>
            update(iframe.current, { ...EMPTY_STATE, html: html.current })
          }
        >
          update
        </button>
        <button onClick={() => save({ ...EMPTY_STATE, html: html.current })}>
          Share
        </button>
        <Editor v={html} language="html"></Editor>;
      </section>
      <section>
        <iframe ref={iframeRef} src="./runner.html"></iframe>
      </section>
    </main>
  );
}
