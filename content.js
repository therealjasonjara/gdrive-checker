// content.js
(async () => {
  const results = new Map(); // Store results with unique domains

  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  let hasMoreItems = true;

  while (hasMoreItems) {
    const gridCells = document.querySelectorAll('div[role="gridcell"]');

    gridCells.forEach((cell) => {
      const filenameElement = cell.querySelector('div[data-column-field="6"]');
      const dateElement = cell.querySelector('div[data-column-field="8"]');

      if (filenameElement && dateElement) {
        const filenameText = filenameElement.innerText;
        const dateText = dateElement.innerText.replace("me", "").trim();
        const domain = filenameText.split("_")[0];

        const fileDate = new Date(dateText);
        if (fileDate >= previousMonth) {
          results.set(domain, dateText); // Avoid duplicates
        }
      }
    });

    // Scroll grid
    const grid = document.querySelector('div[role="grid"]');
    if (grid) {
      grid.scrollBy(0, 500); // Scroll down
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for content to load
    } else {
      hasMoreItems = false;
    }
  }

  // Send results back to background.js
  chrome.runtime.sendMessage({ action: "saveCSV", data: Array.from(results) });
})();
