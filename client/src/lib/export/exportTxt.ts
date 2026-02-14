import type { ScannedPage } from "@/lib/scan-context";

export type ExportWord = { text: string; x0: number; y0: number; x1: number; y1: number };
export type ExportLine = { id: string; text: string; words: ExportWord[]; x0: number; y0: number; x1: number; y1: number };
export type ExportBlock = { id: string; text: string; lines: ExportLine[]; x0: number; y0: number; x1: number; y1: number };
export type ExportColumn = { id: string; x0: number; x1: number; blocks: ExportBlock[] };
export type ExportPage = { id: string; columns: ExportColumn[] };

const gapThreshold = 18;

const normalizeSpace = (text: string) => text.replace(/\s+/g, " ").trim();

export const mapPageToExportPage = (page: ScannedPage): ExportPage => {
  const wordsByLine = new Map<string, ExportWord[]>();
  const linesByBlock = new Map<string, ExportLine[]>();

  (page.ocr?.words ?? []).forEach((word) => {
    const lineWords = wordsByLine.get(word.lineId) ?? [];
    lineWords.push({ text: word.text, x0: word.x0, y0: word.y0, x1: word.x1, y1: word.y1 });
    wordsByLine.set(word.lineId, lineWords);
  });

  (page.ocr?.lines ?? []).forEach((line) => {
    const sortedWords = (wordsByLine.get(line.id) ?? []).sort((a, b) => a.x0 - b.x0);
    const lineText = normalizeSpace(sortedWords.map((word) => word.text).join(" ") || line.text);
    const item: ExportLine = {
      id: line.id,
      text: lineText,
      words: sortedWords,
      x0: line.x0,
      y0: line.y0,
      x1: line.x1,
      y1: line.y1,
    };

    const blockLines = linesByBlock.get(line.blockId) ?? [];
    blockLines.push(item);
    linesByBlock.set(line.blockId, blockLines);
  });

  const blocks: ExportBlock[] = (page.ocr?.blocks ?? [])
    .map((block) => {
      const lines = (linesByBlock.get(block.id) ?? []).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0);
      return {
        id: block.id,
        text: normalizeSpace(lines.map((line) => line.text).join("\n") || block.text),
        lines,
        x0: block.x0,
        y0: block.y0,
        x1: block.x1,
        y1: block.y1,
      };
    })
    .sort((a, b) => a.x0 - b.x0 || a.y0 - b.y0);

  if (blocks.length === 0) {
    return {
      id: page.id,
      columns: [{ id: `${page.id}-col-1`, x0: 0, x1: 100, blocks: [] }],
    };
  }

  const columns: ExportColumn[] = [];

  blocks.forEach((block) => {
    const candidate = columns.find((column) => {
      const overlap = Math.min(column.x1, block.x1) - Math.max(column.x0, block.x0);
      return overlap >= -gapThreshold;
    });

    if (!candidate) {
      columns.push({ id: `${page.id}-col-${columns.length + 1}`, x0: block.x0, x1: block.x1, blocks: [block] });
      return;
    }

    candidate.blocks.push(block);
    candidate.x0 = Math.min(candidate.x0, block.x0);
    candidate.x1 = Math.max(candidate.x1, block.x1);
  });

  return {
    id: page.id,
    columns: columns
      .sort((a, b) => a.x0 - b.x0)
      .map((column) => ({
        ...column,
        blocks: column.blocks.sort((a, b) => a.y0 - b.y0),
      })),
  };
};

export const exportTxt = (pages: ScannedPage[]): string => {
  const sections = pages.map((page, pageIndex) => {
    const mapped = mapPageToExportPage(page);
    const linearLines = mapped.columns
      .flatMap((column) => column.blocks)
      .sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0)
      .flatMap((block) => block.lines.map((line) => line.text).filter(Boolean));

    const header = `Página ${pageIndex + 1}`;
    return `${header}\n${linearLines.join("\n")}`.trim();
  });

  return sections.join("\n\n").trim();
};
