import { getLongitudeByPincode } from "./src/spreadsheet.js";
(async function(){
    try{
        const long = await getLongitudeByPincode('600037');
        console.log(long);

    } catch(err){
        console.log('hi')
        console.log(err);
    }
}());