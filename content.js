(async () => {
  console.log("Content script started");

  // Configuration - Update these values
  const SHEET_ID = "1jfIMUGJWhAb-9fqMlufYQ3X6dJN4hzMIDIJLnMY-fMQ"; // Extract from your Google Sheet URL
  const RANGE = "'MASTER'!D:D"; // Changed from C:C to D:D

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
        ? data.values.flat().filter((domain) => {
            if (!domain || domain.trim() === "") return false;

            // Check if it looks like a URL/domain (contains a dot and doesn't look like a header)
            const trimmed = domain.trim();
            const hasProtocol =
              trimmed.startsWith("http://") || trimmed.startsWith("https://");
            const hasDot = trimmed.includes(".");
            const isNotHeader =
              !trimmed.toLowerCase().includes("domain") &&
              !trimmed.toLowerCase().includes("url") &&
              !trimmed.toLowerCase().includes("website");

            // Must have a dot (domain indicator) and not be a header
            return (hasDot || hasProtocol) && isNotHeader;
          })
        : [];

      // Normalize each domain from the sheet
      const normalizedDomains = domains.map(normalizeDomain);

      console.log(
        `Successfully fetched ${normalizedDomains.length} normalized domains from Google Sheets (filtered blanks and non-URLs)`
      );
      console.log("Domains from sheet:", normalizedDomains);
      return normalizedDomains;
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error);
      throw error; // Re-throw to handle in the main flow
    }
  };

  // Get the domain list (with fallback)
  let predefinedList;
  let usedFallback = false;

  try {
    predefinedList = await fetchFromGoogleSheets();
    console.log(
      `Using Google Sheets domain list with ${predefinedList.length} domains`
    );
  } catch (error) {
    console.error("Failed to fetch domains from Google Sheets:", error);
    predefinedList = fallbackDomains.map(normalizeDomain);
    usedFallback = true;
    console.log(
      `Using fallback domain list with ${predefinedList.length} domains`
    );
  }

  // Main logic - scan Google Drive files
  const domainsOnDrive = new Set();
  const today = new Date();
  const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

  console.log("=== STARTING DRIVE SCAN ===");
  console.log("Looking for files from:", previousMonth.toDateString());
  console.log("Today's date:", today.toDateString());

  // First, let's see what elements we can find
  console.log("=== DEBUGGING GRID STRUCTURE ===");
  const gridCells = document.querySelectorAll('div[role="gridcell"]');
  console.log(`Total grid cells found: ${gridCells.length}`);

  if (gridCells.length === 0) {
    console.error("❌ NO GRID CELLS FOUND!");
    console.log("Trying alternative selectors...");

    // Try to find the grid container
    const gridContainer = document.querySelector('div[role="grid"]');
    console.log("Grid container found:", gridContainer);

    // Try to find any data rows
    const rows = document.querySelectorAll('div[role="row"]');
    console.log(`Rows found: ${rows.length}`);

    // Log the first few rows to see structure
    if (rows.length > 0) {
      console.log("First row HTML:", rows[0].outerHTML.substring(0, 500));
    }
  } else {
    // Log first few grid cells to see their structure
    console.log("=== FIRST 3 GRID CELLS STRUCTURE ===");
    for (let i = 0; i < Math.min(3, gridCells.length); i++) {
      const cell = gridCells[i];
      console.log(`\nGrid Cell ${i}:`);
      console.log("- HTML:", cell.outerHTML.substring(0, 300));

      const filenameEl = cell.querySelector(
        'div[data-column-field="6"] strong'
      );
      const dateEl = cell.querySelector('div[data-column-field="5"] span');

      console.log("- Filename element found:", !!filenameEl);
      if (filenameEl) {
        console.log("  - Filename text:", filenameEl.innerText);
      }

      console.log("- Date element found:", !!dateEl);
      if (dateEl) {
        console.log("  - Date text:", dateEl.innerText);
      }

      // Try to find ALL elements with data-column-field
      const allColumnFields = cell.querySelectorAll("[data-column-field]");
      console.log(
        `- Total data-column-field elements: ${allColumnFields.length}`
      );
      allColumnFields.forEach((el) => {
        const fieldNum = el.getAttribute("data-column-field");
        const text = el.innerText || el.textContent;
        console.log(`  - Field ${fieldNum}: "${text.substring(0, 50)}"`);
      });
    }
  }
  console.log("====================================");

  let hasMoreItems = true;
  let processedCount = 0;
  let totalCellsScanned = 0;
  const maxFiles = 1000; // Safety limit

  while (hasMoreItems && processedCount < maxFiles) {
    const gridCells = document.querySelectorAll('div[role="gridcell"]');
    console.log(
      `\n=== Scan iteration ${Math.floor(totalCellsScanned / 100) + 1} ===`
    );
    console.log(`Processing batch: found ${gridCells.length} grid cells`);
    totalCellsScanned += gridCells.length;

    let foundNewFiles = false;
    let oldFileCount = 0;
    let skippedCount = 0;

    gridCells.forEach((cell, index) => {
      const filenameElement = cell.querySelector('div[data-column-field="6"]');
      const dateElement = cell.querySelector('div[data-column-field="5"]');

      if (!filenameElement || !dateElement) {
        skippedCount++;
        return;
      }

      const filenameText = filenameElement.innerText.trim();
      const dateText = dateElement.innerText.replace("me", "").trim();

      // Skip if we've already processed this file
      if (!filenameText || !dateText) {
        skippedCount++;
        return;
      }

      // Skip folders (folders typically don't have the _wpvivid pattern)
      if (!filenameText.includes("_wpvivid")) {
        console.log(`Skipping (likely folder): "${filenameText}"`);
        skippedCount++;
        return;
      }

      // Extract domain by splitting at "_wpvivid" and taking the first part
      // Example: "webscelerate.com_wpvivid-10f2fe6e88341_2025-10-01-09-22_backup_all"
      // becomes: "webscelerate.com"
      const domain = filenameText.split("_wpvivid")[0].trim();

      if (!domain) {
        console.log("Could not extract domain from:", filenameText);
        skippedCount++;
        return;
      }

      const fileDate = new Date(dateText);

      console.log(`Checking file: "${filenameText}"`);
      console.log(`  - Extracted domain: "${domain}"`);
      console.log(`  - Date: ${dateText} (parsed: ${fileDate.toDateString()})`);
      console.log(`  - Date valid: ${!isNaN(fileDate.getTime())}`);
      console.log(
        `  - After cutoff (${previousMonth.toDateString()}): ${
          fileDate >= previousMonth
        }`
      );

      if (!isNaN(fileDate.getTime()) && fileDate >= previousMonth) {
        // Normalize the domain from the filename before checking against the list
        const normalizedDomain = normalizeDomain(domain);
        if (!domainsOnDrive.has(normalizedDomain)) {
          console.log("✅ NEW VALID FILE FOUND:", {
            originalFilename: filenameText,
            extractedDomain: domain,
            normalizedDomain: normalizedDomain,
            date: dateText,
          });
          domainsOnDrive.add(normalizedDomain);
          foundNewFiles = true;
        } else {
          console.log("  (Already recorded)");
        }
        processedCount++;
      } else {
        console.log("  ❌ Rejected: Too old or invalid date");
        oldFileCount++;
      }
    });

    console.log(
      `Batch summary: ${
        foundNewFiles ? "Found new files" : "No new files"
      }, ${skippedCount} skipped, ${oldFileCount} old files`
    );
    console.log(`Total unique domains so far: ${domainsOnDrive.size}`);

    // If we found mostly old files, we can stop
    if (oldFileCount > foundNewFiles * 3 && oldFileCount > 10) {
      console.log("Found mostly old files, stopping scroll");
      hasMoreItems = false;
    } else if (foundNewFiles || processedCount < 50) {
      // Scroll to load more content
      console.log("Scrolling to load more content...");
      const grid = document.querySelector(".PEfnhb");
      if (grid) {
        const scrollBefore = grid.scrollTop;
        console.log(`Scroll position before: ${scrollBefore}`);
        grid.scrollBy(0, 800);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log(`Scroll position after: ${grid.scrollTop}`);

        // Check if we actually scrolled
        if (grid.scrollTop === scrollBefore) {
          console.log("No more content to scroll, stopping");
          hasMoreItems = false;
        }
      } else {
        console.log("❌ Grid element '.PEfnhb' not found!");
        console.log("Trying alternative scroll methods...");

        // Try c-wiz[1]
        const allCWiz = document.querySelectorAll("c-wiz");
        if (allCWiz.length > 1) {
          console.log(
            `Found ${allCWiz.length} c-wiz elements, trying c-wiz[1]`
          );
          const scrollBefore = allCWiz[1].scrollTop;
          allCWiz[1].scrollBy(0, 800);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (allCWiz[1].scrollTop === scrollBefore) {
            console.log("c-wiz[1] scroll failed, stopping");
            hasMoreItems = false;
          }
        } else {
          console.log("Not enough c-wiz elements found, stopping");
          hasMoreItems = false;
        }
      }
    } else {
      console.log("No new files found and enough processed, stopping");
      hasMoreItems = false;
    }
  }

  console.log(`Scan complete: processed ${processedCount} files`);
  console.log("=== COMPARISON DEBUG ===");
  console.log("Total unique domains found on drive:", domainsOnDrive.size);
  console.log("Domains found on drive:", Array.from(domainsOnDrive).sort());
  console.log("Predefined list from sheet:", predefinedList.sort());
  console.log("========================");

  // CRITICAL FIX: Only compare if we successfully got domains from Google Sheets
  // If we used the fallback and found NO files on drive, don't generate CSV
  let missingItems = [];

  if (usedFallback && domainsOnDrive.size === 0) {
    console.log(
      "Used fallback list but found NO files on drive - not generating CSV"
    );
    alert(
      "No files found on Google Drive. Please check:\n1. You're in the correct folder\n2. Files are from the previous month\n3. Try running the scan again"
    );
  } else if (predefinedList.length === 0) {
    console.log("No domains found in Google Sheet - nothing to compare");
    alert(
      "⚠️ No domains found in Google Sheet. Please check:\n1. Sheet ID is correct\n2. Range is correct (D:D)\n3. Sheet has data in column D"
    );
  } else {
    // Normal comparison: find what's in the list but not on drive
    console.log("=== CHECKING EACH DOMAIN ===");
    missingItems = predefinedList.filter((sheetDomain) => {
      const isMissing = !domainsOnDrive.has(sheetDomain);
      if (isMissing) {
        console.log(
          `❌ MISSING: "${sheetDomain}" (not found in drive backups)`
        );
      } else {
        console.log(`✓ FOUND: "${sheetDomain}" (has backup on drive)`);
      }
      return isMissing;
    });
    console.log("============================");

    console.log(`Comparison complete:`);
    console.log(`- Domains in sheet (column D): ${predefinedList.length}`);
    console.log(`- Domains found on drive: ${domainsOnDrive.size}`);
    console.log(`- Missing domains: ${missingItems.length}`);
    console.log(`Missing domains list:`, missingItems);

    if (missingItems.length === 0) {
      console.log("All domains have backups!");
      alert("✅ All domains have backups!");
    } else {
      // Send results to background for CSV download
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
            } else {
              console.log("CSV download initiated");
              alert(
                `Found ${missingItems.length} missing backups. CSV downloaded.`
              );
            }
          }
        );
      } catch (error) {
        console.error("Error sending CSV request:", error);
      }
    }
  }

  console.log("Content script completed successfully");
})();
