const { Translate } = require("@google-cloud/translate").v2;
const { Document } = require("../content");
const fs = require("fs");
const path = require("path");

function encodeKuma(s) {
  return s.replace(
    /({{[^}]*}})/g,
    (_, kuma) => `<embed kuma="${kuma.replace(/"/g, '\\"')}">`
  );
}

function decodeKuma(s) {
  return s.replace(/<embed kuma="({{[^}]*}})">/g, (_, kuma) =>
    kuma.replace(/\\"/g, '"')
  );
}

async function translateDocument(doc, locale, out) {
  const translate = new Translate();
  const to = locale === "en-US" ? "en" : locale;
  const outFile = out || Document.buildHtmlPath(locale, doc.metadata.slug);
  const { rawHTML } = doc;
  const html = encodeKuma(rawHTML);
  const [translations] = await translate.translate(html, {
    to,
    from: "en",
    format: "html",
  });
  const translation = Array.isArray(translations)
    ? translations[0]
    : translations;
  const translatedHTML = decodeKuma(translation);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  Document.saveHTMLFile(outFile, translatedHTML, {
    locale,
    translation_of: doc.metadata.slug,
    ...doc.metadata,
  });
  return outFile;
}

module.exports = {
  translateDocument,
};
