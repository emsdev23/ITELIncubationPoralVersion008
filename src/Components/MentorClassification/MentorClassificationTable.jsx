import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaEdit,
  FaTrash,
  FaChalkboardTeacher,
  FaPlus,
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  Grid,
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
  "&.disabled": {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[500],
    cursor: "not-allowed",
  },
}));

// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    // Handle timestamp format from API
    if (Array.isArray(dateStr)) {
      dateStr = dateStr.map((num) => num.toString().padStart(2, "0")).join("");
    } else {
      dateStr = String(dateStr).replace(/,/g, "");
    }
    if (dateStr.length < 14) dateStr = dateStr.padEnd(14, "0");
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    const formattedDate = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:${second}`
    );
    return formattedDate.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
};

export default function MentorClassificationTable() {
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");

  // Use the custom hook to check write access
  const hasWriteAccess = useWriteAccess("/Incubation/Dashboard/MentorManagement");

  // States
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState("add"); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    adminState: true,
  });

  // UI State Management
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [isToggling, setIsToggling] = useState({}); // State for Toggle Status

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // --- API CALLS ---

  const fetchClassifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "resources/generic/getmentorclassificationdetails",
        {
          userId: parseInt(userId) || 1,
          userIncId: incUserid,
        }
      );

      if (response.data.statusCode === 200) {
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setClassifications(data);
      } else {
        throw new Error(response.data.message || "Failed to fetch classifications");
      }
    } catch (err) {
      console.error("Error fetching classifications:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to load classifications.";
      setError(errorMessage);
      setClassifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId, incUserid]);

  // --- Handle Toggle Status (Enable/Disable) ---
  const handleToggleStatus = useCallback(
    (item) => {
      const isCurrentlyEnabled = item.mentorclassetadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} this classification?`,
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
            [item.mentorclassetrecid]: true,
          }));

          // Payload structure sending full object to prevent nulling other fields
          const bodyPayload = {
            mentorclassetrecid: item.mentorclassetrecid,
            mentorclassetname: item.mentorclassetname,
            mentorclassetdesc: item.mentorclassetdesc,
            mentorclassetadminstate: newState,
            mentorclassetmodifiedby: userId || "1",
          };

          api
            .post("/updateMentorClassification", bodyPayload, {
              headers: {
                "X-Module": "Mentor Management",
                "X-Action": "Update Classification Status",
              },
            })
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `Classification ${actionText}d successfully!`,
                  "success"
                );
                fetchClassifications();
              } else {
                throw new Error(
                  response.data.message || `Failed to ${actionText} classification`
                );
              }
            })
            .catch((err) => {
              console.error(`Error ${actionText}ing classification:`, err);
              Swal.fire(
                "Error",
                `Failed to ${actionText}: ${err.message}`,
                "error"
              );
            })
            .finally(() => {
              setIsToggling((prev) => ({
                ...prev,
                [item.mentorclassetrecid]: false,
              }));
            });
        }
      });
    },
    [userId, fetchClassifications]
  );

  const createClassification = useCallback(async () => {
    try {
      const payload = {
        mentorclassetname: formData.name,
        mentorclassetdesc: formData.description,
        mentorclassetadminstate: formData.adminState ? 1 : 0,
        mentorclassetcreatedby: userId || "1",
        mentorclassetmodifiedby: userId || "1",
      };

      const response = await api.post("/addMentorClassification", null, {
        params: payload,
        headers: {
          "X-Module": "Mentor Classification",
          "X-Action": "Add",
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [formData, userId]);

  const updateClassification = useCallback(async () => {
    try {
      const payload = {
        mentorclassetrecid: editingId,
        mentorclassetname: formData.name,
        mentorclassetdesc: formData.description,
        mentorclassetadminstate: formData.adminState ? 1 : 0,
        mentorclassetmodifiedby: userId || "1",
      };

      const response = await api.post("/updateMentorClassification", null, {
        params: payload,
        headers: {
          "X-Module": "Mentor Classification",
          "X-Action": "Update",
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [formData, editingId, userId]);

  const deleteClassification = useCallback(
    async (id) => {
      try {
        const response = await api.post("/deleteMentorClassification", null, {
          params: {
            mentorclassetrecid: id,
            mentorclassetmodifiedby: userId || "1",
          },
          headers: {
            "X-Module": "Mentor Classification",
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

  const validateField = useCallback(
    (name, value) => {
      const errors = { ...fieldErrors };
      switch (name) {
        case "name":
          if (!value || value.trim() === "") {
            errors[name] = "Classification Name is required";
          } else {
            delete errors[name];
          }
          break;
        default:
          break;
      }
      setFieldErrors(errors);
      return !errors[name];
    },
    [fieldErrors]
  );

  const validateForm = useCallback(() => {
    const isNameValid = validateField("name", formData.name);
    return isNameValid;
  }, [formData, validateField]);

  const handleInputChange = useCallback(
    (e) => {
      const { name, value, checked } = e.target;
      const finalValue = name === "adminState" ? checked : value;

      if (fieldErrors[name]) {
        validateField(name, finalValue);
      }

      setFormData((prev) => ({
        ...prev,
        [name]: finalValue,
      }));
    },
    [fieldErrors, validateField]
  );

  const openAddModal = useCallback(() => {
    if (!hasWriteAccess) {
      Swal.fire("Access Denied", "You do not have permission to add classifications.", "warning");
      return;
    }
    setDialogType("add");
    setEditingId(null);
    setFormData({ name: "", description: "", adminState: true });
    setFieldErrors({});
    setOpenDialog(true);
  }, [hasWriteAccess]);

  const openEditModal = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire("Access Denied", "You do not have permission to edit classifications.", "warning");
        return;
      }
      // Prevent editing if disabled
      if (item.mentorclassetadminstate === 0) {
        Swal.fire(
          "Restricted",
          "Cannot edit a disabled classification. Please enable it first.",
          "warning"
        );
        return;
      }

      setDialogType("edit");
      setEditingId(item.mentorclassetrecid);
      setFormData({
        name: item.mentorclassetname || "",
        description: item.mentorclassetdesc || "",
        adminState: item.mentorclassetadminstate === 1,
      });
      setFieldErrors({});
      setOpenDialog(true);
    },
    [hasWriteAccess]
  );

  const handleClose = useCallback(() => {
    setOpenDialog(false);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      
      if (!validateForm()) {
        showToast("Please fix errors in the form", "error");
        return;
      }

      setIsSaving(true);
      setOpenDialog(false); 

      try {
        let response;
        if (dialogType === "add") {
          response = await createClassification();
        } else {
          response = await updateClassification();
        }

        if (response.statusCode === 200) {
          showToast(
            `Classification ${dialogType === "add" ? "added" : "updated"} successfully!`,
            "success"
          );
          fetchClassifications();
        } else {
          throw new Error(response.message || "Operation failed");
        }
      } catch (err) {
        console.error(`Error ${dialogType === "add" ? "adding" : "updating"} classification:`, err);
        const errorMessage = err.response?.data?.message || err.message || "An unknown error occurred";
        showToast(errorMessage, "error");
        setOpenDialog(true);
      } finally {
        setIsSaving(false);
      }
    },
    [validateForm, showToast, dialogType, createClassification, updateClassification, fetchClassifications]
  );

  const handleDelete = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire("Access Denied", "You do not have permission to delete classifications.", "warning");
        return;
      }

      Swal.fire({
        title: "Are you sure?",
        text: "This classification will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          setIsDeleting((prev) => ({ ...prev, [item.mentorclassetrecid]: true }));
          try {
            const response = await deleteClassification(item.mentorclassetrecid);
            if (response.statusCode !== 200) {
              throw new Error(response.message || "Failed to delete classification");
            }
            return response.data;
          } catch (error) {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
            throw error;
          } finally {
             setIsDeleting((prev) => ({ ...prev, [item.mentorclassetrecid]: false }));
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire("Deleted!", "Classification deleted successfully!", "success");
          fetchClassifications();
        }
      });
    },
    [hasWriteAccess, deleteClassification, fetchClassifications]
  );

  // --- DATA GRID CONFIG ---

  const columns = useMemo(
    () => [
      {
        field: "mentorclassetname",
        headerName: "Name",
        width: 200,
        sortable: true,
      },
      {
        field: "mentorclassetdesc",
        headerName: "Description",
        width: 300,
        sortable: true,
      },
      {
        field: "mentorclassetadminstate",
        headerName: "Status",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          if (!params?.row) return "-";
          const status = params.row.mentorclassetadminstate;
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
        renderCell: (params) => params?.row?.createdname || params?.row?.mentorclassetcreatedby || "-",
      },
      {
        field: "mentorclassetcreationtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        field: "modifiedname",
        headerName: "Modified By",
        width: 150,
        sortable: true,
        renderCell: (params) => params?.row?.modifiedname || params?.row?.mentorclassetmodifiedby || "-",
      },
      {
        field: "mentorclassetmodifiedtime",
        headerName: "Modified Time",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      ...(hasWriteAccess
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 180, // Increased width for 3 buttons
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                
                const isDisabled = params.row.mentorclassetadminstate === 0;
                const isCurrentlyEnabled = params.row.mentorclassetadminstate === 1;

                return (
                  <Box>
                    {/* Toggle Status Button */}
                    <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.mentorclassetrecid] ||
                        isToggling[params.row.mentorclassetrecid]
                      }
                      title={isCurrentlyEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling[params.row.mentorclassetrecid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isCurrentlyEnabled ? (
                        <ToggleOnIcon fontSize="small" />
                      ) : (
                        <ToggleOffIcon fontSize="small" />
                      )}
                    </ActionButton>

                    {/* Edit Button */}
                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.mentorclassetrecid] ||
                        isDisabled || // Disabled if state is 0
                        isToggling[params.row.mentorclassetrecid]
                      }
                      title="Edit"
                      className={isDisabled ? "disabled" : ""}
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
      filename: "mentor_classifications",
      sheetName: "Classifications",
    }),
    []
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((item, index) => ({
        "S.No": index + 1,
        "Classification Name": item.mentorclassetname || "",
        Description: item.mentorclassetdesc || "",
        Status: item.mentorclassetadminstate === 1 ? "Active" : "Inactive",
        "Created By": item.mentorclassetcreatedby || "",
        "Created Time": formatDate(item.mentorclassetcreationtime),
        "Modified By": item.mentorclassetmodifiedby || "",
        "Modified Time": formatDate(item.mentorclassetmodifiedtime),
      })),
    []
  );

  // --- EFFECTS ---

  useEffect(() => {
    fetchClassifications();
  }, [fetchClassifications]);

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
          Mentor Classifications
        </Typography>
        {hasWriteAccess && (
        <Button
          variant="contained"
          startIcon={<FaPlus />}
          onClick={openAddModal}
        >
          Add Classification
        </Button>
        )}
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <ReusableDataGrid
        data={classifications}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search classifications..."
        searchFields={["mentorclassetname", "mentorclassetdesc"]}
        uniqueIdField="mentorclassetrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === "add" ? "Add" : "Edit"} Classification
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
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoFocus
                  fullWidth
                  name="name"
                  label="Classification Name"
                  type="text"
                  variant="outlined"
                  value={formData.name}
                  onChange={handleInputChange}
                  onBlur={(e) => validateField("name", e.target.value)}
                  error={!!fieldErrors.name}
                  helperText={fieldErrors.name}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  name="description"
                  label="Description"
                  type="text"
                  variant="outlined"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button 
                type="submit" 
                variant="contained"
                disabled={isSaving || Object.keys(fieldErrors).length > 0}
                startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? "Saving..." : dialogType === "add" ? "Add" : "Save Changes"}
            </Button>
          </DialogActions>
        </form>
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
              ? "Adding classification..."
              : "Updating classification..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}