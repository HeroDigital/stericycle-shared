// Import DA's public crawl function
import { crawl } from 'https://da.live/nx/public/utils/tree.js';

const path = '/herodigital/stericycle-shared/en-ca';

// Helper function to update metadata value
function updateMetadataValue(dom, key, newValue) {
  const metadata = dom.querySelector('.metadata');
  if (!metadata) return false;

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
        return true;
      }
    }
  }
  return false;
}

const createCallback = (key, newValue) => async (item) => {
  // Die if not a document
  if (!item.path.endsWith('.html')) return;

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
  const updated = updateMetadataValue(dom, key, newValue);
  if (!updated) {
    console.log(`Could not update metadata for ${item.path}`);
    return;
  }

  const html = dom.body.outerHTML;
  const data = new Blob([html], { type: 'text/html' });

  const body = new FormData();
  body.append('data', data);

  const opts = { method: 'POST', body };
  const { status } = await fetch(url, opts);
  console.log(`Update HTTP status: ${status} - Path: ${item.path}`);
}

// Crawl the tree of content
export async function updateBlocks(key, value) {
  console.log(`Updating metadata: ${key} = ${value}`);
  const { results } = crawl({ path, callback: createCallback(key, value), concurrent: 50 });
  await results;
}
