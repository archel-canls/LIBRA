/* js/reset_password.js */

document.addEventListener('DOMContentLoaded', () => {
    // Memastikan user sudah login sebelum melanjutkan
    const currentUser = getLoggedInUser();
    
    if (!currentUser) {
        alert("Anda harus login untuk mengakses halaman reset password.");
        window.location.href = 'login.html';
        return;
    }
    
    const verifyForm = document.getElementById('verify-password-form');
    const newPasswordForm = document.getElementById('new-password-form');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');

    // --- Tahap 1: Verifikasi Kata Sandi Lama ---
    if (verifyForm) {
        verifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const oldPassword = verifyForm.old_password.value;

            // Verifikasi password lama
            if (oldPassword === currentUser.password) {
                step1.classList.add('hidden');
                step2.classList.remove('hidden');
            } else {
                alert('Kata Sandi Lama yang Anda masukkan salah!');
            }
        });
    }

    // --- Tahap 2: Input dan Simpan Kata Sandi Baru ---
    if (newPasswordForm) {
        newPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newPassword = newPasswordForm.new_password.value;
            const confirmNewPassword = newPasswordForm.confirm_new_password.value;

            if (newPassword.length < 5) {
                alert('Kata Sandi Baru minimal harus 5 karakter.');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                alert('Konfirmasi Kata Sandi Baru tidak cocok!');
                return;
            }
            if (newPassword === currentUser.password) {
                alert('Kata sandi baru tidak boleh sama dengan kata sandi lama.');
                return;
            }

            try {
                // 1. Ambil semua data
                const data = await getAllData();
                
                // 2. Cari dan update user di array users
                const userIndex = data.users.findIndex(u => u.id === currentUser.id);

                if (userIndex !== -1) {
                    data.users[userIndex].password = newPassword;
                    
                    // 3. Simpan kembali data ke Firebase
                    await setDatabaseData('users', data.users);
                    
                    // 4. Update session user saat ini
                    const updatedUser = { ...currentUser, password: newPassword };
                    setLoggedInUser(updatedUser); 

                    alert('Kata Sandi berhasil diperbarui! Anda akan diarahkan ke Beranda.');
                    window.location.href = 'index.html';
                } else {
                    alert('Kesalahan sistem: Pengguna tidak ditemukan di database.');
                }
            } catch (error) {
                console.error("Error updating password:", error);
                alert('Gagal memperbarui kata sandi. Cek koneksi atau coba lagi.');
            }
        });
    }
});