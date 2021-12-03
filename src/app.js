import express from "express";
import { sendWhatsappSessionMessage, sendWhatsappShipmentTemplateMsg } from "../helpers.js";
import chalk from "chalk";
import axios from "axios";

const queryBot = express();
const port = process.env.PORT || 3000;

queryBot.use(express.json());
queryBot.use(express.urlencoded({ extended: true }));

queryBot.post('/whatsapp/incoming', async function (req, res) {
    try {
        // const doc = await googleSpreadsheetInit();
        // console.log(req.body);
        const data = req.body;
        // console.log(data);
        // const receiverPhone = data.From.split(':')[1].slice(-10);
        const receiverPhone = req.body.From.slice(-13);
        const receivedMessage = data.Body;
        // console.log(typeof receivedMessage);
        let sessionMessage;
        // console.log(receivedMessage);
        if(receivedMessage === 'Query' || receivedMessage === 'Hi' || receivedMessage === 'hi'){
            sessionMessage = `Thanks for getting in touch. FAQ:\n\n1) Track my order - pls type "1:" and your order number. Eg -"1:9716"\n2) "I want to place an order, but I want to know how long it will take to get delivered" -  Pls type "2:"followed by your pincode. E.g. - "2:400067"\n3) "I have made a succesful payment, but I don't have any order details" - Pls type "3:" followed by the name you entered at checkout. Also, pls share the screenshot of the payment transaction reference.\n4) I want to know about quality of Product - Pls type "4:" followed by the product.Eg: "4:t-shirt" or "4:hoodie" \n5) I want to know about return & exchange policy: Pls type "5:" followed by product. Eg: "5:t-shirt" or "5:crop-top" \n6) I want buy T-Shirts in Bulk - what discount will i get? - Pls type "6: followed by the QTY of tshirts you're looking to buy. Eg: "6:10"\n7) *I want to customize my design * - pls type 7\n8) i want to buy on COD, but it’s not available - pls type 8 followed by product. Eg. “8: physics T-shirt”`
        }
        else if(receivedMessage === 'Order Status'){
            sessionMessage = `You can track your order by entering the tracking number or consignment number given into the official IndiaPost portal (www.indiapost.gov.in)`;
        }
        else if(receivedMessage == '7'){
            sessionMessage = "https://www.aaramkhor.com/collections/design-your-own\n\nTo design your T-shirt, please click on the above link, select your product, color and size and click “Customize Now”. It will open our design tool when you can upload your image or create your design on our tool. If you face any difficulty, please ping here...we’ll help you out to get what you exactly want!"
        }
 
        else if(receivedMessage.includes(':')){
            const queryArr = receivedMessage.split(':').map(query=> query.trim());
            if(queryArr[0]==='6'){
                sessionMessage = `We can offer you a discount of Rs ${100*(Number(queryArr[1])-1)}. Please get in touch for additional queries!`;
            }
            else if(queryArr[0]==="1"){
                const result = await axios.get("http://127.0.0.1:3002/chatbot/findorderbyorderid",{
                    params:{
                        order_id:queryArr[1],
                        neededData:'all',
                        search_in:'Filled',
                        receiverPhone
                    }
                })
                console.log(result.data.status);
                if(result.data.status === 'Data not found!'){
                    sessionMessage = "Your order has not been processed yet. We'll send you an email/sms notification when we get your order ready for shipment."
                }
                else{
                    const data  = result.data.data;
                    console.log(data);
                    sessionMessage = `Your order has been shipped. You can track your order by entering the consignment no. ${data.consignment_no} into the IndiaPost portal (www.indiapost.gov.in).`;
                }

            }
            else if(queryArr[0]==='3'){
                const result = await axios.get("http://127.0.0.1:3002/chatbot/findorderbyphone",{
                    params:{
                        customer_phone:queryArr[1],
                        neededData:'order_id',
                        search_in:'Not Filled',
                        receiverPhone
                    }
                });
                // console.log(result.data.error);
                if(result.data.error){
                    sessionMessage = 'It seems that the order has not been registered. There might have been some problem while ordering. Try ordering the item again.'
                }
                else{
                    const data = result.data.data;
                    console.log(data);
                    let order_ids = "";
                    data.forEach(order=>{order_ids += (' ' + order.order_id)});
                    sessionMessage = `The following orders with corresponding order IDs has been registered:\n\n${order_ids}\n\nPlease cross-check whether the following orders are there in the orders history in aaramkhor.com`
                }
                

                

            }
            else if(queryArr[0]==='8'){
                sessionMessage = 'COD is currently available only on select merchandise and in certain locations. Our executive will get in touch with you shortly on this.'
            }
            else if(queryArr[0]==='4'){
                if(queryArr[1]==='t-shirt'){
                    sessionMessage = 'Our T-Shirts are 100% pure 180 gsm biowashed preshrunk cotton. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading.'
                }
                else if(queryArr[1]==='hoodie'){
                    sessionMessage = "Our Hoodies are 320 gsm biowashed cotton with belly pocket, hood, without zipper and with 	brushed fleece inside. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading."
                }
            }
            else if(queryArr[0]==='5'){
                if(queryArr[1]==='t-shirt'){
                    sessionMessage = `Please note that in case of exchange, you’ll have to ship the product to our address as we don’t have pickup facility with our courier. The address is\n“VKAR Ecommerce Pvt Ltd, Plot No.10, 2nd Cross Street, 1st Main Road, AG’s Office Phase Colony, Sabari Nagar Extn, Mugalivakkam, Chennai - 600125. Ph:8160451369”\nPlease enter your order ID on the parcel. Once we receive the item, we will initiate reshipment of the updated size. Max exchange qty is 1 piece. Please ship through India Post. It will cost Rs.35 only.`
                }
                else if(queryArr[1]==='hoodie' || queryArr[1]==='crop-top'){
                    sessionMessage = `We don’t offer a return and exchange policy for hoodie/crop top unless there’s a product defect. Please share complete proof of material/ink defect to register a return request.`
                }
            }
        }
        else {
            sessionMessage = `Enter a valid Query!`
        }
        // const sender = '+14155238886';
        // const reciever = req.body.From.slice(-13);
        // const sessionMessage = 'Your message has been recieved! \nThank you for responding! \n- From node chatbot';
        // // rowData =  order_id,order,order_quantity,customer_name,customer_phone,customer_email,consignment_no,created_at,tracking_link
        // const result = await getDataFromSheet(doc, '13361');
        const messageResult= await sendWhatsappSessionMessage(sessionMessage, receiverPhone);
        // console.log(messageResult);
        res.status(200).send();
    } catch (err) {
        console.log(err.message);
        res.status(400).send();
    }


})

