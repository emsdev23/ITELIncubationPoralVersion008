import React, { useState, useCallback, useEffect } from "react";
import { FaArrowLeft, FaArrowRight, FaSave } from "react-icons/fa";
import {
  Button,
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Grid,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Backdrop,
  Alert,
  Collapse,
  Autocomplete,
  styled,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import api from "../Datafetching/api";
import {
  validateField,
  validateStep,
  validateFullForm,
  STEP_FIELDS,
  emptyForm,
  getPhoneMaxLength,
} from "./Mentorvalidations";

const COUNTRY_CODES = [
  { code: "93", label: "+93 (Afghanistan)" },
  { code: "355", label: "+355 (Albania)" },
  { code: "213", label: "+213 (Algeria)" },
  { code: "376", label: "+376 (Andorra)" },
  { code: "244", label: "+244 (Angola)" },
  { code: "54", label: "+54 (Argentina)" },
  { code: "374", label: "+374 (Armenia)" },
  { code: "61", label: "+61 (Australia)" },
  { code: "43", label: "+43 (Austria)" },
  { code: "994", label: "+994 (Azerbaijan)" },
  { code: "973", label: "+973 (Bahrain)" },
  { code: "880", label: "+880 (Bangladesh)" },
  { code: "375", label: "+375 (Belarus)" },
  { code: "32", label: "+32 (Belgium)" },
  { code: "501", label: "+501 (Belize)" },
  { code: "229", label: "+229 (Benin)" },
  { code: "975", label: "+975 (Bhutan)" },
  { code: "591", label: "+591 (Bolivia)" },
  { code: "387", label: "+387 (Bosnia & Herzegovina)" },
  { code: "267", label: "+267 (Botswana)" },
  { code: "55", label: "+55 (Brazil)" },
  { code: "673", label: "+673 (Brunei)" },
  { code: "359", label: "+359 (Bulgaria)" },
  { code: "226", label: "+226 (Burkina Faso)" },
  { code: "257", label: "+257 (Burundi)" },
  { code: "855", label: "+855 (Cambodia)" },
  { code: "237", label: "+237 (Cameroon)" },
  {
    code: "1",
    label: "+1 (US/Canada)",
    keywords: "usa america united states canada",
  },
  { code: "238", label: "+238 (Cape Verde)" },
  { code: "236", label: "+236 (Central African Republic)" },
  { code: "235", label: "+235 (Chad)" },
  { code: "56", label: "+56 (Chile)" },
  { code: "86", label: "+86 (China)", keywords: "china chinese" },
  { code: "57", label: "+57 (Colombia)" },
  { code: "269", label: "+269 (Comoros)" },
  { code: "242", label: "+242 (Congo)", keywords: "congo republic" },
  {
    code: "243",
    label: "+243 (Congo DR)",
    keywords: "congo democratic republic drc",
  },
  { code: "506", label: "+506 (Costa Rica)" },
  { code: "385", label: "+385 (Croatia)" },
  { code: "53", label: "+53 (Cuba)" },
  { code: "357", label: "+357 (Cyprus)" },
  {
    code: "420",
    label: "+420 (Czech Republic)",
    keywords: "czech republic czechia",
  },
  { code: "45", label: "+45 (Denmark)" },
  { code: "253", label: "+253 (Djibouti)" },
  { code: "593", label: "+593 (Ecuador)" },
  { code: "20", label: "+20 (Egypt)" },
  { code: "503", label: "+503 (El Salvador)" },
  { code: "240", label: "+240 (Equatorial Guinea)" },
  { code: "291", label: "+291 (Eritrea)" },
  { code: "372", label: "+372 (Estonia)" },
  { code: "251", label: "+251 (Ethiopia)" },
  { code: "679", label: "+679 (Fiji)" },
  { code: "358", label: "+358 (Finland)" },
  { code: "33", label: "+33 (France)" },
  { code: "241", label: "+241 (Gabon)" },
  { code: "220", label: "+220 (Gambia)" },
  { code: "995", label: "+995 (Georgia)" },
  { code: "49", label: "+49 (Germany)" },
  { code: "233", label: "+233 (Ghana)" },
  { code: "30", label: "+30 (Greece)" },
  { code: "299", label: "+299 (Greenland)" },
  { code: "502", label: "+502 (Guatemala)" },
  { code: "224", label: "+224 (Guinea)" },
  { code: "245", label: "+245 (Guinea-Bissau)" },
  { code: "592", label: "+592 (Guyana)" },
  { code: "509", label: "+509 (Haiti)" },
  { code: "504", label: "+504 (Honduras)" },
  { code: "852", label: "+852 (Hong Kong)" },
  { code: "36", label: "+36 (Hungary)" },
  { code: "354", label: "+354 (Iceland)" },
  { code: "91", label: "+91 (India)" },
  { code: "62", label: "+62 (Indonesia)" },
  { code: "98", label: "+98 (Iran)", keywords: "iran islamic republic persia" },
  { code: "964", label: "+964 (Iraq)" },
  { code: "353", label: "+353 (Ireland)" },
  { code: "972", label: "+972 (Israel)" },
  { code: "39", label: "+39 (Italy)" },
  {
    code: "225",
    label: "+225 (Ivory Coast)",
    keywords: "ivory coast cote divoire côte d'ivoire",
  },
  { code: "81", label: "+81 (Japan)" },
  { code: "962", label: "+962 (Jordan)" },
  { code: "7", label: "+7 (Kazakhstan)" },
  { code: "254", label: "+254 (Kenya)" },
  { code: "383", label: "+383 (Kosovo)" },
  { code: "965", label: "+965 (Kuwait)" },
  { code: "996", label: "+996 (Kyrgyzstan)" },
  { code: "856", label: "+856 (Laos)" },
  { code: "371", label: "+371 (Latvia)" },
  { code: "961", label: "+961 (Lebanon)" },
  { code: "266", label: "+266 (Lesotho)" },
  { code: "231", label: "+231 (Liberia)" },
  { code: "218", label: "+218 (Libya)" },
  { code: "423", label: "+423 (Liechtenstein)" },
  { code: "370", label: "+370 (Lithuania)" },
  { code: "352", label: "+352 (Luxembourg)" },
  { code: "853", label: "+853 (Macau)" },
  {
    code: "389",
    label: "+389 (North Macedonia)",
    keywords: "north macedonia macedonia",
  },
  { code: "261", label: "+261 (Madagascar)" },
  { code: "265", label: "+265 (Malawi)" },
  { code: "60", label: "+60 (Malaysia)" },
  { code: "960", label: "+960 (Maldives)" },
  { code: "223", label: "+223 (Mali)" },
  { code: "356", label: "+356 (Malta)" },
  { code: "222", label: "+222 (Mauritania)" },
  { code: "230", label: "+230 (Mauritius)" },
  { code: "52", label: "+52 (Mexico)" },
  { code: "373", label: "+373 (Moldova)" },
  { code: "377", label: "+377 (Monaco)" },
  { code: "976", label: "+976 (Mongolia)" },
  { code: "382", label: "+382 (Montenegro)" },
  { code: "212", label: "+212 (Morocco)" },
  { code: "258", label: "+258 (Mozambique)" },
  { code: "95", label: "+95 (Myanmar)", keywords: "myanmar burma" },
  { code: "264", label: "+264 (Namibia)" },
  { code: "977", label: "+977 (Nepal)" },
  { code: "31", label: "+31 (Netherlands)", keywords: "netherlands holland" },
  { code: "64", label: "+64 (New Zealand)" },
  { code: "505", label: "+505 (Nicaragua)" },
  { code: "227", label: "+227 (Niger)" },
  { code: "234", label: "+234 (Nigeria)" },
  {
    code: "850",
    label: "+850 (North Korea)",
    keywords: "north korea democratic people republic",
  },
  { code: "47", label: "+47 (Norway)" },
  { code: "968", label: "+968 (Oman)" },
  { code: "92", label: "+92 (Pakistan)" },
  { code: "680", label: "+680 (Palau)" },
  {
    code: "970",
    label: "+970 (Palestine)",
    keywords: "palestine state of palestine",
  },
  { code: "507", label: "+507 (Panama)" },
  { code: "675", label: "+675 (Papua New Guinea)" },
  { code: "595", label: "+595 (Paraguay)" },
  { code: "51", label: "+51 (Peru)" },
  { code: "63", label: "+63 (Philippines)" },
  { code: "48", label: "+48 (Poland)" },
  { code: "351", label: "+351 (Portugal)" },
  { code: "974", label: "+974 (Qatar)" },
  { code: "40", label: "+40 (Romania)" },
  { code: "7", label: "+7 (Russia)", keywords: "russia russian federation" },
  { code: "250", label: "+250 (Rwanda)" },
  { code: "966", label: "+966 (Saudi Arabia)", keywords: "saudi arabia ksa" },
  { code: "221", label: "+221 (Senegal)" },
  { code: "381", label: "+381 (Serbia)" },
  { code: "232", label: "+232 (Sierra Leone)" },
  { code: "65", label: "+65 (Singapore)" },
  { code: "421", label: "+421 (Slovakia)" },
  { code: "386", label: "+386 (Slovenia)" },
  { code: "677", label: "+677 (Solomon Islands)" },
  { code: "252", label: "+252 (Somalia)" },
  { code: "27", label: "+27 (South Africa)" },
  {
    code: "82",
    label: "+82 (South Korea)",
    keywords: "south korea republic korean",
  },
  { code: "211", label: "+211 (South Sudan)" },
  { code: "34", label: "+34 (Spain)" },
  { code: "94", label: "+94 (Sri Lanka)" },
  { code: "249", label: "+249 (Sudan)" },
  { code: "597", label: "+597 (Suriname)" },
  { code: "268", label: "+268 (Eswatini)", keywords: "eswatini swaziland" },
  { code: "46", label: "+46 (Sweden)" },
  { code: "41", label: "+41 (Switzerland)" },
  {
    code: "963",
    label: "+963 (Syria)",
    keywords: "syria syrian arab republic",
  },
  { code: "886", label: "+886 (Taiwan)", keywords: "taiwan republic of china" },
  { code: "992", label: "+992 (Tajikistan)" },
  { code: "255", label: "+255 (Tanzania)" },
  { code: "66", label: "+66 (Thailand)" },
  {
    code: "670",
    label: "+670 (Timor-Leste)",
    keywords: "timor leste east timor",
  },
  { code: "228", label: "+228 (Togo)" },
  { code: "676", label: "+676 (Tonga)" },
  { code: "216", label: "+216 (Tunisia)" },
  { code: "90", label: "+90 (Turkey)", keywords: "turkey turkiye" },
  { code: "993", label: "+993 (Turkmenistan)" },
  { code: "256", label: "+256 (Uganda)" },
  { code: "380", label: "+380 (Ukraine)" },
  {
    code: "971",
    label: "+971 (UAE)",
    keywords: "uae united arab emirates dubai",
  },
  {
    code: "44",
    label: "+44 (UK)",
    keywords: "uk england britain united kingdom great britain",
  },
  { code: "598", label: "+598 (Uruguay)" },
  { code: "998", label: "+998 (Uzbekistan)" },
  { code: "678", label: "+678 (Vanuatu)" },
  { code: "58", label: "+58 (Venezuela)" },
  { code: "84", label: "+84 (Vietnam)", keywords: "vietnam viet nam" },
  { code: "967", label: "+967 (Yemen)" },
  { code: "260", label: "+260 (Zambia)" },
  { code: "263", label: "+263 (Zimbabwe)" },
];

const filterCountryCodes = (options, { inputValue }) => {
  const search = inputValue.toLowerCase().trim();
  if (!search) return options;
  return options.filter(
    (o) =>
      o.label.toLowerCase().includes(search) ||
      o.code.includes(search) ||
      (o.keywords && o.keywords.toLowerCase().includes(search)),
  );
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

// ─── Inline error banner (replaces Swal popup) ───────────────────────────────

const StepErrorBanner = ({ errors }) => {
  const entries = Object.entries(errors).filter(([, v]) => Boolean(v));
  if (entries.length === 0) return null;

  return (
    <Collapse in>
      <Alert
        severity="error"
        icon={<ErrorOutlineIcon />}
        sx={{
          mb: 2,
          borderRadius: 2,
          border: "1px solid #f44336",
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Please complete all required fields before proceeding (
          {entries.length} {entries.length === 1 ? "issue" : "issues"} found):
        </Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {entries.map(([, msg], i) => (
            <li key={i} style={{ marginBottom: 2, fontSize: "0.875rem" }}>
              {msg}
            </li>
          ))}
        </ul>
      </Alert>
    </Collapse>
  );
};

// ─── MentorForm ───────────────────────────────────────────────────────────────

export default function MentorForm({
  open,
  onClose,
  dialogType, // "add" | "edit"
  editingItem, // full mentor row when editing, null when adding
  mentorTypes,
  classifications,
  onSaveSuccess, // (message, severity) => void
}) {
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");

  const [formData, setFormData] = useState(emptyForm(incUserid, userId));
  const [formErrors, setFormErrors] = useState({});
  const [bannerErrors, setBannerErrors] = useState({}); // shown in red banner
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // ── Reset / populate when dialog opens ───────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setStep(0);
    setFormErrors({});
    setBannerErrors({});

    if (dialogType === "edit" && editingItem) {
      setFormData({
        incubatorId: editingItem.mentordetsincubatorid || incUserid || "1",
        typeId: editingItem.mentordetsmnttypeid?.toString() || "",
        classSetId: editingItem.mentordetsclasssetid?.toString() || "",
        name: editingItem.mentordetsname || "",
        gender: editingItem.mentordetsgender || "",
        designation: editingItem.mentordetsdesign || "",
        phone: editingItem.mentordetsphone || "",
        phoneCode: editingItem.mentordetsphonecode || "91",
        address: editingItem.mentordetsaddress || "",
        email: editingItem.mentordetsemail || "",
        domain: editingItem.mentordetsdomain || "",
        pastExp: editingItem.mentordetspastexp || "",
        linkedin: editingItem.mentordetslinkedin || "",
        website: editingItem.mentordetswebsite || "",
        blog: editingItem.mentordetsblog || "",
        imagePath: editingItem.mentordetsimagepath || null,
        timeCommitment: editingItem.mentordetstimecommitment || "",
        prevStupMentor: editingItem.mentordetsprevstupmentor || "",
        comment: editingItem.mentordetscomment || "",
        mentordetsadminstate: editingItem.mentordetsadminstate,
        createdBy: editingItem.mentordetscreatedby || userId || "1",
      });
    } else {
      setFormData(emptyForm(incUserid, userId));
    }
  }, [open, dialogType, editingItem, incUserid, userId]);

  // ── Generic change handler + real-time field validation ──────────────────
  // When phoneCode changes, the already-typed phone number is re-clipped to
  // the new country's max length and re-validated against the new rule, so a
  // stale/oversized number can't silently survive a country switch.
  const handleInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      setFormData((prev) => {
        const next = { ...prev, [name]: value };
        if (name === "phoneCode" && prev.phone) {
          const maxLen = getPhoneMaxLength(value);
          next.phone = String(prev.phone).slice(0, maxLen);
        }
        return next;
      });

      setFormErrors((prev) => {
        const updated = { ...prev };

        if (name === "phoneCode") {
          const maxLen = getPhoneMaxLength(value);
          const clippedPhone = String(formData.phone || "").slice(0, maxLen);
          const nextFormData = {
            ...formData,
            phoneCode: value,
            phone: clippedPhone,
          };

          const codeErr = validateField(name, value, nextFormData);
          if (codeErr) updated[name] = codeErr;
          else delete updated[name];

          const phoneErr = validateField("phone", clippedPhone, nextFormData);
          if (phoneErr) updated.phone = phoneErr;
          else delete updated.phone;
        } else {
          const nextFormData = { ...formData, [name]: value };
          const err = validateField(name, value, nextFormData);
          if (err) updated[name] = err;
          else delete updated[name];
        }

        return updated;
      });

      // Clear this field (and phone, if country changed) from the banner
      setBannerErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        if (name === "phoneCode") delete updated.phone;
        return updated;
      });
    },
    [formData],
  );

  // Specialised input handlers (filter characters + validate)
  const handleNameChange = useCallback(
    (e) => {
      const filtered = e.target.value.replace(/[^a-zA-Z. ]/g, "");
      handleInputChange({ target: { name: "name", value: filtered } });
    },
    [handleInputChange],
  );

  // Restricts digits to the max length allowed for the currently selected
  // country code (e.g. India +91 -> 10 digits max), so a user physically
  // cannot type or paste more digits than that country supports.
  const handlePhoneChange = useCallback(
    (e) => {
      const maxLen = getPhoneMaxLength(formData.phoneCode);
      const numeric = e.target.value.replace(/\D/g, "").slice(0, maxLen);
      handleInputChange({ target: { name: "phone", value: numeric } });
    },
    [handleInputChange, formData.phoneCode],
  );

  const handleEmailChange = useCallback(
    (e) => {
      const filtered = e.target.value.replace(/[^a-zA-Z0-9@._-]/g, "");
      handleInputChange({ target: { name: "email", value: filtered } });
    },
    [handleInputChange],
  );

  // ── Next: validate step 0, show inline banner if errors ──────────────────
  const handleNext = useCallback(() => {
    const stepErrors = validateStep(0, formData);

    if (Object.keys(stepErrors).length > 0) {
      // Merge into field errors (red underlines) AND show banner
      setFormErrors((prev) => ({ ...prev, ...stepErrors }));
      setBannerErrors(stepErrors);

      // Smooth-scroll the banner into view
      setTimeout(() => {
        document.getElementById("mentor-step-banner-0")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return; // block navigation
    }

    setBannerErrors({});
    setStep(1);
  }, [formData]);

  const handleBack = useCallback(() => {
    setBannerErrors({});
    setStep(0);
  }, []);

  // ── Submit: validate step 1, then save ───────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const stepErrors = validateStep(1, formData);

    if (Object.keys(stepErrors).length > 0) {
      setFormErrors((prev) => ({ ...prev, ...stepErrors }));
      setBannerErrors(stepErrors);
      setTimeout(() => {
        document.getElementById("mentor-step-banner-1")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
      return;
    }

    // Full-form double-check (catches anything missed)
    const allErrors = validateFullForm(formData);
    if (Object.keys(allErrors).length > 0) {
      setFormErrors(allErrors);
      // If step-0 fields are broken, go back and show their banner
      const step0Errs = Object.fromEntries(
        Object.entries(allErrors).filter(([k]) => STEP_FIELDS[0].includes(k)),
      );
      if (Object.keys(step0Errs).length > 0) {
        setStep(0);
        setBannerErrors(step0Errs);
      } else {
        setBannerErrors(allErrors);
      }
      return;
    }

    setIsSaving(true);
    onClose();

    try {
      const isEdit = dialogType === "edit";

      const payload = {
        mentordetsincubatorid: formData.incubatorId,
        mentordetsmnttypeid: formData.typeId,
        mentordetsclasssetid: formData.classSetId,
        mentordetsname: formData.name,
        mentordetsdesign: formData.designation,
        mentordetsphone: formData.phone,
        mentordetsphonecode: formData.phoneCode,
        mentordetsaddress: formData.address,
        mentordetsemail: formData.email,
        mentordetsdomain: formData.domain,
        mentordetspastexp: formData.pastExp,
        mentordetslinkedin: formData.linkedin,
        mentordetswebsite: formData.website,
        mentordetsblog: formData.blog,
        mentordetsimagepath: formData.imagePath,
        mentordetstimecommitment: formData.timeCommitment,
        mentordetsprevstupmentor: formData.prevStupMentor,
        mentordetscomment: formData.comment,
        mentordetsgender: formData.gender,
        mentordetsadminstate: isEdit ? (formData.mentordetsadminstate ?? 1) : 1,
        mentordetsid: isEdit ? editingItem.mentordetsid : 0,
        mentordetsmodifiedby: userId || "1",
        ...(isEdit ? {} : { mentordetscreatedby: userId || "1" }),
      };

      const endpoint = isEdit ? "/updateMentor" : "/addMentor";
      const response = isEdit
        ? await api.post(endpoint, payload, {
            headers: { "X-Module": "Mentor Management", "X-Action": "Update" },
          })
        : await api.post(endpoint, null, {
            params: payload,
            headers: { "X-Module": "Mentor Management", "X-Action": "Add" },
          });

      if (response.data.statusCode === 200) {
        onSaveSuccess(
          `Mentor ${isEdit ? "updated" : "added"} successfully!`,
          "success",
        );
      } else {
        throw new Error(response.data.message || "Operation failed");
      }
    } catch (err) {
      console.error("Error saving mentor:", err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "An unknown error occurred";
      onSaveSuccess(msg, "error");
    } finally {
      setIsSaving(false);
    }
  }, [formData, dialogType, editingItem, userId, onClose, onSaveSuccess]);

  // Helpers
  const f = (name) => formData[name];
  const err = (name) => formErrors[name];

  return (
    <>
      {/* ── Dialog ── */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ pb: 0 }}>
          {dialogType === "add" ? "Add New" : "Edit"} Mentor
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ position: "absolute", right: 8, top: 8, color: "grey.500" }}
          >
            <CloseIcon />
          </IconButton>
          {/* Step indicator */}
          <Stepper activeStep={step} sx={{ mt: 2, pb: 1 }}>
            <Step>
              <StepLabel>Basic Info</StepLabel>
            </Step>
            <Step>
              <StepLabel>Professional Info</StepLabel>
            </Step>
          </Stepper>
        </DialogTitle>

        <DialogContent dividers>
          {/* ══════════════ STEP 0 : Basic Info ══════════════ */}
          {step === 0 && (
            <Box>
              {/* Error banner — replaces Swal popup */}
              <div id="mentor-step-banner-0">
                <StepErrorBanner errors={bannerErrors} />
              </div>

              <Grid container spacing={3}>
                {/* Mentor Type */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    name="typeId"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (val) =>
                        val ? (
                          (mentorTypes.find(
                            (t) => t.mentortypeid.toString() === val,
                          )?.mentortypename ?? val)
                        ) : (
                          <em style={{ color: "#aaa" }}>Select Mentor Type</em>
                        ),
                    }}
                    label="Mentor Type *"
                    InputLabelProps={{ shrink: true }}
                    value={f("typeId")}
                    onChange={handleInputChange}
                    variant="outlined"
                    error={!!err("typeId")}
                    helperText={err("typeId") || " "}
                  >
                    {mentorTypes.map((type) => (
                      <MenuItem
                        key={type.mentortypeid}
                        value={type.mentortypeid.toString()}
                      >
                        {type.mentortypename}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Classification */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    name="classSetId"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (val) =>
                        val ? (
                          (classifications.find(
                            (c) => c.mentorclassetrecid.toString() === val,
                          )?.mentorclassetname ?? val)
                        ) : (
                          <em style={{ color: "#aaa" }}>
                            Select Classification
                          </em>
                        ),
                    }}
                    label="Classification *"
                    InputLabelProps={{ shrink: true }}
                    value={f("classSetId")}
                    onChange={handleInputChange}
                    variant="outlined"
                    error={!!err("classSetId")}
                    helperText={err("classSetId") || " "}
                  >
                    {classifications.map((cls) => (
                      <MenuItem
                        key={cls.mentorclassetrecid}
                        value={cls.mentorclassetrecid.toString()}
                      >
                        {cls.mentorclassetname}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {/* Full Name */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="name"
                    label="Full Name *"
                    fullWidth
                    variant="outlined"
                    value={f("name")}
                    onChange={handleNameChange}
                    inputProps={{ maxLength: 50 }}
                    error={!!err("name")}
                    helperText={err("name")}
                  />
                </Grid>

                {/* Gender */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    name="gender"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (val) =>
                        val || <em style={{ color: "#aaa" }}>Select Gender</em>,
                    }}
                    label="Gender *"
                    InputLabelProps={{ shrink: true }}
                    value={f("gender")}
                    onChange={handleInputChange}
                    variant="outlined"
                    error={!!err("gender")}
                    helperText={err("gender") || " "}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </TextField>
                </Grid>

                {/* Designation */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="designation"
                    label="Designation *"
                    fullWidth
                    variant="outlined"
                    value={f("designation")}
                    onChange={handleInputChange}
                    error={!!err("designation")}
                    helperText={err("designation")}
                  />
                </Grid>

                {/* Email */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="email"
                    label="Email Address *"
                    fullWidth
                    variant="outlined"
                    value={f("email")}
                    onChange={handleEmailChange}
                    inputProps={{ maxLength: 50 }}
                    error={!!err("email")}
                    helperText={err("email")}
                  />
                </Grid>

                {/* Country Code + Phone */}
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Autocomplete
                      options={COUNTRY_CODES}
                      value={
                        COUNTRY_CODES.find((c) => c.code === f("phoneCode")) ||
                        COUNTRY_CODES[0]
                      }
                      onChange={(_, val) => {
                        if (val)
                          handleInputChange({
                            target: { name: "phoneCode", value: val.code },
                          });
                      }}
                      getOptionLabel={(o) => o.label}
                      isOptionEqualToValue={(o, v) => o.code === v.code}
                      disableClearable
                      filterOptions={filterCountryCodes}
                      sx={{ width: 220, flexShrink: 0 }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Code"
                          variant="outlined"
                        />
                      )}
                    />
                    <TextField
                      name="phone"
                      label="Phone Number *"
                      fullWidth
                      variant="outlined"
                      value={f("phone")}
                      onChange={handlePhoneChange}
                      inputProps={{
                        maxLength: getPhoneMaxLength(f("phoneCode")),
                        inputMode: "numeric",
                      }}
                      error={!!err("phone")}
                      helperText={
                        err("phone") ||
                        `Up to ${getPhoneMaxLength(f("phoneCode"))} digits`
                      }
                    />
                  </Box>
                </Grid>

                {/* Address */}
                <Grid item xs={12}>
                  <TextField
                    name="address"
                    label="Address *"
                    fullWidth
                    variant="outlined"
                    value={f("address")}
                    onChange={handleInputChange}
                    error={!!err("address")}
                    helperText={err("address")}
                  />
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ══════════════ STEP 1 : Professional Info ══════════════ */}
          {step === 1 && (
            <Box>
              {/* Error banner */}
              <div id="mentor-step-banner-1">
                <StepErrorBanner errors={bannerErrors} />
              </div>

              <Grid container spacing={3}>
                {/* Domain */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="domain"
                    label="Domain / Expertise *"
                    fullWidth
                    variant="outlined"
                    value={f("domain")}
                    onChange={handleInputChange}
                    error={!!err("domain")}
                    helperText={err("domain")}
                  />
                </Grid>

                {/* Past Experience */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="pastExp"
                    label="Past Experience *"
                    fullWidth
                    variant="outlined"
                    value={f("pastExp")}
                    onChange={handleInputChange}
                    error={!!err("pastExp")}
                    helperText={err("pastExp")}
                  />
                </Grid>

                {/* Time Commitment */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    name="timeCommitment"
                    label="Time Commitment *"
                    fullWidth
                    variant="outlined"
                    value={f("timeCommitment")}
                    onChange={handleInputChange}
                    error={!!err("timeCommitment")}
                    helperText={err("timeCommitment")}
                  />
                </Grid>

                {/* LinkedIn */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    name="linkedin"
                    label="LinkedIn Profile *"
                    fullWidth
                    variant="outlined"
                    value={f("linkedin")}
                    onChange={handleInputChange}
                    error={!!err("linkedin")}
                    helperText={err("linkedin")}
                  />
                </Grid>

                {/* Website */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    name="website"
                    label="Website *"
                    fullWidth
                    variant="outlined"
                    value={f("website")}
                    onChange={handleInputChange}
                    error={!!err("website")}
                    helperText={err("website")}
                  />
                </Grid>

                {/* Blog */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    name="blog"
                    label="Blog Link *"
                    fullWidth
                    variant="outlined"
                    value={f("blog")}
                    onChange={handleInputChange}
                    error={!!err("blog")}
                    helperText={err("blog")}
                  />
                </Grid>

                {/* Previously Mentored Startup */}
                <Grid item xs={12} sm={12} md={12}>
                  <TextField
                    name="prevStupMentor"
                    label="Previously Mentored Startup Experience? *"
                    fullWidth
                    variant="outlined"
                    value={f("prevStupMentor")}
                    onChange={handleInputChange}
                    error={!!err("prevStupMentor")}
                    helperText={err("prevStupMentor") || "Describe past startup mentoring experience"}
                  />
                </Grid>

                {/* Comments (optional) */}
                <Grid item xs={12}>
                  <TextField
                    name="comment"
                    label="Additional Comments"
                    fullWidth
                    variant="outlined"
                    multiline
                    rows={3}
                    value={f("comment")}
                    onChange={handleInputChange}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          {step === 0 ? (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleNext}
                variant="contained"
                endIcon={<FaArrowRight />}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleBack} startIcon={<FaArrowLeft />}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                variant="contained"
                disabled={isSaving}
                startIcon={
                  isSaving ? <CircularProgress size={16} /> : <FaSave />
                }
              >
                {dialogType === "add" ? "Add Mentor" : "Save Changes"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Global saving overlay ── */}
      <StyledBackdrop open={isSaving}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {dialogType === "add" ? "Adding mentor..." : "Updating mentor..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </>
  );
}

