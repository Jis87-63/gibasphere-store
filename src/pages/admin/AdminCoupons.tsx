import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { ArrowLeft, Plus, Trash2, Ticket, Percent } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string;
  active: boolean;
  createdAt: string;
}

const AdminCoupons: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    minPurchase: 0,
    maxUses: 100,
    expiresAt: '',
  });

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/admin-login');
      return;
    }

    const couponsRef = ref(database, 'coupons');
    onValue(couponsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const couponsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setCoupons(couponsArray.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        setCoupons([]);
      }
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code.trim()) {
      toast({ title: 'Digite o código do cupom', variant: 'destructive' });
      return;
    }

    // Check if code already exists
    const codeExists = coupons.some(
      c => c.code.toLowerCase() === formData.code.toLowerCase()
    );
    if (codeExists) {
      toast({ title: 'Este código já existe', variant: 'destructive' });
      return;
    }

    try {
      const couponRef = push(ref(database, 'coupons'));
      await set(couponRef, {
        code: formData.code.toUpperCase(),
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minPurchase: formData.minPurchase,
        maxUses: formData.maxUses,
        usedCount: 0,
        expiresAt: formData.expiresAt || null,
        active: true,
        createdAt: new Date().toISOString(),
      });

      toast({ title: 'Cupom criado com sucesso!' });
      setShowModal(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao criar cupom', variant: 'destructive' });
    }
  };

  const toggleCouponStatus = async (coupon: Coupon) => {
    try {
      await set(ref(database, `coupons/${coupon.id}/active`), !coupon.active);
      toast({ title: coupon.active ? 'Cupom desativado' : 'Cupom ativado' });
    } catch (error) {
      toast({ title: 'Erro ao atualizar cupom', variant: 'destructive' });
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;
    
    try {
      await remove(ref(database, `coupons/${id}`));
      toast({ title: 'Cupom excluído' });
    } catch (error) {
      toast({ title: 'Erro ao excluir cupom', variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      minPurchase: 0,
      maxUses: 100,
      expiresAt: '',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="w-10 h-10 rounded-full bg-card flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Cupons de Desconto</h1>
      </div>

      <Button onClick={() => setShowModal(true)} className="w-full mb-6">
        <Plus className="w-4 h-4 mr-2" />
        Novo Cupom
      </Button>

      <div className="space-y-3">
        {coupons.map((coupon) => (
          <motion.div
            key={coupon.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-card rounded-xl p-4 ${!coupon.active || isExpired(coupon.expiresAt) ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${coupon.active ? 'bg-primary/10' : 'bg-muted'}`}>
                  <Ticket className={`w-5 h-5 ${coupon.active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="font-bold text-foreground tracking-wider">{coupon.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {coupon.discountType === 'percentage' 
                      ? `${coupon.discountValue}% de desconto`
                      : `${coupon.discountValue} MT de desconto`
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleCouponStatus(coupon)}
                >
                  {coupon.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteCoupon(coupon.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Usos: {coupon.usedCount}/{coupon.maxUses}</span>
              {coupon.minPurchase > 0 && <span>Mínimo: {coupon.minPurchase} MT</span>}
              {coupon.expiresAt && (
                <span className={isExpired(coupon.expiresAt) ? 'text-destructive' : ''}>
                  {isExpired(coupon.expiresAt) ? 'Expirado' : `Expira: ${new Date(coupon.expiresAt).toLocaleDateString()}`}
                </span>
              )}
            </div>
          </motion.div>
        ))}

        {coupons.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum cupom criado</p>
          </div>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cupom</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Código do Cupom
              </label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="EX: DESCONTO10"
                className="uppercase"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Tipo de Desconto
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.discountType === 'percentage' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, discountType: 'percentage' })}
                  className="flex-1"
                >
                  <Percent className="w-4 h-4 mr-2" />
                  Porcentagem
                </Button>
                <Button
                  type="button"
                  variant={formData.discountType === 'fixed' ? 'default' : 'outline'}
                  onClick={() => setFormData({ ...formData, discountType: 'fixed' })}
                  className="flex-1"
                >
                  Valor Fixo
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Valor do Desconto {formData.discountType === 'percentage' ? '(%)' : '(MT)'}
              </label>
              <Input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                min={0}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Compra Mínima (MT)
              </label>
              <Input
                type="number"
                value={formData.minPurchase}
                onChange={(e) => setFormData({ ...formData, minPurchase: Number(e.target.value) })}
                min={0}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Limite de Usos
              </label>
              <Input
                type="number"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })}
                min={1}
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Data de Expiração (opcional)
              </label>
              <Input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full">
              Criar Cupom
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;
