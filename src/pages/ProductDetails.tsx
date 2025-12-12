import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, get, set, push } from 'firebase/database';
import { ArrowLeft, ShoppingCart, Coins, Star, Share2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image: string;
  description: string;
  realPrice: number;
  category: string;
}

const ProductDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userData, updateUserCredits } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      const productRef = ref(database, `products/${id}`);
      const snapshot = await get(productRef);
      
      if (snapshot.exists()) {
        setProduct({ id, ...snapshot.val() });
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  const storePrice = product ? product.realPrice - 50 : 0;

  const handleBuy = () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para comprar.',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }

    navigate(`/pagamento/${id}`);
  };

  const handleUseCredits = async () => {
    if (!user || !userData || !product) return;

    if (userData.credits < storePrice) {
      toast({
        title: 'Créditos insuficientes',
        description: `Você precisa de ${storePrice} créditos. Você tem ${userData.credits}.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateUserCredits(-storePrice);

      const purchaseRef = push(ref(database, `purchases/${user.uid}`));
      await set(purchaseRef, {
        productId: product.id,
        productName: product.name,
        amount: storePrice,
        paymentMethod: 'credits',
        status: 'success',
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Compra realizada!',
        description: `${storePrice} créditos foram debitados.`,
      });

      navigate('/historico');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a compra.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <PageContainer showNav={false}>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer showNav={false}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Produto não encontrado</p>
          <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
            Voltar
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer showNav={false} className="pb-32">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 safe-top">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass flex items-center justify-center text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-full glass flex items-center justify-center text-foreground">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Product Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="aspect-square -mx-4 -mt-4 bg-card"
      >
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Product Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4"
      >
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <div className="flex items-center gap-1 text-warning">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">4.8</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <span className="text-sm text-muted-foreground line-through">
            {product.realPrice} MT
          </span>
          <span className="text-2xl font-bold text-primary">
            {storePrice} MT
          </span>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            -50 MT
          </span>
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Descrição</h2>
          <p className="text-muted-foreground leading-relaxed">
            {product.description || 'Sem descrição disponível.'}
          </p>
        </div>
      </motion.div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass border-t border-border safe-bottom">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            onClick={handleUseCredits}
            variant="outline"
            className="flex-1"
            disabled={!userData || userData.credits < storePrice}
          >
            <Coins className="w-4 h-4 mr-2" />
            Usar {storePrice} Créditos
          </Button>
          <Button onClick={handleBuy} className="flex-1">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Comprar
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ProductDetails;
