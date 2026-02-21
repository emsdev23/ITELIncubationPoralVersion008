import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaEdit,
  FaTrash,
  FaChalkboardTeacher,
  FaPlus,
  FaArrowLeft,
  FaArrowRight,
  FaSave,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "./MentorClassificationTable.css";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess";

// Material-UI imports
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
  FormControl,
  Grid,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  styled,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ToggleOnIcon from "@mui/icons-material/ToggleOn"; // ON Icon
import ToggleOffIcon from "@mui/icons-material/ToggleOff"; // OFF Icon
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Status Active
import CancelIcon from "@mui/icons-material/Cancel"; // Status Inactive

// Import your reusable component
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";

// Styled Backdrop for loading state
const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

const ActionButton = styled(IconButton)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  backgroundColor:
    color === "edit"
      ? theme.palette.primary.main
      : color === "on" // ON State -> Green
      ? theme.palette.success.main
      : color === "off" // OFF State -> Grey
      ? theme.palette.grey[500]
      : color === "delete" // Delete -> Red
      ? theme.palette.error.main
      : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit"
        ? theme.palette.primary.dark
        : color === "on"
        ? theme.palette.success.dark
        : color === "off"
        ? theme.palette.grey[700]
        : color === "delete"
        ? theme.palette.error.dark
        : theme.palette.error.dark,
  },
}));

