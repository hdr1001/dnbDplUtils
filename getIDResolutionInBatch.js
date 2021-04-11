// *********************************************************************
//
// Get D&B Direct+ IDentity Resolution in batch
// JavaScript code file: getIDResolutionInBatch.js
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
const lib = require('./dnbDplLib');

//Application settings
const filePathIn = {root: '', dir: 'in', base: 'idrCriteria.json'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'IDR_'; //1st part of the output file name
const sDate = new Date().toISOString().split('T')[0];

//Example input file
/*

[
   {"customerReference1": 1, "registrationNumber": "1234...", "countryISOAlpha2Code": "NL" },
   {"customerReference1": 2, "registrationNumber": "7890...", "countryISOAlpha2Code": "NL" },
   {}
]

*/

//Read & parse the IDentity Resolution search criteria
const idrCriteria = JSON.parse(fs.readFileSync(path.format(filePathIn)));

//Check if there are any valid array entries available
if(idrCriteria.length === 0) {
   console.log('No IDentity Resolution search criteria available, exiting ...');
   process.exit();
}
else {
   console.log('Test file contains ' + idrCriteria.length + ' records');
}

idrCriteria.forEach(oCriteria => {
   new lib.ReqDnbDpl({...lib.httpAttrIDR}, oCriteria).execReq('IDR request', true)
      .then(oResp => {
         //Write the the HTTP response body to a file
         const oFilePath = {...filePathOut};
         oFilePath.base = fileBase1stPt + oCriteria.customerReference1 + '_' + sDate + '.json';

         fs.writeFile(path.format(oFilePath), JSON.stringify(oResp, null, 3), err => {
            if(err) { console.log(err.message) }
         });
      })
      .catch(err => console.log(err))
});
