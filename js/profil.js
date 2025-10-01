const DEFAULT_PROFILE_IMG = 'img/default_user.png'; 

document.addEventListener('DOMContentLoaded', () => {
    // Memastikan fungsi database tersedia dari script.js
    if (typeof getLoggedInUser !== 'function' || typeof getAllData !== 'function' || typeof setDatabaseData !== 'function') {
        console.error("Fungsi database/session dari script.js tidak ditemukan.");
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
    const closeModaBtn = document.getElementById('close-modal');
    const editPhotoForm = document.getElementById('edit-photo-form');
    const modalFotoUpload = document.getElementById('modal-foto-upload');
    
    // --- FUNGSI UTAMA: UPDATE UI HEADER & SIDEBAR ---
    const updateProfileUI = (user) => {
        const imageSource = (user && user.profilePicture) ? user.profilePicture : DEFAULT_PROFILE_IMG;

        // 1. UPDATE HEADER ICON (Pre-click)
        if (headerProfileImg && defaultIcon) {
            headerProfileImg.src = imageSource;
            
            if (imageSource === DEFAULT_PROFILE_IMG) {
                // Belum Login: Tampilkan ikon default (i), sembunyikan gambar (img)
                headerProfileImg.style.display = 'none';
                defaultIcon.style.display = 'block';
            } else {
                // Sudah Login: Tampilkan gambar (img), sembunyikan ikon default (i)
                headerProfileImg.style.display = 'block';
                defaultIcon.style.display = 'none';
            }
        }

        // 2. UPDATE SIDEBAR CONTENT (Post-click)
        if (user) {
            // Status: SUDAH LOGIN
            sidebarUsername.textContent = user.username || 'Pengguna';
            sidebarProfileImg.src = imageSource;
            
            authText.textContent = 'Logout';
            authIcon.className = 'fas fa-sign-out-alt mr-3';
            sidebarAuthLink.href = '#'; 
            
            loginFeatures.forEach(el => el.style.display = 'flex');

            // Setup Logout Listener
            sidebarAuthLink.onclick = (e) => {
                e.preventDefault();
                if (confirm("Apakah Anda yakin ingin logout?")) {
                    setLoggedInUser(null);
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
            
            loginFeatures.forEach(el => el.style.display = 'none');
        }
    };
    
    // --- FUNGSI EDIT FOTO PROFIL ---
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
            const newPhotoData = event.target.result;
            
            try {
                // 1. Ambil semua data
                const data = await getAllData();
                
                // 2. Cari dan update user di array users
                const userIndex = data.users.findIndex(u => u.id === currentUser.id);

                if (userIndex !== -1) {
                    data.users[userIndex].profilePicture = newPhotoData;
                    
                    // 3. Simpan kembali data ke Firebase
                    await setDatabaseData('users', data.users);
                    
                    // 4. Update session user saat ini dan variabel global currentUser
                    currentUser = { ...currentUser, profilePicture: newPhotoData };
                    setLoggedInUser(currentUser); 
                    
                    // 5. Perbarui tampilan UI
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
        document.body.style.overflow = profileSidebar.classList.contains('open') ? 'hidden' : '';
    };

    if (profileIcon) profileIcon.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    // Modal Events
    if (editPhotoLink) {
        editPhotoLink.addEventListener('click', (e) => {
            e.preventDefault();
            if(currentUser) {
                editPhotoModal.classList.remove('hidden');
                profileSidebar.classList.remove('open'); // Tutup sidebar saat modal dibuka
                sidebarOverlay.classList.remove('active');
            }
        });
    }

    if (closeModaBtn) closeModaBtn.addEventListener('click', () => {
        editPhotoModal.classList.add('hidden');
    });

    if (editPhotoForm) {
        editPhotoForm.addEventListener('submit', handleProfilePhotoEdit);
    }
    
    // Panggil fungsi utama saat DOM siap
    updateProfileUI(currentUser);
});

tailwind.config = {
    theme: {
        extend: {
            colors: {
                // Mendefinisikan warna kustom agar sesuai dengan branding
                'primary': '#4f46e5', // Indigo
                'secondary': '#10b981', // Green
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
        }
    }
}