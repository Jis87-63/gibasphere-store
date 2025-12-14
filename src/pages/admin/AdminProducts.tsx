import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database, storage } from '@/lib/firebase';
import { ref, onValue, set, remove, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, Plus, Edit2, Trash2, X, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  realPrice: number;
  category: string;
  featured: boolean;
  promotion: boolean;
  isRecent: boolean;
  recentUntil?: string;
  parentProduct?: string;
  isParentProduct?: boolean;
  isBestSeller?: boolean;
  bestSellerOrder?: number;
  createdAt?: string;
}

interface Category {
  id: string;
  name: string;
}

const AdminProducts: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    realPrice: '',
    category: '',
    featured: false,
    promotion: false,
    isRecent: true,
    recentDays: '7',
    parentProduct: '',
    isParentProduct: false,
    isBestSeller: false,
    bestSellerOrder: '',
  });

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'products'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProducts(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setProducts([]);
      }
    });

    onValue(ref(database, 'categories'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setCategories(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      }
    });
  }, [navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileRef = storageRef(storage, `products/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      setFormData(prev => ({ ...prev, image: url }));
      toast.success('Imagem carregada!');
    } catch (error) {
      toast.error('Erro ao carregar imagem');
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Parent products don't need price
    if (!formData.name || !formData.category || (!formData.isParentProduct && !formData.realPrice)) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const recentUntil = formData.isRecent 
        ? new Date(Date.now() + parseInt(formData.recentDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const productData = {
        name: formData.name,
        description: formData.description,
        image: formData.image,
        realPrice: formData.isParentProduct ? 0 : parseFloat(formData.realPrice),
        category: formData.category,
        featured: formData.featured,
        promotion: formData.promotion,
        isRecent: formData.isRecent,
        recentUntil,
        parentProduct: formData.parentProduct || null,
        isParentProduct: formData.isParentProduct,
        isBestSeller: formData.isBestSeller,
        bestSellerOrder: formData.bestSellerOrder ? parseInt(formData.bestSellerOrder) : null,
        updatedAt: new Date().toISOString(),
      };

      if (editingProduct) {
        await set(ref(database, `products/${editingProduct.id}`), productData);
        toast.success('Produto atualizado!');
      } else {
        const newRef = push(ref(database, 'products'));
        await set(newRef, { ...productData, createdAt: new Date().toISOString() });
        toast.success('Produto adicionado!');
      }

      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar produto');
    }
    setLoading(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const daysRemaining = product.recentUntil 
      ? Math.max(0, Math.ceil((new Date(product.recentUntil).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
      : 7;
    setFormData({
      name: product.name,
      description: product.description || '',
      image: product.image,
      realPrice: product.realPrice?.toString() || '',
      category: product.category,
      featured: product.featured,
      promotion: product.promotion,
      isRecent: product.isRecent ?? true,
      recentDays: daysRemaining.toString(),
      parentProduct: product.parentProduct || '',
      isParentProduct: product.isParentProduct || false,
      isBestSeller: product.isBestSeller || false,
      bestSellerOrder: product.bestSellerOrder?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await remove(ref(database, `products/${id}`));
      toast.success('Produto excluído!');
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', image: '', realPrice: '', category: '', featured: false, promotion: false, isRecent: true, recentDays: '7', parentProduct: '', isParentProduct: false, isBestSeller: false, bestSellerOrder: '' });
    setEditingProduct(null);
    setShowModal(false);
  };

  // Filter parent products (products without parentProduct)
  const parentProducts = products.filter(p => !p.parentProduct);

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Produtos</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-4">
        <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
      </Button>

      <div className="space-y-3">
        {products.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-4 flex gap-3"
          >
            <img src={product.image || '/placeholder.svg'} alt={product.name} className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground truncate">{product.name}</h3>
              {product.parentProduct && (
                <p className="text-xs text-muted-foreground">
                  Sub-item de: {parentProducts.find(p => p.id === product.parentProduct)?.name || 'Produto'}
                </p>
              )}
              {product.isParentProduct ? (
                <p className="text-sm text-muted-foreground italic">Produto Pai</p>
              ) : (
                <p className="text-sm text-primary">{product.realPrice} MT</p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {product.featured && <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded">Destaque</span>}
                {product.promotion && <span className="text-xs bg-red-500/20 text-red-500 px-2 py-0.5 rounded">Promoção</span>}
                {product.isBestSeller && <span className="text-xs bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded">Mais Vendido</span>}
                {product.isRecent && product.recentUntil && new Date(product.recentUntil) > new Date() && (
                  <span className="text-xs bg-green-500/20 text-green-500 px-2 py-0.5 rounded">Recente</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleEdit(product)} className="p-2 text-primary hover:bg-primary/10 rounded-lg">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(product.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}

        {products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum produto cadastrado
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end justify-center"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-card w-full max-h-[90vh] rounded-t-3xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">
                  {editingProduct ? 'Editar Produto' : 'Novo Produto'}
                </h2>
                <button onClick={resetForm} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Nome *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do produto"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do produto"
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground resize-none h-24"
                  />
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Imagem</label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                      placeholder="URL da imagem"
                      className="flex-1"
                    />
                    <label className="flex items-center justify-center w-12 h-10 bg-primary text-primary-foreground rounded-md cursor-pointer">
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                  {formData.image && <img src={formData.image} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-foreground mb-3">
                    <input
                      type="checkbox"
                      checked={formData.isParentProduct}
                      onChange={(e) => setFormData(prev => ({ ...prev, isParentProduct: e.target.checked, realPrice: e.target.checked ? '' : prev.realPrice }))}
                      className="w-4 h-4 rounded border-input"
                    />
                    É um Produto Pai (sem preço, agrupa sub-itens)
                  </label>
                </div>

                {!formData.isParentProduct && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Preço Real (MT) *</label>
                    <Input
                      type="number"
                      value={formData.realPrice}
                      onChange={(e) => setFormData(prev => ({ ...prev, realPrice: e.target.value }))}
                      placeholder="450"
                    />
                    {formData.realPrice && (
                      <p className="text-xs text-primary mt-1">Preço da loja: {parseFloat(formData.realPrice) - 50} MT</p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Categoria *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
                  >
                    <option value="">Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Produto Pai (opcional)</label>
                  <select
                    value={formData.parentProduct}
                    onChange={(e) => setFormData(prev => ({ ...prev, parentProduct: e.target.value }))}
                    className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground"
                  >
                    <option value="">Nenhum (produto principal)</option>
                    {parentProducts.filter(p => p.id !== editingProduct?.id).map(prod => (
                      <option key={prod.id} value={prod.id}>{prod.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Se este for um sub-item (ex: variante de recarga), selecione o produto principal
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                      className="w-4 h-4 rounded border-input"
                    />
                    Destaque
                  </label>
                  <label className="flex items-center gap-2 text-foreground">
                    <input
                      type="checkbox"
                      checked={formData.promotion}
                      onChange={(e) => setFormData(prev => ({ ...prev, promotion: e.target.checked }))}
                      className="w-4 h-4 rounded border-input"
                    />
                    Promoção
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-foreground">
                      <input
                        type="checkbox"
                        checked={formData.isBestSeller}
                        onChange={(e) => setFormData(prev => ({ ...prev, isBestSeller: e.target.checked }))}
                        className="w-4 h-4 rounded border-input"
                      />
                      Mais Vendido
                    </label>
                    {formData.isBestSeller && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Ordem:</span>
                        <Input
                          type="number"
                          value={formData.bestSellerOrder}
                          onChange={(e) => setFormData(prev => ({ ...prev, bestSellerOrder: e.target.value }))}
                          className="w-16 h-8 text-sm"
                          min="1"
                          placeholder="1"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-foreground">
                      <input
                        type="checkbox"
                        checked={formData.isRecent}
                        onChange={(e) => setFormData(prev => ({ ...prev, isRecent: e.target.checked }))}
                        className="w-4 h-4 rounded border-input"
                      />
                      Mostrar como Recente
                    </label>
                    {formData.isRecent && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">por</span>
                        <Input
                          type="number"
                          value={formData.recentDays}
                          onChange={(e) => setFormData(prev => ({ ...prev, recentDays: e.target.value }))}
                          className="w-16 h-8 text-sm"
                          min="1"
                        />
                        <span className="text-xs text-muted-foreground">dias</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editingProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProducts;
