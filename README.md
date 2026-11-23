# ระบบทะเบียนวารสาร — โรงเรียนวัดบางพลีใหญ่กลาง

หน้าเว็บ (static) โฮสต์บน **GitHub Pages**: https://wyk3373428.github.io/WYK_PR/

ข้อมูลยังเก็บใน **Google Sheet** เหมือนเดิม โดยหน้าเว็บเรียกผ่าน Google Apps Script Web App ที่ทำหน้าที่เป็น API

## โครงสร้าง
- `index.html` — หน้าเว็บหลัก
- `css/style.css` — สไตล์
- `js/config.js` — URL ของ Apps Script Web App (`API_URL`)
- `js/api.js` — ตัวเชื่อมต่อ API (ทดแทน `google.script.run`)
- `js/app.js` — logic ของหน้าเว็บ

## ถ้า deploy Apps Script ใหม่แล้วได้ URL ใหม่
แก้ `API_URL` ใน `js/config.js` แล้ว push ขึ้น GitHub
