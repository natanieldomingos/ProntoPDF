import { loadOpenCv } from "@/lib/vision/loadOpenCv";

export type Point = { x: number; y: number };

export type DocumentPipelineResult = {
  processedUrl: string;
  detectedCorners: [Point, Point, Point, Point] | null;
};

const PREVIEW_MAX_SIDE = 850;
const MAX_PROCESS_SIDE = 1500;
const OUTPUT_JPEG_QUALITY = 0.88;

const isLowEndDevice = () => {
  if (typeof navigator === "undefined") return false;
  const anyNav = navigator as any;
  const memory = typeof anyNav.deviceMemory === "number" ? anyNav.deviceMemory : undefined;
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : undefined;
  return (memory !== undefined && memory <= 4) || (cores !== undefined && cores <= 4);
};

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    image.src = src;
  });

const canvasToDataUrl = (canvas: HTMLCanvasElement) => canvas.toDataURL("image/jpeg", OUTPUT_JPEG_QUALITY);

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const orderCorners = (corners: Point[]): [Point, Point, Point, Point] => {
  const sortedBySum = [...corners].sort((a, b) => a.x + a.y - (b.x + b.y));
  const tl = sortedBySum[0];
  const br = sortedBySum[3];

  const remaining = corners.filter((p) => p !== tl && p !== br);
  const [p1, p2] = remaining;
  const tr = p1.x > p2.x ? p1 : p2;
  const bl = p1.x > p2.x ? p2 : p1;

  return [tl, tr, br, bl];
};

function findDocumentCorners(cv: any, srcCanvas: HTMLCanvasElement): [Point, Point, Point, Point] | null {
  const src = cv.imread(srcCanvas);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
    cv.Canny(blurred, edges, 60, 180);

    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    const imageArea = src.rows * src.cols;
    let bestQuad: Point[] | null = null;
    let bestScore = 0;

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();

      try {
        cv.approxPolyDP(contour, approx, 0.02 * perimeter, true);

        if (approx.rows !== 4 || !cv.isContourConvex(approx)) {
          continue;
        }

        const area = Math.abs(cv.contourArea(approx));
        if (area < imageArea * 0.2) {
          continue;
        }

        const points: Point[] = [];
        for (let j = 0; j < 4; j += 1) {
          points.push({
            x: approx.intPtr(j, 0)[0],
            y: approx.intPtr(j, 0)[1],
          });
        }

        const ordered = orderCorners(points);
        const widthTop = distance(ordered[0], ordered[1]);
        const widthBottom = distance(ordered[3], ordered[2]);
        const heightLeft = distance(ordered[0], ordered[3]);
        const heightRight = distance(ordered[1], ordered[2]);
        const avgWidth = (widthTop + widthBottom) / 2;
        const avgHeight = (heightLeft + heightRight) / 2;
        const aspectRatio = avgWidth / Math.max(avgHeight, 1);

        if (aspectRatio < 0.5 || aspectRatio > 1.8) {
          continue;
        }

        const score = area;
        if (score > bestScore) {
          bestScore = score;
          bestQuad = ordered;
        }
      } finally {
        contour.delete();
        approx.delete();
      }
    }

    return bestQuad ? (bestQuad as [Point, Point, Point, Point]) : null;
  } finally {
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    contours.delete();
    hierarchy.delete();
  }
}

