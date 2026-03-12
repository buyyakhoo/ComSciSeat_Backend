import { mapSlotToDurationTime } from "./time.js"

export const reservationTemplate = (userInfo: any, labInfo: any, table_code: string, newBooking: any) => {
    return `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', 'Sarabun', Tahoma, sans-serif; color: #333333; border: 1px solid #E1DFDD; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="background-color: #0078D4; padding: 24px 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">ยืนยันการจองที่นั่งสำเร็จ!</h2>
            </div>
            <div style="padding: 30px 20px; background-color: #ffffff;">
                <p style="font-size: 16px; margin-top: 0;">สวัสดีคุณ <strong>${userInfo?.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #555555;">
                    ระบบได้ทำการยืนยันการจองที่นั่งของคุณเรียบร้อยแล้วครับ นี่คือรายละเอียดการจองของคุณ:
                </p>
                <div style="background-color: #F3F9FD; border-left: 4px solid #0078D4; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #0078D4; width: 35%;">ห้องแล็บ:</td>
                            <td style="padding: 8px 0; color: #333333;">${labInfo?.lab_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #0078D4;">หมายเลขโต๊ะ:</td>
                            <td style="padding: 8px 0; color: #333333;">${table_code}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #0078D4;">วันที่:</td>
                            <td style="padding: 8px 0; color: #333333;">
                                ${new Date(newBooking.booking_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #0078D4;">ช่วงเวลา:</td>
                            <td style="padding: 8px 0; color: #333333;">${mapSlotToDurationTime(newBooking.slot)}</td>
                        </tr>
                    </table>
                </div>

                <p style="font-size: 16px; line-height: 1.6; color: #555555;">
                    รบกวนเข้าใช้งานให้ตรงเวลานะครับ หากต้องการยกเลิกหรือเปลี่ยนแปลงการจอง สามารถทำรายการผ่านระบบได้ก่อนถึงเวลาที่จองไว้ครับ
                </p>
                <p style="font-size: 16px; margin-bottom: 0; margin-top: 24px;">ขอบคุณที่เลือกใช้งาน <strong>ComSciSeat</strong> ครับ!</p>
            </div>

            <div style="background-color: #F3F2F1; padding: 15px 20px; text-align: center; border-top: 1px solid #E1DFDD;">
                <p style="margin: 0; font-size: 12px; color: #888888;">
                    อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ ComSciSeat<br>กรุณาไม่ตอบกลับอีเมลนี้
                </p>
            </div>
        </div>
        `
}

export const cancelationTemplate = (userInfo: any, booking: any) => {
    return `
        <div style="max-width: 600px; margin: 0 auto; font-family: 'Segoe UI', 'Sarabun', Tahoma, sans-serif; color: #333333; border: 1px solid #E1DFDD; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">                 
            <div style="background-color: #D13438; padding: 24px 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">ยกเลิกการจองสำเร็จ</h2>
            </div>

            <div style="padding: 30px 20px; background-color: #ffffff;">
                <p style="font-size: 16px; margin-top: 0;">สวัสดีคุณ <strong>${userInfo?.name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #555555;">
                    ระบบได้ทำการ <strong>ยกเลิก</strong> การจองที่นั่งของคุณตามที่ร้องขอเรียบร้อยแล้วครับ:
                </p>

                <div style="background-color: #FDF3F4; border-left: 4px solid #D13438; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #D13438; width: 35%;">ห้องแล็บ:</td>
                            <td style="padding: 8px 0; color: #333333;">${booking?.tables?.labs?.lab_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #D13438;">หมายเลขโต๊ะ:</td>
                            <td style="padding: 8px 0; color: #333333;">${booking?.tables?.table_code}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #D13438;">วันที่:</td>
                            <td style="padding: 8px 0; color: #333333;">${new Date(booking.booking_date).toLocaleDateString('th-TH', { 
                                                                                day: 'numeric', month: 'long', year: 'numeric' 
                                                                            })}
                        </td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: 600; color: #D13438;">ช่วงเวลา:</td>
                            <td style="padding: 8px 0; color: #333333;">${mapSlotToDurationTime(booking.slot)}</td>
                        </tr>
                    </table>
                </div>

                <p style="font-size: 16px; line-height: 1.6; color: #555555;">
                    หากคุณต้องการจองที่นั่งใหม่ สามารถทำรายการผ่านระบบได้ตลอดเวลาครับ
                </p>
                <p style="font-size: 16px; margin-bottom: 0; margin-top: 24px;">ขอบคุณที่เลือกใช้งาน <strong>ComSciSeat</strong> ครับ!</p>
            </div>
            
            <div style="background-color: #F3F2F1; padding: 15px 20px; text-align: center; border-top: 1px solid #E1DFDD;">
                <p style="margin: 0; font-size: 12px; color: #888888;">
                อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ ComSciSeat<br>กรุณาไม่ตอบกลับอีเมลนี้
                </p>
            </div>
        </div>
    `
}