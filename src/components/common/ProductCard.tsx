import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

interface ProductCardProps {
  id: string;
  name: string;
  image: string;
  realPrice: number;
  featured?: boolean;
  promotion?: boolean;
  parentProduct?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  image,
  realPrice,
  featured,
  promotion,
  parentProduct,
}) => {
  const navigate = useNavigate();
  const storePrice = realPrice - 50;
  const [hasChildren, setHasChildren] = useState(false);

  useEffect(() => {
    // Check if this product has child products (is a parent)
    const checkChildren = async () => {
      const productsRef = ref(database, 'products');
      const snapshot = await get(productsRef);
      if (snapshot.exists()) {
        const products = snapshot.val();
        const hasChildProducts = Object.values(products).some(
          (p: any) => p.parentProduct === id
        );
        setHasChildren(hasChildProducts);
      }
    };
    
    // Only check for children if this is not already a child product
    if (!parentProduct) {
      checkChildren();
    }
  }, [id, parentProduct]);

  const handleClick = () => {
    // If this product has children, go to items page; otherwise go to details
    if (hasChildren) {
      navigate(`/produto/${id}/itens`);
    } else {
      navigate(`/produto/${id}`);
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="relative bg-card rounded-xl overflow-hidden shadow-card cursor-pointer group"
    >
      {featured && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full gradient-primary text-xs font-medium text-primary-foreground">
          <Sparkles className="w-3 h-3" />
          Destaque
        </div>
      )}
      
      {promotion && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
          Promoção
        </div>
      )}

      <div className="aspect-square bg-secondary/50 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium text-foreground truncate">{name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground line-through">
            {realPrice} MT
          </span>
          <span className="text-sm font-bold text-primary">
            {storePrice} MT
          </span>
        </div>
        {hasChildren && (
          <p className="text-xs text-muted-foreground mt-1">Ver opções →</p>
        )}
      </div>
    </motion.div>
  );
};
