// test_wifi.js
const wifi = require('node-wifi');

console.log('Đang khởi tạo module Wi-Fi...');

// Initialize wifi module
wifi.init({
    iface: null // Let it find the default network interface
});

console.log('Đang thực hiện quét mạng Wi-Fi...');

// Scan for nearby networks
wifi.scan((error, networks) => {
    if (error) {
        console.error("Lỗi khi quét mạng:", error);
        return;
    }
    console.log("Đã quét thành công! Các mạng tìm thấy:");
    console.log(networks.map(net => `SSID: ${net.ssid}, Signal: ${net.signal_level}`));
});

// Get current connections
wifi.getCurrentConnections((error, currentConnections) => {
    if (error) {
        console.error("Lỗi khi lấy kết nối hiện tại:", error);
        return;
    }
    console.log("Đã lấy kết nối hiện tại thành công:");
    console.log(currentConnections);
});