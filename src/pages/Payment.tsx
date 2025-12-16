import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, get, set, push, update } from 'firebase/database';
import { gibrapay } from '@/lib/gibrapay';
import { ArrowLeft, Loader2, CheckCircle, XCircle, Phone, Ticket, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  image: string;
  realPrice: number;
}

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  active: boolean;
}

type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userData, updateUserCredits } = useAuth();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [phone, setPhone] = useState(userData?.phone || '');
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [creditsPerPurchase, setCreditsPerPurchase] = useState(10);
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCouponSection, setShowCouponSection] = useState(false);
  
  // Promotion state
  const [promotionDiscount, setPromotionDiscount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      // Fetch product
      const productRef = ref(database, `products/${id}`);
      const productSnapshot = await get(productRef);
      if (productSnapshot.exists()) {
        const productData = { id, ...productSnapshot.val() };
        setProduct(productData);
        
        // Check if product has active promotion
        if (productData.promotion) {
          const promotionsRef = ref(database, 'promotions');
          const promotionsSnapshot = await get(promotionsRef);
          if (promotionsSnapshot.exists()) {
            const promotions = promotionsSnapshot.val();
            Object.values(promotions).forEach((promo: any) => {
              if (promo.productId === id && new Date(promo.endTime) > new Date()) {
                setPromotionDiscount(promo.discount || 0);
              }
            });
          }
        }
      }

      // Fetch settings for credits per purchase
      const settingsRef = ref(database, 'settings/creditsPerPurchase');
      const settingsSnapshot = await get(settingsRef);
      if (settingsSnapshot.exists()) {
        setCreditsPerPurchase(settingsSnapshot.val());
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: 'Digite um código de cupom', variant: 'destructive' });
      return;
    }

    setCouponLoading(true);

    try {
      const couponsRef = ref(database, 'coupons');
      const snapshot = await get(couponsRef);
      
      if (!snapshot.exists()) {
        toast({ title: 'Cupom inválido', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      const coupons = snapshot.val();
      let foundCoupon: Coupon | null = null;

      for (const [id, coupon] of Object.entries(coupons) as [string, any][]) {
        if (coupon.code.toLowerCase() === couponCode.toLowerCase()) {
          foundCoupon = { id, ...coupon };
          break;
        }
      }

      if (!foundCoupon) {
        toast({ title: 'Cupom não encontrado', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check if coupon is active
      if (!foundCoupon.active) {
        toast({ title: 'Este cupom está desativado', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check expiration
      if (foundCoupon.expiresAt && new Date(foundCoupon.expiresAt) < new Date()) {
        toast({ title: 'Este cupom expirou', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check usage limit
      if (foundCoupon.usedCount >= foundCoupon.maxUses) {
        toast({ title: 'Este cupom atingiu o limite de usos', variant: 'destructive' });
        setCouponLoading(false);
        return;
      }

      // Check minimum purchase
      const basePrice = product?.realPrice || 0;
      if (basePrice < foundCoupon.minPurchase) {
        toast({ 
          title: `Compra mínima de ${foundCoupon.minPurchase} MT`, 
          variant: 'destructive' 
        });
        setCouponLoading(false);
        return;
      }

      setAppliedCoupon(foundCoupon);
      setCouponCode('');
      toast({ title: 'Cupom aplicado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao aplicar cupom', variant: 'destructive' });
    }

    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  const calculateCouponDiscount = () => {
    if (!appliedCoupon || !product) return 0;
    
    const basePrice = product.realPrice;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((basePrice * appliedCoupon.discountValue) / 100);
    }
    return Math.min(appliedCoupon.discountValue, basePrice);
  };

  // Calculate promotion discount first
  const promoDiscountAmount = product ? Math.round((product.realPrice * promotionDiscount) / 100) : 0;
  const priceAfterPromotion = product ? product.realPrice - promoDiscountAmount : 0;
  
  // Then calculate coupon discount on the promotion price
  const couponDiscountAmount = calculateCouponDiscount();
  const totalDiscount = promoDiscountAmount + couponDiscountAmount;
  const storePrice = product ? Math.max(0, product.realPrice - totalDiscount) : 0;

  const handlePayment = async () => {
    if (!user || !product) return;

    // Validate phone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 9) {
      toast({
        title: 'Número inválido',
        description: 'Insira um número de telefone válido.',
        variant: 'destructive',
      });
      return;
    }

    setStatus('processing');

    try {
      // Call GibraPay API
      const response = await gibrapay.transfer({
        amount: storePrice,
        number_phone: cleanPhone,
      });

      // Record transaction
      const transactionRef = push(ref(database, `transactions/${user.uid}`));
      await set(transactionRef, {
        productId: product.id,
        productName: product.name,
        amount: storePrice,
        originalPrice: product.realPrice,
        discount: totalDiscount,
        couponCode: appliedCoupon?.code || null,
        phone: cleanPhone,
        status: response.status === 'success' ? 'success' : 'failed',
        transactionId: response.data?.id || null,
        message: response.message,
        createdAt: new Date().toISOString(),
      });

      if (response.status === 'success') {
        // Update coupon usage count
        if (appliedCoupon) {
          await update(ref(database, `coupons/${appliedCoupon.id}`), {
            usedCount: appliedCoupon.usedCount + 1,
          });
        }

        // Record purchase
        const purchaseRef = push(ref(database, `purchases/${user.uid}`));
        await set(purchaseRef, {
          productId: product.id,
          productName: product.name,
          amount: storePrice,
          originalPrice: product.realPrice,
          discount: totalDiscount,
          couponCode: appliedCoupon?.code || null,
          paymentMethod: 'mpesa',
          transactionId: response.data?.id,
          status: 'success',
          createdAt: new Date().toISOString(),
        });

        // Add credits
        await updateUserCredits(creditsPerPurchase);

        setStatus('success');
        toast({
          title: 'Pagamento confirmado!',
          description: `Você ganhou ${creditsPerPurchase} créditos.`,
        });
      } else {
        setStatus('failed');
        toast({
          title: 'Pagamento falhou',
          description: response.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      setStatus('failed');
      
      // Record failed transaction
      const transactionRef = push(ref(database, `transactions/${user.uid}`));
      await set(transactionRef, {
        productId: product.id,
        productName: product.name,
        amount: storePrice,
        phone: phone,
        status: 'failed',
        message: 'Erro de conexão',
        createdAt: new Date().toISOString(),
      });

      toast({
        title: 'Erro',
        description: 'Não foi possível processar o pagamento.',
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

  const Header = (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-semibold text-foreground">Pagamento</h1>
    </div>
  );

  return (
    <PageContainer header={Header} showNav={false}>
      {status === 'idle' && product && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Product Summary */}
          <div className="bg-card rounded-xl p-4 mb-6">
            <div className="flex gap-4">
              <img
                src={product.image}
                alt={product.name}
                className="w-20 h-20 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{product.name}</h3>
                <p className="text-2xl font-bold text-primary mt-1">
                  {storePrice} MT
                </p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">
                Número M-Pesa
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="84 123 4567"
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O pagamento será enviado para este número via M-Pesa
              </p>
            </div>

            {/* Coupon Section */}
            <div className="bg-card rounded-xl overflow-hidden">
              {!showCouponSection ? (
                <button
                  onClick={() => setShowCouponSection(true)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-primary font-medium">
                    <Ticket className="w-4 h-4" />
                    Usar cupom de desconto?
                  </span>
                  <span className="text-muted-foreground text-sm">Clique aqui</span>
                </button>
              ) : (
                <div className="p-4">
                  <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                    <Ticket className="w-4 h-4" />
                    Cupom de Desconto
                  </h4>
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-primary">{appliedCoupon.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {appliedCoupon.discountType === 'percentage'
                            ? `${appliedCoupon.discountValue}% de desconto`
                            : `${appliedCoupon.discountValue} MT de desconto`
                          }
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={removeCoupon}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Digite o código"
                        className="uppercase"
                      />
                      <Button 
                        variant="outline" 
                        onClick={applyCoupon}
                        disabled={couponLoading}
                      >
                        {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-card rounded-xl p-4">
              <h4 className="font-medium text-foreground mb-3">Resumo</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produto</span>
                  <span className="text-foreground">{product.realPrice} MT</span>
                </div>
                {promoDiscountAmount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Promoção (-{promotionDiscount}%)</span>
                    <span>-{promoDiscountAmount} MT</span>
                  </div>
                )}
                {couponDiscountAmount > 0 && (
                  <div className="flex justify-between text-primary">
                    <span>Cupom ({appliedCoupon?.code})</span>
                    <span>-{couponDiscountAmount} MT</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa</span>
                  <span className="text-foreground">0 MT</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">{storePrice} MT</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 rounded-xl p-4 text-center">
              <p className="text-sm text-primary">
                🎁 Ganhe {creditsPerPurchase} créditos com esta compra!
              </p>
            </div>

            <Button onClick={handlePayment} className="w-full" size="lg">
              Pagar {storePrice} MT
            </Button>
          </div>
        </motion.div>
      )}

      {status === 'processing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Processando pagamento...
          </h2>
          <p className="text-muted-foreground text-center">
            Aguarde enquanto confirmamos seu pagamento via M-Pesa
          </p>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-glow">
            <CheckCircle className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Pagamento Confirmado!
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Você ganhou {creditsPerPurchase} créditos
          </p>
          <Button onClick={() => navigate('/home')} size="lg">
            Voltar ao Início
          </Button>
        </motion.div>
      )}

      {status === 'failed' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <XCircle className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Pagamento Falhou
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Não foi possível processar seu pagamento
          </p>
          <div className="flex gap-3">
            <Button onClick={() => setStatus('idle')} variant="outline">
              Tentar Novamente
            </Button>
            <Button onClick={() => navigate('/home')}>
              Voltar ao Início
            </Button>
          </div>
        </motion.div>
      )}
    </PageContainer>
  );
};

export default Payment;
