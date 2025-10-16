// Konfigurasi Konstanta
const DUE_DATE_PINJAM_MAX = 7; 
const DUE_DATE_ACC_MAX = 3;    

// =========================================================================================
// === GLOBAL STATE EBOOK READER (PDF.js) ==================================================
// =========================================================================================
let pdfDoc = null;
let pdfCurrentPage = 1; 
let pageRendering = false;
let pageNumPending = null;
const scale = 1.5; // Skala rendering default

// Global state untuk menyimpan ID buku dan Judul saat ini
let currentEbookId = null;
let currentEbookTitle = '';

// Variabel Elemen DOM (Akan diisi di renderEbookReader untuk menghindari Error)
let pdfCanvas = null;
let pdfCtx = null;
let pageNumInput = null;
let pageCountInfo = null;
let btnPrev = null;
let btnNext = null;

// =========================================================================================
// === FUNGSI ASINKRON FIREBASE CRUD =======================================================
// =========================================================================================
const snapshotToArray = snapshot => {
    const arr = [];
    if (snapshot && typeof snapshot === 'object' && snapshot !== null) {
        if (Array.isArray(snapshot)) {
            return snapshot;
        }
        for (const key in snapshot) {
            if (snapshot.hasOwnProperty(key)) {
                 arr.push(snapshot[key]);
            }
        }
    }
    return arr;
};

async function getAllData() {
    try {
        const snapshot = await dbRef.once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            return {
                users: snapshotToArray(data.users),
                books: snapshotToArray(data.books),
                transactions: snapshotToArray(data.transactions),
                // Pastikan ebookHistory diambil dengan benar
                ebookHistory: snapshotToArray(data.ebookHistory) || [], 
                bookmarks: snapshotToArray(data.bookmarks),
                suggestions: snapshotToArray(data.suggestions)
            };
        } else {
            return { users: [], books: [], transactions: [], ebookHistory: [], bookmarks: [], suggestions: [] };
        }
    } catch (error) {
        console.error("Error fetching data from Firebase:", error);
        throw new Error("Gagal mengambil data dari server. Cek koneksi atau konfigurasi Firebase.");
    }
}

async function setDatabaseData(path, data) {
    try {
        // Jika path adalah root, gunakan .update()
        if (path === '/') {
            await dbRef.update(data);
        } else {
             await dbRef.child(path).set(data);
        }
    } catch (error) {
        console.error(`Error saving data to ${path}:`, error);
        throw new Error(`Gagal menyimpan data ke ${path}.`);
    }
}

async function initializeDatabase() {
    try {
        const snapshot = await dbRef.once('value');
        
        if (!snapshot.exists() || !snapshot.val().users || snapshot.val().users.length === 0) { 
            console.log("Database is empty or incomplete. Populating with initial data...");
            
            // Data inisialisasi dasar (diambil dari script yang Anda kirim)
            const defaultData = {
                users: [
                    { id: 1, username: 'admin', password: 'admin', role: 'admin', name: 'Admin Utama', email: 'admin@libra.id', profilePicture: null, address: 'Pusat', phone: '02112345' },
                    { id: 2, username: 'user1', password: 'user1', role: 'user', name: 'Anggota Pertama', email: 'user1@mail.com', address: 'Jl. Contoh No. 1', phone: '08123456789', profilePicture: null },
                ],
                books: [
                    { id: 101, title: 'Dasar Pemrograman Web', author: 'Budi Santoso', year: 2022, genre: 'Komputer', category: 'Non-Fiksi', synopsis: 'Panduan dasar web development. Cocok untuk pemula.', type: 'Fisik & Ebook', stock: 5, stockMax: 5, ebookPath: 'assets/sample1.pdf', cover: 'img/cover1.jpg' },
                    { id: 102, title: 'Novel Senja di Ujung Kota', author: 'Ayu Lestari', year: 2023, genre: 'Romance', category: 'Fiksi', synopsis: 'Kisah cinta di bawah langit senja yang penuh drama.', type: 'Buku Fisik', stock: 1, stockMax: 1, ebookPath: null, cover: 'img/cover2.jpg' },
                    { id: 103, title: 'Resep Masakan Nusantara', author: 'Chef Rudi', year: 2021, genre: 'Kuliner', category: 'Non-Fiksi', synopsis: 'Kumpulan 100 resep makanan tradisional Indonesia.', type: 'Ebook', stock: 0, stockMax: 0, ebookPath: 'assets/resep.pdf', cover: 'img/cover3.jpg' },
                    { id: 104, title: 'Teori Fisika Kuantum', author: 'Dr. Ilham', year: 2020, genre: 'Sains', category: 'Non-Fiksi', synopsis: 'Pendalaman tentang mekanika kuantum untuk mahasiswa.', type: 'Fisik & Ebook', stock: 10, stockMax: 10, ebookPath: 'assets/fisika.pdf', cover: 'img/cover4.jpg' },
                ],
                transactions: [
                    { id: 1, userId: 2, bookId: 101, type: 'pinjam', status: 'dipinjam', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), activity: [{ date: new Date().toISOString(), action: 'Buku diserahkan dan mulai dipinjam.' }] },
                    { id: 3, userId: 2, bookId: 104, type: 'pinjam', status: 'diacc', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), activity: [{ date: new Date().toISOString(), action: 'Pengajuan peminjaman buku' }, { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), action: 'Di-ACC oleh Admin. Batas ambil 3 hari.' }] },
                    { id: 4, userId: 2, bookId: 102, type: 'pinjam', status: 'dikembalikan', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), returnedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), activity: [{ date: new Date().toISOString(), action: 'Buku berhasil dikembalikan.' }] },
                ],
                ebookHistory: [
                    { userId: 2, bookId: 103, lastPage: 1, totalPages: 10, lastAccessDate: new Date().toISOString() }, // Menambahkan totalPages
                ],
                bookmarks: [
                    { userId: 2, bookId: 104 },
                ], 
                suggestions: []
            };
            await setDatabaseData('/', defaultData); 
            console.log("Database initialization complete.");
        }
    } catch (error) {
        console.error("Initialization error:", error);
    }
}


// =========================================================================================
// === MANAJEMEN SESSION & UTILITY =========================================================
// =========================================================================================
function getLoggedInUser() {
    return JSON.parse(sessionStorage.getItem('currentUser'));
}

function setLoggedInUser(user) {
    if (user) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        sessionStorage.removeItem('currentUser');
    }
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

// =========================================================================================
// === PDF.JS EBOOK READER LOGIC (Optimized & Fixed) =======================================
// =========================================================================================

/**
 * Menyimpan riwayat bacaan ke Firebase dengan pembaruan yang efisien (menggunakan transaction).
 * FIX: Mengatasi masalah penyimpanan history yang lama.
 */
async function saveEbookProgress(userId, ebookId, pageNumber, totalPages, ebookTitle) {
    if (!userId || !ebookId || !totalPages) return;
    
    // Targetkan node 'ebookHistory' secara langsung
    const historyRef = dbRef.child('ebookHistory'); 
    
    const historyData = {
        userId: userId,
        bookId: ebookId,
        title: ebookTitle,
        lastPage: pageNumber,
        totalPages: totalPages,
        lastAccessDate: new Date().toISOString()
    };

    try {
        // Menggunakan method transaction untuk mencari dan mengupdate/menambah history
        await historyRef.transaction(currentHistory => {
            // currentHistory bisa null atau objek/array
            let historyArray = currentHistory ? (Array.isArray(currentHistory) ? currentHistory : snapshotToArray(currentHistory)) : [];

            const existingIndex = historyArray.findIndex(eh => eh.userId === userId && eh.bookId === ebookId);

            if (existingIndex > -1) {
                // Update existing history
                historyArray[existingIndex] = historyData;
            } else {
                // Add new history
                historyArray.push(historyData);
            }
            // Kembalikan array yang sudah diupdate
            return historyArray;
        });
        
        const infoEl = document.getElementById('last-read-info');
        // Pastikan infoEl ada sebelum diakses
        if (infoEl) infoEl.textContent = `Riwayat: Halaman ${pageNumber}/${totalPages} berhasil disimpan pada ${formatDate(historyData.lastAccessDate)}`;

    } catch (error) {
        console.error("Gagal menyimpan history:", error);
        const infoEl = document.getElementById('last-read-info');
        if (infoEl) infoEl.textContent = "ERROR: Gagal menyimpan riwayat. Cek konsol.";
    }
}


