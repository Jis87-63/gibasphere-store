import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDj1qqCBztEpF31n9UU3DFKwiymc2Bd-iM",
  authDomain: "bot-ia-20e75.firebaseapp.com",
  databaseURL: "https://bot-ia-20e75-default-rtdb.firebaseio.com",
  projectId: "bot-ia-20e75",
  storageBucket: "bot-ia-20e75.appspot.com",
  messagingSenderId: "601684351023",
  appId: "1:601684351023:android:e94d0ab92f512c4cb80eda"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;
