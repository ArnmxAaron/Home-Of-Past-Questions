import { db } from './config.js';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// --- GLOBAL STATE ---
let allPapers = [];
let currentPage = 0;
let isFavoritesOnly = false;
const itemsPerPage = 8;
const REWARD_AD_URL = "https://otieu.com/4/10338215"; 

// --- ELEMENTS ---
const grid = document.getElementById('subject-grid');
const trendingGrid = document.getElementById('trending-grid');
const searchInput = document.getElementById('subjectSearch');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const installBtn = document.getElementById('installBtn');

// --- 1. PREMIUM & MODAL SYSTEM ---

function hasPremiumPass() {
    const expiry = localStorage.getItem('hof_premium_expiry');
    if (!expiry) return false;
    if (Date.now() < parseInt(expiry)) return true;
    localStorage.removeItem('hof_premium_expiry');
    return false;
}

window.openPremiumModal = () => {
    const modal = document.getElementById('premium-modal');
    const sheet = document.getElementById('premium-sheet');
    if(!modal || !sheet) return;
    modal.classList.remove('hidden');
    setTimeout(() => sheet.classList.remove('translate-y-full'), 10);
};

window.closePremiumModal = () => {
    const modal = document.getElementById('premium-modal');
    const sheet = document.getElementById('premium-sheet');
    if(!sheet) return;
    sheet.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
};

window.activatePremiumPass = () => {
    const adWindow = window.open(REWARD_AD_URL, '_blank');
    if (adWindow) {
        window.closePremiumModal();
        const bannerBtn = document.querySelector('#premium-banner button');
        if (bannerBtn) {
            bannerBtn.disabled = true;
            bannerBtn.innerHTML = `<i class="fas fa-spinner animate-spin mr-2"></i> Verifying...`;
        }
        setTimeout(() => {
            const expiry = Date.now() + (24 * 60 * 60 * 1000); 
            localStorage.setItem('hof_premium_expiry', expiry);
            alert("✅ Reward Verified! 24H Pass Active.");
            location.reload(); 
        }, 5000);
    } else {
        alert("⚠️ Please allow pop-ups to watch the video and unlock content.");
    }
};

window.viewPaper = (slug, isPremium) => {
    if (isPremium && !hasPremiumPass()) {
        window.openPremiumModal();
    } else {
        window.location.href = `view.html?paper=${slug}`;
    }
};

// --- 2. UTILITY FUNCTIONS ---

function formatCount(num) {
    if (!num || num < 0) return 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

function getTheme(subject, isPremium = false) {
    if (isPremium && !hasPremiumPass()) return { icon: 'fa-lock', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (isPremium && hasPremiumPass()) return { icon: 'fa-unlock-alt', color: 'text-green-500', bg: 'bg-green-50' };
    const s = subject.toLowerCase();
    const map = {
        math: { icon: 'fa-calculator', color: 'text-blue-500', bg: 'bg-blue-50' },
        bio: { icon: 'fa-dna', color: 'text-green-500', bg: 'bg-green-50' },
        chem: { icon: 'fa-flask', color: 'text-purple-500', bg: 'bg-purple-50' },
        phys: { icon: 'fa-atom', color: 'text-cyan-500', bg: 'bg-cyan-50' },
        eng: { icon: 'fa-book-open', color: 'text-orange-500', bg: 'bg-orange-50' }
    };
    for (let key in map) if (s.includes(key)) return map[key];
    return { icon: 'fa-file-invoice', color: 'text-slate-400', bg: 'bg-slate-50' };
}

// --- 3. PWA & UPDATES ---

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    if(installBtn) installBtn.classList.remove('hidden');
});

if(installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') installBtn.classList.add('hidden');
            deferredPrompt = null;
        }
    });
}

// --- 4. DATA RENDERING ---

onSnapshot(query(collection(db, "past_questions"), orderBy("createdAt", "desc")), (snapshot) => {
    allPapers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const totalPages = allPapers.reduce((sum, p) => sum + (p.imageUrls ? p.imageUrls.length : 0), 0);
    if(document.getElementById('total-papers')) document.getElementById('total-papers').innerText = totalPages;
    if(document.getElementById('total-subjects')) document.getElementById('total-subjects').innerText = new Set(allPapers.map(p => p.subject.toLowerCase())).size;
    updateFavoriteBadge();
    renderGrid();
    updateLastSeen();
    updatePremiumUI();
});

onSnapshot(query(collection(db, "past_questions"), orderBy("favCount", "desc"), limit(5)), (snapshot) => {
    const trending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTrending(trending);
});

