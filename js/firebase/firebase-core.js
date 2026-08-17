import {firebaseConfig,FIREBASE_SDK_VERSION} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
const firebaseApp=initializeApp(firebaseConfig),auth=getAuth(firebaseApp),firestore=getFirestore(firebaseApp);
export {FIREBASE_SDK_VERSION,firebaseApp,auth,firestore,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,doc,getDoc,setDoc,onSnapshot,serverTimestamp};