/**
 * Merender halaman PDF ke Canvas.
 */
function renderPage(num) {
    // Pastikan semua variabel DOM global sudah diisi
    if (!pdfDoc || !pdfCanvas || !pdfCtx) return; 

    pageRendering = true;

    pdfDoc.getPage(num).then(function(page) {
        const viewport = page.getViewport({ scale: scale });
        
        // Sesuaikan ukuran canvas agar responsif terhadap container
        const containerWidth = pdfCanvas.parentElement.clientWidth;
        const ratio = containerWidth / viewport.width;
        const newViewport = page.getViewport({ scale: scale * ratio });
        
        pdfCanvas.height = newViewport.height;
        pdfCanvas.width = newViewport.width;
        
        const renderContext = {
            canvasContext: pdfCtx,
            viewport: newViewport
        };
        const renderTask = page.render(renderContext);

        renderTask.promise.then(async function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                queueRenderPage(pageNumPending);
                pageNumPending = null;
            }
            
            // Update state dan UI
            pdfCurrentPage = num;
            updateNavigationUI();
            
            // Simpan riwayat setelah rendering selesai
            const user = getLoggedInUser();
            if (user && currentEbookId && pdfDoc) {
                 await saveEbookProgress(user.id, currentEbookId, pdfCurrentPage, pdfDoc.numPages, currentEbookTitle);
            }
        });
    });
}

/**
 * Menghitung halaman yang tertunda atau langsung render.
 */
