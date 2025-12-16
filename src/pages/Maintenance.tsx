import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Wrench, Clock } from 'lucide-react';

const Maintenance: React.FC = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState('Estamos realizando uma manutenção no nosso servidor. Voltaremos em breve!');
  const [endTime, setEndTime] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Check if maintenance is still active
    const settingsRef = ref(database, 'settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const settings = snapshot.val();
        
        // If maintenance is disabled, redirect to home
        if (!settings.maintenanceMode) {
          navigate('/home');
          return;
        }
        
        if (settings.maintenanceMessage) {
          setMessage(settings.maintenanceMessage);
        }
        if (settings.maintenanceEndTime) {
          setEndTime(settings.maintenanceEndTime);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!endTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        // Check if maintenance ended
        window.location.reload();
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 safe-top">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-24 h-24 mx-auto mb-8 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <Wrench className="w-12 h-12 text-primary" />
        </motion.div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Em Manutenção
        </h1>

        {/* Message */}
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {message}
        </p>

        {/* Countdown */}
        {endTime && (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="w-4 h-4" />
              <span>Tempo estimado de retorno:</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="bg-card rounded-xl p-4 min-w-[70px]">
                <p className="text-3xl font-bold text-primary">
                  {String(timeLeft.hours).padStart(2, '0')}
                </p>
                <p className="text-xs text-muted-foreground">horas</p>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="bg-card rounded-xl p-4 min-w-[70px]">
                <p className="text-3xl font-bold text-primary">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </p>
                <p className="text-xs text-muted-foreground">minutos</p>
              </div>
              <span className="text-2xl font-bold text-muted-foreground">:</span>
              <div className="bg-card rounded-xl p-4 min-w-[70px]">
                <p className="text-3xl font-bold text-primary">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </p>
                <p className="text-xs text-muted-foreground">segundos</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar Animation */}
        <div className="w-full h-2 bg-card rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{ width: '30%' }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default Maintenance;
