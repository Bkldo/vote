// ==========================================
// การตั้งค่า API (นำ URL ที่ได้จากการ Deploy Apps Script มาใส่ที่นี่)
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbwiLxCRm-PSCKWCZ6-P4CwLuqvWcc5i-WY0TS8sKwKKDcYu1hQP6Xk3vpI6ILZM76C5/exec";

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

// ข้อมูลผลลัพธ์ (จะถูกสร้างแบบ Dynamic)
const resultCardCapture = document.getElementById('result-card-capture');

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
            const data = await fetchVoterData(query);
            
            if (data.status === "success" && data.data) {
                // รองรับทั้ง object เดี่ยว (เวอร์ชันเก่า) และ array (เวอร์ชันใหม่)
                const resultsArray = Array.isArray(data.data) ? data.data : [data.data];
                displayResult(resultsArray);
                saveHistory(query, resultsArray);
            } else {
                console.warn("API ตอบกลับว่าไม่พบข้อมูลหรือมีข้อผิดพลาด:", data);
                showError(data.message || "ไม่พบข้อมูลผู้มีสิทธิเลือกตั้ง");
            }
        }
    } catch (error) {
        console.error("Error fetching data:", error);
        showError("เชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
        loader.classList.add('hidden');
    }
}

async function fetchVoterData(query) {
    const requests = [
        fetchVoterDataByFetch(query),
        fetchVoterDataJsonp(query)
    ];

    try {
        return await Promise.any(requests);
    } catch (error) {
        throw new Error('API timeout or unavailable');
    }
}

async function fetchVoterDataByFetch(query) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const url = `${API_URL}?q=${encodeURIComponent(query)}&t=${Date.now()}`;

    try {
        const response = await fetch(url, {
            cache: 'no-store',
            redirect: 'follow',
            signal: controller.signal
        });
        const textData = await response.text();
        return JSON.parse(textData);
    } finally {
        clearTimeout(timeoutId);
    }
}

function fetchVoterDataJsonp(query) {
    return new Promise((resolve, reject) => {
        const callbackName = `voterCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement('script');
        const timeoutId = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP timeout'));
        }, 8000);

        function cleanup() {
            clearTimeout(timeoutId);
            delete window[callbackName];
            script.remove();
        }

        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        script.onerror = () => {
            cleanup();
            reject(new Error('JSONP load error'));
        };

        script.src = `${API_URL}?q=${encodeURIComponent(query)}&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
        document.body.appendChild(script);
    });
}

// ==========================================
// แสดงผลลัพธ์ & ข้อผิดพลาด
// ==========================================
function displayResult(dataArray) {
    // Clear old results
    resultCardCapture.innerHTML = '';
    
    // วนลูปสร้างการ์ดผลลัพธ์
    dataArray.forEach((data, index) => {
        const cardHTML = `
            <div class="result-card">
                <div class="result-header">
                    <h2>ผลการค้นหา ${dataArray.length > 1 ? `(${index + 1}/${dataArray.length})` : ''}</h2>
                </div>
                <div class="result-body">
                    <div class="info-row">
                        <span class="info-label">ลำดับที่</span>
                        <span class="info-value highlight-text">${data.no || '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ชื่อ-สกุล</span>
                        <span class="info-value highlight-text">${data.name || '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">สังกัด</span>
                        <span class="info-value">${data.dept || '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">หน่วยเลือกตั้งที่</span>
                        <span class="info-value">${data.stationNo || '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">ที่เลือกตั้ง</span>
                        <span class="info-value">${data.location || '-'}</span>
                    </div>
                </div>
            </div>
        `;
        resultCardCapture.innerHTML += cardHTML;
    });

    // แสดงส่วนผลลัพธ์
    resultSection.classList.remove('hidden');
}

function showError(message) {
    const text = errorMessage.querySelector('p');
    if (text) {
        text.textContent = message || 'ไม่พบข้อมูลผู้มีสิทธิเลือกตั้ง หรือเกิดข้อผิดพลาด';
    }
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
                // รองรับทั้งแบบเก่าที่เป็น object และแบบใหม่ที่เป็น array
                const dataObj = Array.isArray(item.data) ? item.data[0] : item.data;
                const moreCount = Array.isArray(item.data) && item.data.length > 1 ? ` (+อีก ${item.data.length - 1} รายการ)` : '';

                div.className = 'result-card';
                div.style.marginBottom = '15px';
                div.style.borderColor = '#e2e8f0'; // ให้สีขอบอ่อนลงกว่าปกติ
                div.innerHTML = `
                    <div class="result-header" style="background-color: var(--light-blue); color: var(--text-main); padding: 12px 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0;">
                        <h2 style="font-size: 15px; font-weight: 600;"><i class="fa-solid fa-clock-rotate-left" style="font-size: 13px; color: var(--primary-color);"></i> ค้นหา: ${item.query}</h2>
                        <span style="font-size: 12px; color: var(--text-muted);">${item.date}</span>
                    </div>
                    <div class="result-body" style="padding: 15px;">
                        <div class="info-row" style="margin-bottom: 10px; font-size: 14px; color: var(--primary-color); font-weight: 500;">
                            พบทั้งหมด ${Array.isArray(item.data) ? item.data.length : 1} รายการ (แสดงรายการแรก)
                        </div>
                        <div class="info-row">
                            <span class="info-label">ลำดับที่</span>
                            <span class="info-value highlight-text">${dataObj.no || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">ชื่อ-สกุล</span>
                            <span class="info-value highlight-text">${dataObj.name || '-'}${moreCount}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">สังกัด</span>
                            <span class="info-value">${dataObj.dept || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">หน่วยเลือกตั้งที่</span>
                            <span class="info-value">${dataObj.stationNo || '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">ที่เลือกตั้ง</span>
                            <span class="info-value">${dataObj.location || '-'}</span>
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
        link.download = `ข้อมูลสิทธิเลือกตั้ง.png`;
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




