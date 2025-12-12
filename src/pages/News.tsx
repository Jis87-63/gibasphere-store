import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { Sparkles, Calendar } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  releaseDate?: string;
}

const News: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const newsRef = ref(database, 'news');
    onValue(newsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const newsArray = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setNews(newsArray);
      }
    });
  }, []);

  const Header = (
    <div className="px-4 py-3">
      <h1 className="text-xl font-semibold text-foreground">Novidades</h1>
    </div>
  );

  return (
    <>
      <PageContainer header={Header}>
        {news.length > 0 ? (
          <div className="space-y-4">
            {news.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl overflow-hidden"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <div className="flex items-center gap-2 text-primary text-sm mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Em breve</span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                  
                  {item.releaseDate && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Lançamento: {new Date(item.releaseDate).toLocaleDateString('pt-MZ')}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma novidade por agora</p>
            <p className="text-sm text-muted-foreground mt-1">
              Fique atento para novos lançamentos
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNav />
    </>
  );
};

export default News;
