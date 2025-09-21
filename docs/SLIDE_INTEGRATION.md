# Slide Integration Guide

Complete guide for integrating quiz scores with presentation platforms.

## Overview

The quiz scoreboard system supports real-time integration with major presentation platforms, allowing you to display live scores directly in your presentation slides while preserving your custom design.

## Supported Platforms

### 1. Microsoft PowerPoint (.pptx)
- **Method**: Template upload with placeholder replacement
- **Update Type**: Manual export and Find & Replace
- **File Support**: .pptx, .ppt files
- **Real-time**: No (manual update required)

### 2. Google Slides
- **Method**: API integration with text element IDs
- **Update Type**: Automated via Google Slides API
- **File Support**: Online presentations only
- **Real-time**: Yes (with API setup)

### 3. Canva
- **Method**: Manual update workflow
- **Update Type**: Manual copy-paste
- **File Support**: Export data for manual entry
- **Real-time**: No (manual update required)

## PowerPoint Integration

### Step 1: Prepare Your Template

1. **Create your slide design** in PowerPoint with your desired layout, colors, and branding
2. **Add placeholder text** for team scores using this format:
   ```
   {{TeamName_score}}
   ```
   Examples:
   - `{{Team A_score}}`
   - `{{Red Team_score}}`
   - `{{Champions_score}}`

3. **Style the placeholders** with your desired font, size, and color
4. **Save as .pptx** format

### Step 2: Upload Template

1. Open your quiz session in the host dashboard
2. Click the **"Slides"** button in the header
3. Select **"PowerPoint"** platform
4. Click **"Upload Template"** and select your .pptx file
5. **Configure team mappings**:
   - Each team name will be mapped to a placeholder
   - Default format: `{{TeamName_score}}`
   - Customize if your placeholders use different text

### Step 3: Export Updated Scores

1. During your quiz, click **"Export Updated Scores"** for your PowerPoint template
2. Download the generated JSON file
3. Open the JSON file to see current scores:
   ```json
   {
     "platform": "powerpoint",
     "teams": [
       {
         "name": "Team A",
         "score": 150,
         "placeholder": "{{Team A_score}}"
       }
     ],
     "timestamp": "2024-01-15T10:30:00Z"
   }
   ```

### Step 4: Update Your Presentation

1. **Open your PowerPoint** presentation
2. **Use Find & Replace** (Ctrl+H):
   - Find: `{{Team A_score}}`
   - Replace: `150` (current score)
   - Click "Replace All"
3. **Repeat for each team**
4. **Save your presentation**

### PowerPoint Automation (Advanced)

For automated updates, you can use PowerPoint VBA or Power Automate:

```vba
Sub UpdateScores()
    Dim jsonText As String
    ' Read JSON file with current scores
    ' Parse JSON and update text boxes
    ' This requires additional VBA code for JSON parsing
End Sub
```

## Google Slides Integration

### Step 1: Prepare Your Presentation

1. **Create your slide design** in Google Slides
2. **Add text boxes** for team scores
3. **Get element IDs** for each text box:
   - Right-click text box → "Inspect element"
   - Find the element ID in the HTML
   - Or use Google Apps Script to list elements

### Step 2: Get Presentation ID

1. **Open your Google Slides** presentation
2. **Copy the presentation ID** from the URL:
   ```
   https://docs.google.com/presentation/d/[PRESENTATION_ID]/edit
   ```

### Step 3: Configure Integration

1. In the quiz host dashboard, go to **Slides panel**
2. Select **"Google Slides"** platform
3. **Enter your presentation ID**
4. **Configure team mappings**:
   - Map each team name to its text element ID
   - Example: `Team A` → `g123abc456def`

### Step 4: API Setup (Required)

1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable Google Slides API

2. **Create Service Account**:
   - Go to IAM & Admin → Service Accounts
   - Create service account with Slides API access
   - Download JSON key file

3. **Share Presentation**:
   - Share your Google Slides with the service account email
   - Give "Editor" permissions

### Step 5: Automated Updates

The system will generate API instructions for automated updates:

```javascript
// Example API call structure
const request = {
  presentationId: 'your-presentation-id',
  requests: [
    {
      replaceAllText: {
        containsText: { text: 'TEAM_A_SCORE' },
        replaceText: '150'
      }
    }
  ]
};
```

## Canva Integration

### Step 1: Design Your Slide

