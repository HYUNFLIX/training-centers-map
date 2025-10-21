// centers-list.js - 연수원 목록 페이지
console.log("Loading centers-list.js...");

// For now, this is a stub. The full implementation will be added.
// This page uses inline JavaScript in centers-list.html for basic functionality.

// TODO: Implement full features:
// - Firebase integration
// - Toast notifications
// - Advanced filtering
// - CSV/Excel export
// - View toggle (table/card)
// - Share functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('centers-list.js initialized');
    
    // Display a message that the page is under development
    const message = document.createElement('div');
    message.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0077cc;color:white;padding:15px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;';
    message.innerHTML = '<strong>개발 중</strong><br>고급 기능이 곧 추가됩니다!';
    document.body.appendChild(message);
    setTimeout(() => message.remove(), 5000);
});