function renderTrending(papers) {
    if (!trendingGrid) return;
    trendingGrid.innerHTML = papers.map(p => {
        const isPremium = p.isPremium || false;
        return `
        <div onclick="viewPaper('${p.slug}', ${isPremium})" class="min-w-[160px] bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-2xl shadow-lg relative overflow-hidden group cursor-pointer snap-start">
            <div class="absolute -right-2 -top-2 opacity-10 text-4xl text-white"><i class="fas ${isPremium ? 'fa-crown' : 'fa-fire'}"></i></div>
            <span class="text-[7px] font-black text-blue-200 uppercase">${p.examType}</span>
            <h4 class="text-white font-bold text-[10px] leading-tight mb-2 truncate capitalize">${p.subject}</h4>
            <div class="flex items-center justify-between mt-auto">
                <span class="text-white/80 text-[8px] font-bold"><i class="fas fa-heart mr-1 text-red-400"></i>${formatCount(p.favCount)}</span>
                <div class="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-white text-[10px]">
                    <i class="fas ${isPremium && !hasPremiumPass() ? 'fa-lock' : 'fa-play'}"></i>
                </div>
            </div>
        </div>`;
    }).join('');
}

function renderGrid() {
    if (!grid) return;
    const favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    let displayList = isFavoritesOnly ? allPapers.filter(p => favorites.includes(p.slug)) : allPapers;
    const start = currentPage * itemsPerPage;
    const batch = isFavoritesOnly ? displayList : displayList.slice(start, start + itemsPerPage);

    grid.innerHTML = batch.map(p => {
        const isPremium = p.isPremium || false;
        const theme = getTheme(p.subject, isPremium);
        const isFav = favorites.includes(p.slug);
        return `
        <div onclick="viewPaper('${p.slug}', ${isPremium})" class="group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative transition-all active:scale-95 cursor-pointer">
            <div class="absolute top-4 right-4 z-20 flex flex-col items-center">
                <button onclick="event.stopPropagation(); toggleFavorite(event, '${p.slug}', '${p.id}')">
                    <i class="${isFav ? 'fas fa-heart text-red-500' : 'far fa-heart text-slate-300'}"></i>
                </button>
                <span class="text-[8px] font-bold text-slate-400 mt-0.5">${formatCount(p.favCount || 0)}</span>
            </div>
            <div class="w-10 h-10 ${theme.bg} ${theme.color} rounded-xl flex items-center justify-center mb-3 text-sm relative">
                <i class="fas ${theme.icon}"></i>
                ${isPremium ? `<i class="fas fa-crown absolute -top-1 -right-1 text-[8px] text-yellow-500 bg-white rounded-full p-0.5 shadow-sm"></i>` : ''}
            </div>
            <div class="mb-3">
                <span class="text-[7px] font-black text-blue-600 uppercase block mb-0.5">${p.examType}</span>
                <h3 class="font-bold text-slate-800 text-[11px] leading-tight capitalize line-clamp-2 h-7">${p.subject}</h3>
                <span class="text-[8px] text-slate-400 font-bold"><i class="far fa-copy mr-1"></i>${p.imageUrls ? p.imageUrls.length : 0} Pages</span>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-slate-50 text-[9px] font-black text-slate-400">
                <span>${p.year}</span>
                <i class="fas ${isPremium && !hasPremiumPass() ? 'fa-lock text-yellow-500' : 'fa-arrow-right text-blue-500'}"></i>
            </div>
        </div>`;
    }).join('');
    if(batch.length === 0) grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 text-xs">No papers found.</div>`;
    updatePagination(displayList.length);
}

// --- 5. NAVIGATION & FILTERS ---

function updatePagination(totalVisible) {
    if(prevBtn) prevBtn.disabled = currentPage === 0;
    if(nextBtn) nextBtn.disabled = (currentPage + 1) * itemsPerPage >= totalVisible;
}

if(nextBtn) nextBtn.onclick = () => { currentPage++; renderGrid(); window.scrollTo({top: 0, behavior: 'smooth'}); };
if(prevBtn) prevBtn.onclick = () => { currentPage--; renderGrid(); window.scrollTo({top: 0, behavior: 'smooth'}); };

window.toggleFavoritesFilter = () => {
    isFavoritesOnly = !isFavoritesOnly;
    const favIcon = document.getElementById('fav-nav-icon');
    if (isFavoritesOnly) {
        if(favIcon) favIcon.className = "fas fa-heart text-red-500";
        document.getElementById('grid-title').innerHTML = `<i class="fas fa-heart text-red-500"></i> Saved Papers`;
    } else {
        if(favIcon) favIcon.className = "far fa-heart text-slate-400";
        document.getElementById('grid-title').innerText = `Recent Papers`;
    }
    currentPage = 0;
    renderGrid();
};

