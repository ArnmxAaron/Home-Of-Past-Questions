import { db } from './config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

async function initProfile() {
    // Corrected key to match app.js
    const userId = localStorage.getItem('hof_userId');
    
    if (!userId) {
        console.log("No session found, redirecting...");
        window.location.href = 'index.html';
        return;
    }

    try {
        // 1. FETCH USER FROM FIREBASE
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            const userData = userSnap.data();
            renderUserInfo(userData);
        } else {
            console.error("User not found in database");
            // Don't use localStorage.clear() to avoid losing favs/premium
            localStorage.removeItem('hof_userId');
            window.location.href = 'index.html';
        }

        // 2. FETCH SAVED PAPERS
        await loadSavedPapers();

    } catch (err) {
        console.error("Profile initialization error:", err);
        const nameEl = document.getElementById('display-name');
        if(nameEl) nameEl.innerText = "Connection Error";
    }
}

function renderUserInfo(data) {
    // Matching keys used in app.js setDoc
    const nameEl = document.getElementById('display-name');
    const emailEl = document.getElementById('display-email');
    const picEl = document.getElementById('display-pic');
    const loaderEl = document.getElementById('pic-loader');
    const dateEl = document.getElementById('display-date');

    if (nameEl) nameEl.innerText = data.name || "Student";
    if (emailEl) emailEl.innerText = data.email || "No email provided";
    
    if (data.photoURL && picEl) {
        picEl.src = data.photoURL;
        picEl.classList.remove('hidden');
        if (loaderEl) loaderEl.classList.add('hidden');
    }

    if (data.createdAt && dateEl) {
        const date = new Date(data.createdAt).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
        });
        dateEl.innerText = date;
    }

    // Premium Check
    const expiry = localStorage.getItem('hof_premium_expiry');
    const status = document.getElementById('display-status');
    const premiumCard = document.getElementById('premium-card');

    if (expiry && Date.now() < parseInt(expiry)) {
        if (status) {
            status.innerText = "Premium Pass Active";
            status.classList.replace('text-blue-600', 'text-emerald-500');
        }
        if (premiumCard) premiumCard.classList.add('hidden');
    } else {
        if (premiumCard) premiumCard.classList.remove('hidden');
    }
}

async function loadSavedPapers() {
    const favSlugs = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    const listContainer = document.getElementById('saved-papers-list');
    const emptyState = document.getElementById('empty-favs');
    const countBadge = document.getElementById('fav-count');
    const loader = document.getElementById('papers-loader');

    if (!listContainer) return;

    if (favSlugs.length === 0) {
        if (loader) loader.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (countBadge) countBadge.innerText = favSlugs.length;

    try {
        // Firestore 'in' query
        const q = query(collection(db, "past_questions"), where("slug", "in", favSlugs));
        const querySnapshot = await getDocs(q);
        
        if (loader) loader.classList.add('hidden');
        
        let html = '';
        querySnapshot.forEach((doc) => {
            const p = doc.data();
            // Matching your profile HTML structure
            html += `
            <div onclick="window.location.href='view.html?paper=${p.slug}'" 
                 class="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm active:scale-95 transition-all cursor-pointer">
                <div class="w-10 h-10 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-xl flex items-center justify-center text-sm">
                    <i class="fas fa-file-invoice"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <span class="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">${p.examType} • ${p.year}</span>
                    <h4 class="text-[11px] font-bold text-slate-800 dark:text-white truncate capitalize">${p.subject}</h4>
                </div>
                <div class="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
                    <i class="fas fa-chevron-right text-[10px] text-slate-300 dark:text-slate-600"></i>
                </div>
            </div>`;
        });
        
        listContainer.innerHTML = html;
    } catch (err) {
        console.error("Error loading saved papers:", err);
        if (loader) loader.innerHTML = `<p class="text-center text-xs text-red-400">Error loading saved papers.</p>`;
    }
}

// LOGOUT LOGIC
document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (confirm("Sign out of your account?")) {
        localStorage.removeItem('hof_userId');
        window.location.href = 'index.html';
    }
});

// DARK MODE TOGGLE LOGIC
const darkToggle = document.getElementById('dark-mode-toggle');
if (darkToggle) {
    darkToggle.checked = document.documentElement.classList.contains('dark');
    darkToggle.onchange = (e) => {
        if (e.target.checked) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };
}

// START
initProfile();