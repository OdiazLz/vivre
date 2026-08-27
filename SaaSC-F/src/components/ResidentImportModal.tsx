import { useMemo, useRef, useState } from 'react';
import { readSheet } from 'read-excel-file/browser';
import { AlertCircle, Bell, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { residentsApi } from '../features/residents/api/residentsApi';

interface ExistingResident { telefono_whatsapp: string }
interface ImportRow {
  fila: number;
  nombre: string;
  numero_depto: string;
  telefono_whatsapp: string;
  errores: string[];
}

const normalizeHeader = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const localPhone = (value: unknown) => {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.startsWith('521') && digits.length === 13) digits = digits.slice(3);
  else if (digits.startsWith('52') && digits.length === 12) digits = digits.slice(2);
  return digits;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if ((char === ',' || char === ';') && !quoted) { cells.push(value.trim()); value = ''; }
    else value += char;
  }
  cells.push(value.trim());
  return cells;
}

async function readRows(file: File): Promise<unknown[][]> {
  if (file.name.toLowerCase().endsWith('.xlsx')) return readSheet(file);
  const text = (await file.text()).replace(/^\uFEFF/, '');
  return text.split(/\r?\n/).filter((line) => line.trim()).map(parseCsvLine);
}

export default function ResidentImportModal({ isOpen, onClose, onImported, existingResidents }: {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  existingResidents: ExistingResident[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filename, setFilename] = useState('');
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notify, setNotify] = useState(true);

  const validRows = useMemo(() => rows.filter((row) => row.errores.length === 0), [rows]);
  const invalidRows = rows.length - validRows.length;

  const downloadTemplate = () => {
    const csv = '\uFEFFDepartamento,Nombre completo,Telefono\r\nA-101,Juan Pérez López,6647894512\r\nA-101,María Pérez López,6641234567\r\nA-102,Roberto García,6649876543\r\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'plantilla-residentes.csv'; anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|csv)$/i.test(file.name)) { toast.error('Selecciona un archivo .xlsx o .csv.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('El archivo no debe superar 5 MB.'); return; }
    setReading(true);
    try {
      const matrix = await readRows(file);
      if (matrix.length < 2) throw new Error('El archivo no contiene residentes.');
      const headers = matrix[0].map(normalizeHeader);
      const departmentIndex = headers.findIndex((header) => ['departamento', 'depto', 'numerodepto'].includes(header));
      const nameIndex = headers.findIndex((header) => ['nombre', 'nombrecompleto', 'residente'].includes(header));
      const phoneIndex = headers.findIndex((header) => ['telefono', 'telefonowhatsapp', 'whatsapp', 'celular'].includes(header));
      if ([departmentIndex, nameIndex, phoneIndex].some((index) => index < 0)) throw new Error('Las columnas deben llamarse Departamento, Nombre completo y Teléfono.');

      const existingPhones = new Set(existingResidents.map((resident) => localPhone(resident.telefono_whatsapp)));
      const filePhones = new Set<string>();
      const parsed = matrix.slice(1, 501).map((cells, index) => {
        const nombre = String(cells[nameIndex] ?? '').trim().replace(/\s+/g, ' ');
        const numero_depto = String(cells[departmentIndex] ?? '').trim().replace(/\s+/g, ' ');
        const telefono_whatsapp = localPhone(cells[phoneIndex]);
        const errores: string[] = [];
        if (nombre.length < 3) errores.push('Nombre incompleto');
        if (!numero_depto) errores.push('Falta departamento');
        if (!/^\d{10}$/.test(telefono_whatsapp)) errores.push('Teléfono inválido');
        if (filePhones.has(telefono_whatsapp)) errores.push('Teléfono repetido en el archivo');
        if (existingPhones.has(telefono_whatsapp)) errores.push('Teléfono ya registrado');
        if (telefono_whatsapp) filePhones.add(telefono_whatsapp);
        return { fila: index + 2, nombre, numero_depto, telefono_whatsapp, errores };
      }).filter((row) => row.nombre || row.numero_depto || row.telefono_whatsapp);
      if (!parsed.length) throw new Error('El archivo no contiene filas con información.');
      setRows(parsed); setFilename(file.name);
      if (matrix.length > 501) toast('Sólo se muestran las primeras 500 filas.', { icon: 'ℹ️' });
    } catch (error) {
      setRows([]); setFilename('');
      toast.error(error instanceof Error ? error.message : 'No se pudo leer el archivo.');
    } finally { setReading(false); }
  };

  const handleImport = async () => {
    if (!validRows.length) return;
    setImporting(true);
    try {
      const response = await residentsApi.importMany(validRows.map(({ fila, nombre, numero_depto, telefono_whatsapp }) => ({ fila, nombre, numero_depto, telefono_whatsapp })), notify);
      toast.success(`${response.creados} residentes registrados${response.omitidos ? `; ${response.omitidos} omitidos` : ''}.`);
      onImported(); onClose(); setRows([]); setFilename('');
    } catch (error: unknown) {
      toast.error(axios.isAxiosError(error) ? error.response?.data?.error || 'No se pudo completar la importación.' : 'No se pudo completar la importación.');
    } finally { setImporting(false); }
  };

  if (!isOpen) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && !importing && onClose()}>
    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
      <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex gap-3"><div className="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><FileSpreadsheet size={24}/></div><div><h2 className="text-xl font-bold text-slate-900">Importar residentes desde Excel</h2><p className="mt-1 text-sm text-slate-500">Una fila por persona. Varios residentes pueden compartir departamento.</p></div></div>
        <button onClick={onClose} disabled={importing} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button>
      </div>

      <div className="overflow-y-auto p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={reading || importing} className="flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 p-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50">
            {reading ? <Loader2 className="mb-2 animate-spin text-indigo-600"/> : <Upload className="mb-2 text-indigo-600"/>}<b className="text-sm text-slate-800">{filename || 'Seleccionar archivo .xlsx o .csv'}</b><span className="mt-1 text-xs text-slate-500">Máximo 500 residentes y 5 MB</span>
          </button>
          <button type="button" onClick={downloadTemplate} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download size={17}/>Descargar plantilla</button>
          <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(event) => { void handleFile(event.target.files?.[0]); event.currentTarget.value = ''; }}/>
        </div>

        {!!rows.length && <>
          <div className="my-5 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Filas leídas</p><b className="text-xl text-slate-900">{rows.length}</b></div><div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs text-emerald-700">Listos</p><b className="text-xl text-emerald-700">{validRows.length}</b></div><div className="rounded-2xl bg-rose-50 p-4"><p className="text-xs text-rose-700">Por corregir</p><b className="text-xl text-rose-700">{invalidRows}</b></div></div>
          <div className="max-h-80 overflow-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">Fila</th><th>Departamento</th><th>Nombre</th><th>Teléfono</th><th>Validación</th></tr></thead><tbody>{rows.map((row) => <tr key={row.fila} className="border-t border-slate-100"><td className="p-3 text-slate-400">{row.fila}</td><td>{row.numero_depto || '—'}</td><td>{row.nombre || '—'}</td><td>{row.telefono_whatsapp || '—'}</td><td>{row.errores.length ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><AlertCircle size={14}/>{row.errores.join(', ')}</span> : <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><CheckCircle2 size={14}/>Lista para importar</span>}</td></tr>)}</tbody></table></div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-emerald-50 p-4"><input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600"/><Bell className="mt-0.5 shrink-0 text-emerald-600" size={18}/><span className="text-sm text-emerald-900"><b>Enviar bienvenida por WhatsApp</b><br/><span className="text-emerald-700">Cada residente recibirá instrucciones para escribir “Menú”.</span></span></label>
        </>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4"><p className="text-xs text-slate-500">Las filas con errores no se enviarán. Puedes corregirlas en Excel y cargar nuevamente.</p><div className="flex gap-2"><button onClick={onClose} disabled={importing} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold">Cancelar</button><button onClick={() => void handleImport()} disabled={!validRows.length || importing} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{importing && <Loader2 size={16} className="animate-spin"/>}Importar {validRows.length || ''} residentes</button></div></div>
    </div>
  </div>;
}
