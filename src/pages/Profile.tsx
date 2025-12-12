import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, update } from 'firebase/database';
import { 
  User, 
  Coins, 
  Settings, 
  LogOut, 
  ChevronRight, 
  Edit2,
  FileText,
  Clock,
  Bell
} from 'lucide-react';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData, signOut } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userData?.name || '');
  const [phone, setPhone] = useState(userData?.phone || '');

  const handleSave = async () => {
    if (!user) return;

    try {
      await update(ref(database, `users/${user.uid}`), {
        name,
        phone,
      });
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas.',
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível sair.',
        variant: 'destructive',
      });
    }
  };

  const menuItems = [
    { icon: Coins, label: 'Meus Créditos', path: '/creditos', value: `${userData?.credits || 0} créditos` },
    { icon: Clock, label: 'Histórico', path: '/historico' },
    { icon: Bell, label: 'Avisos', path: '/mensagens' },
    { icon: FileText, label: 'Termos & Políticas', path: '/termos-politicas' },
  ];

  const Header = (
    <div className="px-4 py-3">
      <h1 className="text-xl font-semibold text-foreground">Perfil</h1>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-6 mb-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
              {userData?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nome"
                  />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Telefone"
                  />
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-foreground">
                    {userData?.name || 'Usuário'}
                  </h2>
                  <p className="text-sm text-muted-foreground">{userData?.email}</p>
                  <p className="text-sm text-muted-foreground">{userData?.phone}</p>
                </>
              )}
            </div>
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {isEditing && (
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSave} className="flex-1">
                Salvar
              </Button>
            </div>
          )}
        </motion.div>

        {/* Menu */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl overflow-hidden mb-6"
        >
          {menuItems.map((item, index) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center justify-between p-4 hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {item.value && <span className="text-sm">{item.value}</span>}
                <ChevronRight className="w-5 h-5" />
              </div>
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </motion.div>
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default Profile;
