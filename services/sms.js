export const sendSMS = async (tel, message) => {
  console.log('Sending SMS to', tel, 'with message:', message)
  if (process.env.NODE_ENV === 'test') {
    throw new Error('SMS service is not available in test mode')
  } else {
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('SMS sent to', tel, 'with message:', message)
  }
}
