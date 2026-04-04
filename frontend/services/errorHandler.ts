import { Alert } from "react-native";

export const handleApiError = (error: any, customMessage?: string) => {
  console.error("[API Error]", error);

  let message = customMessage || "เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่อีกครั้ง";

  if (error.response) {
    // เซิร์ฟเวอร์ตอบกลับมาแต่เป็น Error Status
    const status = error.response.status;
    if (status === 401) message = "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่";
    else if (status === 403) message = "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้";
    else if (status === 404) message = "ไม่พบข้อมูลที่ต้องการ";
    else if (status === 500) message = "เซิร์ฟเวอร์ขัดข้อง กรุณาลองใหม่ภายหลัง";
    
    if (error.response.data?.error) {
      message = error.response.data.error;
    }
  } else if (error.request) {
    // ส่ง Request ไปแล้วแต่ไม่มีการตอบกลับ (เน็ตหลุด)
    message = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบอินเทอร์เน็ต";
  }

  Alert.alert("แจ้งเตือน", message);
};
