const DEFAULT_PROFILE_IMG = 'img/default_user.png';

document.addEventListener('DOMContentLoaded', () => {
    // Memastikan fungsi database tersedia dari script.js
    // Catatan: Asumsikan getLoggedInUser, getAllData, setDatabaseData, dan setLoggedInUser didefinisikan di 'script.js'
    if (typeof getLoggedInUser !== 'function' || typeof getAllData !== 'function' || typeof setDatabaseData !== 'function' || typeof setLoggedInUser !== 'function') {
        console.error("Fungsi database/session dari script.js tidak ditemukan. Pastikan script tersebut dimuat.");
        return;
    }

    let currentUser = getLoggedInUser();

    // DOM Elements
    const profileIcon = document.getElementById('profile-icon');
    const headerProfileImg = document.getElementById('header-profile-img');
    const defaultIcon = profileIcon ? profileIcon.querySelector('.default-icon') : null;

    const profileSidebar = document.getElementById('profile-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    const sidebarUsername = document.getElementById('sidebar-username');
    const sidebarProfileImg = document.getElementById('sidebar-profile-img');
    const sidebarAuthLink = document.getElementById('sidebar-auth-link');
    const authText = document.getElementById('auth-text');
    const authIcon = document.getElementById('auth-icon');
    const loginFeatures = document.querySelectorAll('.login-feature');

    // Modal Elements for Edit Photo
    const editPhotoLink = document.getElementById('link-edit-profile-photo');
    const editPhotoModal = document.getElementById('edit-photo-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const editPhotoForm = document.getElementById('edit-photo-form');
    const modalFotoUpload = document.getElementById('modal-foto-upload');
    // Tambahan elemen baru untuk fungsionalitas di modal
    const modalCurrentPhoto = document.getElementById('modal-current-profile-img');
    const deletePhotoBtn = document.getElementById('delete-photo-btn');
    
    // --- FUNGSI UTAMA: UPDATE UI HEADER & SIDEBAR ---
    const updateProfileUI = (user) => {
        // Tentukan sumber gambar, gunakan profilePicture jika ada, jika tidak gunakan default
        const imageSource = (user && user.profilePicture) ? user.profilePicture : DEFAULT_PROFILE_IMG;

        // 1. UPDATE HEADER ICON
        if (headerProfileImg && defaultIcon) {
            headerProfileImg.src = imageSource;
            
            if (imageSource === DEFAULT_PROFILE_IMG) {
                headerProfileImg.style.display = 'none';
                defaultIcon.style.display = 'block';
            } else {
                headerProfileImg.style.display = 'block';
                defaultIcon.style.display = 'none';
            }
        }

        // 2. UPDATE SIDEBAR CONTENT
        if (user) {
            // Status: SUDAH LOGIN
            sidebarUsername.textContent = user.name || 'Pengguna';
            sidebarProfileImg.src = imageSource;
            
            authText.textContent = 'Logout';
            authIcon.className = 'fas fa-sign-out-alt mr-3';
            sidebarAuthLink.href = '#'; // Untuk mencegah navigasi langsung
            
            // Tampilkan fitur yang hanya untuk pengguna login
            loginFeatures.forEach(el => el.style.display = 'flex');

            // Setup Logout Listener
            sidebarAuthLink.onclick = (e) => {
                e.preventDefault();
                if (confirm("Apakah Anda yakin ingin logout?")) {
                    setLoggedInUser(null);
                    // Arahkan ke halaman utama setelah logout
                    window.location.href = 'index.html'; 
                }
            };
            
        } else {
            // Status: BELUM LOGIN (Pengunjung)
            sidebarUsername.textContent = 'Pengunjung';
            sidebarProfileImg.src = DEFAULT_PROFILE_IMG;

            authText.textContent = 'Login/Daftar';
            authIcon.className = 'fas fa-sign-in-alt mr-3';
            sidebarAuthLink.href = 'login.html';
            sidebarAuthLink.onclick = null;
            
            // Sembunyikan fitur yang hanya untuk pengguna login
            loginFeatures.forEach(el => el.style.display = 'none');
        }
    };
    
    // --- FUNGSI RESET FOTO PROFIL KE DEFAULT ---
    const resetProfilePhoto = async () => {
        if (!currentUser) return;

        try {
            const data = await getAllData();
            const userIndex = data.users.findIndex(u => u.id === currentUser.id);

            if (userIndex !== -1) {
                // Hapus properti profilePicture dari objek user di database
                delete data.users[userIndex].profilePicture;

                await setDatabaseData('users', data.users);

                // Update session user (hapus properti profilePicture)
                currentUser = { ...currentUser };
                delete currentUser.profilePicture;
                setLoggedInUser(currentUser);

                updateProfileUI(currentUser);
                alert('Foto Profil berhasil dihapus. Kembali ke foto default!');
                editPhotoModal.classList.add('hidden');
            } else {
                alert('Kesalahan sistem: Pengguna tidak ditemukan di database.');
            }
        } catch (error) {
            console.error("Error resetting profile photo:", error);
            alert('Gagal menghapus foto profil. Coba lagi.');
        }
    }


    // --- FUNGSI EDIT FOTO PROFIL (UPLOAD BARU) ---
    const handleProfilePhotoEdit = async (e) => {
        e.preventDefault();
        
        const file = modalFotoUpload.files[0];
        if (!file) {
            alert("Silakan pilih file gambar untuk diunggah.");
            return;
        }
        if (!file.type.startsWith('image/')) {
            alert("File harus berupa gambar (PNG, JPG, dll.)");
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            const newPhotoData = event.target.result; // Data URL gambar
            
            try {
                const data = await getAllData();
                const userIndex = data.users.findIndex(u => u.id === currentUser.id);

                if (userIndex !== -1) {
                    // Update properti profilePicture dengan Data URL baru
                    data.users[userIndex].profilePicture = newPhotoData;
                    
                    await setDatabaseData('users', data.users);
                    
                    // Update session user
                    currentUser = { ...currentUser, profilePicture: newPhotoData };
                    setLoggedInUser(currentUser);
                    
                    updateProfileUI(currentUser);
                    
                    alert('Foto Profil berhasil diperbarui!');
                    editPhotoModal.classList.add('hidden');
                } else {
                    alert('Kesalahan sistem: Pengguna tidak ditemukan di database.');
                }
            } catch (error) {
                console.error("Error updating profile photo:", error);
                alert('Gagal memperbarui foto profil. Cek koneksi atau coba lagi.');
            }
        };
        reader.readAsDataURL(file);
    };

    // --- LOGIKA SIDEBAR & MODAL EVENTS ---

    const toggleSidebar = () => {
        profileSidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
        // Mencegah scroll pada body saat sidebar terbuka
        document.body.style.overflow = profileSidebar.classList.contains('open') ? 'hidden' : '';
    };

    // Event Listener untuk Sidebar
    if (profileIcon) profileIcon.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Event Listener untuk membuka Modal Edit Foto
    if (editPhotoLink) {
        editPhotoLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Pastikan user sudah login sebelum membuka modal
            if(currentUser) {
                // Tampilkan foto saat ini di modal
                const currentImage = (currentUser && currentUser.profilePicture) ? currentUser.profilePicture : DEFAULT_PROFILE_IMG;
                if(modalCurrentPhoto) modalCurrentPhoto.src = currentImage;
                
                // Tampilkan tombol hapus hanya jika bukan foto default
                if(deletePhotoBtn) deletePhotoBtn.style.display = (currentImage !== DEFAULT_PROFILE_IMG) ? 'block' : 'none';

                // Tampilkan modal dan tutup sidebar
                editPhotoModal.classList.remove('hidden');
                profileSidebar.classList.remove('open'); 
                sidebarOverlay.classList.remove('active');
            }
        });
    }

    // Event Listener untuk menutup Modal
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
        editPhotoModal.classList.add('hidden');
    });
    
    // Handler untuk tombol Hapus Foto Profil
    if (deletePhotoBtn) {
        deletePhotoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm("Apakah Anda yakin ingin menghapus foto profil kustom Anda dan kembali ke foto default?")) {
                resetProfilePhoto();
            }
        });
    }

    // Handler untuk form submit (upload foto baru)
    if (editPhotoForm) {
        editPhotoForm.addEventListener('submit', handleProfilePhotoEdit);
    }
    
    // Panggil fungsi utama saat DOM siap untuk inisialisasi tampilan
    updateProfileUI(currentUser);
});

// Konfigurasi Tailwind CSS (Jika di dalam file yang sama, jika tidak, abaikan ini)
tailwind.config = {
    theme: {
        extend: {
            colors: {
                'primary': '#4f46e5', // Indigo
                'secondary': '#10b981', // Green
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
}