import {auth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "./firebase-core.js";
let authUser=null,listener=null;
export function observeFirebaseAuth(cb){if(listener)listener();listener=onAuthStateChanged(auth,u=>{authUser=u||null;cb?.(authUser)});return listener}
export async function firebaseLogin(email,password){const c=await signInWithEmailAndPassword(auth,email,password);authUser=c.user;return c.user}
export async function firebaseCreateFirstAdmin(email,password){const c=await createUserWithEmailAndPassword(auth,email,password);authUser=c.user;return c.user}
export async function firebaseLogout(){await signOut(auth);authUser=null}
