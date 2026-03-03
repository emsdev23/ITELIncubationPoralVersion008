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
  Select,
  InputLabel,
  Grid,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Backdrop,
  Alert,
  Collapse,
  styled,
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
} from "./Mentorvalidations";

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
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const err = validateField(name, value);
    setFormErrors((prev) => {
      const updated = { ...prev };
      if (err) updated[name] = err;
      else delete updated[name];
      return updated;
    });

    // Clear this field from the banner when user fixes it
    setBannerErrors((prev) => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  }, []);

  // Specialised input handlers (filter characters + validate)
  const handleNameChange = useCallback(
    (e) => {
      const filtered = e.target.value.replace(/[^a-zA-Z. ]/g, "");
      handleInputChange({ target: { name: "name", value: filtered } });
    },
    [handleInputChange],
  );

  const handlePhoneChange = useCallback(
    (e) => {
      const numeric = e.target.value.replace(/\D/g, "");
      handleInputChange({ target: { name: "phone", value: numeric } });
    },
    [handleInputChange],
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

                {/* Phone */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="phone"
                    label="Phone Number *"
                    fullWidth
                    variant="outlined"
                    value={f("phone")}
                    onChange={handlePhoneChange}
                    inputProps={{ maxLength: 10, inputMode: "numeric" }}
                    error={!!err("phone")}
                    helperText={
                      err("phone") ||
                      "10-digit Indian mobile number (starts with 6-9)"
                    }
                  />
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
                <Grid item xs={12} sm={4}>
                  <TextField
                    select
                    fullWidth
                    name="prevStupMentor"
                    SelectProps={{
                      displayEmpty: true,
                      renderValue: (val) =>
                        val || (
                          <em style={{ color: "#aaa" }}>Select an option</em>
                        ),
                    }}
                    label="Previously Mentored Startup? *"
                    InputLabelProps={{ shrink: true }}
                    value={f("prevStupMentor")}
                    onChange={handleInputChange}
                    variant="outlined"
                    error={!!err("prevStupMentor")}
                    helperText={err("prevStupMentor") || " "}
                  >
                    <MenuItem value="Yes">Yes</MenuItem>
                    <MenuItem value="No">No</MenuItem>
                  </TextField>
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
