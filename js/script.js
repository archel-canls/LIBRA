const DUE_DATE_PINJAM_MAX = 7; 
const DUE_DATE_ACC_MAX = 3;    

// --- FUNGSI ASINKRON FIREBASE CRUD ---
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
                ebookHistory: snapshotToArray(data.ebookHistory),
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
        await dbRef.child(path).set(data);
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
                    { userId: 2, bookId: 103, lastPage: 50, lastAccessDate: new Date().toISOString() },
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


// --- MANAJEMEN SESSION (TETAP MENGGUNAKAN SESSIONSTORAGE) ---
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

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
}

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
                    if (link.href.includes('index.html') || 
                        link.href.includes('pinjam.html') || 
                        link.href.includes('ebook.html') || 
                        link.href.includes('bookmark.html') ||
                        link.href.includes('saran.html')) { 
                        link.remove(); 
                    }
                });

                if (!navMenu.querySelector('a[href="admin.html"]')) {
                    const adminLink = document.createElement('a');
                    adminLink.href = 'admin.html';
                    adminLink.textContent = 'Admin Dashboard';
                    navMenu.insertBefore(adminLink, authLink.parentNode.previousSibling); 
                }

            } else {
                const adminLink = navMenu.querySelector('a[href="admin.html"]');
                if (adminLink) adminLink.remove();
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
                // Tidak ada link Saran/Kritik di header untuk Admin, tapi User masih bisa akses
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
                renderAdminDashboard();
                break;
            case 'buka-buku-page':
                await renderBookDetail();
                break;
            case 'pengajuan-pinjam-page':
                await handlePengajuanPinjam();
                break;
            case 'baca-buku-page':
                await renderEbookReader();
                break;
            case 'status-pinjam-page':
                await renderTransactionStatus('pinjam');
                break;
            case 'history-pinjam-page':
                await renderTransactionHistory('pinjam');
                break;
            case 'history-ebook-page':
                await renderTransactionHistory('ebook');
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
                
                if (now > dueDate) {
                    const book = data.books.find(b => b.id === t.bookId);

                    data.transactions[index].status = 'dibatalkan';
                    data.transactions[index].activity.push({ date: new Date().toISOString(), action: 'Dibatalkan Otomatis (Tidak diambil dalam 3 hari)' });
                    
                    if (book && book.type.includes('Fisik') && book.stock < book.stockMax) {
                        const bookIndex = data.books.findIndex(b => b.id === t.bookId);
                        if(bookIndex !== -1) data.books[bookIndex].stock += 1;
                    } 
                    dataChanged = true;
                }
            }
        });

        if (dataChanged) {
            await setDatabaseData('/', data); 
        }
    } catch (error) {
        console.error("Error checking overdue transactions:", error);
    }
}

// --- FUNGSI AUTHENTIKASI (LOGIN & DAFTAR) ---
function handleLogin() { 
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = form.username.value;
        const password = form.password.value;
        
        try {
            const data = await getAllData();
            const user = data.users.find(u => u.username === username && u.password === password);

            if (user) {
                setLoggedInUser(user);
                alert(`Login sukses! Selamat datang, ${user.name}`);
                window.location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
            } else {
                alert('Username atau Password salah! (Coba: admin/admin atau user1/user1)');
            }
        } catch (error) {
             alert(error.message || 'Gagal login. Cek koneksi Anda.');
        }
    });
}

function handleRegistration() { 
    const form1 = document.getElementById('registration-step1');
    const form2 = document.getElementById('registration-step2');
    const fotoUploadInput = document.getElementById('foto-upload');
    const fotoPreview = document.getElementById('foto-preview');
    const fotoHiddenInput = document.getElementById('profile_picture_data');
    
    if (!form1 || !form2 || !fotoUploadInput) return;
    
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

    form1.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const photoData = fotoHiddenInput.value;
        if (!photoData || photoData.length < 100) { 
             alert('Anda wajib mengunggah Foto Profil!');
             return;
        }

        sessionStorage.setItem('tempRegData', JSON.stringify({
            name: form1.nama.value,
            address: form1.alamat.value,
            phone: form1.nohp.value,
            email: form1.email.value,
            profilePicture: photoData, 
        }));
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
    });

    form2.addEventListener('submit', async (e) => { 
        e.preventDefault();
        const tempRegData = JSON.parse(sessionStorage.getItem('tempRegData'));
        const username = form2.username.value;
        const password = form2.password.value;
        const confirmPassword = form2.confirm_password.value;

        if (password !== confirmPassword) {
            alert('Konfirmasi password tidak cocok!');
            return;
        }
        
        try {
            const data = await getAllData();
            if (data.users.some(u => u.username === username)) {
                alert('Username sudah digunakan!');
                return;
            }

            const newUser = {
                ...tempRegData,
                id: Date.now(), 
                username,
                password,
                role: 'user',
            };
            
            data.users.push(newUser);
            
            await setDatabaseData('users', data.users);
            sessionStorage.removeItem('tempRegData');
            
            alert('Pendaftaran Berhasil! Silakan Login.');
            window.location.href = 'login.html';
        } catch (error) {
            alert(error.message || 'Gagal mendaftar. Cek koneksi Anda.');
        }
    });
}

