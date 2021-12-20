import dotenv from 'dotenv';
import twilio from "twilio";
import {getDataFromSheetByOrderId, getDataFromSheetByPhone, getLongitudeByPincode} from './spreadsheet.js';

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
                const check = await getDataFromSheetByPhone('Logistics', receiverPhone.slice(-10), receiverPhone, 'customer_phone');
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
            const result = await getDataFromSheetByOrderId('Filled', data, receiverPhone.slice(-10), 'consignment_no');
            // console.log(result);
            if(result.status === 401 ){
                return 'Sorry, the order details of the given order ID is not available. Please make sure that you are chatting with the same number you gave in the checkout section or in the shipment section. If you want to check the order IDs of the orders you have placed, please mention query 3. '
            }
            else if(result.status === 404){
                const result2 = await getDataFromSheetByOrderId('Logistics', data, receiverPhone.slice(-10), 'customer_phone, expected_shipping_date');
                // console.log(result2);
                if(result2.dataFound){
                    return `Your order is expected to be shipped on ${result2.data.expected_shipping_date}. You’ll get a tracking ID via sms, email and WhatsApp once it ships.`;
                }
                else{
                    return `Sorry, the order details of the given order ID is not available. Please make sure that you are chatting with the same number you gave in the checkout section or in the shipment section. If you want to check the order IDs of the orders you have placed, please use query 3.`
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
            const result = await getLongitudeByPincode(data);

            if(result.dataFound) return `If you order today, your order will be delivered within ${result.longitude}. `;

            else return `If your order today, your order will be be delivered within 6-10 days`;

        }

        else if(query === '3' && isNumeric(data)){
            const result = await getDataFromSheetByPhone('Filled', data, receiverPhone, 'order_id');
            const result2 = await getDataFromSheetByPhone('Logistics', data, receiverPhone, 'order_id');
            let order_ids = [];
            if(result.status === 200) {
                result.data.forEach(dataObj => order_ids.push(dataObj.order_id));
            }
            if(result2.status === 200){
                result2.data.forEach(dataObj => order_ids.push(dataObj.order_id));
            }
            if(result.status === 401 || result2.status === 401)
                return 'Sorry, there is no order record for the given phone number. Please re-check and enter the number you have given for receiving shipment updates.\n\nIf you’re sure that you have indeed provided the correct phone number, pls mail your transaction ID and transaction screenshot with the name you entered at checkout to shirtonomics@gmail.com. We will check and get back to you in 24-48 hours.';
            
            if((result.status === 404 && result2.status === 404) || order_ids.length === 0){
                return 'Sorry, there is no order record for the given phone number. Please re-check and enter the number you have given for receiving shipment updates.\n\nIf you’re sure that you have indeed provided the correct phone number, pls mail your transaction ID and transaction screenshot with the name you entered at checkout to shirtonomics@gmail.com. We will check and get back to you in 24-48 hours.';
            }
            if(result.status === 500 || result.status === 500){
                return 'Something went wrong! Try again after sometime.';
            }
            // console.log(order_ids);
        
            let message = 'The following orders with corresponding order IDs has been successfully registered.\n\n';
            order_ids.forEach((order_id) => {
                message += (order_id + '\n');
            })
            message += '\nPlease cross-check whether the following orders are there in the orders history in www.aaramkhor.com/account. If the expected order is not present, please send a mail attached with screenshot of the transaction to shirtonomics@gmail.com';
            return message;
        
            
        }

        else if(query === '4' && (data === 't-shirt' || data ==='hoodie')){
            if(data === 't-shirt'){
                return 'Our T-Shirts are 100% pure 180 gsm biowashed preshrunk cotton. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading.'
            }
            else if(data === 'hoodie'){
                return 'Our Hoodies are 320 gsm biowashed cotton with belly pocket, hood, without zipper and with brushed fleece inside. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading.'
            }
        }

        else if(query === '5' && (data === 't-shirt' || data === 'hoodie' || data === 'crop-top')){
            if(data === 't-shirt'){
                return 'Please note that in case of exchange, you’ll have to ship the product to our address as we don’t have pickup facility with our courier. The address is\n“VKAR Ecommerce Pvt Ltd, Plot No.10, 2nd Cross Street, 1st Main Road, AG’s Office Phase Colony, Sabari Nagar Extn, Mugalivakkam, Chennai - 600125. Ph:8160451369”\nPlease enter your order ID on the parcel. Once we receive the item, we will initiate reshipment of the updated size. Max exchange qty is 1 piece. Please ship through IndiaPost. It will cost Rs.35 only. In case you have any additional queries, please e-mail with complete details to shirtonomics@gmail.com'
            }
            else if(data === 'crop-top' || data === 'hoodie'){
                return `We don’t offer a return and exchange policy for hoodie/crop top unless there’s a product defect. Please share complete proof of material/ink defect to shirtonomics@gmail.com to register a special request.`
            }
        }

        else if(query === '6' && isNumeric(data)){
            return `We can offer you a discount of Rs. ${100*(Number(data)-1)}. Please get in touch on Whatsapp on +918160451369 for additional queries!`
        }

        else if(query == '7'){
            return "https://www.aaramkhor.com/collections/design-your-own\n\nTo design your T-shirt, please click on the above link, select your product, color and size and click “Customize Now”. It will open our design tool where you can upload your image or create your design on our tool. If you face any difficulty, please ping on +918160451369. We’ll help you out to get what you exactly want!"
        }

        else if(query === '8'){
            return 'COD is currently available only on select merchandise. On the product pages of these select merchandise, you’ll find the option to go for COD. Please note that you’ll have to additional Rs.49 upfront COD handling charges that couriers charge for COD service. Also, no discount codes are applicable on COD orders.';
        }
        else{
            return 'Please enter a valid query.'
        }
    } catch(err){
        // console.log(err);
        throw err;
    }
}