const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const wifi = require('node-wifi');

// Khởi tạo node-wifi (chỉ dùng trên Windows/Linux)
wifi.init({
    iface: null // Tự động nhận diện Network Interface mặc định
});
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
        const platform = process.platform;

        if (platform === 'darwin') {
            // ===== macOS: Dùng system_profiler (airport đã bị Apple xóa trên macOS Ventura/Sonoma) =====
            const command = `system_profiler SPAirPortDataType | awk '/Current Network Information:/ { getline; sub(/^[ \\t]*/, ""); sub(/:$/, ""); print; exit }'`;
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    return reject(new Error(`Lỗi macOS system_profiler: ${stderr || error.message}`));
                }
                const ssid = stdout.trim();
                if (ssid) {
                    resolve(ssid);
                } else {
                    reject(new Error('Không lấy được SSID. Vui lòng đảm bảo đang kết nối Wi-Fi.'));
                }
            });
        } else {
            // ===== Windows / Linux: Dùng node-wifi =====
            wifi.getCurrentConnections((error, currentConnections) => {
                if (error) {
                    return reject(new Error(`Lỗi khi lấy thông tin Wi-Fi: ${error.message}`));
                }
                if (currentConnections && currentConnections.length > 0) {
                    const ssid = currentConnections[0].ssid || currentConnections[0].name;
                    if (ssid) {
                        resolve(ssid);
                    } else {
                        reject(new Error('Đang bắt được mạng nhưng không lấy được tên (SSID).'));
                    }
                } else {
                    reject(new Error('Không tìm thấy kết nối Wi-Fi nào. Hãy kiểm tra lại kết nối mạng.'));
                }
            });
        }
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