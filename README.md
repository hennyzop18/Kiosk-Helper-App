# 🖥 Kiosk Helper App

> Ứng dụng Desktop (Electron) hỗ trợ chấm công khuôn mặt tại Kiosk vật lý.  
> Hoạt động liên kết với Web App `qlnhansutest` (Laravel backend).

---

## 📋 Yêu Cầu

| Thành phần | Yêu cầu |
|---|---|
| **Node.js** | >= 18 |
| **npm** | >= 9 |
| **Hệ điều hành** | macOS, Windows, Linux |
| **Web App Backend** | Đang chạy tại `http://localhost:8000` |
| **Kết nối mạng** | WiFi nội bộ văn phòng (SSID phải có trong `config/hr.php`) |

---

## ⚙ Cài Đặt & Cấu Hình

### Bước 1: Cài dependencies

```bash
cd kiosk-helper-app
npm install
```

### Bước 2: Cấu hình URL trong `main.js`

Mở file `main.js`, chỉnh 2 hằng số ở đầu file:

```javascript
// URL API backend để lấy OTP token
const LARAVEL_API_URL = 'http://localhost:8000/api/kiosk/request-token';

// URL trang Kiosk chấm công
const KIOSK_WEB_URL = 'http://localhost:8000/kiosk/attendance';
```

### Bước 3: Cấu hình WiFi được phép (ở Backend)

Mở file `qlnhansutest/config/hr.php`, thêm tên WiFi và IP của máy bạn:

```php
'allowed_office_ips' => [
    '127.0.0.1',
    '192.168.1.5',   // ← IP máy tính của bạn
],
'allowed_office_ssids' => [
    'TEN_WIFI_VAN_PHONG',  // ← Tên WiFi bạn đang kết nối
],
```

> **Lưu ý:** Tên WiFi phải nhập **chính xác** từng ký tự và khoảng trắng.  
> Kiểm tra IP máy: `ifconfig | grep inet` (macOS/Linux) hoặc `ipconfig` (Windows).

---

## ▶ Khởi Chạy

```bash
npm start
```

Cửa sổ Electron mở ra → Nhấn nút **"Bắt Đầu Chấm Công"** → App tự động:
1. Đọc SSID WiFi hiện tại của máy
2. Gọi API Backend xin cấp OTP Token (hiệu lực 120 giây)
3. Mở trình duyệt đến trang Kiosk FaceID tự động

---

## 🔄 Flow Hoạt Động

```
[Kiosk Desktop App]              [Backend Laravel]         [Kiosk Web - Trình Duyệt]
        │                                │                           │
        │  1. Nhấn "Bắt Đầu"            │                           │
        │  2. Đọc SSID WiFi             │                           │
        │                               │                           │
        │  3. POST /api/kiosk/          │                           │
        │     request-token ───────────►│                           │
        │     { ssid: "OfficeWiFi" }    │ Verify SSID + IP          │
        │                               │ → Tạo OTP (120s)          │
        │  4. ◄── { otp_token: "..." }  │                           │
        │                               │                           │
        │  5. Mở browser:               │                           │
        │     /kiosk/attendance         │                           │
        │     ?token=<otp>  ───────────────────────────────────────►│
        │                               │  6. Load face-api.js      │
        │                               │  7. Đọc token từ URL      │
        │                               │  8. Xóa token khỏi URL    │
        │                               │     (window load event)   │
        │                               │  9. Bật camera nhận diện  │
        │                               │                           │
        │                               │  10. POST /api/kiosk/     │
        │                               │      record-attendance    │
        │                               │  ◄── "Check-in thành công"│
```

---

## 🐛 Troubleshooting — Các Lỗi Thường Gặp

### ❌ Lỗi 1: `spawn airport ENOENT`

```
Error: Lỗi khi lấy thông tin Wi-Fi: spawn /System/Library/.../airport ENOENT
```

**Nguyên nhân:** `node-wifi` trên macOS phụ thuộc công cụ `airport` — đã bị **Apple xóa từ macOS Ventura (13) trở đi**.

**Trạng thái:** ✅ **Đã fix trong code hiện tại.**

App tự động phân nhánh theo OS:
- **macOS** → dùng `system_profiler SPAirPortDataType` (ổn định, không dùng `airport`)
- **Windows / Linux** → dùng `node-wifi`

Nếu vẫn gặp lỗi, kiểm tra hàm `getSsid()` trong `main.js` có điều kiện `if (platform === 'darwin')`.

---

### ❌ Lỗi 2: `Thất bại: Yêu cầu bị từ chối. Thiết bị không kết nối đúng mạng Wi-Fi`

**Nguyên nhân:** Tên WiFi của máy chưa có trong `allowed_office_ssids` ở Backend.

**Cách fix:**
1. Kiểm tra tên WiFi đang kết nối (macOS: giữ Option + click icon WiFi để xem chi tiết SSID)
2. Thêm **chính xác** tên đó vào `qlnhansutest/config/hr.php`:
   ```php
   'allowed_office_ssids' => [
       'TEN_WIFI_CHINH_XAC',
   ],
   ```
3. Thêm IP máy vào `allowed_office_ips`:
   ```bash
   # Lấy IP máy Mac
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

---

### ❌ Lỗi 3: `Phiên không hợp lệ. Vui lòng khởi động lại từ ứng dụng Desktop`

```
Lỗi: Phiên không hợp lệ. Vui lòng khởi động lại từ ứng dụng Desktop.
```

**Nguyên nhân gốc rễ:** Script `window.history.replaceState()` đặt trong `<head>` của Blade sẽ xóa `?token=...` khỏi URL **trước khi** `kiosk_attendance.js` kịp đọc → `getTokenFromUrl()` trả về `null` → báo lỗi phiên.

**Trạng thái:** ✅ **Đã fix.**

Script `replaceState` hiện được gọi trong `window.addEventListener('load', ...)` ở cuối `<body>` — JS đọc token trước, xóa URL sau.

**Nếu vẫn gặp:** Token có thể đã hết hạn (mặc định 120 giây). Kiểm tra `KioskApiController.php`:
```php
// Tăng thời gian nếu cần (đơn vị: giây)
Cache::put($cacheKey, true, now()->addSeconds(120));
```

---

### ❌ Lỗi 4: `npm audit` báo `high severity` cho Electron

```
electron <=39.8.4
Severity: high
fix available via `npm audit fix --force`
```

**Cách fix:**
```bash
npm audit fix --force
```

> **Lưu ý:** Lệnh này nâng Electron lên phiên bản major mới (breaking change). Chạy `npm start` và kiểm tra lại app sau khi cập nhật.

---

### ❌ Lỗi 5: Máy dùng mạng dây LAN (Ethernet) — không lấy được SSID

**Nguyên nhân:** Máy kết nối LAN cáp không có SSID WiFi → lệnh `system_profiler` hoặc `node-wifi` trả về rỗng.

**Giải pháp tạm thời:** Kết nối WiFi thay vì dùng cáp LAN khi muốn dùng Kiosk chấm công.

**Giải pháp dài hạn (TODO):** Triển khai xác thực bằng **MAC Address** của Network Interface thay vì SSID. Backend đã có comment gợi ý cho tính năng này trong `KioskApiController.php`.

---

## 📦 Dependencies

| Package | Phiên bản | Mục đích |
|---|---|---|
| `electron` | ^41.2.0 | Framework Desktop App |
| `axios` | ^1.11.0 | HTTP Client gọi Backend API |
| `node-wifi` | ^2.0.16 | Đọc WiFi trên Windows/Linux |
| `open` | ^10.2.0 | Mở URL trong trình duyệt mặc định |
