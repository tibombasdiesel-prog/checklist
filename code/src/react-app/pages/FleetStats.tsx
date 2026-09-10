import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, AlertTriangle, Car, Calendar, Gauge } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StatsData {
  totalChecklists: number;
  totalDamages: number;
  checklistsByType: {
    entrada: number;
    saida: number;
  };
  vehiclesWithMostDamages: Array<{
    vehicle: string;
    damageCount: number;
  }>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
  problemsByCategory: {
    generalState: number;
    lights: number;
    safety: number;
    motor: number;
  };
}

interface KmStats {
  vehicles: Array<{
    id: number;
    licensePlate: string;
    model: string;
    vehicle: string;
    totalKm: number;
    tripCount: number;
  }>;
}

export default function FleetStats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [kmStats, setKmStats] = useState<KmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchKmStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/fleet-checklists/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching fleet stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKmStats = async () => {
    try {
      const response = await fetch('/api/fleet-checklists/km-stats');
      if (!response.ok) throw new Error('Failed to fetch KM stats');
      
      const data = await response.json();
      setKmStats(data);
    } catch (error) {
      console.error('Error fetching KM stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-xl text-red-400">Erro ao carregar estatísticas</div>
      </div>
    );
  }

  // Prepare pie chart data
  const pieColors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
  const pieData = kmStats?.vehicles.map((v, index) => ({
    name: v.licensePlate,
    value: v.totalKm,
    fullName: v.vehicle,
    color: pieColors[index % pieColors.length],
  })) || [];

  const totalKm = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/fleet')}
            className="flex items-center text-slate-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar
          </button>
          <img 
            src="/assets/logo-bombas-diesel-light.png" 
            alt="Bombas Diesel" 
            className="h-10 object-contain"
          />
        </div>

        <h1 className="text-3xl font-bold text-white mb-8">Dashboard de Estatísticas</h1>

        {/* KM Statistics - Pie Chart */}
        {pieData.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Gauge className="w-6 h-6 text-emerald-400" />
              Quilometragem Percorrida por Veículo
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${percent ? (percent * 100).toFixed(0) : 0}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} km`, 'Quilometragem']}
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* List with KM details */}
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-4">
                  <div className="text-sm text-emerald-400 mb-1">Total Geral</div>
                  <div className="text-3xl font-bold text-white">{totalKm.toLocaleString('pt-BR')} km</div>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {kmStats?.vehicles.map((vehicle, index) => (
                    <div 
                      key={vehicle.id} 
                      className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors cursor-pointer"
                      onClick={() => navigate(`/fleet/vehicle/${vehicle.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: pieColors[index % pieColors.length] }}
                        />
                        <div>
                          <div className="text-white font-medium">{vehicle.licensePlate}</div>
                          <div className="text-xs text-slate-400">{vehicle.model}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-emerald-400">{vehicle.totalKm.toLocaleString('pt-BR')} km</div>
                        <div className="text-xs text-slate-400">{vehicle.tripCount} viagens</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalChecklists}</div>
            <div className="text-sm opacity-90">Vistorias Realizadas</div>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-orange-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.totalDamages}</div>
            <div className="text-sm opacity-90">Avarias Registradas</div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <Car className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.checklistsByType.entrada}</div>
            <div className="text-sm opacity-90">Checklists de Entrada</div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 opacity-80" />
            </div>
            <div className="text-3xl font-bold mb-1">{stats.checklistsByType.saida}</div>
            <div className="text-sm opacity-90">Checklists de Saída</div>
          </div>
        </div>

        {/* Vehicles with Most Damages */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            Veículos com Mais Avarias
          </h2>
          
          {stats.vehiclesWithMostDamages.length > 0 ? (
            <div className="space-y-3">
              {stats.vehiclesWithMostDamages.map((vehicle, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                      <span className="text-amber-400 font-bold text-sm">#{index + 1}</span>
                    </div>
                    <span className="text-white font-medium">{vehicle.vehicle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-400">{vehicle.damageCount}</span>
                    <span className="text-slate-400 text-sm">avarias</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">Nenhuma avaria registrada</p>
          )}
        </div>

        {/* Problems by Category */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Problemas por Categoria</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Estado Geral</span>
                <span className="text-2xl font-bold text-emerald-400">{stats.problemsByCategory.generalState}</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.problemsByCategory.generalState / (stats.totalChecklists || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Luzes</span>
                <span className="text-2xl font-bold text-amber-400">{stats.problemsByCategory.lights}</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.problemsByCategory.lights / (stats.totalChecklists || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Segurança</span>
                <span className="text-2xl font-bold text-red-400">{stats.problemsByCategory.safety}</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.problemsByCategory.safety / (stats.totalChecklists || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300">Motor</span>
                <span className="text-2xl font-bold text-blue-400">{stats.problemsByCategory.motor}</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((stats.problemsByCategory.motor / (stats.totalChecklists || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {stats.recentActivity.length > 0 && (
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Atividade Recente (Últimos 7 dias)</h2>
            
            <div className="space-y-2">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-slate-300">
                    {new Date(activity.date).toLocaleDateString('pt-BR', { 
                      day: '2-digit', 
                      month: 'short' 
                    })}
                  </span>
                  <span className="text-emerald-400 font-semibold">{activity.count} vistorias</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
