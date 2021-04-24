// *********************************************************************
//
// Use the D&B DUNS to get the Legal Entity Identifier in batch
// JavaScript code file: getLeiInBatch.js
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
const path = require('path');
const https = require('https');
const qryStr = require('querystring');
const lib = require('./dnbDplLib');

//Application settings
const filePathIn = {root: '', dir: 'in', base: 'DUNS.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'LEI_'; //1st part of the output file name
const sDate = new Date().toISOString().split('T')[0];

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrDUNS = lib.readDunsFile(filePathIn);

//Check if there are any valid array entries available
if(arrDUNS.length === 0) {
   console.log('No valid DUNS on input file, exiting ...');
   process.exit();
}
else {
   console.log('Test file contains ' + arrDUNS.length + ' DUNS records');
}

arrDUNS.forEach(DUNS => {
   const qryStr = { blockIDs: 'companyinfo_L1_v1', tradeUp: 'hq' };

   new lib.ReqDnbDpl(lib.httpBlocks, [DUNS], qryStr).execReq('Request for DUNS', true)
      .then(oResp => {
         let sOut = 'DUNS ' + DUNS.substr(0, 4).concat(' 🕵️.🕵️.🕵️  ');
         let org = oResp.organization;

         if(org && org.registrationNumbers && org.registrationNumbers.length) {
            const arrRegNumKvK = org.registrationNumbers.filter(regNum => regNum.typeDnBCode === 6256);

            if(arrRegNumKvK.length) {
               leiQryStr = {
                  'page[size]': 10,
                  'page[number]': 1,
                  'filter[entity.legalAddress.country]': 'nl',
                  'filter[entity.registeredAs]': arrRegNumKvK[0].registrationNumber
               };

               sOut += '-> KvK ' + arrRegNumKvK[0].registrationNumber.substr(0, 3).concat(' 🕵️.🕵️.🕵️  ');
               
               new ReqLeiRec(leiQryStr).execReq('', true)
                  .then(oLeiRec => {
                     try {
                        console.log(sOut + '-> LEI 🕵️.🕵️.🕵️ ' + oLeiRec.data[0].attributes.lei.substr(10))
                     }
                     catch(err) {
                        console.log(sOut + '-> NA')
                     }
                  })
                  .catch(err => console.log(err));
            }
            else {
               console.log('Unable to establish a valid registration number');
            }
         }
         else {
            console.log('Unable to establish a registration number');
         }
      })
      .catch(err => console.log(err))

/*
         let natID = oCriteria.registrationNumber;
         let org0 = oResp.matchCandidates[0] && oResp.matchCandidates[0].organization;

         if(org0) {
            console.log('KvK ' + natID.substr(0, 3).concat(' 🕵️.🕵️.🕵️ ') + ' -> ' + 
                  org0.duns.substr(0, 4).concat(' 🕵️.🕵️.🕵️ ') + ' (' + org0.primaryName + ')')
         }

         
         //Write the the HTTP response body to a file
         const oFilePath = {...filePathOut};
         oFilePath.base = fileBase1stPt + oCriteria.customerReference1 + '_' + sDate + '.json';

         fs.writeFile(path.format(oFilePath), JSON.stringify(oResp, null, 3), err => {
            if(err) { console.log(err.message) }
         });
      }) */
});

//Object constructor for LEI request
function ReqLeiRec(oQryStr) {
   this.httpAttr = {
      host: 'api.gleif.org',
      path: '/api/v1/lei-records',
      method: 'GET',
      headers: {
         'Accept': 'application/vnd.api+json'
      }
   }

   if(oQryStr) {this.httpAttr.path += '?' + qryStr.stringify(oQryStr)}
}

//Execute the HTTP request on the LEI record request object
ReqLeiRec.prototype.execReq = function(reqMsgOnEnd, bRetObj) {
   //The actual HTTP request wrapped in a promise
   return new Promise((resolve, reject) => {
      https.request(this.httpAttr, resp => {
         const body = [];

         resp.on('error', err => reject(err));

         resp.on('data', chunk => body.push(chunk));

         resp.on('end', () => { //The LEI record is now available in full
            if(reqMsgOnEnd) { 
               console.log(reqMsgOnEnd + ' (HTTP status code ' + resp.statusCode + ')');

               //if(resp.statusCode !== 200) { console.log(body.join('')) }
            }

            if(bRetObj) {
               try {
                  resolve(JSON.parse(body.join('')));
               }
               catch(err) { reject(err) }
            }
            else {
               resolve(body);
            }
         });
      }).end();
   })
}
