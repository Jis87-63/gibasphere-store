import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, database } from '@/lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, set, get, onValue } from 'firebase/database';

interface UserData {
  uid: string;
  name: string;
  email: string;
  phone: string;
  credits: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserCredits: (amount: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        const userRef = ref(database, `users/${firebaseUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            setUserData(snapshot.val());
          }
        });
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const userRef = ref(database, `users/${result.user.uid}`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.isBanned) {
        await firebaseSignOut(auth);
        throw new Error('Sua conta foi suspensa. Entre em contato com o suporte.');
      }
    }
  };

  const signUp = async (name: string, email: string, phone: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser: UserData = {
      uid: result.user.uid,
      name,
      email,
      phone,
      credits: 0,
      isAdmin: false,
      isBanned: false,
      createdAt: new Date().toISOString(),
    };

    await set(ref(database, `users/${result.user.uid}`), newUser);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setUserData(null);
  };

  const updateUserCredits = async (amount: number) => {
    if (!user || !userData) return;
    
    const newCredits = userData.credits + amount;
    await set(ref(database, `users/${user.uid}/credits`), newCredits);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      updateUserCredits 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
