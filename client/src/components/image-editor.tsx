import React, { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Check, X, RotateCcw, Crop, Wand2, ArrowLeft } from "lucide-react";
import { getCroppedImg } from "@/lib/utils";

type ImageEditorProps = {
  imageSrc: string;
  onSave: (processedImage: string) => void;
  onCancel: () => void;
};

type FilterType = 'normal' | 'grayscale' | 'contrast' | 'bw';

export default function ImageEditor({ imageSrc, onSave, onCancel }: ImageEditorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('normal');
  const [mode, setMode] = useState<'crop' | 'filter'>('crop');

  const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    try {
      if (croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, activeFilter);
        if (croppedImage) {
            onSave(croppedImage);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filters: {id: FilterType, label: string, css: string}[] = [
      { id: 'normal', label: 'Normal', css: '' },
      { id: 'grayscale', label: 'P&B', css: 'grayscale(100%)' },
      { id: 'bw', label: 'Docs', css: 'grayscale(100%) contrast(150%) brightness(110%)' }, // High contrast document mode
      { id: 'contrast', label: 'Cor+', css: 'contrast(125%) saturate(110%)' },
  ];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
       {/* Toolbar */}
       <div className="bg-zinc-900 text-white p-4 flex justify-between items-center z-10">
         <Button variant="ghost" onClick={onCancel} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 mr-2" /> Cancelar
         </Button>
         <h2 className="font-medium text-sm uppercase tracking-wide">Editar</h2>
         <Button onClick={handleSave} className="bg-primary hover:bg-red-600 text-white rounded-none font-bold">
            Salvar <Check className="w-4 h-4 ml-2" />
         </Button>
       </div>

       {/* Editor Area */}
       <div className="relative flex-1 bg-zinc-800 w-full overflow-hidden">
          {mode === 'crop' ? (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={undefined} // Free crop
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                classes={{
                    containerClassName: "bg-zinc-900"
                }}
              />
          ) : (
             <div className="w-full h-full flex items-center justify-center bg-zinc-900 p-4">
                 <img 
                    src={imageSrc} 
                    className="max-w-full max-h-full shadow-2xl transition-all duration-300"
                    style={{ 
                        filter: filters.find(f => f.id === activeFilter)?.css,
                        transform: `rotate(${rotation}deg)` // Preview rotation roughly
                    }} 
                 />
             </div>
          )}
       </div>

       {/* Controls */}
       <div className="bg-zinc-900 p-4 pb-8 space-y-4">
         
         {/* Mode Switcher */}
         <div className="flex justify-center mb-4 border-b border-white/10 pb-4">
            <Button 
                variant="ghost" 
                onClick={() => setMode('crop')}
                className={`text-white hover:bg-white/5 ${mode === 'crop' ? 'bg-white/10' : ''}`}
            >
                <Crop className="w-4 h-4 mr-2" /> Recortar
            </Button>
            <Button 
                variant="ghost" 
                onClick={() => setMode('filter')}
                className={`text-white hover:bg-white/5 ${mode === 'filter' ? 'bg-white/10' : ''}`}
            >
                <Wand2 className="w-4 h-4 mr-2" /> Filtros
            </Button>
         </div>

         {mode === 'crop' && (
             <div className="space-y-4 px-4">
                 <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-400 w-12">Zoom</span>
                    <Slider 
                        value={[zoom]} 
                        min={1} 
                        max={3} 
                        step={0.1} 
                        onValueChange={(v) => setZoom(v[0])} 
                        className="flex-1"
                    />
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-xs text-zinc-400 w-12">Girar</span>
                    <Slider 
                        value={[rotation]} 
                        min={0} 
                        max={360} 
                        step={90} 
                        onValueChange={(v) => setRotation(v[0])} 
                        className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => setRotation(r => r + 90)}>
                         <RotateCcw className="w-4 h-4 text-zinc-400" />
                    </Button>
                 </div>
             </div>
         )}

         {mode === 'filter' && (
             <div className="grid grid-cols-4 gap-2 px-2">
                 {filters.map(f => (
                     <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={`flex flex-col items-center gap-2 p-2 rounded transition-colors ${activeFilter === f.id ? 'bg-primary text-white' : 'text-zinc-400 hover:bg-white/5'}`}
                     >
                         <div 
                            className="w-8 h-8 rounded-full border border-white/20 bg-zinc-800"
                            style={{ filter: f.css }}
                         ></div>
                         <span className="text-xs font-medium">{f.label}</span>
                     </button>
                 ))}
             </div>
         )}
       </div>
    </div>
  );
}
