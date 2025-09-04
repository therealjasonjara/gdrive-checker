document.getElementById("startCheck").addEventListener("click", () => {
  chrome.scripting.executeScript({
    target: { allFrames: false },
    files: ["content.js"],
  });
});
