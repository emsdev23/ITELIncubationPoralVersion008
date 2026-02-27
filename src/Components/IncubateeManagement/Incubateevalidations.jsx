// ─── Format validators (return true = valid) ─────────────────────────────────

export const validateGST = (gst) => {
  if (!gst) return false; // required
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    gst.toUpperCase(),
  );
};

export const validatePAN = (pan) => {
  if (!pan) return false;
  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase());
};

export const validateCIN = (cin) => {
  if (!cin) return false;
  return /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/.test(
    cin.toUpperCase(),
  );
};

export const validateUAN = (uan) => {
  if (!uan) return false;
  return /^[0-9]{12}$/.test(uan);
};

export const validateEmail = (email) => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const validateDIN = (din) => {
  if (!din) return false;
  return /^[0-9]{8}$/.test(din);
};

export const validatePhone = (phone) => {
  if (!phone) return false;
  return /^[6-9]\d{9}$/.test(phone);
};

// ─── Human-readable field labels (used in error messages) ─────────────────────

export const FIELD_DISPLAY_NAMES = {
  // Tab 0 - Basic Info
  incubateesname: "Incubatee Name",
  incubateesemail: "Email",
  incubateesshortname: "Short Name",
  incubateesfieldofwork: "Field of Work",
  incubateesstagelevel: "Stage Level",
  incubateesfoundername: "Founder Name",
  incubateesaddress: "Address",
  incubateeswebsite: "Website",

  // Tab 1 - Legal & Financial
  incubateescin: "CIN",
  incubateesdin: "DIN",
  incubateesgst: "GST",
  incubateesgstregdate: "GST Registration Date",
  incubateesdpiitnumber: "DPIIT Number",
  incubateespannumber: "PAN Number",
  incubateesuan: "UAN",
  incubateestotalshare: "Total Share",
  incubateesshareperprice: "Share Per Price",
  incubateesnooffounders: "Number of Founders",

  // Tab 2 - Incubation Details
  incubateesdateofincubation: "Date of Incubation",
  incubateesdateofincorporation: "Date of Incorporation",
  incubateesdurationofextension: "Duration of Extension",
  incubateesdateofextension: "Date of Extension",
  incubateesincubatorname: "Incubator Name",
  incubateesincubatoremail: "Incubator Email",
  incubateesincubatorphone: "Incubator Phone",

  // Tab 3 - Additional Info
  incubateesaccountantname: "Accountant Name",
  incubateesauditorname: "Auditor Name",
  incubateessecretaryname: "Secretary Name",
  incubateescreatedtime: "Created Time",
  incubateesmodifiedtime: "Modified Time",
};

// ─── Fields per tab (ALL are required) ───────────────────────────────────────

export const TAB_ALL_FIELDS = {
  0: [
    "incubateesname",
    "incubateesemail",
    "incubateesshortname",
    "incubateesfieldofwork",
    "incubateesstagelevel",
    "incubateesfoundername",
    "incubateesaddress",
    "incubateeswebsite",
  ],
  1: [
    "incubateescin",
    "incubateesdin",
    "incubateesgst",
    "incubateesgstregdate",
    "incubateesdpiitnumber",
    "incubateespannumber",
    "incubateesuan",
    "incubateestotalshare",
    "incubateesshareperprice",
    "incubateesnooffounders",
  ],
  2: [
    "incubateesdateofincubation",
    "incubateesdateofincorporation",
    "incubateesdurationofextension",
    "incubateesdateofextension",
    "incubateesincubatorname",
    "incubateesincubatoremail",
    "incubateesincubatorphone",
  ],
  3: [
    "incubateesaccountantname",
    "incubateesauditorname",
    "incubateessecretaryname",
    "incubateescreatedtime",
    "incubateesmodifiedtime",
  ],
};

// ─── Single field validator (used on onChange for real-time feedback) ─────────
// Returns error string or "" if valid

