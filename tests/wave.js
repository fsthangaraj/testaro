/*
  © 2021–2024 CVS Health and/or one of its affiliates. All rights reserved.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
*/

/*
  wave
  This test implements the WebAIM WAVE ruleset for accessibility. The 'reportType' argument
  specifies a WAVE report type: 1, 2, 3, or 4.
*/

// CONSTANTS

const fs = require('fs/promises');
const https = require('https');

// FUNCTIONS

// Conducts and reports the WAVE tests.
exports.reporter = async (page, report, actIndex) => {
  const act = report.acts[actIndex];
  const {reportType, url, prescript, postscript, rules} = act;
  console.log(`reportType is ${reportType}`);
  const waveKey = process.env.WAVE_KEY;
  const waveKeyParam = waveKey ? `key=${waveKey}` : '';
  let host = 'wave.webaim.org';
  let scheme = 'https';
  if (url && url.startsWith('http')) {
    if (url.startsWith('http://')) {
      scheme = 'http';
    }
    host = url.replace(/^https?:\/\//, '');
  }
  let prescriptParam = prescript ? `prescript=${prescript}` : '';
  let postscriptParam = postscript ? `postscript=${postscript}` : '';
  const wavePath = '/api/request';
  const queryParams = [
    waveKeyParam,
    `url=${page.url()}`,
    `reportType=${reportType}`,
    prescriptParam,
    postscriptParam
  ];
  const query = queryParams.filter(param => param).join('&');
  const path = [wavePath, query].join('?');
  // Initialize the results.
  const data = {};
  let result = {};
  try {
    result = await new Promise(resolve => {
      // Get the test results.
      console.log(`host is ${host}`);
      console.log(`path is ${path}`);
      https.get(
        {
          host,
          path
        },
        response => {
          let rawReport = '';
          response.on('data', chunk => {
            rawReport += chunk;
          });
          // When they arrive:
          response.on('end', async () => {
            console.log(`rawReport is:\n${rawReport}`);
            // Delete unnecessary properties.
            try {
              const actResult = JSON.parse(rawReport);
              const {categories, statistics} = actResult;
              delete categories.feature;
              delete categories.structure;
              delete categories.aria;
              console.log('e');
              console.log(JSON.stringify(categories, null, 2));
              // If rules were specified:
              if (rules && rules.length) {
                // For each WAVE rule category:
                ['error', 'contrast', 'alert'].forEach(category => {
                  // If any violations were reported:
                  if (
                    categories[category]
                    && categories[category].items
                    && Object.keys(categories[category].items).length
                  ) {
                    console.log('Violations reported');
                    // For each rule violated:
                    Object.keys(categories[category].items).forEach(ruleID => {
                      // If it was not a specified rule:
                      if (! rules.includes(ruleID)) {
                        // Decrease the category violation count by the count of its violations.
                        categories[category].count -= categories[category].items[ruleID].count;
                        // Remove its violations from the report.
                        delete categories[category].items[ruleID];
                      }
                    });
                  }
                });
              }
              // Add WCAG information from the WAVE documentation.
              console.log('f');
              const waveDocJSON = await fs.readFile('procs/wavedoc.json');
              const waveDoc = JSON.parse(waveDocJSON);
              console.log('g');
              console.log(`categories: ${JSON.stringify(categories)}`);
              Object.keys(categories).forEach(categoryName => {
                console.log(categoryName);
                const category = categories[categoryName];
                console.log(category);
                const {items} = category;
                console.log('h')
                console.log(Object.keys(items));
                console.log('i')
                Object.keys(items).forEach(issueName => {
                  console.log(issueName);
                  const issueDoc = waveDoc.find((issue => issue.name === issueName));
                  const {guidelines} = issueDoc;
                  items[issueName].wcag = guidelines;
                });
                console.log('j')
              });
              console.log('k');
              // Add important data to the result.
              if (statistics) {
                data.pageTitle = statistics.pagetitle || '';
                data.pageURL = statistics.pageurl || '';
                data.time = statistics.time || null;
                data.creditsRemaining = statistics.creditsremaining || null;
                data.allItemCount = statistics.allitemcount || null;
                data.totalElements = statistics.totalelements || null;
              }
              console.log('i');
              // Return the result.
              resolve(actResult);
            }
            catch(error) {
              console.log(`ERROR parsing tool report: ${error.message}`);
              console.log(`rawReport: ${rawReport}`);
              data.prevented = true;
              data.error = error.message;
              resolve(result);
            };
          });
        }
      );
    });
  }
  catch (error) {
    console.log(`ERROR: ${error.message}`);
    data.prevented = true;
    data.error = error.message;
  };
  return {
    data,
    result
  };
};
