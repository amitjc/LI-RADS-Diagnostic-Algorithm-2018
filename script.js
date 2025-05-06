let initialCategory = ''; // Store the initial category globally
let finalCategory = ''; // Store the final category globally
let formData = {}; // Store all form data for export
let isEligible = true; // Track eligibility status

// --- Elements ---
const patientAgeInput = document.getElementById('patientAge');
const ageWarningDiv = document.getElementById('ageWarning');
const riskFactorCheckboxes = document.querySelectorAll('input[name="riskFactors"]'); // All risk factors
const disablingConditionCheckboxes = document.querySelectorAll('.disabling-condition'); // Specific disabling ones
const conditionWarningDiv = document.getElementById('conditionWarning');
const formElementsToDisable = [
    document.getElementById('locationGroup'),
    document.getElementById('tumorInVein'),
    document.getElementById('arterialPhase'),
    document.getElementById('tumorSizeGroup'),
    document.getElementById('featuresGroup'),
    document.getElementById('ancillaryFeaturesSection'),
    document.getElementById('calculateInitialBtn'),
    document.getElementById('adjustCategoryBtn'),
    // Add individual inputs/buttons within groups if needed for finer control
    document.getElementById('tumorLocation'),
    ...document.querySelectorAll('input[name="tumorInVein"]'),
    ...document.querySelectorAll('input[name="arterialPhase"]'),
    document.getElementById('tumorSize'),
    ...document.querySelectorAll('input[name="features"]'),
    ...document.querySelectorAll('#ancillaryFeaturesSection input[type="checkbox"]')
];


// --- Eligibility Check ---
function checkEligibilityAndControlForm() {
    const age = parseInt(patientAgeInput.value);
    const isUnderAge = !isNaN(age) && age < 18;
    const hasDisablingCondition = Array.from(disablingConditionCheckboxes).some(cb => cb.checked);

    ageWarningDiv.style.display = isUnderAge ? 'block' : 'none';
    conditionWarningDiv.style.display = hasDisablingCondition ? 'block' : 'none';

    const overallEligibility = !isUnderAge && !hasDisablingCondition; // Renamed from isEligible for clarity

    const isAgeFilled = patientAgeInput.value.trim() !== '';
    const anyRiskFactorSelected = Array.from(riskFactorCheckboxes).some(cb => cb.checked);

    const showSubsequentFields = overallEligibility && isAgeFilled && anyRiskFactorSelected; // Changed OR to AND

    // Disable/Enable form elements based on eligibility and prerequisites
    formElementsToDisable.forEach(el => {
        if (!el) return;

        const isContainer = el.tagName === 'DIV' || el.tagName === 'FIELDSET';
        const isControl = ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(el.tagName);

        if (showSubsequentFields) {
            if (isContainer) {
                // For primary containers like locationGroup, tumorInVein (div): make them visible.
                // The arterialPhase group and subsequent groups (tumorSizeGroup, featuresGroup, ancillaryFeaturesSection)
                // have their display managed by specific event listeners (e.g., tumorInVein change).
                if (el.id === 'locationGroup' || el.id === 'tumorInVein') {
                    el.style.display = 'block';
                }
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            }
            if (isControl) {
                el.disabled = false;
                // calculateInitialBtn should be visible if showSubsequentFields
                if (el.id === 'calculateInitialBtn') {
                    el.style.display = 'block';
                }
                // adjustCategoryBtn and exportBtn visibility is handled by other logic when showSubsequentFields is true
            }
        } else { // !showSubsequentFields
            if (isContainer) {
                // Hide all subsequent containers if prerequisites not met or ineligible
                el.style.display = 'none';
                el.style.opacity = '0.5';
                el.style.pointerEvents = 'none';
            }
            if (isControl) {
                el.disabled = true;
                if (el.tagName === 'BUTTON') { // Hide all subsequent buttons
                    el.style.display = 'none';
                }
            }
        }
    });

    // After the loop, explicitly manage visibility of TIV/APHE dependent sections if showSubsequentFields is true
    if (showSubsequentFields) {
        const calcBtn = document.getElementById('calculateInitialBtn');
        if (calcBtn) { // Ensure calculate button is definitely visible and enabled
            calcBtn.style.display = 'block';
            calcBtn.disabled = false;
        }

        const tumorInVeinSelected = document.querySelector('input[name="tumorInVein"]:checked');
        const arterialPhaseSelected = document.querySelector('input[name="arterialPhase"]:checked');
        const arterialPhaseDiv = document.getElementById('arterialPhase'); // This is a container in formElementsToDisable
        const tumorSizeGroupDiv = document.getElementById('tumorSizeGroup');
        const featuresGroupDiv = document.getElementById('featuresGroup');

        // arterialPhaseDiv visibility is already handled by the loop if it's in formElementsToDisable.
        // If TIV is 'yes', its specific listener should hide arterialPhaseDiv.
        // We ensure that logic is respected here.
        if (tumorInVeinSelected && tumorInVeinSelected.value === 'yes') {
            if (arterialPhaseDiv) arterialPhaseDiv.style.display = 'none'; // TIV listener also does this
            if (tumorSizeGroupDiv) tumorSizeGroupDiv.style.display = 'none';
            if (featuresGroupDiv) featuresGroupDiv.style.display = 'none';
        } else { // TIV is 'no' or not selected
            // arterialPhaseDiv should be 'block' from the loop if showSubsequentFields is true.
            // If TIV is 'no' and APHE is selected, show size/features.
            if (arterialPhaseSelected) {
                if (tumorSizeGroupDiv) tumorSizeGroupDiv.style.display = 'block';
                if (featuresGroupDiv) featuresGroupDiv.style.display = 'block';
            } else {
                if (tumorSizeGroupDiv) tumorSizeGroupDiv.style.display = 'none';
                if (featuresGroupDiv) featuresGroupDiv.style.display = 'none';
            }
        }
        // Ancillary features, adjust button, export button visibility are handled by their respective triggering events.
    } else { // !showSubsequentFields
        // Clear results and ensure all dependent sections/buttons are hidden
        if (document.getElementById('result')) document.getElementById('result').innerHTML = '';
        if (document.getElementById('tumorSizeGroup')) document.getElementById('tumorSizeGroup').style.display = 'none';
        if (document.getElementById('featuresGroup')) document.getElementById('featuresGroup').style.display = 'none';
        if (document.getElementById('ancillaryFeaturesSection')) document.getElementById('ancillaryFeaturesSection').style.display = 'none';
        if (document.getElementById('adjustCategoryBtn')) document.getElementById('adjustCategoryBtn').style.display = 'none';
        if (document.getElementById('exportBtn')) document.getElementById('exportBtn').style.display = 'none';
        if (document.getElementById('exportOutputSection')) document.getElementById('exportOutputSection').style.display = 'none';
        // calculateInitialBtn is already handled by the loop to be hidden and disabled.
    }
    isEligible = overallEligibility; // Update global isEligible based on overall checks for other parts of the script that might use it
    return overallEligibility; // Return overall eligibility for the calculate button listener
}


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

