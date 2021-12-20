import { getDataFromSheetByOrderId, getLongitudeByPincode } from "./src/spreadsheet.js";
import {generateQueryReplies} from './src/whatsapp.js'
(async function(){
    try{
        // sheetName, order_id , receiverPhone, rowData = 'all'
       const reply = await generateQueryReplies('1:13502','9849779151');
        console.log(reply);
        // const result = await getDataFromSheetByOrderId('Logistics', '13631', '8825549639', 'consignment_no');
        // console.log(result);
    } catch(err){
        console.log(err);
    }
}());