window.filterByYear = (year) => {
    isFavoritesOnly = false;
    document.querySelectorAll('.year-pill').forEach(btn => btn.classList.remove('active-year'));
    if(event) event.target.classList.add('active-year');
    if (year === 'all') { currentPage = 0; renderGrid(); } else {
        const filtered = allPapers.filter(p => p.year == year);
        grid.innerHTML = filtered.map(p => `
            <div onclick="viewPaper('${p.slug}', ${p.isPremium || false})" class="bg-white p-3 rounded-2xl border border-slate-100 flex items-center gap-3 cursor-pointer">
                <div class="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center text-[10px]"><i class="fas fa-file-invoice"></i></div>
                <div class="flex-1 min-w-0"><h4 class="font-bold text-slate-800 text-[10px] truncate capitalize">${p.subject}</h4><span class="text-[7px] font-black text-blue-500 uppercase">${p.examType}</span></div>
                <i class="fas fa-chevron-right text-slate-200 text-[10px]"></i></div>`).join('');
    }
};

if(searchInput) {
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        if(term.length > 0) {
            const results = allPapers.filter(p => p.subject.toLowerCase().includes(term));
            grid.innerHTML = results.map(p => `
                <div onclick="viewPaper('${p.slug}', ${p.isPremium || false})" class="bg-white p-3 rounded-xl border border-blue-50 flex items-center justify-between cursor-pointer">
                    <div><span class="font-bold text-[11px] text-slate-700 block capitalize">${p.subject}</span><span class="text-[8px] text-slate-400 uppercase">${p.year} • ${p.examType}</span></div>
                    <i class="fas fa-search text-blue-100 text-xs"></i></div>`).join('');
        } else renderGrid();
    };
}

// --- 6. FAVORITES & LAST SEEN ---

function updateFavoriteBadge() {
    const badge = document.getElementById('fav-badge');
    if (!badge) return;
    const favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    badge.innerText = favorites.length;
    favorites.length > 0 ? badge.classList.remove('hidden') : badge.classList.add('hidden');
}

window.toggleFavorite = async (e, slug, docId) => {
    e.preventDefault(); e.stopPropagation();
    let favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    const paperRef = doc(db, "past_questions", docId);
    if (favorites.includes(slug)) {
        favorites = favorites.filter(f => f !== slug);
        await updateDoc(paperRef, { favCount: increment(-1) });
    } else {
        favorites.push(slug);
        await updateDoc(paperRef, { favCount: increment(1) });
    }
    localStorage.setItem('hof_favs', JSON.stringify(favorites));
    updateFavoriteBadge();
    renderGrid();
};

function updateLastSeen() {
    const lastSeen = JSON.parse(localStorage.getItem('hof_last_seen'));
    const container = document.getElementById('last-seen-container');
    const card = document.getElementById('last-seen-card');
    if (lastSeen && container && card) {
        container.classList.remove('hidden');
        card.innerHTML = `<div onclick="viewPaper('${lastSeen.slug}', ${lastSeen.isPremium || false})" class="flex items-center gap-4 bg-slate-900 p-4 rounded-3xl text-white cursor-pointer">
            <div class="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-sm"><i class="fas fa-clock"></i></div>
            <div class="flex-1 min-w-0"><p class="text-[8px] text-slate-400 uppercase font-black">Resume Reading</p><div class="text-[11px] font-bold truncate capitalize">${lastSeen.subject} (${lastSeen.year})</div></div>
            <i class="fas fa-play text-blue-400 text-xs ml-auto mr-2"></i></div>`;
    }
}

function updatePremiumUI() {
    const banner = document.getElementById('premium-banner');
    if (!banner) return;
    if (hasPremiumPass()) {
        const expiry = parseInt(localStorage.getItem('hof_premium_expiry'));
        const hours = Math.floor((expiry - Date.now()) / (1000 * 60 * 60));
        banner.classList.remove('hidden');
        banner.innerHTML = `<div class="bg-slate-900 border border-green-500/30 p-4 rounded-3xl flex items-center justify-between shadow-xl">
            <div class="flex items-center gap-3"><div class="w-8 h-8 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center text-xs"><i class="fas fa-crown"></i></div>
            <span class="text-white text-[10px] font-bold uppercase tracking-wider">Premium Active</span></div>
            <span class="text-green-400 text-[10px] font-black">${hours}H REMAINING</span></div>`;
    } else { banner.classList.remove('hidden'); }
}

// Init
updatePremiumUI();
