let initialCategory = ''; // Store the initial category globally
let finalCategory = ''; // Store the final category globally
let formData = {}; // Store all form data for export

// --- Helper Functions ---
function calculateInitialCategory(tumorInVein, arterialPhase, tumorSize, features) {
    // ... (calculation logic remains the same as before) ...
    if (tumorInVein === 'yes') {
        return 'LR-TIV';
    }

    if (!tumorSize || isNaN(tumorSize)) {
        // Handled by validation in event listener
        return '';
    }

    let category = '';
    if (arterialPhase === 'no') {
        if (tumorSize < 20) {
            if (features.length <= 1) category = 'LR-3';
            else category = 'LR-4';
        } else { // >= 20 mm
            if (features.length === 0) category = 'LR-3';
            else category = 'LR-4';
        }
    } else { // arterialPhase === 'yes'
        if (tumorSize < 10) {
            if (features.length === 0) category = 'LR-3';
            else category = 'LR-4';
        } else if (tumorSize >= 10 && tumorSize <= 19) {
            if (features.includes('washout') || features.includes('growth')) category = 'LR-5';
            else if (features.includes('capsule')) category = 'LR-4';
            else category = 'LR-3';
        } else { // >= 20 mm
            if (features.length === 0) category = 'LR-4';
            else category = 'LR-5';
        }
    }
    return category;
}

function adjustCategory(initialCat, malignancyCount, benignityCount) {
    // ... (adjustment logic remains the same as before) ...
    if (initialCat === 'LR-TIV' || initialCat === '') return initialCat;

    let finalCat = initialCat;
    const initialNum = parseInt(initialCat.replace('LR-', ''));

    if (malignancyCount > 0 && benignityCount === 0) {
        if (initialNum < 4) {
            finalCat = `LR-${initialNum + 1}`;
        } else if (initialNum === 4) {
             finalCat = 'LR-4'; // Stays LR-4
        } else { // initialNum === 5
             finalCat = 'LR-5'; // Stays LR-5
        }
    } else if (benignityCount > 0 && malignancyCount === 0) {
        if (initialNum > 3) {
            finalCat = `LR-${initialNum - 1}`;
        } else { // initialNum === 3
             finalCat = 'LR-3'; // Stays LR-3
        }
    }
    return finalCat;
}

function generateExportText(data) {
    let text = `LI-RADS Findings Summary\n`;
    text += `=========================\n\n`;
    text += `Location: ${data.location || 'Not specified'}\n\n`;
    text += `Major Features:\n`;
    text += `- Tumor-in-vein: ${data.tumorInVein}\n`;
    if (data.tumorInVein === 'no') {
        text += `- Arterial phase hyperenhancement: ${data.arterialPhase}\n`;
        text += `- Tumor size: ${data.tumorSize} mm\n`;
        text += `- Enhancing capsule: ${data.features.includes('capsule') ? 'Yes' : 'No'}\n`;
        text += `- Non-peripheral washout: ${data.features.includes('washout') ? 'Yes' : 'No'}\n`;
        text += `- Threshold growth: ${data.features.includes('growth') ? 'Yes' : 'No'}\n`;
    }
    text += `\n`;

    if (data.initialCategory !== 'LR-TIV' && (data.afMalignancyGeneral.length > 0 || data.afHccSpecific.length > 0 || data.afBenignity.length > 0)) {
        text += `Ancillary Features:\n`;
        if (data.afMalignancyGeneral.length > 0) {
            text += `  Favoring Malignancy (General):\n`;
            data.afMalignancyGeneral.forEach(f => text += `    - ${getFeatureText(f)}\n`);
        }
        if (data.afHccSpecific.length > 0) {
            text += `  Favoring HCC (Specific):\n`;
            data.afHccSpecific.forEach(f => text += `    - ${getFeatureText(f)}\n`);
        }
        if (data.afBenignity.length > 0) {
            text += `  Favoring Benignity:\n`;
            data.afBenignity.forEach(f => text += `    - ${getFeatureText(f)}\n`);
        }
        text += `\n`;
    } else if (data.initialCategory !== 'LR-TIV') {
         text += `Ancillary Features: None Selected / detected\n\n`;
    }


    text += `Result:\n`;
    // Combine final category and location
    const locationText = data.location ? ` in ${data.location}` : '';
    text += `- ${data.finalCategory} observation${locationText}\n`;

    return text;
}

// Helper to get readable text for feature values
function getFeatureText(value) {
    // Find the label associated with the checkbox value
    const checkbox = document.querySelector(`input[value="${value}"]`);
    return checkbox ? checkbox.parentElement.textContent.trim() : value; // Fallback to value if label not found
}


// --- Event Listeners ---

