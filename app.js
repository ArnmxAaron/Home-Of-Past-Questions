import { db } from './config.js';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Global State
let allPapers = [];
let currentPage = 0;
let isFavoritesOnly = false;
const itemsPerPage = 8;

// Elements
const grid = document.getElementById('subject-grid');
const trendingGrid = document.getElementById('trending-grid');
const searchInput = document.getElementById('subjectSearch');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const installBtn = document.getElementById('installBtn');

// --- 1. UTILITY FUNCTIONS ---

// Formats numbers: 1200 -> 1.2k, 1000000 -> 1M
function formatCount(num) {
    if (!num || num < 0) return 0;
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num;
}

// RESTORED: Subject Themes
function getTheme(subject) {
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

// --- 2. PWA & VERSION UPDATES ---

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

// Centered Update Notification
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    const updateBar = document.createElement('div');
                    updateBar.className = "fixed bottom-10 left-1/2 -translate-x-1/2 z-[999] w-[90%] max-w-xs bg-slate-900/90 backdrop-blur-md text-white px-5 py-4 rounded-3xl shadow-2xl flex items-center justify-between border border-white/10 animate-bounce";
                    updateBar.innerHTML = `
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black uppercase text-blue-400">Update Available</span>
                            <span class="text-xs font-bold text-white">Refresh for new features!</span>
                        </div>
                        <button onclick="window.location.reload()" class="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Refresh</button>
                    `;
                    document.body.appendChild(updateBar);
                }
            });
        });
    });
}

// --- 3. FAVORITES SYSTEM (FIREBASE SYNC) ---

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
        
        // Notification
        if (Notification.permission === 'granted') {
            navigator.serviceWorker.ready.then(reg => {
                reg.showNotification("Paper Saved!", { 
                    body: "Accessible offline in your library.", 
                    icon: 'icons/icon-192x192.png'
                });
            });
        } else {
            Notification.requestPermission();
        }
    }
    
    localStorage.setItem('hof_favs', JSON.stringify(favorites));
    updateFavoriteBadge();
    renderGrid();
};

// --- 4. DATA RENDERING (GRID & TRENDING) ---

onSnapshot(query(collection(db, "past_questions"), orderBy("createdAt", "desc")), (snapshot) => {
    allPapers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // RESTORED: Global Stats update
    const totalPages = allPapers.reduce((sum, p) => sum + (p.imageUrls ? p.imageUrls.length : 0), 0);
    const totalPapersEl = document.getElementById('total-papers');
    const totalSubjectsEl = document.getElementById('total-subjects');
    if(totalPapersEl) totalPapersEl.innerText = totalPages;
    if(totalSubjectsEl) totalSubjectsEl.innerText = new Set(allPapers.map(p => p.subject.toLowerCase())).size;

    updateFavoriteBadge();
    renderGrid();
    updateLastSeen();
});

// Trending Feed
onSnapshot(query(collection(db, "past_questions"), orderBy("favCount", "desc"), limit(5)), (snapshot) => {
    const trending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderTrending(trending);
});

function renderTrending(papers) {
    if (!trendingGrid) return;
    trendingGrid.innerHTML = papers.map(p => `
        <div class="min-w-[160px] bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-2xl shadow-lg relative overflow-hidden group">
            <div class="absolute -right-2 -top-2 opacity-10 text-4xl text-white"><i class="fas fa-fire"></i></div>
            <span class="text-[7px] font-black text-blue-200 uppercase">${p.examType}</span>
            <h4 class="text-white font-bold text-[10px] leading-tight mb-2 truncate capitalize">${p.subject}</h4>
            <div class="flex items-center justify-between mt-auto">
                <span class="text-white/80 text-[8px] font-bold"><i class="fas fa-heart mr-1 text-red-400"></i>${formatCount(p.favCount)}</span>
                <a href="view.html?paper=${p.slug}" class="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-white text-[10px]"><i class="fas fa-play"></i></a>
            </div>
        </div>`).join('');
}

function renderGrid() {
    if (!grid) return;
    const favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    let displayList = isFavoritesOnly ? allPapers.filter(p => favorites.includes(p.slug)) : allPapers;
    
    const start = currentPage * itemsPerPage;
    const batch = isFavoritesOnly ? displayList : displayList.slice(start, start + itemsPerPage);

    grid.innerHTML = batch.map(p => {
        const theme = getTheme(p.subject);
        const isFav = favorites.includes(p.slug);
        const globalFavs = formatCount(p.favCount || 0);
        
        return `
        <div class="group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative transition-all active:scale-95">
            <div class="absolute top-4 right-4 z-20 flex flex-col items-center">
                <button onclick="toggleFavorite(event, '${p.slug}', '${p.id}')">
                    <i class="${isFav ? 'fas fa-heart text-red-500' : 'far fa-heart text-slate-300'}"></i>
                </button>
                <span class="text-[8px] font-bold text-slate-400 mt-0.5">${globalFavs}</span>
            </div>
            <a href="view.html?paper=${p.slug}">
                <div class="w-10 h-10 ${theme.bg} ${theme.color} rounded-xl flex items-center justify-center mb-3 text-sm"><i class="fas ${theme.icon}"></i></div>
                <div class="mb-3">
                    <span class="text-[7px] font-black text-blue-600 uppercase block mb-0.5">${p.examType}</span>
                    <h3 class="font-bold text-slate-800 text-[11px] leading-tight capitalize line-clamp-2 h-7">${p.subject}</h3>
                    <span class="text-[8px] text-slate-400 font-bold"><i class="far fa-copy mr-1"></i>${p.imageUrls ? p.imageUrls.length : 0} Pages</span>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-slate-50 text-[9px] font-black text-slate-400">
                    <span>${p.year}</span>
                    <i class="fas fa-arrow-right text-blue-500"></i>
                </div>
            </a>
        </div>`;
    }).join('');
    
    if(batch.length === 0) grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400 text-xs">No papers found.</div>`;
    updatePagination(displayList.length);
}

