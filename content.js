(async () => {
  console.log("Content script started");

  // Configuration - Update these values
  const SHEET_ID = "1jfIMUGJWhAb-9fqMlufYQ3X6dJN4hzMIDIJLnMY-fMQ"; // Extract from your Google Sheet URL
  const RANGE = "'SEPTEMBER 2025'!C:C"; // Adjust range as needed (A:A means column A, all rows)

  // Fallback domain list (always available)
  const fallbackDomains = [
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
    "www.gynaeoncopartners.com",
    "insidersecurity.co",
    "interplex.com",
    "interplex.com.cn",
    "www.logicalisasia.digital",
    "www.lyrecodeliverswellness.com",
    "www.lyrecodeliverswellness.com_my",
    "www.lyrecodeliverswellness.com_sg",
    "www.lyrecodeliverswellness.com_th",
    "nordpacificmed.com",
    "www.powercred.io",
    "ifforeststalk.com",
    "www.impactbc.com.sg",
    "martechwise.com",
    "techinfocus.co",
    "wfhwins.com",
  ];

  // Helper function to normalize domain names
  const normalizeDomain = (domain) => {
    // Remove 'https://' prefix
    let normalized = domain.replace(/^https?:\/\//, "");
    // Remove trailing slash
    normalized = normalized.replace(/\/+$/, "");
    return normalized;
  };

  // Function to get auth token from background (simplified)
  const getAuthToken = async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Auth token request timeout"));
      }, 5000); // Shorter timeout

      chrome.runtime.sendMessage({ action: "getAuthToken" }, (response) => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (response?.success && response?.token) {
          resolve(response.token);
        } else {
          reject(new Error(response?.error || "No token received"));
        }
      });
    });
  };

  // Function to fetch from Google Sheets directly in content script
  const fetchFromGoogleSheets = async () => {
    try {
      console.log("Attempting to get auth token...");
      const token = await getAuthToken();
      console.log("Got auth token, fetching from Google Sheets...");

      // URL encode the range to handle special characters
      const encodedRange = encodeURIComponent(RANGE);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}`;

      console.log("Making request to:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      console.log("Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Sheets API error response:", errorText);
        throw new Error(`Sheets API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("Sheets API response:", data);

      const domains = data.values
        ? data.values.flat().filter((domain) => domain && domain.trim() !== "")
        : [];

      // Normalize each domain from the sheet
      const normalizedDomains = domains.map(normalizeDomain);

      console.log(
        `Successfully fetched ${normalizedDomains.length} normalized domains from Google Sheets`
      );
      return normalizedDomains;
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error);
      console.log("Using fallback domain list");
      return fallbackDomains.map(normalizeDomain); // Normalize fallback domains too
    }
  };

  // Get the domain list (with fallback)
  let predefinedList;
  try {
    predefinedList = await fetchFromGoogleSheets();
  } catch (error) {
    console.error("Failed to fetch domains:", error);
    predefinedList = fallbackDomains.map(normalizeDomain);
  }

  console.log(`Using domain list with ${predefinedList.length} domains`);

  // Main logic - scan Google Drive files
  const domainsOnDrive = new Set();
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  console.log("Looking for files from:", previousMonth.toDateString());

  let hasMoreItems = true;
  let processedCount = 0;
  const maxFiles = 1000; // Safety limit

  while (hasMoreItems && processedCount < maxFiles) {
    const gridCells = document.querySelectorAll('div[role="gridcell"]');
    console.log(`Processing batch: found ${gridCells.length} grid cells`);

    let foundNewFiles = false;
    let oldFileCount = 0;

    gridCells.forEach((cell) => {
      const filenameElement = cell.querySelector('div[data-column-field="6"]');
      const dateElement = cell.querySelector('div[data-column-field="5"]');

      if (filenameElement && dateElement) {
        const filenameText = filenameElement.innerText.trim();
        const dateText = dateElement.innerText.replace("me", "").trim();

        // Skip if we've already processed this file
        if (!filenameText || !dateText) return;

        const domain = filenameText.split("_wpvivid")[0];
        const fileDate = new Date(dateText);

        if (fileDate >= previousMonth) {
          // Normalize the domain from the filename before checking against the list
          const normalizedDomain = normalizeDomain(domain);
          if (!domainsOnDrive.has(normalizedDomain)) {
            console.log("New file found:", {
              domain: normalizedDomain,
              date: dateText,
            });
            domainsOnDrive.add(normalizedDomain);
            foundNewFiles = true;
          }
          processedCount++;
        } else {
          oldFileCount++;
        }
      }
    });

    console.log(
      `Batch processed: ${processedCount} files total, ${oldFileCount} old files in this batch`
    );

    // If we found mostly old files, we can stop
    if (oldFileCount > foundNewFiles * 3) {
      console.log("Found mostly old files, stopping scroll");
      hasMoreItems = false;
    } else if (foundNewFiles) {
      // Scroll to load more content
      console.log("Scrolling to load more content...");
      const grid = document.querySelector(".PEfnhb");
      if (grid) {
        const scrollBefore = grid.scrollTop;
        grid.scrollBy(0, 800);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if we actually scrolled
        if (grid.scrollTop === scrollBefore) {
          console.log("No more content to scroll, stopping");
          hasMoreItems = false;
        }
      } else {
        console.log("Grid element not found, stopping");
        hasMoreItems = false;
      }
    } else {
      hasMoreItems = false;
    }
  }

  console.log(`Scan complete: processed ${processedCount} files`);
  console.log("Domains found on drive:", Array.from(domainsOnDrive));

  const missingItems = predefinedList.filter((url) => !domainsOnDrive.has(url));
  console.log(`Found ${missingItems.length} missing domains:`, missingItems);

  // Send results to background for CSV download (with simple fallback)
  try {
    chrome.runtime.sendMessage(
      {
        action: "saveCSV",
        data: missingItems.map((url) => [url]),
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Failed to trigger CSV download:",
            chrome.runtime.lastError.message
          );
          // Could add manual download fallback here if needed
        } else {
          console.log("CSV download initiated");
        }
      }
    );
  } catch (error) {
    console.error("Error sending CSV request:", error);
  }

  console.log("Content script completed successfully");
})();
