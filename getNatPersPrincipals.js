// *********************************************************************
//
// Get (natural person) principals using D&B Direct+ 
// JavaScript code file: getNatPersPrincipals.js
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

const fileCredentials = 'dnbDplCredentials.json';

//A DUNS must be specified on the command line like "node getNatPersPrincipals 123456789"
let DUNS;

if(process.argv && process.argv.length > 2) {
   DUNS = process.argv[2];
   console.log('Getting (natural person) principals for DUNS ' + DUNS);
}
else {
   console.log('Please specify a valid DUNS on the command line');
   process.exit();
}

//Get a (hopefully) valid API token from file dnbDplCredentials.json
const oCredentials = JSON.parse(fs.readFileSync(fileCredentials));

if(oCredentials && oCredentials.token) {
   console.log('Token available but please note that it can be expired!')
}
else {
   console.log('Please generate a valid token, exiting ...');
   process.exit();
}

//D&B Direct+ Data Block REST API call
function getDnbDplDBs(sDUNS, arrBlockIDs, sTradeUp) {
   const httpAttr = {
      host: 'plus.dnb.com',
      path: '/v1/data/duns/' + sDUNS,
      method: 'GET',
      headers: {
         'Content-Type': 'application/json',
         Authorization: 'Bearer ' + oCredentials.token
      }
   };
   
   const oQryStr = {blockIDs: arrBlockIDs.join(',')};
   if(sTradeUp) {oQryStr.tradeUp = sTradeUp}
   httpAttr.path += '?' + qryStr.stringify(oQryStr);
   
   return new Promise((resolve, reject) => {
      https.request(httpAttr, resp => {
         const body = [];

         resp.on('error', err => reject(err));

         resp.on('data', chunk => body.push(chunk));

         resp.on('end', () => { //The match candidates now available
            if(resp.statusCode !== 200) { console.log('HTTP status code ' + resp.statusCode) }
            resolve(body);
         });
      }).end()
   })   
}

function idNumbersGetDuns(arrIDs) {
   //Check the array passed in
   if(!(arrIDs && arrIDs.length)) {
      console.log('No IDs available!');
      return '';
   }

   //Locate the DUNS in the idNumbers aray
   const arrPrincipalDUNS = arrIDs.filter(oID => oID.idType.dnbCode === 3575)

   if(arrPrincipalDUNS.length === 0) {
      console.log('No DUNS available!');
      return '';
   }

   return arrPrincipalDUNS[0].idNumber
}

function processPrincipals(org) {
   const {mostSeniorPrincipals, currentPrincipals} = org;

   const arrPrincipals = mostSeniorPrincipals.concat(currentPrincipals);

   console.log('Total number of principals = ' + arrPrincipals.length);

   const arrBusinessPrincipals = arrPrincipals.filter(oPincipal => oPincipal.subjectType === 'Businesses')

   console.log('Total number of business principals = ' + arrBusinessPrincipals.length);

   return Promise.all(arrPrincipals
      .filter(oPincipal => oPincipal.subjectType === 'Businesses')
      .map(oBusPrincipal => {
         const principalDUNS = idNumbersGetDuns(oBusPrincipal.idNumbers);

         if(principalDUNS) {
            console.log('Retrieving principal data for ' + oBusPrincipal.fullName + ' (' + principalDUNS + ')');

            return getDnbDplDBs(principalDUNS, ['principalscontacts_L3_v1']);
         }
         else {
            return Buffer.alloc(0);
         }
      })
   );
}

getDnbDplDBs(DUNS, ['companyinfo_L2_v1', 'principalscontacts_L3_v1'])
   .then(respBody => {
      const oDBs = JSON.parse(respBody.join(''));
      const oOrg = oDBs.organization;

      processPrincipals(oOrg)
         .then(values => {
            values.forEach(respBody => console.log(respBody.join('')))
         })
         .catch(err => console.log(err));
   })
   .catch(err => console.log(err));
