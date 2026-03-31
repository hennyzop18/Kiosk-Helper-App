const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// const wifi = require('node-wifi');
const { exec } = require('child_process');
const axios = require('axios');
const open = (...args) => import('open').then(({default: open}) => open(...args));

// --- CẤU HÌNH ---
// URL trỏ đến backend Laravel của bạn (đang chạy qua Docker)
const LARAVEL_API_URL = 'http://localhost:8000/api/kiosk/request-token'; 
// URL của trang Kiosk trên web
const KIOSK_WEB_URL = 'http://localhost:8000/kiosk/attendance'; 
// --- KẾT THÚC CẤU HÌNH ---


function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 500,
        height: 350,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, // Bảo mật
            nodeIntegration: false,
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Bỏ comment để debug
}

// Lắng nghe sự kiện 'start-check-in' từ giao diện
ipcMain.handle('start-check-in', async () => {
    
    const getSsid = () => new Promise((resolve, reject) => {
        // === LỆNH CUỐI CÙNG, ĐÁNG TIN CẬY NHẤT ===
        const command = `system_profiler SPAirPortDataType | awk '/Current Network Information:/ { getline; sub(/^[ \t]*/, ""); sub(/:$/, ""); print; exit }'`;
        // =======================================

        exec(command, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`Lỗi khi chạy system_profiler: ${stderr}`));
            }
            const ssid = stdout.trim();
            if (ssid) {
                resolve(ssid);
            } else {
                reject(new Error('Không thể lấy được SSID. Vui lòng đảm bảo bạn đang kết nối Wi-Fi.'));
            }
        });
    });

    try {
        const currentSSID = await getSsid();
        
        const response = await axios.post(LARAVEL_API_URL, {
            ssid: currentSSID
        });

        const { otp_token } = response.data;

        if (otp_token) {
            await open(`${KIOSK_WEB_URL}?token=${otp_token}`);
            app.quit();
            return { success: true, message: 'Thành công! Đang mở Kiosk...' };
        } else {
            return { success: false, message: 'Lỗi: Server không trả về token.' };
        }

    } catch (error) {
        console.error('Error in start-check-in:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Lỗi không xác định.';
        return { success: false, message: `Thất bại: ${errorMessage}` };
    }
});



app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});