# Google Drive Backup Checker

A Chrome extension that scans your Google Drive folder for WordPress backup files and compares them against a master list in Google Sheets, generating a comprehensive CSV report.

## 📋 Requirements

### Software Requirements

- **Google Chrome Browser** (version 88 or higher)
- **Google Account** with access to:
  - Google Drive (where backups are stored)
  - Google Sheets (where domain list is maintained)

### File Requirements

- WordPress backup files must follow this naming convention:
  ```
  domain.com_wpvivid-[hash]_[date]_backup_all
  ```
  Example: `webscelerate.com_wpvivid-10f2fe6e88341_2025-10-01-09-22_backup_all`

### Google Sheets Setup

- A Google Sheet with domains listed in **Column D**
- Sheet name: Can be customized (default: `MASTER`)
- Each row should contain one domain/URL

## 🚀 Installation

### Step 1: Download the Extension Files

Ensure you have these files in a folder:

```
google-drive-checker/
├── manifest.json
├──.gitignore
├── background.js
├── content.js
├── popup.html
├── popup.js
└── icon.png (optional)
```

### Step 2: Configure `config.json` and your `.env` Settings

1. Create a `config.json` and `.env` files in your current directory
2. Add these configuration inside `config.json`:

```json
{
  "SHEET_ID": "YOUR_SHEET_ID_HERE";, // Extract from your Google Sheet URL,
  "RANGE": "'MASTER'!D:D"
}

```

3. On your `.env`, add this:

```javascript
GOOGLE_CLIENT_ID = YOUR_GOOGLE_CLIENT_ID;
```

**How to find your Sheet ID:**

- Open your Google Sheet
- Look at the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
- Copy the long string between `/d/` and `/edit`

### Step 3: Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the folder containing your extension files
5. The extension should now appear in your extensions list

### Step 4: Grant Permissions

When you first run the extension, it will request permissions to:

- Access Google Drive
- Access Google Sheets API
- Download files

Click **Allow** to grant these permissions.

## 📖 How to Use

### Step 1: Navigate to Your Backup Folder

1. Go to Google Drive in Chrome
2. Open the folder containing your WordPress backup files
3. Make sure you're viewing files in **List/Grid view** (not thumbnail view)

### Step 2: Load All Files

**Important:** Google Drive lazy-loads content as you scroll.

- **Manually scroll down** through your entire folder
- Wait for all backup files to load and appear
- You should see all your backup files with the `_wpvivid` pattern

### Step 3: Run the Extension

1. Click the extension icon in your Chrome toolbar
2. Click the **"Start Check"** button in the popup
3. The extension will:
   - Fetch domains from your Google Sheet
   - Scan all visible backup files in Drive
   - Compare the two lists
   - Generate a CSV report

### Step 4: Review the Results

The extension will show you:

```
📊 Backup Report Generated!

✅ Latest Backups: 25
❌ Missing Items: 3
⚠️  Inactive Backups: 2

CSV file downloaded successfully!
```

A CSV file named `backup_report_YYYY-MM-DD.csv` will be automatically downloaded.

## 📊 Understanding the CSV Report

The CSV file contains **3 columns**:

| Latest Backups   | Missing Items | Inactive Backups |
| ---------------- | ------------- | ---------------- |
| webscelerate.com | example.com   | oldclient.com    |
| ennovi.com       | another.com   | unused.com       |
| interplex.com    |               | legacy.com       |

### Column Definitions:

#### ✅ Latest Backups

- Domains found **both** in your Google Sheet **and** in Google Drive
- These are your actively backed-up websites
- **Action:** None needed - everything is working correctly

#### ❌ Missing Items

- Domains found in your Google Sheet but **NOT** in Google Drive
- These websites have no recent backups
- **Action:** Create backups for these domains immediately

#### ⚠️ Inactive Backups

- Backup files found in Google Drive but **NOT** in your Google Sheet
- Could be old clients, test sites, or forgotten domains
- **Action:** Review and decide if these should be added to your sheet or removed from Drive

## 🔧 Configuration Options

### Change the Google Sheet Range

Edit `config.js`:

```json
{
  "RANGE": "'MASTER'!D:D" // Change sheet name or column
}
```

Examples:

- `"'SEPTEMBER 2025'!D:D"` - Different sheet tab
- `"'MASTER'!C:C"` - Different column
- `"'MASTER'!D2:D100"` - Specific row range

### Adjust Fallback Domain List

If the extension can't connect to Google Sheets, it uses a fallback list.

Edit the `fallbackDomains` array in `content.js`:

```javascript
const fallbackDomains = [
  "domain1.com",
  "domain2.com",
  // Add your domains here
];
```

## 🐛 Troubleshooting

### Issue: "No files found on Google Drive"

**Solution:**

- Scroll down manually to load all files before running the extension
- Ensure you're in List/Grid view (not thumbnail view)
- Check that files follow the `domain_wpvivid-...` naming pattern

### Issue: "No domains found in Google Sheet"

**Solution:**

- Verify the `SHEET_ID` is correct
- Check that the sheet name in `RANGE` matches your actual sheet name
- Ensure Column D contains domain names
- Grant permissions when prompted

### Issue: "All domains showing as missing"

**Solution:**

- Scroll through the entire Drive folder before running
- Check that backup files contain `_wpvivid` in their names
- Verify domains in the sheet match the format in filenames

### Issue: Domain not matching (e.g., with slashes)

**Solution:**
The extension automatically normalizes:

- `www.example.com/my` → `www.example.com_my`
- `example.com_wpvivid-...` → `example.com`

Both formats should match correctly.

## 🔒 Privacy & Security

- **OAuth Authentication:** Uses Google's official OAuth 2.0 for secure access
- **Read-Only Access:** The extension only reads data from Google Sheets (no write permissions)
- **Local Processing:** All comparisons happen in your browser
- **No Data Storage:** No data is sent to external servers

## 📝 Notes

- The extension only scans **currently visible** files in Google Drive
- Large folders (1000+ files) may require multiple scrolls
- CSV reports are timestamped for easy tracking
- The extension works offline for Drive files already loaded

## 🆘 Support

### Common Issues:

1. **Extension not appearing:** Reload the extension in `chrome://extensions/`
2. **Permission errors:** Reauthorize in Chrome settings
3. **CSV not downloading:** Check Chrome's download permissions

### Console Debugging:

Open Chrome DevTools (F12) to see detailed logs:

- File scanning progress
- Domain matching results
- Error messages with solutions

## 📄 License

This extension is provided as-is for personal and commercial use.

## 🔄 Version History

### Version 1.0

- Initial release
- Google Sheets integration
- Three-category CSV report
- Domain normalization with slash-to-underscore conversion
- Manual scrolling support
