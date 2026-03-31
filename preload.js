const { contextBridge, ipcRenderer } = require('electron');

// Tạo một API an toàn để giao diện có thể gọi các hàm ở main process
contextBridge.exposeInMainWorld('electronAPI', {
    startCheckIn: () => ipcRenderer.invoke('start-check-in')
});