export default function MentorTable() {
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");

  // Use the custom hook to check write access
  const hasWriteAccess = useWriteAccess("/Incubation/Dashboard/MentorManagement");

  // States
  const [mentors, setMentors] = useState([]);
  const [mentorTypes, setMentorTypes] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState("add"); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);
  const [step, setStep] = useState(0); // 0 for Step 1, 1 for Step 2

  // Form State
  const [formData, setFormData] = useState({
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
    prevStupMentor: "Yes",
    comment: "",
    createdBy: userId || "1",
  });

  // UI State Management
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [isToggling, setIsToggling] = useState({}); // State for Toggle Status

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // --- API CALLS ---

  const fetchMentors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        userId: "ALL",
        incUserId: incUserid || "1",
      };

      const response = await api.post("/resources/generic/getmentordetails", payload);

      if (response.data.statusCode === 200) {
        setMentors(Array.isArray(response.data.data) ? response.data.data : []);
      } else {
        throw new Error(response.data.message || "Failed to fetch mentors");
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);
      setError("Failed to load mentors. Please try again.");
      setMentors([]);
    } finally {
      setLoading(false);
    }
  }, [incUserid]);

  const fetchDropdownOptions = useCallback(async () => {
    try {
      // 1. Get Mentor Types
      const typePayload = {
        userId: userId || "20",
        userIncId: incUserid || "1",
      };
      
      const typeRes = await api.post("/resources/generic/getmentortypedetails", typePayload);
      if (typeRes.data.statusCode === 200) {
        setMentorTypes(Array.isArray(typeRes.data.data) ? typeRes.data.data : []);
      }

      // 2. Get Classifications
      const classPayload = {
        userId: userId || 39,
        userIncId: incUserid || "1",
      };

      const classRes = await api.post("/resources/generic/getmentorclassificationdetails", classPayload);
      if (classRes.data.statusCode === 200) {
        setClassifications(Array.isArray(classRes.data.data) ? classRes.data.data : []);
      }
    } catch (err) {
      console.error("Error fetching dropdown options:", err);
    }
  }, [userId, incUserid]);

  // --- Handle Toggle Status (Enable/Disable) ---
  const handleToggleStatus = useCallback(
    (mentor) => {
      const isCurrentlyEnabled = mentor.mentordetsadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} this mentor?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isCurrentlyEnabled ? "#d33" : "#3085d6",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText} it!`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsToggling((prev) => ({
            ...prev,
            [mentor.mentordetsid]: true,
          }));

          // Payload structure mirroring the full object
          const bodyPayload = {
            mentordetsincubatorid: mentor.mentordetsincubatorid,
            mentordetsmnttypeid: mentor.mentordetsmnttypeid,
            mentordetsclasssetid: mentor.mentordetsclasssetid,
            mentordetsname: mentor.mentordetsname,
            mentordetsdesign: mentor.mentordetsdesign,
            mentordetsphone: mentor.mentordetsphone,
            mentordetsaddress: mentor.mentordetsaddress,
            mentordetsemail: mentor.mentordetsemail,
            mentordetsdomain: mentor.mentordetsdomain,
            mentordetspastexp: mentor.mentordetspastexp,
            mentordetslinkedin: mentor.mentordetslinkedin,
            mentordetswebsite: mentor.mentordetswebsite,
            mentordetsblog: mentor.mentordetsblog,
            mentordetsimagepath: mentor.mentordetsimagepath,
            mentordetstimecommitment: mentor.mentordetstimecommitment,
            mentordetsprevstupmentor: mentor.mentordetsprevstupmentor,
            mentordetscomment: mentor.mentordetscomment,
            mentordetsgender: mentor.mentordetsgender,
            mentordetsadminstate: newState,
            mentordetsid: mentor.mentordetsid,
            mentordetsmodifiedby: userId || "1",
          };

          // Using api.post instead of fetch
          api.post("/updateMentor", bodyPayload, {
             headers: {
               "X-Module": "Mentor Management",
               "X-Action": "Update Mentor Status",
             },
          })
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `Mentor ${actionText}d successfully!`,
                  "success"
                );
                fetchMentors();
              } else {
                throw new Error(response.data.message || `Failed to ${actionText} mentor`);
              }
            })
            .catch((err) => {
              console.error(`Error ${actionText}ing mentor:`, err);
              Swal.fire("Error", `Failed to ${actionText}: ${err.message}`, "error");
            })
            .finally(() => {
              setIsToggling((prev) => ({
                ...prev,
                [mentor.mentordetsid]: false,
              }));
            });
        }
      });
    },
    [userId, fetchMentors]
  );

  const createMentor = useCallback(async () => {
    try {
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
        mentordetsadminstate: 1,
        mentordetsid: 0,
        mentordetscreatedby: userId || "1",
        mentordetsmodifiedby: userId || "1",
      };

      const response = await api.post("/addMentor", null, {
        params: payload,
        headers: {
          "X-Module": "Mentor Management",
          "X-Action": "Add",
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [formData, userId]);

  const updateMentor = useCallback(async () => {
    try {
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
        mentordetsadminstate: formData.mentordetsadminstate ?? 1, // Preserve state or default active
        mentordetsid: editingId,
        mentordetsmodifiedby: userId || "1",
      };

      const response = await api.post("/updateMentor", null, {
        params: payload,
        headers: {
          "X-Module": "Mentor Management",
          "X-Action": "Update",
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [formData, editingId, userId]);

  const deleteMentor = useCallback(
    async (id) => {
      try {
        const response = await api.post("/deleteMentor", null, {
          params: {
            mentordetsid: id,
            mentordetsmodifiedby: userId || "1",
          },
          headers: {
            "X-Module": "Mentor Management",
            "X-Action": "Delete",
          },
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    [userId]
  );

  // --- HANDLERS ---

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const openAddModal = useCallback(() => {
    if (!hasWriteAccess) {
      Swal.fire("Access Denied", "You do not have permission to add mentors.", "warning");
      return;
    }
    setDialogType("add");
    setEditingId(null);
    setStep(0);
    setFormData({
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
      prevStupMentor: "Yes",
      comment: "",
      createdBy: userId || "1",
    });
    setOpenDialog(true);
  }, [hasWriteAccess, incUserid, userId]);

  const openEditModal = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire("Access Denied", "You do not have permission to edit mentors.", "warning");
        return;
      }
      setDialogType("edit");
      setEditingId(item.mentordetsid);
      setStep(0);
      setFormData({
        incubatorId: item.mentordetsincubatorid,
        typeId: item.mentordetsmnttypeid,
        classSetId: item.mentordetsclasssetid,
        name: item.mentordetsname || "",
        gender: item.mentordetsgender || "",
        designation: item.mentordetsdesign || "",
        phone: item.mentordetsphone || "",
        address: item.mentordetsaddress || "",
        email: item.mentordetsemail || "",
        domain: item.mentordetsdomain || "",
        pastExp: item.mentordetspastexp || "",
        linkedin: item.mentordetslinkedin || "",
        website: item.mentordetswebsite || "",
        blog: item.mentordetsblog || "",
        imagePath: item.mentordetsimagepath || null,
        timeCommitment: item.mentordetstimecommitment || null,
        prevStupMentor: item.mentordetsprevstupmentor || "Yes",
        comment: item.mentordetscomment || "",
        mentordetsadminstate: item.mentordetsadminstate, // Preserve state in form
        createdBy: item.mentordetscreatedby,
      });
      setOpenDialog(true);
    },
    [hasWriteAccess]
  );

  const handleClose = useCallback(() => {
    setStep(0);
    setOpenDialog(false);
  }, []);

  const handleNext = useCallback(() => {
    if (!formData.name.trim() || !formData.email.trim()) {
        Swal.fire("Validation Error", "Name and Email are required before proceeding.", "error");
        return;
    }
    setStep(1);
  }, [formData.name, formData.email]);

  const handleBack = useCallback(() => {
    setStep(0);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      
      if (!formData.name.trim() || !formData.email.trim()) {
        Swal.fire("Validation Error", "Name and Email are required.", "error");
        return;
      }

      setIsSaving(true);
      setOpenDialog(false);

      try {
        let response;
        if (dialogType === "add") {
          response = await createMentor();
        } else {
          response = await updateMentor();
        }

        if (response.statusCode === 200) {
          showToast(`Mentor ${dialogType === "add" ? "added" : "updated"} successfully!`, "success");
          fetchMentors();
        } else {
          throw new Error(response.message || "Operation failed");
        }
      } catch (err) {
        console.error(`Error ${dialogType === "add" ? "adding" : "updating"} mentor:`, err);
        const errorMessage = err.response?.data?.message || err.message || "An unknown error occurred";
        showToast(errorMessage, "error");
        setOpenDialog(true);
      } finally {
        setIsSaving(false);
      }
    },
    [dialogType, formData, createMentor, updateMentor, fetchMentors, showToast]
  );

  const handleDelete = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire("Access Denied", "You do not have permission to delete mentors.", "warning");
        return;
      }

      Swal.fire({
        title: "Are you sure?",
        text: "This mentor will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          setIsDeleting((prev) => ({ ...prev, [item.mentordetsid]: true }));
          try {
            const response = await deleteMentor(item.mentordetsid);
            if (response.statusCode !== 200) {
              throw new Error(response.message || "Failed to delete mentor");
            }
            return response.data;
          } catch (error) {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
            throw error;
          } finally {
             setIsDeleting((prev) => ({ ...prev, [item.mentordetsid]: false }));
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire("Deleted!", "Mentor deleted successfully!", "success");
          fetchMentors();
        }
      });
    },
    [hasWriteAccess, deleteMentor, fetchMentors]
  );

  // --- DATA GRID CONFIG ---

  const columns = useMemo(
    () => [
      {
        field: "mentordetsname",
        headerName: "Name",
        width: 200,
        sortable: true,
      },
      {
        field: "mentordetsdesign",
        headerName: "Designation",
        width: 200,
        sortable: true,
      },
      {
        field: "mentordetsdomain",
        headerName: "Domain",
        width: 180,
        sortable: true,
      },
      {
        field: "mentordetsemail",
        headerName: "Email",
        width: 220,
        sortable: true,
      },
      {
        field: "mentordetsphone",
        headerName: "Phone",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetsadminstate",
        headerName: "Status",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          if (!params?.row) return "-";
          const status = params.row.mentordetsadminstate;
          const isActive = status === 1 || status === undefined;

          return (
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <IconButton
                size="small"
                sx={{
                  mr: 0.5,
                  color: isActive ? "success.main" : "error.main",
                  cursor: "default",
                }}
              >
                {isActive ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
              </IconButton>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {isActive ? "Active" : "Inactive"}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "createdname",
        headerName: "Created By",
        width: 150,
        sortable: true,
        valueGetter: (params) => params.row.createdname || params.row.mentordetscreatedby,
      },
      ...(hasWriteAccess
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 150, // Increased width for 3 buttons
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                
                const isCurrentlyEnabled = params.row.mentordetsadminstate === 1;

                return (
                  <Box>
                    {/* Toggle Status Button */}
                    <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.mentordetsid] ||
                        isToggling[params.row.mentordetsid]
                      }
                      title={isCurrentlyEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling[params.row.mentordetsid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isCurrentlyEnabled ? (
                        <ToggleOnIcon fontSize="small" />
                      ) : (
                        <ToggleOffIcon fontSize="small" />
                      )}
                    </ActionButton>

                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.mentordetsid] ||
                        isToggling[params.row.mentordetsid]
                      }
                      title="Edit"
                    >
                      <FaEdit />
                    </ActionButton>

                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [hasWriteAccess, isSaving, isDeleting, isToggling, openEditModal, handleDelete, handleToggleStatus]
  );

  const exportConfig = useMemo(
    () => ({
      filename: "mentors_directory",
      sheetName: "Mentors",
    }),
    []
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((item, index) => ({
        "S.No": index + 1,
        Name: item.mentordetsname || "",
        Designation: item.mentordetsdesign || "",
        Domain: item.mentordetsdomain || "",
        Email: item.mentordetsemail || "",
        Phone: item.mentordetsphone || "",
        Address: item.mentordetsaddress || "",
        "Time Commitment": item.mentordetstimecommitment || "",
        "Prev Startup Mentor": item.mentordetsprevstupmentor || "",
        Status: item.mentordetsadminstate === 1 ? "Active" : "Inactive",
      })),
    []
  );

  // --- EFFECTS ---

  useEffect(() => {
    fetchMentors();
    fetchDropdownOptions();
  }, [fetchMentors, fetchDropdownOptions]);

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <FaChalkboardTeacher style={{ marginRight: "8px" }} />
          Mentors Directory
        </Typography>
        <Button
          variant="contained"
          startIcon={<FaPlus />}
          onClick={openAddModal}
          disabled={!hasWriteAccess}
        >
          Add Mentor
        </Button>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <ReusableDataGrid
        data={mentors}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search mentors..."
        searchFields={["mentordetsname", "mentordetsdomain", "mentordetsemail"]}
        uniqueIdField="mentordetsid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="xl" fullWidth scroll="paper">
        <DialogTitle>
          {dialogType === "add" ? "Add New" : "Edit"} Mentor
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
          <Stepper activeStep={step} sx={{ mt: 2, pb: 1 }}>
            <Step><StepLabel>Basic Info</StepLabel></Step>
            <Step><StepLabel>Professional Info</StepLabel></Step>
          </Stepper>
        </DialogTitle>
        <DialogContent dividers>
          {step === 0 && (
             <Grid container spacing={3}>
              {/* STEP 1: Basic Info */}
              <Grid item xs={12}>
                <FormControl sx={{width:"150px"}}>
                  <InputLabel>Mentor Type</InputLabel>
                  <Select
                    name="typeId"
                    value={formData.typeId}
                    label="Mentor Type"
                    onChange={handleInputChange}
                  >
                    {mentorTypes.map((type) => (
                      <MenuItem key={type.mentortypeid} value={type.mentortypeid}>
                        {type.mentortypename}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12}>
                <FormControl sx={{width:"150px"}}>
                  <InputLabel>Classification</InputLabel>
                  <Select
                    name="classSetId"
                    value={formData.classSetId}
                    label="Classification"
                    onChange={handleInputChange}
                  >
                    {classifications.map((cls) => (
                      <MenuItem key={cls.mentorclassetrecid} value={cls.mentorclassetrecid}>
                        {cls.mentorclassetname}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="name"
                  label="Full Name *"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl sx={{width:"150px"}}>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    name="gender"
                    value={formData.gender}
                    label="Gender"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="designation"
                  label="Designation"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.designation}
                  onChange={handleInputChange}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="email"
                  label="Email Address *"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="phone"
                  label="Phone Number"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="address"
                  label="Address"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          )}

          {step === 1 && (
            <Grid container spacing={3}>
              {/* STEP 2: Professional Details & Socials */}
              <Grid item xs={12} sm={6}>
                <TextField
                  name="domain"
                  label="Domain / Expertise"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.domain}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="pastExp"
                  label="Past Experience"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.pastExp}
                  onChange={handleInputChange}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
              <TextField
                name="timeCommitment"
                label="Time Commitment"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.timeCommitment}
                onChange={handleInputChange}
              />
            </Grid>

              {/* Social Links */}
              <Grid item xs={12} sm={4}>
                <TextField
                  name="linkedin"
                  label="LinkedIn Profile"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.linkedin}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="website"
                  label="Website"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.website}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  name="blog"
                  label="Blog Link"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={formData.blog}
                  onChange={handleInputChange}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl sx={{width:"150px"}}>
                <InputLabel>Previously Mentored Startup?</InputLabel>
                <Select
                  name="prevStupMentor"
                  value={formData.prevStupMentor}
                  label="Previously Mentored Startup?"
                  onChange={handleInputChange}
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="comment"
                  label="Additional Comments"
                  type="text"
                  fullWidth
                  variant="outlined"
                  multiline
                  rows={3}
                  value={formData.comment}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {step === 0 ? (
            <>
              <Button onClick={handleClose}>Cancel</Button>
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
              <Button 
                onClick={handleBack}
                startIcon={<FaArrowLeft />}
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                variant="contained"
                startIcon={<FaSave />}
              >
                {dialogType === "add" ? "Add Mentor" : "Save Changes"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Toast Notification */}
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

      {/* Loading Overlay */}
      <StyledBackdrop open={isSaving || Object.values(isToggling).some(Boolean)}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
             {Object.values(isToggling).some(Boolean)
              ? "Updating status..."
              : dialogType === "add"
              ? "Adding mentor..."
              : "Updating mentor..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}