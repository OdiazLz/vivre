import { lazy, useState, useEffect, useRef } from "react";
import toast from 'react-hot-toast';
import {
  Users,
  Megaphone,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  TrendingUp,
  ChevronRight,
  MoreHorizontal,
  Eye,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import ReviewModal from './components/ReviewModal';
import BroadcastNotice from './components/BroadcastNotice';
import LoginPage from './components/LoginPage';
import RecaudacionBar from './components/RecaudacionBar';
import SuspendedCondoNotice from './components/SuspendedCondoNotice';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/authContextValue';
import type { PaymentProof } from './types/domain';
import { usePayments } from './features/payments/hooks/usePayments';
import { NAVIGATION_ITEMS } from './config/navigation';
import { useCondominiumName } from './features/condominium/hooks/useCondominiumName';
import { API_BASE_URL } from './config/env';
import { SidebarLogo } from './components/branding/VivreLogo';

const ComprobantesPage = lazy(() => import('./components/ComprobantesPage'));
const IncidenciasPage = lazy(() => import('./components/IncidenciasPage'));
const ResidentesPage = lazy(() => import('./components/ResidentesPage'));
const ConfiguracionPage = lazy(() => import('./components/ConfiguracionPage'));
const MascotasPage = lazy(() => import('./components/Mascotas'));
const VisitasPage = lazy(() => import('./components/Visitas'));
const EventosPage = lazy(() => import('./components/Eventos'));
const MultasPage = lazy(() => import('./components/Multas'));
const ParkingMonitor = lazy(() => import('./components/ParkingMonitor'));
const GestionPage = lazy(() => import('./components/GestionPage'));
const BitacoraMejoras = lazy(() => import('./components/BitacoraMejoras'));
const AsambleasPage = lazy(() => import('./components/AsambleasPage'));
const SuperAdminPage = lazy(() => import('./components/SuperAdminPage'));

const BLUE = "#4f6ef7";
const PURPLE = "#7c3aed";
const GREEN = "#10b981";
const NAVY = "#162033";
const API_URL = API_BASE_URL;


function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
  const colors = [BLUE, PURPLE, GREEN, "#f59e0b", "#ec4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: size * 0.35,
        fontFamily: "Plus Jakarta Sans, sans-serif",
      }}
    >
      {initials}
    </div>
  );
}

