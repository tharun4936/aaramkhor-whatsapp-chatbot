import dotenv from 'dotenv';
import twilio from "twilio";
import {getDataFromSheetByOrderId, getDataFromSheetByPhone} from './spreadsheet.js';

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

const isNumeric = (string => !isNaN(string));

export const generateQueryReplies = async function(queryString, receiverPhone){
    try{
        let query;
        let data;
        // console.log(queryString);
        if(queryString.includes(':')){
            queryString = queryString.split(':').map(el=>el.trim())
            query = queryString[0];
            data = queryString[1];
        }
        else{
            query = queryString.trim();
            data = false;
        }
        if(query.toLowerCase() === 'query' || query.toLowerCase() === 'hi'){
            return `Thanks for getting in touch. FAQ:\n\n1) Track my order - pls type "1:" and your order number. Eg -"1:9716"\n2) "I want to place an order, but I want to know how long it will take to get delivered" -  Pls type "2:"followed by your pincode. E.g. - "2:400067"\n3) "I have made a succesful payment, but I don't have any order details" - Pls type "3:" followed by the number you have given at checkout.\n4) I want to know about quality of Product - Pls type "4:" followed by the product.Eg: "4:t-shirt" or "4:hoodie" \n5) I want to know about return & exchange policy: Pls type "5:" followed by product. Eg: "5:t-shirt" or "5:crop-top" \n6) I want buy T-Shirts in Bulk - what discount will i get? - Pls type "6: followed by the QTY of tshirts you're looking to buy. Eg: "6:10"\n7) *I want to customize my design * - pls type 7\n8) i want to buy on COD, but it’s not available - pls type 8 followed by product. Eg. “8: physics T-shirt"\n\nIf you have any other queries, ping this number\n+917573075762`
        }
        else if(query.toLowerCase() === 'order status'){
            const result = await getDataFromSheetByPhone('Filled', receiverPhone.slice(-10), receiverPhone, 'order_id');
            if(result.status === 401){
                return `Sorry, the order status is not available. Please make sure that you are chatting with the same number you gave in the checkout section or in the shipment section. If you want to check the order IDs of the orders you have placed, please mention query 3.`;
            }
            else if(result.status === 404){
                const check = await getDataFromSheetByPhone('Not Filled', receiverPhone.slice(-10), receiverPhone, 'customer_phone');
                // console.log(check);
                if(check.dataFound){
                    return `Currently none of your orders has not been processed yet. We'll send you an email/sms notification when we get your order ready for shipment.`;
                }
                else{
                    return `Sorry, the order status is not available. Please make sure that you are chatting with the same number you gave in the checkout section or in the shipment section. If you want to check the order IDs of the orders you have placed, please mention query 3.`;
                }
            }
            else if(result.status === 500){
                return `Something went wrong:(...we'll get back to you later`;;
            }
            else{
                let order_ids = "";
                result.data.forEach(dataObj => order_ids += (' ' + dataObj.order_id))
                return `The following orders with corresponding order IDs has been processed and shipped:\n\n${order_ids}\n\nMention your order ID with query 1 to know tracking number. You can track your order by entering the tracking number or consignment number into the official IndiaPost portal (www.indiapost.gov.in)`;
            }
        }
        else if(query === '1' && isNumeric(data) ){
            const result = await getDataFromSheetByOrderId('Filled', data, receiverPhone, 'consignment_no');
            // console.log(result);
            if(result.status === 401 ){
                return 'Sorry, the order details of the given order ID is not available. Please make sure that you are chatting with the same number you gave in the checkout section or in the shipment section. If you want to check the order IDs of the orders you have placed, please mention query 3. '
            }
            else if(result.status === 404){
                const check = await getDataFromSheetByOrderId('Not Filled', data, receiverPhone, 'customer_phone');
                // console.log(check);
                if(check.dataFound){
                    return `Your order has not been processed yet. We'll send you an email/sms notification when we get your order ready for shipment.`;
                }
                else{
                    return `Sorry, the order details of the given order ID is not available. Please make sure that you are chatting with the same number you gave in the checkout section or in the shipment section. If you want to check the order IDs of the orders you have placed, please mention query 3.`
                }
            }
            else if(result.status === 500){
                return `Something went wrong:(...we'll get back to you later`;
            }
            else{
                // console.log(result)
                return `Your order has been shipped. You can track your order by entering the consignment no. ${result.data.consignment_no} into the IndiaPost portal (www.indiapost.gov.in).`
            }
        }
        else if(query === '2' && isNumeric(data)){
            return 'Your order will be delivered within 5-7 business days.'
        }
        else if(query === '3' && isNumeric(data)){
            const result = await getDataFromSheetByPhone('Not Filled',data, receiverPhone, 'order_id');
            if(result.status === 401){
                return 'Sorry, the order details for the given phone number is not available. Please enter the number you have given for receiving shipment updates.';
            }
            else if(result.status === 404){
                return 'Sorry, the order has not been registered. Try to order the item again. If payment is made, please send the screenshot of the transaction to +917573075762.'  
            }
            else if(result.status === 500){
                return `Something went wrong...we'll get back to you later:(`;;
            }
            else{
                let order_ids = "";
                result.data.forEach(dataObj=>{
                    order_ids+= (' ' + dataObj.order_id);
                });
                return `The following orders with corresponding order IDs has been registered but not ready for shipment yet:\n\n${order_ids}\n\nPlease cross-check whether the following orders are there in the orders history in www.aaramkhor.com/account. If the expected order is not present, please ping to this number with the screenshot of the transaction.\n+917573075762`;
            }
        }
        else if(query === '4' && (data === 't-shirt' || data ==='hoodie')){
            if(data === 't-shirt'){
                return 'Our T-Shirts are 100% pure 180 gsm biowashed preshrunk cotton. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading.'
            }
            else if(data === 'hoodie'){
                return 'Our Hoodies are 320 gsm biowashed cotton with belly pocket, hood, without zipper and with brushed fleece inside. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading.'
            }
            else{

            }
        }
        else if(query === '5' && (data === 't-shirt' || data === 'hoodie' || data === 'crop-top')){
            if(data === 't-shirt'){
                return 'Please note that in case of exchange, you’ll have to ship the product to our address as we don’t have pickup facility with our courier. The address is\n“VKAR Ecommerce Pvt Ltd, Plot No.10, 2nd Cross Street, 1st Main Road, AG’s Office Phase Colony, Sabari Nagar Extn, Mugalivakkam, Chennai - 600125. Ph:8160451369”\nPlease enter your order ID on the parcel. Once we receive the item, we will initiate reshipment of the updated size. Max exchange qty is 1 piece. Please ship through India Post. It will cost Rs.35 only.'
            }
            else if(data === 'crop-top' || data === 'hoodie'){
                return `We don’t offer a return and exchange policy for hoodie/crop top unless there’s a product defect. Please share complete proof of material/ink defect to register a return request.`
            }
        }
        else if(query === '6' && isNumeric(data)){
            return `We can offer you a discount of Rs ${100*(Number(data)-1)}. Please get in touch for additional queries!`
        }
        else if(query == '7'){
            return "https://www.aaramkhor.com/collections/design-your-own\n\nTo design your T-shirt, please click on the above link, select your product, color and size and click “Customize Now”. It will open our design tool when you can upload your image or create your design on our tool. If you face any difficulty, please ping here...we’ll help you out to get what you exactly want!"
        }
        else if(query === '8'){
            return 'COD is currently available only on select merchandise and in certain locations. Our executive will get in touch with you shortly on this.'
        }
        else{
            return 'Enter a valid query.'
        }
    } catch(err){
        // console.log(err);
        throw err;
    }
}