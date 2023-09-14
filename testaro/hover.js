/*
  hover
  This test reports unexpected impacts of hovering. The elements that are subjected to hovering
  (called “triggers”) include all the elements that have aria-controls, aria-expanded,
  onmouseenter, or onmouseover' attributes and a sample of all visible elements in the body. If
  hovering over an element results in an increase or decrease in the total count of visible
  elements in the body, the rule is considered violated.
*/

// ########## IMPORTS

// Module to perform common operations.
const {init, report} = require('../procs/testaro');

// ########## FUNCTIONS

// Runs the test and returns the result.
exports.reporter = async (page, withItems) => {
  // Initialize the locators and result.
  const all = await init(
    page, 'body [aria-controls], body [aria-expanded], body [onmouseenter], body [onmouseover]'
  );
  const miscAll = await init(page, 'body *:visible');
  all.allLocs.push(... miscAll.allLocs.slice(0, - all.allLocs.length));
  // For each locator:
  for (const loc of all.allLocs) {
    // Get how many elements are added or subtracted when the element is hovered over.
    const loc0 = page.locator('body *:visible');
    const elementCount0 = await loc0.count();
    try {
      await loc.hover({
        force: true,
        noWaitAfter: true,
        timeout: 100
      });
      const pause = ms => {
        const promise = new Promise(resolve => {
          const timeout = setTimeout(() => {
            resolve();
            clearTimeout(timeout);
          }, ms);
        });
        return promise;
      };
      await pause(500);
      const loc1 = page.locator('body *:visible');
      const elementCount1 = await loc1.count();
      const additions = elementCount1 - elementCount0;
      // If any elements are:
      if (additions !== 0) {
        // Add the locator and the change of element count to the array of violators.
        const impact = additions > 0
          ? `added ${additions} elements to the page`
          : `subtracted ${- additions} from the page`;
        all.locs.push([loc, impact]);
      }
    }
    catch(error) {
      console.log(`Hovering timed out (${error.message})`);
    }
  }
  // Populate and return the result.
  const whats = [
    'Hovering over the element __param__',
    'Hovering over elements adds elements to or subtracts elements from the page'
  ];
  return await report(withItems, all, 'ruleID', whats, 0);
};
