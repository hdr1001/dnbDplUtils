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
const path = require('path');
const lib = require('./dnbDplLib');

//Application settings
const arrblockIDs = ['companyinfo_L2_v1','principalscontacts_L3_v1','hierarchyconnections_L1_v1'];
const tradeUp = ''; //Set to hq if trade-up is needed
const filePathIn = {root: '', dir: 'in', base: 'DUNS.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'dnb_dpl_ci_l2_pc_l3_hc_l1_'; //1st part of the output file name
const sDate = new Date().toISOString().split('T')[0];

//Read & parse the DUNS to retrieve from the file DUNS.txt
const arrDUNS = lib.readDunsFile(filePathIn);

//Check if there are any valid array entries available
if(arrDUNS.length === 0) {
   console.log('No valid DUNS available, exiting ...');
   process.exit();
}
else {
   console.log('Test file contains ' + arrDUNS.length + ' DUNS records');
}

arrDUNS.forEach(DUNS => {
   lib.reqDnbDplDBs(DUNS, arrblockIDs, tradeUp)
      .then(respBody => {
         //Write the the HTTP response body to a file
         const oFilePath = {...filePathOut};
         oFilePath.base = fileBase1stPt + DUNS + '_' + sDate + '.json';

         fs.writeFile(path.format(oFilePath), respBody, err => {
            if(err) { console.log(err.message) }
         });
      })
      .catch(err => console.log(err))
});
