import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Lock } from 'lucide-react';

const ADMIN_CODE = 'MADARA08';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ADMIN_CODE) {
      localStorage.setItem('adminAuth', 'true');
      navigate('/admin');
    } else {
      toast({ title: 'Código inválido', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-8">
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm mx-auto flex-1 flex flex-col justify-center">
        <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-center text-foreground mb-2">Painel Admin</h1>
        <p className="text-muted-foreground text-center mb-8">Digite o código de acesso</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código de autorização" type="password" className="text-center text-lg tracking-widest" />
          <Button type="submit" className="w-full" size="lg">Acessar</Button>
        </form>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
