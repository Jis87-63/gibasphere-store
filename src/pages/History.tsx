import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { useAuth } from '@/contexts/AuthContext';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { ShoppingBag, Receipt, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Purchase {
  id: string;
  productName: string;
  amount: number;
  status: string;
  createdAt: string;
  paymentMethod: string;
}

interface Transaction {
  id: string;
  productName: string;
  amount: number;
  status: string;
  createdAt: string;
  message?: string;
}

const History: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'purchases' | 'transactions'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (!user) return;

    const purchasesRef = ref(database, `purchases/${user.uid}`);
    onValue(purchasesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const purchasesArray = Object.entries(data)
          .map(([id, value]: [string, any]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPurchases(purchasesArray);
      }
    });

    const transactionsRef = ref(database, `transactions/${user.uid}`);
    onValue(transactionsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const transactionsArray = Object.entries(data)
          .map(([id, value]: [string, any]) => ({ id, ...value }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setTransactions(transactionsArray);
      }
    });
  }, [user]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-destructive" />;
      default:
        return <Clock className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Sucesso';
      case 'failed':
        return 'Falhou';
      default:
        return 'Pendente';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-MZ', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const Header = (
    <div className="px-4 py-3">
      <h1 className="text-xl font-semibold text-foreground mb-4">Histórico</h1>
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'purchases'
              ? 'gradient-primary text-primary-foreground'
              : 'bg-card text-muted-foreground'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Compras
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'transactions'
              ? 'gradient-primary text-primary-foreground'
              : 'bg-card text-muted-foreground'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Transações
        </button>
      </div>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {activeTab === 'purchases' && (
          <div className="space-y-3">
            {purchases.length > 0 ? (
              purchases.map((purchase, index) => (
                <motion.div
                  key={purchase.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{purchase.productName}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDate(purchase.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Via {purchase.paymentMethod === 'credits' ? 'Créditos' : 'M-Pesa'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{purchase.amount} MT</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getStatusIcon(purchase.status)}
                        <span className="text-xs">{getStatusText(purchase.status)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma compra ainda</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-card rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-foreground">{transaction.productName}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {formatDate(transaction.createdAt)}
                      </p>
                      {transaction.message && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {transaction.message}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{transaction.amount} MT</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getStatusIcon(transaction.status)}
                        <span className="text-xs">{getStatusText(transaction.status)}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma transação ainda</p>
              </div>
            )}
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default History;