// --- FUNGSI RENDER BUKU DAN PENCARIAN (Logika Gabungan Filter & Search) ---
async function renderBookList(page, filter = {}) { 
    const listContainer = document.getElementById('book-list-container');
    if (!listContainer) return;
    listContainer.innerHTML = '<p style="text-align: center;">Memuat daftar...</p>'; 

    try {
        // Asumsi data diambil dari Firebase
        const data = await getAllData(); 
        let books = data.books;
        const user = getLoggedInUser();

        // 1. Pemfilteran berdasarkan Halaman Awal (Pinjam, Ebook, Bookmark)
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
                    // Konversi data buku (spasi/hyphen) agar sesuai dengan tag value (underscore)
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
                    // Filter Genre 
                    return book.genre.toLowerCase().includes(tag); 
                }
                
                return true; 
            });
        }
        
        // 3. Pemfilteran Teks Pencarian
        // Filter ini diterapkan pada hasil yang sudah difilter oleh tag di langkah 2.
        books = books.filter(book => {
            const search = (filter.search || '').toLowerCase();
            if (!search) return true; // Lewati filter jika tidak ada teks pencarian

            // Cek kecocokan di judul, penulis, genre, kategori, jenis, atau tahun
            return book.title.toLowerCase().includes(search) || 
                   book.author.toLowerCase().includes(search) ||
                   book.genre.toLowerCase().includes(search) ||
                   book.category.toLowerCase().includes(search) ||
                   book.type.toLowerCase().includes(search) ||
                   String(book.year).includes(search);
        });

        // Tampilkan hasil
        listContainer.innerHTML = ''; 

        if (books.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: #666;">Tidak ada buku yang ditemukan ${page === 'bookmark-page' ? 'di Bookmark Anda' : 'sesuai kriteria'}.</p>`;
            return;
        }

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.onclick = () => window.location.href = `buka_buku.html?id=${book.id}`;
            const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
            
            card.innerHTML = `
                <img src="${coverSrc}" alt="Cover ${book.title}" onerror="this.onerror=null; this.src='img/default.jpg';">
                <div class="book-info">
                    <h3>${book.title}</h3>
                    <p><strong>Penulis:</strong> ${book.author}</p>
                    <p><strong>Tahun Terbit:</strong> ${book.year}</p>
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

// --- FUNGSI PENGHUBUNG FILTER TAG (Dipanggil saat klik filter utama atau tag) ---
const filterBookList = (type, value) => {
    // Ambil nilai pencarian teks saat ini
    const searchInput = document.getElementById('search-input').value;
    renderBookList(document.body.id, {
        search: searchInput,
        filterType: type,
        tagValue: value
    });
};


// --- FUNGSI PENCARIAN ---
function handleSearch(page) { 
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (searchInput && searchButton) {
        const performSearch = () => {
            // Ambil variabel global filter tag yang sedang aktif dari HTML
            const currentType = window.currentFilterType || 'all'; 
            const activeVal = window.activeTag || null;
            
            // Panggil renderBookList dengan teks pencarian DAN filter tag yang aktif
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

        window.addEventListener('load', () => renderBookList(page, {}));
    }
}
// --- LOGIKA HALAMAN DETAIL BUKU (`buka_buku.html`) ---
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
        
        if (book.type.includes('Fisik')) {
            btnPinjam.onclick = () => {
                if (!user) { alert('Harap login untuk mengajukan peminjaman.'); window.location.href = 'login.html'; return; }
                if (book.stock <= 0) { alert('Maaf, buku fisik sedang tidak tersedia saat ini.'); return; }
                window.location.href = `pengajuan_pinjam.html?id=${book.id}`;
            };
        } else {
            if (btnPinjam) btnPinjam.style.display = 'none';
        }

        if (book.type.includes('Ebook') && book.ebookPath) {
            btnBaca.onclick = () => {
                if (!user) { alert('Harap login untuk membaca Ebook.'); window.location.href = 'login.html'; return; }
                window.location.href = `baca_buku.html?id=${book.id}`;
            };
        } else {
            if (btnBaca) btnBaca.style.display = 'none';
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
            document.querySelector('.container').innerHTML = '<h2>Maaf, buku tidak tersedia atau tidak bisa dipinjam fisik.</h2>';
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

// --- LOGIKA HALAMAN BACA BUKU (`baca_buku.html`) ---
async function renderEbookReader() {
    const user = getLoggedInUser();
    if (!user) { window.location.href = 'login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const bookId = parseInt(urlParams.get('id'));
    
    try {
        const data = await getAllData(); 
        const history = data.ebookHistory.find(eh => eh.userId === user.id && eh.bookId === bookId);
        const initialPage = (history && history.lastPage) || 1; 
        const book = data.books.find(b => b.id === bookId);
        
        if (!book || !book.ebookPath) {
            document.querySelector('.container').innerHTML = '<h2>Ebook tidak ditemukan atau tidak tersedia!</h2>';
            return;
        }
        
        document.getElementById('ebook-title').textContent = book.title;
        const readerContainer = document.getElementById('ebook-reader-container');
        
        let actualEbookPath = book.ebookPath;
        // Simulasi jika pathnya data:image atau bukan PDF, ganti ke sample.pdf
        if (book.ebookPath && !book.ebookPath.toLowerCase().includes('.pdf')) {
             actualEbookPath = 'assets/sample1.pdf'; 
        }

        readerContainer.innerHTML = `
            <iframe 
                id="pdf-viewer" 
                src="${actualEbookPath}#page=${initialPage}" 
                width="100%" 
                height="600px" 
                style="border: 1px solid #ddd; border-radius: 5px;"
                title="Ebook Reader: ${book.title}"
            ></iframe>
            <p style="text-align: center; margin-top: 10px; color: #555;">**Catatan:** Dalam simulasi, gunakan tombol simpan progress di bawah untuk mencatat halaman terakhir.</p>
        `;

        document.getElementById('last-read-info').innerHTML = `Terakhir dibaca di halaman: <strong>${initialPage}</strong>.`;
        
        const saveProgressBtn = document.createElement('button');
        saveProgressBtn.className = 'btn-primary';
        saveProgressBtn.textContent = 'Simpan Progress (Simulasi Halaman +5)';
        saveProgressBtn.style.margin = '10px auto';
        saveProgressBtn.style.display = 'block';

        saveProgressBtn.onclick = async () => { 
            try {
                const newData = await getAllData();
                let currentHistory = newData.ebookHistory.find(eh => eh.userId === user.id && eh.bookId === bookId);
                
                const lastPage = currentHistory ? currentHistory.lastPage : 1;
                const newPage = lastPage + 5; 
                
                if (currentHistory) {
                    currentHistory.lastPage = newPage;
                    currentHistory.lastAccessDate = new Date().toISOString();
                } else {
                    newData.ebookHistory.push({ userId: user.id, bookId: book.id, lastPage: newPage, lastAccessDate: new Date().toISOString() });
                }
                
                await setDatabaseData('ebookHistory', newData.ebookHistory);
                
                document.getElementById('pdf-viewer').src = `${actualEbookPath}#page=${newPage}`;
                document.getElementById('last-read-info').innerHTML = `Progress disimpan: Halaman <strong>${newPage}</strong>.`;
                alert(`Progress berhasil disimpan ke Halaman ${newPage}!`);
            } catch (error) {
                alert(error.message || 'Gagal menyimpan progress.');
            }
        };

        readerContainer.parentNode.insertBefore(saveProgressBtn, readerContainer.nextSibling);
    } catch (error) {
        document.querySelector('.container').innerHTML = `<h2>Gagal memuat ebook: ${error.message}</h2>`;
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

            if (dueDate) { diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)); }

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

