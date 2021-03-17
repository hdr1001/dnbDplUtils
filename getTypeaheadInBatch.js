// *********************************************************************
//
// Get D&B Direct+ Typeahead match candidates in batch
// JavaScript code file: getTypeaheadInBatch.js
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
const filePathIn = {root: '', dir: 'in', base: 'MatchCriteria.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'typeahead_results_len30_';
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

//Read & parse the typeahead criteria from the file MatchCriteria.txt
let arrCriteria = fs.readFileSync(path.format(filePathIn)).toString().split('\n');

//Loop over the array of DUNS at maximum TPS
const limiter = new RateLimiter(maxTPS, 'second');

//The typeahead criteria as listed in the file
const qryParams = ['searchTerm', 'countryISOAlpha2Code', 'customerReference'];

arrCriteria.forEach(sCriteria => {
   limiter.removeTokens(1, () => {
      const oQryStr = {}, arrCriteriaSubmitted = sCriteria.split('|');

      qryParams.forEach((qryParam, idx) => {
         oQryStr[qryParam] = arrCriteriaSubmitted[idx]
      });

      console.log('About to submit ' + oQryStr.searchTerm);
      
      reqTypeahead(oQryStr).then(respBody => {
         //Write the the HTTP response body to a file
         if(filePathOut) {
            const oFilePath = {...filePathOut};
            oFilePath.base = fileBase1stPt + oQryStr.customerReference + '_' + sDate + '.json';

            fs.writeFile(path.format(oFilePath), respBody, err => {
               if(err) {console.log(err.message)}
            });
         }
      })
      .catch(err => console.log(err))
   })
});

//Launch an API request for D&B Direct+ Data blocks
function reqTypeahead(oQryStr) {
   const httpAttr = {
      host: 'plus.dnb.com',
      path: '/v1/search/typeahead',
      method: 'GET',
      headers: {
         'Content-Type': 'application/json',
         Authorization: 'Bearer ' + oCredentials.token
      }
   };

   httpAttr.path += '?' + qryStr.stringify(oQryStr);

   return new Promise((resolve, reject) => {
      https.request(httpAttr, resp => {
         const body = [];

         resp.on('error', err => reject(err));

         resp.on('data', chunk => body.push(chunk));

         resp.on('end', () => { //The match candidates now available
            resolve(body);
         });
      }).end()
   });
}
