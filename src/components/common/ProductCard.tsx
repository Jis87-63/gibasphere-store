import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

interface ProductCardProps {
  id: string;
  name: string;
  image: string;
  realPrice: number;
  featured?: boolean;
  promotion?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  image,
  realPrice,
  featured,
  promotion,
}) => {
  const navigate = useNavigate();
  const storePrice = realPrice - 50;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/produto/${id}`)}
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
      </div>
    </motion.div>
  );
};
