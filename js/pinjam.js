/**
 * Logika Khusus untuk Manajemen Peminjaman (Admin Dashboard)
 * * Dependencies:
 * - getAllData(), setDatabaseData(), getLoggedInUser(), formatDate() dari script.js
 * - Global Constants (DUE_DATE_PINJAM_MAX, DUE_DATE_ACC_MAX) dari script.js
 */

// Pastikan fungsi-fungsi ini diekspos secara global (sudah dijamin oleh script.js)

/**
 * Merender daftar peminjaman berdasarkan status filter dan teks pencarian.
 * @param {string} filterStatus - Status transaksi yang akan difilter ('all', 'diajukan', 'diacc', 'dipinjam', 'dikembalikan', 'ditolak', 'dibatalkan').
 * @param {string} [searchId=''] - ID transaksi yang dicari.
 */
async function renderLoanList(filterStatus, searchId = '') {
    const listContainer = document.getElementById('admin-pinjam-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p style="text-align: center;">Memuat data transaksi...</p>';
    const user = getLoggedInUser();
    if (!user || user.role !== 'admin') {
        listContainer.innerHTML = '<h2 style="text-align: center; color: var(--danger-color);">Akses Ditolak. Anda bukan Admin.</h2>';
        return;
    }

    try {
        // Ambil semua data (users, books, transactions)
        const data = await getAllData();
        let loans = data.transactions.filter(t => t.type === 'pinjam');

        // 1. Filtering berdasarkan Status
        if (filterStatus !== 'all') {
            loans = loans.filter(t => t.status === filterStatus);
        }

        // 2. Filtering berdasarkan Pencarian ID
        if (searchId) {
            const searchKey = searchId.toLowerCase();
            loans = loans.filter(t => 
                String(t.id).includes(searchKey) ||
                (t.userId && String(t.userId).includes(searchKey))
            );
        }

        // 3. Sorting berdasarkan Permintaan User
        // - 'dikembalikan' (returned) diurutkan dari TERBARU ke TERLAMA (default)
        // - Status lainnya diurutkan dari TERLAMA ke TERBARU
        if (filterStatus === 'dikembalikan') {
             // Dikembalikan: Terbaru ke Terlama (descending)
             loans.sort((a, b) => new Date(b.returnedDate || b.date) - new Date(a.returnedDate || a.date));
        } else {
             // Lainnya: Terlama ke Terbaru (ascending)
             loans.sort((a, b) => new Date(a.date) - new Date(b.date));
        }


        listContainer.innerHTML = ''; // Bersihkan

        if (loans.length === 0) {
            listContainer.innerHTML = `<p style="text-align: center; padding: 20px; color: #666;">Tidak ada transaksi ${filterStatus === 'all' ? '' : 'dengan status ' + filterStatus} yang ditemukan.</p>`;
            return;
        }

        loans.forEach(t => {
            const book = data.books.find(b => b.id === t.bookId) || { title: 'Buku Dihapus', author: 'N/A', cover: null };
            const member = data.users.find(u => u.id === t.userId) || { name: 'Anggota Dihapus', username: 'N/A' };
            const coverSrc = book.cover && book.cover.startsWith('data:image') ? book.cover : (book.cover || 'img/default.jpg');
            
            let actionButtons = '';
            let statusText = t.status.charAt(0).toUpperCase() + t.status.slice(1);
            let infoText = `Diajukan pada: ${formatDate(t.date)}`;
            
            // Tentukan tombol aksi dan informasi tambahan
            switch (t.status) {
                case 'diajukan':
                    actionButtons = `
                        <button class="btn-acc" onclick="updateLoanStatus(${t.id}, 'diacc', ${t.bookId})">
                            <i class="fas fa-check"></i> ACC
                        </button>
                        <button class="btn-reject" onclick="updateLoanStatus(${t.id}, 'ditolak', ${t.bookId})">
                            <i class="fas fa-times"></i> Tolak
                        </button>
                    `;
                    infoText += '<br>Admin harus ACC/Tolak (Maks 1 hari)';
                    break;
                case 'diacc':
                    actionButtons = `
                        <button class="btn-pinjam" onclick="updateLoanStatus(${t.id}, 'dipinjam', ${t.bookId}, true)">
                            <i class="fas fa-handshake"></i> Konfirmasi Ambil
                        </button>
                        <button class="btn-reject" onclick="updateLoanStatus(${t.id}, 'dibatalkan', ${t.bookId})">
                            <i class="fas fa-ban"></i> Batalkan
                        </button>
                    `;
                    infoText += `<br>Batas Ambil: **${formatDate(t.dueDate)}** (Otomatis batal jika kadaluarsa)`;
                    break;
                case 'dipinjam':
                    actionButtons = `
                        <button class="btn-kembali" onclick="updateLoanStatus(${t.id}, 'dikembalikan', ${t.bookId}, true, true)">
                            <i class="fas fa-undo"></i> Konfirmasi Kembali
                        </button>
                    `;
                    infoText += `<br>Batas Kembali: **${formatDate(t.dueDate)}** ${new Date(t.dueDate) < new Date() ? '(<span style="color: var(--danger-color);">TELAT!</span>)' : ''}`;
                    break;
                case 'dikembalikan':
                    infoText += `<br>Dikembalikan pada: **${formatDate(t.returnedDate)}**`;
                    break;
                case 'ditolak':
                case 'dibatalkan':
                    infoText += `<br>Status Final: **${t.status.toUpperCase()}**`;
                    break;
            }
            
            // Riwayat Aktivitas
            const activityList = (t.activity || []).map(a => `<li>[${formatDate(a.date)}] ${a.action}</li>`).join('');

            listContainer.innerHTML += `
                <div class="admin-card">
                    <img src="${coverSrc}" alt="Cover Buku">
                    <div class="card-content">
                        <h4>${book.title}</h4>
                        <p><strong>ID Transaksi:</strong> ${t.id}</p>
                        <p><strong>Peminjam:</strong> ${member.name} (@${member.username})</p>
                        <p><strong>Status:</strong> <span class="status-badge status-${t.status.toLowerCase()}">${statusText.toUpperCase()}</span></p>
                        <p>${infoText}</p>
                        <div class="activity-log" style="margin-top: 5px; font-size: 0.9em;"> 
                            <details> 
                                <summary style="cursor: pointer;">Aktivitas (klik)</summary> 
                                <ul style="margin-left: 20px; list-style-type: disc;">${activityList}</ul> 
                            </details> 
                        </div>
                    </div>
                    <div class="action-btns">
                        ${actionButtons}
                    </div>
                </div>
            `;
        });
        
    } catch (error) {
        console.error("Error rendering loan list:", error);
        listContainer.innerHTML = `<p style="text-align: center; color: var(--danger-color);">Gagal memuat daftar peminjaman: ${error.message}</p>`;
    }
}
window.renderLoanList = renderLoanList; // Ekspos ke global scope

/**
 * Memperbarui status peminjaman dan mengelola perubahan stok buku.
 * @param {number} transactionId - ID transaksi.
 * @param {string} newStatus - Status baru ('diacc', 'dipinjam', 'dikembalikan', 'ditolak', 'dibatalkan').
 * @param {number} bookId - ID buku terkait.
 * @param {boolean} [stockChangeRequired=false] - Apakah perlu ada perubahan stok.
 * @param {boolean} [isReturn=false] - Apakah aksi ini adalah pengembalian.
 */
async function updateLoanStatus(transactionId, newStatus, bookId, stockChangeRequired = false, isReturn = false) {
    if (!confirm(`Apakah Anda yakin ingin mengubah status transaksi ${transactionId} menjadi ${newStatus.toUpperCase()}?`)) {
        return;
    }

    try {
        const data = await getAllData();
        const loanIndex = data.transactions.findIndex(t => t.id === transactionId);
        const bookIndex = data.books.findIndex(b => b.id === bookId);
        
        if (loanIndex === -1 || bookIndex === -1) {
            alert('Transaksi atau Buku tidak ditemukan!');
            return;
        }

        let loan = data.transactions[loanIndex];
        let book = data.books[bookIndex];
        let actionMessage = `Transaksi diubah statusnya menjadi ${newStatus.toUpperCase()} oleh Admin.`;

        // 1. Update Status dan Activity Log
        loan.status = newStatus;
        loan.activity = loan.activity || [];
        
        const now = new Date().toISOString();
        
        switch (newStatus) {
            case 'diacc':
                // Set Due Date untuk pengambilan (misalnya 3 hari)
                const dueDateAcc = new Date();
                // DUE_DATE_ACC_MAX adalah 3 dari script.js
                dueDateAcc.setDate(dueDateAcc.getDate() + DUE_DATE_ACC_MAX); 
                loan.dueDate = dueDateAcc.toISOString();
                actionMessage = `Disetujui (ACC). Batas pengambilan buku hingga ${formatDate(loan.dueDate)}.`;
                break;
            case 'dipinjam':
                // Stok berkurang
                if (book.stock > 0 && book.type.includes('Fisik')) {
                    book.stock -= 1;
                    // Set Due Date untuk pengembalian (misalnya 7 hari)
                    const dueDatePinjam = new Date();
                    // DUE_DATE_PINJAM_MAX adalah 7 dari script.js
                    dueDatePinjam.setDate(dueDatePinjam.getDate() + DUE_DATE_PINJAM_MAX); 
                    loan.dueDate = dueDatePinjam.toISOString();
                    actionMessage = `Buku diserahkan kepada Peminjam. Batas kembali: ${formatDate(loan.dueDate)}.`;
                } else {
                    alert('Gagal: Stok buku tidak cukup atau buku bukan fisik!');
                    return;
                }
                break;
            case 'dikembalikan':
                // Stok bertambah dan catat tanggal kembali
                if (book.stock < book.stockMax && book.type.includes('Fisik')) {
                    book.stock += 1;
                    loan.returnedDate = now;
                    actionMessage = 'Buku diterima kembali. Transaksi selesai.';
                } else {
                    // Ini bisa terjadi jika ada kesalahan data/stok sudah max. Tetap lanjutkan jika isReturn true
                    loan.returnedDate = now; 
                    actionMessage = 'Buku diterima kembali. (Peringatan: Stok tidak berubah karena sudah Maks/Bukan Fisik)';
                }
                break;
            case 'ditolak':
                actionMessage = 'Pengajuan DITOLAK oleh Admin.';
                break;
            case 'dibatalkan':
                // Stok dikembalikan jika status sebelumnya 'dipinjam' atau 'diacc' yang manual dibatalkan
                if (loan.status === 'dipinjam' && book.stock < book.stockMax) {
                     book.stock += 1;
                }
                actionMessage = 'Transaksi DIBATALKAN oleh Admin.';
                break;
        }

        loan.activity.push({ date: now, action: actionMessage });

        // 2. Simpan Perubahan ke Database
        // Simpan transaksi dan buku secara terpisah agar lebih aman
        await setDatabaseData(`transactions/${loanIndex}`, loan);
        await setDatabaseData(`books/${bookIndex}`, book);
        
        alert(`Status transaksi ${transactionId} berhasil diupdate ke ${newStatus.toUpperCase()}`);
        
        // 3. Muat Ulang Daftar
        // Muat ulang daftar dengan filter status yang sama atau 'all' jika searchId aktif
        const activeTab = document.querySelector('.tab-btn.active');
        const currentFilter = activeTab ? activeTab.getAttribute('data-status') : 'all';
        renderLoanList(currentFilter);
        
    } catch (error) {
        console.error("Gagal mengupdate status peminjaman:", error);
        alert(`Gagal mengupdate status: ${error.message}`);
    }
}
window.updateLoanStatus = updateLoanStatus;