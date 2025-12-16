import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { ArrowLeft, Save, Loader2, Bell, Coins, MessageCircle, FileText, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Settings {
  creditsPerPurchase: number;
  autoMessageDelay: number;
  autoMessage: string;
  supportHours: string;
  termsAndConditions: string;
  primaryColor: string;
  notificationsEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  maintenanceEndTime: string;
}

const defaultSettings: Settings = {
  creditsPerPurchase: 10,
  autoMessageDelay: 60,
  autoMessage: 'Olá! Obrigado por entrar em contato. Estamos respondendo várias mensagens, por favor aguarde que responderemos já.',
  supportHours: '09:00 - 18:00',
  termsAndConditions: '',
  primaryColor: '#8B5CF6',
  notificationsEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: 'Estamos realizando uma manutenção no nosso servidor. Voltaremos em breve!',
  maintenanceEndTime: '',
};

const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('adminAuth')) {
      navigate('/admin-login');
      return;
    }

    onValue(ref(database, 'settings'), (snapshot) => {
      if (snapshot.exists()) {
        setSettings({ ...defaultSettings, ...snapshot.val() });
      }
    });
  }, [navigate]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await set(ref(database, 'settings'), settings);
      toast.success('Configurações salvas!');
    } catch (error) {
      toast.error('Erro ao salvar');
    }
    setLoading(false);
  };

  const settingSections = [
    {
      title: 'Manutenção',
      icon: Palette,
      fields: [
        {
          label: 'Modo de manutenção',
          key: 'maintenanceMode',
          type: 'checkbox',
          description: 'Ativar para colocar a loja em manutenção (exceto painel admin)',
        },
        {
          label: 'Mensagem de manutenção',
          key: 'maintenanceMessage',
          type: 'textarea',
          description: 'Mensagem exibida para os usuários durante a manutenção',
        },
        {
          label: 'Hora de término da manutenção',
          key: 'maintenanceEndTime',
          type: 'datetime-local',
          description: 'Data e hora prevista para o fim da manutenção',
        },
      ],
    },
    {
      title: 'Créditos',
      icon: Coins,
      fields: [
        {
          label: 'Créditos por compra',
          key: 'creditsPerPurchase',
          type: 'number',
          description: 'Quantidade de créditos ganhos por cada compra',
        },
      ],
    },
    {
      title: 'Suporte',
      icon: MessageCircle,
      fields: [
        {
          label: 'Tempo para mensagem automática (segundos)',
          key: 'autoMessageDelay',
          type: 'number',
          description: 'Tempo de espera antes de enviar resposta automática',
        },
        {
          label: 'Mensagem automática',
          key: 'autoMessage',
          type: 'textarea',
          description: 'Mensagem enviada quando admin não responde',
        },
        {
          label: 'Horário de atendimento',
          key: 'supportHours',
          type: 'text',
          description: 'Ex: 09:00 - 18:00',
        },
      ],
    },
    {
      title: 'Notificações',
      icon: Bell,
      fields: [
        {
          label: 'Notificações habilitadas',
          key: 'notificationsEnabled',
          type: 'checkbox',
          description: 'Enviar notificações push para usuários',
        },
      ],
    },
    {
      title: 'Termos e Condições',
      icon: FileText,
      fields: [
        {
          label: 'Termos e Condições',
          key: 'termsAndConditions',
          type: 'textarea',
          description: 'Texto dos termos de uso',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background p-4 safe-top pb-24">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Configurações</h1>
      </div>

      <div className="space-y-6">
        {settingSections.map((section) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">{section.title}</h2>
            </div>

            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label className="text-sm text-muted-foreground mb-1 block">{field.label}</label>
                  
                  {field.type === 'textarea' ? (
                    <textarea
                      value={(settings as any)[field.key] || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground resize-none h-24"
                    />
                  ) : field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(settings as any)[field.key]}
                        onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-input"
                      />
                      <span className="text-sm text-foreground">Ativado</span>
                    </label>
                  ) : field.type === 'datetime-local' ? (
                    <Input
                      type="datetime-local"
                      value={(settings as any)[field.key] || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      type={field.type}
                      value={(settings as any)[field.key] || ''}
                      onChange={(e) => setSettings(prev => ({ 
                        ...prev, 
                        [field.key]: field.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value 
                      }))}
                    />
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-border">
        <Button onClick={handleSave} className="w-full" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