function queueRenderPage(num) {
    if (!pdfDoc) return;
    if (num < 1 || num > pdfDoc.numPages) return;
    
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function onPrevPage() {
    if (pdfCurrentPage <= 1) return;
    queueRenderPage(pdfCurrentPage - 1);
}

function onNextPage() {
    if (pdfCurrentPage >= pdfDoc.numPages) return;
    queueRenderPage(pdfCurrentPage + 1);
}

function onPageInput() {
    if (!pdfDoc || !pageNumInput) return;
    let num = parseInt(pageNumInput.value);
    
    if (isNaN(num) || num < 1) {
        num = 1;
    } else if (num > pdfDoc.numPages) {
        num = pdfDoc.numPages;
    }
    
    if (num !== pdfCurrentPage) {
        queueRenderPage(num);
    } else {
        // Kembalikan ke halaman saat ini jika input tidak valid/tidak berubah
        pageNumInput.value = pdfCurrentPage;
    }
}

/**
 * Mengaktifkan/menonaktifkan tombol navigasi dan memperbarui info halaman.
 */
function updateNavigationUI() {
    if (btnPrev && btnNext && pdfDoc) {
        btnPrev.disabled = pdfCurrentPage <= 1;
        btnNext.disabled = pdfCurrentPage >= pdfDoc.numPages;
    }
    if (pageNumInput) {
         pageNumInput.value = pdfCurrentPage;
    }
    if (pageCountInfo && pdfDoc) {
        pageCountInfo.textContent = `/ ${pdfDoc.numPages}`;
    }
}


/**
 * Memuat dan merender PDF (dipanggil di onload body baca_buku.html).
 */
async function renderEbookReader() {
    const user = getLoggedInUser();
    if (!user) { 
        alert('Harap login untuk membaca Ebook.');
        window.location.href = 'login.html'; 
        return; 
    }
    
    // --- PENGAMBILAN ELEMEN DOM (FIX: Diambil saat fungsi dijalankan) ---
    pdfCanvas = document.getElementById('pdf-canvas');
    pdfCtx = pdfCanvas ? pdfCanvas.getContext('2d') : null; 
    pageNumInput = document.getElementById('page-num-input');
    pageCountInfo = document.getElementById('page-count-info');
    btnPrev = document.getElementById('btn-prev-page');
    btnNext = document.getElementById('btn-next-page');
    const lastReadInfo = document.getElementById('last-read-info');

    if (!pdfCanvas || !pdfCtx) {
        const readerContainer = document.getElementById('ebook-reader-container');
        if (readerContainer) readerContainer.innerHTML = '<h2 class="text-red-500 text-center">Error: Elemen penampil PDF (<canvas id="pdf-canvas"></canvas>) tidak ditemukan.</h2>';
        return;
    }

    const ebookId = parseInt(getUrlParameter('id'));
    const initialPageParam = parseInt(getUrlParameter('page')); 
    
    try {
        const data = await getAllData(); 
        const book = data.books.find(b => b.id === ebookId);
        
        if (!book || !book.ebookPath || !book.type.includes('Ebook')) {
            document.getElementById('ebook-title').textContent = 'Ebook tidak ditemukan atau tidak tersedia!';
            return;
        }

        currentEbookId = ebookId;
        currentEbookTitle = book.title;
        const ebookUrl = book.ebookPath;
        
        document.getElementById('ebook-title').textContent = currentEbookTitle;
        const pageTitleEl = document.getElementById('page-title');
        if (pageTitleEl) pageTitleEl.textContent = `Baca ${currentEbookTitle} | Libra`;

        const history = data.ebookHistory.find(eh => eh.userId === user.id && eh.bookId === ebookId);
        
        pdfCurrentPage = initialPageParam || (history && history.lastPage) || 1; 

        if (lastReadInfo && history) {
            lastReadInfo.textContent = `Akses terakhir: Halaman ${history.lastPage} pada ${formatDate(history.lastAccessDate)}`;
        } else if (lastReadInfo) {
            lastReadInfo.textContent = `Mulai membaca dari halaman 1.`;
        }

        const loadingTask = pdfjsLib.getDocument(ebookUrl);
        pdfDoc = await loadingTask.promise;

        if (pdfCurrentPage > pdfDoc.numPages) pdfCurrentPage = pdfDoc.numPages;
        if (pdfCurrentPage < 1) pdfCurrentPage = 1;
        updateNavigationUI(); 

        renderPage(pdfCurrentPage);

        // Tambahkan event listeners
        if (btnPrev) btnPrev.addEventListener('click', onPrevPage);
        if (btnNext) btnNext.addEventListener('click', onNextPage);
        if (pageNumInput) {
            pageNumInput.addEventListener('change', onPageInput);
            pageNumInput.addEventListener('blur', onPageInput);
        }
        
        window.addEventListener('resize', () => {
             clearTimeout(window.resizeTimer);
             window.resizeTimer = setTimeout(() => {
                 if (pdfDoc) renderPage(pdfCurrentPage); 
             }, 300);
        });

    } catch (error) {
        console.error('Error saat memuat PDF:', error);
        document.getElementById('ebook-title').textContent = "ERROR: Gagal memuat Ebook. Pastikan PDF.js library dimuat dan URL-nya benar.";
        const readerContainer = document.getElementById('ebook-reader-container');
        if (readerContainer) readerContainer.innerHTML = '<p class="text-center text-red-500">Gagal merender PDF.</p>';
    }
}

// =========================================================================================
// === FUNGSI LOGIKA EBOOK HISTORY =========================================================
// =========================================================================================

/**
 * Fungsi untuk menghapus SEMUA riwayat baca ebook milik user yang sedang login.
 */
async function deleteEbookHistory() {
    // Diasumsikan getLoggedInUser ada di script.js Anda
    const user = typeof getLoggedInUser === 'function' ? getLoggedInUser() : null;
    if (!user) {
        alert('Anda harus login untuk menghapus riwayat baca.');
        return;
    }

    if (!confirm('Apakah Anda yakin ingin menghapus SEMUA riwayat baca ebook Anda? Tindakan ini tidak dapat dibatalkan.')) {
        return;
    }

    try {
        // Ambil semua data ebookHistory
        // Diasumsikan 'dbRef' sudah terdefinisi dan menunjuk ke root Firebase Database
        const snapshot = await dbRef.child('ebookHistory').once('value');
        const allHistory = snapshot.val();
        
        if (!allHistory) {
            alert('Tidak ada riwayat baca untuk dihapus.');
            return;
        }

        const updates = {};
        let isDeleted = false;
        
        // Cari entri user yang login dan tandai untuk dihapus (menggunakan 'null')
        for (const key in allHistory) {
            if (allHistory.hasOwnProperty(key) && allHistory[key].userId === user.id) {
                // Gunakan key ID langsung untuk operasi update/delete
                updates[`ebookHistory/${key}`] = null;
                isDeleted = true;
            }
        }
        
        if (!isDeleted) {
            alert('Tidak ada riwayat baca Anda yang ditemukan untuk dihapus.');
            await renderEbookHistory();
            return;
        }
        
        // Lakukan operasi penghapusan
        // Menggunakan update pada root dbRef dengan path spesifik untuk menghapus
        await dbRef.update(updates);
        
        alert('Semua riwayat baca ebook Anda berhasil dihapus.');
        // Perbarui tampilan
        await renderEbookHistory();

    } catch (error) {
        console.error("Error deleting ebook history:", error);
        alert(`Gagal menghapus riwayat baca: ${error.message}`);
    }
}


/**
 * Fungsi utama untuk merender riwayat baca ebook user.
 */
async function renderEbookHistory() {
    // Diasumsikan getLoggedInUser ada di script.js Anda
    const user = typeof getLoggedInUser === 'function' ? getLoggedInUser() : null;
    const historyListContainer = document.getElementById('ebook-history-list');
    const deleteBtn = document.getElementById('delete-history-btn');

    if (!historyListContainer) return;

    historyListContainer.innerHTML = '<p class="text-center text-gray-500 p-4"><i class="fas fa-spinner fa-spin mr-2"></i> Memuat riwayat...</p>';
    deleteBtn.style.display = 'none'; // Sembunyikan tombol default

    if (!user) {
        historyListContainer.innerHTML = '<p class="text-red-500 p-4 text-center border rounded">Silakan login untuk melihat riwayat baca Anda.</p>';
        return;
    }

    try {
        // Diasumsikan getAllData ada di script.js Anda
        const data = typeof getAllData === 'function' ? await getAllData() : { ebookHistory: [], books: [] };
        
        // 1. Filter history berdasarkan user ID dan urutkan
        const userHistory = data.ebookHistory
            .filter(eh => eh.userId === user.id)
            .sort((a, b) => new Date(b.lastAccessDate) - new Date(a.lastAccessDate)); 

        historyListContainer.innerHTML = ''; 

        if (userHistory.length === 0) {
            historyListContainer.innerHTML = '<p class="text-gray-500 p-4 text-center border rounded">Anda belum pernah membaca ebook.</p>';
            return;
        }
        
        // 2. Tampilkan tombol Hapus jika ada riwayat
        deleteBtn.style.display = 'inline-flex';

        // 3. Render setiap item history
        userHistory.forEach(history => {
            // Diasumsikan formatDate ada di script.js Anda
            const date = typeof formatDate === 'function' ? formatDate(history.lastAccessDate) : history.lastAccessDate;
            
            const readUrl = `baca_buku.html?id=${history.bookId}&page=${history.lastPage}`;
            
            const bookInfo = data.books.find(b => b.id === history.bookId);
            const coverUrl = bookInfo ? (bookInfo.cover && bookInfo.cover.startsWith('data:image') ? bookInfo.cover : (bookInfo.cover || 'img/default_cover.jpg')) : 'img/default_cover.jpg';
            const totalPages = history.totalPages || '??'; 

            const historyItem = document.createElement('a'); 
            historyItem.href = readUrl; 
            historyItem.className = 'history-item hover:shadow-lg transition-shadow'; 
            
            historyItem.innerHTML = `
                <div class="flex items-center space-x-4">
                    <img src="${coverUrl}" alt="Cover ${history.title}" class="w-12 h-18 object-cover rounded shadow" onerror="this.onerror=null; this.src='img/default_cover.jpg';">
                    <div class="flex-1">
                        <p class="text-lg font-semibold text-gray-800">${history.title || 'Judul Buku Tidak Diketahui'}</p>
                        <p class="text-sm text-gray-600">Progress: <span class="font-bold text-indigo-600">${history.lastPage} / ${totalPages} Halaman</span></p>
                        <p class="text-xs text-gray-400">Akses terakhir: ${date}</p>
                    </div>
                    <i class="fas fa-arrow-right text-xl text-gray-400"></i>
                </div>
            `;
            historyListContainer.appendChild(historyItem);
        });
    } catch (error) {
        console.error("Render Ebook History Error:", error);
        historyListContainer.innerHTML = `<p class="text-red-500 p-4 text-center border rounded">Gagal memuat riwayat: ${error.message}</p>`;
    }
}
// =========================================================================================
// === CORE APP LOGIC (Lainnya) ============================================================
// =========================================================================================


// --- LOGIKA UTAMA APLIKASI (INIT & NAVIGASI) ---
document.addEventListener('DOMContentLoaded', async () => { 
    await initializeDatabase(); 
    
    const user = getLoggedInUser();
    
    // Inisialisasi Menu Burger
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = hamburger.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // Perbarui Navigasi & Tautan Login/Logout
    const authLink = document.getElementById('auth-link');
    
    if (authLink && navMenu) {
        if (user) {
            authLink.textContent = user.role === 'admin' ? `Hi, Admin (Logout)` : `Hi, ${user.username} (Logout)`;
            authLink.href = '#';
            
            authLink.addEventListener('click', (e) => {
                if (confirm("Apakah Anda yakin ingin logout?")) {
                    setLoggedInUser(null);
                    window.location.href = 'index.html';
                }
                e.preventDefault();
            });
            
            // LOGIKA PENTING: FILTER NAVIGASI UNTUK ADMIN
            if (user.role === 'admin') {
                const navLinks = navMenu.querySelectorAll('a');
                
                navLinks.forEach(link => {
                    // Hilangkan Pinjam, Ebook, Bookmark, dan Saran/Kritik dari header untuk Admin
                    // Cek berdasarkan href yang mengandung nama file
                    if (link.href.includes('pinjam.html') || 
                        link.href.includes('ebook.html') || 
                        link.href.includes('bookmark.html') ||
                        link.href.includes('saran.html')) { 
                        link.closest('li').remove(); // Hapus item list (li) nya
                    }
                });

                if (!navMenu.querySelector('a[href="admin.html"]')) {
                    const adminLinkLi = document.createElement('li');
                    const adminLinkA = document.createElement('a');
                    adminLinkA.href = 'admin.html';
                    adminLinkA.textContent = 'Admin Dashboard';
                    adminLinkLi.appendChild(adminLinkA);
                    
                    // Sisipkan sebelum link auth
                    const authLi = authLink.closest('li');
                    if (authLi) navMenu.insertBefore(adminLinkLi, authLi); 
                }

            } else {
                const adminLink = navMenu.querySelector('a[href="admin.html"]');
                if (adminLink) adminLink.closest('li').remove();
            }

        } else {
            authLink.textContent = 'Login/Daftar';
            authLink.href = 'login.html';
        }
    }


    // Panggil fungsi render untuk halaman spesifik
    const page = document.body.id;
    try {
        switch (page) {
            case 'home-page':
            case 'pinjam-page':
            case 'ebook-page':
                await renderBookList(page); 
                handleSearch(page);
                break;
            case 'bookmark-page':
                if (user) await renderBookList('bookmark-page');
                handleSearch('bookmark-page');
                break;
            case 'saran-page':
                if (user && user.role === 'admin') {
                     document.querySelector('.container').innerHTML = '<h2 class="text-center">Akses Ditolak. Silakan gunakan Admin Dashboard.</h2>';
                } else {
                     handleSuggestionForm();
                }
                break;
            case 'login-page':
                handleLogin();
                break;
            case 'daftar-page':
                handleRegistration();
                break;
            case 'admin-page':
                // Memerlukan fungsi-fungsi admin di bawah
                if (window.renderAdminDashboard) renderAdminDashboard();
                break;
            case 'buka-buku-page':
                await renderBookDetail();
                break;
            case 'pengajuan-pinjam-page':
                await handlePengajuanPinjam();
                break;
            case 'baca-buku-page':
                // Panggil fungsi PDF.js yang sudah diperbaiki
                await renderEbookReader(); 
                break;
            case 'status-pinjam-page':
                await renderTransactionStatus('pinjam');
                break;
            case 'history-pinjam-page':
                await renderTransactionHistory('pinjam');
                break;
            case 'history-ebook-page':
                // Panggil fungsi render history ebook yang sudah diperbaiki
                await renderEbookHistory(); 
                break;
        }
    } catch(err) {
        console.error("Error during page rendering:", err);
        const mainContainer = document.querySelector('.container') || document.querySelector('main');
        if (mainContainer) {
            mainContainer.innerHTML = `<h2 style="color: var(--danger-color); text-align: center;">Terjadi Kesalahan Kritis: ${err.message}</h2>`;
        }
    }

    // Auto-cancel transaksi setelah 3 hari
    await checkOverdueTransactions();
});

// Logic pembatalan otomatis (untuk transaksi diacc yang tidak diambil > 3 hari)
async function checkOverdueTransactions() { /* ... (Fungsi ini tetap sama) ... */
    try {
        const data = await getAllData(); 
        const now = Date.now();
        let dataChanged = false;
        
        const transactionsToUpdate = [...data.transactions]; 

        transactionsToUpdate.forEach((t, index) => {
            if (t.status === 'diacc' && t.dueDate) {
                const dueDate = new Date(t.dueDate).getTime(); 
                
                // Cek apakah sudah lewat 3 hari (DUE_DATE_ACC_MAX)
                // Catatan: logika t.dueDate seharusnya adalah tanggal terakhir pengambilan buku, 
                // jika t.dueDate sudah di set 3 hari dari ACC, maka jika Now > dueDate, batalkan.
                if (now > dueDate) {
                    const book = data.books.find(b => b.id === t.bookId);

                    data.transactions[index].status = 'dibatalkan';
                    data.transactions[index].activity.push({ date: new Date().toISOString(), action: 'Dibatalkan Otomatis (Tidak diambil dalam 3 hari)' });
                    
                    // Kembalikan stok yang sudah terpotong saat 'diacc'
                    if (book && book.type.includes('Fisik') && book.stock < book.stockMax) {
                        const bookIndex = data.books.findIndex(b => b.id === t.bookId);
                        if(bookIndex !== -1) data.books[bookIndex].stock += 1;
                    } 
                    dataChanged = true;
                }
            }
        });

        if (dataChanged) {
            // Menggunakan setDatabaseData dengan path '/' akan memperbarui root, termasuk users, books, dan transactions
            await setDatabaseData('/', data); 
        }
    } catch (error) {
        console.error("Error checking overdue transactions:", error);
    }
}

// ... (Bagian atas file script.js Anda, termasuk konfigurasi, variabel global, dan fungsi CRUD Firebase) ...

// =========================================================================================
// === OTP SIMULATION FUNCTIONS (START) ====================================================
// =========================================================================================

// Global state/placeholder untuk timer countdown
let otpCountdownTimer; 

/**
 * Mensimulasikan pembuatan Kode OTP 6 digit.
 * CATATAN: Dalam implementasi nyata, ini harus dilakukan di sisi server yang aman.
 */
function generateOTP() {
    // Generate a 6-digit random number for simulation
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Mengatur hitungan mundur untuk tombol kirim ulang OTP.
 */
function startResendCountdown(buttonEl) {
    let timeLeft = 120; // 120 seconds
    buttonEl.disabled = true;
    buttonEl.classList.add('disabled'); // Tambahkan kelas untuk styling

    // Hapus timer sebelumnya jika ada
    if (otpCountdownTimer) clearInterval(otpCountdownTimer); 

    const updateButtonText = () => {
         if (timeLeft > 0) {
            buttonEl.textContent = `Kirim Ulang Kode (${timeLeft}s)`;
            timeLeft--;
        } else {
            clearInterval(otpCountdownTimer);
            buttonEl.textContent = 'Kirim Ulang Kode';
            buttonEl.disabled = false;
            buttonEl.classList.remove('disabled'); // Hapus kelas styling
        }
    };

    updateButtonText(); // Panggilan awal
    otpCountdownTimer = setInterval(updateButtonText, 1000);
}


// =========================================================================================
// === FUNGSI AUTHENTIKASI (LOGIN & DAFTAR) - MODIFIED ======================================
// =========================================================================================

// ... (Pastikan function handleLogin() tetap ada di atas atau di bawahnya jika Anda memilikinya) ...

function handleRegistration() { 
    // Mengambil semua form (Langkah 1, 2, dan 3 yang baru)
    const form1 = document.getElementById('registration-step1');
    const form2 = document.getElementById('registration-step2'); // NEW: OTP Form
    const form3 = document.getElementById('registration-step3'); // OLD: Step 2
    
    const fotoUploadInput = document.getElementById('foto-upload');
    const fotoPreview = document.getElementById('foto-preview');
    const fotoHiddenInput = document.getElementById('profile_picture_data');
    const btnResendOtp = document.getElementById('btn-resend-otp');
    const otpInfoEl = document.getElementById('otp-info');
    
    if (!form1 || !form2 || !form3 || !fotoUploadInput) return;
    
    // Logika upload foto tetap sama
    fotoUploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert("File harus berupa gambar (PNG, JPG, dll.)");
                fotoUploadInput.value = '';
                fotoHiddenInput.value = '';
                fotoPreview.src = 'img/default_user.png';
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                fotoPreview.src = event.target.result;
                fotoHiddenInput.value = event.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            fotoHiddenInput.value = '';
            fotoPreview.src = 'img/default_user.png';
        }
    });

    // --- LOGIC STEP 1: Collect Data & Send OTP ---
    form1.addEventListener('submit', (e) => {
        e.preventDefault();
        const photoData = fotoHiddenInput.value;
        const userEmail = form1.email.value;

        if (!photoData || photoData.length < 100) {
            alert('Anda wajib mengunggah Foto Profil!');
            return;
        }

        // 1. Generate OTP
        const otpCode = generateOTP();
        
        // 2. Simpan semua data sementara (termasuk OTP) di sessionStorage
        sessionStorage.setItem('tempRegData', JSON.stringify({ 
            name: form1.nama.value, 
            address: form1.alamat.value, 
            phone: form1.nohp.value, 
            email: userEmail, 
            profilePicture: photoData,
            // Simpan OTP sementara (simulasi)
            otp: otpCode, 
        }));

        // 3. SIMULASI: Tampilkan OTP
        console.log(`[LIBRA REGISTRATION SIMULATION] Kode verifikasi untuk ${userEmail} adalah: ${otpCode}`);
        alert(`SIMULASI: Kode OTP telah dikirim ke email ${userEmail}. Cek console log (F12) atau gunakan kode: ${otpCode}`);
        
        // 4. Update UI dan Lanjut ke Step 2
        if (otpInfoEl) otpInfoEl.textContent = `Kode OTP telah dikirim ke email: ${userEmail}.`;

        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';

        // 5. Mulai hitungan mundur tombol Kirim Ulang
        startResendCountdown(btnResendOtp);
    });
    
    // --- LOGIC RESEND OTP BUTTON ---
    btnResendOtp.addEventListener('click', (e) => {
        e.preventDefault();
        const tempRegData = JSON.parse(sessionStorage.getItem('tempRegData'));
        if (!tempRegData) {
            alert('Terjadi kesalahan data. Silakan ulangi dari Langkah 1.');
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step1').style.display = 'block';
            // Pastikan timer berhenti jika kembali ke step 1
            if (otpCountdownTimer) clearInterval(otpCountdownTimer); 
            return;
        }

        // 1. Generate OTP baru
        const newOtpCode = generateOTP();
        tempRegData.otp = newOtpCode;
        sessionStorage.setItem('tempRegData', JSON.stringify(tempRegData));

        // 2. SIMULASI: Tampilkan OTP baru
        console.log(`[LIBRA REGISTRATION SIMULATION] Kode OTP BARU untuk ${tempRegData.email} adalah: ${newOtpCode}`);
        alert(`SIMULASI: Kode OTP baru telah dikirim ke email ${tempRegData.email}. Cek console log (F12) atau gunakan kode: ${newOtpCode}`);

        // 3. Reset countdown dan kosongkan field
        startResendCountdown(btnResendOtp);
        document.getElementById('otp_code').value = ''; 
    });


    // --- LOGIC STEP 2: OTP Verification ---
    form2.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredOTP = form2.otp_code.value.trim();
        const tempRegData = JSON.parse(sessionStorage.getItem('tempRegData'));
        
        if (!tempRegData) {
            alert('Sesi pendaftaran habis atau bermasalah. Silakan ulangi dari Langkah 1.');
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step1').style.display = 'block';
            return;
        }
        
        // Cek OTP
        if (enteredOTP === tempRegData.otp) {
            // Sukses! Lanjut ke Step 3
            document.getElementById('step2').style.display = 'none';
            document.getElementById('step3').style.display = 'block';
            // Hentikan timer countdown
            if (otpCountdownTimer) clearInterval(otpCountdownTimer);
        } else {
            alert('Kode OTP salah. Silakan coba lagi.');
            form2.otp_code.value = '';
        }
    });


    // --- LOGIC STEP 3: Final Registration (OLD STEP 2) ---
    form3.addEventListener('submit', async (e) => { 
        e.preventDefault();
        const tempRegData = JSON.parse(sessionStorage.getItem('tempRegData'));
        const username = form3.username.value; 
        const password = form3.password.value; 
        const confirmPassword = form3.confirm_password.value; 
        
        if (password !== confirmPassword) {
            alert('Konfirmasi password tidak cocok!');
            return;
        }

        if (!tempRegData) {
            alert('Sesi pendaftaran habis atau bermasalah. Silakan ulangi dari Langkah 1.');
            window.location.reload();
            return;
        }
        
        try {
            const data = await getAllData();
            // Cek ketersediaan username
            if (data.users.some(u => u.username === username)) {
                alert('Username sudah digunakan!');
                return;
            }

            // Hapus OTP dari data sebelum disimpan ke database
            delete tempRegData.otp;

            const newUser = {
                ...tempRegData,
                id: Date.now(),
                username,
                password,
                role: 'user',
            };

            // Simpan data ke Firebase
            data.users.push(newUser);
            await setDatabaseData('users', data.users);
            
            sessionStorage.removeItem('tempRegData');
            alert('Pendaftaran Berhasil! Akun Anda sudah terverifikasi. Silakan Login.');
            window.location.href = 'login.html';

        } catch (error) {
            alert(error.message || 'Gagal mendaftar. Cek koneksi Anda.');
        }
    });
}
// ... (Sisa dari script.js Anda) ...

