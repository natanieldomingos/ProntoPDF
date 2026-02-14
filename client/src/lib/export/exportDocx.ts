import type { ScannedPage } from "@/lib/scan-context";
import { mapPageToExportPage } from "@/lib/export/exportTxt";

export const exportDocx = async (pages: ScannedPage[]): Promise<Blob> => {
  const moduleName = "docx";
  const { Document, Packer, Paragraph } = await import(/* @vite-ignore */ moduleName);

  const sections = pages.map((page, pageIndex) => {
    const mapped = mapPageToExportPage(page);
    const paragraphs = [new Paragraph({ text: `Página ${pageIndex + 1}` })];

    mapped.columns.forEach((column, columnIndex) => {
      column.blocks.forEach((block) => {
        const text = block.lines.map((line) => line.text).filter(Boolean).join("\n");
        paragraphs.push(new Paragraph({ text: text || block.text }));
      });

      if (columnIndex < mapped.columns.length - 1) {
        paragraphs.push(new Paragraph({ text: "" }));
      }
    });

    return {
      properties: {
        column: {
          count: Math.max(mapped.columns.length, 1),
          space: 708,
        },
      },
      children: paragraphs,
    };
  });

  const document = new Document({ sections });
  return Packer.toBlob(document);
};