export const validateField = (name, value) => {
  const label = FIELD_DISPLAY_NAMES[name] || name;
  const isEmpty = (v) =>
    v === undefined || v === null || String(v).trim() === "";

  switch (name) {
    // ── Tab 0 ──
    case "incubateesname":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesemail":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateEmail(value)) return "Please enter a valid email address";
      break;

    case "incubateesshortname":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesfieldofwork":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesstagelevel":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesfoundername":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesaddress":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateeswebsite":
      if (isEmpty(value)) return `${label} is required`;
      break;

    // ── Tab 1 ──
    case "incubateescin":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateCIN(value))
        return "Please enter a valid CIN (e.g., U74140DL2014PTC272828)";
      break;

    case "incubateesdin":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateDIN(value)) return "Please enter a valid 8-digit DIN";
      break;

    case "incubateesgst":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateGST(value))
        return "Please enter a valid GST (e.g., 22AAAAA0000A1Z5)";
      break;

    case "incubateesgstregdate":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesdpiitnumber":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateespannumber":
      if (isEmpty(value)) return `${label} is required`;
      if (!validatePAN(value))
        return "Please enter a valid PAN (e.g., ABCDE1234F)";
      break;

    case "incubateesuan":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateUAN(value)) return "Please enter a valid 12-digit UAN";
      break;

    case "incubateestotalshare":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesshareperprice":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesnooffounders":
      if (isEmpty(value)) return `${label} is required`;
      break;

    // ── Tab 2 ──
    case "incubateesdateofincubation":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesdateofincorporation":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesdurationofextension":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesdateofextension":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesincubatorname":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesincubatoremail":
      if (isEmpty(value)) return `${label} is required`;
      if (!validateEmail(value))
        return "Please enter a valid incubator email address";
      break;

    case "incubateesincubatorphone":
      if (isEmpty(value)) return `${label} is required`;
      if (!validatePhone(value))
        return "Please enter a valid 10-digit mobile number (starting with 6-9)";
      break;

    // ── Tab 3 ──
    case "incubateesaccountantname":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesauditorname":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateessecretaryname":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateescreatedtime":
      if (isEmpty(value)) return `${label} is required`;
      break;

    case "incubateesmodifiedtime":
      if (isEmpty(value)) return `${label} is required`;
      break;

    default:
      break;
  }

  return ""; // no error
};

// ─── Validate all fields in a tab — returns error map ────────────────────────

export const validateTab = (tabIndex, formData) => {
  const errors = {};
  const fields = TAB_ALL_FIELDS[tabIndex] || [];
  fields.forEach((field) => {
    const err = validateField(field, formData[field]);
    if (err) errors[field] = err;
  });
  return errors;
};

// ─── Full form validation on final submit ─────────────────────────────────────

export const validateFullForm = (formData) => {
  const errors = {};
  [0, 1, 2, 3].forEach((tab) => {
    Object.assign(errors, validateTab(tab, formData));
  });
  return errors;
};

// ─── Duplicate check config ───────────────────────────────────────────────────

export const DUPLICATE_CHECK_FIELDS = [
  "incubateesemail",
  "incubateesincubatorphone",
  "incubateesshortname",
  "incubateescin",
  "incubateesdin",
  "incubateespannumber",
  "incubateesuan",
  "incubateesgst",
  "incubateesdpiitnumber",
];

export const FIELD_TO_API_KEY = {
  incubateesemail: "email",
  incubateesincubatorphone: "incubatorphone",
  incubateesshortname: "shortname",
  incubateescin: "cin",
  incubateesdin: "din",
  incubateespannumber: "pan",
  incubateesuan: "uan",
  incubateesgst: "gst",
  incubateesdpiitnumber: "dpiit",
};

export const FIELD_LABELS = {
  incubateesemail: "Email",
  incubateesincubatorphone: "Incubator Phone",
  incubateesshortname: "Short Name",
  incubateescin: "CIN",
  incubateesdin: "DIN",
  incubateespannumber: "PAN",
  incubateesuan: "UAN",
  incubateesgst: "GST",
  incubateesdpiitnumber: "DPIIT Number",
};

// ─── Empty form state ─────────────────────────────────────────────────────────

export const EMPTY_FORM = {
  incubateesfieldofwork: "",
  incubateesstagelevel: "",
  incubateesname: "",
  incubateesemail: "",
  incubateesshortname: "",
  incubateestotalshare: "",
  incubateesshareperprice: "",
  incubateescin: "",
  incubateesdin: "",
  incubateesgst: "",
  incubateesgstregdate: "",
  incubateesdpiitnumber: "",
  incubateeslogopath: "",
  incubateesdurationofextension: "",
  incubateesaddress: "",
  incubateesincubatorname: "",
  incubateesincubatoremail: "",
  incubateesincubatorphone: "",
  incubateespannumber: "",
  incubateesuan: "",
  incubateesnooffounders: "",
  incubateesaccountantname: "",
  incubateesauditorname: "",
  incubateessecretaryname: "",
  incubateesadminstate: 0,
  incubateesfoundername: "",
  incubateesdateofincubation: "",
  incubateesdateofincorporation: "",
  incubateesdateofextension: "",
  incubateeswebsite: "",
  incubateescreatedtime: "",
  incubateesmodifiedtime: "",
  incubateescreatedby: "",
  incubateesmodifiedby: "",
};