queryBot.post('/whatsapp/fallback/incoming', async function (req, res) {
    try {
        // const doc = await googleSpreadsheetInit();
        // console.log(req.body);
        const data = req.body;
        // console.log(data);
        const receivedMessage = data.Body;
        // console.log(typeof receivedMessage);
        let sessionMessage;
        // console.log(receivedMessage);
        if(receivedMessage === 'Query'){
            sessionMessage = `Thanks for getting in touch. FAQ:\n\n1) Track my order - pls type "1:" and your order number. Eg -"1:9716"\n2) "I want to place an order, but I want to know how long it will take to get delivered" -  Pls type "2:"followed by your pincode. E.g. - "2:400067"\n3) "I have made a succesful payment, but I don't have any order details" - Pls type "3:" followed by the name you entered at checkout. Also, pls share the screenshot of the payment transaction reference.\n4) I want to know about quality of Product - Pls type "4:" followed by the product.Eg: "4:Tshirt" or "4:Hoodie"\n5) I want to know about return&exchange policy: Pls type "5:" followed by product. Eg: "5:Tshirt" or "5:Crop top"\n6) I want buy T-Shirts in Bulk - what discount will i get? - Pls type "6: followed by the QTY of tshirts you're looking to buy. Eg: "6:10"\n7) *I want to customize my design * - pls type 7\n8) i want to buy on COD, but it’s not available - pls type 8 followed by product. Eg. “8: physics T-shirt”`
        }
        else if(receivedMessage === 'Order Status'){
            sessionMessage = `You can track your order by entering the tracking number or consignment number given into the official IndiaPost portal (www.indiapost.gov.in)`;
        }
        else if(receivedMessage == '7'){
            sessionMessage = "https://www.aaramkhor.com/collections/design-your-own\nTo design your T-shirt, please click on the above link, select your product, color and size and click “Customize Now”. It will open our design tool when you can upload your image or create your design on our tool. If you face any difficulty, please ping here...we’ll help you out to get what you exactly want!"
        }
 
        else if(receivedMessage.includes(':')){
            const queryArr = receivedMessage.split(':').map(query=> query.trim());
            if(queryArr[0]==='6'){
                sessionMessage = `We can offer you a discount of Rs ${100*(Number(queryArr[1])-1)}. Please get in touch for additional queries!`;
            }
            else if(queryArr[0]==='8'){
                sessionMessage = 'COD is currently available only on select merchandise and in certain locations. Our executive will get in touch with you shortly on this.'
            }
            else if(queryArr[0]==='4'){
                if(queryArr[1]==='t-shirt'){
                    sessionMessage = 'Our T-Shirts are 100% pure 180 gsm biowashed preshrunk cotton. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading.'
                }
                else if(queryArr[1]==='hoodie'){
                    sessionMessage = "Our Hoodies are 320 gsm biowashed cotton with belly pocket, hood, without zipper and with 	brushed fleece inside. Our prints are eco-friendly digital water-based inks that are color-vibrant and antifading."
                }
            }
            else if(queryArr[0]==='5'){
                if(queryArr[1]==='t-shirt'){
                    sessionMessage = `Please note that in case of exchange, you’ll have to ship the product to our address as we don’t have pickup facility with our courier. The address is\n“VKAR Ecommerce Pvt Ltd, Plot No.10, 2nd Cross Street, 1st Main Road, AG’s Office Phase Colony, Sabari Nagar Extn, Mugalivakkam, Chennai - 600125. Ph:8160451369”\nPlease enter your order ID on the parcel. Once we receive the item, we will initiate reshipment of the updated size. Max exchange qty is 1 piece. Please ship through India Post. It will cost Rs.35 only.`
                }
                else if(queryArr[1]==='hoodie' || queryArr[1]==='crop-top'){
                    sessionMessage = `We don’t offer a return and exchange policy for hoodie/crop top unless there’s a product defect. Please share complete proof of material/ink defect to register a return request.`
                }
            }
        }
        else {
            sessionMessage = `Enter a valid Query!`
        }
        const receiverPhone = req.body.From.slice(-13);
        // const sender = '+14155238886';
        // const reciever = req.body.From.slice(-13);
        // const sessionMessage = 'Your message has been recieved! \nThank you for responding! \n- From node chatbot';
        // // rowData =  order_id,order,order_quantity,customer_name,customer_phone,customer_email,consignment_no,created_at,tracking_link
        // const result = await getDataFromSheet(doc, '13361');
        const messageResult= await sendWhatsappSessionMessage(sessionMessage, receiverPhone);
        // console.log(messageResult);
        res.status(200).send();
    } catch (err) {
        console.log(err);
        res.status(400).send();
    }

})

