const res = document.getElementById('res');
let favs = JSON.parse(localStorage.getItem('lum3_favs')) || [];
let history = JSON.parse(localStorage.getItem('lum3_history')) || [];
let homeCache = "";

// 1. DAILY THOUGHT (Wahi Purani Design)
function initThought() { 
    const quotes = [
        "A book is a version of the world.", 
        "Wisdom is the ultimate luxury.", 
        "Today a reader, tomorrow a leader.",
        "Books are a uniquely portable magic."
    ];
    const tBox = document.getElementById('tBox');
    if(tBox) tBox.innerText = quotes[new Date().getDate() % quotes.length]; 
}

// 2. 10 LANGUAGES & DARK MODE
window.googleTranslateElementInit = () => { 
    new google.translate.TranslateElement({pageLanguage: 'en'}, 'google_translate_element'); 
};

window.setLang = (l) => {
    const s = document.querySelector('.goog-te-combo');
    if(s) { s.value = l; s.dispatchEvent(new Event('change')); }
    document.getElementById('appLangMenu').style.display = 'none';
};

window.toggleMenu = () => { 
    const m = document.getElementById('appLangMenu'); 
    m.style.display = (m.style.display === 'block') ? 'none' : 'block'; 
};

window.toggleMode = () => { 
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('lum3_mode', isDark ? 'dark' : 'light');
};

