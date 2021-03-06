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
const arrDBs = [
   {db: 'companyinfo', dbShort: 'ci', level: 1, version: '1'},
//   {db: 'principalscontacts', dbShort: 'pc', level: 3, version: '1'},
   {db: 'hierarchyconnections', dbShort: 'hc', level: 1, version: '1'},
//   {db: 'eventfilings', dbShort: 'ef', level: 1, version: '1'},
//   {db: 'companyfinancials', dbShort: 'cf', level: 1, version: '1'},
//   {db: 'financialstrengthinsight', dbShort: 'cf', level: 1, version: '1'},
//   {db: 'paymentinsight', dbShort: 'pi', level: 1, version: '1'},
//   {db: 'ownershipinsight', dbShort: 'oi', level: 1, version: '1'}
]
const arrBlockIDs = arrDBs.map(oDB => oDB.db + '_L' + oDB.level + '_v' + oDB.version);
const tradeUp = null; //Set to {tradeUp: 'hq'} if trade-up is needed
const filePathIn = {root: '', dir: 'in', base: 'DUNS.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = arrDBs.reduce((acc, oDB) => acc + oDB.dbShort + '_l' + oDB.level + '_', 'dnb_dpl_');
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
   const qryStr = {...{ blockIDs: arrBlockIDs.join(',') }, ...tradeUp};

   new lib.ReqDnbDpl(lib.httpBlocks, [DUNS], qryStr).execReq('Request for DUNS ' + DUNS)
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
