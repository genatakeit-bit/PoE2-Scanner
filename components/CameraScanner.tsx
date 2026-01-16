
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RefreshCw, AlertCircle, ShieldAlert, Settings, Image as ImageIcon, Power, PowerOff } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (base64: string) => void;
  isProcessing: boolean;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ onCapture, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<{type: 'permission' | 'security' | 'notfound' | 'unknown', message: string} | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const startCamera = useCallback(async () => {
    setError(null);
    
    if (!window.isSecureContext) {
      setError({
        type: 'security',
        message: "Камера требует безопасного соединения (HTTPS)."
      });
      return;
    }

    try {
      const constraints = {
        video: { 
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError({
        type: 'permission',
        message: "Ошибка доступа к камере. Проверьте разрешения в браузере."
      });
    }
  }, []);

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        onCapture(base64);
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          const base64 = result.split(',')[1];
          onCapture(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="relative w-full max-w-lg mx-auto overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl min-h-[300px] flex flex-col justify-center">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
      
      {!isCameraActive && !error ? (
        <div className="p-12 text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-600">
            <Camera size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="poe-font text-xl text-zinc-100">Сканер готов</h3>
            <p className="text-zinc-500 text-sm">Нажмите кнопку ниже, чтобы активировать камеру</p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={startCamera}
              className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-amber-900/20 active:scale-95"
            >
              <Power size={20} /> ВКЛЮЧИТЬ СКАНЕР
            </button>
            <button 
              onClick={triggerFileUpload}
              className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 rounded-xl transition text-sm"
            >
              <ImageIcon size={18} /> ЗАГРУЗИТЬ СКРИНШОТ
            </button>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-zinc-950/50">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-zinc-400 text-sm mb-6">{error.message}</p>
          <button onClick={startCamera} className="w-full bg-zinc-800 py-3 rounded-xl text-zinc-200 font-bold">Попробовать снова</button>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="w-full aspect-[4/3] object-cover bg-black" />
          <canvas ref={canvasRef} className="hidden" />
          
          <button 
            onClick={stopCamera}
            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition"
          >
            <PowerOff size={18} />
          </button>

          {!isProcessing && (
            <div className="absolute inset-0 pointer-events-none border-[30px] border-black/20">
               <div className="absolute top-1/2 left-0 w-full h-[1px] bg-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" />
            </div>
          )}

          <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-6 px-6">
            <button
              onClick={triggerFileUpload}
              disabled={isProcessing}
              className="p-4 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-700 text-zinc-400 active:scale-90"
            >
              <ImageIcon size={24} />
            </button>

            <button
              onClick={captureImage}
              disabled={isProcessing}
              className={`p-6 rounded-full shadow-2xl transform active:scale-90 transition-all
                ${isProcessing ? 'bg-zinc-800' : 'bg-white hover:bg-amber-500'}
              `}
            >
              {isProcessing ? <RefreshCw size={32} className="animate-spin text-amber-500" /> : <Camera size={32} className="text-black" />}
            </button>

            <div className="w-14" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraScanner;
