import type { ScannedPage } from "@/lib/scan-context";
import { mapPageToExportPage } from "@/lib/export/exportTxt";

const escapeHtml = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const exportHtml = (pages: ScannedPage[]): string => {
  const pageSections = pages
    .map((page, pageIndex) => {
      const mapped = mapPageToExportPage(page);
      const columns = mapped.columns
        .map((column) => {
          const blocks = column.blocks
            .map((block) => {
              const paragraph = block.lines.map((line) => escapeHtml(line.text)).join("<br />");
              return `<p>${paragraph}</p>`;
            })
            .join("\n");

          return `<div class=\"ocr-column\">${blocks}</div>`;
        })
        .join("\n");

      return `<section class=\"ocr-page\"><h2>Página ${pageIndex + 1}</h2><div class=\"ocr-columns\">${columns}</div></section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>documento-pronto</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
      .ocr-page { margin-bottom: 24px; }
      .ocr-columns { display: grid; gap: 16px; align-items: start; }
      .ocr-column { border-left: 3px solid #d9d9d9; padding-left: 12px; }
      p { margin: 0 0 12px; line-height: 1.45; }
      @media (min-width: 768px) {
        .ocr-columns { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
      }
    </style>
  </head>
  <body contenteditable="true">
    ${pageSections}
  </body>
</html>`;
};
