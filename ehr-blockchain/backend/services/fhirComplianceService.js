// services/fhirComplianceService.js
// FHIR (Fast Healthcare Interoperability Resources) R4 compliance
// Converts medical data to/from FHIR standard format for interoperability

/**
 * FHIR Resource Types
 * Standard healthcare data structures
 */
const FHIR_RESOURCES = {
  PATIENT: "Patient",
  OBSERVATION: "Observation",
  CONDITION: "Condition",
  MEDICATION_REQUEST: "MedicationRequest",
  PROCEDURE: "Procedure",
  ENCOUNTER: "Encounter",
  IMMUNIZATION: "Immunization",
  ALLERGY_INTOLERANCE: "AllergyIntolerance",
  DOCUMENT_REFERENCE: "DocumentReference",
  DIAGNOSTIC_REPORT: "DiagnosticReport",
  MEDICATION: "Medication",
};

/**
 * LOINC Codes for Common Lab Tests
 */
const LOINC_CODES = {
  GLUCOSE: "2345-7",
  HEMOGLOBIN: "718-7",
  CREATININE: "2160-0",
  ALBUMIN: "1751-7",
  LDLCHOLESTEROL: "18262-6",
  HDLCHOLESTEROL: "2085-9",
  TRIGLYCERIDES: "2571-8",
  SODIUMPLASMAQNT: "2951-2",
  POTASSIUMPLASMAQNT: "2823-3",
};

/**
 * SNOMED CT Codes for Common Conditions
 */
const SNOMED_CODES = {
  DIABETES_TYPE_2: "44054006",
  HYPERTENSION: "59621000",
  ASTHMA: "195967001",
  PNEUMONIA: "52702003",
  HEARTFAILURE: "42399005",
};

/**
 * FHIR Compliance Service
 */
class FHIRComplianceService {
  constructor() {
    this.fhirVersion = "R4";
    this.baseUrl = process.env.FHIR_BASE_URL || "http://localhost:3000/fhir";
  }

  /**
   * Convert medical record to FHIR Patient Bundle
   * Creates a complete FHIR transaction bundle with all patient data
   */
  convertToFHIRBundle(patientData, medicalRecords) {
    const patientResource = this._createPatientResource(patientData);
    const observations = medicalRecords
      .filter((r) => r.recordType === "lab_result")
      .map((r) => this._createObservationResource(r));

    const conditions = medicalRecords
      .filter((r) => r.recordType === "diagnosis")
      .map((r) => this._createConditionResource(r));

    const medications = medicalRecords
      .filter((r) => r.recordType === "prescription")
      .map((r) => this._createMedicationRequestResource(r));

    const entries = [
      {
        fullUrl: `${this.baseUrl}/Patient/${patientData.id}`,
        resource: patientResource,
        request: {
          method: "PUT",
          url: `Patient/${patientData.id}`,
        },
      },
      ...observations.map((obs) => ({
        fullUrl: `${this.baseUrl}/Observation/${obs.id}`,
        resource: obs,
        request: {
          method: "PUT",
          url: `Observation/${obs.id}`,
        },
      })),
      ...conditions.map((cond) => ({
        fullUrl: `${this.baseUrl}/Condition/${cond.id}`,
        resource: cond,
        request: {
          method: "PUT",
          url: `Condition/${cond.id}`,
        },
      })),
      ...medications.map((med) => ({
        fullUrl: `${this.baseUrl}/MedicationRequest/${med.id}`,
        resource: med,
        request: {
          method: "PUT",
          url: `MedicationRequest/${med.id}`,
        },
      })),
    ];

    return {
      resourceType: "Bundle",
      type: "transaction",
      timestamp: new Date().toISOString(),
      total: entries.length,
      entry: entries,
    };
  }

