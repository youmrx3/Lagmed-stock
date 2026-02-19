import { StockStats } from "@/types/stock";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface StatisticsPanelProps {
  stats: StockStats;
}

export function StatisticsPanel({ stats }: StatisticsPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-DZ", {
      style: "currency",
      currency: "DZD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--warning))",
    "hsl(var(--destructive))",
    "hsl(var(--muted-foreground))",
    "hsl(210 90% 55%)",
    "hsl(280 80% 55%)",
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold tracking-tight">{stats.totalItems}</p>
            <p className="text-xs font-medium text-muted-foreground">Produits</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold tracking-tight">{stats.totalQuantity}</p>
            <p className="text-xs font-medium text-muted-foreground">Unités totales</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold tracking-tight text-warning">{stats.totalReserved}</p>
            <p className="text-xs font-medium text-muted-foreground">Réservées</p>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4 transition-all hover:shadow-md">
          <div className="text-center space-y-1">
            <p className="text-2xl font-bold tracking-tight text-success">{stats.totalRemaining}</p>
            <p className="text-xs font-medium text-muted-foreground">Disponibles</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Status Pie Chart */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">État du stock</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.stockByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {stats.stockByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {stats.stockByStatus.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Répartition par catégorie</h3>
          </div>
          <div className="p-4 sm:p-5">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.categoryBreakdown} layout="vertical">
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                    {stats.categoryBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Value Summary */}
      <div className="rounded-xl border overflow-hidden gradient-primary p-6">
        <div className="text-center">
          <p className="text-sm text-white/80 mb-2">Valeur totale estimée du stock</p>
          <p className="text-4xl font-bold text-white tracking-tight">{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>
    </div>
  );
}
