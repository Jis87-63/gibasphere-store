import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { ArrowLeft, Search, Ban, CheckCircle, Coins, History, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface User {
  uid: string;
  name: string;
  email: string;
  phone: string;
  credits: number;
  isBanned: boolean;
  createdAt: string;
}

interface Purchase {
  id: string;
  productName: string;
  amount: number;
  date: string;
}

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userHistory, setUserHistory] = useState<Purchase[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'users'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([uid, value]: [string, any]) => ({ uid, ...value }));
        setUsers(list);
      }
    });
  }, [navigate]);

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.phone?.includes(searchQuery)
  );

  const handleToggleBan = async (user: User) => {
    try {
      await set(ref(database, `users/${user.uid}/isBanned`), !user.isBanned);
      toast.success(user.isBanned ? 'Usuário desbloqueado!' : 'Usuário bloqueado!');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser || !creditAmount) return;
    
    setLoading(true);
    try {
      const newCredits = (selectedUser.credits || 0) + parseInt(creditAmount);
      await set(ref(database, `users/${selectedUser.uid}/credits`), newCredits);
      toast.success('Créditos adicionados!');
      setCreditAmount('');
    } catch (error) {
      toast.error('Erro ao adicionar créditos');
    }
    setLoading(false);
  };

  const loadUserHistory = (user: User) => {
    setSelectedUser(user);
    onValue(ref(database, `purchases/${user.uid}`), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserHistory(Object.entries(data).map(([id, value]: [string, any]) => ({ id, ...value })));
      } else {
        setUserHistory([]);
      }
    }, { onlyOnce: true });
    setShowHistory(true);
  };

  return (
    <div className="min-h-screen bg-background p-4 safe-top">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Usuários</h1>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar usuário..."
          className="pl-10"
        />
      </div>

      <div className="text-sm text-muted-foreground mb-3">
        {filteredUsers.length} usuário(s)
      </div>

      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-card rounded-xl p-4 ${user.isBanned ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-foreground truncate">{user.name || 'Sem nome'}</h3>
                  {user.isBanned && <Ban className="w-4 h-4 text-destructive" />}
                </div>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <p className="text-sm text-muted-foreground">{user.phone}</p>
                <div className="flex items-center gap-1 mt-1 text-primary">
                  <Coins className="w-3 h-3" />
                  <span className="text-sm font-medium">{user.credits || 0} créditos</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleBan(user)}
                className={user.isBanned ? 'text-green-500' : 'text-destructive'}
              >
                {user.isBanned ? <CheckCircle className="w-4 h-4 mr-1" /> : <Ban className="w-4 h-4 mr-1" />}
                {user.isBanned ? 'Desbloquear' : 'Bloquear'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => loadUserHistory(user)}
              >
                <History className="w-4 h-4 mr-1" /> Histórico
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setSelectedUser(user); setShowHistory(false); }}
              >
                <Coins className="w-4 h-4 mr-1" /> Créditos
              </Button>
            </div>
          </motion.div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum usuário encontrado
          </div>
        )}
      </div>

      {/* Credits Modal */}
      <AnimatePresence>
        {selectedUser && !showHistory && (
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
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Adicionar Créditos</h2>
                  <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-background/50 rounded-xl p-4 mb-4 text-center">
                <p className="text-sm text-muted-foreground">Saldo atual</p>
                <p className="text-3xl font-bold text-primary">{selectedUser.credits || 0}</p>
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Quantidade"
                  className="flex-1"
                />
                <Button onClick={handleAddCredits} disabled={loading || !creditAmount}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && selectedUser && (
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
              className="bg-card w-full max-h-[80vh] rounded-t-3xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Histórico</h2>
                  <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                </div>
                <button onClick={() => { setShowHistory(false); setSelectedUser(null); }} className="p-2 text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {userHistory.length > 0 ? (
                <div className="space-y-3">
                  {userHistory.map((purchase) => (
                    <div key={purchase.id} className="bg-background/50 rounded-xl p-3">
                      <p className="font-medium text-foreground">{purchase.productName}</p>
                      <div className="flex justify-between text-sm text-muted-foreground mt-1">
                        <span>{purchase.amount} MT</span>
                        <span>{new Date(purchase.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma compra encontrada
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
