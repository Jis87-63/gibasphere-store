import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import ProductItems from "./pages/ProductItems";
import Payment from "./pages/Payment";
import History from "./pages/History";
import Credits from "./pages/Credits";
import Roulette from "./pages/Roulette";
import Promotions from "./pages/Promotions";
import News from "./pages/News";
import Profile from "./pages/Profile";
import Support from "./pages/Support";
import TermsPolicies from "./pages/TermsPolicies";
import Maintenance from "./pages/Maintenance";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminCarousel from "./pages/admin/AdminCarousel";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPromotions from "./pages/admin/AdminPromotions";
import AdminRoulette from "./pages/admin/AdminRoulette";
import AdminChat from "./pages/admin/AdminChat";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminNews from "./pages/admin/AdminNews";
import AdminBroadcasts from "./pages/admin/AdminBroadcasts";
import AdminTermsPolicies from "./pages/admin/AdminTermsPolicies";
import AdminPrizeSearch from "./pages/admin/AdminPrizeSearch";
import AdminRedemptions from "./pages/admin/AdminRedemptions";
import AdminCoupons from "./pages/admin/AdminCoupons";
import AdminStats from "./pages/admin/AdminStats";
import Broadcasts from "./pages/Broadcasts";
import RedeemPrize from "./pages/RedeemPrize";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Maintenance check wrapper component
const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsRef = ref(database, 'settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.val();
        setIsMaintenanceMode(settings.maintenanceMode || false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Skip redirect for admin pages and maintenance page
    const isAdminPage = location.pathname.startsWith('/admin');
    const isMaintenancePage = location.pathname === '/manutencao';
    
    if (!loading && isMaintenanceMode && !isAdminPage && !isMaintenancePage) {
      navigate('/manutencao');
    }
  }, [isMaintenanceMode, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

const AppRoutes = () => (
  <MaintenanceGuard>
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/registro" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/loja" element={<Shop />} />
      <Route path="/produto/:id" element={<ProductDetails />} />
      <Route path="/produto/:productId/itens" element={<ProductItems />} />
      <Route path="/pagamento/:id" element={<Payment />} />
      <Route path="/historico" element={<History />} />
      <Route path="/creditos" element={<Credits />} />
      <Route path="/roleta" element={<Roulette />} />
      <Route path="/resgatar/:prizeId" element={<RedeemPrize />} />
      <Route path="/promocoes" element={<Promotions />} />
      <Route path="/novidades" element={<News />} />
      <Route path="/mensagens" element={<Broadcasts />} />
      <Route path="/perfil" element={<Profile />} />
      <Route path="/suporte" element={<Support />} />
      <Route path="/termos-politicas" element={<TermsPolicies />} />
      <Route path="/manutencao" element={<Maintenance />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/produtos" element={<AdminProducts />} />
      <Route path="/admin/categorias" element={<AdminCategories />} />
      <Route path="/admin/carrossel" element={<AdminCarousel />} />
      <Route path="/admin/usuarios" element={<AdminUsers />} />
      <Route path="/admin/promocoes" element={<AdminPromotions />} />
      <Route path="/admin/roleta" element={<AdminRoulette />} />
      <Route path="/admin/premios" element={<AdminPrizeSearch />} />
      <Route path="/admin/resgates" element={<AdminRedemptions />} />
      <Route path="/admin/chat" element={<AdminChat />} />
      <Route path="/admin/config" element={<AdminSettings />} />
      <Route path="/admin/notificacoes" element={<AdminNotifications />} />
      <Route path="/admin/novidades" element={<AdminNews />} />
      <Route path="/admin/broadcasts" element={<AdminBroadcasts />} />
      <Route path="/admin/termos-politicas" element={<AdminTermsPolicies />} />
      <Route path="/admin/termos" element={<AdminTermsPolicies />} />
      <Route path="/admin/cupons" element={<AdminCoupons />} />
      <Route path="/admin/estatisticas" element={<AdminStats />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </MaintenanceGuard>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
