import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { FaTimes } from "react-icons/fa";

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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  Grid,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ArticleIcon from "@mui/icons-material/Article";

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

// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    // Handle standard ISO string first
    if (typeof dateStr === 'string' && dateStr.includes('T')) {
        return new Date(dateStr).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        });
    }
    return dateStr; 
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
};

// Using forwardRef to allow parent components to access methods
const TrainingModule = forwardRef(({ title = "🎓 Training Module" }, ref) => {
  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/TrainingManagementPage"
  );
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token"); // Retained if needed elsewhere
  const roleid = sessionStorage.getItem("roleid");
  const incUserid = sessionStorage.getItem("incuserid");
  const incubateeId = sessionStorage.getItem("incubateeId");
  // const IP = IPAdress; // No longer needed with centralized api instance

  // STATE DECLARATIONS
  const [trainings, setTrainings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTraining, setEditTraining] = useState(null);

  const [formData, setFormData] = useState({
    trainingcatid: "",
    trainingsubcatid: "",
    trainingmattypeid: "",
    trainingmodulename: "",
    trainingdescription: "",
    trainingmateriallink: "",
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
  const [error, setError] = useState(null);

  // Expose the openAddModal function to parent components
  useImperativeHandle(ref, () => ({
    openAddModal,
  }));

  // --- API CALLS (Using api.post) ---

  const fetchTrainingList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "/resources/generic/gettraininglist",
        {
          userId: parseInt(userId) || 1,
          userIncId: "ALL",
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Fetch Training List",
          },
        }
      );
      setTrainings(response.data.data || []);
    } catch (err) {
      console.error("Error fetching trainings:", err);
      setError("Failed to load training list.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.post(
        "/resources/generic/gettrainingcatlist",
        {
          userId: parseInt(userId) || 1,
          userIncId: "ALL",
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Fetch Categories",
          },
        }
      );

      const filteredCategories = (response.data.data || []).filter(
        (item) => item.trainingcatadminstate === 1
      );

      setCategories(filteredCategories);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, [userId]);

  const fetchSubCategories = useCallback(async () => {
    try {
      const response = await api.post(
        "/resources/generic/gettrainingsubcatlist",
        {
          userId: parseInt(userId) || 1,
          userIncId: "ALL",
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Fetch Sub Categories",
          },
        }
      );

      const filteredSubCategories = (response.data.data || []).filter(
        (item) => item.trainingsubcatadminstate === 1
      );

      setSubCategories(filteredSubCategories);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
    }
  }, [userId]);

  const fetchMaterialTypes = useCallback(async () => {
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

      const filteredData = (response.data.data || []).filter(
        (item) => item.trainingmattypeadminstate === 1
      );

      setMaterialTypes(filteredData);
    } catch (err) {
      console.error("Error fetching material types:", err);
    }
  }, [userId]);

  const refreshData = useCallback(() => {
    fetchTrainingList();
    fetchCategories();
    fetchSubCategories();
    fetchMaterialTypes();
  }, [
    fetchTrainingList,
    fetchCategories,
    fetchSubCategories,
    fetchMaterialTypes,
  ]);

  // --- HANDLERS ---

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const validateField = useCallback(
    (name, value) => {
      const errors = { ...fieldErrors };
      switch (name) {
        case "trainingmodulename":
          if (!value || value.trim() === "")
            errors[name] = "Module name is required";
          else delete errors[name];
          break;
        case "trainingdescription":
          if (!value || value.trim() === "")
            errors[name] = "Description is required";
          else delete errors[name];
          break;
        case "trainingcatid":
          if (!value) errors[name] = "Category is required";
          else delete errors[name];
          break;
        case "trainingsubcatid":
          if (!value) errors[name] = "Subcategory is required";
          else delete errors[name];
          break;
        case "trainingmattypeid":
          if (!value) errors[name] = "Material type is required";
          else delete errors[name];
          break;
        case "trainingmateriallink":
          if (value && !/^https?:\/\/.+/i.test(value))
            errors[name] = "Please enter a valid URL";
          else delete errors[name];
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
    const isValid =
      validateField("trainingmodulename", formData.trainingmodulename) &&
      validateField("trainingdescription", formData.trainingdescription) &&
      validateField("trainingcatid", formData.trainingcatid) &&
      validateField("trainingsubcatid", formData.trainingsubcatid) &&
      validateField("trainingmattypeid", formData.trainingmattypeid) &&
      validateField("trainingmateriallink", formData.trainingmateriallink);

    return isValid;
  }, [formData, validateField]);

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      if (fieldErrors[name]) validateField(name, value);

      if (name === "trainingcatid") {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
          trainingsubcatid: "",
        }));
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    },
    [fieldErrors, validateField]
  );

  const getFilteredSubCategories = useCallback(() => {
    if (!formData.trainingcatid) return [];
    return subCategories.filter(
      (sub) =>
        String(sub.trainingsubcatcatid) === String(formData.trainingcatid)
    );
  }, [formData.trainingcatid, subCategories]);

  const openAddModal = useCallback(() => {
    setEditTraining(null);
    setFormData({
      trainingcatid: "",
      trainingsubcatid: "",
      trainingmattypeid: "",
      trainingmodulename: "",
      trainingdescription: "",
      trainingmateriallink: "",
    });
    setFieldErrors({});
    Promise.all([
      fetchCategories(),
      fetchSubCategories(),
      fetchMaterialTypes(),
    ]).then(() => {
      setIsModalOpen(true);
    });
  }, [fetchCategories, fetchSubCategories, fetchMaterialTypes]);

  const openEditModal = useCallback(
    async (training) => {
      await Promise.all([
        fetchCategories(),
        fetchSubCategories(),
        fetchMaterialTypes(),
      ]);

      setEditTraining(training);
      setFormData({
        trainingcatid: training.trainingcatid || "",
        trainingsubcatid: training.trainingsubcatid || "",
        trainingmattypeid: training.trainingmattypeid || "",
        trainingmodulename: training.trainingmodulename || "",
        trainingdescription: training.trainingdescription || "",
        trainingmateriallink: training.trainingmateriallink || "",
      });
      setFieldErrors({});
      setIsModalOpen(true);
    },
    [fetchCategories, fetchSubCategories, fetchMaterialTypes]
  );

  // --- Handle Toggle Status (Enable/Disable) ---
  const handleToggleStatus = useCallback(
    (training) => {
      const isCurrentlyEnabled = training.trainingadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} this training module?`,
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
            [training.trainingid]: true,
          }));

          // API call using api.post
          api
            .post(
              "/updateTraining",
              {
                trainingid: training.trainingid,
                trainingcatid: training.trainingcatid,
                trainingsubcatid: training.trainingsubcatid,
                trainingmattypeid: training.trainingmattypeid,
                trainingmodulename: training.trainingmodulename,
                trainingdescription: training.trainingdescription,
                trainingmateriallink: training.trainingmateriallink,
                trainingadminstate: newState,
                trainingmodifiedby: userId,
              },
              {
                headers: {
                  "X-Module": "Training Management",
                  "X-Action": "Update Training Status",
                },
              }
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `Training module ${actionText}d successfully!`,
                  "success"
                );
                refreshData();
              } else {
                throw new Error(
                  response.data.message || `Failed to ${actionText} training module`
                );
              }
            })
            .catch((err) => {
              console.error("Error updating training status:", err);
              if (err.response && err.response.status === 409) {
                Swal.fire(
                  "Duplicate Entry",
                  err.response.data.message ||
                    "Conflict detected. Please try again.",
                  "warning"
                );
                return;
              }
              if (err.message && err.message.includes("409")) {
                Swal.fire(
                  "Duplicate Entry",
                  "Conflict detected. Please try again.",
                  "warning"
                );
                return;
              }

              Swal.fire(
                "Error",
                err.response?.data?.message ||
                  `Failed to ${actionText} training module!`,
                "error"
              );
            })
            .finally(() => {
              setIsToggling((prev) => ({
                ...prev,
                [training.trainingid]: false,
              }));
            });
        }
      });
    },
    [userId, refreshData]
  );

  const createTraining = useCallback(async () => {
    try {
      const response = await api.post(
        "/addTraining",
        {
          trainingcatid: formData.trainingcatid,
          trainingsubcatid: formData.trainingsubcatid,
          trainingmattypeid: formData.trainingmattypeid,
          trainingmodulename: formData.trainingmodulename,
          trainingdescription: formData.trainingdescription,
          trainingmateriallink: formData.trainingmateriallink,
          trainingadminstate: 1,
          trainingcreatedby: parseInt(userId) || 1,
          trainingmodifiedby: parseInt(userId) || 1,
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Add Training",
          },
        }
      );
      return response.data; // Return the data payload to maintain compatibility with handleSubmit
    } catch (error) {
      console.error("Error creating training:", error);
      throw error;
    }
  }, [formData, userId]);

  const updateTraining = useCallback(async () => {
    try {
      const response = await api.post(
        "/updateTraining",
        {
          trainingid: editTraining.trainingid,
          trainingcatid: formData.trainingcatid,
          trainingsubcatid: formData.trainingsubcatid,
          trainingmattypeid: formData.trainingmattypeid,
          trainingmodulename: formData.trainingmodulename,
          trainingdescription: formData.trainingdescription,
          trainingmateriallink: formData.trainingmateriallink,
          trainingadminstate: editTraining.trainingadminstate ?? 1,
          trainingmodifiedby: parseInt(userId) || 1,
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Update Training",
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating training:", error);
      throw error;
    }
  }, [formData, editTraining, userId]);

  const deleteTraining = useCallback(
    async (trainingId) => {
      try {
        // Using params for delete ID as per pattern in reference code
        const response = await api.post(
          "/deleteTraining",
          {}, // Empty body
          {
            params: {
              trainingid: trainingId,
              trainingmodifiedby: parseInt(userId) || 1,
            },
            headers: {
              "X-Module": "Training Management",
              "X-Action": "Delete Training",
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error("Error deleting training:", error);
        throw error;
      }
    },
    [userId]
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateForm()) {
        showToast("Please fix errors in the form", "error");
        return;
      }

      setIsSaving(true);
      setIsModalOpen(false);

      try {
        let response;
        if (editTraining) {
          response = await updateTraining();
        } else {
          response = await createTraining();
        }

        if (response.statusCode === 200 || response.status === "success") {
          Swal.fire(
            "Success!",
            editTraining
              ? "Training module updated successfully"
              : "Training module added successfully",
            "success"
          );
          refreshData();
        } else {
          throw new Error(response.message || "Operation failed");
        }
      } catch (err) {
        console.error("Error in handleSubmit:", err);
        showToast(`Failed to save: ${err.message}`, "error");
        Swal.fire("Error", err.message || "Operation failed", "error");
        setIsModalOpen(true);
      } finally {
        setIsSaving(false);
      }
    },
    [
      validateForm,
      showToast,
      editTraining,
      updateTraining,
      createTraining,
      refreshData,
    ]
  );

  const handleDelete = useCallback(
    (training) => {
      Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Yes, delete it!",
      }).then(async (result) => {
        if (result.isConfirmed) {
          setIsDeleting((prev) => ({
            ...prev,
            [training.trainingid]: true,
          }));

          try {
            const response = await deleteTraining(training.trainingid);

            if (response.statusCode === 200 || response.status === "success") {
              Swal.fire(
                "Deleted!",
                "Training module has been deleted.",
                "success"
              );
              refreshData();
            } else {
              throw new Error(response.message || "Failed to delete");
            }
          } catch (error) {
            console.error("Error deleting training:", error);
            showToast(`Failed to delete: ${error.message}`, "error");
            Swal.fire("Error", error.message, "error");
          } finally {
            setIsDeleting((prev) => ({
              ...prev,
              [training.trainingid]: false,
            }));
          }
        }
      });
    },
    [deleteTraining, refreshData, showToast]
  );

  // --- DATA GRID CONFIG ---

  const columns = useMemo(() => {
    const baseColumns = [
      {
        field: "trainingcatname",
        headerName: "Category",
        width: 150,
        sortable: true,
      },
      {
        field: "trainingsubcatname",
        headerName: "Subcategory",
        width: 150,
        sortable: true,
      },
      {
        field: "trainingmattypename",
        headerName: "Material Type",
        width: 150,
        sortable: true,
      },
      {
        field: "trainingmodulename",
        headerName: "Module Name",
        width: 200,
        sortable: true,
      },
      {
        field: "trainingdescription",
        headerName: "Description",
        width: 250,
        sortable: true,
        renderCell: (params) => {
          const desc = params?.row?.trainingdescription || "";
          if (!desc) return "-";

          return (
            <Tooltip title={desc} arrow>
              <span>
                {desc.length > 30 ? `${desc.substring(0, 30)}...` : desc}
              </span>
            </Tooltip>
          );
        },
      },
      {
        field: "trainingmateriallink",
        headerName: "Material Link",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          const link = params?.row?.trainingmateriallink;
          if (!link) return "-";

          return (
            <Tooltip title="Open Link" arrow>
              <Button
                size="small"
                variant="text"
                startIcon={<ArticleIcon />}
                onClick={() => window.open(link, "_blank")}
              >
                View Material
              </Button>
            </Tooltip>
          );
        },
      },
      {
        field: "trainingactivestate",
        headerName: "Status",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          const value = params.value;
          const color = value === "Active" ? "green" : "red";

          return (
            <span style={{ fontWeight: 600, color }}>
              {value}
            </span>
          );
        },
      },
      {
        field: "createdname",
        headerName: "Created By",
        width: 150,
        sortable: true,
        renderCell: (params) => params?.row?.createdname || "-",
      },
      {
        field: "trainingcreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        renderCell: (params) => formatDate(params.value),
      },
      {
        field: "modifiedname",
        headerName: "Modified By",
        width: 150,
        sortable: true,
        renderCell: (params) => params?.row?.modifiedname || "-",
      },
      {
        field: "trainingmodifiedtime",
        headerName: "Modified Time",
        width: 180,
        sortable: true,
        renderCell: (params) => formatDate(params.value),
      },
    ];

    return [
      ...baseColumns,
      ...(hasWriteAccess && Number(roleid) === 1
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 180,
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                
                const isCurrentlyEnabled = params.row.trainingadminstate === 1;

                return (
                  <Box>
                    <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.trainingid] ||
                        isToggling[params.row.trainingid]
                      }
                      title={isCurrentlyEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling[params.row.trainingid] ? (
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
                        isDeleting[params.row.trainingid] ||
                        isToggling[params.row.trainingid]
                      }
                      title="Edit"
                    >
                      <EditIcon fontSize="small" />
                    </ActionButton>
                  </Box>
                );
              },
            },
          ]
        : []),
    ];
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
      filename: "training_modules",
      sheetName: "Training",
    }),
    []
  );

  const onExportData = useMemo(
    () => (data) => {
      return data.map((item, index) => ({
        "S.No": index + 1,
        Category: item.trainingcatname || "",
        Subcategory: item.trainingsubcatname || "",
        "Material Type": item.trainingmattypename || "",
        "Module Name": item.trainingmodulename || "",
        Description: item.trainingdescription || "",
        "Material Link": item.trainingmateriallink || "",
        Status: item.trainingadminstate === 1 ? "Active" : "Inactive",
        "Created By": item.createdname || "",
        "Created Time": formatDate(item.trainingcreatedtime),
        "Modified By": item.modifiedname || "",
        "Modified Time": formatDate(item.trainingmodifiedtime),
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
            + Add Training
          </Button>
        )}
      </Box>

      <ReusableDataGrid
        data={trainings}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search training modules..."
        searchFields={[
          "trainingmodulename",
          "trainingdescription",
          "trainingcatname",
        ]}
        uniqueIdField="trainingid"
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
          {editTraining ? "Edit Training Module" : "Add Training Module"}
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
            <Grid container spacing={2} direction="column">
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.trainingcatid}
                >
                  <InputLabel>Category *</InputLabel>
                  <Select
                    name="trainingcatid"
                    value={formData.trainingcatid}
                    onChange={handleChange}
                    label="Category *"
                    disabled={isSaving}
                  >
                    <MenuItem value="">Select Category</MenuItem>
                    {categories.map((cat) => (
                      <MenuItem
                        key={cat.trainingcatid}
                        value={cat.trainingcatid}
                      >
                        {cat.trainingcatname}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.trainingcatid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.trainingcatid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.trainingsubcatid}
                >
                  <InputLabel>Subcategory *</InputLabel>
                  <Select
                    name="trainingsubcatid"
                    value={formData.trainingsubcatid}
                    onChange={handleChange}
                    label="Subcategory *"
                    disabled={!formData.trainingcatid || isSaving}
                  >
                    <MenuItem value="">Select Subcategory</MenuItem>
                    {getFilteredSubCategories().length > 0 ? (
                      getFilteredSubCategories().map((sub) => (
                        <MenuItem
                          key={sub.trainingsubcatid}
                          value={sub.trainingsubcatid}
                        >
                          {sub.trainingsubcatname}
                        </MenuItem>
                      ))
                    ) : formData.trainingcatid ? (
                      <MenuItem value="" disabled>
                        No subcategories available for this category
                      </MenuItem>
                    ) : (
                      <MenuItem value="" disabled>
                        Please select a category first
                      </MenuItem>
                    )}
                  </Select>
                  {fieldErrors.trainingsubcatid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.trainingsubcatid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.trainingmattypeid}
                >
                  <InputLabel>Material Type *</InputLabel>
                  <Select
                    name="trainingmattypeid"
                    value={formData.trainingmattypeid}
                    onChange={handleChange}
                    label="Material Type *"
                    disabled={isSaving}
                  >
                    <MenuItem value="">Select Material Type</MenuItem>
                    {materialTypes.map((type) => (
                      <MenuItem
                        key={type.trainingmattypeid}
                        value={type.trainingmattypeid}
                      >
                        {type.trainingmattype}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.trainingmattypeid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.trainingmattypeid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="trainingmodulename"
                  label="Module Name *"
                  variant="outlined"
                  value={formData.trainingmodulename}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("trainingmodulename", e.target.value)
                  }
                  required
                  disabled={isSaving}
                  error={!!fieldErrors.trainingmodulename}
                  helperText={fieldErrors.trainingmodulename}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="trainingdescription"
                  label="Description *"
                  multiline
                  rows={3}
                  variant="outlined"
                  value={formData.trainingdescription}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("trainingdescription", e.target.value)
                  }
                  required
                  disabled={isSaving}
                  error={!!fieldErrors.trainingdescription}
                  helperText={fieldErrors.trainingdescription}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="trainingmateriallink"
                  label="Material Link (URL)"
                  type="url"
                  variant="outlined"
                  value={formData.trainingmateriallink}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("trainingmateriallink", e.target.value)
                  }
                  disabled={isSaving}
                  error={!!fieldErrors.trainingmateriallink}
                  helperText={
                    fieldErrors.trainingmateriallink || "Enter a valid URL"
                  }
                />
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
              {isSaving ? "Saving..." : editTraining ? "Update" : "Save"}
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
              : editTraining
              ? "Updating training..."
              : "Creating training..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
});

export default TrainingModule;