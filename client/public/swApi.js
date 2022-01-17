importScripts("https://cdn.jsdelivr.net/npm/jsstore@4.2.6/dist/jsstore.min.js");
importScripts(
  "https://cdn.jsdelivr.net/npm/jsstore@4.2.6/dist/jsstore.worker.min.js"
);

const SCHEMA = {
  name: "MDN",
  tables: [
    {
      name: "Bookmarks",
      columns: {
        id: {
          primaryKey: true,
          autoIncrement: true,
        },
      },
    },
  ],
};

async function initDb() {
  var connection = new JsStore.Connection();
  var isDbCreated = await connection.initDb(SCHEMA);
  if (isDbCreated) {
    console.log("db created");
  } else {
    console.log("db opened");
  }
  return connection;
}
