// *********************************************************************
//
// Get D&B Direct+ Reference Data
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
const filePathOut = {root: '', dir: 'out'};
const sDate = new Date().toISOString().split('T')[0];

//A user can use the the command line to specify the reference data category identifier
let httpReqType, qryStr;

if(process.argv && process.argv[2]) {
   httpReqType = lib.httpRefDataCat;
   qryStr = { id: process.argv[2] };

   filePathOut.base = 'refDataCat_' + process.argv[2] + '_' + sDate + '.txt';
}
else {
   httpReqType = lib.httpRefData;
   qryStr = {};

   filePathOut.base = 'codeTables_' + sDate + '.html';
}

//Get the reference data
new lib.ReqDnbDpl(httpReqType, [], qryStr).execReq('Reference data request', true)
   .then(oRespBody => {
      if(httpReqType === lib.httpRefDataCat) {
         const arrCodeList = oRespBody.codeTables[0].codeLists;

         fs.writeFile(
            path.format(filePathOut),
            arrCodeList.map(oCode => oCode.code + '|' + oCode.description).join('\n'),
            err => {
               if(err) { console.log(err.message) }
            }
         );
      }
      else { //Listing of reference data categories
         const arrCodeTables = oRespBody.codeTables;

         let sOut = '<!DOCTYPE html>\n';
         sOut += '<html lang="en">\n';
         sOut += '<head><meta charset="UTF-8" />\n';
         sOut += '<title>Reference data categories</title>\n';
         sOut += '</head><body><table><tr>\n';
         sOut += '<th>Category</th><th>ID</th></tr>\n';

         sOut += arrCodeTables.map(oCat => '<tr><td>' + oCat.categoryName + '</td><td>'  + oCat.categoryID + '</td></tr>').join('\n');

         sOut += '\n</table></body></html>';

         fs.writeFile(
            path.format(filePathOut),
            sOut,
            err => {
               if(err) { console.log(err.message) }
            }
         );
      }
   })
   .catch(err => console.log(err))
