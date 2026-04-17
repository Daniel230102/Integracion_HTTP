/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Settings, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Database, 
  ShieldCheck, 
  Search, 
  RefreshCcw,
  BarChart3,
  Server,
  Key,
  ChevronRight,
  ExternalLink,
  LogOut,
  Bell,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

type StatusType = 200 | 401 | 429 | 500 | 403;

interface LogEntry {
  id: string;
  traceId: string;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  status: StatusType;
  strategy: 'None' | 'Backoff Exponencial' | 'Sin Reintento (Refresh)';
  retries: string;
  latency: number;
  alertSent: boolean;
}

interface Config {
  endpoint: string;
  authType: string;
  maxRetries: number;
  timeout: number;
}

// --- Constants ---

const INITIAL_LOGS: LogEntry[] = [
  {
    id: '1',
    traceId: 'TRACE-20260417-112233',
    timestamp: '2026-04-17T11:22:33Z',
    method: 'POST',
    endpoint: '/v1/tickets',
    status: 200,
    strategy: 'None',
    retries: '0/3',
    latency: 142,
    alertSent: false,
  },
  {
    id: '2',
    traceId: 'TRACE-20260417-112234',
    timestamp: '2026-04-17T11:23:05Z',
    method: 'POST',
    endpoint: '/v1/tickets',
    status: 401,
    strategy: 'Sin Reintento (Refresh)',
    retries: '1/3',
    latency: 89,
    alertSent: false,
  },
  {
    id: '3',
    traceId: 'TRACE-20260417-112235',
    timestamp: '2026-04-17T11:24:12Z',
    method: 'GET',
    endpoint: '/v1/tickets/8072',
    status: 429,
    strategy: 'Backoff Exponencial',
    retries: '2/3',
    latency: 210,
    alertSent: false,
  },
  {
    id: '4',
    traceId: 'TRACE-20260417-112236',
    timestamp: '2026-04-17T11:25:00Z',
    method: 'POST',
    endpoint: '/v1/tickets',
    status: 500,
    strategy: 'Backoff Exponencial',
    retries: '3/3',
    latency: 1540,
    alertSent: true,
  }
];

// --- Components ---

