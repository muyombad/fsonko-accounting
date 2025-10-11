// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC40nNl5sV6ZxL2aJnDiXgv2EJKLGR3DJ0",
  authDomain: "fsonko-accounting.firebaseapp.com",
  projectId: "fsonko-accounting",
  storageBucket: "fsonko-accounting.firebasestorage.app",
  messagingSenderId: "913799557167",
  appId: "1:913799557167:web:b32962d0ac5568e7ce96da"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Auth so other files can use them
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
