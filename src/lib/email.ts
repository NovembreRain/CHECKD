// src/lib/email.ts

export async function sendBookingNotification(
    toEmail: string, 
    type: 'REQUEST_RECEIVED' | 'BOOKING_APPROVED' | 'BOOKING_DENIED', 
    details: any
  ) {
    // In production, replace this with Resend/SendGrid/AWS SES
    console.log(`📧 [EMAIL MOCK] To: ${toEmail} | Type: ${type}`);
    console.log(`📝 Content:`, JSON.stringify(details, null, 2));
    return true;
  }