const StatusBadge = ({ status }: { status: StatusType }) => {
  const config = {
    200: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', label: '200 OK' },
    401: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', label: '401 Unauthorized' },
    403: { color: 'bg-rose-500/10 text-rose-500 border-rose-500/20', label: '403 Forbidden' },
    429: { color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', label: '429 Rate Limit' },
    500: { color: 'bg-red-500/10 text-red-500 border-red-500/20', label: '500 Server Error' },
  };

  const { color, label } = config[status] || { color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', label: status };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}>
      {label}
    </span>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'config' | 'alerts'>('monitor');
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [config, setConfig] = useState<Config>({
    endpoint: 'https://api.tickets-premium.enterprise.com/v1',
    authType: 'Bearer Token',
    maxRetries: 3,
    timeout: 15000
  });

  // --- Actions ---
  const triggerManualRequest = () => {
    const statuses: StatusType[] = [200, 200, 401, 429, 500];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const newLog: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      traceId: `MANUAL-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8)}-${Math.floor(Math.random() * 1000000)}`,
      timestamp: new Date().toISOString(),
      method: 'POST',
      endpoint: '/v1/tickets/manual',
      status: randomStatus,
      strategy: randomStatus === 200 ? 'None' : (randomStatus === 401 ? 'Sin Reintento (Refresh)' : 'Backoff Exponencial'),
      retries: randomStatus === 200 ? '0/' + config.maxRetries : `${Math.floor(Math.random() * config.maxRetries) + 1}/${config.maxRetries}`,
      latency: Math.floor(Math.random() * 200) + 30,
      alertSent: randomStatus === 500,
    };

    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const resolveAlert = (id: string) => {
    setLogs(prev => prev.map(log => 
      log.id === id ? { ...log, alertSent: false } : log
    ));
  };

  const handleSaveConfig = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };
  const stats = useMemo(() => {
    const success = logs.filter(l => l.status === 200).length;
    const rate = logs.length > 0 ? (success / logs.length) * 100 : 0;
    const alerts = logs.filter(l => l.alertSent).length;
    return { success, rate, alerts, total: logs.length };
  }, [logs]);

  // --- Simulation Logic ---
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      const statuses: StatusType[] = [200, 200, 200, 401, 429, 500];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        traceId: `TRACE-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 8)}-${Math.floor(Math.random() * 1000000)}`,
        timestamp: new Date().toISOString(),
        method: Math.random() > 0.3 ? 'POST' : 'GET',
        endpoint: '/v1/tickets',
        status: randomStatus,
        strategy: randomStatus === 200 ? 'None' : (randomStatus === 401 ? 'Sin Reintento (Refresh)' : 'Backoff Exponencial'),
        retries: randomStatus === 200 ? '0/' + config.maxRetries : `${Math.floor(Math.random() * config.maxRetries)}/${config.maxRetries}`,
        latency: Math.floor(Math.random() * 400) + 50,
        alertSent: randomStatus === 500,
      };

      setLogs(prev => [newLog, ...prev].slice(0, 50));
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-slate-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/50 flex flex-col bg-[#0F0F12]">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">Nexus Hub</h1>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('monitor')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === 'monitor' ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Monitorización</span>
            </button>
            <button 
              onClick={() => setActiveTab('config')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === 'config' ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Configuración</span>
            </button>
            <button 
              onClick={() => setActiveTab('alerts')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all ${activeTab === 'alerts' ? 'bg-blue-600/10 text-blue-500' : 'hover:bg-slate-800/50 text-slate-400'}`}
            >
              <Bell className="w-4 h-4" />
              <span className="text-sm font-medium">Alertas</span>
              {stats.alerts > 0 && (
                <span className="ml-auto bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {stats.alerts}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-4">
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Estado Conexión</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white font-medium">Hub Operativo</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <button className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full px-1">
            <LogOut className="w-3 h-3" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#0A0A0B]/80 backdrop-blur-md border-bottom border-slate-800/50 px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {activeTab === 'monitor' ? 'Panel de Monitorización' : activeTab === 'config' ? 'Ajustes de Integración' : 'Gestión de Alertas'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
               {activeTab === 'monitor' ? 'Flujo de peticiones activo y registros de auditoría' : 'Parámetros del middlewareNexus'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={triggerManualRequest}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
            >
              <Server className="w-3 h-3" />
              Probar Endpoint
            </button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar trace_id..." 
                className="bg-slate-900 border border-slate-800/50 rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-blue-500/50 w-64"
              />
            </div>
            <button 
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${isSimulating ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              <RefreshCcw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Detener Simulación' : 'Iniciar Simulación'}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 space-y-8">
          {activeTab === 'monitor' && (
            <AnimatePresence mode="wait">
              <motion.div 
                key="monitor-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Top Metrics */}
                <div className="grid grid-cols-4 gap-6">
                  {[
                    { label: 'Peticiones Totales', value: stats.total, icon: BarChart3, color: 'text-blue-500' },
                    { label: 'Tasa de Éxito', value: `${stats.rate.toFixed(1)}%`, icon: CheckCircle2, color: 'text-emerald-500' },
                    { label: 'Latencia Media', value: '112ms', icon: Clock, color: 'text-amber-500' },
                    { label: 'Alertas Activas', value: stats.alerts, icon: AlertCircle, color: 'text-rose-500' },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className={`p-2 rounded-lg bg-slate-800/50 group-hover:bg-slate-800 transition-colors ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live</span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1 tracking-tight">{stat.value}</div>
                      <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Main Log Table */}
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Server className="w-4 h-4 text-blue-500" />
                        Registro de Actividad HTTP
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">Últimos 50 eventos procesados por el middleware</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold">API</div>
                        <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[8px] font-bold">HUB</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-800/50 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                          <th className="px-6 py-4">Trace ID</th>
                          <th className="px-6 py-4">Endpoint</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Estrategia</th>
                          <th className="px-6 py-4">Reintentos</th>
                          <th className="px-6 py-4">Latencia</th>
                          <th className="px-6 py-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-mono tracking-tight">
                        {logs.map((log) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={log.id} 
                            className="border-b border-slate-800/30 hover:bg-slate-800/20 group transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className={log.alertSent ? "text-rose-500 font-bold" : "text-slate-300"}>{log.traceId}</span>
                                <span className="text-[10px] text-slate-600 font-sans tracking-normal">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded uppercase">{log.method}</span>
                                <span className="text-slate-400 text-xs">{log.endpoint}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={log.status} />
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-[11px] text-slate-500 font-sans italic">{log.strategy}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 font-sans font-medium text-xs">
                                <span className={log.status !== 200 ? "text-amber-500" : "text-slate-500"}>{log.retries}</span>
                                <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-blue-500 transition-all duration-500" 
                                    style={{ width: `${(parseInt(log.retries.split('/')[0]) / 3) * 100}%` }} 
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[11px] ${log.latency > 1000 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>{log.latency}ms</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => setSelectedLog(log)}
                                className="p-2 rounded-lg bg-slate-800/50 text-slate-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-700 hover:text-white"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {logs.length === 0 && (
                    <div className="p-20 flex flex-col items-center justify-center text-slate-600">
                      <HardDrive className="w-12 h-12 mb-4 opacity-20" />
                      <p className="text-sm">No hay registros entrantes</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {activeTab === 'config' && (
            <AnimatePresence mode="wait">
              <motion.div 
                key="config-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-2xl space-y-8"
              >
                <div className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-8 space-y-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Settings className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Parámetros de Integración</h3>
                      <p className="text-xs text-slate-500">Configure la resiliencia y seguridad del middleware.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ChevronRight className="w-3 h-3 text-blue-500" />
                        Endpoint Base API (Tickets)
                      </label>
                      <input 
                        type="text" 
                        value={config.endpoint}
                        onChange={(e) => setConfig({...config, endpoint: e.target.value})}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all text-white font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Key className="w-3 h-3 text-blue-500" />
                          Método de Autenticación
                        </label>
                        <select 
                          value={config.authType}
                          onChange={(e) => setConfig({...config, authType: e.target.value})}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-white"
                        >
                          <option>Bearer Token</option>
                          <option>OAuth 2.0 Client Credentials</option>
                          <option>API Key (Custom Header)</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <Clock className="w-3 h-3 text-blue-500" />
                          Timeout Global (ms)
                        </label>
                        <input 
                          type="number" 
                          value={config.timeout}
                          onChange={(e) => setConfig({...config, timeout: parseInt(e.target.value)})}
                          className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all text-white font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3 text-blue-500" />
                        Máximo de Reintentos (Backoff)
                      </label>
                      <input 
                        type="range" 
                        min="1" 
                        max="10" 
                        value={config.maxRetries}
                        onChange={(e) => setConfig({...config, maxRetries: parseInt(e.target.value)})}
                        className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                      <div className="flex justify-between text-[10px] font-bold text-slate-600 mt-2">
                        <span>1 INTENTO</span>
                        <span className="text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{config.maxRetries} INTENTOS</span>
                        <span>10 INTENTOS</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-800/50 flex gap-4">
                    <button 
                      onClick={handleSaveConfig}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-lg shadow-blue-500/10"
                    >
                      Guardar Cambios
                    </button>
                    <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 rounded-xl text-sm transition-all">
                      Restablecer por Defecto
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showSaveToast && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex items-center gap-3 bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-xl shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Configuración actualizada correctamente
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-500">Nota de Seguridad</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      La rotación de secretos y certificados OIDC está gestionada por el Vault central. 
                      Cualquier cambio en la URL base debe ser notificado al equipo de cumplimiento para actualizar los dominios permitidos (CORS).
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {activeTab === 'alerts' && (
             <AnimatePresence mode="wait">
              <motion.div 
                key="alerts-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 gap-6">
                  {logs.filter(l => l.alertSent).map((alert, i) => (
                    <div key={i} className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-[40px] rounded-full translate-x-1/2 -translate-y-1/2 group-hover:bg-rose-500/20 transition-all" />
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
                          <AlertCircle className="w-5 h-5 animate-pulse" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-rose-500/50 uppercase tracking-widest mb-1">Error Crítico 5xx</div>
                          <h4 className="text-sm font-bold text-white tracking-tight">{alert.traceId}</h4>
                        </div>
                        <span className="ml-auto text-[10px] text-slate-500 font-bold font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        El servidor externo devolvió un error de nivel 500 tras agotar los 3 reintentos programados. Se ha detectado una degradación temporal del servicio.
                      </p>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => resolveAlert(alert.id)}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-2 rounded-lg transition-colors uppercase tracking-wider"
                        >
                          Marcar como Resuelta
                        </button>
                        <button 
                          onClick={() => setSelectedLog(alert)}
                          className="flex-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 text-[10px] font-bold py-2 rounded-lg transition-colors border border-rose-500/20 uppercase tracking-wider"
                        >
                          Auditar Trazas
                        </button>
                      </div>
                    </div>
                  ))}

                  {logs.filter(l => l.alertSent).length === 0 && (
                    <div className="col-span-2 p-20 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-3xl">
                      <ShieldCheck className="w-12 h-12 mb-4 opacity-20 text-emerald-500" />
                      <p className="text-sm font-bold">No hay alertas críticas registradas</p>
                      <p className="text-xs mt-2 opacity-50 uppercase tracking-widest">Sistemas operando dentro de los parámetros SLA</p>
                    </div>
                  )}
                </div>
              </motion.div>
             </AnimatePresence>
          )}
        </div>
      </main>

      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-[#000]/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#0F0F12] border border-slate-800 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/5"
            >
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${selectedLog.status === 200 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold">Detalle de Petición</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">{selectedLog.traceId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 text-slate-500 rotate-180" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Contexto Petición</span>
                      <div className="text-sm text-slate-300 font-mono bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        {selectedLog.method} {selectedLog.endpoint}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Estado HTTP</span>
                      <div><StatusBadge status={selectedLog.status} /></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Resiliencia</span>
                      <div className="text-sm text-slate-300">{selectedLog.strategy}</div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Timestamp</span>
                      <div className="text-sm text-slate-300">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-600 uppercase">Cuerpo de Respuesta (Simulado)</span>
                  <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-blue-400 border border-slate-800 overflow-x-auto">
                    {JSON.stringify({
                      status: selectedLog.status,
                      trace_id: selectedLog.traceId,
                      payload: {
                        message: selectedLog.status === 200 ? "Ticket procesado con éxito" : "Error de comunicación con el middleware",
                        server_node: "Nexus-Node-Delta-01",
                        execution_latency: `${selectedLog.latency}ms`
                      },
                      metadata: {
                        environment: "Production",
                        region: "eu-west-1"
                      }
                    }, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-6 bg-slate-900/50 border-t border-slate-800 flex justify-end">
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Cerrar Auditoría
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
