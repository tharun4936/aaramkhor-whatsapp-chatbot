import express from "express";
import {sendWhatsappSessionMessage, sendWhatsappShipmentTemplateMsg, generateQueryReplies} from './whatsapp.js'
import chalk from "chalk";

const queryBot = express();
const port = process.env.PORT || 3000;

queryBot.use(express.json());
queryBot.use(express.urlencoded({ extended: true }));

queryBot.post('/whatsapp/incoming', async function (req, res) {
    try {
        const data = req.body;
        const receiverPhone = req.body.From.slice(-13);
        const receivedMessage = data.Body;
        const sessionMessage = await generateQueryReplies(receivedMessage, receiverPhone);
        const messageResult = await sendWhatsappSessionMessage(sessionMessage, receiverPhone);
        // console.log(messageResult);
        res.status(200).send();
    } catch (err) {
        console.log(err);
        res.status(400).send();
    }


})

queryBot.post('/whatsapp/fallback/incoming', async function (req, res) {
    try {
        const data = req.body;
        const receiverPhone = req.body.From.slice(-13);
        const receivedMessage = data.Body;
        const sessionMessage = await generateQueryReplies(receivedMessage, receiverPhone);
        const messageResult = await sendWhatsappSessionMessage(sessionMessage, receiverPhone);
        console.log(messageResult);
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
    console.log('Server is up at port '+ port);
})

queryBot.use(function(req,res,next){
    res.status(404).send('Error 404. Page not found!');
})