async function renderTransactionHistory(type) { /* ... (Fungsi ini tetap sama) ... */
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

            if (history.length === 0) { container.innerHTML = '<p style="text-align: center;">Anda belum memiliki history peminjaman yang sukses.</p>'; return; }
            
            history.forEach(t => {
                const book = data.books.find(b => b.id === t.bookId);
                if (!book) return;
                const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
                container.innerHTML += `<div class="status-card">
                    <img src="${coverSrc}" alt="Cover">
                    <div>
                        <h4>${book.title} (${book.year})</h4>
                        <p style="font-size: 0.9em;">Dipinjam: ${formatDate(t.date)}</p>
                        <p style="font-size: 0.9em;">Dikembalikan: <strong>${formatDate(t.returnedDate)}</strong></p>
                    </div>
                </div>`;
            });
        } else if (type === 'ebook') {
            const ebookHistory = data.ebookHistory
                .filter(eh => eh.userId === user.id)
                .sort((a, b) => new Date(b.lastAccessDate) - new Date(a.lastAccessDate));

            if (ebookHistory.length === 0) { container.innerHTML = '<p style="text-align: center;">Anda belum memiliki history membaca ebook.</p>'; return; }
            
            ebookHistory.forEach(eh => {
                const book = data.books.find(b => b.id === eh.bookId);
                if (!book) return;
                const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
                container.innerHTML += `<div class="status-card" style="cursor: pointer;" onclick="window.location.href='baca_buku.html?id=${book.id}'">
                    <img src="${coverSrc}" alt="Cover">
                    <div>
                        <h4>${book.title}</h4>
                        <p style="font-size: 0.9em;">Terakhir dibaca di Halaman: <strong>${eh.lastPage}</strong></p>
                        <p style="font-size: 0.9em;">Akses terakhir: ${formatDate(eh.lastAccessDate)}</p>
                    </div>
                </div>`;
            });
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

// --- LOGIKA ADMIN DASHBOARD ---
function renderAdminDashboard() {
    const user = getLoggedInUser();
    if (!user || user.role !== 'admin') { window.location.href = 'login.html'; return; }

    window.showAdminTab = (tabId) => {
        document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';

        document.querySelectorAll('.admin-nav button').forEach(btn => btn.classList.remove('active-tab'));
        const tabButton = document.getElementById(`${tabId.replace(/-/g, '_')}-tab`);
        if (tabButton) tabButton.classList.add('active-tab');

        if (tabId === 'manajemen-pinjam') renderAdminPinjam();
        if (tabId === 'manajemen-buku') renderAdminBookManagement();
        if (tabId === 'manajemen-user') renderAdminUserManagement();
        if (tabId === 'saran-kritik') renderAdminSuggestions();
    };

    showAdminTab('manajemen-pinjam');
}

window.renderAdminPinjam = async () => {
    const container = document.getElementById('admin-pinjam-list');
    container.innerHTML = '<h3>Pengajuan & Peminjaman Aktif</h3>';

    try {
        const data = await getAllData();
        const pendingTransactions = data.transactions.filter(t => t.type === 'pinjam' && (t.status === 'diajukan' || t.status === 'diacc' || t.status === 'dipinjam'));

        if (pendingTransactions.length === 0) { container.innerHTML += '<p>Tidak ada transaksi yang perlu diurus saat ini.</p>'; return; }

        pendingTransactions.forEach(t => {
            const book = data.books.find(b => b.id === t.bookId);
            const member = data.users.find(u => u.id === t.userId);
            if (!book || !member) return;

            let actionButtons = '';
            let infoStatus = '';
            const now = Date.now();
            const dueDate = t.dueDate ? new Date(t.dueDate).getTime() : null;
            let diffDays = dueDate ? Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24)) : null;

            if (t.status === 'diajukan') {
                actionButtons = `<button onclick="handleAdminAction(${t.id}, 'acc')" class="btn-action acc" style="margin-right: 8px;"><i class="fas fa-check"></i> ACC</button>
                                 <button onclick="handleAdminAction(${t.id}, 'tolak')" class="btn-action tolak"><i class="fas fa-times"></i> Tolak</button>`;
                infoStatus = `Diajukan: ${formatDate(t.date)}`;
            } else if (t.status === 'diacc') {
                actionButtons = `<button onclick="handleAdminAction(${t.id}, 'pinjam')" class="btn-action pinjam" style="margin-right: 8px;"><i class="fas fa-handshake"></i> Serahkan Buku</button>
                                 <button onclick="handleAdminAction(${t.id}, 'batal')" class="btn-action tolak"><i class="fas fa-ban"></i> Batalkan</button>`;
                infoStatus = `Batas Ambil: ${formatDate(t.dueDate)} (${Math.max(0, diffDays)} hari tersisa)`;
            } else if (t.status === 'dipinjam') {
                 actionButtons = `<button onclick="handleAdminAction(${t.id}, 'kembali')" class="btn-action kembali"><i class="fas fa-undo"></i> Kembalikan</button>`;

                 if (diffDays < 0) {
                     infoStatus = `<span style="color: var(--danger-color); font-weight: bold;">TELAT ${Math.abs(diffDays)} hari! Segera kembalikan.</span>`;
                 } else {
                     infoStatus = `Jatuh Tempo: ${formatDate(t.dueDate)} (${diffDays} hari tersisa)`;
                 }
            }

            container.innerHTML += `
                <div class="status-card admin-card">
                    <p><strong>Buku:</strong> <a href="buka_buku.html?id=${book.id}" target="_blank">${book.title}</a> (Stok: ${book.stock})</p>
                    <p><strong>Anggota:</strong> ${member.name} (${member.username})</p>
                    <p><strong>Status:</strong> <span class="status-${t.status.toLowerCase()} status-pinjam">${t.status.toUpperCase()}</span> | ${infoStatus}</p>
                    <div class="admin-actions" style="margin-top: 10px;">${actionButtons}</div>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Gagal memuat data pinjaman: ${error.message}</p>`;
    }
}

window.handleAdminAction = async (transId, action) => {
    try {
        let data = await getAllData();
        const tIndex = data.transactions.findIndex(tr => tr.id === transId);
        if (tIndex === -1) { alert('Transaksi tidak ditemukan.'); return; }

        const t = data.transactions[tIndex];
        const bookIndex = data.books.findIndex(b => b.id === t.bookId);
        const book = bookIndex !== -1 ? data.books[bookIndex] : null;

        let dataToUpdate = { transactions: data.transactions, books: data.books };
        let bookChanged = false;

        if (action === 'acc') {
            if (book.stock <= 0) { alert('Stok tidak mencukupi untuk di-ACC!'); return; }
            t.status = 'diacc';
            t.dueDate = new Date(Date.now() + DUE_DATE_ACC_MAX * 24 * 60 * 60 * 1000).toISOString();
            t.activity.push({ date: new Date().toISOString(), action: 'Di-ACC oleh Admin. Batas ambil 3 hari.' });
            if (book) { dataToUpdate.books[bookIndex].stock -= 1; bookChanged = true; }
            alert('Pengajuan di-ACC! Stok dikurangi. Anggota harus mengambil buku dalam 3 hari.');
        } else if (action === 'tolak' || action === 'batal') {
            t.status = action === 'tolak' ? 'ditolak' : 'dibatalkan';
            t.activity.push({ date: new Date().toISOString(), action: `${t.status.toUpperCase()} oleh Admin` });
            if(t.status === 'dibatalkan' && book && book.type.includes('Fisik') && book.stock < book.stockMax) {
                dataToUpdate.books[bookIndex].stock += 1;
                bookChanged = true;
            }
            alert('Transaksi dibatalkan/ditolak.');
        } else if (action === 'pinjam') {
            t.status = 'dipinjam';
            t.dueDate = new Date(Date.now() + DUE_DATE_PINJAM_MAX * 24 * 60 * 60 * 1000).toISOString();
            t.activity.push({ date: new Date().toISOString(), action: 'Buku diserahkan dan mulai dipinjam.' });
            alert('Status diubah menjadi DIPINJAM. Jatuh tempo 7 hari.');
        } else if (action === 'kembali') {
            t.status = 'dikembalikan';
            t.returnedDate = new Date().toISOString();
            t.activity.push({ date: new Date().toISOString(), action: 'Buku berhasil dikembalikan.' });
            if(book && book.type.includes('Fisik')) { dataToUpdate.books[bookIndex].stock += 1; bookChanged = true; }
            alert('Status diubah menjadi DIKEMBALIKAN. Stok bertambah.');
        }

        await setDatabaseData('transactions', dataToUpdate.transactions);
        if(bookChanged) await setDatabaseData('books', dataToUpdate.books);

        renderAdminPinjam();
    } catch (error) {
        alert(error.message || 'Aksi admin gagal.');
    }
}

// Implementasi Logika Tambah, Edit, Hapus Buku
window.renderAdminBookManagement = async (bookToEdit = null) => {
    const container = document.getElementById('admin-buku-list');
    container.innerHTML = '<h3>Manajemen Koleksi Buku (Tambah, Edit, Hapus)</h3>';

    const data = await getAllData();

    // Perbaikan: Gunakan currentCoverUrl dari data Base64 jika ada
    const currentCoverUrl = bookToEdit && bookToEdit.cover && bookToEdit.cover.startsWith('data:image') ? bookToEdit.cover : (bookToEdit && bookToEdit.cover || 'img/default.jpg');
    const currentEbookPath = bookToEdit ? bookToEdit.ebookPath : null;
    const currentEbookFileName = currentEbookPath ? currentEbookPath.substring(currentEbookPath.lastIndexOf('/') + 1) : 'Belum ada file diunggah.';
    const ebookPathInfoColor = currentEbookPath ? 'var(--primary-color)' : '#999';

    // Form Tambah/Edit Buku (STRUKTUR HTML)
    container.innerHTML += `
        <details id="form-buku-container" ${bookToEdit ? 'open' : ''} style="margin-bottom: 20px; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
            <summary style="font-weight: bold; cursor: pointer;">${bookToEdit ? '✎ Edit Buku: ' + bookToEdit.title : '+ Tambah Buku Baru'}</summary>
            <form id="form-book-management" style="margin-top: 10px; display: grid; gap: 10px;">
                <div id="submit-notification" style="padding: 10px; border-radius: 5px; text-align: center; display: none;"></div>

                <input type="hidden" name="id" value="${bookToEdit ? bookToEdit.id : ''}">
                <input type="text" name="title" placeholder="Judul" required value="${bookToEdit ? bookToEdit.title : ''}">
                <input type="text" name="author" placeholder="Author" required value="${bookToEdit ? bookToEdit.author : ''}">
                <input type="number" name="year" placeholder="Tahun" required value="${bookToEdit ? bookToEdit.year : ''}">
                <input type="number" name="stock" placeholder="Stok Fisik Saat Ini" required value="${bookToEdit ? bookToEdit.stock : ''}">
                <input type="number" name="stockMax" placeholder="Stok Maksimal" required value="${bookToEdit ? bookToEdit.stockMax : ''}">

                <select name="type" required id="book-type-select">
                    <option value="">-- Pilih Jenis --</option>
                    <option value="Buku Fisik" ${bookToEdit && bookToEdit.type === 'Buku Fisik' ? 'selected' : ''}>Buku Fisik</option>
                    <option value="Ebook" ${bookToEdit && bookToEdit.type === 'Ebook' ? 'selected' : ''}>Ebook</option>
                    <option value="Fisik & Ebook" ${bookToEdit && bookToEdit.type === 'Fisik & Ebook' ? 'selected' : ''}>Fisik & Ebook</option>
                </select>

                <select name="category" required>
                    <option value="">-- Pilih Kategori --</option>
                    <option value="Fiksi" ${bookToEdit && bookToEdit.category === 'Fiksi' ? 'selected' : ''}>Fiksi</option>
                    <option value="Non-Fiksi" ${bookToEdit && bookToEdit.category === 'Non-Fiksi' ? 'selected' : ''}>Non-Fiksi</option>
                </select>
                <input type="text" name="genre" placeholder="Genre" value="${bookToEdit ? bookToEdit.genre : ''}">
                <textarea name="synopsis" placeholder="Sinopsis">${bookToEdit ? bookToEdit.synopsis : ''}</textarea>

                <label style="font-weight: bold; margin-top: 5px;">Upload Cover (Hanya Gambar)</label>
                <img id="cover-preview" src="${currentCoverUrl}" alt="Cover Preview" style="width: 150px; height: auto; margin-bottom: 5px; border: 2px solid var(--accent-color); border-radius: 5px; box-shadow: 0 0 5px rgba(0,0,0,0.1);" onerror="this.onerror=null; this.src='img/default.jpg';"/>
                <input type="file" id="cover-upload" name="cover_file" accept="image/png, image/jpeg, image/jpg">
                <input type="hidden" id="cover-hidden-data" name="cover_data_base64" value="${bookToEdit && bookToEdit.cover ? bookToEdit.cover : ''}">

                <div id="ebook-upload-group">
                    <label style="font-weight: bold; margin-top: 5px;">Upload Ebook (Hanya PDF)</label>
                    <p id="ebook-path-info" style="font-size: 0.9em; color: ${ebookPathInfoColor};">
                        ${currentEbookPath ? `File saat ini: <strong>${currentEbookFileName}</strong> (Ganti file di bawah)` : 'Belum ada file diunggah.'}
                    </p>
                    <input type="file" id="ebook-upload" name="ebook_file" accept="application/pdf">
                    <input type="hidden" id="ebook-path-hidden" name="ebookPath" value="${bookToEdit && currentEbookPath ? currentEbookPath : ''}">
                    <p style="font-size: 0.8em; color: var(--danger-color);">*Wajib diisi jika Jenis Buku adalah Ebook atau Fisik & Ebook.</p>
                </div>

                <button type="submit" id="submit-btn" class="btn-primary" style="background-color: ${bookToEdit ? 'var(--accent-color)' : 'var(--primary-color)'}">
                    <i class="fas fa-${bookToEdit ? 'save' : 'plus'}"></i> ${bookToEdit ? 'Update Buku' : 'Tambahkan Buku'}
                </button>
                ${bookToEdit ? '<button type="button" onclick="renderAdminBookManagement(null)" class="btn-primary tolak" style="margin-top: 5px;"><i class="fas fa-times"></i> Batal Edit</button>' : ''}
            </form>
        </details>
    `;

    // Ambil elemen form yang baru dibuat
    const form = document.getElementById('form-book-management');
    const submitBtn = document.getElementById('submit-btn');
    const notificationDiv = document.getElementById('submit-notification');

    const coverUploadInput = document.getElementById('cover-upload');
    const coverPreview = document.getElementById('cover-preview');
    const coverHiddenInput = document.getElementById('cover-hidden-data');

    const ebookUploadInput = document.getElementById('ebook-upload');
    const ebookHiddenInput = document.getElementById('ebook-path-hidden');
    const ebookPathInfo = document.getElementById('ebook-path-info');

    const bookTypeSelect = document.getElementById('book-type-select');

    // Helper untuk menampilkan notifikasi
    const showNotification = (message, type) => {
        notificationDiv.innerHTML = message;
        notificationDiv.style.display = 'block';
        if (type === 'loading') {
            notificationDiv.style.backgroundColor = '#ffffcc';
            notificationDiv.style.border = '1px solid #ffeb3b';
            notificationDiv.style.color = '#333';
        } else if (type === 'success') {
            notificationDiv.style.backgroundColor = '#e6ffe6';
            notificationDiv.style.border = '1px solid #4caf50';
            notificationDiv.style.color = '#333';
        } else if (type === 'error') {
            notificationDiv.style.backgroundColor = '#ffe6e6';
            notificationDiv.style.border = '1px solid #f44336';
            notificationDiv.style.color = '#f44336';
        }
    };

    // 2.1. Cover File Handler (Base64) - PERBAIKAN: Memastikan Preview Langsung Muncul
    if (coverUploadInput) {
        coverUploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // Tambahkan validasi tipe file yang diizinkan (PNG, JPEG, JPG)
                if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
                    showNotification("File cover harus berupa gambar (PNG/JPG/JPEG)!", 'error');
                    coverUploadInput.value = '';
                    coverPreview.src = 'img/default.jpg';
                    coverHiddenInput.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(event) {
                    // Update preview dengan gambar baru (Base64)
                    coverPreview.src = event.target.result;
                    coverHiddenInput.value = event.target.result;
                    showNotification("Preview Cover Berhasil Dimuat.", 'success');
                };
                reader.onerror = function() {
                    showNotification("Gagal membaca file Cover.", 'error');
                    coverPreview.src = 'img/default.jpg';
                };
                reader.readAsDataURL(file);
            } else {
                // Jika input dibatalkan/kosong
                if (bookToEdit && bookToEdit.cover) {
                    coverPreview.src = bookToEdit.cover;
                    coverHiddenInput.value = bookToEdit.cover;
                } else {
                    coverPreview.src = 'img/default.jpg';
                    coverHiddenInput.value = '';
                }
                showNotification("Pilihan file Cover dibatalkan.", 'loading');
            }
        });
    }

    // 2.2. Ebook File Handler (Simulasi Path)
    if (ebookUploadInput) {
        ebookUploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.type !== 'application/pdf') {
                    showNotification("File ebook harus berupa PDF!", 'error');
                    ebookUploadInput.value = '';
                    return;
                }
                const simulatedPath = `assets/${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
                ebookHiddenInput.value = simulatedPath;
                ebookPathInfo.innerHTML = `File diunggah: <strong>${file.name}</strong> (Path: ${simulatedPath})`;
                ebookPathInfo.style.color = 'var(--primary-color)';
                showNotification(`Preview Ebook PDF (${file.name}) Berhasil Dimuat.`, 'success');
            } else {
                const currentPath = bookToEdit ? bookToEdit.ebookPath : '';
                ebookHiddenInput.value = currentPath;
                if (currentPath) {
                    const currentFileName = currentPath.substring(currentPath.lastIndexOf('/') + 1);
                    ebookPathInfo.innerHTML = `File saat ini: <strong>${currentFileName}</strong> (Ganti file di bawah)`;
                } else {
                    ebookPathInfo.innerHTML = 'Belum ada file diunggah.';
                }
                ebookPathInfo.style.color = currentPath ? 'var(--primary-color)' : '#999';
                showNotification("Pilihan file Ebook dibatalkan.", 'loading');
            }
        });
    }


    // Daftar Buku untuk Edit/Hapus
    container.innerHTML += '<h4>Daftar Semua Buku:</h4>';
    data.books.forEach(book => {
        const bookCover = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
        container.innerHTML += `
            <div class="admin-card book-item-management" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; background-color: #f7f7f7;">
                <span>
                    <strong>${book.title}</strong> (${book.author})<br>
                    Stok: ${book.stock}/${book.stockMax} | Jenis: ${book.type}
                </span>
                <div style="margin-top: 5px;">
                    <button onclick="editBook(${book.id})" class="btn-action acc"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="deleteBook(${book.id})" class="btn-action tolak"><i class="fas fa-trash"></i> Hapus</button>
                </div>
            </div>
        `;
    });

    // Handler Tambah/Edit Buku - PERBAIKAN TOTAL DI SINI
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            showNotification(`<i class="fas fa-spinner fa-spin"></i> Sedang ${bookToEdit ? 'Mengupdate' : 'Menambahkan'} buku...`, 'loading');
            submitBtn.disabled = true;

            const id = form.id.value;
            const stockValue = parseInt(form.stock.value) || 0;
            const stockMaxValue = parseInt(form.stockMax.value) || stockValue;

            const coverDataUrl = form.cover_data_base64.value.trim();
            let ebookPathValue = form.ebookPath.value.trim();
            const bookType = form.type.value;

            // 1. Validasi Stok
            if (stockValue > stockMaxValue) {
                showNotification('Gagal: Stok fisik saat ini tidak boleh melebihi Stok Maksimal!', 'error');
                submitBtn.disabled = false;
                return;
            }

            // 2. Validasi COVER
            if (!coverDataUrl) {
                showNotification('Gagal: Cover harus diunggah!', 'error');
                submitBtn.disabled = false;
                return;
            }

            // 3. VALIDASI EBOOK PATH BERDASARKAN JENIS BUKU
            if (bookType.includes('Ebook') && !ebookPathValue) {
                showNotification('Gagal: Jika jenis buku mengandung "Ebook", Anda wajib menentukan file PDF!', 'error');
                submitBtn.disabled = false;
                return;
            }

            try {
                const dataToUpdate = await getAllData();

                const newBookData = {
                    title: form.title.value,
                    author: form.author.value,
                    year: parseInt(form.year.value),
                    stock: stockValue,
                    stockMax: stockMaxValue,
                    type: bookType,
                    category: form.category.value,
                    genre: form.genre.value,
                    synopsis: form.synopsis.value,
                    cover: coverDataUrl,
                    // Jika jenisnya bukan Ebook, path Ebook di-null-kan
                    ebookPath: bookType.includes('Ebook') ? ebookPathValue : null,
                };

                // Logika Update/Tambah
                if (id) {
                    const bookIndex = dataToUpdate.books.findIndex(b => b.id == id);
                    if (bookIndex > -1) {
                        dataToUpdate.books[bookIndex] = { ...dataToUpdate.books[bookIndex], ...newBookData, id: parseInt(id) };
                        showNotification('Sukses: Buku berhasil **diperbarui**! ✅', 'success');
                    }
                } else {
                    dataToUpdate.books.push({
                        id: Date.now(),
                        ...newBookData
                    });
                    showNotification('Sukses: Buku berhasil **ditambahkan**! 📚', 'success');
                }

                await setDatabaseData('books', dataToUpdate.books);

                setTimeout(() => {
                    // Reset dan render ulang
                    renderAdminBookManagement();
                }, 1500);

            } catch (error) {
                showNotification(`Gagal: ${error.message || 'Terjadi kesalahan saat menyimpan buku.'}`, 'error');
                console.error("Submit Book Error:", error);
                submitBtn.disabled = false;
            }
        });
    } 
}

window.editBook = async (id) => {
    try {
        const data = await getAllData();
        const book = data.books.find(b => b.id === id);
        if (book) {
            await renderAdminBookManagement(book);
            document.getElementById('form-buku-container').scrollIntoView({ behavior: 'smooth' });
        }
    } catch (error) {
        alert(error.message || 'Gagal memuat data edit buku.');
    }
}

window.deleteBook = async (id) => {
    if (!confirm('PERINGATAN! Yakin hapus buku ini? Semua riwayat pinjaman/bookmark terkait akan hilang secara permanen.')) {
        return;
    }

    try {
        let data = await getAllData();
        const bookTitle = data.books.find(b => b.id === id)?.title || 'Buku';

        data.books = data.books.filter(b => b.id !== id);
        data.transactions = data.transactions.filter(t => t.bookId !== id);
        data.bookmarks = data.bookmarks.filter(b => b.bookId !== id);
        data.ebookHistory = data.ebookHistory.filter(h => h.bookId !== id);

        await setDatabaseData('/', data);

        alert(`${bookTitle} dan semua riwayatnya berhasil dihapus! 🗑️`);
        renderAdminBookManagement();
    } catch (error) {
        alert(error.message || 'Gagal menghapus buku.');
    }
}

window.renderAdminUserManagement = async () => {
    const container = document.getElementById('admin-user-list');
    container.innerHTML = '<h3>Manajemen Akun Anggota</h3>';

    try {
        const data = await getAllData();
        data.users.filter(u => u.role === 'user').forEach(user => {
            const profilePicSrc = user.profilePicture && user.profilePicture.startsWith('data:image') ? user.profilePicture : 'img/default_user.png';

            container.innerHTML += `
                <div class="admin-card user-item-management">
                    <div style="display: flex; align-items: center;">
                        <img src="${profilePicSrc}" alt="Foto Profil" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 15px; border: 1px solid #ccc;">
                        <div>
                            <p><strong>Nama:</strong> ${user.name} (${user.username})</p>
                            <p><strong>Email:</strong> ${user.email} | <strong>HP:</strong> ${user.phone || 'N/A'}</p>
                            <p><strong>Alamat:</strong> ${user.address || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="admin-actions" style="margin-top: 10px;">
                        <button onclick="resetUserPassword(${user.id})" class="btn-action acc"><i class="fas fa-key"></i> Reset Pass</button>
                        <button onclick="deleteUser(${user.id})" class="btn-action tolak"><i class="fas fa-user-times"></i> Hapus Akun</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Gagal memuat data anggota: ${error.message}</p>`;
    }
}

window.resetUserPassword = async (userId) => {
    let newPassword = prompt("Masukkan password baru untuk anggota ini:");
    if (newPassword && newPassword.trim() !== '') {
        try {
            let data = await getAllData();
            const userIndex = data.users.findIndex(u => u.id === userId);
            if (userIndex > -1) {
                data.users[userIndex].password = newPassword;
                await setDatabaseData('users', data.users);
                alert(`Password untuk ${data.users[userIndex].username} berhasil di-reset menjadi "${newPassword}"!`);
                renderAdminUserManagement();
            }
        } catch (error) {
            alert(error.message || 'Gagal reset password.');
        }
    } else if (newPassword !== null) {
        alert('Password tidak boleh kosong!');
    }
}

window.deleteUser = async (userId) => {
    try {
        let data = await getAllData();
        const user = data.users.find(u => u.id === userId);
        if (!user) return;

        if (!confirm(`PERINGATAN! Yakin hapus akun ${user.username}? Semua riwayat terkait akun ini akan hilang.`)) {
            return;
        }

        data.users = data.users.filter(u => u.id !== userId);
        data.transactions = data.transactions.filter(t => t.userId !== userId);
        data.bookmarks = data.bookmarks.filter(b => b.userId !== userId);
        data.ebookHistory = data.ebookHistory.filter(h => h.userId !== userId);
        data.suggestions = data.suggestions.filter(s => s.userId !== userId);

        await setDatabaseData('/', data);
        alert(`Akun ${user.username} berhasil dihapus! 💀`);
        renderAdminUserManagement();
    } catch (error) {
        alert(error.message || 'Gagal menghapus akun.');
    }
}

// LOGIKA ADMIN SARAN KRITIK (Tampilan Full dan Benar)
window.renderAdminSuggestions = async () => {
    const container = document.getElementById('admin-saran-list');
    container.innerHTML = '<h3>Saran & Kritik dari Anggota</h3>';

    try {
        const data = await getAllData();

        // Urutkan berdasarkan tanggal terbaru
        const sortedSuggestions = data.suggestions.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedSuggestions.length === 0) {
            container.innerHTML += '<p style="text-align: center; color: #666;">Tidak ada saran atau kritik yang masuk.</p>';
            return;
        }

        sortedSuggestions.forEach(s => {
            // Temukan detail user (termasuk foto profil jika ada)
            const user = data.users.find(u => u.id === s.userId) || { name: 'Anggota Dihapus', profilePicture: null, email: 'N/A' };
            const profilePicSrc = user.profilePicture && user.profilePicture.startsWith('data:image') ? user.profilePicture : 'img/default_user.png';

            container.innerHTML += `
                <div class="admin-card suggestion-item-management" style="border-left: 5px solid var(--accent-color); margin-bottom: 15px; padding: 15px;">
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <img src="${profilePicSrc}" alt="Foto Profil" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 15px; border: 1px solid #ccc;">
                        <div>
                            <p style="margin: 0;"><strong>${user.name}</strong> (@${s.username || 'unknown'})</p>
                            <p style="margin: 0; font-size: 0.8em; color: #777;">${formatDate(s.date)}</p>
                        </div>
                    </div>
                    <p style="margin: 0; padding: 10px; background: #f0f0f0; border-radius: 5px; font-style: italic;">"${s.message}"</p>
                </div>
            `;
        });
    } catch (error) {
        container.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Gagal memuat saran: ${error.message}</p>`;
    }
}