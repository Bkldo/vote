// ==========================================
// การตั้งค่า API (นำ URL ที่ได้จากการ Deploy Apps Script มาใส่ที่นี่)
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbzrNNKh4HgIxOGSEEuO-SyyvI21oGUISJTDLRI2PbrJQi4VVOzwPljuJmF3lxpVETQK/exec";

// ==========================================
// ตัวแปรอ้างอิง DOM Elements
// ==========================================
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const loader = document.getElementById('loader');
const resultSection = document.getElementById('result-section');
const errorMessage = document.getElementById('error-message');
const infoCards = document.getElementById('info-cards');
const saveImgBtn = document.getElementById('save-img-btn');

// ข้อมูลผลลัพธ์
const resNo = document.getElementById('res-no');
const resName = document.getElementById('res-name');
const resDept = document.getElementById('res-dept');
const resStationNo = document.getElementById('res-station-no');
const resLocation = document.getElementById('res-location');

// Navigation & Views
const navSearch = document.getElementById('nav-search');
const navHistory = document.getElementById('nav-history');
const searchView = document.getElementById('search-view');
const historyView = document.getElementById('history-view');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');

// ==========================================
// ฟังก์ชันเปลี่ยนหน้า (Navigation)
// ==========================================
navSearch.addEventListener('click', (e) => {
    e.preventDefault();
    navSearch.classList.add('active');
    navHistory.classList.remove('active');
    searchView.classList.remove('hidden');
    historyView.classList.add('hidden');
});

navHistory.addEventListener('click', (e) => {
    e.preventDefault();
    navHistory.classList.add('active');
    navSearch.classList.remove('active');
    historyView.classList.remove('hidden');
    searchView.classList.add('hidden');
    renderHistory();
});

// ==========================================
// ฟังก์ชันค้นหาข้อมูล
// ==========================================
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

