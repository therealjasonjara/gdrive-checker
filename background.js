// Simple background script - only handles auth and CSV download

console.log("Background script loaded");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received:", message.action);

  // Handle auth token requests - keep this simple and synchronous where possible
  if (message.action === "getAuthToken") {
    console.log("Auth token requested");

    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("Auth error:", chrome.runtime.lastError.message);
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message,
        });
      } else if (token) {
        console.log("Auth token obtained successfully");
        sendResponse({
          success: true,
          token: token,
        });
      } else {
        console.error("No token received");
        sendResponse({
          success: false,
          error: "No token received",
        });
      }
    });

    return true; // Keep message channel open for async response
  }

  // Handle comprehensive CSV download (new format with categories)
  if (message.action === "saveComprehensiveCSV") {
    console.log(`Creating comprehensive CSV with ${message.data.length} rows`);

    try {
      // Convert array data to CSV format
      const csvRows = message.data.map((row) => {
        // Escape any commas or quotes in the data
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
      const blob = new Blob([csvContent], { type: "text/csv" });

      const reader = new FileReader();
      reader.onloadend = function () {
        const dataUrl = reader.result;
        const timestamp = new Date().toISOString().split("T")[0];

        chrome.downloads.download(
          {
            url: dataUrl,
            filename: `backup_report_${timestamp}.csv`,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Download failed:",
                chrome.runtime.lastError.message
              );
            } else {
              console.log(`Download started with ID: ${downloadId}`);
            }
          }
        );
      };

      reader.onerror = function () {
        console.error("FileReader error");
      };

      reader.readAsDataURL(blob);

      // Send immediate response
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error creating CSV:", error);
      sendResponse({ success: false, error: error.message });
    }

    return false; // Synchronous response
  }

  // Handle old CSV download format (for backwards compatibility)
  if (message.action === "saveCSV") {
    console.log(`Creating CSV with ${message.data.length} missing items`);

    try {
      const rows = message.data.map(([url]) => `${url}`).join("\n");
      const csvContent = "Missing Items\n" + rows;
      const blob = new Blob([csvContent], { type: "text/csv" });

      const reader = new FileReader();
      reader.onloadend = function () {
        const dataUrl = reader.result;
        chrome.downloads.download(
          {
            url: dataUrl,
            filename: `missing_items_${
              new Date().toISOString().split("T")[0]
            }.csv`,
          },
          (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Download failed:",
                chrome.runtime.lastError.message
              );
            } else {
              console.log(`Download started with ID: ${downloadId}`);
            }
          }
        );
      };

      reader.onerror = function () {
        console.error("FileReader error");
      };

      reader.readAsDataURL(blob);

      // Send immediate response
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error creating CSV:", error);
      sendResponse({ success: false, error: error.message });
    }

    return false; // Synchronous response
  }

  // Unknown message
  console.log("Unknown message action:", message.action);
  sendResponse({ success: false, error: "Unknown action" });
  return false;
});
