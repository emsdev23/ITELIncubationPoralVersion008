import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { DataContext } from "../Datafetching/DataProvider";

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
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ToggleOnIcon from "@mui/icons-material/ToggleOn"; // ON Icon (Green Pill)
import ToggleOffIcon from "@mui/icons-material/ToggleOff"; // OFF Icon (Grey Pill)
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Status Active
import CancelIcon from "@mui/icons-material/Cancel"; // Status Inactive

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
      : color === "on" || color === "enable" // ON State -> Green
      ? theme.palette.success.main
      : color === "off" || color === "disable" // OFF State -> Grey
      ? theme.palette.grey[500]
      : color === "delete" // Delete -> Red
      ? theme.palette.error.main
      : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit"
        ? theme.palette.primary.dark
        : color === "on" || color === "enable"
        ? theme.palette.success.dark
        : color === "off" || color === "disable"
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

export default function TrainingCatTable() {
  // Use the custom hook to check write access
  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/TrainingManagementPage",
  );
  // --- 1. STATE DECLARATIONS ---
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");

  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [formData, setFormData] = useState({
    trainingcatname: "",
    trainingcatdescription: "",
    trainingcatadminstate: 1, // Default to active
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState({}); // State for Toggle Status

  // --- 2. HANDLER FUNCTIONS ---

  // Fetch Training Categories - Updated to use POST API
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use api.post for POST request with the specified body
      const response = await api.post(
        "/resources/generic/gettrainingcatlist", // The endpoint path
        {
          // Request body
          userId: parseInt(userId, 10),
          userIncId: "ALL",
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Fetch Training Categories",
          },
        },
      );

      // Response is already decrypted by interceptor
      setCats(response.data.data || []);
    } catch (err) {
      console.error("Error fetching training categories:", err);
      setError("Failed to load training categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const openAddModal = useCallback(() => {
    setEditCat(null);
    setFormData({
      trainingcatname: "",
      trainingcatdescription: "",
      trainingcatadminstate: 1,
    });
    setIsModalOpen(true);
    setError(null);
  }, []);

  const openEditModal = useCallback((cat) => {
    setEditCat(cat);
    setFormData({
      trainingcatname: cat.trainingcatname || "",
      trainingcatdescription: cat.trainingcatdescription || "",
      trainingcatadminstate: cat.trainingcatadminstate || 1,
    });
    setIsModalOpen(true);
    setError(null);
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (checked ? 1 : 0) : value,
    }));
  }, []);

  // --- Handle Toggle Status (Enable/Disable) ---
  const handleToggleStatus = useCallback(
    (cat) => {
      const isCurrentlyEnabled = cat.trainingcatadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} this training category?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isCurrentlyEnabled ? "#d33" : "#3085d6",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText} it!`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsToggling((prev) => ({ ...prev, [cat.trainingcatid]: true }));
          
          // API call to update status
          // Note: We send the full object to prevent other fields from being nullified
          api
            .post(
              "/updateTrainingCat", 
              {
                trainingcatid: cat.trainingcatid,
                trainingcatname: cat.trainingcatname,
                trainingcatdescription: cat.trainingcatdescription,
                trainingcatadminstate: newState,
                trainingcatmodifiedby: userId,
              },
              {
                headers: {
                  "X-Module": "Training Management",
                  "X-Action": "Update Training Category Status",
                },
              },
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `Training category ${actionText}d successfully!`,
                  "success",
                );
                fetchCategories();
              } else {
                throw new Error(
                  response.data.message || `Failed to ${actionText} training category`,
                );
              }
            })
            .catch((err) => {
              console.error(`Error ${actionText}ing training category:`, err);
              Swal.fire(
                "Error",
                `Failed to ${actionText}: ${err.message}`,
                "error",
              );
            })
            .finally(() => {
              setIsToggling((prev) => ({ ...prev, [cat.trainingcatid]: false }));
            });
        }
      });
    },
    [userId, fetchCategories],
  );
  // ----------------------------------------------

  // Handle Delete
  const handleDelete = useCallback(
    (catId) => {
      Swal.fire({
        title: "Are you sure?",
        text: "This training category will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsDeleting((prev) => ({ ...prev, [catId]: true }));
          Swal.fire({
            title: "Deleting...",
            text: "Please wait while we delete the training category",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });
          // Use the api instance
          api
            .post(
              "/deleteTrainingCat", // The endpoint path
              {}, // Empty request body
              {
                params: {
                  trainingcatid: catId,
                  trainingcatmodifiedby: userId,
                },
                headers: {
                  "X-Module": "Training Management",
                  "X-Action": "Delete Training Category",
                },
              },
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Deleted!",
                  "Training category deleted successfully!",
                  "success",
                );
                fetchCategories();
              } else {
                throw new Error(
                  response.data.message || "Failed to delete training category",
                );
              }
            })
            .catch((err) => {
              console.error("Error deleting training category:", err);
              Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
            })
            .finally(() => {
              setIsDeleting((prev) => ({ ...prev, [catId]: false }));
            });
        }
      });
    },
    [userId, fetchCategories],
  );

  // Handle Submit (Add/Edit)
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setIsSaving(true);
      setError(null);
      if (
        !formData.trainingcatname.trim() ||
        !formData.trainingcatdescription.trim()
      ) {
        setError("Category name and description are required");
        setIsSaving(false);
        return;
      }
      setIsModalOpen(false);

      const isEdit = !!editCat;
      const endpoint = isEdit ? "/updateTrainingCat" : "/addTrainingCat";
      const action = isEdit
        ? "Edit Training Category"
        : "Add Training Category";

      // Use the api instance
      api
        .post(
          endpoint,
          {
            // Request body (will be encrypted)
            trainingcatname: formData.trainingcatname.trim(),
            trainingcatdescription: formData.trainingcatdescription.trim(),
            trainingcatadminstate: formData.trainingcatadminstate,
            ...(isEdit
              ? {
                  trainingcatid: editCat.trainingcatid,
                  trainingcatmodifiedby: userId,
                }
              : {
                  trainingcatcreatedby: userId,
                  trainingcatmodifiedby: userId,
                }),
          },
          {
            headers: {
              "X-Module": "Training Management",
              "X-Action": action,
            },
          },
        )
        .then((response) => {
          console.log("API response for save:", response);
          console.log("Decrypted response data:", response.data.statusCode, response.data.message);
          if (response.data.statusCode === 200) {
              setEditCat(null);
              setFormData({
                trainingcatname: "",
                trainingcatdescription: "",
                trainingcatadminstate: 1,
              });
              fetchCategories();
              Swal.fire(
                "Success",
                response.data.message ||
                  "Training category saved successfully!",
                "success",
              );
          } else {
            throw new Error(
              response.data.message ||
                `Operation failed with status: ${response.data.message}`,
            );
          }
        })
        .catch((err) => {
            console.error("Error saving training category:", err);

            if (err.response && err.response.status === 409) {
              Swal.fire(
                "Duplicate Entry",
                err.response.data.message || 
                "Training category already exists!",
                "warning"
              );

              return; // stop further execution
            }

            // Other errors
            Swal.fire(
              "Error",
              err.response?.data?.message || 
              "Failed to save training category!",
              "error"
            ).then(() => setIsModalOpen(true));
          })
        .finally(() => setIsSaving(false));
    },
    [formData, editCat, userId, fetchCategories],
  );

  // --- 3. MEMOIZED VALUES ---
  const columns = useMemo(
    () => [
      {
        field: "trainingcatname",
        headerName: "Category Name",
        width: 200,
        sortable: true,
      },
      {
        field: "trainingcatdescription",
        headerName: "Description",
        width: 300,
        sortable: true,
      },
      // {
      //   field: "trainingcatactivestate",
      //   headerName: "Status",
      //   width: 150,
      //   sortable: true,
      //   renderCell: (params) => {
      //     const value = params.value; // "Active" or "Inactive"
      //     const color = value === "Active" ? "green" : "red";

      //     return (
      //       <span style={{ fontWeight: 600, color }}>
      //         {value}
      //       </span>
      //     );
      //   },
      // },
      {
        field: "trainingcatcreatedby",
        headerName: "Created By",
        width: 150,
        sortable: true,
        renderCell: (params) =>
          params?.row
            ? isNaN(params.row.trainingcatcreatedby)
              ? params.row.trainingcatcreatedby
              : "Admin"
            : "Admin",
      },
      {
        field: "trainingcatcreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        field: "trainingcatmodifiedby",
        headerName: "Modified By",
        width: 150,
        sortable: true,
        renderCell: (params) =>
          params?.row
            ? isNaN(params.row.trainingcatmodifiedby)
              ? params.row.trainingcatmodifiedby
              : "Admin"
            : "Admin",
      },
      {
        field: "trainingcatmodifiedtime",
        headerName: "Modified Time",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      ...(hasWriteAccess // Conditionally add the actions column
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 200, // Increased width to accommodate 3 buttons
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                
                const isCurrentlyEnabled = params.row.trainingcatadminstate === 1;
                
                return (
                  <Box>
                    {/* Toggle Status Button (ON/OFF Icon) */}
                    {/* <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.trainingcatid] ||
                        isToggling[params.row.trainingcatid]
                      }
                      title={isCurrentlyEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling[params.row.trainingcatid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isCurrentlyEnabled ? (
                        <ToggleOnIcon fontSize="small" />
                      ) : (
                        <ToggleOffIcon fontSize="small" />
                      )}
                    </ActionButton> */}

                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      disabled={
                        isSaving || isDeleting[params.row.trainingcatid]
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
    ],
    [
      hasWriteAccess,
      isSaving,
      isDeleting,
      isToggling,
      openEditModal,
      handleDelete,
      handleToggleStatus,
    ],
  );

  const exportConfig = useMemo(
    () => ({
      filename: "training_categories",
      sheetName: "Training Categories",
    }),
    [],
  );
  const onExportData = useMemo(
    () => (data) =>
      data.map((cat, index) => ({
        "S.No": index + 1,
        "Category Name": cat.trainingcatname || "",
        Description: cat.trainingcatdescription || "",
        Status: cat.trainingcatadminstate === 1 ? "Active" : "Inactive",
        "Created By": isNaN(cat.trainingcatcreatedby)
          ? cat.trainingcatcreatedby
          : "Admin",
        "Created Time": formatDate(cat.trainingcatcreatedtime),
        "Modified By": isNaN(cat.trainingcatmodifiedby)
          ? cat.trainingcatmodifiedby
          : "Admin",
        "Modified Time": formatDate(cat.trainingcatmodifiedtime),
      })),
    [],
  );

  // --- 4. EFFECTS ---
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- 5. RENDER (JSX) ---
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
        <Typography variant="h4">🎓 Training Categories</Typography>
        {/* Conditionally render the "Add Category" button based on write access */}
        {hasWriteAccess && (
          <Button
            variant="contained"
            onClick={openAddModal}
            disabled={isSaving}
          >
            + Add Category
          </Button>
        )}
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
        data={cats}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search training categories..."
        searchFields={["trainingcatname", "trainingcatdescription"]}
        uniqueIdField="trainingcatid"
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
          {editCat ? "Edit Training Category" : "Add Training Category"}
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
            <TextField
              autoFocus
              margin="dense"
              name="trainingcatname"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.trainingcatname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="trainingcatdescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.trainingcatdescription}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            {error && <Box sx={{ color: "error.main", mt: 1 }}>{error}</Box>}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {editCat ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
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
              : editCat
              ? "Updating training category..."
              : "Saving training category..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}