// --- FUNGSI RENDER BUKU DAN PENCARIAN (Logika Gabungan Filter & Search) ---
async function renderBookList(page, filter = {}) { 
    const listContainer = document.getElementById('book-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '<p style="text-align: center;">Memuat daftar...</p>'; 

    try {
        const data = await getAllData(); 
        let books = data.books;
        const user = getLoggedInUser();
        
        // 1. FILTER BERDASARKAN HALAMAN
        if (page === 'pinjam-page') {
            books = books.filter(b => b.type.includes('Fisik') && b.stock > 0);
        } else if (page === 'ebook-page') {
            books = books.filter(b => b.type.includes('Ebook'));
        } else if (page === 'bookmark-page') {
            if (!user) {
                 listContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">Harap login untuk melihat bookmark Anda.</p>';
                 return;
            }
            const bookmarkedIds = data.bookmarks.filter(bm => bm.userId === user.id).map(bm => bm.bookId);
            books = books.filter(b => bookmarkedIds.includes(b.id));
        }

        // 2. LOGIKA PEMFILTERAN TAG DINAMIS (Kategori, Jenis, Genre)
        const { filterType, tagValue } = filter; 

        if (filterType && tagValue) {
            books = books.filter(book => {
                const tag = tagValue.toLowerCase();

                if (filterType === 'jenis_buku') {
                    const bookTypeLower = book.type.toLowerCase();

                    if (tag === 'ebook') {
                        return bookTypeLower.includes('ebook');
                    } else if (tag === 'fisik') {
                         return bookTypeLower.includes('fisik');
                    }
                } 
                else if (filterType === 'kategori') {
                    const bookCategoryFormatted = book.category
                                                        .toLowerCase()
                                                        .replace(/[-\s]/g, '_'); 
                    
                    if (tag === 'fiksi') {
                        return bookCategoryFormatted === 'fiksi';
                    } else if (tag === 'non_fiksi') {
                         return bookCategoryFormatted === 'non_fiksi';
                    }
                } 
                else if (filterType === 'genre') {
                
                    return book.genre.toLowerCase().includes(tag); 
                }
                
                return true; 
            });
        }
        
       // 3. LOGIKA PENCARIAN TEKS
       books = books.filter(book => {
            const search = (filter.search || '').toLowerCase();
            if (!search) return true; // Lewati filter jika tidak ada teks pencarian

            return book.title.toLowerCase().includes(search) || 
                   book.author.toLowerCase().includes(search) ||
                   book.genre.toLowerCase().includes(search) ||
                   book.category.toLowerCase().includes(search) ||
                   book.type.toLowerCase().includes(search) ||
                   String(book.year).includes(search);
        });

        listContainer.innerHTML = ''; 

        if (books.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: #666;">Tidak ada buku yang ditemukan ${page === 'bookmark-page' ? 'di Bookmark Anda' : 'sesuai kriteria'}.</p>`;
            return;
        }

        books.forEach(book => {
            // 1. Dapatkan user yang sedang login di awal loop
            const user = getLoggedInUser();
            
            // 2. Tentukan URL tujuan berdasarkan role pengguna
            let targetUrl = `buka_buku.html?id=${book.id}`;
            if (user && user.role === 'admin') {
                targetUrl = `buka_buku_admin.html?id=${book.id}`;
            }
            
            const card = document.createElement('div');
            card.className = 'book-card';
            
            // 3. Gunakan URL yang sudah ditentukan
            card.onclick = () => window.location.href = targetUrl;
            
            const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
        
            card.innerHTML = `
                <img src="${coverSrc}" alt="Cover ${book.title}" onerror="this.onerror=null; this.src='img/default.jpg';"> 
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p><strong>Penulis:</strong> ${book.author} (${book.year})</p>
                    <p><strong>Jenis Buku:</strong> <span class="book-type-tag" style="background-color: #eee; padding: 2px 5px; border-radius: 3px; font-size: 0.8em;">${book.type}</span></p>
                </div>
            `;
            listContainer.appendChild(card);
        });
            } catch (error) {
                console.error("Gagal memuat daftar buku:", error);
                listContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: var(--danger-color);">Gagal memuat daftar buku: ${error.message}</p>`;
            }
        }
const filterBookList = (type, value) => {
    // Pastikan input pencarian ada, jika tidak, asumsikan kosong
    const searchInput = document.getElementById('search-input');
    const searchValue = searchInput ? searchInput.value : '';

    renderBookList(document.body.id, {
        search: searchValue,
        filterType: type,
        tagValue: value
    });
};

function handleSearch(page) { 
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (searchInput && searchButton) {
        const performSearch = () => {
            const currentType = window.currentFilterType || 'all'; 
            const activeVal = window.activeTag || null;
            
            renderBookList(page, { 
                search: searchInput.value,
                filterType: currentType, 
                tagValue: activeVal     
            });
        };
        
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        // Tidak perlu window.addEventListener('load') di sini karena sudah ada di DOMContentLoaded
    }
}
// --- LOGIKA HALAMAN DETAIL BUKU (buka_buku.html) ---
async function renderBookDetail() { 
    const urlParams = new URLSearchParams(window.location.search);
    const bookId = parseInt(urlParams.get('id'));
    
    try {
        const data = await getAllData();
        const book = data.books.find(b => b.id === bookId);
        const user = getLoggedInUser();
        
        if (!book) {
            document.querySelector('.container').innerHTML = '<h2>Buku tidak ditemukan!</h2>';
            return;
        }

        const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
        document.getElementById('page-title').textContent = `${book.title} | Libra`;
        document.getElementById('detail-title').textContent = book.title;
        document.getElementById('detail-cover').src = coverSrc;
        document.getElementById('detail-cover').onerror = function() { this.onerror=null; this.src='img/default.jpg'; };
        document.getElementById('detail-jenis').textContent = `Jenis: ${book.type}`;
        document.getElementById('detail-sinopsis').textContent = book.synopsis;
        document.getElementById('detail-kategori').textContent = book.category;
        document.getElementById('detail-author').textContent = book.author;
        document.getElementById('detail-tahun').textContent = book.year;
        document.getElementById('detail-genre').textContent = book.genre;
        document.getElementById('detail-stock').textContent = book.type.includes('Fisik') ? `Buku Fisik Tersedia: ${book.stock} buah` : 'Buku Fisik: Tidak Tersedia';

        const btnPinjam = document.getElementById('btn-pinjam');
        const btnBaca = document.getElementById('btn-baca');
        const btnBookmark = document.getElementById('btn-bookmark');
        
        if (btnPinjam) {
            if (book.type.includes('Fisik')) {
                btnPinjam.onclick = () => {
                    if (!user) { alert('Harap login untuk mengajukan peminjaman.'); window.location.href = 'login.html'; return; }
                    if (book.stock <= 0) { alert('Maaf, buku fisik sedang tidak tersedia saat ini.'); return; }
                    window.location.href = `pengajuan_pinjam.html?id=${book.id}`;
                };
            } else {
                btnPinjam.style.display = 'none';
            }
        }

        if (btnBaca) {
            if (book.type.includes('Ebook') && book.ebookPath) {
                btnBaca.onclick = () => {
                    if (!user) { alert('Harap login untuk membaca Ebook.'); window.location.href = 'login.html'; return; }
                    window.location.href = `baca_buku.html?id=${book.id}`;
                };
            } else {
                btnBaca.style.display = 'none';
            }
        }

        if (btnBookmark) {
            if (user) {
                const isBookmarked = data.bookmarks.some(bm => bm.userId === user.id && bm.bookId === book.id);
                
                btnBookmark.textContent = isBookmarked ? '✓ Hapus Bookmark' : '+ Tambahkan Bookmark';
                btnBookmark.classList.toggle('bookmarked', isBookmarked);

                btnBookmark.onclick = async () => {
                    try {
                        const newData = await getAllData();
                        const index = newData.bookmarks.findIndex(bm => bm.userId === user.id && bm.bookId === book.id);
                        
                        if (index > -1) {
                            newData.bookmarks.splice(index, 1);
                            alert('Bookmark dihapus!');
                        } else {
                            newData.bookmarks.push({ userId: user.id, bookId: book.id });
                            alert('Bookmark ditambahkan!');
                        }
                        await setDatabaseData('bookmarks', newData.bookmarks);
                        await renderBookDetail(); 
                    } catch (error) {
                        alert(error.message || 'Gagal mengubah bookmark.');
                    }
                };
            } else {
                btnBookmark.onclick = () => { alert('Harap login untuk menambahkan bookmark.'); window.location.href = 'login.html'; };
            }
        }
    } catch (error) {
        document.querySelector('.container').innerHTML = `<h2>Gagal memuat detail buku: ${error.message}</h2>`;
    }
}


// --- LOGIKA PENGAJUAN PINJAM (`pengajuan_pinjam.html`) ---
async function handlePengajuanPinjam() { 
    const user = getLoggedInUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = parseInt(urlParams.get('id'));
    
    try {
        const data = await getAllData(); 
        const book = data.books.find(b => b.id === bookId);

        if (!book || !book.type.includes('Fisik') || book.stock <= 0) {
            document.querySelector('.container').innerHTML = '<h2>Maaf, buku tidak tersedia.</h2>';
            return;
        }
        
        const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');

        document.getElementById('pinjam-judul').textContent = book.title;
        document.getElementById('pinjam-cover').src = coverSrc;
        document.getElementById('pinjam-stock').textContent = book.stock;
        
        document.getElementById('form-pengajuan').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const newData = await getAllData();
                const bookCheck = newData.books.find(b => b.id === bookId); 

                if (bookCheck.stock <= 0) {
                     alert('Maaf buku tidak tersedia saat ini.');
                     return;
                }

                // Cek apakah user punya transaksi aktif untuk buku ini
                const activeTransaction = newData.transactions.some(t => 
                    t.userId === user.id && t.bookId === bookId && 
                    (t.status === 'diajukan' || t.status === 'diacc' || t.status === 'dipinjam')
                );

                if (activeTransaction) {
                    alert('Anda sudah memiliki pengajuan/pinjaman aktif untuk buku ini!');
                    return;
                }

                const newTransaction = {
                    id: Date.now(),
                    userId: user.id,
                    bookId: book.id,
                    type: 'pinjam',
                    status: 'diajukan',
                    date: new Date().toISOString(),
                    activity: [{ date: new Date().toISOString(), action: 'Pengajuan peminjaman buku.' }]
                };
                
                newData.transactions.push(newTransaction);
                await setDatabaseData('transactions', newData.transactions);
                
                alert('Sukses mengajukan peminjaman buku! Tunggu konfirmasi Admin (Maksimal 1 hari kerja).');
                window.location.href = 'pinjam.html'; 
            } catch (error) {
                alert(error.message || 'Gagal mengajukan pinjaman.');
            }
        });
    } catch (error) {
        document.querySelector('.container').innerHTML = `<h2>Gagal memuat form pinjam: ${error.message}</h2>`;
    }
}


