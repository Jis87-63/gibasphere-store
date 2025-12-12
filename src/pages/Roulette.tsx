import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, get, set, push, onValue } from 'firebase/database';
import { Coins, RotateCcw, Trophy, Sparkles, Copy, Gift } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Prize {
  id: string;
  name: string;
  image: string;
  probability: number;
}

interface WonPrizeData {
  prizeId: string;
  id: string;
  prizeName: string;
  prizeImage: string;
}

// Audio context reference for cleanup
let audioContextRef: AudioContext | null = null;

const Roulette: React.FC = () => {
  const navigate = useNavigate();
  const { user, userData, updateUserCredits } = useAuth();
  const { toast } = useToast();
  
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinCost, setSpinCost] = useState(10);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [slots, setSlots] = useState<number[]>([0, 0, 0]);
  const [slotOffsets, setSlotOffsets] = useState<number[]>([0, 0, 0]);
  const [wonPrize, setWonPrize] = useState<WonPrizeData | null>(null);
  const [showWinDialog, setShowWinDialog] = useState(false);

  useEffect(() => {
    // Load prizes from roulettePrizes (admin configured)
    const prizesRef = ref(database, 'roulettePrizes');
    onValue(prizesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const prizesArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          name: value.name,
          image: value.image,
          probability: value.probability || 10,
        }));
        setPrizes(prizesArray);
      }
    });

    // Load spin cost
    const costRef = ref(database, 'settings/rouletteSpinCost');
    onValue(costRef, (snapshot) => {
      if (snapshot.exists()) {
        setSpinCost(snapshot.val());
      }
    });

    // Cleanup audio on unmount
    return () => {
      if (audioContextRef) {
        audioContextRef.close();
        audioContextRef = null;
      }
    };
  }, []);

  const playWinSound = () => {
    if (audioContextRef) {
      audioContextRef.close();
    }
    
    audioContextRef = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    notes.forEach((freq, i) => {
      const oscillator = audioContextRef!.createOscillator();
      const gainNode = audioContextRef!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef!.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      const startTime = audioContextRef!.currentTime + (i * 0.15);
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  };

  const playLoseSound = () => {
    if (audioContextRef) {
      audioContextRef.close();
    }
    
    audioContextRef = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const oscillator = audioContextRef.createOscillator();
    const gainNode = audioContextRef.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.destination);
    
    oscillator.frequency.setValueAtTime(300, audioContextRef.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioContextRef.currentTime + 0.5);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.2, audioContextRef.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(audioContextRef.currentTime + 0.5);
  };

  const generatePrizeId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PRIZE-${timestamp}-${random}`.toUpperCase();
  };

  const spin = async () => {
    if (!user || !userData) return;

    if (userData.credits < spinCost) {
      toast({
        title: 'Créditos insuficientes',
        description: `Você precisa de ${spinCost} créditos para girar.`,
        variant: 'destructive',
      });
      return;
    }

    if (prizes.length === 0) {
      toast({
        title: 'Sem prêmios',
        description: 'Nenhum prêmio configurado na roleta.',
        variant: 'destructive',
      });
      return;
    }

    // Stop any playing audio
    if (audioContextRef) {
      audioContextRef.close();
      audioContextRef = null;
    }

    setIsSpinning(true);
    setShowResult(false);
    setWonPrize(null);

    // Deduct credits
    await updateUserCredits(-spinCost);

    // Generate results using probability-based selection
    const selectPrize = (): number => {
      const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
      let random = Math.random() * totalProbability;
      
      for (let i = 0; i < prizes.length; i++) {
        random -= prizes[i].probability;
        if (random <= 0) return i;
      }
      return prizes.length - 1;
    };

    const results = [selectPrize(), selectPrize(), selectPrize()];

    // Animate slots with smoother animation
    const animationDuration = 2500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Easing function - starts fast, slows down
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      if (progress < 1) {
        // During animation, show random slots with smooth offset
        const speed = (1 - easeOut) * 20;
        setSlotOffsets([
          Math.sin(elapsed * 0.02) * speed,
          Math.sin(elapsed * 0.025) * speed,
          Math.sin(elapsed * 0.03) * speed,
        ]);
        setSlots([
          Math.floor(Math.random() * prizes.length),
          Math.floor(Math.random() * prizes.length),
          Math.floor(Math.random() * prizes.length),
        ]);
        requestAnimationFrame(animate);
      } else {
        // Final results
        setSlotOffsets([0, 0, 0]);
        setSlots(results);
        finishSpin(results);
      }
    };

    requestAnimationFrame(animate);
  };

  const finishSpin = async (results: number[]) => {
    setIsSpinning(false);

    const resultPrizes = results.map((idx) => prizes[idx]);
    setResult(resultPrizes.map((p) => p.name));

    // Check if winner (3 matching)
    const isWinner = results[0] === results[1] && results[1] === results[2];

    // Play result sound
    if (isWinner) {
      playWinSound();
      
      // Generate prize ID and save
      const prizeId = generatePrizeId();
      const wonPrizeData = {
        id: prizeId,
        prizeId: resultPrizes[0].id,
        prizeName: resultPrizes[0].name,
        prizeImage: resultPrizes[0].image,
        userId: user!.uid,
        userName: userData?.name || 'Usuário',
        userPhone: userData?.phone || '',
        createdAt: new Date().toISOString(),
        claimed: false,
      };

      // Save to wonPrizes
      await set(ref(database, `wonPrizes/${prizeId}`), wonPrizeData);

      setWonPrize({
        id: prizeId,
        prizeId: resultPrizes[0].id,
        prizeName: resultPrizes[0].name,
        prizeImage: resultPrizes[0].image,
      });
      setShowWinDialog(true);
    } else {
      playLoseSound();
    }

    // Record spin
    const spinRef = push(ref(database, `roulette/spins/${user!.uid}`));
    await set(spinRef, {
      results: resultPrizes.map((p) => p.id),
      isWinner,
      prize: isWinner ? resultPrizes[0].name : null,
      prizeId: isWinner ? wonPrize?.id : null,
      creditsSpent: spinCost,
      createdAt: new Date().toISOString(),
    });

    setShowResult(true);

    if (!isWinner) {
      toast({
        title: 'Que pena!',
        description: 'Tente novamente para ter sorte!',
        variant: 'destructive',
      });
    }
  };

  const handleCopyPrizeId = () => {
    if (wonPrize) {
      navigator.clipboard.writeText(wonPrize.id);
      toast({
        title: 'ID copiado!',
        description: 'O ID do prêmio foi copiado para a área de transferência.',
      });
    }
  };

  const handleClaimPrize = () => {
    if (!wonPrize) return;
    
    setShowWinDialog(false);
    
    // Navigate to redemption page instead of sending message to support
    navigate(`/resgatar/${wonPrize.id}`);
  };

  const Header = (
    <div className="flex items-center justify-between px-4 py-3">
      <h1 className="text-xl font-semibold text-foreground">Roleta da Sorte</h1>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
        <Coins className="w-4 h-4" />
        {userData?.credits || 0}
      </div>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        <div className="flex flex-col items-center py-8">
          {/* Slot Machine */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-elevated mb-8"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-warning" />
              <h2 className="text-lg font-semibold text-foreground">Slot Machine</h2>
            </div>

            {/* Slots */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2].map((slotIndex) => (
                <motion.div
                  key={slotIndex}
                  animate={{
                    y: slotOffsets[slotIndex],
                    scale: isSpinning ? [1, 1.02, 1] : 1,
                  }}
                  transition={{
                    y: { duration: 0.1 },
                    scale: { duration: 0.2, repeat: isSpinning ? Infinity : 0 },
                  }}
                  className="w-20 h-20 rounded-2xl bg-secondary border-2 border-border overflow-hidden shadow-lg"
                >
                  <AnimatePresence mode="wait">
                    {prizes.length > 0 && (
                      <motion.div
                        key={`${slotIndex}-${slots[slotIndex]}`}
                        initial={{ y: -80, opacity: 0, rotateX: -90 }}
                        animate={{ y: 0, opacity: 1, rotateX: 0 }}
                        exit={{ y: 80, opacity: 0, rotateX: 90 }}
                        transition={{ 
                          duration: isSpinning ? 0.08 : 0.3,
                          ease: isSpinning ? "linear" : "easeOut"
                        }}
                        className="w-full h-full flex items-center justify-center p-2"
                      >
                        <img
                          src={prizes[slots[slotIndex]]?.image}
                          alt="Prize"
                          className="w-14 h-14 object-cover rounded-full border-2 border-primary/20"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Result Message */}
            <AnimatePresence>
              {showResult && result && !showWinDialog && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`text-center p-4 rounded-xl mb-6 ${
                    result[0] === result[1] && result[1] === result[2]
                      ? 'bg-primary/10 text-primary'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {result[0] === result[1] && result[1] === result[2] ? (
                    <motion.div 
                      initial={{ scale: 0.5 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-5 h-5" />
                      <span className="font-semibold">Você ganhou: {result[0]}!</span>
                    </motion.div>
                  ) : (
                    <span>Não foi dessa vez. Tente novamente!</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Spin Button */}
            <Button
              onClick={spin}
              disabled={isSpinning || !user || (userData?.credits || 0) < spinCost}
              className="w-full"
              size="lg"
            >
              {isSpinning ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                  className="flex items-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Girando...
                </motion.div>
              ) : (
                <>
                  <Coins className="w-5 h-5 mr-2" />
                  Girar ({spinCost} créditos)
                </>
              )}
            </Button>
          </motion.div>

          {/* Info */}
          <div className="w-full max-w-sm space-y-4">
            <div className="bg-card rounded-xl p-4">
              <h3 className="font-medium text-foreground mb-2">Como jogar</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cada giro custa {spinCost} créditos</li>
                <li>• Combine 3 símbolos iguais para ganhar</li>
                <li>• Os prêmios variam conforme os símbolos</li>
              </ul>
            </div>

            {/* Prizes Preview */}
            {prizes.length > 0 && (
              <div className="bg-card rounded-xl p-4">
                <h3 className="font-medium text-foreground mb-3">Prêmios disponíveis</h3>
                <div className="grid grid-cols-4 gap-2">
                  {prizes.slice(0, 8).map((prize) => (
                    <div
                      key={prize.id}
                      className="aspect-square rounded-full bg-secondary p-1.5 flex items-center justify-center"
                    >
                      <img
                        src={prize.image}
                        alt={prize.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PageContainer>

      {/* Win Dialog */}
      <AlertDialog open={showWinDialog} onOpenChange={setShowWinDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                {wonPrize?.prizeImage ? (
                  <img 
                    src={wonPrize.prizeImage} 
                    alt={wonPrize.prizeName} 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <Gift className="w-10 h-10 text-primary" />
                )}
              </div>
            </div>
            <AlertDialogTitle className="text-center text-2xl">
              🎉 Parabéns!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-3">
              <p className="text-lg font-medium text-foreground">
                Você ganhou: {wonPrize?.prizeName}
              </p>
              <div className="bg-secondary/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">ID do Prêmio</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-sm font-mono text-foreground">{wonPrize?.id}</code>
                  <button 
                    onClick={handleCopyPrizeId}
                    className="p-1 text-primary hover:bg-primary/10 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={handleClaimPrize} className="w-full">
              Reivindicar Prêmio
            </AlertDialogAction>
            <Button 
              variant="outline" 
              onClick={() => setShowWinDialog(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </>
  );
};

export default Roulette;
