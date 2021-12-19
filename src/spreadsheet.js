import dotenv from 'dotenv';
import e from 'express';
import { GoogleSpreadsheet } from 'google-spreadsheet';

dotenv.config();

const {SPREADSHEET_ID, GOOGLE_PRIVATE_KEY, GOOGLE_SERVICE_ACCOUNT_EMAIL} = process.env

const googleSpreadsheetInit = async function () {
    try {
        const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        });
        await doc.loadInfo();
        return doc;
    } catch (err) {
        throw err;
    }
}

const loadSheetData = async function(sheetName){
    try{
        const doc = await googleSpreadsheetInit();
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle[sheetName];
        if(!sheet) throw new Error('Specified sheet not found!');
        return await sheet.getRows();
    } catch(err){
        throw {error:err.message, dataFound:false, status:500}
    }
}

export const getDataFromSheetByOrderId = async function (sheetName, order_id , receiverPhone, rowData = 'all') {
    try {

        const rows = await loadSheetData(sheetName);
        let data = rows.map(rowObj => {
                return {
                    order_id: rowObj.Order_Number,
                    order: rowObj.Order.split(' ~ ').map(orderq => orderq.trim()),
                    order_quantity: rowObj.Order_Quantity.split(' ~ ').map(orderq => orderq.trim()),
                    customer_name: rowObj.Customer_Name,
                    customer_phone: rowObj.Customer_Phone,
                    customer_email: rowObj.Customer_Email,
                    consignment_no: rowObj.Tracking_Number,
                    created_at: rowObj.Created_At,
                    tracking_link: rowObj.Tracking_Link
                }
        }).find(rowObj => rowObj.order_id === order_id)
        if(!data){
            throw {error: 'Data not found!', dataFound: false, status:404}
        }
        if(data.customer_phone !== receiverPhone.slice(-10)){
            throw {error: 'Not authorized!', authorized:false, dataFound:false, status:401}
        }
        if (rowData !== 'all'){
            const obj = {};
            rowData.split(',').map(neededData => neededData.trim()).forEach(neededData => {
                obj[neededData] = data[neededData];
            })
            data = obj;
        }
        return {data, authorized: true, dataFound:true, status:200};
    } catch (err) {
        // console.log(err)
        return err;
    }
}

export const getDataFromSheetByPhone = async function(sheetName, phone, receiverPhone, rowData='all'){
    try{
        if(receiverPhone.slice(-10) !== phone){
            throw {error:'Not authorized!', authorized: false, dataFound:false, status:401}
        }
        const rows = await loadSheetData(sheetName);
        let data = rows.map(rowObj => {
                return {
                order_id: rowObj.Order_Number,
                order: rowObj.Order.split(' ~ ').map(orderq => orderq.trim()),
                order_quantity: rowObj.Order_Quantity.split(' ~ ').map(orderq => orderq.trim()),
                customer_name: rowObj.Customer_Name,
                customer_phone: rowObj.Customer_Phone,
                customer_email: rowObj.Customer_Email,
                consignment_no: rowObj.Tracking_Number,
                created_at: rowObj.Created_At,
                tracking_link: rowObj.Tracking_Link
            }
        }).filter(rowObj => rowObj.customer_phone === phone);
        if(!data || data.length === 0){
            throw {error:'Data not found!', dataFound:false, status:404};
        }
        if(rowData !== 'all') {
            rowData = rowData.split(',').map(neededData => neededData.trim());
            // console.log(rowData);
            data = data.map(rowObj => {
                    const obj = {};
                    rowData.forEach(neededData => {
                        obj[neededData] = rowObj[neededData];
                    })
                    return obj; 
                });
        }
        return {data, authorized: true, dataFound:true, status:200};
    
    } catch(err) {
        // console.log(err);
        return err;

    }
}

export const getLongitudeByPincode = async function(pincode){
    try{
        const rows = await loadSheetData('Pincodes');
        let data = rows.map(rowObj => {
            return {
                pincode:rowObj.Pincode,
                longitude: rowObj.Longitude
            }
        })
        const longitude = data.find(obj => obj.pincode === pincode).longitude;
        console.log(longitude);
        if(longitude) return longitude;
        else return false;
    }
    catch(err){
        throw err;
    }
}