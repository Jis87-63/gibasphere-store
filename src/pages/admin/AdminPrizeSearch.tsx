import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, get, push, set } from 'firebase/database';
import { ArrowLeft, Search, X, Gift, Phone, Calendar, MessageCircle, Copy, Trophy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WonPrize {
  id: string;
  prizeId: string;
  prizeName: string;
  prizeImage: string;
  userId: string;
  userName: string;
  userPhone: string;
  createdAt: string;
  claimed: boolean;
}

const AdminPrizeSearch: React.FC = () => {
  const navigate = useNavigate();
  const [searchId, setSearchId] = useState('');
  const [wonPrizes, setWonPrizes] = useState<WonPrize[]>([]);
  const [selectedPrize, setSelectedPrize] = useState<WonPrize | null>(null);
  const [searchResult, setSearchResult] = useState<WonPrize | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    // Load all won prizes
    onValue(ref(database, 'wonPrizes'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setWonPrizes(list.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    });
  }, [navigate]);

  const handleSearch = () => {
    if (!searchId.trim()) {
      toast.error('Digite o ID do prêmio');
      return;
    }

    const found = wonPrizes.find(p => p.id === searchId.trim());
    if (found) {
      setSearchResult(found);
      setNotFound(false);
    } else {
      setSearchResult(null);
      setNotFound(true);
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('ID copiado!');
  };

  const handleSendMessage = async (prize: WonPrize) => {
    // Navigate to chat and find the user
    try {
      // Get user sessions
      const sessionsSnap = await get(ref(database, `supportSessions/${prize.userId}`));
      if (sessionsSnap.exists()) {
        const sessions = sessionsSnap.val();
        const activeSession = Object.entries(sessions).find(
          ([, value]: [string, any]) => value.status === 'active'
        );

        if (activeSession) {
          const [sessionId] = activeSession;
          // Send congratulations message
          const messageRef = push(ref(database, `supportMessages/${prize.userId}/${sessionId}`));
          await set(messageRef, {
            text: `🎉 Parabéns ${prize.userName}! Seu prêmio "${prize.prizeName}" foi confirmado. ID: ${prize.id}`,
            sender: 'admin',
            senderName: 'Roleta.winner',
            createdAt: new Date().toISOString(),
            status: 'sent',
          });
          toast.success('Mensagem enviada!');
          navigate('/admin/chat');
        } else {
          toast.error('Usuário não tem sessão ativa');
        }
      } else {
        toast.error('Sessão de chat não encontrada');
      }
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-MZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/roleta')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Prêmios Ganhos</h1>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <Input
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Digite o ID do prêmio..."
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} size="icon">
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Result */}
      {searchResult && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-primary" />
            <span className="font-medium text-primary">Prêmio Encontrado</span>
          </div>
          <button 
            onClick={() => setSelectedPrize(searchResult)}
            className="w-full text-left"
          >
            <p className="font-semibold text-foreground">{searchResult.prizeName}</p>
            <p className="text-sm text-muted-foreground">{searchResult.userName}</p>
          </button>
        </motion.div>
      )}

      {notFound && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-6 text-center">
          <p className="text-destructive">Prêmio não encontrado</p>
        </div>
      )}

      {/* Recent Prizes */}
      <h2 className="text-sm font-medium text-muted-foreground mb-3">
        Prêmios Recentes ({wonPrizes.length})
      </h2>

      <div className="space-y-3">
        {wonPrizes.slice(0, 20).map((prize) => (
          <motion.button
            key={prize.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelectedPrize(prize)}
            className="w-full bg-card rounded-xl p-4 text-left"
          >
            <div className="flex items-center gap-3">
              {prize.prizeImage ? (
                <img 
                  src={prize.prizeImage} 
                  alt={prize.prizeName}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground truncate">{prize.prizeName}</h3>
                <p className="text-sm text-muted-foreground">{prize.userName}</p>
                <p className="text-xs text-muted-foreground">{formatDate(prize.createdAt)}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                prize.claimed 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-yellow-500/20 text-yellow-500'
              }`}>
                {prize.claimed ? 'Reclamado' : 'Pendente'}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {wonPrizes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum prêmio ganho ainda
        </div>
      )}

      {/* Prize Details Modal */}
      <AnimatePresence>
        {selectedPrize && (
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
              className="bg-card w-full rounded-t-3xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">Detalhes do Prêmio</h2>
                <button onClick={() => setSelectedPrize(null)} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Prize Info */}
                <div className="flex items-center gap-4 bg-secondary/50 rounded-xl p-4">
                  {selectedPrize.prizeImage ? (
                    <img 
                      src={selectedPrize.prizeImage} 
                      alt={selectedPrize.prizeName}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Gift className="w-8 h-8 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedPrize.prizeName}</h3>
                    <button 
                      onClick={() => handleCopyId(selectedPrize.id)}
                      className="flex items-center gap-1 text-xs text-primary mt-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>ID: {selectedPrize.id}</span>
                    </button>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-center gap-3 text-foreground">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span>{formatDate(selectedPrize.createdAt)}</span>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 text-foreground">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span>{selectedPrize.userPhone || 'Não informado'}</span>
                </div>

                {/* User Name */}
                <div className="bg-secondary/50 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground">Vencedor</p>
                  <p className="font-medium text-foreground">{selectedPrize.userName}</p>
                </div>

                {/* Send Message Button */}
                <Button 
                  onClick={() => handleSendMessage(selectedPrize)}
                  className="w-full"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Enviar Mensagem ao Vencedor
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPrizeSearch;
