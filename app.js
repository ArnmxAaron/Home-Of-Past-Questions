import { db } from './config.js';
import { collection, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

let allPapers = [];
let currentPage = 0;
let isFavoritesOnly = false;
const itemsPerPage = 8;

const grid = document.getElementById('subject-grid');
const searchInput = document.getElementById('subjectSearch');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const installBtn = document.getElementById('installBtn');

// 1. PWA INSTALL
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
    installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') installBtn.classList.add('hidden');
        deferredPrompt = null;
    }
});

// 2. THEMES & ICONS
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

// 3. FAVORITES SYSTEM
// Updated in app.js
function updateFavoriteBadge() {
    const badge = document.getElementById('fav-badge');
    if (!badge) return; // Exit if the element is not found to prevent the error
    
    const favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    if (favorites.length > 0) {
        badge.innerText = favorites.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

window.toggleFavorite = (e, slug) => {
    e.preventDefault(); e.stopPropagation();
    let favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    if (favorites.includes(slug)) favorites = favorites.filter(f => f !== slug);
    else favorites.push(slug);
    localStorage.setItem('hof_favs', JSON.stringify(favorites));
    updateFavoriteBadge(); // Update count immediately
    renderGrid();
};

window.toggleFavoritesFilter = () => {
    isFavoritesOnly = !isFavoritesOnly;
    const favIcon = document.getElementById('fav-nav-icon');
    const navBtn = document.getElementById('navFavBtn');
    
    if (isFavoritesOnly) {
        favIcon.className = "fas fa-heart text-red-500";
        navBtn.classList.add('text-blue-600');
        document.getElementById('grid-title').innerHTML = `<i class="fas fa-heart text-red-500"></i> My Saved Papers`;
    } else {
        favIcon.className = "far fa-heart text-slate-400";
        navBtn.classList.remove('text-blue-600');
        document.getElementById('grid-title').innerText = `Recent Papers`;
    }
    currentPage = 0;
    renderGrid();
};

// 4. FETCH DATA
onSnapshot(query(collection(db, "past_questions"), orderBy("createdAt", "desc")), (snapshot) => {
    allPapers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate total page count (Paper Count)
    const totalPages = allPapers.reduce((sum, p) => sum + (p.imageUrls ? p.imageUrls.length : 0), 0);
    
    document.getElementById('total-papers').innerText = totalPages;
    document.getElementById('total-subjects').innerText = new Set(allPapers.map(p => p.subject.toLowerCase())).size;
    
    updateFavoriteBadge();
    renderGrid();
    updateLastSeen();
});

function renderGrid() {
    const favorites = JSON.parse(localStorage.getItem('hof_favs') || '[]');
    let displayList = isFavoritesOnly ? allPapers.filter(p => favorites.includes(p.slug)) : allPapers;
    
    const start = currentPage * itemsPerPage;
    const batch = isFavoritesOnly ? displayList : displayList.slice(start, start + itemsPerPage);

    grid.innerHTML = batch.map(p => {
        const theme = getTheme(p.subject);
        const isFav = favorites.includes(p.slug);
        const pageCount = p.imageUrls ? p.imageUrls.length : 0; // Dynamic page count for card
        
        return `
        <a href="view.html?paper=${p.slug}" class="group bg-white p-4 rounded-3xl border border-slate-100 shadow-sm relative transition-all hover:shadow-md">
            <button onclick="toggleFavorite(event, '${p.slug}')" class="absolute top-4 right-4 z-20 transition-transform active:scale-150">
                <i class="${isFav ? 'fas fa-heart text-red-500' : 'far fa-heart text-slate-300'}"></i>
            </button>
            <div class="w-10 h-10 ${theme.bg} ${theme.color} rounded-xl flex items-center justify-center mb-4"><i class="fas ${theme.icon}"></i></div>
            <div class="mb-4">
                <span class="text-[8px] font-black text-blue-600 uppercase block mb-0.5">${p.examType}</span>
                <h3 class="font-bold text-slate-800 text-xs line-clamp-2 h-8 capitalize">${p.subject}</h3>
                <span class="text-[9px] text-slate-400 font-bold"><i class="far fa-copy mr-1"></i>${pageCount} Pages</span>
            </div>
            <div class="flex items-center justify-between pt-3 border-t border-slate-50 text-[10px] font-black text-slate-400">
                <span>${p.year}</span>
                <i class="fas fa-arrow-right text-blue-500"></i>
            </div>
        </a>`;
    }).join('');
    
    if(batch.length === 0) grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">No papers found.</div>`;
    updatePagination(displayList.length);
}

// 5. HELPER FUNCTIONS
function updatePagination(totalVisible) {
    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = (currentPage + 1) * itemsPerPage >= totalVisible;
}

function updateLastSeen() {
    const lastSeen = JSON.parse(localStorage.getItem('hof_last_seen'));
    if (lastSeen) {
        document.getElementById('last-seen-container').classList.remove('hidden');
        document.getElementById('last-seen-card').innerHTML = `
            <a href="view.html?paper=${lastSeen.slug}" class="flex items-center gap-4 bg-slate-900 p-4 rounded-3xl text-white">
                <div class="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center"><i class="fas fa-clock"></i></div>
                <div class="flex-1">
                    <p class="text-[10px] text-slate-400 uppercase font-black">Resume Reading</p>
                    <div class="text-xs font-bold">${lastSeen.subject} (${lastSeen.year})</div>
                </div>
                <i class="fas fa-play text-yellow-400 ml-auto mr-2"></i>
            </a>`;
    }
}

nextBtn.onclick = () => { currentPage++; renderGrid(); window.scrollTo({top: 300, behavior: 'smooth'}); };
prevBtn.onclick = () => { currentPage--; renderGrid(); window.scrollTo({top: 300, behavior: 'smooth'}); };

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
            const pageCount = p.imageUrls ? p.imageUrls.length : 0;
            return `
            <a href="view.html?paper=${p.slug}" class="bg-white p-4 rounded-2xl border border-blue-50 shadow-sm">
                <div class="flex items-center gap-3 mb-2">
                    <div class="w-8 h-8 ${theme.bg} ${theme.color} rounded-lg flex items-center justify-center text-[10px]"><i class="fas ${theme.icon}"></i></div>
                    <h4 class="font-bold text-slate-800 text-xs truncate">${p.subject}</h4>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-[8px] font-black text-blue-500 uppercase">${p.examType}</span>
                    <span class="text-[8px] text-slate-400">${pageCount} pgs</span>
                </div>
            </a>`;
        }).join('');
    }
};

searchInput.oninput = (e) => {
    const term = e.target.value.toLowerCase();
    if(term.length > 0) {
        const results = allPapers.filter(p => p.subject.toLowerCase().includes(term));
        grid.innerHTML = results.map(p => `
            <a href="view.html?paper=${p.slug}" class="bg-white p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                    <span class="font-bold text-xs text-slate-700 block">${p.subject}</span>
                    <span class="text-[8px] text-slate-400 uppercase">${p.year} • ${p.examType}</span>
                </div>
                <i class="fas fa-search text-blue-200"></i>
            </a>`).join('');
    } else renderGrid();
};