// Listener for Initial Calculation
document.getElementById('calculateInitialBtn').addEventListener('click', function(e) {
    e.preventDefault();

    // Reset global data and hide export section
    formData = {};
    initialCategory = '';
    finalCategory = '';
    document.getElementById('exportOutputSection').style.display = 'none';
    document.getElementById('exportBtn').style.display = 'none';


    // Get common inputs
    formData.location = document.getElementById('tumorLocation').value;
    const tumorInVeinInput = document.querySelector('input[name="tumorInVein"]:checked');

    if (!tumorInVeinInput) {
         document.getElementById('result').innerHTML = '<span style="color:red;">Please select Tumor-in-vein status.</span>';
         return;
    }
    formData.tumorInVein = tumorInVeinInput.value;

    // If TIV is yes, calculate and stop
    if (formData.tumorInVein === 'yes') {
        initialCategory = calculateInitialCategory(formData.tumorInVein, null, null, []);
        finalCategory = initialCategory; // Final is same as initial for TIV
        formData.initialCategory = initialCategory;
        formData.finalCategory = finalCategory;
        document.getElementById('result').innerHTML = `Final Category: <span style="color:#e74c3c; font-size:24px;">${finalCategory}</span>`;
        document.getElementById('ancillaryFeaturesSection').style.display = 'none';
        document.getElementById('calculateInitialBtn').style.display = 'block';
        document.getElementById('adjustCategoryBtn').style.display = 'none';
        document.getElementById('exportBtn').style.display = 'block'; // Show export for TIV case too
        return;
    }

    // Continue if TIV is no
    const arterialPhaseInput = document.querySelector('input[name="arterialPhase"]:checked');
    const tumorSizeInput = document.getElementById('tumorSize');
    const featuresInputs = document.querySelectorAll('input[name="features"]:checked');

    // Validation for remaining major features
    if (!arterialPhaseInput) {
         document.getElementById('result').innerHTML = '<span style="color:red;">Please select Arterial phase status.</span>';
         return;
    }
     if (!tumorSizeInput.value) {
          document.getElementById('result').innerHTML = '<span style="color:red;">Please enter tumor size.</span>';
          return;
     }
     const tumorSize = parseInt(tumorSizeInput.value);
     if (isNaN(tumorSize) || tumorSize <= 0) {
          document.getElementById('result').innerHTML = '<span style="color:red;">Please enter a valid tumor size.</span>';
          return;
     }

    // Store remaining major feature data
    formData.arterialPhase = arterialPhaseInput.value;
    formData.tumorSize = tumorSize;
    formData.features = Array.from(featuresInputs).map(el => el.value);

    // Calculate initial category
    initialCategory = calculateInitialCategory(formData.tumorInVein, formData.arterialPhase, formData.tumorSize, formData.features);
    formData.initialCategory = initialCategory; // Store initial
    finalCategory = initialCategory; // Initially, final is same as initial
    formData.finalCategory = finalCategory; // Store final (might be updated later)

    const resultBox = document.getElementById('result');
    if (initialCategory) {
        resultBox.innerHTML = `Initial Category: ${initialCategory}. Please select Ancillary Features below.`;
        document.getElementById('ancillaryFeaturesSection').style.display = 'block';
        document.getElementById('calculateInitialBtn').style.display = 'none';
        document.getElementById('adjustCategoryBtn').style.display = 'block';
        document.getElementById('exportBtn').style.display = 'none'; // Hide export until adjustment
    } else {
         resultBox.innerHTML = '<span style="color:red;">Could not determine initial category. Check inputs.</span>';
    }
});

// Listener for Adjusting Category with Ancillary Features
document.getElementById('adjustCategoryBtn').addEventListener('click', function() {
    const afMalignancyGeneral = document.querySelectorAll('input[name="af_malignancy_general"]:checked');
    const afHccSpecific = document.querySelectorAll('input[name="af_hcc_specific"]:checked');
    const afBenignity = document.querySelectorAll('input[name="af_benignity"]:checked');

    const malignancyCount = afMalignancyGeneral.length + afHccSpecific.length;
    const benignityCount = afBenignity.length;

    // Store ancillary features data
    formData.afMalignancyGeneral = Array.from(afMalignancyGeneral).map(el => el.value);
    formData.afHccSpecific = Array.from(afHccSpecific).map(el => el.value);
    formData.afBenignity = Array.from(afBenignity).map(el => el.value);

    // Adjust category
    finalCategory = adjustCategory(initialCategory, malignancyCount, benignityCount);
    formData.finalCategory = finalCategory; // Update final category in stored data

    const resultBox = document.getElementById('result');
    resultBox.innerHTML = `Final Category: <span style="color:#e74c3c; font-size:24px;">${finalCategory}</span>`;

    // Show export button, hide adjust button
    document.getElementById('adjustCategoryBtn').style.display = 'none';
    document.getElementById('exportBtn').style.display = 'block';
});

// Listener for Export Button
document.getElementById('exportBtn').addEventListener('click', function() {
    const exportText = generateExportText(formData);
    const exportOutputArea = document.getElementById('exportOutput');
    exportOutputArea.value = exportText;
    document.getElementById('exportOutputSection').style.display = 'block';
    exportOutputArea.select(); // Select text for easy copying
});


