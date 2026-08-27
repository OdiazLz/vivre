import { useEffect, useRef, useState } from 'react';
import { FileImage, UploadCloud, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FileDropzone({ file, onChange, accept = 'image/jpeg,image/png,image/webp', maxMb = 8, label = 'Arrastra una imagen aquí' }: {
  file: File | null; onChange: (file: File | null) => void; accept?: string; maxMb?: number; label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState('');
  const formats = accept.includes('application/pdf') ? 'JPG, PNG, WEBP o PDF' : 'JPG, PNG o WEBP';
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setPreview(''); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const select = (candidate?: File) => {
    if (!candidate) return;
    if (!accept.split(',').includes(candidate.type)) { toast.error('Formato de archivo no permitido.'); return; }
    if (candidate.size > maxMb * 1024 * 1024) { toast.error(`El archivo no debe superar ${maxMb} MB.`); return; }
    onChange(candidate);
  };
  return <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); select(event.dataTransfer.files[0]); }} onClick={() => !file && input.current?.click()} className={`relative flex min-h-36 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50 hover:border-indigo-300'}`}>
    {preview ? <img src={preview} alt="Vista previa" className="absolute inset-0 h-full w-full object-cover"/> : <div><UploadCloud className="mx-auto mb-2 text-indigo-500"/><b className="text-sm text-slate-700">{label}</b><p className="mt-1 text-xs text-slate-500">{formats} · máximo {maxMb} MB</p></div>}
    {file && <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-xl bg-slate-950/75 px-3 py-2 text-xs text-white backdrop-blur"><span className="flex min-w-0 items-center gap-2 truncate"><FileImage size={14}/>{file.name}</span><button type="button" onClick={(event) => { event.stopPropagation(); onChange(null); }} className="rounded-lg p-1 hover:bg-white/20"><X size={14}/></button></div>}
    <input ref={input} type="file" accept={accept} className="hidden" onChange={(event) => { select(event.target.files?.[0]); event.currentTarget.value=''; }}/>
  </div>;
}
