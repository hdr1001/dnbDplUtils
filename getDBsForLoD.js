// *********************************************************************
//
// Get D&B Direct+ Data Blocks for a list of DUNS
// JavaScript code file: getDBsForLoD.js
//
// Copyright 2021 Hans de Rooij
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the
// License.
//
// *********************************************************************

//External packages
const fs = require('fs');
const https = require('https');
const qryStr = require('querystring');
const path = require('path');
//More on limiter; https://www.npmjs.com/package/limiter
const RateLimiter = require('limiter').RateLimiter;

//Application settings
const maxTPS = 4; //Maximum transactions per second
const fileCredentials = 'dnbDplCredentials.json';
const blockIDs = 'companyinfo_L2_v1,principalscontacts_L3_v1';
const tradeUp = ''; //Set to hq if trade-up is needed
const filePathIn = {root: '', dir: 'in', base: 'DUNS.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'dnb_dpl_ci_l2_pc_l3_'; //1st part of the output file name
const sDate = new Date().toISOString().split('T')[0];

//Get a (hopefully) valid API token from file dnbDplCredentials.json
const oCredentials = JSON.parse(fs.readFileSync(fileCredentials));

if(oCredentials && oCredentials.token) {
   console.log('Token available but please note that it can be expired!')
}
else {
   console.log('Please generate a valid token, exiting ...');
   process.exit();
}

//Read & parse the DUNS to retrieve from the file DUNS.txt
let arrDUNS = fs.readFileSync(path.format(filePathIn)).toString().split('\n');
arrDUNS = arrDUNS.filter(sDUNS => !!sDUNS); //Remove empty values from the array
arrDUNS = arrDUNS.map(sDUNS => sDUNS.trim()); //Remove any unwanted whitespace

//Check if there are any valid array entries available
if(arrDUNS.length === 0) {
   console.log('No valid DUNS available, exiting ...');
   process.exit();
}
else {
   console.log('Test file contains ' + arrDUNS.length + ' DUNS records');
}

//Loop over the array of DUNS at maximum TPS
const limiter = new RateLimiter(maxTPS, 'second');

arrDUNS.forEach(DUNS => {
   limiter.removeTokens(1, () => {
      reqDnbDplDBs(DUNS).then(respBody => {
         //Write the the HTTP response body to a file
         if(filePathOut) {
            const oFilePath = {...filePathOut};
            oFilePath.base = fileBase1stPt + DUNS + '_' + sDate + '.json';

            fs.writeFile(path.format(oFilePath), respBody, err => {
               if(err) {console.log(err.message)}
            });
         }

         //Parse the HTTP response body and echo the DUNS returned
         //let oDBs = JSON.parse(respBody.join(''));
         //console.log('Retrieved DUNS ' + oDBs.organization.duns);
      })
      .catch(err => console.log(err))
   })
});

//Launch an API request for D&B Direct+ Data blocks
function reqDnbDplDBs(DUNS) {
   const httpAttr = {
      host: 'plus.dnb.com',
      path: '/v1/data/duns/' + DUNS,
      method: 'GET',
      headers: {
         'Content-Type': 'application/json',
         Authorization: 'Bearer ' + oCredentials.token
      }
   };

   const oQryStr = {blockIDs: blockIDs};
   if(tradeUp) {oQryStr.tradeUp = tradeUp}
   httpAttr.path += '?' + qryStr.stringify(oQryStr);

   return new Promise((resolve, reject) => {
      https.request(httpAttr, resp => {
         const body = [];

         resp.on('error', err => reject(err));

         resp.on('data', chunk => body.push(chunk));

         resp.on('end', () => { //The data product is now available in full
            console.log('Request for DUNS ' + DUNS + ' returned status code ' + resp.statusCode);
            resolve(body);
         });
      }).end()
   });
}