async function handleSearch(historyQuery = null) {
    const query = historyQuery || searchInput.value.trim();
    
    if (!query) {
        alert('กรุณาระบุชื่อ หรือนามสกุล');
        return;
    }

    // ซ่อนผลลัพธ์เก่าและข้อความแสดงข้อผิดพลาด
    resultSection.classList.add('hidden');
    errorMessage.classList.add('hidden');
    infoCards.classList.add('hidden');
    
    // แสดง Loader
    loader.classList.remove('hidden');

    try {
        // หากยังไม่ได้ใส่ API URL ให้จำลองข้อมูล (Mock Data) สำหรับการทดสอบ UI ก่อน
        if (API_URL === "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE") {
            console.warn("ยังไม่ได้ตั้งค่า API_URL, ใช้งาน Mock Data");
            await new Promise(resolve => setTimeout(resolve, 1000)); // จำลองการโหลด
            
            // จำลองการค้นหาแบบยืดหยุ่น (เจอทุกคำที่พิมพ์มา)
            const mockData = [
                { no: "1", name: "นางปิยะธิดา ใจดี", dept: "ฝ่ายปกครอง", stationNo: "1", location: "อาคาร 1 สำนักงานเขต" },
                { no: "2", name: "นายสมชาย รักชาติ", dept: "ฝ่ายการศึกษา", stationNo: "2", location: "โรงเรียนเทศบาล" }
            ];
            
            const searchTerms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
            const result = mockData.find(item => {
                const nameStr = item.name.toLowerCase();
                return searchTerms.every(term => nameStr.includes(term));
            });
            
            if (result) {
                displayResult(result);
                saveHistory(query, result);
            } else {
                showError();
            }
        } else {
            // เรียกใช้งาน API จริง
            const response = await fetch(`${API_URL}?q=${encodeURIComponent(query)}`);
            
            // อ่านค่าเป็น text ก่อนเพื่อตรวจสอบ
            const textData = await response.text();
            
            try {
                const data = JSON.parse(textData);
                
                if (data.status === "success" && data.data) {
                    displayResult(data.data);
                    saveHistory(query, data.data);
                } else {
                    showError();
                }
            } catch (parseError) {
                console.error("API ไม่ได้ตอบกลับเป็น JSON (อาจเป็นปัญหาเรื่องสิทธิ์การเข้าถึง Web App):", textData.substring(0, 100));
                alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาตรวจสอบการตั้งค่าสิทธิ์ 'ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน' ใน Apps Script");
                showError();
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        showError();
    } finally {
        loader.classList.add('hidden');
    }
}

// ==========================================
// แสดงผลลัพธ์ & ข้อผิดพลาด
// ==========================================
function displayResult(data) {
    // กำหนดค่าให้ DOM
    resNo.textContent = data.no || '-';
    resName.textContent = data.name || '-';
    resDept.textContent = data.dept || '-';
    resStationNo.textContent = data.stationNo || '-';
    resLocation.textContent = data.location || '-';

    // แสดงส่วนผลลัพธ์
    resultSection.classList.remove('hidden');
}

function showError() {
    errorMessage.classList.remove('hidden');
    infoCards.classList.remove('hidden'); // แสดง info กลับมาด้านล่างข้อผิดพลาด
}

// ==========================================
// ฟังก์ชันจัดการประวัติการค้นหา (Local Storage)
// ==========================================
function saveHistory(query, data) {
    // ดึงประวัติเก่า
    let history = JSON.parse(localStorage.getItem('voterSearchHistory')) || [];
    
    // ลบคำค้นหาซ้ำออก (ถ้ามี) แล้วเอาคำล่าสุดไปไว้บนสุด
    history = history.filter(item => item.query !== query);
    
    // เพิ่มคำใหม่พร้อมเวลา
    const now = new Date();
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    history.unshift({ query: query, date: dateStr, data: data });
    
    // จำกัดแค่ 5 รายการล่าสุด
    if (history.length > 5) {
        history = history.slice(0, 5);
    }
    
    // บันทึกลง localStorage
    localStorage.setItem('voterSearchHistory', JSON.stringify(history));
}

function renderHistory() {
    const history = JSON.parse(localStorage.getItem('voterSearchHistory')) || [];
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyEmpty.classList.remove('hidden');
    } else {
        historyEmpty.classList.add('hidden');
        
        history.forEach(item => {
            const div = document.createElement('div');
            
            // หากมีข้อมูลผลลัพธ์ (รูปแบบใหม่)
            if (item.data) {
                div.className = 'result-card';
                div.style.marginBottom = '15px';
                div.style.borderColor = '#e2e8f0'; // ให้สีขอบอ่อนลงกว่าปกติ
                div.innerHTML = `
                    <div class="result-header" style="background-color: var(--light-blue); color: var(--text-main); padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                        <h2 style="font-size: 15px; font-weight: 600;"><i class="fa-solid fa-clock-rotate-left" style="font-size: 13px; color: var(--primary-color);"></i> ค้นหา: ${item.query}</h2>
                        <span style="font-size: 12px; color: var(--text-muted);">${item.date}</span>
                    </div>
                    <div class="result-body" style="padding: 15px;">
                        <div class="info-row">
                            <span class="info-label">ลำดับที่</span>
                            <span class="info-value highlight-text">${item.data.no || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">ชื่อ-สกุล</span>
                            <span class="info-value highlight-text">${item.data.name || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">สังกัด</span>
                            <span class="info-value">${item.data.dept || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">หน่วยเลือกตั้งที่</span>
                            <span class="info-value">${item.data.stationNo || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">ที่เลือกตั้ง</span>
                            <span class="info-value">${item.data.location || '-'}</span>
                        </div>
                    </div>
                `;
            } else {
                // รูปแบบเก่า (เผื่อมีคนเคยค้นหาไปแล้ว)
                div.className = 'history-item';
                div.innerHTML = `
                    <div>
                        <div class="history-name">${item.query}</div>
                        <div class="history-date"><i class="fa-regular fa-clock"></i> ${item.date}</div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color: var(--primary-color);"></i>
                `;
                
                div.addEventListener('click', () => {
                    searchInput.value = item.query;
                    navSearch.click(); // กลับไปหน้าค้นหา
                    handleSearch(item.query);
                });
            }
            
            historyList.appendChild(div);
        });
    }
}

// ==========================================
// ฟังก์ชันบันทึกรูปภาพผลลัพธ์ (html2canvas)
// ==========================================
saveImgBtn.addEventListener('click', () => {
    const targetElement = document.getElementById('result-card-capture');
    
    // เปลียนปุ่มเป็นสถานะกำลังโหลด
    const originalText = saveImgBtn.innerHTML;
    saveImgBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> กำลังประมวลผล...';
    saveImgBtn.disabled = true;

    html2canvas(targetElement, {
        scale: 2, // เพิ่มความละเอียด
        backgroundColor: '#ffffff',
        logging: false
    }).then(canvas => {
        // สร้าง link สำหรับดาวน์โหลด
        const link = document.createElement('a');
        link.download = `ข้อมูลสิทธิเลือกตั้ง_${resName.textContent.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        
        // คืนค่าปุ่ม
        saveImgBtn.innerHTML = originalText;
        saveImgBtn.disabled = false;
    }).catch(err => {
        console.error("Error saving image:", err);
        alert("เกิดข้อผิดพลาดในการบันทึกรูปภาพ");
        saveImgBtn.innerHTML = originalText;
        saveImgBtn.disabled = false;
    });
});
