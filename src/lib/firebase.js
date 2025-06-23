import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC3jNZcla55TebtXCSDUk57WDgIhuR1zN4",
  authDomain: "stokr1.firebaseapp.com",
  projectId: "stokr1",
  storageBucket: "stokr1.firebasestorage.app",
  messagingSenderId: "1002154148698",
  appId: "1:1002154148698:web:77203b22b17c4a518da963"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };
