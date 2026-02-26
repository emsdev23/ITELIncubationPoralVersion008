import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import Swal from "sweetalert2";

// Material UI imports
import {
  Button,
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  Grid,
  GlobalStyles, // 1. Import GlobalStyles
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";

// Import your reusable component and API instance
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess";

// Styled components
const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

const ActionButton = styled(IconButton)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  backgroundColor:
    color === "edit"
      ? theme.palette.primary.main
      : color === "on"
      ? theme.palette.success.main
      : color === "off"
      ? theme.palette.grey[500]
      : color === "delete"
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

// Component Definition
const TrainingMaterialType = forwardRef(
  ({ title = "📚 Training Material Types" }, ref) => {
    const userId = sessionStorage.getItem("userid");
    const roleid = sessionStorage.getItem("roleid");

    const hasWriteAccess = useWriteAccess(
      "/Incubation/Dashboard/TrainingManagementPage"
    );

    // STATE DECLARATIONS
    const [materialTypes, setMaterialTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editType, setEditType] = useState(null);

    const [formData, setFormData] = useState({
      trainingmattype: "",
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState({});
    const [isToggling, setIsToggling] = useState({});

    const [toast, setToast] = useState({
      open: false,
      message: "",
      severity: "success",
    });

    // Expose the openAddModal function to parent components
    useImperativeHandle(ref, () => ({
      openAddModal,
    }));

    // --- API CALLS ---

    const fetchMaterialTypes = useCallback(async () => {
      setLoading(true);
      try {
        const response = await api.post(
          "/resources/generic/gettrainingmattypelist",
          {
            userId: parseInt(userId) || 1,
            userIncId: "ALL",
          },
          {
            headers: {
              "X-Module": "Training Management",
              "X-Action": "Fetch Material Types",
            },
          }
        );
        setMaterialTypes(response.data.data || []);
      } catch (err) {
        console.error("Error fetching material types:", err);
        Swal.fire({
          title: "Error",
          text: "Failed to load material types.",
          icon: "error",
          zIndex: 9999,
        });
      } finally {
        setLoading(false);
      }
    }, [userId]);

    const refreshData = useCallback(() => {
      fetchMaterialTypes();
    }, [fetchMaterialTypes]);

    // --- HANDLERS ---

    const showToast = useCallback((message, severity = "success") => {
      setToast({ open: true, message, severity });
    }, []);

    const validateField = useCallback(
      (name, value) => {
        const errors = { ...fieldErrors };
        if (name === "trainingmattype") {
          if (!value || value.trim() === "") {
            errors[name] = "Material Type Name is required";
          } else {
            delete errors[name];
          }
        }
        setFieldErrors(errors);
        return !errors[name];
      },
      [fieldErrors]
    );

    const handleChange = useCallback(
      (e) => {
        const { name, value } = e.target;
        if (fieldErrors[name]) validateField(name, value);
        setFormData((prev) => ({ ...prev, [name]: value }));
      },
      [fieldErrors, validateField]
    );

    const openAddModal = useCallback(() => {
      setEditType(null);
      setFormData({ trainingmattype: "" });
      setFieldErrors({});
      setIsModalOpen(true);
    }, []);

    const openEditModal = useCallback((type) => {
      setEditType(type);
      setFormData({ trainingmattype: type.trainingmattype || "" });
      setFieldErrors({});
      setIsModalOpen(true);
    }, []);

    // --- Create Material Type ---
    const createMaterialType = useCallback(async () => {
      const endpoint = "/addTrainingMatType";
      const action = "Add Material Type";

      const payload = {
        trainingmattype: formData.trainingmattype,
        trainingmattypeadminstate: 1,
        trainingmattypecreatedby: parseInt(userId) || 1,
        trainingmattypemodifiedby: parseInt(userId) || 1,
      };

      try {
        const response = await api.post(endpoint, payload, {
          headers: {
            "X-Module": "Training Management",
            "X-Action": action,
          },
        });

        const { statusCode, message } = response.data;

        if (statusCode === 200) {
          return { success: true, message: "Material type added successfully!" };
        } else if (statusCode === 409) {
          throw new Error(message || "Duplicate Entry: Material type already exists!");
        } else if (statusCode === 400) {
          throw new Error(message || "Invalid data provided.");
        } else {
          throw new Error(message || "Failed to save material type.");
        }
      } catch (err) {
        console.error("API Error (Create):", err);
        if (err.response && err.response.status === 409) {
          throw new Error(err.response.data.message || "Duplicate Entry: Material type already exists!");
        }
        if (err.response && err.response.status === 400) {
          throw new Error(err.response.data.message || "Validation Error.");
        }
        throw err;
      }
    }, [formData, userId]);

    // --- Update Material Type ---
    const updateMaterialType = useCallback(async () => {
      try {
        const response = await api.post(
          "/updateTrainingMatType",
          {
            trainingmattypeid: editType.trainingmattypeid,
            trainingmattype: formData.trainingmattype,
            trainingmattypeadminstate: editType.trainingmattypeadminstate ?? 1,
            trainingmattypemodifiedby: parseInt(userId) || 1,
          },
          {
            headers: {
              "X-Module": "Training Management",
              "X-Action": "Update Material Type",
            },
          }
        );

        const { statusCode, message } = response.data;

        if (statusCode === 200) {
          return { success: true, message: "Material type updated successfully!" };
        } else if (statusCode === 409) {
          throw new Error(message || "Duplicate Entry: Material type already exists!");
        } else if (statusCode === 400) {
          throw new Error(message || "Invalid data provided.");
        } else {
          throw new Error(message || "Failed to update material type.");
        }
      } catch (err) {
        console.error("API Error (Update):", err);
        if (err.response && err.response.status === 409) {
          throw new Error(err.response.data.message || "Duplicate Entry: Material type already exists!");
        }
        if (err.response && err.response.status === 400) {
          throw new Error(err.response.data.message || "Validation Error.");
        }
        throw err;
      }
    }, [formData, editType, userId]);

    // --- Handle Toggle Status ---
    const handleToggleStatus = useCallback(
      (type) => {
        const isCurrentlyEnabled = type.trainingmattypeadminstate === 1;
        const actionText = isCurrentlyEnabled ? "disable" : "enable";
        const newState = isCurrentlyEnabled ? 0 : 1;

        Swal.fire({
          title: "Are you sure?",
          text: `Do you want to ${actionText} this material type?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: isCurrentlyEnabled ? "#d33" : "#3085d6",
          cancelButtonColor: "#6c757d",
          confirmButtonText: `Yes, ${actionText} it!`,
          cancelButtonText: "Cancel",
          zIndex: 9999,
        }).then((result) => {
          if (result.isConfirmed) {
            setIsToggling((prev) => ({
              ...prev,
              [type.trainingmattypeid]: true,
            }));

            api
              .post(
                "/updateTrainingMatType",
                {
                  trainingmattypeid: type.trainingmattypeid,
                  trainingmattype: type.trainingmattype,
                  trainingmattypeadminstate: newState,
                  trainingmattypemodifiedby: userId,
                },
                {
                  headers: {
                    "X-Module": "Training Management",
                    "X-Action": "Update Material Type Status",
                  },
                }
              )
              .then((response) => {
                const { statusCode, message } = response.data;
                if (statusCode === 200) {
                  Swal.fire({
                    title: "Success!",
                    text: `Material type ${actionText}d successfully!`,
                    icon: "success",
                    zIndex: 9999,
                  });
                  refreshData();
                } else {
                  throw new Error(message || `Failed to ${actionText} material type`);
                }
              })
              .catch((err) => {
                console.error("Error toggling status:", err);
                let errorMessage = "Failed to update status!";
                if (err.response && err.response.status === 409) {
                  errorMessage = "Conflict: Cannot change status due to existing references.";
                } else if (err.response && err.response.data && err.response.data.message) {
                  errorMessage = err.response.data.message;
                } else if (err.message) {
                  errorMessage = err.message;
                }

                Swal.fire({
                  title: "Error",
                  text: errorMessage,
                  icon: "error",
                  zIndex: 9999,
                });
              })
              .finally(() => {
                setIsToggling((prev) => ({
                  ...prev,
                  [type.trainingmattypeid]: false,
                }));
              });
          }
        });
      },
      [userId, refreshData]
    );

    const deleteMaterialType = useCallback(
      async (typeId) => {
        try {
          const response = await api.post(
            "/deleteTrainingMatType",
            {}, 
            {
              params: {
                trainingmattypeid: typeId,
                trainingmattypemodifiedby: parseInt(userId) || 1,
              },
              headers: {
                "X-Module": "Training Management",
                "X-Action": "Delete Material Type",
              },
            }
          );
          return response.data;
        } catch (error) {
          console.error("Error deleting material type:", error);
          throw error;
        }
      },
      [userId]
    );

    // --- Master Submit Handler ---
    const handleSubmit = useCallback(
      async (e) => {
        e.preventDefault();

        if (!validateField("trainingmattype", formData.trainingmattype)) {
          showToast("Please fix errors in the form", "error");
          return;
        }

        setIsSaving(true);

        try {
          let result;
          if (editType) {
            result = await updateMaterialType();
          } else {
            result = await createMaterialType();
          }

          Swal.fire({
            title: "Success!",
            text: result.message,
            icon: "success",
            zIndex: 9999,
          });
          
          setIsModalOpen(false);
          refreshData();
          setFormData({ trainingmattype: "" });
          setFieldErrors({});
          setEditType(null);

        } catch (err) {
          console.error("Error in handleSubmit:", err);
          const errorMessage = err.message || "Operation failed";

          Swal.fire({
            title: "Error",
            text: errorMessage,
            icon: "error",
            zIndex: 9999,
          }).then(() => {
            setIsModalOpen(true); 
          });

          showToast(`Failed: ${errorMessage}`, "error");
        } finally {
          setIsSaving(false);
        }
      },
      [
        validateField,
        formData,
        editType,
        createMaterialType,
        updateMaterialType,
        refreshData,
        showToast,
      ]
    );

    const handleDelete = useCallback(
      (type) => {
        Swal.fire({
          title: "Are you sure?",
          text: "You won't be able to revert this!",
          icon: "warning",
          showCancelButton: true,
          confirmButtonColor: "#d33",
          cancelButtonColor: "#3085d6",
          confirmButtonText: "Yes, delete it!",
          zIndex: 9999,
        }).then(async (result) => {
          if (result.isConfirmed) {
            setIsDeleting((prev) => ({
              ...prev,
              [type.trainingmattypeid]: true,
            }));

            try {
              const response = await deleteMaterialType(type.trainingmattypeid);

              if (
                response.statusCode === 200 ||
                response.status === "success"
              ) {
                Swal.fire({
                  title: "Deleted!",
                  text: "Material type has been deleted.",
                  icon: "success",
                  zIndex: 9999,
                });
                refreshData();
              } else {
                throw new Error(response.message || "Failed to delete");
              }
            } catch (error) {
              console.error("Error deleting material type:", error);
              Swal.fire({
                title: "Error",
                text: error.message || "Failed to delete",
                icon: "error",
                zIndex: 9999,
              });
              showToast(`Failed to delete: ${error.message}`, "error");
            } finally {
              setIsDeleting((prev) => ({
                ...prev,
                [type.trainingmattypeid]: false,
              }));
            }
          }
        });
      },
      [deleteMaterialType, refreshData, showToast]
    );

    // --- DATA GRID CONFIG ---

    const columns = useMemo(() => {
      const baseColumns = [
        {
          field: "trainingmattype",
          headerName: "Material Type",
          width: 300,
          sortable: true,
          flex: 1,
        },
        {
          field: "trainingmattypeactivestate",
          headerName: "Status",
          width: 150,
          sortable: true,
          flex: 1,
          renderCell: (params) => {
            const value = params.value;
            const color = value === "Active" ? "green" : "red";
            return (
              <span style={{ fontWeight: 600, color }}>{value}</span>
            );
          },
        },
        {
          field: "createdname",
          headerName: "Created By",
          width: 200,
          sortable: true,
          renderCell: (params) => params?.row?.createdname || "-",
        },
        {
          field: "trainingmattypecreatedtime",
          headerName: "Created Time",
          width: 180,
          sortable: true,
          renderCell: (params) => {
            const date = params.row.trainingmattypecreatedtime;
            return date ? new Date(date).toLocaleString() : "-";
          },
        },
        {
          field: "modifiedname",
          headerName: "Modified By",
          width: 200,
          sortable: true,
          renderCell: (params) => params?.row?.modifiedname || "-",
        },
        {
          field: "trainingmattypemodifiedtime",
          headerName: "Modified Time",
          width: 180,
          sortable: true,
          renderCell: (params) => {
            const date = params.row.trainingmattypemodifiedtime;
            return date ? new Date(date).toLocaleString() : "-";
          },
        },
      ];

      if (hasWriteAccess && Number(roleid) === 1) {
        baseColumns.push({
          field: "actions",
          headerName: "Actions",
          width: 150,
          sortable: false,
          filterable: false,
          renderCell: (params) => {
            if (!params || !params.row) return null;
            const isCurrentlyEnabled = params.row.trainingmattypeadminstate === 1;

            return (
              <Box>
                <ActionButton
                  color={isCurrentlyEnabled ? "on" : "off"}
                  onClick={() => handleToggleStatus(params.row)}
                  disabled={
                    isSaving ||
                    isDeleting[params.row.trainingmattypeid] ||
                    isToggling[params.row.trainingmattypeid]
                  }
                  title={isCurrentlyEnabled ? "Disable" : "Enable"}
                >
                  {isToggling[params.row.trainingmattypeid] ? (
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
                    isDeleting[params.row.trainingmattypeid] ||
                    isToggling[params.row.trainingmattypeid]
                  }
                >
                  <EditIcon fontSize="small" />
                </ActionButton>
              </Box>
            );
          },
        });
      }

      return baseColumns;
    }, [
      hasWriteAccess,
      roleid,
      isSaving,
      isDeleting,
      isToggling,
      openEditModal,
      handleDelete,
      handleToggleStatus,
    ]);

    const exportConfig = useMemo(
      () => ({
        filename: "training_material_types",
        sheetName: "Material Types",
      }),
      []
    );

    const onExportData = useMemo(
      () => (data) => {
        return data.map((item, index) => ({
          "S.No": index + 1,
          ID: item.trainingmattypeid || "",
          "Material Type": item.trainingmattype || "",
          Status: item.trainingmattypeadminstate === 1 ? "Active" : "Inactive",
          "Created By": item.createdname || "",
          "Created Time": item.trainingmattypecreatedtime
            ? new Date(item.trainingmattypecreatedtime).toLocaleString()
            : "",
          "Modified By": item.modifiedname || "",
          "Modified Time": item.trainingmattypemodifiedtime
            ? new Date(item.trainingmattypemodifiedtime).toLocaleString()
            : "",
        }));
      },
      []
    );

    // EFFECTS
    useEffect(() => {
      refreshData();
    }, [refreshData]);

    // RENDER
    return (
      <Box sx={{ p: 2 }}>
        {/* 2. Add GlobalStyles to force z-index via CSS with !important */}
        <GlobalStyles
          styles={{
            '.swal2-container': {
              zIndex: '99999 !important',
            },
          }}
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h4">{title}</Typography>
          {Number(roleid) === 1 && hasWriteAccess && (
            <Button
              variant="contained"
              onClick={openAddModal}
              disabled={isSaving}
            >
              + Add Material Type
            </Button>
          )}
        </Box>

        <ReusableDataGrid
          data={materialTypes}
          columns={columns}
          title=""
          enableExport={true}
          enableColumnFilters={true}
          searchPlaceholder="Search material types..."
          searchFields={["trainingmattype"]}
          uniqueIdField="trainingmattypeid"
          onExportData={onExportData}
          exportConfig={exportConfig}
          loading={loading}
        />

        <Dialog
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {editType ? "Edit Material Type" : "Add Material Type"}
            <IconButton
              aria-label="close"
              onClick={() => setIsModalOpen(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
              disabled={isSaving}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleSubmit}>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    margin="dense"
                    name="trainingmattype"
                    label="Material Type Name *"
                    variant="outlined"
                    value={formData.trainingmattype}
                    onChange={handleChange}
                    onBlur={(e) =>
                      validateField("trainingmattype", e.target.value)
                    }
                    required
                    disabled={isSaving}
                    error={!!fieldErrors.trainingmattype}
                    helperText={fieldErrors.trainingmattype}
                    autoFocus
                  />
                  <Typography
                    variant="caption"
                    color="textSecondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    e.g., Video, PDF, PPT, Document
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSaving || Object.keys(fieldErrors).length > 0}
                startIcon={isSaving ? <CircularProgress size={20} /> : null}
              >
                {isSaving ? "Saving..." : editType ? "Update" : "Save"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

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
                : editType
                ? "Updating material type..."
                : "Creating material type..."}
            </Typography>
          </Box>
        </StyledBackdrop>
      </Box>
    );
  }
);

TrainingMaterialType.displayName = "TrainingMaterialType";

export default TrainingMaterialType;