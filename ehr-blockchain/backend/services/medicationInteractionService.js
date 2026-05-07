// backend/services/medicationInteractionService.js

// Common medication interactions database
const KNOWN_INTERACTIONS = {
  Warfarin: ["Aspirin", "NSAIDs", "Acetaminophen", "Statins"],
  Metformin: ["Contrast dyes", "Alcohol"],
  Lisinopril: ["NSAIDs", "Potassium supplements", "Diuretics"],
  Metoprolol: ["Calcium channel blockers", "NSAIDs"],
  Simvastatin: ["Erythromycin", "Clarithromycin", "NSAIDs"],
  Albuterol: ["Beta blockers", "NSAIDs"],
  Sertraline: ["MAOIs", "NSAIDs", "Warfarin"],
  Amoxicillin: ["Methotrexate", "Oral contraceptives"],
  Aspirin: ["NSAIDs", "Warfarin", "Methotrexate"],
  NSAIDs: [
    "Aspirin",
    "Warfarin",
    "ACE inhibitors",
    "Diuretics",
    "Methotrexate",
  ],
};

// Severity levels: "mild", "moderate", "severe", "contraindicated"
const SEVERITY_MAP = {
  "Warfarin-Aspirin": "severe",
  "Warfarin-NSAIDs": "severe",
  "Metformin-Contrast": "severe",
  "Lisinopril-NSAIDs": "moderate",
  "Metoprolol-Verapamil": "severe",
};

class MedicationInteractionService {
  /**
   * Check for interactions between medications
   * @param {Array} medications - Array of medication objects {name, dosage, frequency}
   * @returns {Array} Array of interaction warnings
   */
  static checkInteractions(medications) {
    if (!medications || medications.length < 2) return [];

    const interactions = [];
    const drugNames = medications.map((m) => m.name.toLowerCase());

    for (let i = 0; i < drugNames.length; i++) {
      for (let j = i + 1; j < drugNames.length; j++) {
        const drug1 = drugNames[i];
        const drug2 = drugNames[j];

        // Check if interaction exists
        const severity = this._checkPairInteraction(drug1, drug2);
        if (severity) {
          interactions.push({
            drug1: medications[i].name,
            drug2: medications[j].name,
            severity,
            message: this._generateWarningMessage(
              medications[i].name,
              medications[j].name,
              severity,
            ),
            recommendation: this._getRecommendation(severity),
          });
        }
      }
    }

    return interactions;
  }

  /**
   * Check for adverse effects in lab results and vital signs
   * @param {Object} vitals - Vital signs object
   * @param {Array} labResults - Lab results array
   * @returns {Array} Array of alerts
   */
  static checkAbnormalities(vitals, labResults) {
    const alerts = [];

    // Check vital signs
    if (vitals) {
      if (vitals.bloodPressure) {
        const [systolic, diastolic] = vitals.bloodPressure
          .split("/")
          .map(Number);
        if (systolic > 180 || diastolic > 120) {
          alerts.push({
            type: "critical",
            field: "Blood Pressure",
            value: vitals.bloodPressure,
            message: "Hypertensive crisis - immediate intervention required",
          });
        } else if (systolic > 140 || diastolic > 90) {
          alerts.push({
            type: "warning",
            field: "Blood Pressure",
            value: vitals.bloodPressure,
            message: "Elevated blood pressure - monitor closely",
          });
        }
      }

      if (
        vitals.heartRate &&
        (vitals.heartRate < 40 || vitals.heartRate > 120)
      ) {
        alerts.push({
          type: vitals.heartRate > 120 ? "warning" : "critical",
          field: "Heart Rate",
          value: vitals.heartRate,
          message:
            vitals.heartRate > 120
              ? "Tachycardia detected"
              : "Bradycardia - critical",
        });
      }

      if (
        vitals.temperature &&
        (vitals.temperature > 39.5 || vitals.temperature < 35)
      ) {
        alerts.push({
          type: vitals.temperature > 39.5 ? "warning" : "critical",
          field: "Temperature",
          value: vitals.temperature,
          message:
            vitals.temperature > 39.5 ? "High fever" : "Hypothermia - critical",
        });
      }

      if (vitals.oxygenSat && vitals.oxygenSat < 90) {
        alerts.push({
          type: "critical",
          field: "Oxygen Saturation",
          value: vitals.oxygenSat,
          message: "Low oxygen saturation - immediate action required",
        });
      }
    }

    // Check lab results for abnormal flags
    if (labResults && Array.isArray(labResults)) {
      for (const lab of labResults) {
        if (lab.isAbnormal) {
          const severity = this._determineLabSeverity(lab.testName, lab.value);
          alerts.push({
            type: severity,
            field: lab.testName,
            value: `${lab.value} ${lab.unit}`,
            normalRange: lab.normalRange,
            message: `Abnormal ${lab.testName}: ${lab.value} ${lab.unit}`,
          });
        }
      }
    }

    return alerts;
  }

  /**
   * Check if two drugs interact
   * @private
   */
  static _checkPairInteraction(drug1, drug2) {
    // Exact match lookup
    const key = `${drug1}-${drug2}`;
    if (SEVERITY_MAP[key]) return SEVERITY_MAP[key];

    // Reverse check
    const reverseKey = `${drug2}-${drug1}`;
    if (SEVERITY_MAP[reverseKey]) return SEVERITY_MAP[reverseKey];

    // Partial match in database
    for (const [knownDrug, interactingDrugs] of Object.entries(
      KNOWN_INTERACTIONS,
    )) {
      if (
        knownDrug.toLowerCase().includes(drug1) ||
        drug1.includes(knownDrug.toLowerCase())
      ) {
        if (
          interactingDrugs.some(
            (d) =>
              d.toLowerCase().includes(drug2) ||
              drug2.includes(d.toLowerCase()),
          )
        ) {
          return "moderate"; // Default to moderate for matched drugs
        }
      }
    }

    return null;
  }

  /**
   * Determine severity of lab abnormality
   * @private
   */
  static _determineLabSeverity(testName, value) {
    const val = parseFloat(value);
    testName = testName.toLowerCase();

    if (testName.includes("glucose")) {
      if (val > 400 || val < 40) return "critical";
      if (val > 300 || val < 60) return "warning";
    }
    if (testName.includes("potassium")) {
      if (val > 6.5 || val < 2.5) return "critical";
      if (val > 6 || val < 3) return "warning";
    }
    if (testName.includes("hemoglobin")) {
      if (val < 7) return "critical";
      if (val < 8.5) return "warning";
    }

    return "info";
  }

  /**
   * Generate human-readable warning message
   * @private
   */
  static _generateWarningMessage(drug1, drug2, severity) {
    const severityText = {
      mild: "Minor interaction possible",
      moderate: "Moderate interaction - monitor patient",
      severe: "Severe interaction - may require dosage adjustment",
      contraindicated: "Contraindicated combination - do not use together",
    };

    return `${severityText[severity]}: ${drug1} and ${drug2}`;
  }

  /**
   * Get recommendation for severity level
   * @private
   */
  static _getRecommendation(severity) {
    const recommendations = {
      mild: "Monitor patient for symptoms. May not require intervention.",
      moderate: "Adjust dosages or timing between doses. Monitor closely.",
      severe:
        "Consider alternative medications or significant dosage adjustment.",
      contraindicated:
        "Do not use this medication combination. Choose alternative.",
    };

    return recommendations[severity];
  }
}

module.exports = MedicationInteractionService;
