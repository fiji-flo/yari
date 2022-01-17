const cacheName = "mdn-app-1";
const contentCache = "mdn-content-1";

function jsonBlob(json) {
  return new Blob([JSON.stringify(json, null, 2)], {
    type: "application/json",
  });
}

async function updateContent() {
  console.log("updating");
  const files = await (await fetch("/list.json")).json();
  const cache = await caches.open(contentCache);
  console.log(`got ${files.length} files`);
  for (let i = 0; i < files.length; i += 100) {
    try {
      await cache.addAll(files.slice(i, i + 100));
    } catch (e) {
      console.error(e);
    }
    console.log(`added from ${i}`);
  }
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName);
      const { files = {} } =
        (await (await fetch("/asset-manifest.json")).json()) || {};
      const assets = [...Object.values(files)];
      await cache.addAll(assets);
    })()
  );
});

self.addEventListener("message", (e) => {
  e.waitUntil(
    (async () => {
      console.log("got message");
      if (e.data && e.data.type === "update") {
        await updateContent();
      }
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key === cacheName) {
            return;
          }
          return caches.delete(key);
        })
      );
    })
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    (async () => {
      const url = new URL(e.request.url);
      if (url.pathname == "/api/v1/whoami") {
        const whoami = jsonBlob({ username: "fiji", is_authenticated: true });
        return new Response(whoami);
      }
      if (url.pathname == "/api/v1/settings") {
        const whoami = jsonBlob({ nothing: null });
        return new Response(whoami);
      }
      if (!url.pathname.split("/").pop().includes(".")) {
        return await caches.match("/index.html");
      }
      const r = await caches.match(e.request);
      if (r) {
        return r;
      }
      let request;
      if (url.pathname.startsWith("/en-US/docs/")) {
        url.pathname = url.pathname.toLowerCase();
        try {
          const response = await fetch(url.href);
          return response;
        } catch (e) {
          console.log(url.href);
          console.log(e);
        }
      }
      const response = await fetch(e.request);
      return response;
    })()
  );
});
