import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { FaTimes } from "react-icons/fa";

// Material UI imports
import {
  Button,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  TextField,
  Grid,
  Paper,
  Card,
  CardContent,
  Tab,
  Tabs,
  AppBar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  FormControlLabel,
  Switch,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import BusinessIcon from "@mui/icons-material/Business";
import PersonIcon from "@mui/icons-material/Person";
import DescriptionIcon from "@mui/icons-material/Description";
import SettingsIcon from "@mui/icons-material/Settings";

// Import your reusable component and API instances
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import api from "../Datafetching/api";

// Styled components
const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

const ActionButton = styled(IconButton)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  backgroundColor:
    color === "edit" ? theme.palette.primary.main : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit" ? theme.palette.primary.dark : theme.palette.error.dark,
  },
}));

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    borderRadius: 16,
    boxShadow: theme.shadows[10],
  },
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
  "&:hover": {
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
  },
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
    "&:hover": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.primary.main,
      },
    },
    "&.Mui-focused": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderWidth: 2,
      },
    },
  },
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: "100%",
  "& .MuiOutlinedInput-root": {
    borderRadius: 8,
    transition: "all 0.3s ease",
    "&:hover": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: theme.palette.primary.main,
      },
    },
    "&.Mui-focused": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderWidth: 2,
      },
    },
  },
  "& .MuiSelect-select": {
    minWidth: "200px",
  },
}));

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`incubatee-tabpanel-${index}`}
    aria-labelledby={`incubatee-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const normalizedDate = dateStr.replace("?", " ");
    const date = new Date(normalizedDate);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
};

// Validation functions
const validateGST = (gst) => {
  if (!gst) return true; // Empty is valid (optional field)
  const gstPattern =
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstPattern.test(gst.toUpperCase());
};

const validatePAN = (pan) => {
  if (!pan) return true;
  const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panPattern.test(pan.toUpperCase());
};

const validateCIN = (cin) => {
  if (!cin) return true;
  const cinPattern = /^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
  return cinPattern.test(cin.toUpperCase());
};

const validateUAN = (uan) => {
  if (!uan) return true;
  const uanPattern = /^[0-9]{12}$/;
  return uanPattern.test(uan);
};

const validateEmail = (email) => {
  if (!email) return false; // Email is required
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

const validateDIN = (din) => {
  if (!din) return true;
  const dinPattern = /^[0-9]{8}$/;
  return dinPattern.test(din);
};

export default function IncubateeTable() {
  // State declarations
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");

  const [incubatees, setIncubatees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIncubatee, setEditIncubatee] = useState(null);
  const [formData, setFormData] = useState({
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
    incubateesincrecid: "",
    incubateescreatedtime: "",
    incubateesmodifiedtime: "",
    incubateescreatedby: "",
    incubateesmodifiedby: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [tabValue, setTabValue] = useState(0);
  const [fieldOfWorkOptions, setFieldOfWorkOptions] = useState([]);
  const [stageLevelOptions, setStageLevelOptions] = useState([]);
  const [formErrors, setFormErrors] = useState({});
  const [checkingDuplicate, setCheckingDuplicate] = useState({});

  // Debounce timeout refs
  const debounceTimeouts = useRef({});

  // Fetch dropdown options
  const fetchDropdownOptions = useCallback(() => {
    // Fetch field of work options
    api
      .post(
        "/resources/generic/getincfield",
        {
          userId: parseInt(userId) || 1,
          userIncId: incUserid,
        },
        {
          headers: {
            "X-Module": "Incubatee Management",
            "X-Action": "Fetch Field of Work Options",
          },
        },
      )
      .then((response) => {
        if (response.data.statusCode === 200) {
          setFieldOfWorkOptions(response.data.data || []);
        }
      })
      .catch((err) => {
        console.error("Error fetching field of work options:", err);
      });

    // Fetch stage level options
    api
      .post(
        "/resources/generic/getincstage",
        {
          userId: parseInt(userId) || 1,
          userIncId: incUserid,
        },
        {
          headers: {
            "X-Module": "Incubatee Management",
            "X-Action": "Fetch Stage Level Options",
          },
        },
      )
      .then((response) => {
        if (response.data.statusCode === 200) {
          setStageLevelOptions(response.data.data || []);
        }
      })
      .catch((err) => {
        console.error("Error fetching stage level options:", err);
      });
  }, [userId, incUserid]);

  // Fetch Incubatees
  const fetchIncubatees = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .post(
        "/resources/generic/getincubatee",
        {
          userId: parseInt(userId) || 1,
          userIncId: incUserid,
        },
        {
          headers: {
            "X-Module": "Incubatee Management",
            "X-Action": "Fetch Incubatees",
          },
        },
      )
      .then((response) => {
        setIncubatees(response.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching incubatees:", err);
        setError("Failed to load incubatees. Please try again.");
        setLoading(false);
      });
  }, [userId, incUserid]);

  useEffect(() => {
    fetchIncubatees();
    fetchDropdownOptions();
  }, [fetchIncubatees, fetchDropdownOptions]);

  // Check for duplicate entries
  const checkDuplicate = useCallback(
    (field, value) => {
      // Skip if value is empty or if we're editing and the value hasn't changed
      if (!value || (editIncubatee && editIncubatee[field] === value)) {
        return;
      }

      // Clear any existing timeout for this field
      if (debounceTimeouts.current[field]) {
        clearTimeout(debounceTimeouts.current[field]);
      }

      // Set checking state
      setCheckingDuplicate((prev) => ({ ...prev, [field]: true }));

      // Debounce the API call
      // ✅ AFTER
      debounceTimeouts.current[field] = setTimeout(() => {
        // Map each form field name to the exact API key your endpoint expects
        const fieldToApiKey = {
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

        // Build the body: only the current field gets the value, rest are empty
        const requestBody = Object.fromEntries(
          Object.entries(fieldToApiKey).map(([formKey, apiKey]) => [
            apiKey,
            formKey === field ? value : "",
          ]),
        );

        // Human-readable label for error messages, keyed by form field name
        const fieldLabels = {
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

        api
          .post("/resources/generic/checkincubateeunique", requestBody, {
            headers: {
              "X-Module": "Incubatee Management",
              "X-Action": "Check Duplicate",
            },
          })
          .then((response) => {
            // 200 = no duplicate — clear any previous duplicate error on this field
            if (response.data.statusCode === 200) {
              setFormErrors((prev) => {
                const newErrors = { ...prev };
                if (newErrors[field]?.includes("already exists")) {
                  delete newErrors[field];
                }
                return newErrors;
              });
            }
          })
          .catch((err) => {
            // 409 = duplicate found — this is the expected duplicate response
            if (err.response && err.response.status === 409) {
              const label = fieldLabels[field] || field;
              setFormErrors((prev) => ({
                ...prev,
                [field]: `This ${label} already exists`,
              }));
            } else {
              // Actual network or server error — just log, don't block the user
              console.error("Error checking duplicate:", err);
            }
          })
          .finally(() => {
            setCheckingDuplicate((prev) => ({ ...prev, [field]: false }));
          });
      }, 800); // 800ms debounce delay
    },
    [editIncubatee],
  );

  // Validate individual field
  const validateField = useCallback((name, value) => {
    let error = "";

    switch (name) {
      case "incubateesname":
        if (!value?.trim()) {
          error = "Incubatee name is required";
        }
        break;

      case "incubateesemail":
        if (!value?.trim()) {
          error = "Email is required";
        } else if (!validateEmail(value)) {
          error = "Please enter a valid email address";
        }
        break;

      case "incubateesgst":
        if (value && !validateGST(value)) {
          error = "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)";
        }
        break;

      case "incubateespannumber":
        if (value && !validatePAN(value)) {
          error = "Please enter a valid PAN number (e.g., ABCDE1234F)";
        }
        break;

      case "incubateescin":
        if (value && !validateCIN(value)) {
          error =
            "Please enter a valid CIN number (e.g., U74140DL2014PTC272828)";
        }
        break;

      case "incubateesdin":
        if (value && !validateDIN(value)) {
          error = "Please enter a valid 8-digit DIN number";
        }
        break;

      case "incubateesuan":
        if (value && !validateUAN(value)) {
          error = "Please enter a valid 12-digit UAN number";
        }
        break;

      case "incubateesincubatoremail":
        if (value && !validateEmail(value)) {
          error = "Please enter a valid incubator email address";
        }
        break;

      default:
        break;
    }

    return error;
  }, []);

  const openAddModal = useCallback(() => {
    setEditIncubatee(null);
    setFormData({
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
      incubateesincrecid: "",
      incubateescreatedtime: new Date().toISOString().split("T")[0],
      incubateesmodifiedtime: new Date().toISOString().split("T")[0],
      incubateescreatedby: userId || 1,
      incubateesmodifiedby: userId || 1,
    });
    setTabValue(0);
    setIsModalOpen(true);
    setError(null);
    setFormErrors({});
  }, [userId]);

  const openEditModal = useCallback(
    (incubatee) => {
      setEditIncubatee(incubatee);
      setFormData({
        incubateesfieldofwork: incubatee.incubateesfieldofwork || "",
        incubateesstagelevel: incubatee.incubateesstagelevel || "",
        incubateesname: incubatee.incubateesname || "",
        incubateesemail: incubatee.incubateesemail || "",
        incubateesshortname: incubatee.incubateesshortname || "",
        incubateestotalshare: incubatee.incubateestotalshare || "",
        incubateesshareperprice: incubatee.incubateesshareperprice || "",
        incubateescin: incubatee.incubateescin || "",
        incubateesdin: incubatee.incubateesdin || "",
        incubateesgst: incubatee.incubateesgst || "",
        incubateesgstregdate: incubatee.incubateesgstregdate || "",
        incubateesdpiitnumber: incubatee.incubateesdpiitnumber || "",
        incubateeslogopath: incubatee.incubateeslogopath || "",
        incubateesdurationofextension:
          incubatee.incubateesdurationofextension || "",
        incubateesaddress: incubatee.incubateesaddress || "",
        incubateesincubatorname: incubatee.incubateesincubatorname || "",
        incubateesincubatoremail: incubatee.incubateesincubatoremail || "",
        incubateesincubatorphone: incubatee.incubateesincubatorphone || "",
        incubateespannumber: incubatee.incubateespannumber || "",
        incubateesuan: incubatee.incubateesuan || "",
        incubateesnooffounders: incubatee.incubateesnooffounders || "",
        incubateesaccountantname: incubatee.incubateesaccountantname || "",
        incubateesauditorname: incubatee.incubateesauditorname || "",
        incubateessecretaryname: incubatee.incubateessecretaryname || "",
        incubateesadminstate: incubatee.incubateesadminstate || 0,
        incubateesfoundername: incubatee.incubateesfoundername || "",
        incubateesdateofincubation: incubatee.incubateesdateofincubation || "",
        incubateesdateofincorporation:
          incubatee.incubateesdateofincorporation || "",
        incubateesdateofextension: incubatee.incubateesdateofextension || "",
        incubateeswebsite: incubatee.incubateeswebsite || "",
        incubateesincrecid: incubatee.incubateesincrecid || "",
        incubateescreatedtime:
          incubatee.incubateescreatedtime ||
          new Date().toISOString().split("T")[0],
        incubateesmodifiedtime: new Date().toISOString().split("T")[0],
        incubateescreatedby: incubatee.incubateescreatedby || userId || 1,
        incubateesmodifiedby: userId || 1,
      });
      setTabValue(0);
      setIsModalOpen(true);
      setError(null);
      setFormErrors({});
    },
    [userId],
  );

  // Optimized handleChange with real-time validation
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? (checked ? 1 : 0) : value;

      // Update form data
      setFormData((prev) => ({ ...prev, [name]: newValue }));

      // Validate field immediately
      const error = validateField(name, newValue);
      setFormErrors((prev) => ({
        ...prev,
        [name]: error,
      }));

      // Check for duplicates on specific fields
      const duplicateCheckFields = [
        "incubateesemail",
        "incubateesincubatorphone",
        "incubateesshortname",
        "incubateescin",
        "incubateesdin",
        "incubateespannumber",
        "incubateesuan",
        "incubateesgst", // added
        "incubateesdpiitnumber", // added
      ];

      if (duplicateCheckFields.includes(name) && !error) {
        checkDuplicate(name, newValue);
      }
    },
    [validateField, checkDuplicate],
  );

  const handleTabChange = useCallback((event, newValue) => {
    setTabValue(newValue);
  }, []);

  const handleNextTab = useCallback(() => {
    setTabValue((prev) => (prev < 3 ? prev + 1 : prev));
  }, []);

  const handlePrevTab = useCallback(() => {
    setTabValue((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Validate entire form
  const validateForm = useCallback(() => {
    const errors = {};

    // Required fields
    if (!formData.incubateesname.trim()) {
      errors.incubateesname = "Incubatee name is required";
    }

    if (!formData.incubateesemail.trim()) {
      errors.incubateesemail = "Email is required";
    } else if (!validateEmail(formData.incubateesemail)) {
      errors.incubateesemail = "Please enter a valid email address";
    }

    // Field validations
    if (formData.incubateesgst && !validateGST(formData.incubateesgst)) {
      errors.incubateesgst =
        "Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)";
    }

    if (
      formData.incubateespannumber &&
      !validatePAN(formData.incubateespannumber)
    ) {
      errors.incubateespannumber =
        "Please enter a valid PAN number (e.g., ABCDE1234F)";
    }

    if (formData.incubateescin && !validateCIN(formData.incubateescin)) {
      errors.incubateescin =
        "Please enter a valid CIN number (e.g., U74140DL2014PTC272828)";
    }

    if (formData.incubateesdin && !validateDIN(formData.incubateesdin)) {
      errors.incubateesdin = "Please enter a valid 8-digit DIN number";
    }

    if (formData.incubateesuan && !validateUAN(formData.incubateesuan)) {
      errors.incubateesuan = "Please enter a valid 12-digit UAN number";
    }

    if (
      formData.incubateesincubatoremail &&
      !validateEmail(formData.incubateesincubatoremail)
    ) {
      errors.incubateesincubatoremail =
        "Please enter a valid incubator email address";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle Delete
  const handleDelete = useCallback(
    (incubateeId) => {
      Swal.fire({
        title: "Are you sure?",
        text: "This incubatee will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsDeleting((prev) => ({ ...prev, [incubateeId]: true }));
          Swal.fire({
            title: "Deleting...",
            text: "Please wait while we delete the incubatee",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });
          api
            .post(
              "/deleteIncubatee",
              {},
              {
                params: {
                  incubateesrecid: incubateeId,
                  incubateesmodifiedby: userId || 1,
                },
                headers: {
                  "X-Module": "Incubatee Management",
                  "X-Action": "Delete Incubatee",
                },
              },
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Deleted!",
                  "Incubatee deleted successfully!",
                  "success",
                );
                fetchIncubatees();
              } else {
                throw new Error(
                  response.data.message || "Failed to delete incubatee",
                );
              }
            })
            .catch((err) => {
              console.error("Error deleting incubatee:", err);
              Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
            })
            .finally(() => {
              setIsDeleting((prev) => ({ ...prev, [incubateeId]: false }));
            });
        }
      });
    },
    [userId, fetchIncubatees],
  );

  // Handle Admin State Toggle
  const handleAdminStateToggle = useCallback(
    (incubatee) => {
      const newState = incubatee.incubateesadminstate === 1 ? 0 : 1;
      const stateText = newState === 1 ? "activate" : "deactivate";

      Swal.fire({
        title: "Are you sure?",
        text: `This incubatee will be ${stateText}d.`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: `Yes, ${stateText} it!`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire({
            title: "Updating...",
            text: `Please wait while we ${stateText} the incubatee`,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          api
            .post(
              "/updateIncubatee",
              {},
              {
                params: {
                  incubateesrecid: incubatee.incubateesrecid,
                  incubateesadminstate: newState,
                  incubateesmodifiedby: userId || 1,
                },
                headers: {
                  "X-Module": "Incubatee Management",
                  "X-Action": "Update Admin State",
                },
              },
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Updated!",
                  `Incubatee ${stateText}d successfully!`,
                  "success",
                );
                fetchIncubatees();
              } else {
                throw new Error(
                  response.data.message || "Failed to update incubatee",
                );
              }
            })
            .catch((err) => {
              console.error("Error updating incubatee:", err);
              Swal.fire("Error", `Failed to update: ${err.message}`, "error");
            });
        }
      });
    },
    [userId, fetchIncubatees],
  );

  // Handle Submit (Add/Edit)
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();

      // Validate form before submission
      if (!validateForm()) {
        // Find the first tab with errors
        const errorFields = Object.keys(formErrors);
        if (errorFields.length > 0) {
          const firstErrorField = errorFields[0];
          // Determine which tab contains the error
          const tab0Fields = [
            "incubateesname",
            "incubateesemail",
            "incubateesshortname",
            "incubateesfieldofwork",
            "incubateesstagelevel",
            "incubateesfoundername",
            "incubateesaddress",
            "incubateeswebsite",
          ];
          const tab1Fields = [
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
          ];
          const tab2Fields = [
            "incubateesdateofincubation",
            "incubateesdateofincorporation",
            "incubateesdurationofextension",
            "incubateesdateofextension",
            "incubateesincubatorname",
            "incubateesincubatoremail",
            "incubateesincubatorphone",
            "incubateesadminstate",
          ];

          if (tab0Fields.includes(firstErrorField)) {
            setTabValue(0);
          } else if (tab1Fields.includes(firstErrorField)) {
            setTabValue(1);
          } else if (tab2Fields.includes(firstErrorField)) {
            setTabValue(2);
          } else {
            setTabValue(3);
          }
        }
        return;
      }

      setIsSaving(true);
      setError(null);
      setIsModalOpen(false);

      const isEdit = !!editIncubatee;
      const endpoint = isEdit ? "/updateIncubatee" : "/addIncubatee";
      const module = "Incubatee Management";
      const action = isEdit ? "Update Incubatee" : "Add Incubatee";

      api
        .post(
          endpoint,
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
              incubateesincrecid: formData.incubateesincrecid,
              incubateescreatedtime: formData.incubateescreatedtime,
              incubateesmodifiedtime: formData.incubateesmodifiedtime,
              incubateescreatedby: formData.incubateescreatedby,
              incubateesmodifiedby: formData.incubateesmodifiedby,
            },
            headers: {
              "X-Module": module,
              "X-Action": action,
            },
          },
        )
        .then((response) => {
          if (response.data.statusCode === 200) {
            if (
              response.data.data &&
              typeof response.data.data === "string" &&
              response.data.data.includes("Duplicate entry")
            ) {
              setError("Incubatee with this email already exists");
              Swal.fire(
                "Duplicate",
                "Incubatee with this email already exists!",
                "warning",
              ).then(() => setIsModalOpen(true));
            } else {
              setEditIncubatee(null);
              setFormData({
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
                incubateesincrecid: "",
                incubateescreatedtime: "",
                incubateesmodifiedtime: "",
                incubateescreatedby: "",
                incubateesmodifiedby: "",
              });
              fetchIncubatees();
              Swal.fire(
                "Success",
                response.data.message || "Incubatee saved successfully!",
                "success",
              );
            }
          } else {
            throw new Error(
              response.data.message ||
                `Operation failed with status: ${response.data.statusCode}`,
            );
          }
        })
        .catch((err) => {
          console.error("Error saving incubatee:", err);
          setError(`Failed to save: ${err.message}`);
          Swal.fire(
            "Error",
            `Failed to save incubatee: ${err.message}`,
            "error",
          ).then(() => setIsModalOpen(true));
        })
        .finally(() => setIsSaving(false));
    },
    [
      formData,
      editIncubatee,
      validateForm,
      formErrors,
      userId,
      fetchIncubatees,
    ],
  );

  // Memoized values for columns
  const columns = useMemo(
    () => [
      {
        field: "incubateesname",
        headerName: "Incubatee Name",
        width: 200,
        sortable: true,
      },
      {
        field: "incubateesemail",
        headerName: "Email",
        width: 200,
        sortable: true,
      },
      {
        field: "incubateesshortname",
        headerName: "Short Name",
        width: 120,
        sortable: true,
      },
      {
        field: "fieldofworkname",
        headerName: "Field of Work",
        width: 150,
        sortable: true,
      },
      {
        field: "startupstagesname",
        headerName: "Stage Level",
        width: 120,
        sortable: true,
      },
      {
        field: "incubateesincubatorname",
        headerName: "Incubator Name",
        width: 180,
        sortable: true,
      },
      {
        field: "incubateesdateofincubation",
        headerName: "Date of Incubation",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        field: "incubateesadminstate",
        headerName: "Status",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row) return null;
          return (
            <Chip
              label={params.value === 1 ? "Active" : "Inactive"}
              color={params.value === 1 ? "success" : "default"}
              variant={params.value === 1 ? "filled" : "outlined"}
              size="small"
            />
          );
        },
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (!params || !params.row) return null;
          return (
            <Box>
              <ActionButton
                color="edit"
                onClick={() => openEditModal(params.row)}
                disabled={isSaving || isDeleting[params.row.incubateesrecid]}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </ActionButton>
              <ActionButton
                color="delete"
                onClick={() => handleDelete(params.row.incubateesrecid)}
                disabled={isSaving || isDeleting[params.row.incubateesrecid]}
                title="Delete"
              >
                {isDeleting[params.row.incubateesrecid] ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </ActionButton>
            </Box>
          );
        },
      },
    ],
    [isSaving, isDeleting, openEditModal, handleDelete],
  );

  const exportConfig = useMemo(
    () => ({
      filename: "incubatees",
      sheetName: "Incubatees",
    }),
    [],
  );

  const onExportData = useMemo(
    () => (data) => {
      return data.map((incubatee, index) => ({
        "S.No": index + 1,
        "Incubatee Name": incubatee.incubateesname || "",
        Email: incubatee.incubateesemail || "",
        "Short Name": incubatee.incubateesshortname || "",
        "Field of Work": incubatee.fieldofworkname || "",
        "Stage Level": incubatee.startupstagesname || "",
        "Incubator Name": incubatee.incubateesincubatorname || "",
        "Date of Incubation": formatDate(incubatee.incubateesdateofincubation),
        "Date of Incorporation": formatDate(
          incubatee.incubateesdateofincorporation,
        ),
        "Admin State":
          incubatee.incubateesadminstate === 1 ? "Active" : "Inactive",
        Website: incubatee.incubateeswebsite || "",
      }));
    },
    [],
  );

  return (
    <Box sx={{ p: 3 }} style={{ marginTop: "100px" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          🚀 Incubatees Management
        </Typography>
        <Button
          variant="contained"
          onClick={openAddModal}
          disabled={isSaving}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          + Add Incubatee
        </Button>
      </Box>
      {error && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}
      <ReusableDataGrid
        data={incubatees}
        columns={columns}
        title="Incubatees"
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search incubatees..."
        searchFields={[
          "incubateesname",
          "incubateesemail",
          "incubateesshortname",
        ]}
        uniqueIdField="incubateesrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />
      <StyledDialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {editIncubatee ? "Edit Incubatee" : "Add New Incubatee"}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setIsModalOpen(false)}
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              color: (theme) => theme.palette.grey[500],
            }}
            disabled={isSaving}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <StyledDialogContent>
            <AppBar position="static" color="default" elevation={0}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
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

            <TabPanel value={tabValue} index={0}>
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
                        label="Incubatee Name"
                        name="incubateesname"
                        value={formData.incubateesname}
                        onChange={handleChange}
                        required
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesname}
                        helperText={formErrors.incubateesname}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Email"
                        name="incubateesemail"
                        type="email"
                        value={formData.incubateesemail}
                        onChange={handleChange}
                        required
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesemail}
                        helperText={formErrors.incubateesemail}
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
                        value={formData.incubateesshortname}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesshortname}
                        helperText={formErrors.incubateesshortname}
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
                        <InputLabel id="field-of-work-label">
                          Field of Work
                        </InputLabel>
                        <Select
                          labelId="field-of-work-label"
                          id="incubateesfieldofwork"
                          name="incubateesfieldofwork"
                          value={formData.incubateesfieldofwork}
                          onChange={handleChange}
                          label="Field of Work"
                          MenuProps={{
                            PaperProps: {
                              style: {
                                maxHeight: 300,
                              },
                            },
                          }}
                        >
                          {fieldOfWorkOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.text}
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
                        <InputLabel id="stage-level-label">
                          Stage Level
                        </InputLabel>
                        <Select
                          labelId="stage-level-label"
                          id="incubateesstagelevel"
                          name="incubateesstagelevel"
                          value={formData.incubateesstagelevel}
                          onChange={handleChange}
                          label="Stage Level"
                          MenuProps={{
                            PaperProps: {
                              style: {
                                maxHeight: 300,
                              },
                            },
                          }}
                        >
                          {stageLevelOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.text}
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
                        value={formData.incubateesfoundername}
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
                        value={formData.incubateesaddress}
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
                        value={formData.incubateeswebsite}
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

            <TabPanel value={tabValue} index={1}>
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
                        value={formData.incubateescin}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateescin}
                        helperText={
                          formErrors.incubateescin ||
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
                        value={formData.incubateesdin}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesdin}
                        helperText={
                          formErrors.incubateesdin || "8-digit number"
                        }
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
                        value={formData.incubateesgst}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesgst}
                        helperText={
                          formErrors.incubateesgst || "Format: 22AAAAA0000A1Z5"
                        }
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="GST Registration Date"
                        name="incubateesgstregdate"
                        type="date"
                        value={formData.incubateesgstregdate}
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
                        value={formData.incubateesdpiitnumber}
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
                        value={formData.incubateespannumber}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateespannumber}
                        helperText={
                          formErrors.incubateespannumber || "Format: ABCDE1234F"
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
                        value={formData.incubateesuan}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesuan}
                        helperText={
                          formErrors.incubateesuan || "12-digit number"
                        }
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
                        value={formData.incubateestotalshare}
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
                        value={formData.incubateesshareperprice}
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
                        value={formData.incubateesnooffounders}
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

            <TabPanel value={tabValue} index={2}>
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
                        value={formData.incubateesdateofincubation}
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
                        value={formData.incubateesdateofincorporation}
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
                        value={formData.incubateesdurationofextension}
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
                        value={formData.incubateesdateofextension}
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
                        value={formData.incubateesincubatorname}
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
                        value={formData.incubateesincubatoremail}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesincubatoremail}
                        helperText={formErrors.incubateesincubatoremail}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Incubator Phone"
                        name="incubateesincubatorphone"
                        value={formData.incubateesincubatorphone}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        error={!!formErrors.incubateesincubatorphone}
                        helperText={formErrors.incubateesincubatorphone}
                        InputProps={{
                          endAdornment:
                            checkingDuplicate.incubateesincubatorphone && (
                              <CircularProgress size={20} />
                            ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", mt: 1 }}
                      >
                        <FormControlLabel
                          control={
                            <Switch
                              checked={formData.incubateesadminstate === 1}
                              onChange={handleChange}
                              name="incubateesadminstate"
                              color="primary"
                              disabled={isSaving}
                            />
                          }
                          label="Status"
                        />
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {formData.incubateesadminstate === 1
                            ? "Active"
                            : "Inactive"}
                        </Typography>
                      </Box>
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

            <TabPanel value={tabValue} index={3}>
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
                        value={formData.incubateesaccountantname}
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
                        value={formData.incubateesauditorname}
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
                        value={formData.incubateessecretaryname}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Logo Path"
                        name="incubateeslogopath"
                        value={formData.incubateeslogopath}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Incubatee Rec ID"
                        name="incubateesincrecid"
                        value={formData.incubateesincrecid}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <StyledTextField
                        fullWidth
                        label="Created Time"
                        name="incubateescreatedtime"
                        type="date"
                        value={formData.incubateescreatedtime}
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
                        value={formData.incubateesmodifiedtime}
                        onChange={handleChange}
                        disabled={isSaving}
                        variant="outlined"
                        InputLabelProps={{ shrink: true }}
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
                  type="submit"
                  variant="contained"
                  disabled={isSaving || Object.keys(formErrors).length > 0}
                  startIcon={isSaving ? <CircularProgress size={20} /> : null}
                  sx={{ minWidth: 120 }}
                >
                  {editIncubatee ? "Update" : "Save"}
                </Button>
              </Box>
            </TabPanel>

            {error && (
              <Box sx={{ color: "error.main", mt: 2, textAlign: "center" }}>
                {error}
              </Box>
            )}
          </StyledDialogContent>
        </form>
      </StyledDialog>
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
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
    </Box>
  );
}
