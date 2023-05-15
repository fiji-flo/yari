export interface EditorContent {
  css: string;
  html: string;
  js: string;
  src?: string;
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
  //const b = new Blob([editorContent.html], {type: "text/html",});

  //iframe.src = URL.createObjectURL(b);
  //return;
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
