// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "saveCSV") {
    const rows = message.data
      .map(([domain, date]) => `${domain},${date}`)
      .join("\n");
    const blob = new Blob(["Domain,Date\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    console.log("Saving file:", message.data);
    chrome.downloads.download({
      url: url,
      filename: "drive_filenames.csv",
    });
  }
});
