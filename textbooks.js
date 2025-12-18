// Sample Data - Add your own image paths and Play Store links here
const books = [
    
];

// 1. Define the Global Filter Function first
window.filterDept = function(dept) {
    // UI Update: Toggle active classes
    document.querySelectorAll('.dept-pill').forEach(p => p.classList.remove('active-dept'));
    document.getElementById(`dept-${dept}`).classList.add('active-dept');
    
    // Filter the books
    const searchTerm = document.getElementById('bookSearch').value;
    renderBooks(dept, searchTerm);
};

// 2. Rendering Function
function renderBooks(deptFilter = 'all', searchTerm = '') {
    const grid = document.getElementById('book-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = books.filter(book => {
        const matchesDept = deptFilter === 'all' || book.dept === deptFilter;
        const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesDept && matchesSearch;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">No books found</p>
            </div>`;
        return;
    }

    filtered.forEach(book => {
        grid.innerHTML += `
        <div class="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex gap-4 items-center">
            <div class="w-20 h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl flex-shrink-0 overflow-hidden shadow-md">
                <img src="${book.image}" alt="${book.title}" 
                     onerror="this.src='https://via.placeholder.com/80x100?text=Book'"
                     class="w-full h-full object-cover">
            </div>
            
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">${book.dept}</span>
                    <div class="flex items-center text-yellow-400 text-[8px]">
                        <i class="fas fa-star mr-1"></i> ${book.rating}
                    </div>
                </div>
                <h3 class="text-xs font-black text-slate-800 dark:text-white truncate mb-2">${book.title}</h3>
                
                <div class="flex items-center justify-between">
                    <div>
                        <span class="block text-[10px] font-black text-slate-700 dark:text-slate-200">${book.downloads}</span>
                        <span class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Downloads</span>
                    </div>
                    <a href="${book.playStoreUrl}" target="_blank" 
                       class="bg-blue-600 dark:bg-blue-500 text-white text-[8px] font-black px-4 py-2.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-md">
                        <i class="fab fa-google-play"></i> INSTALL
                    </a>
                </div>
            </div>
        </div>
        `;
    });
}

// 3. Search Logic
document.getElementById('bookSearch')?.addEventListener('input', (e) => {
    const activeBtn = document.querySelector('.active-dept');
    const currentDept = activeBtn ? activeBtn.id.replace('dept-', '') : 'all';
    renderBooks(currentDept, e.target.value);
});

// 4. Initial Run
document.addEventListener('DOMContentLoaded', () => {
    renderBooks();
});