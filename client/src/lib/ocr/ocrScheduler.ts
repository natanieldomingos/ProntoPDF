import type { OcrLanguage, OcrPageResult } from "@/lib/ocr/types";

type Task = {
  taskId: string;
  pageIndex: number;
  image: string;
  resolve: (result: OcrPageResult) => void;
  reject: (reason?: unknown) => void;
};

export type ProgressPayload = {
  pageIndex: number;
  pageProgress: number;
  overallProgress: number;
  completedPages: number;
  totalPages: number;
};

type SchedulerOptions = {
  language: OcrLanguage;
  pageCount: number;
  onProgress?: (progress: ProgressPayload) => void;
};

type WorkerResponse =
  | { type: "ready" }
  | { type: "progress"; progress: number }
  | { type: "result"; taskId: string; result: OcrPageResult }
  | { type: "error"; taskId?: string; error: string };

type PoolWorker = {
  worker: Worker;
  busyTaskId: string | null;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const workerCountFromDevice = () => {
  const cores = navigator.hardwareConcurrency ?? 2;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const baseline = memory <= 2 ? 2 : memory <= 4 ? 3 : 4;
  return clamp(Math.min(cores, baseline), 2, 4);
};

export class OcrScheduler {
  private readonly workerCount: number;
  private readonly language: OcrLanguage;
  private readonly totalPages: number;
  private readonly onProgress?: (progress: ProgressPayload) => void;
  private readonly workers: PoolWorker[] = [];
  private readonly queue: Task[] = [];
  private readonly activeTasks = new Map<string, Task>();
  private readonly progressByTaskId = new Map<string, number>();
  private completedPages = 0;

  constructor(options: SchedulerOptions) {
    this.language = options.language;
    this.totalPages = options.pageCount;
    this.onProgress = options.onProgress;
    this.workerCount = workerCountFromDevice();
  }

  async init() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = new Worker(new URL("./ocrWorker.ts", import.meta.url), { type: "module" });
      const poolWorker: PoolWorker = { worker, busyTaskId: null };
      this.workers.push(poolWorker);

      await new Promise<void>((resolve, reject) => {
        const onMessage = (event: MessageEvent<WorkerResponse>) => {
          if (event.data.type === "ready") {
            worker.removeEventListener("message", onMessage);
            worker.removeEventListener("error", onError);
            resolve();
          }
        };

        const onError = (error: ErrorEvent) => {
          worker.removeEventListener("message", onMessage);
          worker.removeEventListener("error", onError);
          reject(error.error ?? new Error("Falha ao inicializar worker de OCR"));
        };

        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
        worker.postMessage({ type: "init", language: this.language });
      });

      worker.addEventListener("message", (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const currentTaskId = poolWorker.busyTaskId;

        if (message.type === "progress" && currentTaskId) {
          this.progressByTaskId.set(currentTaskId, clamp(message.progress, 0, 1));
          const task = this.activeTasks.get(currentTaskId);
          this.emitProgress(task?.pageIndex ?? -1);
          return;
        }

        if (message.type === "result") {
          const task = this.activeTasks.get(message.taskId);
          if (!task) {
            return;
          }
          this.activeTasks.delete(message.taskId);
          this.progressByTaskId.delete(message.taskId);
          this.completedPages += 1;
          this.releaseWorker(message.taskId);
          task.resolve(message.result);
          this.emitProgress(task.pageIndex);
          this.dispatch();
          return;
        }

        if (message.type === "error") {
          if (!message.taskId) {
            return;
          }

          const task = this.activeTasks.get(message.taskId);
          if (!task) {
            return;
          }
          this.activeTasks.delete(message.taskId);
          this.progressByTaskId.delete(message.taskId);
          this.releaseWorker(message.taskId);
          task.reject(new Error(message.error));
          this.dispatch();
        }
      });
    }
  }

  enqueue(pageIndex: number, image: string) {
    return new Promise<OcrPageResult>((resolve, reject) => {
      const taskId = `${pageIndex}-${Math.random().toString(36).slice(2, 8)}`;
      this.queue.push({ taskId, pageIndex, image, resolve, reject });
      this.dispatch();
    });
  }

  private dispatch() {
    for (const poolWorker of this.workers) {
      if (poolWorker.busyTaskId || this.queue.length === 0) {
        continue;
      }
      const task = this.queue.shift();
      if (!task) {
        continue;
      }

      poolWorker.busyTaskId = task.taskId;
      this.activeTasks.set(task.taskId, task);
      this.progressByTaskId.set(task.taskId, 0);
      poolWorker.worker.postMessage({ type: "recognize", taskId: task.taskId, image: task.image });
    }
  }

  private releaseWorker(taskId: string) {
    const poolWorker = this.workers.find((entry) => entry.busyTaskId === taskId);
    if (poolWorker) {
      poolWorker.busyTaskId = null;
    }
  }

  private emitProgress(activePageIndex: number) {
    if (!this.onProgress) {
      return;
    }

    const activeProgressSum = Array.from(this.progressByTaskId.values()).reduce((sum, value) => sum + value, 0);
    const overallProgress = this.totalPages === 0 ? 1 : (this.completedPages + activeProgressSum) / this.totalPages;

    let pageProgress = 0;
    if (activePageIndex >= 0) {
      const activeTask = Array.from(this.activeTasks.values()).find((task) => task.pageIndex === activePageIndex);
      if (activeTask) {
        pageProgress = this.progressByTaskId.get(activeTask.taskId) ?? 0;
      } else if (this.completedPages > activePageIndex) {
        pageProgress = 1;
      }
    }

    this.onProgress({
      pageIndex: activePageIndex,
      pageProgress,
      overallProgress: clamp(overallProgress, 0, 1),
      completedPages: this.completedPages,
      totalPages: this.totalPages,
    });
  }

  async terminate() {
    for (const poolWorker of this.workers) {
      poolWorker.worker.postMessage({ type: "terminate" });
      poolWorker.worker.terminate();
    }
    this.workers.length = 0;
  }
}