function warpAndEnhance(
  cv: any,
  sourceCanvas: HTMLCanvasElement,
  orderedCorners: [Point, Point, Point, Point]
): string {
  const src = cv.imread(sourceCanvas);
  const dst = new cv.Mat();
  const enhanced = new cv.Mat();

  const [tl, tr, br, bl] = orderedCorners;
  const width = Math.max(Math.round(distance(tl, tr)), Math.round(distance(bl, br)), 1);
  const height = Math.max(Math.round(distance(tl, bl)), Math.round(distance(tr, br)), 1);

  const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y]);
  const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width - 1, 0, width - 1, height - 1, 0, height - 1]);

  try {
    const perspectiveMatrix = cv.getPerspectiveTransform(srcTri, dstTri);
    const dstSize = new cv.Size(width, height);
    cv.warpPerspective(src, dst, perspectiveMatrix, dstSize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    const lowEnd = isLowEndDevice();

    if (!lowEnd) {
      const lab = new cv.Mat();
      const channels = new cv.MatVector();
      const l = new cv.Mat();
      const clahe = new cv.CLAHE(3.0, new cv.Size(8, 8));

      try {
        cv.cvtColor(dst, lab, cv.COLOR_RGBA2RGB);
        cv.cvtColor(lab, lab, cv.COLOR_RGB2Lab);
        cv.split(lab, channels);
        channels.get(0).copyTo(l);
        clahe.apply(l, l);
        l.copyTo(channels.get(0));
        cv.merge(channels, lab);
        cv.cvtColor(lab, enhanced, cv.COLOR_Lab2RGB);

        const blurred = new cv.Mat();
        try {
          cv.GaussianBlur(enhanced, blurred, new cv.Size(0, 0), 1.2);
          cv.addWeighted(enhanced, 1.5, blurred, -0.5, 0, enhanced);
        } finally {
          blurred.delete();
        }
      } finally {
        lab.delete();
        channels.delete();
        l.delete();
        clahe.delete();
        perspectiveMatrix.delete();
      }
    } else {
      // Caminho mais leve para celulares fracos.
      cv.cvtColor(dst, enhanced, cv.COLOR_RGBA2RGB);
      cv.convertScaleAbs(enhanced, enhanced, 1.12, 0);
      perspectiveMatrix.delete();
    }

    const outputCanvas = document.createElement("canvas");
    cv.imshow(outputCanvas, enhanced);
    return canvasToDataUrl(outputCanvas);
  } finally {
    srcTri.delete();
    dstTri.delete();
    src.delete();
    dst.delete();
    enhanced.delete();
  }
}

export async function runDocumentPipeline(rawUrl: string): Promise<DocumentPipelineResult> {
  const cv = await loadOpenCv();
  const sourceImage = await loadImageElement(rawUrl);

  const sourceCanvas = document.createElement("canvas");
  // Limita o tamanho de processamento para não travar no celular.
  const longest = Math.max(sourceImage.naturalWidth, sourceImage.naturalHeight);
  const scale = Math.min(MAX_PROCESS_SIDE / Math.max(longest, 1), 1);
  sourceCanvas.width = Math.max(1, Math.round(sourceImage.naturalWidth * scale));
  sourceCanvas.height = Math.max(1, Math.round(sourceImage.naturalHeight * scale));
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) {
    throw new Error("Contexto 2D indisponível");
  }
  sourceCtx.drawImage(sourceImage, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const previewScale = Math.min(PREVIEW_MAX_SIDE / Math.max(sourceCanvas.width, sourceCanvas.height), 1);
  const previewCanvas = document.createElement("canvas");
  previewCanvas.width = Math.max(1, Math.round(sourceCanvas.width * previewScale));
  previewCanvas.height = Math.max(1, Math.round(sourceCanvas.height * previewScale));
  const previewCtx = previewCanvas.getContext("2d");
  if (!previewCtx) {
    throw new Error("Contexto de preview indisponível");
  }
  previewCtx.drawImage(sourceCanvas, 0, 0, previewCanvas.width, previewCanvas.height);

  const previewCorners = findDocumentCorners(cv, previewCanvas);
  if (!previewCorners) {
    return {
      processedUrl: rawUrl,
      detectedCorners: null,
    };
  }

  const detectedCorners = previewCorners.map((point) => ({
    x: point.x / previewScale,
    y: point.y / previewScale,
  })) as [Point, Point, Point, Point];

  const processedUrl = warpAndEnhance(cv, sourceCanvas, detectedCorners);
  return {
    processedUrl,
    detectedCorners,
  };
}
