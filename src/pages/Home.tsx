import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Carousel } from '@/components/common/Carousel';
import { ProductCard } from '@/components/common/ProductCard';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Search, Bell, ChevronRight, Coins, User } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image: string;
  realPrice: number;
  category: string;
  featured?: boolean;
  promotion?: boolean;
  isRecent?: boolean;
  recentUntil?: string;
  parentProduct?: string;
}

interface Category {
  id: string;
  name: string;
  image: string;
}

interface Banner {
  id: string;
  image: string;
  title?: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load banners
    const bannersRef = ref(database, 'banners');
    onValue(bannersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const bannersArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setBanners(bannersArray);
      }
    });

    // Load products
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setProducts(productsArray);
      }
      setLoading(false);
    });

    // Load categories
    const categoriesRef = ref(database, 'categories');
    onValue(categoriesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const categoriesArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setCategories(categoriesArray);
      }
    });
  }, []);

  // Filter only main products (without parentProduct)
  const mainProducts = products.filter(p => !p.parentProduct);
  
  const featuredProducts = mainProducts.filter(p => p.featured);
  
  // Recent products: only those with isRecent=true AND recentUntil not expired
  const recentProducts = mainProducts.filter(p => {
    if (!p.isRecent) return false;
    if (!p.recentUntil) return false;
    return new Date(p.recentUntil) > new Date();
  });
  
  const topProducts = mainProducts.slice(0, 4);

  const Header = (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="text-xs text-muted-foreground">Olá,</p>
        <h1 className="text-lg font-semibold text-foreground">
          {userData?.name || 'Visitante'}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/creditos')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium"
        >
          <Coins className="w-4 h-4" />
          {userData?.credits || 0}
        </button>
        <button 
          onClick={() => navigate('/mensagens')}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>
        <button 
          onClick={() => navigate('/perfil')}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <User className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {/* Search */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => navigate('/loja')}
          className="w-full flex items-center gap-3 px-4 py-3 bg-card rounded-xl text-muted-foreground mb-4"
        >
          <Search className="w-5 h-5" />
          <span>Buscar produtos...</span>
        </motion.button>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Carousel items={banners} />
        </motion.div>

        {/* Categories */}
        {categories.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Categorias</h2>
              <button
                onClick={() => navigate('/loja')}
                className="flex items-center gap-1 text-sm text-primary"
              >
                Ver todas
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => navigate(`/loja?categoria=${category.id}`)}
                  className="flex-shrink-0 relative w-20 h-20 rounded-xl overflow-hidden"
                >
                  {category.image ? (
                    <>
                      <img 
                        src={category.image} 
                        alt={category.name} 
                        className="w-full h-full object-cover blur-[2px]"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-semibold text-center px-1 leading-tight">{category.name}</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-card flex items-center justify-center">
                      <span className="text-xs text-muted-foreground text-center">{category.name}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.section>
        )}

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Em Destaque</h2>
              <button
                onClick={() => navigate('/loja')}
                className="flex items-center gap-1 text-sm text-primary"
              >
                Ver mais
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Recent Products */}
        {recentProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Recentes</h2>
              <button
                onClick={() => navigate('/loja')}
                className="flex items-center gap-1 text-sm text-primary"
              >
                Ver mais
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentProducts.map((product) => (
                <div key={product.id} className="flex-shrink-0 w-40">
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Top Selling */}
        {topProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Mais Vendidos</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {topProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </motion.section>
        )}

        {/* Empty State */}
        {!loading && products.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto disponível</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os produtos serão adicionados pelo administrador
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default Home;