// Listen for changes in age or disabling conditions or any risk factor
patientAgeInput.addEventListener('input', checkEligibilityAndControlForm);
riskFactorCheckboxes.forEach(checkbox => { // Listen to ALL risk factor checkboxes
    checkbox.addEventListener('change', checkEligibilityAndControlForm);
});
// Note: disablingConditionCheckboxes is a subset of riskFactorCheckboxes if they share name="riskFactors"
// The loop above covers all, including disabling ones.


// Listener for Initial Calculation
// This button is now only relevant if Tumor-in-vein is 'No'.
document.getElementById('calculateInitialBtn').addEventListener('click', function(e) {
    e.preventDefault();

    // First, check eligibility (overall age/condition)
    if (!checkEligibilityAndControlForm()) {
        document.getElementById('result').innerHTML = '<span style="color:red;">Algorithm not applicable based on age or condition.</span>';
        return; // Stop calculation
    }

    // Reset categories and hide export section before new calculation
    initialCategory = '';
    finalCategory = '';
    document.getElementById('exportOutputSection').style.display = 'none';
    document.getElementById('exportBtn').style.display = 'none';

    // Capture current form data for this calculation path
    // formData.tumorInVein should be 'no' if this button is active.
    // formData.location and formData.tumorInVein are set by the tumorInVein radio listener.
    // If they weren't (e.g. direct load with TIV No pre-selected), ensure they are captured.
    const locationInput = document.getElementById('tumorLocation');
    if (locationInput) formData.location = locationInput.value;
    
    const tumorInVeinInput = document.querySelector('input[name="tumorInVein"]:checked');
    // This button should only be clickable if TIV is 'no'.
    // The radio listener for TIV already sets formData.tumorInVein.
    if (!tumorInVeinInput || tumorInVeinInput.value === 'yes') {
        // This case should ideally not happen if UI logic is correct
        // but as a fallback:
        console.error("Calculate button clicked with TIV not 'No'. UI logic error?");
        return;
    }
    formData.tumorInVein = 'no';


    // Continue if TIV is no (which is the assumption for this button)
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
          const locationInput = document.getElementById('tumorLocation');

          // Reset common UI elements and formData parts
          resultBox.innerHTML = '';
          ancillaryFeaturesSection.style.display = 'none';
          adjustCategoryBtn.style.display = 'none';
          exportBtn.style.display = 'none';
          exportOutputSection.style.display = 'none';

          initialCategory = ''; // Reset global category
          finalCategory = '';   // Reset global category

          // Reset relevant parts of formData
          formData = {
              location: locationInput ? locationInput.value : (formData.location || ''), // Preserve location if already set
              tumorInVein: this.value,
              // Clear downstream data
              arterialPhase: undefined,
              tumorSize: undefined,
              features: [],
              afMalignancyGeneral: [],
              afHccSpecific: [],
              afBenignity: [],
              initialCategory: '',
              finalCategory: ''
          };


          if (this.value === 'yes') {
               arterialPhaseGroup.style.display = 'none';
               tumorSizeGroup.style.display = 'none';
               featuresGroup.style.display = 'none';
               calculateInitialBtn.style.display = 'none'; // Hide, calculation is automatic

               // Perform TIV calculation immediately
               initialCategory = 'LR-TIV';
               finalCategory = initialCategory;
               formData.initialCategory = initialCategory;
               formData.finalCategory = finalCategory;

               resultBox.innerHTML = `Final Category: <span style="color:#e74c3c; font-size:24px;">${finalCategory}</span>`;
               exportBtn.style.display = 'block';
          } else { // this.value === 'no'
               arterialPhaseGroup.style.display = 'block';
               tumorSizeGroup.style.display = 'none'; // Hide until APHE selected
               featuresGroup.style.display = 'none';  // Hide until APHE selected
               calculateInitialBtn.style.display = 'block'; // Show for manual calculation path
               // exportBtn is already hidden from the top of this function
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
     // Ensure all conditionally visible sections start hidden.
     // Their visibility will be correctly set by checkEligibilityAndControlForm and subsequent event listeners.
     document.getElementById('locationGroup').style.display = 'none';
     document.getElementById('tumorInVein').style.display = 'none';
     document.getElementById('arterialPhase').style.display = 'none';
     document.getElementById('tumorSizeGroup').style.display = 'none';
     document.getElementById('featuresGroup').style.display = 'none';
     document.getElementById('ancillaryFeaturesSection').style.display = 'none';

     // Ensure buttons that depend on state start hidden.
     // calculateInitialBtn's visibility is now primarily handled by checkEligibilityAndControlForm and TIV listener.
     // Start it hidden, checkEligibilityAndControlForm might show it if age/risk are met AND TIV is not 'yes'.
     document.getElementById('calculateInitialBtn').style.display = 'none';
     document.getElementById('adjustCategoryBtn').style.display = 'none';
     document.getElementById('exportBtn').style.display = 'none';
     document.getElementById('exportOutputSection').style.display = 'none';
     document.getElementById('result').innerHTML = ''; // Clear result area

     // Check eligibility on load. This function will:
     // 1. Determine if age/risk factors allow showing locationGroup and tumorInVein.
     // 2. If so, it makes them visible.
     // 3. It correctly leaves arterialPhase, tumorSizeGroup, etc., hidden at this stage,
     //    as their visibility depends on further user interaction (selecting TIV 'No', etc.).
     // 4. It also manages the initial visibility of calculateInitialBtn.
     checkEligibilityAndControlForm();

     // Note: The event listeners for radio buttons (like tumorInVein, arterialPhase)
     // are set up with logic to dispatch 'change' events if they are pre-checked.
     // These dispatches occur when the listeners are attached.
     // So, if tumorInVein 'No' is pre-checked, its change handler will run
     // and correctly show the arterialPhase group after checkEligibilityAndControlForm
     // has potentially made the tumorInVein group itself visible.
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

     // Reset button visibility - calculateInitialBtn should be hidden initially after reset.
     // checkEligibilityAndControlForm will manage its visibility.
     document.getElementById('calculateInitialBtn').style.display = 'none';
     document.getElementById('adjustCategoryBtn').style.display = 'none';
     document.getElementById('exportBtn').style.display = 'none';

     // Clear result display
     document.getElementById('result').innerHTML = '';

     // Hide warnings
     ageWarningDiv.style.display = 'none';
     conditionWarningDiv.style.display = 'none';

     // Ensure Arterial Phase is hidden (as TIV is now reset and not selected)
     document.getElementById('arterialPhase').style.display = 'none';

     // Re-check eligibility and reset form controls state
     // This will show location and TIV if age/risk are met.
     // It will correctly leave APHE hidden.
     checkEligibilityAndControlForm();
});