  /**
   * Create FHIR Patient Resource
   * @private
   */
  _createPatientResource(patientData) {
    return {
      resourceType: FHIR_RESOURCES.PATIENT,
      id: patientData.id || patientData.patientId,
      meta: {
        versionId: "1",
        lastUpdated: new Date().toISOString(),
        profile: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
        ],
      },
      identifier: [
        {
          system: "http://hospital.local/medical-record-number",
          value: patientData.mrn || patientData.id,
          type: {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                code: "MR",
                display: "Medical Record Number",
              },
            ],
          },
        },
        ...(patientData.ssn
          ? [
              {
                system: "http://hl7.org/fhir/sid/us-ssn",
                value: patientData.ssn,
              },
            ]
          : []),
      ],
      name: [
        {
          use: "official",
          given: [patientData.firstName || patientData.first_name],
          family: patientData.lastName || patientData.last_name,
        },
      ],
      telecom: [
        ...(patientData.phone
          ? [
              {
                system: "phone",
                value: patientData.phone,
              },
            ]
          : []),
        ...(patientData.email
          ? [
              {
                system: "email",
                value: patientData.email,
              },
            ]
          : []),
      ],
      gender: this._mapGender(patientData.gender),
      birthDate: patientData.dateOfBirth || patientData.birth_date,
      address: patientData.address
        ? [
            {
              use: "home",
              type: "physical",
              text: patientData.address,
              city: patientData.city,
              state: patientData.state,
              postalCode: patientData.zipCode || patientData.postal_code,
              country: patientData.country || "US",
            },
          ]
        : [],
      contact: patientData.emergencyContact
        ? [
            {
              relationship: [
                {
                  coding: [
                    {
                      system: "http://terminology.hl7.org/CodeSystem/v2-0131",
                      code: "N",
                      display: "Next-of-Kin",
                    },
                  ],
                },
              ],
              name: {
                text: patientData.emergencyContact.name,
              },
              telecom: [
                {
                  system: "phone",
                  value: patientData.emergencyContact.phone,
                },
              ],
            },
          ]
        : [],
      active: true,
    };
  }

  /**
   * Create FHIR Observation Resource (Lab Results, Vital Signs)
   * @private
   */
  _createObservationResource(labRecord) {
    const labData = labRecord.data || labRecord;
    const loincCode = LOINC_CODES[labData.testType?.toUpperCase()] || "unknown";

    return {
      resourceType: FHIR_RESOURCES.OBSERVATION,
      id: labData.id || this._generateUUID(),
      meta: {
        versionId: "1",
        lastUpdated: new Date().toISOString(),
        profile: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab",
        ],
      },
      status: "final",
      category: [
        {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "laboratory",
              display: "Laboratory",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: loincCode,
            display: labData.testType || "Lab Test",
          },
        ],
        text: labData.testType,
      },
      subject: {
        reference: `Patient/${labData.patientId}`,
      },
      effectiveDateTime:
        labData.testDate || labData.date || new Date().toISOString(),
      issued: new Date().toISOString(),
      performer: [
        {
          reference: `Organization/${labData.laboratory || "LAB001"}`,
          display: labData.labName || "Laboratory",
        },
      ],
      valueQuantity: {
        value: parseFloat(labData.value),
        unit: labData.unit,
        system: "http://unitsofmeasure.org",
        code: this._mapUnitCode(labData.unit),
      },
      referenceRange: labData.referenceRange
        ? [
            {
              low: {
                value: labData.referenceRange.low,
              },
              high: {
                value: labData.referenceRange.high,
              },
              text: `${labData.referenceRange.low} - ${labData.referenceRange.high} ${labData.unit}`,
            },
          ]
        : [],
      interpretation: [
        {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
              code: this._mapInterpretation(
                labData.value,
                labData.referenceRange,
              ),
            },
          ],
        },
      ],
    };
  }

  /**
   * Create FHIR Condition Resource (Diagnosis)
   * @private
   */
  _createConditionResource(diagnosisRecord) {
    const diagData = diagnosisRecord.data || diagnosisRecord;
    const snomedCode =
      SNOMED_CODES[diagData.diagnosis?.toUpperCase()] || "unknown";

    return {
      resourceType: FHIR_RESOURCES.CONDITION,
      id: diagData.id || this._generateUUID(),
      meta: {
        versionId: "1",
        lastUpdated: new Date().toISOString(),
        profile: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition",
        ],
      },
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: diagData.active ? "active" : "resolved",
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system:
              "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            code: "confirmed",
          },
        ],
      },
      code: {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: snomedCode,
            display: diagData.diagnosis,
          },
        ],
        text: diagData.diagnosis,
      },
      subject: {
        reference: `Patient/${diagData.patientId}`,
      },
      onsetDateTime: diagData.onsetDate || new Date().toISOString(),
      recorder: {
        reference: `Practitioner/${diagData.doctorId || "DOC001"}`,
        display: diagData.doctorName || "Physician",
      },
      note: [
        {
          text: diagData.notes || diagData.description,
        },
      ],
    };
  }

  /**
   * Create FHIR MedicationRequest Resource (Prescription)
   * @private
   */
  _createMedicationRequestResource(prescriptionRecord) {
    const rxData = prescriptionRecord.data || prescriptionRecord;

    return {
      resourceType: FHIR_RESOURCES.MEDICATION_REQUEST,
      id: rxData.id || this._generateUUID(),
      meta: {
        versionId: "1",
        lastUpdated: new Date().toISOString(),
        profile: [
          "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
        ],
      },
      status: rxData.active ? "active" : "completed",
      intent: "order",
      medicationCodeableConcept: {
        coding: [
          {
            system: "http://www.nlm.nih.gov/research/umls/rxnorm",
            code: rxData.medicationCode || "unknown",
            display: rxData.medicationName,
          },
        ],
        text: rxData.medicationName,
      },
      subject: {
        reference: `Patient/${rxData.patientId}`,
      },
      authoredOn: rxData.prescriptionDate || new Date().toISOString(),
      requester: {
        reference: `Practitioner/${rxData.prescriberId || "DOC001"}`,
        display: rxData.prescriberName || "Physician",
      },
      dosageInstruction: [
        {
          sequence: 1,
          text: rxData.dosage || "As directed",
          timing: {
            repeat: {
              frequency: rxData.frequency || 1,
              period: 1,
              periodUnit: rxData.periodUnit || "d",
            },
          },
          route: {
            coding: [
              {
                system: "http://snomed.info/sct",
                code: "26643006",
                display: rxData.route || "Oral Route",
              },
            ],
          },
          doseAndRate: [
            {
              doseQuantity: {
                value: parseFloat(rxData.quantity),
                unit: rxData.unit || "mg",
              },
            },
          ],
        },
      ],
      dispenseRequest: {
        numberOfRepeatsAllowed: rxData.refills || 0,
        quantity: {
          value: parseFloat(rxData.quantity),
          unit: rxData.unit || "mg",
        },
        expectedSupplyDuration: {
          value: rxData.daysSupply || 30,
          unit: "d",
        },
      },
    };
  }

  /**
   * Parse FHIR Bundle and extract medical records
   */
  parseFHIRBundle(fhirBundle) {
    const records = {
      patient: null,
      observations: [],
      conditions: [],
      medications: [],
    };

    if (!fhirBundle.entry) {
      return records;
    }

    fhirBundle.entry.forEach((entry) => {
      const resource = entry.resource;

      switch (resource.resourceType) {
        case FHIR_RESOURCES.PATIENT:
          records.patient = this._parsePatient(resource);
          break;

        case FHIR_RESOURCES.OBSERVATION:
          records.observations.push(this._parseObservation(resource));
          break;

        case FHIR_RESOURCES.CONDITION:
          records.conditions.push(this._parseCondition(resource));
          break;

        case FHIR_RESOURCES.MEDICATION_REQUEST:
          records.medications.push(this._parseMedicationRequest(resource));
          break;
      }
    });

    return records;
  }

  /**
   * Validate FHIR Resource
   */
  validateFHIRResource(resource) {
    const requiredFields = {
      [FHIR_RESOURCES.PATIENT]: ["id", "name", "gender", "birthDate"],
      [FHIR_RESOURCES.OBSERVATION]: [
        "id",
        "status",
        "code",
        "subject",
        "effectiveDateTime",
      ],
      [FHIR_RESOURCES.CONDITION]: ["id", "code", "subject"],
    };

    const required = requiredFields[resource.resourceType] || [];
    const missing = required.filter(
      (field) => !this._getNestedProperty(resource, field),
    );

    return {
      valid: missing.length === 0,
      errors: missing.map((field) => `Missing required field: ${field}`),
    };
  }

  // ─────────────────────────────────────────────────────────────
  //  HELPER METHODS
  // ─────────────────────────────────────────────────────────────

  _mapGender(gender) {
    const mapping = {
      M: "male",
      F: "female",
      O: "other",
      U: "unknown",
      male: "male",
      female: "female",
      other: "other",
      unknown: "unknown",
    };

    return mapping[gender] || "unknown";
  }

  _mapUnitCode(unit) {
    const unitMap = {
      mg: "mg",
      "mg/dL": "mg/dL",
      mmol: "mmol",
      "mmol/L": "mmol/L",
      g: "g",
      "g/dL": "g/dL",
      percent: "%",
    };

    return unitMap[unit] || unit;
  }

  _mapInterpretation(value, referenceRange) {
    if (!referenceRange) return "U"; // Unknown

    const numValue = parseFloat(value);
    if (numValue < referenceRange.low) return "L"; // Low
    if (numValue > referenceRange.high) return "H"; // High
    return "N"; // Normal
  }

  _parsePatient(resource) {
    const name = resource.name?.[0] || {};
    return {
      id: resource.id,
      firstName: name.given?.[0],
      lastName: name.family,
      gender: resource.gender,
      dateOfBirth: resource.birthDate,
      contact: resource.telecom,
    };
  }

  _parseObservation(resource) {
    return {
      id: resource.id,
      testType: resource.code?.text,
      value: resource.valueQuantity?.value,
      unit: resource.valueQuantity?.unit,
      date: resource.effectiveDateTime,
      status: resource.status,
    };
  }

  _parseCondition(resource) {
    return {
      id: resource.id,
      diagnosis: resource.code?.text,
      status: resource.clinicalStatus?.coding?.[0]?.code,
      onsetDate: resource.onsetDateTime,
    };
  }

  _parseMedicationRequest(resource) {
    return {
      id: resource.id,
      medication: resource.medicationCodeableConcept?.text,
      status: resource.status,
      dosage: resource.dosageInstruction?.[0]?.text,
      authoredOn: resource.authoredOn,
    };
  }

  _getNestedProperty(obj, path) {
    return path.split(".").reduce((current, prop) => current?.[prop], obj);
  }

  _generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  }
}

module.exports = new FHIRComplianceService();
