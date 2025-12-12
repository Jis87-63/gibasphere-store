import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, ShoppingBag, Gift, MessageCircle } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Carousel } from '@/components/common/Carousel';

interface Product {
  id: string;
  name: string;
  image: string;
}

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    // Load products for carousel
    const productsRef = ref(database, 'products');
    onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          name: value.name,
          image: value.image,
        }));
        setProducts(productsArray.slice(0, 6)); // Show first 6 products
      }
    });
  }, []);

  const features = [
    { icon: ShoppingBag, label: 'Loja Digital' },
    { icon: Gift, label: 'Promoções' },
    { icon: Sparkles, label: 'Roleta de Prémios' },
    { icon: MessageCircle, label: 'Suporte 24h' },
  ];

  // Convert products to carousel format
  const carouselItems = products.map((p) => ({
    id: p.id,
    image: p.image,
    title: p.name,
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-sm w-full"
      >
        {/* Small Welcome Text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground mb-4"
        >
          Bem-vindo à <span className="text-primary font-medium">MozStore</span>
        </motion.p>

        {/* Products Grid - Show all items */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4, delay: 0.2 }}
          className="mb-6"
        >
          {carouselItems.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {carouselItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="aspect-square rounded-xl overflow-hidden bg-card"
                >
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="aspect-[2/1] rounded-xl gradient-primary shadow-glow flex items-center justify-center">
              <ShoppingBag className="w-16 h-16 text-primary-foreground opacity-80" />
            </div>
          )}
        </motion.div>

        <p className="text-muted-foreground mb-6 text-sm">
          Descubra produtos incríveis e ofertas exclusivas
        </p>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-card rounded-xl p-3 flex flex-col items-center gap-2"
            >
              <feature.icon className="w-5 h-5 text-primary" />
              <span className="text-xs text-muted-foreground">{feature.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/registro')}
            className="w-full"
            size="lg"
          >
            Criar Conta
          </Button>
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Entrar
          </Button>
        </div>
      </motion.div>

      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 -left-20 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
      </div>
    </div>
  );
};

export default Welcome;
