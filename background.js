chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveCSV") {
    const rows = message.data.map(([url]) => `${url}`).join("\n");

    const blob = new Blob(["Missing Items\n" + rows], { type: "text/csv" });

    const reader = new FileReader();
    reader.onloadend = function () {
      chrome.downloads.download({
        url: reader.result, // Use FileReader to convert Blob to data URL
        filename: "missing_items.csv",
      });
    };
    reader.readAsDataURL(blob); // Convert Blob to data URL
  }
});
