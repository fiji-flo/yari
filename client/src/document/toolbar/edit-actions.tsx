import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import "./edit-actions.scss";

export function EditActions({
  folder,
  isMarkdown = false,
}: {
  folder: string;
  isMarkdown: boolean;
}) {
  const location = useLocation();

  const [opening, setOpening] = useState(false);
  const [editorOpeningError, setEditorOpeningError] = useState<Error | null>(
    null
  );

  useEffect(() => {
    let unsetOpeningTimer: ReturnType<typeof setTimeout>;
    if (opening) {
      unsetOpeningTimer = setTimeout(() => {
        setOpening(false);
      }, 3000);
    }
    return () => {
      if (unsetOpeningTimer) {
        clearTimeout(unsetOpeningTimer);
      }
    };
  }, [opening]);

  async function openInEditorHandler(event: React.MouseEvent) {
    event.preventDefault();

    const filepath = `${folder}/index.${isMarkdown ? "md" : "html"}`;
    console.log(`Going to try to open ${filepath} in your editor`);
    setOpening(true);
    try {
      const response = await fetch(`/_open?filepath=${filepath}`);
      if (!response.ok) {
        if (response.status >= 500) {
          setEditorOpeningError(
            new Error(`${response.status}: ${response.statusText}`)
          );
        } else {
          const body = await response.text();
          setEditorOpeningError(new Error(`${response.status}: ${body}`));
        }
      }
    } catch (err) {
      setEditorOpeningError(err);
    }
  }

  async function convertToMarkdownHandler(event: React.MouseEvent) {
    event.preventDefault();
    const response = await fetch(
      `/_document/convert?slug=${encodeURIComponent(
        slug || ""
      )}&locale=${locale}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      }
    );
    if (response.ok) {
      window.alert("Document successfully converted");
    } else {
      window.alert(`Error while converting document: ${response.statusText}`);
    }
  }

  const { locale, "*": slug } = useParams();

  if (!folder) {
    return null;
  }

  return (
    <ul className="edit-actions">
      <li>
        <button
          type="button"
          className="button"
          title={`Folder: ${folder}`}
          onClick={openInEditorHandler}
        >
          Open in your <b>editor</b>
        </button>
      </li>

      <li>
        <a
          href={`https://developer.mozilla.org/${locale}/docs/${slug}`}
          className="button"
        >
          View on MDN
        </a>
      </li>

      {isMarkdown || (
        <li>
          <Link
            to={location.pathname.replace("/docs/", "/_edit/")}
            className="button"
          >
            Quick-edit
          </Link>
        </li>
      )}

      {isMarkdown || (
        <li>
          <button
            type="button"
            className="button"
            title={`Folder: ${folder}`}
            onClick={convertToMarkdownHandler}
          >
            Convert to <b>markdown</b>
          </button>
        </li>
      )}

      {editorOpeningError ? (
        <p className="error-message editor-opening-error">
          <b>Error opening page in your editor!</b>
          <br />
          <code>{editorOpeningError.toString()}</code>
        </p>
      ) : (
        opening && <small>Trying to your editor now...</small>
      )}
    </ul>
  );
}
