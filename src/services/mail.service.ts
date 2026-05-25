import { Resend } from 'resend'
import { cancelationTemplate, reservationTemplate } from '../lib/shared/utils/mail.js'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendReservationConfirmationEmail(
  userInfo: any,
  labInfo: any,
  tableCode: string,
  booking: any
) {
  try {
    const { error } = await resend.emails.send({
      from: `ComSciSeat <${process.env.RESEND_FROM_EMAIL}>`,
      to: `${userInfo?.email}`,
      subject: 'Booking Confirmation',
      html: reservationTemplate(userInfo, labInfo, tableCode, booking)
    })

    if (error) {
      console.error('Failed to send confirmation email:', error)
    }
  } catch (error) {
    console.error('Failed to send confirmation email:', error)
  }
}

export async function sendReservationCancellationEmail(userInfo: any, booking: any) {
  try {
    const { error } = await resend.emails.send({
      from: `ComSciSeat <${process.env.RESEND_FROM_EMAIL}>`,
      to: `${userInfo?.email}`,
      subject: 'Booking Cancellation',
      html: cancelationTemplate(userInfo, booking)
    })

    if (error) {
      console.error('Failed to send cancellation email:', error)
    }
  } catch (error) {
    console.error('Failed to send cancellation email:', error)
  }
}
