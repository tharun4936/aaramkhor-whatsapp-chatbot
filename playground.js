import { getLongitudeByPincode } from "./src/spreadsheet.js";
(async function(){
    try{
        const long = await getLongitudeByPincode('999999');
        if(long.dataFound) console.log(long.longitude)
        else console.log('Invalid pincode');

    } catch(err){
        console.log('hi')
        console.log(err.message);
    }
}());