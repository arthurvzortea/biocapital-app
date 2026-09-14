import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDR4jrQ9WX6Ankx68LurIb0_-kbnvPLZRM",
  authDomain: "biocapital-da1b5.firebaseapp.com",
  projectId: "biocapital-da1b5",
  storageBucket: "biocapital-da1b5.firebasestorage.app",
  messagingSenderId: "564369601305",
  appId: "1:564369601305:web:299addb57801c81fcb8b88"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta os serviços para usar no app.component.ts
export const auth = getAuth(app);
export const db = getFirestore(app);