"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, AlertCircle, Sliders, Link as LinkIcon, Link2Off, X, RotateCcw, Languages, ShieldCheck, Layers, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import { translations } from '@/lib/language';
import JSZip from 'jszip';

type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/svg+xml';
type Language = 'th' | 'en';

interface PixFile {
  id: string;
  original: HTMLImageElement;
  name: string;
  ratio: number;
  w: number;
  h: number;
}

export default function PixApp() {
  const [pixFiles, setPixFiles] = useState<PixFile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  // Settings
  const [enableResize, setEnableResize] = useState(true); // เปิด/ปิดการ Resize
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [lockAspect, setLockAspect] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = translations[language];

  const resetFineTune = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let files: File[] = [];
    if ('files' in e.target && e.target.files) files = Array.from(e.target.files);
    else if ('dataTransfer' in e && e.dataTransfer.files) {
      e.preventDefault();
      files = Array.from(e.dataTransfer.files);
    }

    if (files.length === 0) return;
    setError(null);
    setIsProcessing(true);

    try {
      const newPixFiles = await Promise.all(files.map(async (file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        let blob: Blob = file;

        if (ext === 'heic' || ext === 'heif') {
          const heic2any = (await import('heic2any')).default;
          const converted = await heic2any({ blob: file, toType: 'image/jpeg' });
          blob = Array.isArray(converted) ? converted[0] : converted;
        }

        return new Promise<PixFile>((resolve) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: Math.random().toString(36).substr(2, 9),
              original: img,
              name: file.name,
              ratio: img.width / img.height,
              w: img.width,
              h: img.height
            });
          };
          img.src = URL.createObjectURL(blob);
        });
      }));

      setPixFiles(prev => [...prev, ...newPixFiles]);
      if (pixFiles.length === 0) {
        setTargetWidth(newPixFiles[0].w);
        setTargetHeight(newPixFiles[0].h);
      }
      setIsProcessing(false);
    } catch (err) {
      setError(language === "th" ? "เกิดข้อผิดพลาดในการโหลดไฟล์" : "Error loading files.");
      setIsProcessing(false);
    }
  };

  const drawPreview = useCallback(() => {
    if (pixFiles.length === 0 || !canvasRef.current) return;
    const current = pixFiles[selectedIndex];
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ถ้าปิด Resize ให้ใช้ขนาดเดิมของรูปนั้นๆ
    const w = enableResize ? targetWidth : current.w;
    const h = enableResize ? targetHeight : current.h;

    canvas.width = w;
    canvas.height = h;
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    ctx.drawImage(current.original, 0, 0, w, h);
  }, [pixFiles, selectedIndex, targetWidth, targetHeight, brightness, contrast, saturation, enableResize]);

  useEffect(() => {
    if (pixFiles.length > 0) {
      const frame = requestAnimationFrame(drawPreview);
      return () => cancelAnimationFrame(frame);
    }
  }, [drawPreview, pixFiles]);

  const handleDownloadZip = async () => {
    if (pixFiles.length === 0) return;
    setIsProcessing(true);
    const zip = new JSZip();
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d');

    for (const file of pixFiles) {
      const w = enableResize ? targetWidth : file.w;
      const h = enableResize ? targetHeight : file.h;

      tempCanvas.width = w;
      tempCanvas.height = h;
      if (ctx) {
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(file.original, 0, 0, w, h);

        let dataUrl = "";
        if (format === 'image/svg+xml') {
          const base64 = tempCanvas.toDataURL('image/png');
          dataUrl = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image width="100%" height="100%" href="${base64}"/></svg>`)}`;
        } else {
          dataUrl = tempCanvas.toDataURL(format, 0.92);
        }

        const base64Data = dataUrl.split(',')[1];
        const fileName = file.name.split('.')[0] + `.${format.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg')}`;
        zip.file(fileName, base64Data, { base64: true });
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `pix-batch-${Date.now()}.zip`;
    link.click();
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-[9px] font-bold text-green-500 tracking-wider">
          <ShieldCheck size={14} /> {t.privacyNotice}
        </div>
        <button onClick={() => setLanguage(language === 'en' ? 'th' : 'en')} className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-full border border-zinc-800 text-[10px] font-black hover:bg-zinc-800 transition-all uppercase tracking-widest">
          <Languages size={14} /> {language === 'en' ? 'ไทย' : 'English'}
        </button>
      </div>

      <header className="max-w-6xl mx-auto mb-16 text-center font-black">
        <h1 className="gist-font text-6xl font-black tracking-tighter bg-linear-to-b from-white to-zinc-500 bg-clip-text text-transparent">pix</h1>
        <p className="text-zinc-500 mt-2 font-medium tracking-[0.3em] uppercase text-[10px]">{t.subtitle}</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-6">
          {pixFiles.length === 0 ? (
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileUpload} className="border-2 border-dashed border-zinc-800 rounded-[2.5rem] aspect-video flex flex-col items-center justify-center hover:border-zinc-500 bg-zinc-900/20 transition-all cursor-pointer group relative">
              <div className="p-4 bg-zinc-900 rounded-full mb-4 group-hover:scale-110 transition-transform"><Upload className="w-8 h-8 text-zinc-500" /></div>
              <p className="text-zinc-500 text-sm font-medium">{t.dropText} <span className="text-white underline">{t.browse}</span></p>
              <input type="file" multiple className="hidden" onChange={handleFileUpload} id="upload" />
              <label htmlFor="upload" className="absolute inset-0 cursor-pointer" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-zinc-900/40 p-3 rounded-4xl border border-zinc-800">
                <div className="flex justify-between items-center mb-3 px-4">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">{pixFiles[selectedIndex].name} ({selectedIndex + 1}/{pixFiles.length})</span>
                  <button onClick={() => {
                    const next = pixFiles.filter((_, i) => i !== selectedIndex);
                    setPixFiles(next);
                    if (selectedIndex >= next.length) setSelectedIndex(Math.max(0, next.length - 1));
                  }} className="text-[10px] font-bold text-red-500/80 hover:text-red-400 flex items-center gap-1 transition-colors"><X size={12} /> {t.remove}</button>
                </div>
                <div className="rounded-2xl overflow-hidden bg-checkerboard flex justify-center items-center min-h-[400px] shadow-inner relative">
                  <canvas ref={canvasRef} className="max-w-full h-auto shadow-2xl transition-all" />
                  {isProcessing && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center"><RefreshCw className="animate-spin text-white w-8 h-8" /></div>}
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {pixFiles.map((file, idx) => (
                  <button key={file.id} onClick={() => setSelectedIndex(idx)} className={`min-w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${idx === selectedIndex ? 'border-white scale-105' : 'border-transparent opacity-50'}`}>
                    <img src={file.original.src} className="w-full h-full object-cover" alt="thumb" />
                  </button>
                ))}
                <label className="min-w-20 h-20 rounded-xl border-2 border-dashed border-zinc-800 flex items-center justify-center cursor-pointer hover:bg-zinc-900 transition-all">
                  <Upload size={20} className="text-zinc-600" />
                  <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className={`lg:col-span-4 space-y-6 ${pixFiles.length === 0 ? 'opacity-20 pointer-events-none' : ''}`}>
          <div className="bg-zinc-900 p-8 rounded-4xl border border-zinc-800 space-y-10 shadow-2xl">
            {/* DIMENSIONS + TOGGLE */}
            <section>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <button onClick={() => setEnableResize(!enableResize)} className="text-zinc-400 hover:text-white transition-colors">
                    {enableResize ? <ToggleRight className="text-green-500" size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2"><Sliders size={12} /> {t.dimensions}</h3>
                </div>
                <button disabled={!enableResize} onClick={() => setLockAspect(!lockAspect)} className={`p-2 rounded-lg transition-all ${!enableResize ? 'opacity-20' : lockAspect ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                  {lockAspect ? <LinkIcon size={14} /> : <Link2Off size={14} />}
                </button>
              </div>

              <div className={`grid grid-cols-2 gap-4 transition-opacity ${!enableResize ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-600 font-bold ml-1 uppercase">{t.width}</p>
                  <input type="number" value={enableResize ? targetWidth : pixFiles[selectedIndex]?.w} onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setTargetWidth(val);
                    if (lockAspect) setTargetHeight(Math.round(val / pixFiles[selectedIndex].ratio));
                  }} className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-white" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-zinc-600 font-bold ml-1 uppercase">{t.height}</p>
                  <input type="number" value={enableResize ? targetHeight : pixFiles[selectedIndex]?.h} onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setTargetHeight(val);
                    if (lockAspect) setTargetWidth(Math.round(val * pixFiles[selectedIndex].ratio));
                  }} className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-sm focus:outline-none focus:border-white" />
                </div>
              </div>
            </section>

            {/* FINE TUNE */}
            <section className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2"><Layers size={12} /> {t.fineTune}</h3>
                <button onClick={resetFineTune} className="text-[10px] font-bold text-zinc-500 hover:text-white flex items-center gap-1 transition-colors"><RotateCcw size={12} /> {t.reset}</button>
              </div>
              {[
                { label: t.brightness, val: brightness, set: setBrightness },
                { label: t.contrast, val: contrast, set: setContrast },
                { label: t.saturation, val: saturation, set: setSaturation },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] font-bold mb-3 uppercase tracking-tighter">
                    <span className="text-zinc-500">{item.label}</span>
                    <span className="text-white">{item.val}%</span>
                  </div>
                  <input type="range" min="0" max="200" value={item.val} onChange={(e) => item.set(parseInt(e.target.value))} className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white transition-all" />
                </div>
              ))}
            </section>

            {/* EXPORT FORMATS */}
            <section className="space-y-4 pt-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{t.exportFormat}</h3>
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 rounded-xl border border-zinc-800">
                {(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'] as OutputFormat[]).map((f) => (
                  <button key={f} onClick={() => setFormat(f)} className={`py-2 rounded-lg text-[9px] font-black transition-all ${format === f ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
                    {f.split('/')[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg').toUpperCase()}
                  </button>
                ))}
              </div>
              <button onClick={handleDownloadZip} disabled={isProcessing} className="w-full py-5 bg-white text-black rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 shadow-xl uppercase mt-4 disabled:opacity-50">
                {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
                {pixFiles.length > 1 ? `${t.download} (ZIP)` : t.download}
              </button>
            </section>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-zinc-900 text-center text-[10px] text-zinc-600 font-bold tracking-[0.4em] uppercase">{t.footer}</footer>

      <style jsx global>{`
        .bg-checkerboard { background-image: linear-gradient(45deg, #0d0d0d 25%, transparent 25%), linear-gradient(-45deg, #0d0d0d 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #0d0d0d 75%), linear-gradient(-45deg, transparent 75%, #0d0d0d 75%); background-size: 24px 24px; background-position: 0 0, 0 12px, 12px -12px, -12px 0px; background-color: #050505; }
        input[type='range']::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: white; border-radius: 50%; cursor: pointer; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}