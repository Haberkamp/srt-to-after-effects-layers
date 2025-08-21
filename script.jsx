// SRT to After Effects Text Layers Script
// Creates text layers from SRT subtitle files

(function () {
  "use strict";

  // Parse SRT timecode to After Effects time (seconds)
  function parseTimecode(timecode) {
    // Format: "00:00:20,000" -> seconds
    var parts = timecode.split(":");
    var hours = parseInt(parts[0]);
    var minutes = parseInt(parts[1]);
    var secParts = parts[2].split(",");
    var seconds = parseInt(secParts[0]);
    var milliseconds = parseInt(secParts[1]);

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
  }

  // Polyfill for trim() method (not available in ExtendScript)
  function trim(str) {
    return str.replace(/^\s+|\s+$/g, "");
  }

  // Parse SRT file content
  function parseSRT(content) {
    var subtitles = [];
    var blocks = content.split(/\n\s*\n/); // Split by double newlines

    for (var i = 0; i < blocks.length; i++) {
      var block = trim(blocks[i]);
      if (block === "") continue;

      var lines = block.split("\n");
      if (lines.length < 3) continue;

      // Line 0: sequence number
      var sequence = parseInt(lines[0]);

      // Line 1: timecodes
      var timeMatch = lines[1].match(
        /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
      );
      if (!timeMatch) continue;

      var startTime = parseTimecode(timeMatch[1]);
      var endTime = parseTimecode(timeMatch[2]);

      // Lines 2+: subtitle text
      var text = lines.slice(2).join("\n");

      subtitles.push({
        sequence: sequence,
        startTime: startTime,
        endTime: endTime,
        text: text,
      });
    }

    return subtitles;
  }

  // Create text layer from subtitle data
  function createTextLayer(comp, subtitle, layerIndex) {
    var textLayer = comp.layers.addText(subtitle.text);
    textLayer.name = "Subtitle " + subtitle.sequence;

    // Set timing
    textLayer.inPoint = subtitle.startTime;
    textLayer.outPoint = subtitle.endTime;

    // Basic text styling
    var textProp = textLayer.property("Source Text");
    var textDocument = textProp.value;
    textDocument.fontSize = 48;
    textDocument.fillColor = [1, 1, 1]; // White
    textDocument.font = "Arial";
    textDocument.justification = ParagraphJustification.CENTER_JUSTIFY;
    textProp.setValue(textDocument);

    // Position text at bottom of comp
    var position = textLayer.property("Transform").property("Position");
    position.setValue([comp.width / 2, comp.height * 0.85]);

    // Move layer to proper position in timeline
    textLayer.moveToBeginning();

    return textLayer;
  }

  // Main function
  function main() {
    alert("Script started");

    // Check if a composition is active
    var comp = app.project.activeItem;
    if (!comp || !(comp instanceof CompItem)) {
      alert("Please select a composition first.");
      return;
    }

    // File selection dialog
    var srtFile = File.openDialog("Select SRT file", "*.srt");
    if (!srtFile) {
      return; // User cancelled
    }

    // Read file
    srtFile.open("r");
    var content = srtFile.read();
    srtFile.close();

    if (!content) {
      alert("Could not read the SRT file.");
      return;
    }

    // Parse SRT content
    var subtitles = parseSRT(content);
    if (subtitles.length === 0) {
      alert("No valid subtitles found in the SRT file.");
      return;
    }

    // Begin undo group
    app.beginUndoGroup("Import SRT Subtitles");

    try {
      // Create text layers
      for (var i = 0; i < subtitles.length; i++) {
        createTextLayer(comp, subtitles[i], i);
      }

      alert("Successfully created " + subtitles.length + " subtitle layers!");
    } catch (error) {
      alert("Error creating text layers: " + error.toString());
    } finally {
      app.endUndoGroup();
    }
  }

  // Run the script
  main();
})();