queryBot.post('/whatsapp/status', async function (req, res) {
    try {
        if (req.body.SmsStatus === 'sent') {
            const data = req.body;
            const phone = data.To.split(':')[1].slice(-10);
            const status = data.MessageStatus;
            console.log('WHATSAPP STATUS\n---------------\n');
            console.log(chalk`${phone} ------ {green ${status}}`);
            // console.log(req.body);
        }
        res.status(200).send();
    }
    catch (err) {
        console.log(err);
    }
})

queryBot.post('/whatsapp/fallback/status',function(req,res){
    try {
        if (req.body.SmsStatus === 'sent') {
            const data = req.body;
            const phone = data.To.split(':')[1].slice(-10);
            const status = data.MessageStatus;
            console.log('WHATSAPP STATUS\n---------------\n');
            console.log(chalk`${phone} ------ {green ${status}}`);
            // console.log(req.body);
        }
        res.status(200).send();
    }
    catch (err) {
        console.log(err);
    }
})

queryBot.post('/whatsapp/sendwhatsapp', async function (req, res) {
    try {
        // const doc = await googleSpreadsheetInit();
        const data = req.body.data;
        console.log(data);
        let result;
        for (let i = 0; i < data.length; i++) {
            result = await sendWhatsappShipmentTemplateMsg({
                order_id: data[i].order_id,
                consignment_no: data[i].consignment_no,
                customer_phone: data[i].customer_phone,
                created_at: data[i].created_at,
                service: 'IndiaPost',
                service_url: 'www.indiapost.gov.in',
                feedback_email: 'shirtonomics@gmail.com'
            })
            if (result.status === 'queued') {
                // console.log(chalk`{yellow ${data[i].order_id}} ------ ${data[i].customer_phone} ------ {green ${data[i].message}}`)
                data[i].whatsapp_status = 'Sent';
                // populateWhatsappStatusSheet(doc, data);
            }
        }
        res.status(200).send("This is whatsapp message-sending endpoint.");
        console.log(result);
    } catch (err) {
        console.log(err);
        res.status(400).send();
    }
})

queryBot.listen(port,function(){
    console.log('Server is up at port '+port);
})

queryBot.use(function(req,res,next){
    res.status(404).send('Error 404. Page not found!');
})