1. **Create your design** in Canva
2. **Add text elements** for team scores
3. **Note the position** of each score element
4. **Export or keep design open** for manual updates

### Step 2: Configure Integration

1. In the quiz host dashboard, go to **Slides panel**
2. Select **"Canva"** platform
3. **Configure team mappings** (for reference only):
   - Map team names to element descriptions
   - Example: `Team A` → `Top left score box`

### Step 3: Export Score Data

1. Click **"Export Updated Scores"** for your Canva template
2. Download the JSON file with current scores
3. **Manually copy scores** from JSON to your Canva design

### Canva Automation (Limited)

Canva has limited API access. For bulk updates:

1. **Use Canva's bulk create feature** (Pro accounts)
2. **Create CSV with score data**
3. **Use Canva's data merge** functionality

## Real-Time Updates

### Automatic Slide Updates

When scores change in the quiz:

1. **Host receives notification** of available slide updates
2. **Export buttons show update indicators**
3. **New data files** can be downloaded immediately

### Webhook Integration (Advanced)

For fully automated updates, implement webhooks:

```javascript
// Webhook endpoint receives score updates
app.post('/webhook/score-update', (req, res) => {
  const { sessionId, teams } = req.body;
  
  // Update Google Slides via API
  updateGoogleSlides(sessionId, teams);
  
  // Generate PowerPoint update file
  generatePowerPointUpdate(sessionId, teams);
  
  res.json({ success: true });
});
```

## Best Practices

### Design Guidelines

1. **Keep score areas prominent** but not overwhelming
2. **Use consistent fonts** that match your brand
3. **Ensure good contrast** for readability
4. **Test on projection screens** before live events

### Technical Tips

1. **Test integrations** before your live quiz
2. **Have backup slides** ready with manual scores
3. **Keep templates simple** to avoid update errors
4. **Use version control** for your presentation files

### Performance Optimization

1. **Minimize file sizes** for faster uploads
2. **Use efficient placeholder formats**
3. **Batch updates** when possible
4. **Cache templates** for repeated use

## Troubleshooting

### PowerPoint Issues

**Problem**: Placeholders not found during Find & Replace
- **Solution**: Check placeholder text format exactly matches
- **Tip**: Use "Match case" option in Find & Replace

**Problem**: Formatting lost after replacement
- **Solution**: Format placeholder text before replacement
- **Tip**: Use character formatting, not paragraph formatting

### Google Slides Issues

**Problem**: API authentication failed
- **Solution**: Verify service account permissions
- **Check**: Presentation sharing settings

**Problem**: Element IDs not working
- **Solution**: Use Google Apps Script to get correct IDs
- **Alternative**: Use text-based replacement instead

### Canva Issues

**Problem**: Manual updates are time-consuming
- **Solution**: Use Canva's bulk create features
- **Alternative**: Create multiple versions with different scores

### General Issues

**Problem**: Updates not reflecting in presentation
- **Solution**: Refresh presentation after updates
- **Check**: File permissions and sharing settings

**Problem**: Scores showing old values
- **Solution**: Ensure you're using the latest export
- **Check**: Timestamp in exported JSON file

## Advanced Features

### Custom Formatting

You can customize how scores appear in your slides:

```json
{
  "formatting": {
    "prefix": "Score: ",
    "suffix": " pts",
    "padding": "000"
  }
}
```

### Multiple Slide Updates

Update multiple slides simultaneously:

1. **Create templates** for different slide types
2. **Configure separate mappings** for each template
3. **Export updates** for all templates at once

### Integration with Other Tools

- **OBS Studio**: Use browser source with live scoreboard URL
- **Zoom/Teams**: Share browser window with live scores
- **Physical displays**: Use tablet/monitor with spectator view

## API Reference

### Template Upload
```http
POST /api/sessions/{sessionId}/templates
Content-Type: multipart/form-data

platform: "powerpoint" | "google-slides" | "canva"
mappingConfig: JSON string
template: File (optional for Google Slides)
```

### Export Slides
```http
POST /api/sessions/{sessionId}/export-slides
Content-Type: application/json

{
  "templateId": "template-uuid"
}
```

### Response Format
```json
{
  "type": "json" | "api-instructions" | "manual-update",
  "data": {
    "platform": "powerpoint",
    "teams": [...],
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "filename": "powerpoint-scores-123456789.json"
}
```

This comprehensive integration system ensures your quiz scores stay synchronized with your presentation, maintaining professional appearance while providing real-time updates to your audience.