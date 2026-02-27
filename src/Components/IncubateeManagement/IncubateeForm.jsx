import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Backdrop,
  TextField,
  Grid,
  Card,
  CardContent,
  Tab,
  Tabs,
  AppBar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Collapse,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Swal from "sweetalert2";

import api from "../Datafetching/api";
import {
  validateField,
  validateTab,
  validateFullForm,
  TAB_ALL_FIELDS,
  DUPLICATE_CHECK_FIELDS,
  FIELD_TO_API_KEY,
  FIELD_LABELS,
  EMPTY_FORM,
} from "./incubateeValidations";

// ─── Styled components ────────────────────────────────────────────────────────

const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": { borderRadius: 16, boxShadow: theme.shadows[10] },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(3),
  maxHeight: "80vh",
  overflowY: "auto",
}));

const SectionCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  transition: "all 0.3s ease",
  "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.15)" },
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1.5),
  backgroundColor: theme.palette.primary.light,
  borderRadius: 8,
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    transition: "all 0.3s ease",
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    transition: "all 0.3s ease",
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.primary.main,
    },
    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderWidth: 2 },
  },
  "& .MuiSelect-select": { minWidth: "200px" },
}));

// ─── TabPanel ─────────────────────────────────────────────────────────────────

const TabPanel = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`incubatee-tabpanel-${index}`}
  >
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

// ─── Error banner shown at top of each tab ────────────────────────────────────