// Listener to show/hide subsequent questions based on Tumor in Vein selection
document.querySelectorAll('input[name="tumorInVein"]').forEach(radio => {
     radio.addEventListener('change', function() {
          const arterialPhaseGroup = document.getElementById('arterialPhase');
          const tumorSizeGroup = document.getElementById('tumorSizeGroup');
          const featuresGroup = document.getElementById('featuresGroup');
          const ancillaryFeaturesSection = document.getElementById('ancillaryFeaturesSection');
          const calculateInitialBtn = document.getElementById('calculateInitialBtn');
          const adjustCategoryBtn = document.getElementById('adjustCategoryBtn');
          const exportBtn = document.getElementById('exportBtn');
          const exportOutputSection = document.getElementById('exportOutputSection');
          const resultBox = document.getElementById('result');

          // Reset state on change
          resultBox.innerHTML = '';
          ancillaryFeaturesSection.style.display = 'none';
          adjustCategoryBtn.style.display = 'none';
          exportBtn.style.display = 'none';
          exportOutputSection.style.display = 'none';
          calculateInitialBtn.style.display = 'block';


          if (this.value === 'yes') {
               arterialPhaseGroup.style.display = 'none';
               tumorSizeGroup.style.display = 'none';
               featuresGroup.style.display = 'none';
          } else {
               arterialPhaseGroup.style.display = 'block';
               // Keep size/features hidden until APHE is selected
               tumorSizeGroup.style.display = 'none';
               featuresGroup.style.display = 'none';
          }
     });
     // Trigger change on load if pre-selected
     if (radio.checked) radio.dispatchEvent(new Event('change'));
});

// Listener to show Tumor Size and Major Features when Arterial Phase is selected
document.querySelectorAll('input[name="arterialPhase"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const tumorInVeinSelected = document.querySelector('input[name="tumorInVein"]:checked');
        // Only proceed if TIV is 'no'
        if (tumorInVeinSelected && tumorInVeinSelected.value === 'no') {
            document.getElementById('tumorSizeGroup').style.display = 'block';
            document.getElementById('featuresGroup').style.display = 'block';
        }
         // Reset subsequent sections
         document.getElementById('ancillaryFeaturesSection').style.display = 'none';
         document.getElementById('calculateInitialBtn').style.display = 'block';
         document.getElementById('adjustCategoryBtn').style.display = 'none';
         document.getElementById('exportBtn').style.display = 'none';
         document.getElementById('exportOutputSection').style.display = 'none';
         document.getElementById('result').innerHTML = '';
    });
     // Trigger change on load if pre-selected AND TIV is 'no'
     const tumorInVeinSelected = document.querySelector('input[name="tumorInVein"]:checked');
     if (radio.checked && tumorInVeinSelected && tumorInVeinSelected.value === 'no') {
          radio.dispatchEvent(new Event('change'));
     }
});


// Initial state setup on load
document.addEventListener('DOMContentLoaded', () => {
     // Reset form state visually
     const tumorInVeinSelected = document.querySelector('input[name="tumorInVein"]:checked');
     const arterialPhaseSelected = document.querySelector('input[name="arterialPhase"]:checked');

     document.getElementById('arterialPhase').style.display = (tumorInVeinSelected && tumorInVeinSelected.value === 'yes') ? 'none' : 'block';
     document.getElementById('tumorSizeGroup').style.display = (arterialPhaseSelected && tumorInVeinSelected && tumorInVeinSelected.value === 'no') ? 'block' : 'none';
     document.getElementById('featuresGroup').style.display = (arterialPhaseSelected && tumorInVeinSelected && tumorInVeinSelected.value === 'no') ? 'block' : 'none';

     document.getElementById('ancillaryFeaturesSection').style.display = 'none';
     document.getElementById('adjustCategoryBtn').style.display = 'none';
     document.getElementById('exportBtn').style.display = 'none';
     document.getElementById('exportOutputSection').style.display = 'none';
     document.getElementById('calculateInitialBtn').style.display = 'block';
     document.getElementById('result').innerHTML = ''; // Clear result area
});

// Listener for Reset Button
document.getElementById('resetBtn').addEventListener('click', function() {
     // Reset the form fields
     document.getElementById('liradsForm').reset();

     // Reset global variables
     initialCategory = '';
     finalCategory = '';
     formData = {};

     // Hide dynamic sections
     document.getElementById('tumorSizeGroup').style.display = 'none';
     document.getElementById('featuresGroup').style.display = 'none';
     document.getElementById('ancillaryFeaturesSection').style.display = 'none';
     document.getElementById('exportOutputSection').style.display = 'none';

     // Reset button visibility
     document.getElementById('calculateInitialBtn').style.display = 'block';
     document.getElementById('adjustCategoryBtn').style.display = 'none';
     document.getElementById('exportBtn').style.display = 'none';

     // Clear result display
     document.getElementById('result').innerHTML = '';

     // Ensure Arterial Phase is visible (as TIV is now reset)
     document.getElementById('arterialPhase').style.display = 'block';
});
