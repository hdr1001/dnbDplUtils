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

//External libraries
const fs = require('fs');
const path = require('path');
const lib = require('./dnbDplLib');

//Application settings
const arrblockIDs = ['companyinfo_L2_v1','principalscontacts_L3_v1','hierarchyconnections_L1_v1'];
const tradeUp = ''; //Set to hq if trade-up is needed
const filePathIn = {root: '', dir: 'in', base: 'DUNS.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'dnb_dpl_nat_pers_principals_'; //1st part of the output file name
const sDate = new Date().toISOString().split('T')[0];

//Function to recursively resolve principals to natural persons
function processPrincipals(org) {
   //Determine the DUNS associated with a business principal
   function idNumbersGetDUNS(arrIDs) {
      //Check the array passed in
      if(!(arrIDs && arrIDs.length)) { /* console.log('No IDs available!'); */ return ''; }
   
      //Locate the DUNS in the idNumbers aray
      const arrPrincipalDUNS = arrIDs.filter(oID => oID.idType.dnbCode === 3575)
   
      if(arrPrincipalDUNS.length === 0) { /* console.log('No DUNS available!'); */ return ''; }
   
      return arrPrincipalDUNS[0].idNumber
   }

   //Concat the principal arrays
   const arrPrincipals = org.mostSeniorPrincipals.concat(org.currentPrincipals);

   //console.log('Processing ' + arrPrincipals.length + ' principals for duns ' + org.duns);

   return Promise.all(arrPrincipals
      .map(oPrincipal => {
         return new Promise((resolve, reject) => {
            if(oPrincipal.subjectType !== 'Businesses') {
               resolve({duns: org.duns, principal: oPrincipal.fullName, status: 'Not a business'});
               return;
            }

            const principalDUNS = idNumbersGetDUNS(oPrincipal.idNumbers);

            if(!principalDUNS) {
               resolve({duns: org.duns, principal: oPrincipal.fullName, status: 'No DUNS available for this business'});
               return;
            }

            lib.reqDnbDplDBs(principalDUNS, ['principalscontacts_L3_v1'], null, true)
               .then(dbPcL3 => {
                  processPrincipals(dbPcL3.organization)
                     .then(values => {
                        //values.forEach(oRet => console.log(oRet))

                        oPrincipal.org = {};
                        oPrincipal.org.principalsSummary = dbPcL3.organization.principalsSummary;
                        oPrincipal.org.mostSeniorPrincipals = dbPcL3.organization.mostSeniorPrincipals;
                        oPrincipal.org.currentPrincipals = dbPcL3.organization.currentPrincipals;
      
                        resolve({duns: org.duns, principal: oPrincipal.fullName, status: 'Recursive request for DUNS ' + principalDUNS})
                     })
               })
               .catch(err => reject(err));
         })
      })
   );
}

function processDUNS(DUNS) {
   lib.reqDnbDplDBs(DUNS, arrblockIDs, null, true)
      .then(oDBs => {
         processPrincipals(oDBs.organization)
            .then(values => {
               //values.forEach(oRet => console.log(oRet));
               console.log('Finished processing: ' + oDBs.organization.primaryName + ' ('
                                  + oDBs.organization.primaryAddress.addressLocality.name + ')');
               
               const oFilePath = {...filePathOut};
               oFilePath.base = fileBase1stPt + DUNS + '_' + sDate + '.json';

               fs.writeFile(path.format(oFilePath), JSON.stringify(oDBs, null, 3), err => {
                  if(err) { console.log(err.message) }
               });
            })
            .catch(err => console.log(err));
      })
      .catch(err => console.log(err));
}

if(process.argv && process.argv.length > 2) {
   //Assume DUNS specified on the command line like;
   //node getNatPersPrincipals 123456789
   let DUNS = process.argv[2];
   console.log('Getting (natural person) principals for DUNS ' + DUNS);

   processDUNS(DUNS);
}
else {
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

   arrDUNS.forEach(DUNS => processDUNS(DUNS));
}
