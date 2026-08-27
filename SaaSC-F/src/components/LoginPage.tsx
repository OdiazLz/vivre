import { useState } from 'react';
import axios from 'axios';
import { authApi } from '../features/auth/api/authApi';
import toast from 'react-hot-toast';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { VivreLogo } from './branding/VivreLogo';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [logoPreview, setLogoPreview] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecciona un archivo de imagen válido');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.email.trim() || !formData.password) {
      setLoginError('Completa tu correo y contraseña.');
      toast.error('Completa tu correo y contraseña');
      return;
    }

    setLoading(true);
    setLoginError('');
    try {
      const response = await authApi.login(formData.email.trim().toLowerCase(), formData.password);

      if (!response.data.token) {
        toast.error('No fue posible iniciar sesión');
        return;
      }

      const storage = rememberSession ? localStorage : sessionStorage;
      localStorage.removeItem('saas_token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('saas_token');
      sessionStorage.removeItem('user');
      storage.setItem('saas_token', response.data.token);
      storage.setItem('user', JSON.stringify(response.data.user));
      toast.success('Bienvenido a Vivre');
      onLogin();
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.error || 'No pudimos validar tus credenciales'
        : 'Ocurrió un error inesperado';
      setLoginError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-white">
      <div className="grid min-h-screen w-full bg-white lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden bg-[#111936] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
              maskImage: 'linear-gradient(to bottom right, black, transparent 75%)',
            }}
          />
          <div className="absolute -right-36 top-16 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

          <VivreLogo inverse className="relative z-10"/>

          <div className="relative z-10 max-w-xl py-16">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-400/10 px-3.5 py-2 text-xs font-semibold text-indigo-100 backdrop-blur">
              <Sparkles size={14} />
              Administración simple, comunidad conectada
            </div>
            <h1 className="max-w-lg text-4xl font-bold leading-[1.12] tracking-[-0.035em] text-white xl:text-5xl">
              Todo tu condominio, bajo control.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300 xl:text-lg">
              Gestiona pagos, accesos, residentes e incidencias desde un espacio seguro y diseñado para trabajar mejor.
            </p>

            <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
              {[
                'Operación centralizada',
                'Acceso protegido',
                'Alertas en tiempo real',
                'Control administrativo',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5 text-sm text-slate-200">
                  <CheckCircle2 size={17} className="shrink-0 text-emerald-400" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-400">
            <span>© 2026 Vivre</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Conexión segura</span>
          </div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
          <div className="w-full max-w-md">
            <div className="mb-9 flex items-center justify-between lg:hidden">
              <VivreLogo/>
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <ShieldCheck size={15} /> Seguro
              </div>
            </div>

            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-indigo-600">Panel administrativo</p>
                <h2 className="text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.15rem]">Bienvenido de nuevo</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Ingresa tus credenciales para continuar.</p>
              </div>

              <label
                htmlFor="logo-upload"
                className="group relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                title="Personalizar logotipo"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logotipo del condominio" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={21} />
                )}
                <span className="absolute inset-x-0 bottom-0 translate-y-full bg-slate-950/75 py-1 text-center text-[8px] font-bold uppercase tracking-wide text-white transition group-hover:translate-y-0">
                  Editar
                </span>
                <input id="logo-upload" type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
              </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">Correo electrónico</label>
                <div className="group relative">
                  <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-600" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={(event) => { setFormData({ ...formData, email: event.target.value }); setLoginError(''); }}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="admin@condominio.mx"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label htmlFor="login-password" className="text-sm font-semibold text-slate-700">Contraseña</label>
                  <span className="text-xs text-slate-400">Acceso de administrador</span>
                </div>
                <div className="group relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-600" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={(event) => { setFormData({ ...formData, password: event.target.value }); setLoginError(''); }}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                    placeholder="Ingresa tu contraseña"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {loginError && <div role="alert" aria-live="assertive" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{loginError}</div>}

              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(event) => setRememberSession(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                  disabled={loading}
                />
                Mantener mi sesión iniciada
              </label>

              <button
                type="submit"
                disabled={loading}
                className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-600/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    Validando acceso...
                  </>
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck size={15} className="text-emerald-500" />
                Tus datos se transmiten de forma segura
              </div>
              <nav className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2" aria-label="Información legal">
                <a className="transition hover:text-indigo-600" href="/privacidad">Privacidad</a>
                <a className="transition hover:text-indigo-600" href="/terminos">Términos</a>
                <a className="transition hover:text-indigo-600" href="/eliminar-datos">Eliminar mis datos</a>
              </nav>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
