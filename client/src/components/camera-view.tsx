import React, { useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Loader2, X } from "lucide-react";

// Mobile first: reduzir resolução evita travamentos e arquivos gigantes.
const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "environment",
};

type CameraViewProps = {
  onCapture: (imgSrc: string) => Promise<void> | void;
  closeHref?: string;
};

const downscaleDataUrl = async (src: string, maxSide = 2000, quality = 0.85) => {
  const image = new Image();
  image.src = src;
  await image.decode();

  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = Math.min(maxSide / Math.max(longest, 1), 1);

  if (scale >= 0.999) return src;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
};

export default function CameraView({ onCapture, closeHref = "/" }: CameraViewProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = useCallback(
    async (imageSrc: string) => {
      setIsProcessing(true);

      // Garante que o overlay de "Processando..." apareça antes do trabalho pesado.
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      try {
        await onCapture(imageSrc);
      } finally {
        setIsProcessing(false);
      }
    },
    [onCapture]
  );

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const optimized = await downscaleDataUrl(imageSrc);
      await handleCapture(optimized);
    }
  }, [webcamRef, handleCapture]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const optimized = await downscaleDataUrl(event.target.result as string);
        await handleCapture(optimized);
      }
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent">
        <Link href={closeHref}>
          <Button variant="ghost" className="text-white hover:bg-white/20 rounded-full h-10 w-10 p-0" disabled={isProcessing}>
            <X className="w-6 h-6" />
          </Button>
        </Link>
        <span className="text-white font-medium text-sm tracking-wider uppercase">Digitalizar</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          screenshotQuality={0.85}
          videoConstraints={videoConstraints}
          className="absolute inset-0 w-full h-full object-cover"
          onUserMedia={() => setIsCameraReady(true)}
        />

        <div className="absolute inset-8 border-2 border-white/50 rounded-lg pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary -mt-[2px] -ml-[2px]"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary -mt-[2px] -mr-[2px]"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary -mb-[2px] -ml-[2px]"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary -mb-[2px] -mr-[2px]"></div>
        </div>

        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white">
            <p>Iniciando câmera...</p>
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div className="flex items-center gap-2 text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
              Salvando…
            </div>
          </div>
        )}
      </div>

      <div className="bg-black p-8 pb-12 flex justify-between items-center">
        <Button
          variant="outline"
          className="text-white border-white/20 hover:bg-white/10 rounded-full w-12 h-12 p-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing}
        >
          <ImageIcon className="w-5 h-5" />
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
        </Button>

        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-md animate-pulse"></div>
          <Button
            onClick={() => {
              void capture();
            }}
            className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 border-4 border-zinc-300 shadow-lg flex items-center justify-center relative z-10 p-0"
            disabled={isProcessing}
          >
            <div className="w-16 h-16 rounded-full border-2 border-black/10"></div>
          </Button>
        </div>

        <div className="w-12" />
      </div>
    </div>
  );
}
