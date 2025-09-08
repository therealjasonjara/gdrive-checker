(async () => {
  const predefinedList = [
    "andamanmed.com",
    "www.bankware.asia",
    "en.bankwareglobal.com",
    "bnfindustries.com",
    "www.cardiaccarepartners.com",
    "cloudnettl.com",
    "dawsonmedical.com.sg",
    "ennovi.com",
    "ennovi.com.cn",
    "ennovi.cz",
    "www.focal-digital.com",
    "maketheswitch.sg",
    "www.gynaeoncopartners.com",
    "www.huemed.com.sg",
    "insidersecurity.co",
    "interplex.com",
    "interplex.com.cn",
    "www.logicalisasia.digital",
    "www.lyrecodeliverswellness.com",
    "www.lyrecodeliverswellness.com_my",
    "www.lyrecodeliverswellness.com_sg",
    "www.lyrecodeliverswellness.com_th",
    "nordpacificmed.com",
    "onet.sg",
    "pafadvisory.com",
    "www.powercred.io",
    "ifforeststalk.com",
    "www.impactbc.com.sg",
    "martechwise.com",
    "techinfocus.co",
    "wfhwins.com",
  ]; // Replace with your list of URLs

  const domainsOnDrive = new Set(); // Track domains already in Google Drive

  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  let hasMoreItems = true;

  while (hasMoreItems) {
    const gridCells = document.querySelectorAll('div[role="gridcell"]');

    gridCells.forEach((cell) => {
      const filenameElement = cell.querySelector('div[data-column-field="6"]');
      const dateElement = cell.querySelector('div[data-column-field="5"]');

      if (filenameElement && dateElement) {
        const filenameText = filenameElement.innerText;
        const dateText = dateElement.innerText.replace("me", "").trim();
        // Extract domain name before '_wpvivid'
        const domain = filenameText.split("_wpvivid")[0];

        const fileDate = new Date(dateText);
        if (fileDate >= previousMonth) {
          domainsOnDrive.add(domain); // Add domain to set
        } else {
          hasMoreItems = false; // Stop scrolling if date is older than previous month
        }
      }
    });

    // Scroll grid
    if (hasMoreItems) {
      const grid = document.querySelector(".PEfnhb");
      if (grid) {
        grid.scrollBy(0, 500); // Scroll down
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for content to load
      } else {
        hasMoreItems = false;
      }
    }
  }

  // Find missing items
  const missingItems = predefinedList.filter((url) => !domainsOnDrive.has(url));

  // Send results back to background.js
  chrome.runtime.sendMessage({
    action: "saveCSV",
    data: missingItems.map((url) => [url]),
  });
})();
