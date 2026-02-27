// ─── Format validators ────────────────────────────────────────────────────────

export const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  return /^[6-9]\d{9}$/.test(String(phone));
};

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
    "linkedin",
    "website",
    "blog",
    "prevStupMentor",
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

export const validateField = (name, value) => {
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

    case "phone":
      if (isEmpty(value)) return `${label} is required`;
      if (!validatePhone(value))
        return "Please enter a valid 10-digit mobile number (starting with 6-9)";
      break;

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
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "website":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "blog":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "prevStupMentor":
      if (isEmpty(value)) return `${label} is required`;
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
    const err = validateField(field, formData[field]);
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
