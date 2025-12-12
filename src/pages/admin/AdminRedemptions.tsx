import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { ArrowLeft, Gift, Clock, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Redemption {
  id: string;
  prizeId: string;
  prizeName: string;
  prizeImage: string;
  userId: string;
  userName: string;
  userPhone: string;
  formType: string;
  formData: Record<string, string>;
  status: 'pending' | 'success' | 'rejected';
  createdAt: string;
}

const AdminRedemptions: React.FC = () => {
  const navigate = useNavigate();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [redemptionToDelete, setRedemptionToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'success' | 'rejected'>('pending');

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    const redemptionsRef = ref(database, 'redemptions');
    onValue(redemptionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .map(([id, value]: [string, any]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRedemptions(list);
      } else {
        setRedemptions([]);
      }
    });
  }, [navigate]);

  const updateStatus = async (redemptionId: string, status: 'success' | 'rejected') => {
    try {
      await set(ref(database, `redemptions/${redemptionId}/status`), status);
      await set(ref(database, `redemptions/${redemptionId}/updatedAt`), new Date().toISOString());
      toast.success(`Status atualizado para ${status === 'success' ? 'Sucesso' : 'Rejeitado'}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!redemptionToDelete) return;
    
    try {
      await remove(ref(database, `redemptions/${redemptionToDelete}`));
      toast.success('Resgate removido');
      setShowDeleteConfirm(false);
      setRedemptionToDelete(null);
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Sucesso';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Pendente';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFormFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Senha',
      phone: 'Telefone',
      operator: 'Operadora',
      fullName: 'Nome Completo',
      province: 'Província',
      city: 'Cidade',
      address: 'Endereço',
      reference: 'Referência',
    };
    return labels[key] || key;
  };

  const filteredRedemptions = redemptions.filter(r => r.status === activeTab);

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Resgates</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'success', 'rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground'
              }`}
            >
              {tab === 'pending' ? 'Pendentes' : tab === 'success' ? 'Sucesso' : 'Rejeitados'}
              {' '}({redemptions.filter(r => r.status === tab).length})
            </button>
          ))}
        </div>

        {/* Redemptions List */}
        <div className="space-y-3">
          {filteredRedemptions.map((redemption, index) => (
            <motion.div
              key={redemption.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-card rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {redemption.prizeImage ? (
                    <img 
                      src={redemption.prizeImage} 
                      alt={redemption.prizeName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <Gift className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {redemption.prizeName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {redemption.userName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(redemption.createdAt)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {getStatusIcon(redemption.status)}
                    <span className="text-xs">{getStatusText(redemption.status)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedRedemption(redemption);
                    setShowDetails(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Ver Detalhes
                </Button>
                {redemption.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => updateStatus(redemption.id, 'success')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => updateStatus(redemption.id, 'rejected')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setRedemptionToDelete(redemption.id);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}

          {filteredRedemptions.length === 0 && (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum resgate {activeTab === 'pending' ? 'pendente' : activeTab === 'success' ? 'aprovado' : 'rejeitado'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Resgate</DialogTitle>
          </DialogHeader>
          {selectedRedemption && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {selectedRedemption.prizeImage ? (
                    <img 
                      src={selectedRedemption.prizeImage} 
                      alt={selectedRedemption.prizeName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <Gift className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedRedemption.prizeName}</h3>
                  <p className="text-sm text-muted-foreground">ID: {selectedRedemption.prizeId}</p>
                </div>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground text-sm">Usuário</h4>
                <p className="text-sm text-muted-foreground">Nome: {selectedRedemption.userName}</p>
                <p className="text-sm text-muted-foreground">Telefone: {selectedRedemption.userPhone || 'N/A'}</p>
              </div>

              <div className="bg-secondary/50 rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground text-sm">Dados do Formulário</h4>
                {Object.entries(selectedRedemption.formData).map(([key, value]) => (
                  <p key={key} className="text-sm text-muted-foreground">
                    <span className="font-medium">{getFormFieldLabel(key)}:</span> {value}
                  </p>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-2">
                  {getStatusIcon(selectedRedemption.status)}
                  <span className="text-sm font-medium">{getStatusText(selectedRedemption.status)}</span>
                </div>
                {selectedRedemption.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        updateStatus(selectedRedemption.id, 'success');
                        setShowDetails(false);
                      }}
                    >
                      Aprovar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        updateStatus(selectedRedemption.id, 'rejected');
                        setShowDetails(false);
                      }}
                    >
                      Rejeitar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Resgate</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este resgate? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminRedemptions;
