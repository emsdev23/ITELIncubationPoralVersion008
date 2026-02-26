import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaEdit, FaTrash, FaLayerGroup, FaPlus } from "react-icons/fa";
import Swal from "sweetalert2";
import "./CoursesTable.css";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

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
    color === "edit" ? theme.palette.primary.main : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit" ? theme.palette.primary.dark : theme.palette.error.dark,
  },
}));

// Common date formatting function (Taken from reference code)
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
      `${year}-${month}-${day}T${hour}:${minute}:${second}`,
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

export default function TrainingAssociationTable() {
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");

  // Use the custom hook to check write access
  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/TrainingAssociation",
  );

  // States
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState("add"); // 'add' or 'edit'
  const [editingId, setEditingId] = useState(null);

  // State to track loading status for specific rows during actions
  const [statusLoading, setStatusLoading] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    trainingId: "",
    incUserId: "",
    mentorUserId: "",
    adminState: true,
  });

  // UI State Management
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // --- API CALLS ---

  const fetchAssociations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "/resources/generic/gettrainingassndetails",
        {
          userId:
            sessionStorage.getItem("roleid") === "1" ? "ALL" : userId || "1",
          userIncId: incUserid || "1",
        },
      );

      if (response.data.statusCode === 200) {
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : [];
        setAssociations(data);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch associations",
        );
      }
    } catch (err) {
      console.error("Error fetching associations:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load associations.";
      setError(errorMessage);
      setAssociations([]);
    } finally {
      setLoading(false);
    }
  }, [userId, incUserid]);

  const createAssociation = useCallback(async () => {
    try {
      const payload = {
        trainingassntrainingid: formData.trainingId,
        trainingassnincusersid: formData.incUserId,
        trainingassnmentorusersid: formData.mentorUserId,
        trainingassnadminstate: formData.adminState ? 1 : 0,
        trainingassncreatedby: userId || "1",
        trainingassnmodifiedby: userId || "1",
      };

      const response = await api.post("/addTrainingAssn", null, {
        params: payload,
        headers: {
          "X-Module": "Training Association",
          "X-Action": "Add",
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [formData, userId]);

  const updateAssociation = useCallback(async () => {
    try {
      const payload = {
        trainingassnrecid: editingId,
        trainingassntrainingid: formData.trainingId,
        trainingassnincusersid: formData.incUserId,
        trainingassnmentorusersid: formData.mentorUserId,
        trainingassnadminstate: formData.adminState ? 1 : 0,
        trainingassnmodifiedby: userId || "1",
      };

      const response = await api.post("/updateTrainingAssn", null, {
        params: payload,
        headers: {
          "X-Module": "Training Association",
          "X-Action": "Update",
        },
      });
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [formData, editingId, userId]);

  const deleteAssociation = useCallback(
    async (id) => {
      try {
        const response = await api.post("/deleteTrainingAssn", null, {
          params: {
            trainingassnrecid: id,
            trainingassnmodifiedby: userId || "1",
          },
          headers: {
            "X-Module": "Training Association",
            "X-Action": "Delete",
          },
        });
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    [userId],
  );

  // --- HANDLERS ---

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const validateField = useCallback(
    (name, value) => {
      const errors = { ...fieldErrors };
      switch (name) {
        case "trainingId":
          if (!value || value.toString().trim() === "") {
            errors[name] = "Training ID is required";
          } else {
            delete errors[name];
          }
          break;
        case "incUserId":
          if (!value || value.toString().trim() === "") {
            errors[name] = "Inc User ID is required";
          } else {
            delete errors[name];
          }
          break;
        case "mentorUserId":
          if (!value || value.toString().trim() === "") {
            errors[name] = "Mentor User ID is required";
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
    [fieldErrors],
  );

  const validateForm = useCallback(() => {
    const isTrainingValid = validateField("trainingId", formData.trainingId);
    const isIncUserValid = validateField("incUserId", formData.incUserId);
    const isMentorValid = validateField("mentorUserId", formData.mentorUserId);
    return isTrainingValid && isIncUserValid && isMentorValid;
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
    [fieldErrors, validateField],
  );

  // Handler for starting training (Status 1 -> 2)
  const handleStartTraining = useCallback(
    async (row) => {
      const id = row.trainingassnrecid;
      setStatusLoading((prev) => ({ ...prev, [id]: true }));

      try {
        await api.post("/updateTrainingAssn", null, {
          params: {
            trainingassnrecid: row.trainingassnrecid,
            trainingassntrainingid: row.trainingassntrainingid,
            trainingassnincusersid: row.trainingassnincusersid,
            trainingassnmentorusersid: row.trainingassnmentorusersid,
            trainingassnadminstate: row.trainingassnadminstate,
            trainingassnmodifiedby: userId,
            trainingassnstatus: 2,
          },
        });

        setAssociations((prev) =>
          prev.map((item) =>
            item.trainingassnrecid === id
              ? { ...item, trainingassnstatus: 2 }
              : item,
          ),
        );

        window.open(row.trainingmateriallink, "_blank", "noopener,noreferrer");
      } catch (err) {
        console.error("Error updating training status:", err);
        showToast("Failed to update training status", "error");
      } finally {
        setStatusLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [userId, showToast],
  );

  // Handler for marking complete (Status -> 3)
  const handleMarkComplete = useCallback(
    async (row) => {
      const id = row.trainingassnrecid;
      setStatusLoading((prev) => ({ ...prev, [id]: true }));

      try {
        await api.post("/updateTrainingAssn", null, {
          params: {
            trainingassnrecid: row.trainingassnrecid,
            trainingassntrainingid: row.trainingassntrainingid,
            trainingassnincusersid: row.trainingassnincusersid,
            trainingassnmentorusersid: row.trainingassnmentorusersid,
            trainingassnadminstate: row.trainingassnadminstate,
            trainingassnmodifiedby: userId,
            trainingassnstatus: 3, // Set status to Completed
          },
        });

        setAssociations((prev) =>
          prev.map((item) =>
            item.trainingassnrecid === id
              ? { ...item, trainingassnstatus: 3 }
              : item,
          ),
        );

        showToast("Training marked as completed!", "success");
      } catch (err) {
        console.error("Error marking training complete:", err);
        showToast("Failed to mark training as complete", "error");
      } finally {
        setStatusLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [userId, showToast],
  );

  const openAddModal = useCallback(() => {
    if (!hasWriteAccess) {
      Swal.fire(
        "Access Denied",
        "You do not have permission to add associations.",
        "warning",
      );
      return;
    }
    setDialogType("add");
    setEditingId(null);
    setFormData({
      trainingId: "",
      incUserId: "",
      mentorUserId: "",
      adminState: true,
    });
    setFieldErrors({});
    setOpenDialog(true);
  }, [hasWriteAccess]);

  const openEditModal = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire(
          "Access Denied",
          "You do not have permission to edit associations.",
          "warning",
        );
        return;
      }
      setDialogType("edit");
      setEditingId(item.trainingassnrecid);
      setFormData({
        trainingId: item.trainingassntrainingid || "",
        incUserId: item.trainingassnincusersid || "",
        mentorUserId: item.trainingassnmentorusersid || "",
        adminState: item.trainingassnadminstate === 1,
      });
      setFieldErrors({});
      setOpenDialog(true);
    },
    [hasWriteAccess],
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
          response = await createAssociation();
        } else {
          response = await updateAssociation();
        }

        if (response.statusCode === 200) {
          showToast(
            `Association ${dialogType === "add" ? "added" : "updated"} successfully!`,
            "success",
          );
          fetchAssociations();
        } else {
          throw new Error(response.message || "Operation failed");
        }
      } catch (err) {
        console.error(
          `Error ${dialogType === "add" ? "adding" : "updating"} association:`,
          err,
        );
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "An unknown error occurred";
        showToast(errorMessage, "error");
        setOpenDialog(true);
      } finally {
        setIsSaving(false);
      }
    },
    [
      validateForm,
      showToast,
      dialogType,
      createAssociation,
      updateAssociation,
      fetchAssociations,
    ],
  );

  const handleDelete = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire(
          "Access Denied",
          "You do not have permission to delete associations.",
          "warning",
        );
        return;
      }

      Swal.fire({
        title: "Are you sure?",
        text: "This association will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          setIsDeleting((prev) => ({
            ...prev,
            [item.trainingassnrecid]: true,
          }));
          try {
            const response = await deleteAssociation(item.trainingassnrecid);
            if (response.statusCode !== 200) {
              throw new Error(
                response.message || "Failed to delete association",
              );
            }
            return response.data;
          } catch (error) {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
            throw error;
          } finally {
            setIsDeleting((prev) => ({
              ...prev,
              [item.trainingassnrecid]: false,
            }));
          }
        },
        allowOutsideClick: () => !Swal.isLoading(),
      }).then((result) => {
        if (result.isConfirmed) {
          Swal.fire("Deleted!", "Association deleted successfully!", "success");
          fetchAssociations();
        }
      });
    },
    [hasWriteAccess, deleteAssociation, fetchAssociations],
  );

  // --- DATA GRID CONFIG ---

  const columns = useMemo(
    () => [
      {
        field: "trainingmodulename",
        headerName: "Training Module Name",
        width: 250,
        sortable: true,
      },
      {
        field: "trainingmateriallink",
        headerName: "Material Link",
        width: 200,
        sortable: true,
        renderCell: (params) => {
          const row = params.row;
          const link = row.trainingmateriallink;
          if (!link) return "-";

          const isTrainee =
            String(userId) === String(row.trainingassnincusersid);
          const isAssigned = row.trainingassnstatus === 1;
          const shouldUpdate = isTrainee && isAssigned;
          const isLoading = statusLoading[row.trainingassnrecid];

          if (shouldUpdate) {
            return (
              <Button
                variant="text"
                color="primary"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartTraining(row);
                }}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={14} /> : null}
              >
                {isLoading ? "Starting..." : "Open Material"}
              </Button>
            );
          } else {
            return (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#1976d2",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                Open Material
              </a>
            );
          }
        },
      },
      {
        field: "trainingassnstatusstr",
        headerName: "Training Status",
        width: 250,
        sortable: true,
        renderCell: (params) => {
          const value = params.value; // text label
          let color = "black";

          if (value === "Completed") {
            color = "green";
          } else if (value === "In Progress") {
            color = "orange";
          } else if (value === "Assigned") {
            color = "blue";
          }

          return (
            <span style={{ fontWeight: 600, color }}>
              {value}
            </span>
          );
        },
      },
      {
        field: "mentorname",
        headerName: "Assigned By",
        width: 150,
        sortable: true,
      },
      {
        field: "createdname",
        headerName: "Created By",
        width: 150,
        sortable: true,
        valueGetter: (params) =>
          params.row.createdname || params.row.trainingassncreatedby,
      },
      {
        field: "trainingassncreatedtime",
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
        valueGetter: (params) =>
          params.row.modifiedname || params.row.trainingassnmodifiedby,
      },
      {
        field: "traineeActions",
        headerName: "Training Actions",
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          const row = params.row;
          // Show only if user is the trainee and training is not already completed
          const isTrainee =
            String(userId) === String(row.trainingassnincusersid);
          const isNotCompleted = row.trainingassnstatus !== 3;
          const isNotInProgress = row.trainingassnstatus !== 1;
          const isLoading = statusLoading[row.trainingassnrecid];

          if (isTrainee && isNotCompleted && isNotInProgress) {
            return (
              <Button
                variant="contained"
                color="success"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  // Add confirmation dialog here
                  Swal.fire({
                    title: "Are you sure?",
                    text: "You want to mark this training as completed.",
                    icon: "question",
                    showCancelButton: true,
                    confirmButtonColor: "#3085d6",
                    cancelButtonColor: "#d33",
                    confirmButtonText: "Yes, complete it!",
                  }).then((result) => {
                    if (result.isConfirmed) {
                      handleMarkComplete(row);
                    }
                  });
                }}
                disabled={isLoading}
                startIcon={isLoading ? <CircularProgress size={14} /> : null}
              >
                {isLoading ? "Saving..." : "Mark Complete"}
              </Button>
            );
          }
          return null;
        },
      },
      {
        field: "trainingassnmodifiedtime",
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
              headerName: "Admin Actions",
              width: 150,
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                return (
                  <Box>
                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      disabled={
                        isSaving || isDeleting[params.row.trainingassnrecid]
                      }
                      title="Edit"
                    >
                      <FaEdit />
                    </ActionButton>
                    <ActionButton
                      color="delete"
                      onClick={() => handleDelete(params.row)}
                      disabled={
                        isSaving || isDeleting[params.row.trainingassnrecid]
                      }
                      title="Delete"
                    >
                      {isDeleting[params.row.trainingassnrecid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <FaTrash />
                      )}
                    </ActionButton>
                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [
      hasWriteAccess,
      isSaving,
      isDeleting,
      openEditModal,
      handleDelete,
      userId,
      statusLoading,
      handleStartTraining,
      handleMarkComplete,
    ],
  );

  const exportConfig = useMemo(
    () => ({
      filename: "training_associations",
      sheetName: "Associations",
    }),
    [],
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((item, index) => ({
        "S.No": index + 1,
        "Rec ID": item.trainingassnrecid || "",
        "Training ID": item.trainingassntrainingid || "",
        "Inc User ID": item.trainingassnincusersid || "",
        "Mentor User ID": item.trainingassnmentorusersid || "",
        Status: item.trainingassnadminstate === 1 ? "Active" : "Inactive",
        "Created By": item.createdname || item.trainingassncreatedby || "",
        "Created Time": formatDate(item.trainingassncreatedtime),
        "Modified By": item.modifiedname || item.trainingassnmodifiedby || "",
        "Modified Time": formatDate(item.trainingassnmodifiedtime),
      })),
    [],
  );

  // --- EFFECTS ---

  useEffect(() => {
    fetchAssociations();
  }, [fetchAssociations]);

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
          <FaLayerGroup style={{ marginRight: "8px" }} />
          Courses
        </Typography>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      <ReusableDataGrid
        data={associations}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search associations..."
        searchFields={[
          "trainingassntrainingid",
          "trainingassnincusersid",
          "trainingassnmentorusersid",
        ]}
        uniqueIdField="trainingassnrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogType === "add" ? "Add" : "Edit"} Association
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
              <Grid item xs={12} sm={6}>
                <TextField
                  autoFocus
                  fullWidth
                  name="trainingId"
                  label="Training ID"
                  type="number"
                  variant="outlined"
                  value={formData.trainingId}
                  onChange={handleInputChange}
                  onBlur={(e) => validateField("trainingId", e.target.value)}
                  error={!!fieldErrors.trainingId}
                  helperText={fieldErrors.trainingId}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="incUserId"
                  label="Inc User ID"
                  type="number"
                  variant="outlined"
                  value={formData.incUserId}
                  onChange={handleInputChange}
                  onBlur={(e) => validateField("incUserId", e.target.value)}
                  error={!!fieldErrors.incUserId}
                  helperText={fieldErrors.incUserId}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="mentorUserId"
                  label="Mentor User ID"
                  type="number"
                  variant="outlined"
                  value={formData.mentorUserId}
                  onChange={handleInputChange}
                  onBlur={(e) => validateField("mentorUserId", e.target.value)}
                  error={!!fieldErrors.mentorUserId}
                  helperText={fieldErrors.mentorUserId}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.adminState}
                      onChange={handleInputChange}
                      name="adminState"
                      color="primary"
                    />
                  }
                  label="Active Status"
                  sx={{ mt: 1 }}
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
              {isSaving
                ? "Saving..."
                : dialogType === "add"
                  ? "Add"
                  : "Save Changes"}
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
            {dialogType === "add"
              ? "Adding association..."
              : "Updating association..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
