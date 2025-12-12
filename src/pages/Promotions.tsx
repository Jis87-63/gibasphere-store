import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Clock, Tag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Promotion {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  originalPrice: number;
  discount: number;
  endTime: string;
  banner?: string;
}

const Promotions: React.FC = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const promotionsRef = ref(database, 'promotions');
    onValue(promotionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const promotionsArray = Object.entries(data)
          .map(([id, value]: [string, any]) => ({ id, ...value }))
          .filter((p) => new Date(p.endTime) > new Date());
        setPromotions(promotionsArray);
      }
    });
  }, []);

  const getTimeLeft = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expirado';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const Header = (
    <div className="px-4 py-3">
      <h1 className="text-xl font-semibold text-foreground">Promoções</h1>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {promotions.length > 0 ? (
          <div className="space-y-4">
            {promotions.map((promo, index) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl overflow-hidden"
              >
                {promo.banner && (
                  <img
                    src={promo.banner}
                    alt="Banner"
                    className="w-full h-32 object-cover"
                  />
                )}
                
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={promo.productImage}
                      alt={promo.productName}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">{promo.productName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Tag className="w-4 h-4 text-destructive" />
                        <span className="text-destructive font-semibold">
                          -{promo.discount}%
                        </span>
                      </div>
                      {promo.originalPrice && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-muted-foreground line-through">
                            {promo.originalPrice} MT
                          </span>
                          <span className="text-lg font-bold text-primary">
                            {Math.round(promo.originalPrice * (1 - promo.discount / 100))} MT
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Termina em {getTimeLeft(promo.endTime)}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate(`/produto/${promo.productId}`)}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    Aproveitar
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma promoção ativa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Volte mais tarde para ver novas ofertas
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default Promotions;
