/// <reference lib="webworker" />

import type { OcrPageResult } from "@/lib/ocr/types";

declare const self: DedicatedWorkerGlobalScope;
declare const Tesseract: {
  createWorker: (language: string, oem?: number, options?: Record<string, unknown>) => Promise<{
    recognize: (image: string) => Promise<{ data: Record<string, unknown> }>;
    terminate: () => Promise<void>;
  }>;
};

type WorkerRequest =
  | { type: "init"; language: string }
  | { type: "recognize"; taskId: string; image: string }
  | { type: "terminate" };

type WorkerResponse =
  | { type: "ready" }
  | { type: "progress"; progress: number }
  | { type: "result"; taskId: string; result: OcrPageResult }
  | { type: "error"; taskId?: string; error: string };

let workerInstance: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;

const toNumber = (value: unknown): number => (typeof value === "number" ? value : 0);

const bboxToRect = (bbox?: Record<string, unknown>) => ({
  x0: toNumber(bbox?.x0),
  y0: toNumber(bbox?.y0),
  x1: toNumber(bbox?.x1),
  y1: toNumber(bbox?.y1),
});

const buildResult = (data: Record<string, unknown>): OcrPageResult => {
  const rawText = typeof data.text === "string" ? data.text : "";
  const wordsInput = Array.isArray(data.words) ? data.words : [];

  const words = wordsInput
    .map((rawWord, index) => {
      const word = (rawWord ?? {}) as Record<string, unknown>;
      const lineRef = (word.line ?? {}) as Record<string, unknown>;
      const paragraphRef = (lineRef.paragraph ?? {}) as Record<string, unknown>;
      const lineId = String(lineRef.id ?? `line-${index}`);
      const blockId = String(paragraphRef.id ?? `block-${index}`);
      const bbox = bboxToRect((word.bbox ?? {}) as Record<string, unknown>);

      return {
        text: String(word.text ?? "").trim(),
        ...bbox,
        confidence: toNumber(word.confidence),
        lineId,
        blockId,
      };
    })
    .filter((word) => word.text.length > 0);

  const lineMap = new Map<
    string,
    {
      id: string;
      blockId: string;
      text: string[];
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      confTotal: number;
      count: number;
      wordIds: number[];
    }
  >();

  words.forEach((word, index) => {
    const existing = lineMap.get(word.lineId);
    if (existing) {
      existing.text.push(word.text);
      existing.x0 = Math.min(existing.x0, word.x0);
      existing.y0 = Math.min(existing.y0, word.y0);
      existing.x1 = Math.max(existing.x1, word.x1);
      existing.y1 = Math.max(existing.y1, word.y1);
      existing.confTotal += word.confidence;
      existing.count += 1;
      existing.wordIds.push(index);
      return;
    }

    lineMap.set(word.lineId, {
      id: word.lineId,
      blockId: word.blockId,
      text: [word.text],
      x0: word.x0,
      y0: word.y0,
      x1: word.x1,
      y1: word.y1,
      confTotal: word.confidence,
      count: 1,
      wordIds: [index],
    });
  });

  const lines = Array.from(lineMap.values()).map((line) => ({
    id: line.id,
    blockId: line.blockId,
    text: line.text.join(" "),
    x0: line.x0,
    y0: line.y0,
    x1: line.x1,
    y1: line.y1,
    confidence: line.count ? line.confTotal / line.count : 0,
    wordIds: line.wordIds,
  }));

  const blockMap = new Map<
    string,
    {
      id: string;
      text: string[];
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      confTotal: number;
      count: number;
      lineIds: string[];
    }
  >();

  lines.forEach((line) => {
    const existing = blockMap.get(line.blockId);
    if (existing) {
      existing.text.push(line.text);
      existing.x0 = Math.min(existing.x0, line.x0);
      existing.y0 = Math.min(existing.y0, line.y0);
      existing.x1 = Math.max(existing.x1, line.x1);
      existing.y1 = Math.max(existing.y1, line.y1);
      existing.confTotal += line.confidence;
      existing.count += 1;
      existing.lineIds.push(line.id);
      return;
    }

    blockMap.set(line.blockId, {
      id: line.blockId,
      text: [line.text],
      x0: line.x0,
      y0: line.y0,
      x1: line.x1,
      y1: line.y1,
      confTotal: line.confidence,
      count: 1,
      lineIds: [line.id],
    });
  });

  const blocks = Array.from(blockMap.values()).map((block) => ({
    id: block.id,
    text: block.text.join("\n"),
    x0: block.x0,
    y0: block.y0,
    x1: block.x1,
    y1: block.y1,
    confidence: block.count ? block.confTotal / block.count : 0,
    lineIds: block.lineIds,
  }));

  return { rawText, words, lines, blocks };
};

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;

  try {
    if (message.type === "init") {
      if (!("Tesseract" in (self as unknown as Record<string, unknown>))) {
        importScripts("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
      }

      workerInstance = await Tesseract.createWorker(message.language, 1, {
        logger: (progressPayload: Record<string, unknown>) => {
          if (progressPayload.status === "recognizing text") {
            self.postMessage({
              type: "progress",
              progress: toNumber(progressPayload.progress),
            } satisfies WorkerResponse);
          }
        },
      });
      self.postMessage({ type: "ready" } satisfies WorkerResponse);
      return;
    }

    if (message.type === "recognize") {
      if (!workerInstance) {
        self.postMessage({ type: "error", taskId: message.taskId, error: "OCR worker não inicializado" } satisfies WorkerResponse);
        return;
      }

      const { data } = await workerInstance.recognize(message.image);
      const result = buildResult(data);
      self.postMessage({ type: "result", taskId: message.taskId, result } satisfies WorkerResponse);
      return;
    }

    if (message.type === "terminate") {
      if (workerInstance) {
        await workerInstance.terminate();
      }
      workerInstance = null;
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      taskId: message.type === "recognize" ? message.taskId : undefined,
      error: error instanceof Error ? error.message : "Falha desconhecida no OCR",
    } satisfies WorkerResponse);
  }
};

export {};
