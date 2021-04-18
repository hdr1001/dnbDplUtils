// *********************************************************************
//
// Get a D&B Direct+ Authentication Token
// JavaScript code file: getDnbDplAuthToken.js
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
const lib = require('./dnbDplLib');

const fileCredentials = 'dnbDplCredentials.json';

let credentials;

//Update the API credentials in the file on disk
function updCredentials() {
   fs.writeFileSync(fileCredentials, JSON.stringify(credentials, null, 3));
}

//Read the API credentials from file
try {
   credentials = JSON.parse(fs.readFileSync(fileCredentials));
}
catch(err) { //No credentials file available, create
   credentials = {
      key: '< Your API key here >',
      secret: '< Your API secret here >'
   };

   updCredentials() //Write an empty credentials file to disk

   console.log('Please file out your credentials in file ' + fileCredentials);
   process.exit();
}

//Get the new token
new lib.ReqDnbDpl(lib.httpToken).execReq('Token request', true)
      .then(oResp => {
         credentials.token = oResp.access_token;

         updCredentials() //Write the credentials file including the token
      })
      .catch(err => console.log(err));