const TabErrorBanner = ({ errors }) => {
  const messages = Object.values(errors).filter(Boolean);
  if (messages.length === 0) return null;

  return (
    <Collapse in>
      <Alert
        severity="error"
        icon={<ErrorOutlineIcon />}
        sx={{
          mb: 2,
          borderRadius: 2,
          "& .MuiAlert-message": { width: "100%" },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          Please fix the following before proceeding:
        </Typography>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          {messages.map((msg, i) => (
            <li key={i} style={{ marginBottom: 2 }}>
              {msg}
            </li>
          ))}
        </ul>
      </Alert>
    </Collapse>
  );
};

// ─── IncubateeForm ────────────────────────────────────────────────────────────

export default function IncubateeForm({
  isModalOpen,
  setIsModalOpen,
  editIncubatee,
  fieldOfWorkOptions,
  stageLevelOptions,
  onSaveSuccess,
}) {
  const userId = sessionStorage.getItem("userid");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [tabBannerErrors, setTabBannerErrors] = useState({}); // errors shown in banner for current tab
  const [tabValue, setTabValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState({});

  const debounceTimeouts = useRef({});

  // ── Initialise / reset form when modal opens ──────────────────────────────
  useEffect(() => {
    if (!isModalOpen) return;

    setTabValue(0);
    setFormErrors({});
    setTabBannerErrors({});
    setSaveError(null);

    if (editIncubatee) {
      setFormData({
        incubateesfieldofwork: editIncubatee.incubateesfieldofwork || "",
        incubateesstagelevel: editIncubatee.incubateesstagelevel || "",
        incubateesname: editIncubatee.incubateesname || "",
        incubateesemail: editIncubatee.incubateesemail || "",
        incubateesshortname: editIncubatee.incubateesshortname || "",
        incubateestotalshare: editIncubatee.incubateestotalshare || "",
        incubateesshareperprice: editIncubatee.incubateesshareperprice || "",
        incubateescin: editIncubatee.incubateescin || "",
        incubateesdin: editIncubatee.incubateesdin || "",
        incubateesgst: editIncubatee.incubateesgst || "",
        incubateesgstregdate: editIncubatee.incubateesgstregdate || "",
        incubateesdpiitnumber: editIncubatee.incubateesdpiitnumber || "",
        incubateeslogopath: editIncubatee.incubateeslogopath || "",
        incubateesdurationofextension:
          editIncubatee.incubateesdurationofextension || "",
        incubateesaddress: editIncubatee.incubateesaddress || "",
        incubateesincubatorname: editIncubatee.incubateesincubatorname || "",
        incubateesincubatoremail: editIncubatee.incubateesincubatoremail || "",
        incubateesincubatorphone: editIncubatee.incubateesincubatorphone || "",
        incubateespannumber: editIncubatee.incubateespannumber || "",
        incubateesuan: editIncubatee.incubateesuan || "",
        incubateesnooffounders: editIncubatee.incubateesnooffounders || "",
        incubateesaccountantname: editIncubatee.incubateesaccountantname || "",
        incubateesauditorname: editIncubatee.incubateesauditorname || "",
        incubateessecretaryname: editIncubatee.incubateessecretaryname || "",
        incubateesadminstate: editIncubatee.incubateesadminstate || 0,
        incubateesfoundername: editIncubatee.incubateesfoundername || "",
        incubateesdateofincubation:
          editIncubatee.incubateesdateofincubation || "",
        incubateesdateofincorporation:
          editIncubatee.incubateesdateofincorporation || "",
        incubateesdateofextension:
          editIncubatee.incubateesdateofextension || "",
        incubateeswebsite: editIncubatee.incubateeswebsite || "",
        incubateescreatedtime:
          editIncubatee.incubateescreatedtime ||
          new Date().toISOString().split("T")[0],
        incubateesmodifiedtime: new Date().toISOString().split("T")[0],
        incubateescreatedby: editIncubatee.incubateescreatedby || userId || 1,
        incubateesmodifiedby: userId || 1,
      });
    } else {
      setFormData({
        ...EMPTY_FORM,
        incubateesadminstate: 1,
        incubateescreatedtime: new Date().toISOString().split("T")[0],
        incubateesmodifiedtime: new Date().toISOString().split("T")[0],
        incubateescreatedby: userId || 1,
        incubateesmodifiedby: userId || 1,
      });
    }
  }, [isModalOpen, editIncubatee, userId]);

  // ── Duplicate checker ─────────────────────────────────────────────────────
  const checkDuplicate = useCallback(
    (field, value) => {
      if (!value || (editIncubatee && editIncubatee[field] === value)) return;
      if (debounceTimeouts.current[field])
        clearTimeout(debounceTimeouts.current[field]);

      setCheckingDuplicate((prev) => ({ ...prev, [field]: true }));

      debounceTimeouts.current[field] = setTimeout(() => {
        const requestBody = Object.fromEntries(
          Object.entries(FIELD_TO_API_KEY).map(([formKey, apiKey]) => [
            apiKey,
            formKey === field ? value : "",
          ]),
        );

        api
          .post("/resources/generic/checkincubateeunique", requestBody, {
            headers: {
              "X-Module": "Incubatee Management",
              "X-Action": "Check Duplicate",
            },
          })
          .then((res) => {
            if (res.data.statusCode === 200) {
              setFormErrors((prev) => {
                const updated = { ...prev };
                if (updated[field]?.includes("already exists"))
                  delete updated[field];
                return updated;
              });
            }
          })
          .catch((err) => {
            if (err.response?.status === 409) {
              const label = FIELD_LABELS[field] || field;
              setFormErrors((prev) => ({
                ...prev,
                [field]: `This ${label} already exists`,
              }));
            }
          })
          .finally(() =>
            setCheckingDuplicate((prev) => ({ ...prev, [field]: false })),
          );
      }, 800);
    },
    [editIncubatee],
  );

  // ── handleChange ──────────────────────────────────────────────────────────
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? (checked ? 1 : 0) : value;

      setFormData((prev) => ({ ...prev, [name]: newValue }));

      const err = validateField(name, newValue);
      setFormErrors((prev) => {
        const updated = { ...prev };
        if (err) updated[name] = err;
        else delete updated[name];
        return updated;
      });

      // Clear this field from banner errors when user fixes it
      setTabBannerErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });

      if (DUPLICATE_CHECK_FIELDS.includes(name) && !err)
        checkDuplicate(name, newValue);
    },
    [checkDuplicate],
  );

  // ── Next: validate current tab before proceeding ──────────────────────────
  const handleNextTab = useCallback(() => {
    const tabErrors = validateTab(tabValue, formData);

    if (Object.keys(tabErrors).length > 0) {
      // Show inline field errors + banner
      setFormErrors((prev) => ({ ...prev, ...tabErrors }));
      setTabBannerErrors(tabErrors);
      // Scroll banner into view
      setTimeout(() => {
        document
          .getElementById(`tab-error-banner-${tabValue}`)
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 50);
      return; // Block navigation
    }

    setTabBannerErrors({});
    setTabValue((prev) => Math.min(prev + 1, 3));
  }, [tabValue, formData]);

  const handlePrevTab = useCallback(() => {
    setTabBannerErrors({});
    setTabValue((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleTabClick = useCallback((_, newValue) => {
    setTabBannerErrors({});
    setTabValue(newValue);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      const errors = validateFullForm(formData);
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        // Jump to first tab with errors and show its banner
        for (let t = 0; t <= 3; t++) {
          const fields = TAB_ALL_FIELDS[t] || [];
          const tabErrs = Object.fromEntries(
            Object.entries(errors).filter(([k]) => fields.includes(k)),
          );
          if (Object.keys(tabErrs).length > 0) {
            setTabValue(t);
            setTabBannerErrors(tabErrs);
            break;
          }
        }
        return;
      }

      setIsSaving(true);
      setSaveError(null);
      setIsModalOpen(false);

      const isEdit = !!editIncubatee;

      api
        .post(
          isEdit ? "/updateIncubatee" : "/addIncubatee",
          {},
          {
            params: {
              ...(isEdit && {
                incubateesrecid: editIncubatee.incubateesrecid,
              }),
              incubateesfieldofwork: formData.incubateesfieldofwork,
              incubateesstagelevel: formData.incubateesstagelevel,
              incubateesname: formData.incubateesname.trim(),
              incubateesemail: formData.incubateesemail.trim(),
              incubateesshortname: formData.incubateesshortname.trim(),
              incubateestotalshare: formData.incubateestotalshare,
              incubateesshareperprice: formData.incubateesshareperprice,
              incubateescin: formData.incubateescin.trim(),
              incubateesdin: formData.incubateesdin.trim(),
              incubateesgst: formData.incubateesgst.trim(),
              incubateesgstregdate: formData.incubateesgstregdate,
              incubateesdpiitnumber: formData.incubateesdpiitnumber.trim(),
              incubateeslogopath: formData.incubateeslogopath.trim(),
              incubateesdurationofextension:
                formData.incubateesdurationofextension,
              incubateesaddress: formData.incubateesaddress.trim(),
              incubateesincubatorname: formData.incubateesincubatorname.trim(),
              incubateesincubatoremail:
                formData.incubateesincubatoremail.trim(),
              incubateesincubatorphone:
                formData.incubateesincubatorphone.trim(),
              incubateespannumber: formData.incubateespannumber.trim(),
              incubateesuan: formData.incubateesuan.trim(),
              incubateesnooffounders: formData.incubateesnooffounders,
              incubateesaccountantname:
                formData.incubateesaccountantname.trim(),
              incubateesauditorname: formData.incubateesauditorname.trim(),
              incubateessecretaryname: formData.incubateessecretaryname.trim(),
              incubateesadminstate: formData.incubateesadminstate,
              incubateesfoundername: formData.incubateesfoundername.trim(),
              incubateesdateofincubation: formData.incubateesdateofincubation,
              incubateesdateofincorporation:
                formData.incubateesdateofincorporation,
              incubateesdateofextension: formData.incubateesdateofextension,
              incubateeswebsite: formData.incubateeswebsite,
              incubateesincrecid: 1,
              incubateescreatedtime: formData.incubateescreatedtime,
              incubateesmodifiedtime: formData.incubateesmodifiedtime,
              incubateescreatedby: formData.incubateescreatedby,
              incubateesmodifiedby: formData.incubateesmodifiedby,
            },
            headers: {
              "X-Module": "Incubatee Management",
              "X-Action": isEdit ? "Update Incubatee" : "Add Incubatee",
            },
          },
        )
        .then((response) => {
          if (response.data.statusCode === 200) {
            if (
              typeof response.data.data === "string" &&
              response.data.data.includes("Duplicate entry")
            ) {
              setSaveError("Incubatee with this email already exists");
              Swal.fire(
                "Duplicate",
                "Incubatee with this email already exists!",
                "warning",
              ).then(() => setIsModalOpen(true));
            } else {
              onSaveSuccess(
                response.data.message || "Incubatee saved successfully!",
              );
            }
          } else {
            throw new Error(response.data.message || "Operation failed");
          }
        })
        .catch((err) => {
          console.error("Error saving incubatee:", err);
          setSaveError(`Failed to save: ${err.message}`);
          Swal.fire(
            "Error",
            `Failed to save incubatee: ${err.message}`,
            "error",
          ).then(() => setIsModalOpen(true));
        })
        .finally(() => setIsSaving(false));
    },
    [formData, editIncubatee, setIsModalOpen, onSaveSuccess],
  );

  const hasRealErrors = Object.values(formErrors).some((e) => e !== "");

  // ── Helpers ───────────────────────────────────────────────────────────────
  const f = (name) => formData[name]; // shorthand
  const err = (name) => formErrors[name]; // shorthand

  return (
    <>
      <StyledDialog
        open={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {editIncubatee ? "Edit Incubatee" : "Add New Incubatee"}
          </Typography>
          <IconButton
            onClick={() => setIsModalOpen(false)}
            disabled={isSaving}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: (t) => t.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleSubmit}>
          <StyledDialogContent>
            {/* Tabs header */}
            <AppBar position="static" color="default" elevation={0}>
              <Tabs
                value={tabValue}
                onChange={handleTabClick}
                indicatorColor="primary"
                textColor="primary"
                variant="fullWidth"
                sx={{ borderBottom: "1px solid #e0e0e0" }}
              >
                <Tab
                  icon={<BusinessIcon />}
                  label="Basic Info"
                  iconPosition="start"
                />
                <Tab
                  icon={<PersonIcon />}
                  label="Legal & Financial"
                  iconPosition="start"
                />
                <Tab
                  icon={<DescriptionIcon />}
                  label="Incubation Details"
                  iconPosition="start"
                />
                <Tab
                  icon={<SettingsIcon />}
                  label="Additional Info"
                  iconPosition="start"
                />
              </Tabs>
            </AppBar>

            {/* ─────────────────── TAB 0: Basic Info ─────────────────── */}
            <TabPanel value={tabValue} index={0}>
              <div id="tab-error-banner-0">
                <TabErrorBanner errors={tabBannerErrors} />
              </div>
              <SectionCard>
                <CardContent>
                  <SectionHeader>
                    <BusinessIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Basic Information
                    </Typography>
                  </SectionHeader>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Incubatee Name *"
                        name="incubateesname"
                        value={f("incubateesname")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesname")}
                        helperText={err("incubateesname")}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Email *"
                        name="incubateesemail"
                        type="email"
                        value={f("incubateesemail")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesemail")}
                        helperText={err("incubateesemail")}
                        InputProps={{
                          endAdornment: checkingDuplicate.incubateesemail && (
                            <CircularProgress size={20} />
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Short Name"
                        name="incubateesshortname"
                        value={f("incubateesshortname")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesshortname")}
                        helperText={err("incubateesshortname")}
                        InputProps={{
                          endAdornment:
                            checkingDuplicate.incubateesshortname && (
                              <CircularProgress size={20} />
                            ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledFormControl
                        fullWidth
                        variant="outlined"
                        disabled={isSaving}
                      >
                        <InputLabel>Field of Work</InputLabel>
                        <Select
                          name="incubateesfieldofwork"
                          value={f("incubateesfieldofwork")}
                          onChange={handleChange}
                          label="Field of Work"
                          MenuProps={{
                            PaperProps: { style: { maxHeight: 300 } },
                          }}
                        >
                          {fieldOfWorkOptions.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.text}
                            </MenuItem>
                          ))}
                        </Select>
                      </StyledFormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledFormControl
                        fullWidth
                        variant="outlined"
                        disabled={isSaving}
                      >
                        <InputLabel>Stage Level</InputLabel>
                        <Select
                          name="incubateesstagelevel"
                          value={f("incubateesstagelevel")}
                          onChange={handleChange}
                          label="Stage Level"
                          MenuProps={{
                            PaperProps: { style: { maxHeight: 300 } },
                          }}
                        >
                          {stageLevelOptions.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.text}
                            </MenuItem>
                          ))}
                        </Select>
                      </StyledFormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Founder Name"
                        name="incubateesfoundername"
                        value={f("incubateesfoundername")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <StyledTextField
                        fullWidth
                        label="Address"
                        name="incubateesaddress"
                        value={f("incubateesaddress")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <StyledTextField
                        fullWidth
                        label="Website"
                        name="incubateeswebsite"
                        value={f("incubateeswebsite")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        placeholder="https://example.com"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SectionCard>
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleNextTab}
                  sx={{ minWidth: 120 }}
                >
                  Next
                </Button>
              </Box>
            </TabPanel>

            {/* ─────────────────── TAB 1: Legal & Financial ─────────────────── */}
            <TabPanel value={tabValue} index={1}>
              <div id="tab-error-banner-1">
                <TabErrorBanner errors={tabBannerErrors} />
              </div>
              <SectionCard>
                <CardContent>
                  <SectionHeader>
                    <DescriptionIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Legal & Financial Information
                    </Typography>
                  </SectionHeader>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="CIN"
                        name="incubateescin"
                        value={f("incubateescin")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateescin")}
                        helperText={
                          err("incubateescin") ||
                          "Format: U74140DL2014PTC272828"
                        }
                        InputProps={{
                          endAdornment: checkingDuplicate.incubateescin && (
                            <CircularProgress size={20} />
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="DIN"
                        name="incubateesdin"
                        value={f("incubateesdin")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesdin")}
                        helperText={err("incubateesdin") || "8-digit number"}
                        InputProps={{
                          endAdornment: checkingDuplicate.incubateesdin && (
                            <CircularProgress size={20} />
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="GST"
                        name="incubateesgst"
                        value={f("incubateesgst")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesgst")}
                        helperText={
                          err("incubateesgst") || "Format: 22AAAAA0000A1Z5"
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="GST Registration Date"
                        name="incubateesgstregdate"
                        type="date"
                        value={f("incubateesgstregdate")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="DPIIT Number"
                        name="incubateesdpiitnumber"
                        value={f("incubateesdpiitnumber")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="PAN Number"
                        name="incubateespannumber"
                        value={f("incubateespannumber")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateespannumber")}
                        helperText={
                          err("incubateespannumber") || "Format: ABCDE1234F"
                        }
                        InputProps={{
                          endAdornment:
                            checkingDuplicate.incubateespannumber && (
                              <CircularProgress size={20} />
                            ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="UAN"
                        name="incubateesuan"
                        value={f("incubateesuan")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesuan")}
                        helperText={err("incubateesuan") || "12-digit number"}
                        InputProps={{
                          endAdornment: checkingDuplicate.incubateesuan && (
                            <CircularProgress size={20} />
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Total Share"
                        name="incubateestotalshare"
                        type="number"
                        value={f("incubateestotalshare")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Share Per Price"
                        name="incubateesshareperprice"
                        type="number"
                        value={f("incubateesshareperprice")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Number of Founders"
                        name="incubateesnooffounders"
                        type="number"
                        value={f("incubateesnooffounders")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SectionCard>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Button
                  variant="outlined"
                  onClick={handlePrevTab}
                  sx={{ minWidth: 120 }}
                >
                  Previous
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNextTab}
                  sx={{ minWidth: 120 }}
                >
                  Next
                </Button>
              </Box>
            </TabPanel>

            {/* ─────────────────── TAB 2: Incubation Details ─────────────────── */}
            <TabPanel value={tabValue} index={2}>
              <div id="tab-error-banner-2">
                <TabErrorBanner errors={tabBannerErrors} />
              </div>
              <SectionCard>
                <CardContent>
                  <SectionHeader>
                    <PersonIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Incubation Details
                    </Typography>
                  </SectionHeader>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Date of Incubation"
                        name="incubateesdateofincubation"
                        type="date"
                        value={f("incubateesdateofincubation")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Date of Incorporation"
                        name="incubateesdateofincorporation"
                        type="date"
                        value={f("incubateesdateofincorporation")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Duration of Extension (months)"
                        name="incubateesdurationofextension"
                        type="number"
                        value={f("incubateesdurationofextension")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Date of Extension"
                        name="incubateesdateofextension"
                        type="date"
                        value={f("incubateesdateofextension")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Incubator Name"
                        name="incubateesincubatorname"
                        value={f("incubateesincubatorname")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Incubator Email"
                        name="incubateesincubatoremail"
                        type="email"
                        value={f("incubateesincubatoremail")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!err("incubateesincubatoremail")}
                        helperText={err("incubateesincubatoremail")}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Incubator Phone"
                        name="incubateesincubatorphone"
                        value={f("incubateesincubatorphone")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        inputProps={{ maxLength: 10 }}
                        error={!!err("incubateesincubatorphone")}
                        helperText={
                          err("incubateesincubatorphone") ||
                          "10-digit Indian mobile number (starts with 6-9)"
                        }
                        InputProps={{
                          endAdornment:
                            checkingDuplicate.incubateesincubatorphone && (
                              <CircularProgress size={20} />
                            ),
                        }}
                      />
                    </Grid>
                    {editIncubatee && (
                      <Grid item xs={12} sm={6}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", mt: 1 }}
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                checked={f("incubateesadminstate") === 1}
                                onChange={handleChange}
                                name="incubateesadminstate"
                                color="primary"
                                disabled={isSaving}
                              />
                            }
                            label="Status"
                          />
                          <Typography variant="caption" sx={{ ml: 1 }}>
                            {f("incubateesadminstate") === 1
                              ? "Active"
                              : "Inactive"}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </SectionCard>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Button
                  variant="outlined"
                  onClick={handlePrevTab}
                  sx={{ minWidth: 120 }}
                >
                  Previous
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNextTab}
                  sx={{ minWidth: 120 }}
                >
                  Next
                </Button>
              </Box>
            </TabPanel>

            {/* ─────────────────── TAB 3: Additional Info ─────────────────── */}
            <TabPanel value={tabValue} index={3}>
              <div id="tab-error-banner-3">
                <TabErrorBanner errors={tabBannerErrors} />
              </div>
              <SectionCard>
                <CardContent>
                  <SectionHeader>
                    <SettingsIcon sx={{ mr: 1, color: "primary.main" }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Additional Information
                    </Typography>
                  </SectionHeader>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Accountant Name"
                        name="incubateesaccountantname"
                        value={f("incubateesaccountantname")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Auditor Name"
                        name="incubateesauditorname"
                        value={f("incubateesauditorname")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Secretary Name"
                        name="incubateessecretaryname"
                        value={f("incubateessecretaryname")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Logo Path (optional)"
                        name="incubateeslogopath"
                        value={f("incubateeslogopath")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        helperText="Optional: path or URL to company logo"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Created Time"
                        name="incubateescreatedtime"
                        type="date"
                        value={f("incubateescreatedtime")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Modified Time"
                        name="incubateesmodifiedtime"
                        type="date"
                        value={f("incubateesmodifiedtime")}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </SectionCard>

              {saveError && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {saveError}
                </Alert>
              )}

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}
              >
                <Button
                  variant="outlined"
                  onClick={handlePrevTab}
                  sx={{ minWidth: 120 }}
                >
                  Previous
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSaving || hasRealErrors}
                  startIcon={isSaving ? <CircularProgress size={20} /> : null}
                  sx={{ minWidth: 120 }}
                >
                  {editIncubatee ? "Update" : "Save"}
                </Button>
              </Box>
            </TabPanel>
          </StyledDialogContent>
        </form>
      </StyledDialog>

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
            {editIncubatee ? "Updating incubatee..." : "Saving incubatee..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </>
  );
}