export default function App() {
  const { isAuthenticated, user: userInfo, condominiumSuspended: condominioSuspendido, completeLogin: handleLogin, logout: handleLogout } = useAuth();
  const paymentsEnabled = isAuthenticated && Boolean(userInfo && ['ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL'].includes(userInfo.rol));
  const { payments: pagos, summary: paymentSummary, loading: fetching, reload: fetchPendingPayments, review: reviewPayment } = usePayments(userInfo?.rol,paymentsEnabled);
  const condominioNombre = useCondominiumName(isAuthenticated&&Boolean(userInfo)&&userInfo?.rol!=='SUPERADMIN'&&!condominioSuspendido);
  const [activeNav, setActiveNav] = useState("panel");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedPago, setSelectedPago] = useState<PaymentProof | null>(null);
  const [montoAprobado, setMontoAprobado] = useState("");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [loading, setLoading] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const recaudacionBarRef = useRef<{ refresh: () => void }>(null);

  useEffect(() => {
    if (!userInfo) return;
    const allowed = NAVIGATION_ITEMS.filter((item) => item.roles.includes(userInfo.rol));
    if (!allowed.some((item) => item.id === activeNav)) setActiveNav(allowed[0]?.id || 'panel');
  }, [userInfo, activeNav]);


  const handleReview = async (estatus: 'APROBADO' | 'RECHAZADO') => {
    if (!selectedPago) return;
    setLoading(true);

    try {
      const payload = estatus === 'APROBADO'
        ? { pago_id: selectedPago.pago_id, estatus, monto_aprobado: parseFloat(montoAprobado) }
        : { pago_id: selectedPago.pago_id, estatus, motivo_rechazo: motivoRechazo };

      await reviewPayment(selectedPago.pago_id, payload);

      toast.success(`Pago ${estatus.toLowerCase()} con éxito. Residente notificado por WhatsApp.`);
      setSelectedPago(null);
      setMontoAprobado('');
      setMotivoRechazo('');
      fetchPendingPayments();
      recaudacionBarRef.current?.refresh();
    } catch (error) {
      console.error('Error al revisar el pago:', error);
      toast.error('Hubo un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedPago(null);
    setMontoAprobado('');
    setMotivoRechazo('');
  };

  // Convert API data to table format
  const comprobantes = pagos.map((pago) => ({
    depto: pago.numero_depto,
    residente: pago.usuario_nombre,
    monto: pago.monto || "$510",
    fecha: new Date(pago.creado_en).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }),
    estado: pago.estatus === 'PENDIENTE_REVISION' ? 'Pendiente' : pago.estatus === 'APROBADO' ? 'Revisado' : 'Rechazado',
    pago_id: pago.pago_id,
    comprobante_url: pago.comprobante_url,
    originalPago: pago, // Keep reference to original API data
  }));

  // Calculate stats dynamically from API data
  const pendingCount = Number(paymentSummary.pendientes || 0);
  const approvedCount = Number(paymentSummary.aprobados || 0);
  const rejectedCount = Number(paymentSummary.rechazados || 0);
  const totalPagos = Number(paymentSummary.total || 0);
  
  const stats = [
    {
      label: "Total Comprobantes",
      value: totalPagos.toString(),
      sub: "Registrados",
      trend: "up" as const,
      icon: Users,
      color: BLUE,
      bg: "#eff2fe",
    },
    {
      label: "Aprobados",
      value: approvedCount.toString(),
      sub: `${totalPagos > 0 ? ((approvedCount / totalPagos) * 100).toFixed(1) : 0}% del total`,
      trend: "up" as const,
      icon: CheckCircle2,
      color: GREEN,
      bg: "#ecfdf5",
    },
    {
      label: "Pendientes",
      value: pendingCount.toString(),
      sub: "Revisión requerida",
      trend: pendingCount > 0 ? "down" as const : "up" as const,
      icon: Clock,
      color: "#f59e0b",
      bg: "#fffbeb",
    },
    {
      label: "Rechazados",
      value: rejectedCount.toString(),
      sub: "Corregir y reenviar",
      trend: "down" as const,
      icon: TrendingUp,
      color: PURPLE,
      bg: "#f5f3ff",
    },
  ];

  // Update nav badge with pending count
  const navItemsWithBadge = NAVIGATION_ITEMS.filter((item) => item.roles.includes(userInfo?.rol || 'ADMINISTRADOR')).map(item => ({
    ...item,
    badge: item.id === 'comprobantes' ? pendingCount : 0
  }));

  if (!isAuthenticated) {
    return <><LoginPage onLogin={handleLogin} /><Toaster position="top-right" /></>;
  }

  if (userInfo?.rol === 'SUPERADMIN') {
    return <><SuperAdminPage ownerName={userInfo.nombre} onLogout={handleLogout}/><Toaster position="top-right"/></>;
  }

  if (condominioSuspendido) {
    return <><SuspendedCondoNotice onLogout={handleLogout}/><Toaster position="top-right"/></>;
  }

  return (
    <div
      className="flex h-dvh max-h-dvh w-full overflow-hidden bg-background"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* ── Sidebar ───────────────────────────────────────── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-dvh max-h-dvh shrink-0 flex-col overflow-visible transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{
          width: sidebarCollapsed ? 80 : 280,
          background: NAVY,
        }}
      >
        {/* Logo */}
        <div className="relative flex shrink-0 items-center gap-3 border-b px-5 py-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <SidebarLogo collapsed={sidebarCollapsed}/>
          <button
            className="absolute -right-4 top-1/2 z-50 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-indigo-600 shadow-lg transition-all duration-200 hover:scale-110 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:ring-4 focus-visible:ring-indigo-300/50 lg:flex"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? 'Expandir menú lateral' : 'Contraer menú lateral'}
            title={sidebarCollapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={19} strokeWidth={2.5} /> : <PanelLeftClose size={19} strokeWidth={2.5} />}
          </button>
          <button
            className="ml-auto lg:hidden text-white/40 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 py-4">
          {navItemsWithBadge.map(({ icon: Icon, label, id, badge }) => {
            const isActive = activeNav === id;
            return (
              <button
                key={id}
                onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative justify-center lg:justify-start"
                style={{
                  background: isActive ? "rgba(79,110,247,0.18)" : "transparent",
                  color: isActive ? "#93a8fb" : "rgba(255,255,255,0.5)",
                  fontFamily: "Plus Jakarta Sans, sans-serif",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.8)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)";
                  }
                }}
                title={sidebarCollapsed ? label : undefined}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: BLUE }}
                  />
                )}
                <Icon size={17} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{label}</span>
                    {badge !== undefined && badge > 0 && (
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#ef4444", color: "#fff", minWidth: 20, textAlign: "center" }}
                      >
                        {badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={14} style={{ color: BLUE }} />}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: user */}
        <div className="shrink-0 border-t px-4 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 justify-center lg:justify-start mb-3">
            <Avatar name={userInfo?.nombre || "Admin Panel"} size={36} />
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-semibold truncate" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                  {userInfo?.nombre || "Administrador"}
                </div>
                <div className="truncate text-xs" title={condominioNombre} style={{ color: "rgba(255,255,255,0.4)" }}>{condominioNombre}</div>
              </div>
            )}
          </div>
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group justify-center lg:justify-start"
            style={{
              background: "rgba(239,68,68,0.1)",
              color: "#ef4444",
              fontFamily: "Plus Jakarta Sans, sans-serif",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)";
            }}
            title={sidebarCollapsed ? "Cerrar sesión" : undefined}
          >
            <X size={17} />
            {!sidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────── */}
      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header
          className="flex shrink-0 items-center gap-2 border-b bg-card px-4 py-3 sm:gap-4 sm:px-6 sm:py-4"
          style={{ borderColor: "#e5e7eb" }}
        >
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} className="text-foreground" />
          </button>

          {/* Search */}
          <div className="flex-1 relative max-w-xs hidden sm:block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar residentes, deptos..."
              className="w-full bg-muted text-sm pl-9 pr-4 py-2 rounded-xl outline-none transition-all text-foreground placeholder:text-muted-foreground"
              style={{ border: "1.5px solid transparent" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = BLUE)}
              onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {/* Enviar Comunicado */}
            {userInfo && ['ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO', 'MANTENIMIENTO'].includes(userInfo.rol) && <button
              onClick={() => setIsBroadcastOpen(true)}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${PURPLE}, #9333ea)`,
                fontFamily: "Plus Jakarta Sans, sans-serif",
                boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              }}
            >
              <Megaphone size={15} />
              <span className="hidden md:inline">Comunicado</span>
            </button>}

            {/* Actualizar */}
            <button
              onClick={() => {
                fetchPendingPayments();
                recaudacionBarRef.current?.refresh();
              }}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${GREEN}, #059669)`,
                fontFamily: "Plus Jakarta Sans, sans-serif",
                boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
              }}
            >
              <RefreshCw size={15} className={fetching ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {activeNav === 'comprobantes' ? (
            <ComprobantesPage
              pagos={pagos}
              onSelectPago={setSelectedPago}
              onRefresh={fetchPendingPayments}
              isFetching={fetching}
              role={userInfo?.rol || ''}
            />
          ) : activeNav === 'reportes' ? (
            <IncidenciasPage />
          ) : activeNav === 'mejoras' ? (
            <BitacoraMejoras />
          ) : activeNav === 'asambleas' ? (
            <AsambleasPage role={userInfo?.rol || 'ADMINISTRADOR'} />
          ) : activeNav === 'residentes' ? (
            <ResidentesPage readOnly={!['ADMINISTRADOR', 'PRESIDENTE', 'SECRETARIO'].includes(userInfo?.rol || '')} />
          ) : activeNav === 'mascotas' ? (
            <MascotasPage />
          ) : activeNav === 'visitas' ? (
            <VisitasPage />
          ) : activeNav === 'eventos' ? (
            <EventosPage />
          ) : activeNav === 'multas' ? (
            <MultasPage />
          ) : activeNav === 'estacionamiento' ? (
            <ParkingMonitor />
          ) : activeNav === 'config' ? (
            <ConfiguracionPage />
          ) : activeNav === 'gestion' ? (
            <GestionPage role={userInfo?.rol || 'ADMINISTRADOR'} />
          ) : (
            <>
              {/* Page title */}
              <div className="flex items-center justify-between">
                <div>
                  <h1
                    className="text-xl font-bold text-foreground"
                    style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                  >
                    Panel Principal
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Miércoles, 12 de junio de 2026
                  </p>
                </div>
                <div
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "#ecfdf5", color: GREEN }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }} />
                  Sistema en línea
                </div>
              </div>

          {/* Recaudación Bar */}
          <RecaudacionBar ref={recaudacionBarRef} />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="bg-card rounded-2xl p-4 sm:p-5 border transition-all duration-200 hover:-translate-y-0.5"
                  style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: s.bg }}
                    >
                      <Icon size={18} style={{ color: s.color }} />
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: s.trend === "up" ? "#ecfdf5" : "#fffbeb",
                        color: s.trend === "up" ? GREEN : "#d97706",
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {s.trend === "up" ? "↑" : "↓"}
                    </span>
                  </div>
                  <div
                    className="text-xl sm:text-2xl font-bold text-foreground leading-none mb-1"
                    style={{ fontFamily: "Plus Jakarta Sans, sans-serif", color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-xs sm:text-sm font-medium text-foreground">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
                </div>
              );
            })}
          </div>

          {/* Bottom grid: table + activity */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* Comprobantes table */}
            <div
              className="xl:col-span-2 bg-card rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              {/* Table header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                <div>
                  <h2
                    className="text-sm font-bold text-foreground"
                    style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                  >
                    Comprobantes de Pago
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                    Transferencias enviadas por WhatsApp
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "#eff6ff", color: BLUE, fontFamily: "JetBrains Mono, monospace" }}
                  >
                    {pendingCount}
                  </span>
                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Departamento", "Residente", "Monto", "Fecha", "Estado", ""].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left px-3 sm:px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap"
                            style={{ fontFamily: "Plus Jakarta Sans, sans-serif", letterSpacing: "0.06em" }}
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "#f3f4f6" }}>
                    {comprobantes.slice(0, 5).map((c, i) => (
                      <tr
                        key={i}
                        className="transition-colors hover:bg-muted/50 group"
                      >
                        <td className="px-3 sm:px-5 py-3 sm:py-3.5">
                          <span
                            className="text-xs font-bold px-2 py-1 rounded-lg"
                            style={{
                              background: "#eff2fe",
                              color: BLUE,
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {c.depto}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={c.residente} size={28} />
                            <span className="text-sm font-medium text-foreground">{c.residente}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-3.5">
                          <span
                            className="text-sm font-bold"
                            style={{ color: GREEN, fontFamily: "JetBrains Mono, monospace" }}
                          >
                            {c.monto}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                          {c.fecha}
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-3.5">
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full"
                            style={{
                              background:
                                c.estado === "Revisado" ? "#ecfdf5" : "#fffbeb",
                              color:
                                c.estado === "Revisado" ? GREEN : "#d97706",
                            }}
                          >
                            {c.estado}
                          </span>
                        </td>
                        <td className="px-3 sm:px-5 py-3 sm:py-3.5">
                          <button
                            onClick={() => setSelectedPago(c.originalPago)}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                            style={{ background: "#eff2fe", color: BLUE }}
                          >
                            <Eye size={12} />
                            <span className="hidden sm:inline">Ver</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div
                className="flex items-center justify-between px-4 sm:px-6 py-3 border-t"
                style={{ borderColor: "#f3f4f6" }}
              >
                <p className="text-xs text-muted-foreground">
                  Mostrando {Math.min(5, comprobantes.length)} de {comprobantes.length} comprobantes
                </p>
                <button
                  onClick={() => setActiveNav('comprobantes')}
                  className="text-xs font-semibold transition-opacity hover:opacity-70"
                  style={{ color: BLUE }}
                >
                  Ver todos →
                </button>
              </div>
            </div>

            {/* Activity feed */}
            <div
              className="bg-card rounded-2xl border overflow-hidden"
              style={{ borderColor: "#e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
            >
              <div className="px-4 sm:px-5 py-3 sm:py-4 border-b" style={{ borderColor: "#f3f4f6" }}>
                <h2
                  className="text-sm font-bold text-foreground"
                  style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  Acciones Rápidas
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                  Acciones frecuentes del sistema
                </p>
              </div>

              <div className="p-3 sm:p-4">
                <div className="space-y-2">
                  {[
                    { label: "Ver Comprobantes", color: BLUE, bg: "#eff2fe", nav: 'comprobantes' },
                    { label: "Crear Comunicado", color: PURPLE, bg: "#f5f3ff", action: () => setIsBroadcastOpen(true) },
                    { label: "Ver Reportes", color: GREEN, bg: "#ecfdf5", nav: 'reportes' },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={() => action.nav ? setActiveNav(action.nav) : action.action?.()}
                      className="w-full text-left text-xs font-semibold px-3 py-2 rounded-lg transition-all hover:scale-[1.01] active:scale-95"
                      style={{
                        background: action.bg,
                        color: action.color,
                        fontFamily: "Plus Jakarta Sans, sans-serif",
                      }}
                    >
                      {action.label} →
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <ReviewModal
        selectedPago={selectedPago}
        onClose={handleCloseModal}
        montoAprobado={montoAprobado}
        onMontoChange={setMontoAprobado}
        motivoRechazo={motivoRechazo}
        onMotivoChange={setMotivoRechazo}
        loading={loading}
        onReview={handleReview}
        API_URL={API_URL}
      />
      <BroadcastNotice
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
      />
      <Toaster position="top-right" />
    </div>
  );
}
