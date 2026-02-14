export type OcrWord = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence: number;
  lineId: string;
  blockId: string;
};

export type OcrLine = {
  id: string;
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence: number;
  blockId: string;
  wordIds: number[];
};

export type OcrBlock = {
  id: string;
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  confidence: number;
  lineIds: string[];
};

export type OcrPageResult = {
  rawText: string;
  words: OcrWord[];
  lines: OcrLine[];
  blocks: OcrBlock[];
};

export type OcrLanguage = "por+eng" | "por" | "eng" | "spa";
