import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCqEMQLtPia2U8DiW20mQ5mBf-G0_MDpqE",
  authDomain: "registra-cbd4b.firebaseapp.com",
  projectId: "registra-cbd4b",
  storageBucket: "registra-cbd4b.firebasestorage.app",
  messagingSenderId: "124773299000",
  appId: "1:124773299000:web:3460c07cdeffc9a3c407cd",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();