// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyAsW6GR_3UKuKtPh8BjkgCzyM-8xi3mCSo",
  authDomain: "luminalid-vault-c80f6.firebaseapp.com",
  databaseURL: "https://luminalid-vault-c80f6-default-rtdb.firebaseio.com/",
  projectId: "luminalid-vault-c80f6",
  storageBucket: "luminalid-vault-c80f6.firebasestorage.app",
  messagingSenderId: "894117640622",
  appId: "1:894117640622:web:80fa414983fcf3c548b03f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// 2. USER ID & SYNC LOGIC
let userId = localStorage.getItem('lumina_userId');
if (!userId) {
    userId = 'user_' + Math.floor(Math.random() * 1000000);
    localStorage.setItem('lumina_userId', userId);
}

function syncDataToCloud(favCount, historyCount) {
    if(database) {
        database.ref('users/' + userId).update({
            total_favorites: favCount,
            total_history: historyCount,
            last_online: Date.now()
        });
    }
}

// 3. APP VARIABLES
const res = document.getElementById('res');
let favs = JSON.parse(localStorage.getItem('lum3_favs')) || [];
let history = JSON.parse(localStorage.getItem('lum3_history')) || [];
let homeCache = "";

// 4. FUNCTIONS
function initThought() { 
    const quotes = ["A book is a version of the world.", "Wisdom is the ultimate luxury.", "Today a reader, tomorrow a leader.", "Books are a uniquely portable magic."];
    const tBox = document.getElementById('tBox');
    if(tBox) tBox.innerText = quotes[new Date().getDate() % quotes.length]; 
}

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
    localStorage.setItem('lum3_mode', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
};

async function searchNow(q) {
    res.innerHTML = "<p style='grid-column:1/3; text-align:center; color:#d4af37;'>Searching Elite Library...</p>";
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

function buildCard(b) {
    const isFav = favs.some(f => f.u === b.u);
    const div = document.createElement('div');
    div.className = "card";
    let btnText = b.isFree ? "READ NOW" : "BUY NOW";
    let btnColor = b.isFree ? "#d4af37" : "#000c1d";
    div.innerHTML = `
        <div class="fav-btn" onclick="toggleFav('${b.t.replace(/'/g,"")}','${b.img}','${b.u}','${b.s}', ${b.isFree})">${isFav?'❤️':'🤍'}</div>
        <img src="${b.img}" style="width:100%; height:140px; object-fit:cover; border-radius:15px;">
        <p style="font-size:11px; font-weight:800; height:28px; overflow:hidden; margin:8px 0;">${b.t}</p>
        <button onclick="openBook('${b.u}', '${b.s}', '${b.t.replace(/'/g,"")}', '${b.img}')" class="btn-action" style="background:${btnColor}; color:${b.isFree?'#000':'#fff'};">${btnText}</button>
    `;
    res.appendChild(div);
}

window.toggleFav = (t, img, u, s, isFree) => {
    const idx = favs.findIndex(f => f.u === u);
    if(idx > -1) favs.splice(idx, 1); else favs.push({t, img, u, s, isFree});
    localStorage.setItem('lum3_favs', JSON.stringify(favs));
    syncDataToCloud(favs.length, history.length);
    if(document.getElementById('tab-f').classList.contains('active')) showLibrary();
};

window.go = (t) => {
    document.getElementById('tab-h').classList.toggle('active', t==='home');
    document.getElementById('tab-f').classList.toggle('active', t==='fav');
    if(t === 'home') { if(homeCache) res.innerHTML = homeCache; else searchNow('popular'); } else { showLibrary(); }
};

function showLibrary() {
    res.innerHTML = "<h3 style='grid-column:1/3; font-size:14px; margin-top:10px; color:#d4af37;'>FAVOURITES</h3>";
    if(!favs.length) res.innerHTML += "<p style='grid-column:1/3; text-align:center;'>No Favourites.</p>";
    favs.forEach(b => buildCard(b));
    res.innerHTML += "<h3 style='grid-column:1/3; font-size:14px; margin-top:20px; color:#d4af37;'>HISTORY</h3>";
    if(!history.length) res.innerHTML += "<p style='grid-column:1/3; text-align:center;'>No History.</p>";
    history.forEach(b => buildCard(b));
}

window.openBook = (u, s, t, img) => {
    if(!history.some(h => h.u === u)) { 
        history.unshift({t, u, s, img, isFree: true}); 
        history = history.slice(0, 10); 
        localStorage.setItem('lum3_history', JSON.stringify(history)); 
        syncDataToCloud(favs.length, history.length);
    }
    document.getElementById('readerUI').style.display = 'flex';
    document.getElementById('secure-overlay').style.display = 'flex';
    document.getElementById('readerTitle').innerText = t.toUpperCase();
    document.getElementById('secureLaunchBtn').onclick = () => {
        window.open(u, '_blank', 'location=no,toolbar=yes');
        setTimeout(() => { closeReader(); }, 500);
    };
};

window.closeReader = () => { document.getElementById('readerUI').style.display = 'none'; };

window.onload = () => { 
    if(localStorage.getItem('lum3_mode') === 'dark') document.body.classList.add('dark-mode');
    initThought(); 
    if(database && userId) {
        database.ref('users/' + userId).once('value').then((snap) => {
            if(snap.val()) console.log("Cloud Backup Active");
        });
    }
    setTimeout(() => { searchNow('popular'); }, 1000);
};
