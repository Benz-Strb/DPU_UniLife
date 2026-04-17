DPU UniLife
แพลตฟอร์มโซเชียลสำหรับนักศึกษา มหาวิทยาลัยธุรกิจบัณฑิตย์ (DPU) รวมทุกอย่างไว้ในที่เดียว ทั้งฟีดโพสต์ แชท ตารางเรียน และประกาศจากมหาวิทยาลัย
ฟีเจอร์หลัก
AI Feed — ฟีดโพสต์ที่ระบบจัดเรียงให้เองตามพฤติกรรมการใช้งาน เน้นโพสต์จากคนที่ติดตามและโพสต์ที่กำลังได้รับความสนใจ
แชทเรียลไทม์ — คุยแบบตัวต่อตัวหรือสร้างกลุ่มแชทได้เลย ใช้ Socket.io ทำให้ข้อความส่งถึงทันที
ตารางเรียน — เพิ่มวิชาเรียนของตัวเองได้เอง ดูได้ตลอดว่าวันนี้มีคาบอะไรบ้าง
ประกาศมหาวิทยาลัย — พื้นที่สำหรับข่าวสารทางการจากคณะและมหาวิทยาลัย แยกออกมาชัดเจนไม่ปนกับโพสต์ทั่วไป
Admin Dashboard — เว็บจัดการหลังบ้านสำหรับแอดมิน ดูรายงาน จัดการผู้ใช้ และตรวจสอบสถิติต่างๆ

โครงสร้างโปรเจกต์

/backend     → API, ฐานข้อมูล, Socket server
/frontend    → แอปมือถือ (iOS/Android)
/dashboard   → เว็บแอดมิน
/uploads     → ไฟล์รูปภาพที่อัปโหลด

Stack หลัก: Node.js + Express + Prisma + supabase (backend) / React Native + Expo + NativeWind (frontend) / React + Vite (dashboard)

Super Admin

| Student ID | Password | 
|------------|----------|
| admin@dpu.ac.th | Admin@1234 |

Faculty Admin

| คณะ | Student ID | Password |
|-----|------------|----------|
| LAW | 11110001@dpu.ac.th | Admin@LAW01 |
| CA | 11110002@dpu.ac.th | Admin@CA02 |
| FA | 11110003@dpu.ac.th | Admin@FA03 |
| ARTS | 11110004@dpu.ac.th | Admin@ARTS04 |
| PA | 11110005@dpu.ac.th | Admin@PA05 |
| HT | 11110006@dpu.ac.th | Admin@HT06 |
| MT | 11110007@dpu.ac.th | Admin@MT07 |
| CIBA | 11110008@dpu.ac.th | Admin@CIBA08 |
| CITE | 11110009@dpu.ac.th | Admin@CITE09 |
| CIM | 11110010@dpu.ac.th | Admin@CIM10 |
| CADT | 11110011@dpu.ac.th | Admin@CADT11 |
| ANT | 11110012@dpu.ac.th | Admin@ANT12 |
| CHW | 11110013@dpu.ac.th | Admin@CHW13 |
| IC | 11110014@dpu.ac.th | Admin@IC14 |