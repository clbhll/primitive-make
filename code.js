// Primitive Make — Figma Plugin (sandbox)
// Runs in Figma's main thread. Communicates with ui.html via postMessage.

figma.showUI(__html__, { width: 520, height: 680, themeColors: true });

// ─── Helpers ────────────────────────────────────────────────────────

function hexToRgb01(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
  return {
    r: parseInt(hex.substring(0, 2), 16) / 255,
    g: parseInt(hex.substring(2, 4), 16) / 255,
    b: parseInt(hex.substring(4, 6), 16) / 255,
    a: 1,
  };
}

// ─── Message handler ────────────────────────────────────────────────

figma.ui.onmessage = async function (msg) {

  // ── Push ramps to Figma variables ──────────────────────────────
  if (msg.type === "push-variables") {
    var ramps = msg.ramps; // [{ name, steps: [{ step, hex }] }]
    var collectionName = msg.collectionName || "Primitives";

    try {
      // 1. Check for existing collection named the same
      var collections = await figma.variables.getLocalVariableCollectionsAsync();
      var existing = null;
      for (var i = 0; i < collections.length; i++) {
        if (collections[i].name === collectionName) {
          existing = collections[i];
          break;
        }
      }

      // 2. Check for duplicate variable names
      var duplicates = [];
      if (existing) {
        var existingVars = await figma.variables.getLocalVariablesAsync("COLOR");
        var existingNames = {};
        for (var v = 0; v < existingVars.length; v++) {
          if (existingVars[v].variableCollectionId === existing.id) {
            existingNames[existingVars[v].name] = existingVars[v];
          }
        }
        for (var r = 0; r < ramps.length; r++) {
          var ramp = ramps[r];
          for (var s = 0; s < ramp.steps.length; s++) {
            var varName = ramp.name + "/" + ramp.steps[s].step;
            if (existingNames[varName]) {
              duplicates.push(varName);
            }
          }
        }
      }

      // 3. If duplicates, ask user
      if (duplicates.length > 0) {
        figma.ui.postMessage({
          type: "confirm-overwrite",
          duplicates: duplicates,
          ramps: ramps,
          collectionName: collectionName,
        });
        return;
      }

      // 4. No duplicates — create
      await createVariables(ramps, collectionName, existing, false);

    } catch (err) {
      figma.ui.postMessage({ type: "error", message: String(err) });
    }
  }

  // ── User confirmed overwrite ───────────────────────────────────
  if (msg.type === "confirm-overwrite-yes") {
    try {
      var collections = await figma.variables.getLocalVariableCollectionsAsync();
      var existing = null;
      for (var i = 0; i < collections.length; i++) {
        if (collections[i].name === msg.collectionName) {
          existing = collections[i];
          break;
        }
      }
      await createVariables(msg.ramps, msg.collectionName, existing, true);
    } catch (err) {
      figma.ui.postMessage({ type: "error", message: String(err) });
    }
  }

  // ── User declined overwrite — skip duplicates ──────────────────
  if (msg.type === "confirm-overwrite-skip") {
    try {
      var collections = await figma.variables.getLocalVariableCollectionsAsync();
      var existing = null;
      for (var i = 0; i < collections.length; i++) {
        if (collections[i].name === msg.collectionName) {
          existing = collections[i];
          break;
        }
      }
      await createVariables(msg.ramps, msg.collectionName, existing, false);
    } catch (err) {
      figma.ui.postMessage({ type: "error", message: String(err) });
    }
  }

  // ── Resize ─────────────────────────────────────────────────────
  if (msg.type === "resize") {
    figma.ui.resize(msg.width, msg.height);
  }

  // ── Cancel ─────────────────────────────────────────────────────
  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};

// ─── Create variables ───────────────────────────────────────────────

async function createVariables(ramps, collectionName, existingCollection, overwrite) {
  var collection = existingCollection || figma.variables.createVariableCollection(collectionName);
  var modeId = collection.modes[0].modeId;

  // Build map of existing vars in this collection
  var existingVarMap = {};
  if (existingCollection) {
    var allVars = await figma.variables.getLocalVariablesAsync("COLOR");
    for (var v = 0; v < allVars.length; v++) {
      if (allVars[v].variableCollectionId === collection.id) {
        existingVarMap[allVars[v].name] = allVars[v];
      }
    }
  }

  var created = 0;
  var updated = 0;
  var skipped = 0;

  for (var r = 0; r < ramps.length; r++) {
    var ramp = ramps[r];
    for (var s = 0; s < ramp.steps.length; s++) {
      var step = ramp.steps[s];
      var varName = ramp.name + "/" + step.step;
      var rgb = hexToRgb01(step.hex);

      if (existingVarMap[varName]) {
        if (overwrite) {
          existingVarMap[varName].setValueForMode(modeId, rgb);
          updated++;
        } else {
          skipped++;
        }
      } else {
        var newVar = figma.variables.createVariable(varName, collection, "COLOR");
        newVar.setValueForMode(modeId, rgb);
        created++;
      }
    }
  }

  figma.ui.postMessage({
    type: "success",
    created: created,
    updated: updated,
    skipped: skipped,
  });

  figma.notify(
    "✓ " + created + " created" +
    (updated > 0 ? ", " + updated + " updated" : "") +
    (skipped > 0 ? ", " + skipped + " skipped" : ""),
    { timeout: 4000 }
  );
}
