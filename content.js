(async () => {
  console.log("Content script started");

  // Configuration - Update these values
  const SHEET_ID = "1jfIMUGJWhAb-9fqMlufYQ3X6dJN4hzMIDIJLnMY-fMQ";
  const RANGE = "'MASTER'!D:D";

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
    let normalized = domain.replace(/^https?:\/\//, "");
    normalized = normalized.replace(/\/+$/, "");
    // Convert slashes to underscores for consistent matching
    // e.g., "www.lyrecodeliverswellness.com/my" becomes "www.lyrecodeliverswellness.com_my"
    normalized = normalized.replace(/\//g, "_");
    normalized = normalized.trim();
    return normalized;
  };

  // Function to get auth token from background
  const getAuthToken = async () => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Auth token request timeout"));
      }, 5000);

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

  // Function to fetch from Google Sheets
  const fetchFromGoogleSheets = async () => {
    try {
      console.log("Attempting to get auth token...");
      const token = await getAuthToken();
      console.log("Got auth token, fetching from Google Sheets...");

      const encodedRange = encodeURIComponent(RANGE);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Sheets API HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      const domains = data.values
        ? data.values.flat().filter((domain) => {
            if (!domain || domain.trim() === "") return false;

            const trimmed = domain.trim();
            const hasProtocol =
              trimmed.startsWith("http://") || trimmed.startsWith("https://");
            const hasDot = trimmed.includes(".");
            const isNotHeader =
              !trimmed.toLowerCase().includes("domain") &&
              !trimmed.toLowerCase().includes("url") &&
              !trimmed.toLowerCase().includes("website");

            return (hasDot || hasProtocol) && isNotHeader;
          })
        : [];

      const normalizedDomains = domains.map(normalizeDomain);

      console.log(
        `✅ Successfully fetched ${normalizedDomains.length} domains from Google Sheets`
      );
      return normalizedDomains;
    } catch (error) {
      console.error("Error fetching from Google Sheets:", error);
      throw error;
    }
  };

  // Get the domain list (with fallback)
  let predefinedList;
  let usedFallback = false;

  try {
    predefinedList = await fetchFromGoogleSheets();
  } catch (error) {
    console.error("Failed to fetch domains from Google Sheets:", error);
    predefinedList = fallbackDomains.map(normalizeDomain);
    usedFallback = true;
    console.log(
      `Using fallback domain list with ${predefinedList.length} domains`
    );
  }

  console.log("\n=== DOMAINS FROM SHEET ===");
  console.log(`Total domains in sheet: ${predefinedList.length}`);
  console.log("==========================\n");

  // Main logic - scan ALL strong tags on Google Drive (no scrolling - manual scroll by user)
  console.log("=== SCANNING GOOGLE DRIVE ===");
  console.log(
    "NOTE: Scroll manually through your Drive folder to load all files, then run this extension."
  );
  console.log("Looking for all <strong> tags with backup files...\n");

  const domainsOnDrive = new Map(); // Store domain -> date mapping
  const allStrongTags = document.querySelectorAll("strong");

  console.log(`Found ${allStrongTags.length} total <strong> tags`);

  let backupFilesFound = 0;
  let foldersSkipped = 0;

  allStrongTags.forEach((strongTag) => {
    const text = strongTag.innerText || strongTag.textContent || "";
    const trimmedText = text.trim();

    // Skip if it doesn't contain _wpvivid (likely a folder)
    if (!trimmedText.includes("_wpvivid")) {
      foldersSkipped++;
      return;
    }

    // Extract domain from backup filename
    const domain = trimmedText.split("_wpvivid")[0].trim();

    if (domain && domain.length > 0) {
      const normalizedDomain = normalizeDomain(domain);

      // Find the corresponding date
      let dateText = "N/A";
      let currentElement = strongTag;

      for (let i = 0; i < 10; i++) {
        if (!currentElement.parentElement) break;
        currentElement = currentElement.parentElement;

        const dateSpan = currentElement.querySelector(
          'div[data-column-field="5"] span'
        );
        if (dateSpan) {
          dateText = (dateSpan.innerText || dateSpan.textContent || "")
            .replace("me", "")
            .trim();
          break;
        }
      }

      // Store or update with latest date
      if (!domainsOnDrive.has(normalizedDomain)) {
        console.log(
          `✅ Backup file #${
            backupFilesFound + 1
          }: ${normalizedDomain} (${dateText})`
        );
        domainsOnDrive.set(normalizedDomain, dateText);
        backupFilesFound++;
      }
    }
  });

  console.log(`\n=== SCAN SUMMARY ===`);
  console.log(`Total <strong> tags checked: ${allStrongTags.length}`);
  console.log(`Folders/non-backups skipped: ${foldersSkipped}`);
  console.log(`Unique domains on drive: ${domainsOnDrive.size}`);
  console.log("====================\n");

  // Categorize domains
  const latestBackups = []; // In sheet AND in drive
  const missingItems = []; // In sheet but NOT in drive
  const inactiveBackups = []; // In drive but NOT in sheet

  const sheetSet = new Set(predefinedList);
  const driveSet = new Set(domainsOnDrive.keys());

  // Latest Backups: In both sheet and drive
  predefinedList.forEach((domain) => {
    if (domainsOnDrive.has(domain)) {
      latestBackups.push({
        domain: domain,
        date: domainsOnDrive.get(domain),
      });
    }
  });

  // Missing Items: In sheet but not in drive
  predefinedList.forEach((domain) => {
    if (!domainsOnDrive.has(domain)) {
      missingItems.push(domain);
    }
  });

  // Inactive Backups: In drive but not in sheet
  domainsOnDrive.forEach((date, domain) => {
    if (!sheetSet.has(domain)) {
      inactiveBackups.push({
        domain: domain,
        date: date,
      });
    }
  });

  // Sort all arrays
  latestBackups.sort((a, b) => a.domain.localeCompare(b.domain));
  missingItems.sort();
  inactiveBackups.sort((a, b) => a.domain.localeCompare(b.domain));

  // Console output
  console.log("=== CATEGORIZATION RESULTS ===");
  console.log(`📊 Domains in sheet: ${predefinedList.length}`);
  console.log(`📊 Domains on drive: ${domainsOnDrive.size}`);
  console.log("");
  console.log(
    `✅ Latest Backups (in sheet AND in drive): ${latestBackups.length}`
  );
  console.log(
    `❌ Missing Items (in sheet but NOT in drive): ${missingItems.length}`
  );
  console.log(
    `⚠️  Inactive Backups (in drive but NOT in sheet): ${inactiveBackups.length}`
  );
  console.log("==============================\n");

  if (latestBackups.length > 0) {
    console.log("=== LATEST BACKUPS ===");
    latestBackups.forEach((item, index) => {
      console.log(`${index + 1}. ✅ ${item.domain} - ${item.date}`);
    });
    console.log("");
  }

  if (missingItems.length > 0) {
    console.log("=== MISSING ITEMS ===");
    missingItems.forEach((domain, index) => {
      console.log(`${index + 1}. ❌ ${domain}`);
    });
    console.log("");
  }

  if (inactiveBackups.length > 0) {
    console.log("=== INACTIVE BACKUPS ===");
    inactiveBackups.forEach((item, index) => {
      console.log(`${index + 1}. ⚠️  ${item.domain} - ${item.date}`);
    });
    console.log("");
  }

  // Create comprehensive CSV with 3 columns
  console.log("=== CREATING CSV ===");

  // Find the maximum length to know how many rows we need
  const maxLength = Math.max(
    latestBackups.length,
    missingItems.length,
    inactiveBackups.length
  );
  console.log(`Max rows needed: ${maxLength}`);

  const csvData = [];

  // Add header row
  csvData.push(["Latest Backups", "Missing Items", "Inactive Backups"]);

  // Add data rows
  for (let i = 0; i < maxLength; i++) {
    const row = [
      latestBackups[i]?.domain || "",
      missingItems[i] || "",
      inactiveBackups[i]?.domain || "",
    ];
    csvData.push(row);
  }

  console.log(`📊 Prepared ${csvData.length} rows (including header)`);
  console.log("=== CSV PREVIEW ===");
  console.log("Row 0 (Header):", csvData[0]);
  console.log("Row 1 (Data):", csvData[1]);
  console.log("Row 2 (Data):", csvData[2]);
  console.log("===================\n");

  // Send to background script for download
  console.log("📤 Sending CSV data to background script...");

  try {
    chrome.runtime.sendMessage(
      {
        action: "saveComprehensiveCSV",
        data: csvData,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "❌ Failed to send message:",
            chrome.runtime.lastError.message
          );

          // Fallback: try direct download
          console.log("Trying fallback download method...");
          const csvRows = csvData.map((row) => {
            return row
              .map((cell) => {
                const cellStr = String(cell);
                if (
                  cellStr.includes(",") ||
                  cellStr.includes('"') ||
                  cellStr.includes("\n")
                ) {
                  return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
              })
              .join(",");
          });
          const csvContent = csvRows.join("\n");

          const dataUrl =
            "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
          const link = document.createElement("a");
          link.href = dataUrl;
          link.download = `backup_report_${
            new Date().toISOString().split("T")[0]
          }.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          let alertMessage = `📊 Backup Report Generated!\n\n`;
          alertMessage += `✅ Latest Backups: ${latestBackups.length}\n`;
          alertMessage += `❌ Missing Items: ${missingItems.length}\n`;
          alertMessage += `⚠️  Inactive Backups: ${inactiveBackups.length}\n\n`;
          alertMessage += `CSV file downloaded via fallback method.`;

          alert(alertMessage);
        } else if (response?.success) {
          console.log("✅ CSV download initiated successfully");

          let alertMessage = `📊 Backup Report Generated!\n\n`;
          alertMessage += `✅ Latest Backups: ${latestBackups.length}\n`;
          alertMessage += `❌ Missing Items: ${missingItems.length}\n`;
          alertMessage += `⚠️  Inactive Backups: ${inactiveBackups.length}\n\n`;
          alertMessage += `CSV file downloaded successfully!`;

          alert(alertMessage);
        } else {
          console.error(
            "❌ Background script returned error:",
            response?.error
          );
        }
      }
    );
  } catch (error) {
    console.error("❌ Error creating CSV:", error);
  }

  console.log("\n✅ Content script completed");
})();
