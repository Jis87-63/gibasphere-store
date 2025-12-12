import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, get, set, push } from 'firebase/database';
import { Gift, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PrizeData {
  id: string;
  prizeId: string;
  prizeName: string;
  prizeImage: string;
  userId: string;
  userName: string;
  claimed: boolean;
  createdAt: string;
}

// Form types based on product category
type FormType = 'streaming' | 'giftcard' | 'credits' | 'physical' | 'default';

const getFormType = (prizeName: string): FormType => {
  const name = prizeName.toLowerCase();
  
  // Streaming services
  if (name.includes('netflix') || name.includes('spotify') || name.includes('disney') || 
      name.includes('hbo') || name.includes('amazon prime') || name.includes('youtube premium') ||
      name.includes('deezer') || name.includes('apple music') || name.includes('paramount')) {
    return 'streaming';
  }
  
  // Gift cards
  if (name.includes('gift card') || name.includes('voucher') || name.includes('cartão presente') ||
      name.includes('playstation') || name.includes('xbox') || name.includes('steam') ||
      name.includes('google play') || name.includes('app store') || name.includes('itunes')) {
    return 'giftcard';
  }
  
  // Credits/Balance
  if (name.includes('crédito') || name.includes('saldo') || name.includes('recarga') ||
      name.includes('m-pesa') || name.includes('e-mola') || name.includes('mkesh') ||
      name.includes('airtime') || name.includes('dados') || name.includes('internet')) {
    return 'credits';
  }
  
  // Physical products
  if (name.includes('fone') || name.includes('headphone') || name.includes('celular') ||
      name.includes('smartphone') || name.includes('tablet') || name.includes('laptop') ||
      name.includes('tv') || name.includes('console') || name.includes('roupa') ||
      name.includes('tênis') || name.includes('relógio') || name.includes('acessório')) {
    return 'physical';
  }
  
  return 'default';
};

const getFormFields = (formType: FormType) => {
  switch (formType) {
    case 'streaming':
      return {
        title: 'Dados para ativação da conta',
        fields: [
          { name: 'email', label: 'Email para a conta', type: 'email', placeholder: 'seu@email.com' },
          { name: 'password', label: 'Senha desejada', type: 'password', placeholder: 'Crie uma senha segura' },
        ]
      };
    case 'giftcard':
      return {
        title: 'Dados para envio do código',
        fields: [
          { name: 'email', label: 'Email para receber o código', type: 'email', placeholder: 'seu@email.com' },
        ]
      };
    case 'credits':
      return {
        title: 'Dados para recarga',
        fields: [
          { name: 'phone', label: 'Número de telefone', type: 'tel', placeholder: '+258 84 XXX XXXX' },
          { name: 'operator', label: 'Operadora', type: 'text', placeholder: 'M-Pesa, E-Mola, Mkesh...' },
        ]
      };
    case 'physical':
      return {
        title: 'Dados para entrega',
        fields: [
          { name: 'fullName', label: 'Nome completo', type: 'text', placeholder: 'Seu nome completo' },
          { name: 'phone', label: 'Telefone de contato', type: 'tel', placeholder: '+258 84 XXX XXXX' },
          { name: 'province', label: 'Província', type: 'text', placeholder: 'Ex: Maputo' },
          { name: 'city', label: 'Cidade/Distrito', type: 'text', placeholder: 'Ex: Matola' },
          { name: 'address', label: 'Endereço completo', type: 'text', placeholder: 'Rua, número, bairro' },
          { name: 'reference', label: 'Ponto de referência', type: 'text', placeholder: 'Próximo a...' },
        ]
      };
    default:
      return {
        title: 'Dados para resgate',
        fields: [
          { name: 'email', label: 'Email', type: 'email', placeholder: 'seu@email.com' },
          { name: 'phone', label: 'Telefone', type: 'tel', placeholder: '+258 84 XXX XXXX' },
        ]
      };
  }
};

const RedeemPrize: React.FC = () => {
  const navigate = useNavigate();
  const { prizeId } = useParams<{ prizeId: string }>();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  const [prize, setPrize] = useState<PrizeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!prizeId) {
      navigate('/roleta');
      return;
    }

    const fetchPrize = async () => {
      const prizeRef = ref(database, `wonPrizes/${prizeId}`);
      const snapshot = await get(prizeRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        setPrize({ id: prizeId, ...data });
      } else {
        toast({
          title: 'Prêmio não encontrado',
          description: 'O prêmio que você está tentando resgatar não existe.',
          variant: 'destructive',
        });
        navigate('/roleta');
      }
      setLoading(false);
    };

    fetchPrize();
  }, [prizeId, navigate, toast]);

  const formType = prize ? getFormType(prize.prizeName) : 'default';
  const formConfig = getFormFields(formType);

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prize || !user) return;

    // Validate required fields
    const emptyFields = formConfig.fields.filter(field => !formData[field.name]?.trim());
    if (emptyFields.length > 0) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create redemption record
      const redemptionRef = push(ref(database, 'redemptions'));
      const redemptionId = redemptionRef.key;
      
      await set(redemptionRef, {
        id: redemptionId,
        prizeId: prize.id,
        prizeName: prize.prizeName,
        prizeImage: prize.prizeImage,
        userId: user.uid,
        userName: userData?.name || 'Usuário',
        userPhone: userData?.phone || '',
        formType,
        formData,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      // Mark prize as redeemed
      await set(ref(database, `wonPrizes/${prize.id}/redeemed`), true);
      await set(ref(database, `wonPrizes/${prize.id}/redemptionId`), redemptionId);

      setShowSuccess(true);
    } catch (error) {
      toast({
        title: 'Erro ao resgatar',
        description: 'Ocorreu um erro. Tente novamente.',
        variant: 'destructive',
      });
    }

    setSubmitting(false);
  };

  const Header = (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={() => navigate('/roleta')} className="p-2 -ml-2 text-muted-foreground">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-semibold text-foreground">Resgatar Prêmio</h1>
    </div>
  );

  if (loading) {
    return (
      <PageContainer header={Header}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  if (!prize) {
    return null;
  }

  return (
    <>
      <PageContainer header={Header}>
        <div className="max-w-md mx-auto py-6">
          {/* Prize Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 mb-6 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center overflow-hidden">
              {prize.prizeImage ? (
                <img 
                  src={prize.prizeImage} 
                  alt={prize.prizeName} 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <Gift className="w-10 h-10 text-primary" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {prize.prizeName}
            </h2>
            <p className="text-sm text-muted-foreground">
              ID: <span className="font-mono">{prize.id}</span>
            </p>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6"
          >
            <div className="bg-primary/10 text-primary rounded-lg p-3 mb-6">
              <p className="text-sm font-medium text-center">
                {formConfig.title}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formConfig.fields.map((field, index) => (
                <motion.div
                  key={field.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Label htmlFor={field.name} className="text-foreground">
                    {field.label}
                  </Label>
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="mt-1"
                  />
                </motion.div>
              ))}

              <Button
                type="submit"
                className="w-full mt-6"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Gift className="w-5 h-5 mr-2" />
                    Resgatar Prêmio
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </div>
      </PageContainer>

      {/* Success Dialog */}
      <AlertDialog open={showSuccess}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center"
              >
                <CheckCircle className="w-12 h-12 text-green-500" />
              </motion.div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              Sucesso no Resgate!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <p className="text-muted-foreground">
                Aguarde enquanto realizamos o seu resgate.
              </p>
              <div className="bg-secondary/50 rounded-lg p-4">
                <p className="text-sm text-foreground font-medium">
                  Sua conta <span className="text-primary">{prize.prizeName}</span> estará ativa em breve.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Você pode acompanhar o status no seu histórico.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-6">
            <Button
              onClick={() => navigate('/home')}
              className="w-full"
              size="lg"
            >
              Voltar para Tela Inicial
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RedeemPrize;
