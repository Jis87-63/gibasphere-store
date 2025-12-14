import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { ProductCard } from '@/components/common/ProductCard';
import { database } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { ArrowLeft } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image: string;
  realPrice: number;
  category: string;
  featured?: boolean;
  promotion?: boolean;
  parentProduct?: string;
}

const ProductItems: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [parentProduct, setParentProduct] = useState<Product | null>(null);
  const [childProducts, setChildProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;

    // Fetch parent product
    const fetchParent = async () => {
      const productRef = ref(database, `products/${productId}`);
      const snapshot = await get(productRef);
      if (snapshot.exists()) {
        setParentProduct({ id: productId, ...snapshot.val() });
      }
    };

    fetchParent();

    // Listen to all products and filter children
    const productsRef = ref(database, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const productsArray = Object.entries(data)
          .map(([id, value]: [string, any]) => ({ id, ...value }))
          .filter((p: Product) => p.parentProduct === productId);
        setChildProducts(productsArray);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  const Header = (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {parentProduct?.name || 'Itens'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {childProducts.length} opções disponíveis
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {/* Parent Product Card */}
        {parentProduct && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-card rounded-xl p-4 flex gap-4"
          >
            <img
              src={parentProduct.image || '/placeholder.svg'}
              alt={parentProduct.name}
              className="w-20 h-20 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">{parentProduct.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione uma das opções abaixo
              </p>
            </div>
          </motion.div>
        )}

        {/* Child Products Grid */}
        {childProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 gap-3"
          >
            {childProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <ProductCard {...product} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {loading ? 'Carregando...' : 'Nenhum item disponível para este produto'}
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default ProductItems;