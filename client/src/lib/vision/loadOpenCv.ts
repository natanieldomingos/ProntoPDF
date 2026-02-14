declare global {
  interface Window {
    cv?: any;
    Module?: { onRuntimeInitialized?: () => void };
  }
}

const OPENCV_SCRIPT_ID = "opencv-js-script";
const OPENCV_CDN_URL = "https://docs.opencv.org/4.x/opencv.js";

let pendingLoad: Promise<any> | null = null;

const isReady = (cv: any) => Boolean(cv && typeof cv.Mat === "function" && cv.imread);

export function loadOpenCv() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("OpenCV.js only runs in browser"));
  }

  if (window.cv && isReady(window.cv)) {
    return Promise.resolve(window.cv);
  }

  if (pendingLoad) {
    return pendingLoad;
  }

  pendingLoad = new Promise((resolve, reject) => {
    const onRuntimeReady = () => {
      if (window.cv && isReady(window.cv)) {
        resolve(window.cv);
      } else {
        reject(new Error("OpenCV.js loaded but runtime is unavailable"));
      }
    };

    window.Module = {
      ...(window.Module ?? {}),
      onRuntimeInitialized: onRuntimeReady,
    };

    const existing = document.getElementById(OPENCV_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("error", () => reject(new Error("Failed to load OpenCV.js")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = OPENCV_SCRIPT_ID;
    script.async = true;
    script.src = OPENCV_CDN_URL;
    script.onerror = () => reject(new Error("Failed to load OpenCV.js"));
    document.body.appendChild(script);
  }).catch((error) => {
    pendingLoad = null;
    throw error;
  });

  return pendingLoad;
}
