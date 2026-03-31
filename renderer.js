const startBtn = document.getElementById('start-btn');
const statusDiv = document.getElementById('status');

startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    startBtn.textContent = 'Đang xử lý...';
    statusDiv.textContent = 'Đang kiểm tra thông tin mạng, vui lòng đợi...';
    statusDiv.className = 'status-info';

    // Gọi hàm đã được expose trong preload.js
    const result = await window.electronAPI.startCheckIn();

    // Cập nhật giao diện dựa trên kết quả
    statusDiv.textContent = result.message;
    if (result.success) {
        statusDiv.className = 'status-success';
    } else {
        statusDiv.className = 'status-error';
        startBtn.disabled = false;
        startBtn.textContent = 'Thử Lại';
    }
});