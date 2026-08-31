// ─── Format validators ────────────────────────────────────────────────────────

export const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const PHONE_RULES = {
  91: { test: (v) => /^[6-9]\d{9}$/.test(v), desc: "10-digit Indian" },
  1: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit North American" },
  44: { test: (v) => /^\d{10,11}$/.test(v), desc: "UK" },
  61: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Australian" },
  86: { test: (v) => /^\d{11}$/.test(v), desc: "11-digit Chinese" },
  81: { test: (v) => /^\d{10,11}$/.test(v), desc: "Japanese" },
  49: { test: (v) => /^\d{6,13}$/.test(v), desc: "German" },
  33: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit French" },
  55: { test: (v) => /^\d{10,11}$/.test(v), desc: "Brazilian" },
  7: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Russian" },
  39: { test: (v) => /^\d{8,11}$/.test(v), desc: "Italian" },
  34: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Spanish" },
  31: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Dutch" },
  46: { test: (v) => /^\d{7,13}$/.test(v), desc: "Swedish" },
  41: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Swiss" },
  82: { test: (v) => /^\d{9,11}$/.test(v), desc: "Korean" },
  92: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Pakistani" },
  94: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Sri Lankan" },
  880: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Bangladeshi" },
  977: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Nepali" },
  60: { test: (v) => /^\d{9,10}$/.test(v), desc: "Malaysian" },
  62: { test: (v) => /^\d{8,12}$/.test(v), desc: "Indonesian" },
  63: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Filipino" },
  64: { test: (v) => /^\d{8,10}$/.test(v), desc: "New Zealand" },
  27: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit South African" },
  966: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Saudi" },
  971: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit UAE" },
  65: { test: (v) => /^\d{8}$/.test(v), desc: "8-digit Singapore" },
  852: { test: (v) => /^\d{8}$/.test(v), desc: "8-digit Hong Kong" },
  886: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Taiwanese" },
  84: { test: (v) => /^\d{9,10}$/.test(v), desc: "Vietnamese" },
  66: { test: (v) => /^\d{9}$/.test(v), desc: "9-digit Thai" },
  90: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Turkish" },
  98: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Iranian" },
  234: { test: (v) => /^\d{8,11}$/.test(v), desc: "Nigerian" },
  254: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Kenyan" },
  233: { test: (v) => /^\d{10}$/.test(v), desc: "10-digit Ghanaian" },
  default: { test: (v) => /^\d{4,15}$/.test(v), desc: "" },
};

// ─── Max digit length per country code (drives input restriction) ────────────
// Kept in sync with PHONE_RULES above — each value is the upper bound allowed
// by that country's regex, so typing/pasting beyond it is blocked at the
// input level, before format validation ever runs.
export const PHONE_MAX_LENGTH = {
  91: 10,
  1: 10,
  44: 11,
  61: 9,
  86: 11,
  81: 11,
  49: 13,
  33: 9,
  55: 11,
  7: 10,
  39: 11,
  34: 9,
  31: 9,
  46: 13,
  41: 9,
  82: 11,
  92: 10,
  94: 10,
  880: 10,
  977: 10,
  60: 10,
  62: 12,
  63: 10,
  64: 10,
  27: 9,
  966: 9,
  971: 9,
  65: 8,
  852: 8,
  886: 9,
  84: 10,
  66: 9,
  90: 10,
  98: 10,
  234: 11,
  254: 10,
  233: 10,
  default: 15,
};

export const getPhoneMaxLength = (phoneCode) =>
  PHONE_MAX_LENGTH[phoneCode] || PHONE_MAX_LENGTH.default;

// ─── Fields per step (ALL required to proceed) ────────────────────────────────

export const STEP_FIELDS = {
  0: [
    "typeId",
    "classSetId",
    "name",
    "gender",
    "designation",
    "email",
    "phone",
    "address",
  ],
  1: [
    "domain",
    "pastExp",
    "timeCommitment",
  ],
};

// ─── Human-readable labels ────────────────────────────────────────────────────

export const FIELD_LABELS = {
  typeId: "Mentor Type",
  classSetId: "Classification",
  name: "Full Name",
  gender: "Gender",
  designation: "Designation",
  email: "Email Address",
  phone: "Phone Number",
  address: "Address",
  domain: "Domain / Expertise",
  pastExp: "Past Experience",
  timeCommitment: "Time Commitment",
  linkedin: "LinkedIn Profile",
  website: "Website",
  blog: "Blog Link",
  prevStupMentor: "Previously Mentored Startup",
};

// ─── Single-field validator — returns error string or "" ──────────────────────

export const validateField = (name, value, formData = {}) => {
  const label = FIELD_LABELS[name] || name;
  const isEmpty = (v) =>
    v === undefined || v === null || String(v).trim() === "";

  switch (name) {
    // ── Step 0 ────────────────────────────────────────────────────────────────
    case "typeId":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "classSetId":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "name":
      if (isEmpty(value)) return `${label} is required`;
      if (String(value).trim().length < 2)
        return `${label} must be at least 2 characters`;
      break;

    case "gender":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "designation":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "email":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateEmail(value)) return "Please enter a valid email address";
      break;

    case "phone": {
      if (isEmpty(value)) return `${label} is required`;
      const phoneCode = formData?.phoneCode || "91";
      const rule = PHONE_RULES[phoneCode] || PHONE_RULES.default;
      if (!rule.test(String(value)))
        return rule.desc
          ? `Please enter a valid ${rule.desc} mobile number`
          : "Please enter a valid mobile number (4-15 digits)";
      break;
    }

    case "address":
      if (isEmpty(value)) return `${label} is required`;
      break;

    // ── Step 1 ────────────────────────────────────────────────────────────────
    case "domain":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "pastExp":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "timeCommitment":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "linkedin":
      // Optional field — validated only if a value is provided
      break;

    case "website":
      // Optional field — validated only if a value is provided
      break;

    case "blog":
      // Optional field — validated only if a value is provided
      break;

    case "prevStupMentor":
      // Optional field — validated only if a value is provided
      break;

    default:
      break;
  }

  return ""; // no error
};

// ─── Validate all fields in a step — returns { field: errorMsg } ──────────────

export const validateStep = (stepIndex, formData) => {
  const errors = {};
  const fields = STEP_FIELDS[stepIndex] || [];
  fields.forEach((field) => {
    const err = validateField(field, formData[field], formData);
    if (err) errors[field] = err;
  });
  return errors;
};

// ─── Full form validation (both steps) ───────────────────────────────────────

export const validateFullForm = (formData) => {
  const errors = {};
  [0, 1].forEach((step) => {
    Object.assign(errors, validateStep(step, formData));
  });
  return errors;
};

// ─── Empty form factory ───────────────────────────────────────────────────────

export const emptyForm = (incUserid, userId) => ({
  incubatorId: incUserid || "1",
  typeId: "",
  classSetId: "",
  name: "",
  gender: "",
  designation: "",
  phone: "",
  phoneCode: "91",
  address: "",
  email: "",
  domain: "",
  pastExp: "",
  linkedin: "",
  website: "",
  blog: "",
  imagePath: null,
  timeCommitment: "",
  prevStupMentor: "",
  comment: "",
  createdBy: userId || "1",
});

