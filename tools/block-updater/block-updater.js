// Import DA's public crawl function
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

// Helper function to update metadata value and return both states
function updateMetadataValue(dom, key, newValue) {
  const metadata = dom.querySelector('.metadata');
  if (!metadata) return { success: false };

  // Store the original state
  const beforeState = metadata.outerHTML;

  // Each row is a direct child div of .metadata
  const rows = metadata.children;
  for (const row of rows) {
    // Each row has two divs: key and value
    const [keyDiv, valueDiv] = row.children;
    const keyText = keyDiv?.textContent;
    
    if (keyText === key) {
      // Found the matching key, update the value
      if (valueDiv?.textContent) {
        valueDiv.textContent = newValue;
        return { 
          success: true, 
          before: beforeState,
          after: metadata.outerHTML
        };
      }
    }
  }
  return { success: false };
}

const createCallback = (key, newValue, isDryRun = false) => async (item) => {
  // Die if not a document
  if (!item.path.endsWith('.html')) return;

  // if (item.path !== '/herodigital/stericycle-shared/en-ca/about/media-contacts.html') return;

  const url = `https://admin.da.live/source${item.path}`;
  // Fetch the doc & convert to DOM
  const resp = await fetch(url);
  if (!resp.ok) {
    console.log('Could not fetch item');
    return;
  }
  const text = await resp.text();
  const dom = new DOMParser().parseFromString(text, 'text/html');

  // Update the metadata value with the provided key and value
  const result = updateMetadataValue(dom, key, newValue);
  
  if (!result.success) {
    console.log(`Could not update metadata for ${item.path}`);
    return;
  }

  if (!isDryRun) {
    const html = dom.body.outerHTML;
    const data = new Blob([html], { type: 'text/html' });

    const body = new FormData();
    body.append('data', data);

    const opts = { method: 'POST', body };
    const { status } = await fetch(url, opts);
    console.log(`Update HTTP status: ${status} - Path: ${item.path}`);
  }

  return {
    path: item.path,
    before: result.before,
    after: result.after,
    status: isDryRun ? 'dry-run' : `HTTP status: ${status}`
  };
}

async function executeUpdate(rootPath, key, value, isDryRun = false) {
  const results = [];
  const callback = createCallback(key, value, isDryRun);
  
  const { results: crawlResults } = await crawl({
    path: rootPath,
    callback: async (item) => {
      try {
        const result = await callback(item);
        if (result) {
          results.push(result);
          return result;
        }
      } catch (error) {
        console.error(`Error processing ${item.path}:`, error);
      }
    },
    concurrent: 50
  });

  await crawlResults;
  return results;
}

// Dry run function that returns preview of changes
export async function dryRun(rootPath, key, value) {
  return executeUpdate(rootPath, key, value, true);
}

// Crawl the tree of content and update files
export async function updateBlocks(rootPath, key, value) {
  console.log(`Updating metadata: ${key} = ${value}`);
  return executeUpdate(rootPath, key, value, false);
}

