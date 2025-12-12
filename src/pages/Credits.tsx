import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Coins, Gift, ShoppingCart, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface CreditHistory {
  id: string;
  amount: number;
  type: 'earned' | 'spent';
  description: string;
  createdAt: string;
}

const Credits: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [history, setHistory] = useState<CreditHistory[]>([]);

  const Header = (
    <div className="px-4 py-3">
      <h1 className="text-xl font-semibold text-foreground">Créditos</h1>
    </div>
  );

  const howToEarn = [
    {
      icon: ShoppingCart,
      title: 'Comprar Produtos',
      description: 'Ganhe créditos a cada compra realizada',
    },
    {
      icon: Gift,
      title: 'Roleta da Sorte',
      description: 'Participe da roleta e ganhe prêmios',
    },
    {
      icon: TrendingUp,
      title: 'Promoções',
      description: 'Aproveite promoções especiais',
    },
  ];

  return (
    <>
      <PageContainer header={Header}>
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="gradient-primary rounded-2xl p-6 mb-6 shadow-glow"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-primary-foreground/80 text-sm">Saldo atual</p>
              <h2 className="text-3xl font-bold text-primary-foreground">
                {userData?.credits || 0}
              </h2>
            </div>
          </div>
          <p className="text-primary-foreground/70 text-sm">
            Use seus créditos para comprar produtos ou girar a roleta
          </p>
        </motion.div>

        {/* How to Earn */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Como ganhar créditos</h3>
          <div className="space-y-3">
            {howToEarn.map((item, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <Button onClick={() => navigate('/loja')} variant="outline" className="h-auto py-4">
            <div className="text-center">
              <ShoppingCart className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm">Comprar</span>
            </div>
          </Button>
          <Button onClick={() => navigate('/roleta')} variant="outline" className="h-auto py-4">
            <div className="text-center">
              <Gift className="w-6 h-6 mx-auto mb-2" />
              <span className="text-sm">Roleta</span>
            </div>
          </Button>
        </motion.div>
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default Credits;