// --- LOGIKA STATUS & HISTORY PINJAM/EBOOK ---
async function renderTransactionStatus(type) {
    const user = getLoggedInUser();
    const container = document.getElementById(`${type}-status-list`);
    if (!user || !container) {
        if (container) container.innerHTML = '<p style="text-align: center;">Silakan login untuk melihat status ini.</p>';
        return;
    }

    try {
        const data = await getAllData();
        const userTransactions = data.transactions
            .filter(t => t.userId === user.id && t.type === type && (t.status === 'diajukan' || t.status === 'diacc' || t.status === 'dipinjam'))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        const canceledRejected = data.transactions
            .filter(t => t.userId === user.id && t.type === type && (t.status === 'ditolak' || t.status === 'dibatalkan'))
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = '<h3>Transaksi Aktif (Diajukan / DiACC / Dipinjam)</h3>';

        if (userTransactions.length === 0) {
            container.innerHTML += '<p style="text-align: center;">Anda belum memiliki transaksi aktif.</p>';
        }

        userTransactions.forEach(t => {
            const book = data.books.find(b => b.id === t.bookId);
            if (!book) return;

            const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
            let statusClass = `status-${t.status.toLowerCase()}`;
            let statusText = t.status.charAt(0).toUpperCase() + t.status.slice(1);
            let infoStatus = '';
            const now = Date.now();
            const dueDate = t.dueDate ? new Date(t.dueDate).getTime() : null;
            let diffDays = null;
            let activityList = '';

            if (dueDate) {
                diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            }

            if (t.status === 'diacc' && dueDate) {
                infoStatus = `Waktu ambil tersisa: ${Math.max(0, diffDays)} hari.`;
                statusClass = diffDays <= 0 ? 'status-telat' : 'status-diacc';
                if (diffDays <= 0) infoStatus = 'Dibatalkan otomatis karena waktu ambil habis.';
            } else if (t.status === 'dipinjam' && dueDate) {
                if (diffDays < 0) {
                    statusClass = 'status-telat';
                    infoStatus = `TELAT: ${Math.abs(diffDays)} hari! Segera kembalikan.`;
                } else {
                    infoStatus = `Tersisa: ${diffDays} hari.`;
                }
            }
            
            if (t.activity) {
                activityList = t.activity.map(a => `<li>[${formatDate(a.date)}] ${a.action}</li>`).join('');
            }

            container.innerHTML += `
                <div class="status-card">
                    <img src="${coverSrc}" alt="Cover">
                    <div>
                        <h4>${book.title} (${book.year})</h4>
                        <p>Status: <span class="${statusClass} status-pinjam">${statusText}</span></p>
                        ${infoStatus ? `<p style="color: ${statusClass.includes('telat') ? 'var(--danger-color)' : '#333'}; font-weight: bold; font-size: 0.9em;">${infoStatus}</p>` : ''}
                        <div class="activity-log" style="margin-top: 5px; font-size: 0.9em;">
                            <details>
                                <summary style="cursor: pointer;">Aktivitas (klik)</summary>
                                <ul style="margin-left: 20px; list-style-type: disc;">${activityList}</ul>
                            </details>
                        </div>
                    </div>
                </div>
            `;
        });
        
        if (canceledRejected.length > 0) {
            container.innerHTML += '<h3 style="margin-top: 20px;">Transaksi Ditolak/Dibatalkan</h3>';
            canceledRejected.forEach(t => {
                const book = data.books.find(b => b.id === t.bookId);
                if (!book) return;
                const activityList = t.activity.map(a => `<li>[${formatDate(a.date)}] ${a.action}</li>`).join('');
                const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
                container.innerHTML += `
                    <div class="status-card" style="opacity: 0.7;">
                        <img src="${coverSrc}" alt="Cover">
                        <div>
                            <h4>${book.title} (${book.year})</h4>
                            <p>Status: <span class="status-dibatalkan status-pinjam">${t.status.toUpperCase()}</span></p>
                            <div class="activity-log" style="margin-top: 5px; font-size: 0.9em;">
                                <details>
                                    <summary style="cursor: pointer;">Aktivitas (klik)</summary>
                                    <ul style="margin-left: 20px; list-style-type: disc;">${activityList}</ul>
                                </details>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

    } catch (error) {
        container.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Gagal memuat status: ${error.message}</p>`;
    }
}

async function renderTransactionHistory(type) {
    const user = getLoggedInUser();
    const container = document.getElementById(`${type}-history-list`);
    if (!user || !container) {
        if (container) container.innerHTML = '<p style="text-align: center;">Silakan login untuk melihat history.</p>';
        return;
    }

    try {
        const data = await getAllData();
        container.innerHTML = '';

        if (type === 'pinjam') {
            const history = data.transactions
                .filter(t => t.userId === user.id && t.type === type && t.status === 'dikembalikan')
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            if (history.length === 0) {
                container.innerHTML = '<p style="text-align: center;">Anda belum memiliki history peminjaman yang sukses.</p>';
                return;
            }

            history.forEach(t => {
                const book = data.books.find(b => b.id === t.bookId);
                if (!book) return;
                const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
                
                container.innerHTML += `
                    <div class="status-card">
                        <img src="${coverSrc}" alt="Cover">
                        <div>
                            <h4>${book.title} (${book.year})</h4>
                            <p style="font-size: 0.9em;">Dipinjam: ${formatDate(t.date)}</p>
                            <p style="font-size: 0.9em;">Dikembalikan: <strong>${formatDate(t.returnedDate)}</strong></p>
                        </div>
                    </div>
                `;
            });

        } else if (type === 'ebook') {
             // Logika History Ebook sudah dihandle oleh renderEbookHistory
             await renderEbookHistory();
             return;
        }
    } catch (error) {
        container.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Gagal memuat history: ${error.message}</p>`;
    }
}

// --- LOGIKA SARAN & KRITIK USER ---
function handleSuggestionForm() {
    const user = getLoggedInUser();
    const formArea = document.getElementById('suggestion-form-area');
    const form = document.getElementById('suggestion-form');

    if (!user) {
        if(formArea) formArea.innerHTML = '<p class="text-center" style="text-align: center;">Harap login untuk mengirim saran dan kritik.</p>';
        return;
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const message = form.message.value;
            if (!message) return;

            try {
                const data = await getAllData();
                data.suggestions.push({
                    id: Date.now(),
                    userId: user.id,
                    username: user.username,
                    message: message,
                    date: new Date().toISOString()
                });
                
                await setDatabaseData('suggestions', data.suggestions);

                alert('Saran/Kritik berhasil dikirim! Terima kasih.');
                form.reset();
            } catch (error) {
                alert(error.message || 'Gagal mengirim saran.');
            }
        });
    }
}

// --- FUNGSI ADMIN TRANSAKSI ---
async function adminProcessTransaction(transactionId, action) {
    try {
        const data = await getAllData();
        const transactionIndex = data.transactions.findIndex(t => t.id === transactionId);
        
        if (transactionIndex === -1) {
            return { success: false, message: 'Transaksi tidak ditemukan.' };
        }
        
        const transaction = data.transactions[transactionIndex];
        const bookIndex = data.books.findIndex(b => b.id === transaction.bookId);
        const book = data.books[bookIndex];
        const now = new Date();
        const activity = { date: now.toISOString(), action: '' };

        if (!book) {
             return { success: false, message: `Buku dengan ID ${transaction.bookId} tidak ditemukan.` };
        }
        
        if (!book.type.includes('Fisik')) {
            return { success: false, message: 'Ini bukan transaksi buku fisik.' };
        }

        switch (action) {
            case 'acc':
                if (transaction.status !== 'diajukan') {
                    return { success: false, message: `Status transaksi harus 'Diajukan'.` };
                }
                if (book.stock <= 0) {
                    return { success: false, message: `Stok buku ${book.title} habis. Tidak bisa di-ACC.` };
                }
                
                data.books[bookIndex].stock -= 1; // Kurangi stok
                transaction.status = 'diacc';
                const dueDateAcc = new Date(now.getTime() + DUE_DATE_ACC_MAX * 24 * 60 * 60 * 1000);
                transaction.dueDate = dueDateAcc.toISOString();
                activity.action = `Disetujui (ACC). Batas pengambilan buku: ${DUE_DATE_ACC_MAX} hari. Stok terpotong.`;
                break;

            case 'tolak':
                if (transaction.status !== 'diajukan') {
                     return { success: false, message: `Status transaksi harus 'Diajukan' untuk ditolak.` };
                }
                transaction.status = 'ditolak';
                activity.action = 'Ditolak oleh Admin.';
                break;
                
            case 'pinjam': // User datang mengambil buku
                if (transaction.status !== 'diacc') {
                     return { success: false, message: `Status transaksi harus 'DiACC'.` };
                }
                
                transaction.status = 'dipinjam';
                const dueDatePinjam = new Date(now.getTime() + DUE_DATE_PINJAM_MAX * 24 * 60 * 60 * 1000);
                transaction.dueDate = dueDatePinjam.toISOString();
                activity.action = `Buku diserahkan. Batas pengembalian: ${DUE_DATE_PINJAM_MAX} hari.`;
                break;

            case 'kembali':
                if (transaction.status !== 'dipinjam') {
                    return { success: false, message: `Status transaksi harus 'Dipinjam'.` };
                }
                
                if (book.stock < book.stockMax) { // Kembalikan stok
                    data.books[bookIndex].stock += 1;
                }
                
                transaction.status = 'dikembalikan';
                transaction.returnedDate = now.toISOString();
                activity.action = 'Buku berhasil dikembalikan. Stok bertambah.';
                break;

            case 'batal':
                 if (transaction.status !== 'diajukan' && transaction.status !== 'diacc') {
                     return { success: false, message: `Pembatalan hanya bisa dilakukan pada status 'Diajukan' atau 'DiACC'.` };
                }
                
                if (transaction.status === 'diacc') {
                     if (book.stock < book.stockMax) {
                        data.books[bookIndex].stock += 1; // Kembalikan stok
                        activity.action = 'Dibatalkan. Stok dikembalikan.';
                    }
                } else {
                     activity.action = 'Dibatalkan oleh Admin.';
                }
                
                transaction.status = 'dibatalkan';
                break;

            default:
                return { success: false, message: 'Aksi tidak valid.' };
        }
        
        if (!transaction.activity) transaction.activity = [];
        transaction.activity.push(activity);
        data.transactions[transactionIndex] = transaction; 
        
        await setDatabaseData('/', data);
        
        return { success: true, message: `Transaksi ID ${transactionId} berhasil diubah status menjadi '${transaction.status}'.`, newStock: data.books[bookIndex].stock };

    } catch (error) {
        console.error('Error processing transaction:', error);
        return { success: false, message: `Gagal memproses transaksi: ${error.message}` };
    }
}

// --- LOGIKA ADMIN MANAJEMEN TRANSAKSI ---
async function renderAdminTransactionManagement(statusFilter = 'all') {
    const user = getLoggedInUser();
    const container = document.getElementById('admin-transaction-content');
    if (!user || user.role !== 'admin' || !container) return;

    container.innerHTML = 'Memuat data transaksi...';

    try {
        const data = await getAllData();
        let filteredTransactions = data.transactions.filter(t => t.type === 'pinjam');

        if (statusFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.status === statusFilter);
        }
        
        filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));


        if (filteredTransactions.length === 0) {
            const filterName = statusFilter === 'all' ? 'Semua' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1);
            container.innerHTML = `<p class="text-center p-4">Tidak ada transaksi dengan status: **${filterName}**</p>`;
            return;
        }

        let htmlContent = `<div class="transaction-list">`;

        for (const t of filteredTransactions) {
            const book = data.books.find(b => b.id === t.bookId);
            const borrower = data.users.find(u => u.id === t.userId);
            if (!book || !borrower) continue; 
            
            const bookTitle = book.title;
            const borrowerName = borrower.name;
            const statusText = t.status.charAt(0).toUpperCase() + t.status.slice(1);
            const date = formatDate(t.date);

            const statusClass = `status-${t.status.toLowerCase()}`;
            const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
            
            // Tombol Aksi
            let actionButtons = '';
            // Gunakan window.setTransactionFilter untuk me-refresh tab yang sedang aktif
            const processCall = (action) => `adminProcessTransaction(${t.id}, '${action}').then(res => { 
                if(res.success) { 
                    alert(res.message); 
                    const activeFilterButton = document.querySelector('#transaction-filter-tabs button.admin-tab-active');
                    if (activeFilterButton) {
                        setTransactionFilter(activeFilterButton, activeFilterButton.dataset.filter); // Refresh tab aktif
                    } else {
                        // Default fallback jika tidak ada tab aktif
                        renderAdminTransactionManagement('all'); 
                    }
                } else { 
                    alert('Gagal: ' + res.message); 
                } 
            }).catch(err => alert('Error: ' + err.message))`;


            if (t.status === 'diajukan') {
                actionButtons = `
                    <button class="btn btn-sm btn-success" onclick="${processCall('acc')}">ACC Pinjam</button>
                    <button class="btn btn-sm btn-danger" onclick="${processCall('tolak')}">Tolak</button>
                `;
            } else if (t.status === 'diacc') {
                actionButtons = `
                    <button class="btn btn-sm btn-primary" onclick="${processCall('pinjam')}">Serahkan Buku (Pinjam)</button>
                    <button class="btn btn-sm btn-danger" onclick="${processCall('batal')}">Batalkan ACC</button>
                `;
            } else if (t.status === 'dipinjam') {
                actionButtons = `
                    <button class="btn btn-sm btn-success" onclick="${processCall('kembali')}">Buku Kembali</button>
                `;
            } else if (t.status === 'ditolak' || t.status === 'dibatalkan' || t.status === 'dikembalikan') {
                actionButtons = `<span class="text-sm text-gray-500">Aksi selesai</span>`;
            }
            
            let activityList = t.activity ? t.activity.map(a => `<li>[${formatDate(a.date)}] ${a.action}</li>`).join('') : '<li>Tidak ada log aktivitas.</li>';


            htmlContent += `
                <div class="admin-card transaction-item" style="border-left: 5px solid ${t.status === 'diajukan' ? 'var(--warning-color)' : t.status === 'dipinjam' ? 'var(--success-color)' : '#ccc'};">
                    <div style="display: flex; gap: 15px;">
                        <img src="${coverSrc}" alt="Cover" style="width: 50px; height: 75px; object-fit: cover; border-radius: 3px;">
                        <div>
                            <p class="mb-1"><strong>ID Transaksi: ${t.id}</strong></p>
                            <h4 style="margin: 0; font-size: 1.1em;">${bookTitle}</h4>
                            <p style="margin: 0; font-size: 0.9em;">Peminjam: <strong>${borrowerName}</strong></p>
                            <p style="margin: 0; font-size: 0.9em;">Tanggal Ajuan: ${date}</p>
                            <p style="margin: 5px 0 10px 0;">Status: <span class="badge ${statusClass}">${statusText.toUpperCase()}</span> ${t.dueDate ? ` | Batas: ${formatDate(t.dueDate)}` : ''}</p>
                            <div class="admin-actions">
                                ${actionButtons}
                            </div>
                            <details style="margin-top: 10px; font-size: 0.85em;">
                                <summary style="cursor: pointer;">Lihat Log Aktivitas</summary>
                                <ul style="margin-left: 20px; list-style-type: disc;">${activityList}</ul>
                            </details>
                        </div>
                    </div>
                </div>
            `;
        }
        
        htmlContent += `</div>`;
        container.innerHTML = htmlContent;
        
    } catch (error) {
        console.error("Error rendering admin transactions:", error);
        container.innerHTML = `<p class="text-center text-red-500">Gagal memuat transaksi: ${error.message}</p>`;
    }
}


// --- LOGIKA ADMIN DASHBOARD ---
function renderAdminDashboard() {
    const user = getLoggedInUser();
    const mainContent = document.querySelector('.container') || document.querySelector('main');

    if (!user || user.role !== 'admin' || !mainContent) {
        window.location.href = 'login.html';
        return;
    }

    // Fungsi untuk mengubah tab (dibuat global)
    window.showAdminTab = (tabName) => {
        document.querySelectorAll('.admin-tab-content').forEach(content => content.style.display = 'none');
        document.querySelectorAll('.admin-tab-button').forEach(button => button.classList.remove('admin-tab-active'));

        const targetContent = document.getElementById(tabName);
        const targetButton = document.querySelector(`.admin-tab-button[data-tab='${tabName}']`);

        if (targetContent) targetContent.style.display = 'block';
        if (targetButton) targetButton.classList.add('admin-tab-active');

        // Panggil fungsi render spesifik
        if (tabName === 'manajemen-transaksi') {
            const defaultButton = document.querySelector('#transaction-filter-tabs button[data-filter="all"]');
            if (defaultButton) {
                // Gunakan setTransactionFilter untuk inisialisasi filter
                setTransactionFilter(defaultButton, defaultButton.dataset.filter);
            } else {
                 renderAdminTransactionManagement('all');
            }
        } 
        // Tambahkan pemanggilan untuk fungsi manajemen lain di sini jika sudah dibuat
        // else if (tabName === 'manajemen-buku') {
        //     renderAdminBookManagement();
        // } else if (tabName === 'saran-kritik') {
        //     renderAdminSuggestionManagement();
        // }
    };
    
    // Fungsi untuk mengubah filter transaksi (dibuat global)
    window.setTransactionFilter = (button, filter) => {
        document.querySelectorAll('#transaction-filter-tabs button').forEach(btn => btn.classList.remove('admin-tab-active'));
        button.classList.add('admin-tab-active');
        button.dataset.filter = filter; 
        renderAdminTransactionManagement(filter);
    };


    mainContent.innerHTML = `
        <h2 class="page-title">Admin Dashboard</h2>
        <div class="admin-tabs">
            <button class="admin-tab-button admin-tab-active" data-tab="manajemen-transaksi" onclick="showAdminTab('manajemen-transaksi')">Manajemen Peminjaman</button>
            <button class="admin-tab-button" data-tab="manajemen-buku" onclick="showAdminTab('manajemen-buku')">Manajemen Buku (TODO)</button>
            <button class="admin-tab-button" data-tab="saran-kritik" onclick="showAdminTab('saran-kritik')">Saran & Kritik (TODO)</button>
        </div>
        <div class="admin-content">
            <div id="manajemen-transaksi" class="admin-tab-content" style="display: block;">
                <h3>Manajemen Peminjaman Buku Fisik</h3>
                <div class="admin-filter-tabs" id="transaction-filter-tabs">
                    <button class="btn btn-sm admin-tab-active" data-filter="all" onclick="setTransactionFilter(this, 'all')">Semua</button>
                    <button class="btn btn-sm" data-filter="diajukan" onclick="setTransactionFilter(this, 'diajukan')">Diajukan</button>
                    <button class="btn btn-sm" data-filter="diacc" onclick="setTransactionFilter(this, 'diacc')">Di ACC</button>
                    <button class="btn btn-sm" data-filter="dipinjam" onclick="setTransactionFilter(this, 'dipinjam')">Dipinjam</button>
                    <button class="btn btn-sm" data-filter="dikembalikan" onclick="setTransactionFilter(this, 'dikembalikan')">Dikembalikan</button>
                    <button class="btn btn-sm" data-filter="ditolak" onclick="setTransactionFilter(this, 'ditolak')">Ditolak/Dibatalkan</button>
                </div>
                <div id="admin-transaction-content" style="margin-top: 15px;">
                    </div>
            </div>
            
            <div id="manajemen-buku" class="admin-tab-content">
                <h3>Manajemen Buku (TODO)</h3>
                <p>Fitur Manajemen Buku akan dimuat di sini.</p>
                <div id="admin-book-content"></div>
            </div>
            
            <div id="saran-kritik" class="admin-tab-content">
                <h3>Saran & Kritik (TODO)</h3>
                <p>Daftar Saran & Kritik akan dimuat di sini.</p>
                <div id="admin-suggestion-content"></div>
            </div>
        </div>
    `;
    
    // Inisialisasi: tampilkan tab pertama
    showAdminTab('manajemen-transaksi'); 
}