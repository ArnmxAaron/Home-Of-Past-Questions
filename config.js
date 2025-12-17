import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"; // ADD THIS
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const firebaseConfig = {
  apiKey: "AIzaSyDEuLXR4LVlz44YTI2pjdlt0cnp6f4IWEk",
  authDomain: "hofpastquestions.firebaseapp.com",
  projectId: "hofpastquestions",
  storageBucket: "hofpastquestions.firebasestorage.app",
  messagingSenderId: "287429266196",
  appId: "1:287429266196:web:25e8efd4040cf70ac61001",
  measurementId: "G-8YC18C88C4"
};

export const app = initializeApp(firebaseConfig); 
export const db = getFirestore(app);
export const auth = getAuth(app); // EXPORT AUTH

export const supabase = createClient(
    'https://vqjnmmugwgrbpktgrfbi.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxam5tbXVnd2dyYnBrdGdyZmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MDI2NDcsImV4cCI6MjA4MTQ3ODY0N30.zW9sfMyOPDeTn8i3EDLuiKsZ8o5_UI9sBG-PlrZ4A2c'
);

export const supabaseAdmin = createClient(
    'https://vqjnmmugwgrbpktgrfbi.supabase.co', 
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxam5tbXVnd2dyYnBrdGdyZmJpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTkwMjY0NywiZXhwIjoyMDgxNDc4NjQ3fQ.QsetwT_L4cZbxCTrkVENgy8MJYrxxNGuVqkQ6bYrsFI' 
);