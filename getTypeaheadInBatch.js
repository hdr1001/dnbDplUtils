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
const path = require('path');
const lib = require('./dnbDplLib');

//Application settings
const filePathIn = {root: '', dir: 'in', base: 'MatchCriteria.txt'};
const filePathOut = {root: '', dir: 'out'};
const fileBase1stPt = 'typeahead_results_';
const sDate = new Date().toISOString().split('T')[0];
const delim = '|';

let workList = fs.readFileSync(path.format(filePathIn)).toString().split('\n')
   .map(elem => elem.split(delim))
   .map(criteria => {
      return {
         typeahead: {
            searchTerm: criteria[0],
            countryISOAlpha2Code: criteria[1],
            customerReference: criteria[2],
         },
         results: {
            done: false
         }
      }
   });

let arrRanges = [30, 20, 15, 10, 6, 3];

(function processWorkList(idx) {
   const minLen = idx < arrRanges.length - 1 ? arrRanges[idx + 1] : 0;
   const maxLen = arrRanges[idx];

   Promise.all(
      workList
         .filter(workItem => workItem.typeahead.searchTerm.length > minLen && !workItem.results.done)
         .map((workItem, idx, thisArr) => {
            if(idx === 0) {
               console.log(thisArr.length + ' items in range [' + minLen + ', ' + maxLen + ']');
            }

            const qryStr = {...workItem.typeahead};
            qryStr.searchTerm = qryStr.searchTerm.slice(0, maxLen);

            return new Promise((resolve, reject) => {
               new lib.ReqDnbDpl(lib.httpTypeahead, [], qryStr).execReq('Request for name ' + qryStr.searchTerm, true)
                  .then(oTaResp => {
                     if(oTaResp.error) {
                        workItem.results.error = oTaResp.error;
                     }
                     else {
                        workItem.results.done = true;
                        workItem.results.maxLen = maxLen;
                        workItem.results.oTaResp = oTaResp;
                     }

                     resolve(workItem);
                  })
                  .catch(err => {
                     workItem.results.error = err;

                     reject(workItem);
                  })
            })
         })
   ).then(() => {
      if(idx < arrRanges.length - 2) {
         processWorkList(++idx) //Process the next range
      }
      else {
         const oPipeDelimPath = {...filePathOut};
         oPipeDelimPath.base = fileBase1stPt + sDate + '.txt';
         const wstream = fs.createWriteStream(path.format(oPipeDelimPath), {flags: 'a', encoding: 'utf8'});
         let sOut;
        
         //No more typeahead calls, write the results to a file
         workList.forEach(workItem => {
            sOut = getTypeaheadInput(workItem.typeahead);

            if(workItem.results.done) {
               sOut += getTypeaheadResults(workItem.results)
            }
            else if(workItem.results.error) {
               if(workItem.results.error.errorCode) {
                  sOut += workItem.results.error.errorCode
               }
               else {
                  sOut += workItem.results.error.message
               }
            }
            else {
               sOut += '-1'
            }

            wstream.write(sOut + '\n');
         })
      }
   })
   .catch(err => console.log(err))
})(0);

function getTypeaheadInput(typeahead) {
   return [typeahead.customerReference, typeahead.searchTerm, typeahead.countryISOAlpha2Code].join(delim) + delim
}

function getTypeaheadResults(results) {
   const arrOut = [];

   const candidate0 = results.oTaResp.searchCandidates[0];

   const {duns, primaryName, tradeStyleNames, primaryAddress, dunsControlStatus} = candidate0.organization;

   arrOut.push('0'); //No error occurred 
   arrOut.push(duns);
   arrOut.push(primaryName ? primaryName : '');

   if(tradeStyleNames && tradeStyleNames.length) {
      arrOut.push(tradeStyleNames[0].name ? tradeStyleNames[0].name : '') }
   else {
      arrOut.push('')
   }

   if(primaryAddress) {
      const {streetAddress, addressLocality, postalCode, addressCountry} = primaryAddress;

      if(streetAddress && streetAddress.line1) {
         arrOut.push(streetAddress.line1)
      }
      else {
         arrOut.push('')
      }

      if(addressLocality && addressLocality.name) {
         arrOut.push(addressLocality.name)
      }
      else {
         arrOut.push('')
      }

      arrOut.push(postalCode ? postalCode : '');

      if(addressCountry && addressCountry.isoAlpha2Code) {
         arrOut.push(addressCountry.isoAlpha2Code)
      }
      else {
         arrOut.push('')
      }
   }

   if(dunsControlStatus && typeof dunsControlStatus.isOutOfBusiness === 'boolean') {
      arrOut.push(dunsControlStatus.isOutOfBusiness)
   }
   else {
      arrOut.push('')
   }

   arrOut.push(results.maxLen ? results.maxLen.toString() : '');

   return arrOut.join(delim);
}
