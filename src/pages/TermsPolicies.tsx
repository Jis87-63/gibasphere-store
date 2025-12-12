import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { ArrowLeft, FileText, ChevronRight, X } from 'lucide-react';

interface TermPolicy {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const TermsPolicies: React.FC = () => {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<TermPolicy[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<TermPolicy | null>(null);

  useEffect(() => {
    const termsRef = ref(database, 'termsPolicies');
    onValue(termsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const termsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setTerms(termsArray.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    });
  }, []);

  const Header = (
    <div className="flex items-center gap-3 px-4 py-3">
      <button onClick={() => navigate('/perfil')} className="p-2 -ml-2 text-muted-foreground">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <h1 className="text-xl font-semibold text-foreground">Termos & Políticas</h1>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {terms.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum termo disponível</p>
          </div>
        ) : (
          <div className="space-y-2">
            {terms.map((term, index) => (
              <motion.button
                key={term.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedTerm(term)}
                className="w-full flex items-center justify-between p-4 bg-card rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium text-foreground text-left">{term.title}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            ))}
          </div>
        )}
      </PageContainer>

      {/* Term Content Modal */}
      <AnimatePresence>
        {selectedTerm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-background border-b border-border z-10">
              <div className="flex items-center gap-3 px-4 py-3">
                <button 
                  onClick={() => setSelectedTerm(null)} 
                  className="p-2 -ml-2 text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {selectedTerm.title}
                </h2>
              </div>
            </div>
            <div className="p-4 pb-24">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div 
                  className="text-foreground whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: selectedTerm.content.replace(/\n/g, '<br/>') }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </>
  );
};

export default TermsPolicies;