// --- 5. NAVIGATION, SEARCH & FILTER ---

function updatePagination(totalVisible) {
    if(prevBtn) prevBtn.disabled = currentPage === 0;
    if(nextBtn) nextBtn.disabled = (currentPage + 1) * itemsPerPage >= totalVisible;
}

if(nextBtn) nextBtn.onclick = () => { currentPage++; renderGrid(); window.scrollTo({top: 0, behavior: 'smooth'}); };
if(prevBtn) prevBtn.onclick = () => { currentPage--; renderGrid(); window.scrollTo({top: 0, behavior: 'smooth'}); };

// RESTORED: Toggle Favorites Filter
window.toggleFavoritesFilter = () => {
    isFavoritesOnly = !isFavoritesOnly;
    const favIcon = document.getElementById('fav-nav-icon');
    const navBtn = document.getElementById('navFavBtn');
    
    if (isFavoritesOnly) {
        if(favIcon) favIcon.className = "fas fa-heart text-red-500";
        if(navBtn) navBtn.classList.add('text-blue-600');
        document.getElementById('grid-title').innerHTML = `<i class="fas fa-heart text-red-500"></i> Saved Papers`;
    } else {
        if(favIcon) favIcon.className = "far fa-heart text-slate-400";
        if(navBtn) navBtn.classList.remove('text-blue-600');
        document.getElementById('grid-title').innerText = `Recent Papers`;
    }
    currentPage = 0;
    renderGrid();
};

// RESTORED: Filter by Year
window.filterByYear = (year) => {
    isFavoritesOnly = false;
    document.querySelectorAll('.year-pill').forEach(btn => btn.classList.remove('active-year'));
    if(event) event.target.classList.add('active-year');
    
    if (year === 'all') { 
        currentPage = 0; 
        renderGrid(); 
    } else {
        const filtered = allPapers.filter(p => p.year == year);
        grid.innerHTML = filtered.map(p => {
            const theme = getTheme(p.subject);
            return `
            <a href="view.html?paper=${p.slug}" class="bg-white p-3 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div class="w-8 h-8 ${theme.bg} ${theme.color} rounded-lg flex items-center justify-center text-[10px]"><i class="fas ${theme.icon}"></i></div>
                <div class="flex-1 min-w-0">
                    <h4 class="font-bold text-slate-800 text-[10px] truncate capitalize">${p.subject}</h4>
                    <span class="text-[7px] font-black text-blue-500 uppercase">${p.examType}</span>
                </div>
                <i class="fas fa-chevron-right text-slate-200 text-[10px]"></i>
            </a>`;
        }).join('');
    }
};

// RESTORED: Search Logic
if(searchInput) {
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        if(term.length > 0) {
            const results = allPapers.filter(p => p.subject.toLowerCase().includes(term));
            grid.innerHTML = results.map(p => `
                <a href="view.html?paper=${p.slug}" class="bg-white p-3 rounded-xl border border-blue-50 flex items-center justify-between">
                    <div>
                        <span class="font-bold text-[11px] text-slate-700 block capitalize">${p.subject}</span>
                        <span class="text-[8px] text-slate-400 uppercase">${p.year} • ${p.examType}</span>
                    </div>
                    <i class="fas fa-search text-blue-100 text-xs"></i>
                </a>`).join('');
        } else renderGrid();
    };
}

// RESTORED: Last Seen logic
function updateLastSeen() {
    const lastSeen = JSON.parse(localStorage.getItem('hof_last_seen'));
    const container = document.getElementById('last-seen-container');
    const card = document.getElementById('last-seen-card');
    
    if (lastSeen && container && card) {
        container.classList.remove('hidden');
        card.innerHTML = `
            <a href="view.html?paper=${lastSeen.slug}" class="flex items-center gap-4 bg-slate-900 p-4 rounded-3xl text-white">
                <div class="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center text-sm"><i class="fas fa-clock"></i></div>
                <div class="flex-1 min-w-0">
                    <p class="text-[8px] text-slate-400 uppercase font-black">Resume Reading</p>
                    <div class="text-[11px] font-bold truncate capitalize">${lastSeen.subject} (${lastSeen.year})</div>
                </div>
                <i class="fas fa-play text-blue-400 text-xs ml-auto mr-2"></i>
            </a>`;
    }
}
