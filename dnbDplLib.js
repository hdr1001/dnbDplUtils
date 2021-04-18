// *********************************************************************
//
// D&B Direct+ Data Blocks shared library functions
// JavaScript code file: dnbDplLib.js
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

//More on limiter; https://www.npmjs.com/package/limiter
const RateLimiter = require('limiter').RateLimiter;

//Settings for the library functions
const fileCredentials = 'dnbDplCredentials.json';
const maxTPS = 4; //Maximum transactions per second

//Get a (hopefully) valid API token from file dnbDplCredentials.json
const oCredentials = JSON.parse(fs.readFileSync(fileCredentials));

//Configure the limiter to throttle the number of HTTP requests made
const limiter = new RateLimiter(maxTPS, 'second');

//Index values into the HTTP attribute array
const httpToken = 0;
const httpBlocks = 1;
const httpIDR = 2;
const httpTypeahead = 3;

const arrHttpAttr = [
   { //Index 0, use httpToken
      host: 'plus.dnb.com',
      path: '/v2/token',
      method: 'POST',
      headers: {
         'Content-Type': 'application/json'
      }
   },
   { //Index 1, use httpBlocks
      host: 'plus.dnb.com',
      path: '/v1/data/duns',
      method: 'GET',
      headers: {
         'Content-Type': 'application/json'
      }
   },
   { //Index 2, use httpIDR
      host: 'plus.dnb.com',
      path: '/v1/match/cleanseMatch',
      method: 'GET',
      headers: {
         'Content-Type': 'application/json'
      }
   },
   { //Index 3, use httpTypeahead
      host: 'plus.dnb.com',
      path: '/v1/search/typeahead',
      method: 'GET',
      headers: {
         'Content-Type': 'application/json',
      }
   }
];

//Object constructor for generic D&B Direct+ request
function ReqDnbDpl(reqType, arrResource, oQryStr) {
   //Base64 encode the D&B Direct+ credentials
   function getBase64EncCredentials() {
      return Buffer.from(oCredentials.key + ':' + oCredentials.secret).toString('Base64');
   }

   this.httpAttr = {...arrHttpAttr[reqType]};

   if(arrResource && arrResource.length) {
      this.httpAttr.path += '/' + arrResource.join('/')
   };

   if(oQryStr) {this.httpAttr.path += '?' + qryStr.stringify(oQryStr)}

   if(reqType === httpToken) {
      this.httpAttr.headers.Authorization = 'Basic ' + getBase64EncCredentials()
   }
   else {
      this.httpAttr.headers.Authorization = 'Bearer ' + oCredentials.token
   }
}

//Execute the HTTP request on the D&B Direct+ request object
ReqDnbDpl.prototype.execReq = function(reqMsgOnEnd, bRetObj) {
   //The actual HTTP request wrapped in a promise
   return new Promise((resolve, reject) => {
      limiter.removeTokens(1, () => {
         const httpReq = https.request(this.httpAttr, resp => {
            const body = [];

            resp.on('error', err => reject(err));

            resp.on('data', chunk => body.push(chunk));

            resp.on('end', () => { //The data product is now available in full
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
         });

         if(this.httpAttr.method === 'POST') {
            httpReq.write('{ "grant_type": "client_credentials" }');
         }

         httpReq.end();
      })
   });
}

function readDunsFile(oFilePath) {
   let arrDUNS = [];

   try {
      arrDUNS = fs.readFileSync(path.format(oFilePath)).toString().split('\n');
   }
   catch(err) {
      console.log(err);
      return arrDUNS;
   }

   return arrDUNS
      .map(sDUNS => sDUNS.trim()) //Remove any unwanted whitespace
      .filter(sDUNS => !!sDUNS)  //Remove empty values from the array
      .map(sDUNS => '000000000'.slice(0, 9 - sDUNS.length) + sDUNS);
}

module.exports = {httpToken, httpBlocks, httpIDR, httpTypeahead, ReqDnbDpl, readDunsFile};
