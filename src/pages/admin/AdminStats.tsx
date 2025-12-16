import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { ArrowLeft, TrendingUp, ShoppingBag, Ticket, Users, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface Transaction {
  productName: string;
  amount: number;
  status: string;
  createdAt: string;
  couponCode?: string;
}

interface CouponUsage {
  code: string;
  usedCount: number;
  discountType: string;
  discountValue: number;
}

const AdminStats: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coupons, setCoupons] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    // Load all transactions
    onValue(ref(database, 'transactions'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const allTransactions: Transaction[] = [];
        
        Object.values(data).forEach((userTransactions: any) => {
          Object.values(userTransactions).forEach((t: any) => {
            allTransactions.push(t);
          });
        });
        
        setTransactions(allTransactions);
      }
      setLoading(false);
    });

    // Load coupons
    onValue(ref(database, 'coupons'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const couponList = Object.entries(data).map(([id, value]: [string, any]) => ({
          code: value.code,
          usedCount: value.usedCount || 0,
          discountType: value.discountType,
          discountValue: value.discountValue,
        }));
        setCoupons(couponList);
      }
    });
  }, [navigate]);

  // Calculate stats
  const successfulTransactions = transactions.filter(t => t.status === 'success');
  const totalRevenue = successfulTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalTransactions = successfulTransactions.length;
  const couponsUsed = successfulTransactions.filter(t => t.couponCode).length;

  // Sales by day (last 7 days)
  const salesByDay = () => {
    const days: { [key: string]: number } = {};
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      days[key] = 0;
    }

    successfulTransactions.forEach(t => {
      const date = t.createdAt?.split('T')[0];
      if (date && days.hasOwnProperty(date)) {
        days[date] += t.amount || 0;
      }
    });

    return Object.entries(days).map(([date, value]) => ({
      name: dayNames[new Date(date).getDay()],
      vendas: value,
    }));
  };

  // Top products
  const topProducts = () => {
    const products: { [key: string]: number } = {};
    
    successfulTransactions.forEach(t => {
      if (t.productName) {
        products[t.productName] = (products[t.productName] || 0) + 1;
      }
    });

    return Object.entries(products)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  };

  // Coupon usage data
  const couponData = coupons
    .filter(c => c.usedCount > 0)
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 5);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 safe-top pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Estatísticas</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-4 rounded-xl"
        >
          <DollarSign className="w-6 h-6 text-green-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalRevenue} MT</p>
          <p className="text-xs text-muted-foreground">Receita Total</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-4 rounded-xl"
        >
          <ShoppingBag className="w-6 h-6 text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalTransactions}</p>
          <p className="text-xs text-muted-foreground">Vendas</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-4 rounded-xl"
        >
          <Ticket className="w-6 h-6 text-purple-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">{couponsUsed}</p>
          <p className="text-xs text-muted-foreground">Cupons Usados</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-4 rounded-xl"
        >
          <TrendingUp className="w-6 h-6 text-orange-500 mb-2" />
          <p className="text-2xl font-bold text-foreground">
            {totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0} MT
          </p>
          <p className="text-xs text-muted-foreground">Ticket Médio</p>
        </motion.div>
      </div>

      {/* Sales Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card p-4 rounded-xl mb-6"
      >
        <h2 className="font-semibold text-foreground mb-4">Vendas dos Últimos 7 Dias</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesByDay()}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }} 
              />
              <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Products */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card p-4 rounded-xl mb-6"
      >
        <h2 className="font-semibold text-foreground mb-4">Produtos Mais Vendidos</h2>
        {topProducts().length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProducts()}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {topProducts().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma venda ainda</p>
        )}
        <div className="flex flex-wrap gap-2 mt-4">
          {topProducts().map((product, index) => (
            <div key={product.name} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
              <span className="text-muted-foreground truncate max-w-[100px]">{product.name}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Coupon Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-card p-4 rounded-xl"
      >
        <h2 className="font-semibold text-foreground mb-4">Estatísticas de Cupons</h2>
        {couponData.length > 0 ? (
          <div className="space-y-3">
            {couponData.map((coupon, index) => (
              <div key={coupon.code} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{coupon.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}% de desconto` 
                      : `${coupon.discountValue} MT de desconto`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{coupon.usedCount}</p>
                  <p className="text-xs text-muted-foreground">usos</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhum cupom usado ainda</p>
        )}
      </motion.div>
    </div>
  );
};

export default AdminStats;