// 3. SEARCH & API (Gutenberg + Google Mixed)
async function searchNow(q) {
    res.innerHTML = "<p style='grid-column:1/3; text-align:center; color:var(--gold);'>Searching Elite Library...</p>";
    let books = [];
    try {
        const [r1, r2] = await Promise.all([
            fetch(`https://gutendex.com/books/?search=${q}`),
            fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=40`)
        ]);
        const d1 = await r1.json(); const d2 = await r2.json();
        
        if(d1.results) d1.results.slice(0, 50).forEach(i => {
            books.push({t: i.title, img: i.formats['image/jpeg'] || 'https://via.placeholder.com/150', u: i.formats['text/html'] || i.formats['text/plain'], s: 'Gutenberg', isFree: true});
        });
        
        if(d2.items) d2.items.forEach(i => {
            let isFree = i.accessInfo.viewability !== "NO_PAGES";
            let link = isFree ? (i.accessInfo.webReaderLink || i.volumeInfo.previewLink) : i.volumeInfo.infoLink;
            books.push({t: i.volumeInfo.title, img: i.volumeInfo.imageLinks?.thumbnail || 'https://via.placeholder.com/150', u: link, s: 'Google', isFree: isFree});
        });
        
        res.innerHTML = "";
        books.forEach(b => buildCard(b));
        homeCache = res.innerHTML;
    } catch(e) { 
        res.innerHTML = "<p style='grid-column:1/3; text-align:center;'>Check Internet Connection.</p>";
    }
}

// 4. CARD DESIGN & FAVOURITES
function buildCard(b) {
    const isFav = favs.some(f => f.u === b.u);
    const div = document.createElement('div');
    div.className = "card";
    
    let btnText = b.isFree ? "READ NOW" : "BUY NOW";
    let btnColor = b.isFree ? "#d4af37" : "#000c1d";
    let textColor = b.isFree ? "#000" : "#fff";

    div.innerHTML = `
        <div class="fav-btn" onclick="toggleFav('${b.t.replace(/'/g,"")}','${b.img}','${b.u}','${b.s}', ${b.isFree})">${isFav?'❤️':'🤍'}</div>
        <img src="${b.img}" style="width:100%; height:140px; object-fit:cover; border-radius:15px;">
        <p style="font-size:11px; font-weight:800; height:28px; overflow:hidden; margin:8px 0;">${b.t}</p>
        <button onclick="openBook('${b.u}', '${b.s}', '${b.t.replace(/'/g,"")}', '${b.img}')" class="btn-action" style="background:${btnColor}; color:${textColor};">${btnText}</button>
    `;
    res.appendChild(div);
}

window.toggleFav = (t, img, u, s, isFree) => {
    const idx = favs.findIndex(f => f.u === u);
    if(idx > -1) favs.splice(idx, 1); 
    else favs.push({t, img, u, s, isFree});
    
    localStorage.setItem('lum3_favs', JSON.stringify(favs));
    if(document.getElementById('tab-f').classList.contains('active')) showLibrary();
};

// 5. LIBRARY & HISTORY LOGIC
window.go = (t) => {
    document.getElementById('tab-h').classList.toggle('active', t==='home');
    document.getElementById('tab-f').classList.toggle('active', t==='fav');
    if(t === 'home') { 
        if(homeCache) res.innerHTML = homeCache; else searchNow('popular'); 
    } else { 
        showLibrary(); 
    }
};

function showLibrary() {
    res.innerHTML = "<h3 style='grid-column:1/3; font-size:14px; margin-top:10px; color:var(--gold);'>FAVOURITES</h3>";
    if(!favs.length) res.innerHTML += "<p style='grid-column:1/3; text-align:center;'>No Favourites yet.</p>";
    favs.forEach(b => buildCard(b));
    
    res.innerHTML += "<h3 style='grid-column:1/3; font-size:14px; margin-top:20px; color:var(--gold);'>READING HISTORY</h3>";
    if(!history.length) res.innerHTML += "<p style='grid-column:1/3; text-align:center;'>No History.</p>";
    history.forEach(b => buildCard(b));
}

// 6. READER LOGIC (In-App Browser Ready)
window.openBook = (u, s, t, img) => {
    // History Update
    if(!history.some(h => h.u === u)) { 
        history.unshift({t, u, s, img, isFree: true}); 
        history = history.slice(0, 10); 
        localStorage.setItem('lum3_history', JSON.stringify(history)); 
    }

    const readerUI = document.getElementById('readerUI');
    const overlay = document.getElementById('secure-overlay');
    const launchBtn = document.getElementById('secureLaunchBtn');
    
    readerUI.style.display = 'flex';
    document.getElementById('bookFrame').style.display = 'none'; 
    overlay.style.display = 'flex';
    document.getElementById('readerTitle').innerText = t.toUpperCase();

    launchBtn.onclick = () => {
        // Professional In-App Browser signal
        window.open(u, '_blank', 'location=no,toolbar=yes,closebuttoncaption=Back to App');
        setTimeout(() => { closeReader(); }, 500);
    };
};

window.closeReader = () => { 
    document.getElementById('readerUI').style.display = 'none'; 
};

// 7. INITIALIZE APP
window.onload = () => { 
    if(localStorage.getItem('lum3_mode') === 'dark') document.body.classList.add('dark-mode');
    initThought(); 
    searchNow('popular'); 
};
/* LUMINA GLOBAL MINING ENGINE v3 - 2026 Edition
   Logic: 6 Hours Total | 5 Coins Max | Dynamic Speed 
*/
(function() {
    function runGlobalMining() {
        const today = new Date().toDateString();
        let lastDate = localStorage.getItem('lastMiningDate');
        let dailyEarned = parseFloat(localStorage.getItem('dailyEarned')) || 0;
        let totalBalance = parseFloat(localStorage.getItem('luminaBalance')) || 0;

        // New Day Reset Logic
        if (lastDate !== today) {
            localStorage.setItem('dailyEarned', '0');
            localStorage.setItem('lastMiningDate', today);
            dailyEarned = 0;
        }

        const limit = 5.0;

        // Background Extraction Protocol
        if (dailyEarned < limit) {
            let increment;
            
            // Dynamic Progression: 1-3 Coins (Fast) | 4-5 Coins (Slow)
            if (dailyEarned < 3.0) {
                increment = 0.00027; 
            } else {
                increment = 0.00023; 
            }

            totalBalance += increment;
            dailyEarned += increment;

            // Secure Sync to Storage
            localStorage.setItem('luminaBalance', totalBalance.toFixed(4));
            localStorage.setItem('dailyEarned', dailyEarned.toFixed(4));
        }
    }

    // Interval set to 1 second for seamless background mining
    setInterval(runGlobalMining, 1000);
})();

