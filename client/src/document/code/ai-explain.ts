import { SSE } from "sse.js";

function explain(context, callback) {
  const source = new SSE("/api/v1/plus/ai/explain", {
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify(context),
  });
  source.addEventListener("message", (e: { data: string }) =>
    callback(JSON.parse(e.data))
  );
  source.addEventListener("error", (e) => callback(null, e));
  source.stream();
}

function thumbs(upDown: string, title: string, callback: () => void): Element {
  const thumbs = document.createElement("button");
  thumbs.classList.add("icon", `icon-thumbs-${upDown}`);
  thumbs.setAttribute("data-ai-explain", `thumbs_${upDown}`);
  thumbs.addEventListener("click", callback);
  thumbs.title = title;
  return thumbs;
}

async function postFeedback(
  typ: string,
  getHash: () => string | null,
  signature: string
): Promise<void> {
  const hash = getHash();
  if (hash) {
    await fetch("/api/v1/plus/ai/explain/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ typ, hash, signature }),
    });
  }
}

function feedback(hash: () => string | null, signature: string): Element {
  const div = document.createElement("div");
  div.classList.add("ai-explain-feedback");
  div.append(document.createTextNode("How's this answer?"));
  div.appendChild(
    thumbs(
      "down",
      "This answer was not useful!",
      async () => await postFeedback("thumbs_down", hash, signature)
    )
  );
  div.appendChild(
    thumbs(
      "up",
      "This answer was useful!",
      async () => await postFeedback("thumbs_up", hash, signature)
    )
  );
  return div;
}

export function addExplainButton(
  element: Element | null | undefined,
  pre: Element,
  id: string
) {
  const signature = pre.getAttribute("data-signature");
  if (!signature || !element || element.querySelector(".ai-explain-button"))
    return;

  const button = document.createElement("button");
  button.textContent = "AI Explain";
  button.classList.add("ai-explain-button");
  button.type = "button";
  button.setAttribute("data-ai-explain", id);
  button.title = "Explain (parts of) this example";
  element.appendChild(button);

  const sample = pre.textContent;

  document.addEventListener("selectionchange", (e) => {
    const selected = window.getSelection()?.toString();
    const highlighted =
      selected && sample?.includes(selected) ? selected : null;
    if (highlighted) {
      button.classList.add("ai-explain-highlight");
    } else {
      button.classList.remove("ai-explain-highlight");
    }
  });

  button.addEventListener("click", async (e) => {
    const language = element
      .querySelector(".language-name")
      ?.textContent?.toLowerCase();
    const sample = pre.textContent;
    const selected = window.getSelection()?.toString();
    const highlighted =
      selected && sample?.includes(selected) ? selected : null;
    let all = "";

    const header = document.createElement("p");
    header.classList.add("ai-explain-header");

    const span = document.createElement("span");
    header.appendChild(span);
    if (highlighted) {
      span.textContent = "Your selection:";
      const highlightedCode = document.createElement("pre");
      highlightedCode.textContent = highlighted;
      header.appendChild(highlightedCode);
    } else {
      span.textContent = "AI Explain:";
    }

    const container = document.createElement("div");
    container.classList.add("ai-explain-answer");
    container.appendChild(header);

    const div = document.createElement("div");

    container.appendChild(div);
    container.append(
      feedback(() => container.getAttribute("data-hash"), signature)
    );
    pre.insertAdjacentElement("afterend", container);

    const { render } = await import("./render-md");

    explain(
      {
        language,
        highlighted,
        sample,
        signature,
      },
      (data, err) => {
        if (data !== null) {
          const { choices, initial } = data;
          if (choices) {
            const [{ delta: { content = "" } = {} } = {}] = choices;
            all += content || "";
            div.innerHTML = render(all);
          } else if (initial) {
            container.setAttribute("data-hash", initial.hash);
          }
        }
      }
    );
  });
}
