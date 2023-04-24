import useSWR from "swr";

import { HydrationData } from "../../../libs/types/hydration";
import { HTTPError, RenderDocumentBody } from "../document";
import { CRUD_MODE } from "../env";
import { Doc } from "../../../libs/types/document";
import { useParams } from "react-router-dom";
import { TopNavigation } from "../ui/organisms/top-navigation";

export function BlogPost(props: HydrationData) {
  const { slug, locale = "en-US" } = useParams();
  const dataURL = `./${slug}/index.json`;
  const { data: doc, error } = useSWR<Doc>(
    dataURL,
    async (url) => {
      const response = await fetch(url);

      if (!response.ok) {
        switch (response.status) {
          case 404:
            throw new HTTPError(response.status, url, "Page not found");
        }

        const text = await response.text();
        throw new HTTPError(response.status, url, text);
      }

      const { doc } = await response.json();

      return doc;
    },
    {
      fallbackData: props.hyData,
      revalidateOnFocus: CRUD_MODE,
      revalidateOnMount: !props.hyData,
    }
  );
  return (
    <>
      <TopNavigation />
      {doc && (
        <article className="main-page-content" lang={doc?.locale}>
          <h1>{doc?.title}</h1>
          <RenderDocumentBody doc={doc} />
        </article>
      )}
    </>
  );
}
