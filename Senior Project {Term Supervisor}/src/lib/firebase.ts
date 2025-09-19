
// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCs128LTLDM3MHeB5n5fGLcRhTdAK_dhs",
  authDomain: "uni-term-supervisor.firebaseapp.com",
  databaseURL: "https://uni-term-supervisor-default-rtdb.firebaseio.com",
  projectId: "uni-term-supervisor",
  storageBucket: "uni-term-supervisor.firebasestorage.app",
  messagingSenderId: "664296722109",
  appId: "1:664296722109:web:dd115d0c9d26f40444b1d4"
};

// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

export const auth = getAuth(app);
export default app;

