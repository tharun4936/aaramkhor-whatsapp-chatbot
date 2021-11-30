import dotenv from 'dotenv';
import twilio from 'twilio';

dotenv.config();

const {TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SENDER_PHONE_NUMBER} = process.env;

export const sendWhatsappShipmentTemplateMsg = async function (order) {
    try {
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const result = await client.messages.create({
            from: `whatsapp:${TWILIO_SENDER_PHONE_NUMBER}`,
            body: `Your order (Order ID ${order.order_id}) has been shipped via ${order.service} with the consignment no. ${order.consignment_no}. You can track the order on ${order.service_url}. In case of any issues with delivery please mail with your order ID to ${order.feedback_email} . If you have any other queries, type or hit 'Query' in the chat.  `,
            to: `whatsapp:+91${order.customer_phone}`
        })
        return result;
    } catch (err) {
        throw err;
    }
}

export const sendWhatsappSessionMessage = async function (message, receiver) {
    try {
        const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
        const result = await client.messages.create({
            from: `whatsapp:${TWILIO_SENDER_PHONE_NUMBER}`,
            body: `${message}`,
            to: `whatsapp:${receiver}`
        })
        return result;
    } catch (err) {
        throw err;
    }
}