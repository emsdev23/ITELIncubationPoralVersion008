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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ToggleOnIcon from "@mui/icons-material/ToggleOn"; // ON Icon
import ToggleOffIcon from "@mui/icons-material/ToggleOff"; // OFF Icon
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Status Active
import CancelIcon from "@mui/icons-material/Cancel"; // Status Inactive
import api from "../Datafetching/api";

// Import your reusable component
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
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

// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
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

export default function TrainingSubCatTable() {
  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/TrainingManagementPage"
  );

  // --- 1. STATE DECLARATIONS ---
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token"); // Kept for reference if needed elsewhere, though api handles auth
  const incUserid = sessionStorage.getItem("incuserid");

  const [trainingSubcats, setTrainingSubcats] = useState([]);
  const [trainingCats, setTrainingCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSubCat, setEditSubCat] = useState(null);
  const [formData, setFormData] = useState({
    trainingsubcatname: "",
    trainingsubcatdescription: "",
    trainingsubcatcatid: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState({}); // State for Toggle Status

  // --- 2. HANDLER FUNCTIONS ---
  const fetchTrainingSubCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        `/resources/generic/gettrainingsubcatlist`,
        {
          userId: parseInt(userId, 10) || 1,
          userIncId: "ALL",
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Fetch Training SubCategories",
          },
        }
      );

      setTrainingSubcats(response.data.data || []);
    } catch (err) {
      console.error("Error fetching training subcategories:", err);
      setError("Failed to load subcategories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTrainingCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        `/resources/generic/gettrainingcatlist`,
        {
          userId: parseInt(userId, 10) || 1,
          userIncId: "ALL",
        },
        {
          headers: {
            "X-Module": "Training Management",
            "X-Action": "Fetch Training Categories",
          },
        }
      );

      const filteredCategories = (response.data.data || []).filter(
        (item) => item.trainingcatadminstate === 1
      );

      setTrainingCats(filteredCategories);
    } catch (err) {
      console.error("Error fetching training categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshData = useCallback(() => {
    fetchTrainingSubCategories();
    fetchTrainingCategories();
  }, [fetchTrainingSubCategories, fetchTrainingCategories]);

  const openAddModal = useCallback(() => {
    setEditSubCat(null);
    setFormData({
      trainingsubcatname: "",
      trainingsubcatdescription: "",
      trainingsubcatcatid: "",
    });
    fetchTrainingCategories();
    setIsModalOpen(true);
    setError(null);
  }, [fetchTrainingCategories]);

  const openEditModal = useCallback(
    (subcat) => {
      setEditSubCat(subcat);
      setFormData({
        trainingsubcatname: subcat.trainingsubcatname || "",
        trainingsubcatdescription: subcat.trainingsubcatdescription || "",
        trainingsubcatcatid: subcat.trainingsubcatcatid || "",
      });
      fetchTrainingCategories();
      setIsModalOpen(true);
      setError(null);
    },
    [fetchTrainingCategories]
  );

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  // --- Handle Toggle Status (Enable/Disable) ---
  const handleToggleStatus = useCallback(
    (subcat) => {
      const isCurrentlyEnabled = subcat.trainingsubcatadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} this subcategory?`,
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
            [subcat.trainingsubcatid]: true,
          }));

          // API call using api.post
          api
            .post(
              "/updateTrainingSubCat",
              {
                trainingsubcatid: subcat.trainingsubcatid,
                trainingsubcatname: subcat.trainingsubcatname,
                trainingsubcatdescription: subcat.trainingsubcatdescription,
                trainingsubcatcatid: subcat.trainingsubcatcatid,
                trainingsubcatadminstate: newState,
                trainingsubcatmodifiedby: userId,
              },
              {
                headers: {
                  "X-Module": "Training Management",
                  "X-Action": "Update Training SubCategory Status",
                },
              }
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `Subcategory ${actionText}d successfully!`,
                  "success"
                );
                refreshData();
              } else {
                throw new Error(
                  response.data.message || `Failed to ${actionText} subcategory`
                );
              }
            })
            .catch((err) => {
              console.error(`Error ${actionText}ing subcategory:`, err);
              Swal.fire(
                "Error",
                `Failed to ${actionText}: ${err.message}`,
                "error"
              );
            })
            .finally(() => {
              setIsToggling((prev) => ({
                ...prev,
                [subcat.trainingsubcatid]: false,
              }));
            });
        }
      });
    },
    [userId, refreshData]
  );
  // ----------------------------------------------

  const handleDelete = useCallback(
    (subcatId) => {
      Swal.fire({
        title: "Are you sure?",
        text: "This training subcategory will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsDeleting((prev) => ({ ...prev, [subcatId]: true }));
          Swal.fire({
            title: "Deleting...",
            text: "Please wait while we delete subcategory",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });

          // API call using api.post
          api
            .post(
              "/deleteTrainingSubCat",
              {}, // Empty body
              {
                params: {
                  trainingsubcatid: subcatId,
                  trainingsubcatmodifiedby: userId,
                },
                headers: {
                  "X-Module": "Training Management",
                  "X-Action": "Delete Training SubCategory",
                },
              }
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Deleted!",
                  "Subcategory deleted successfully!",
                  "success"
                );
                refreshData();
              } else {
                throw new Error(
                  response.data.message || "Failed to delete subcategory"
                );
              }
            })
            .catch((err) => {
              console.error("Error deleting subcategory:", err);
              Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
            })
            .finally(() => {
              setIsDeleting((prev) => ({ ...prev, [subcatId]: false }));
            });
        }
      });
    },
    [userId, refreshData]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setIsSaving(true);
      setError(null);

      if (
        !formData.trainingsubcatname.trim() ||
        !formData.trainingsubcatdescription.trim() ||
        !formData.trainingsubcatcatid
      ) {
        setError("All fields are required");
        setIsSaving(false);
        return;
      }

      setIsModalOpen(false);

      const isEdit = !!editSubCat;
      const endpoint = isEdit ? "/updateTrainingSubCat" : "/addTrainingSubCat";
      const action = isEdit
        ? "Edit Training SubCategory"
        : "Add Training SubCategory";

      const payload = {
        trainingsubcatname: formData.trainingsubcatname.trim(),
        trainingsubcatdescription: formData.trainingsubcatdescription.trim(),
        trainingsubcatcatid: formData.trainingsubcatcatid,
        trainingsubcatadminstate: "1", // Defaulting to 1
        ...(isEdit
          ? {
              trainingsubcatid: editSubCat.trainingsubcatid,
              trainingsubcatmodifiedby: userId,
            }
          : {
              trainingsubcatcreatedby: userId,
              trainingsubcatmodifiedby: userId,
            }),
      };

      // API call using api.post
      api
        .post(endpoint, payload, {
          headers: {
            "X-Module": "Training Management",
            "X-Action": action,
          },
        })
        .then((response) => {
          if (response.data.statusCode === 200) {
            setEditSubCat(null);
            setFormData({
              trainingsubcatname: "",
              trainingsubcatdescription: "",
              trainingsubcatcatid: "",
            });
            refreshData();
            Swal.fire(
              "Success",
              response.data.message || "Subcategory saved successfully!",
              "success"
            );
          } else {
            throw new Error(
              response.data.message ||
                `Operation failed with status: ${response.data.statusCode}`
            );
          }
        })
        .catch((err) => {
          console.error("Error saving training subcategory:", err);
          if (err.response && err.response.status === 409) {
            Swal.fire(
              "Duplicate Entry",
              err.response.data.message ||
                "Subcategory name already exists for this category!",
              "warning"
            ).then(() => setIsModalOpen(true));
            return;
          }

          if (err.message && err.message.includes("409")) {
            Swal.fire(
              "Duplicate Entry",
              "Subcategory name already exists for this category!",
              "warning"
            ).then(() => setIsModalOpen(true));
            return;
          }

          Swal.fire(
            "Error",
            err.response?.data?.message ||
              "Failed to save training subcategory!",
            "error"
          ).then(() => setIsModalOpen(true));
        })
        .finally(() => setIsSaving(false));
    },
    [formData, editSubCat, userId, refreshData]
  );

  // --- 3. MEMOIZED VALUES ---
  const columns = useMemo(
    () => [
      {
        field: "trainingcatname",
        headerName: "Category",
        width: 180,
        sortable: true,
        renderCell: (params) =>
          params?.row ? params.row.trainingcatname || "N/A" : "N/A",
      },
      {
        field: "trainingsubcatname",
        headerName: "Subcategory Name",
        width: 200,
        sortable: true,
      },
      {
        field: "trainingsubcatdescription",
        headerName: "Description",
        width: 250,
        sortable: true,
      },
      {
        field: "trainingsubcatcreatedby",
        headerName: "Created By",
        width: 150,
        sortable: true,
        renderCell: (params) =>
          params?.row
            ? isNaN(params.row.trainingsubcatcreatedby)
              ? params.row.trainingsubcatcreatedby
              : "Admin"
            : "Admin",
      },
      {
        field: "trainingsubcatcreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      {
        field: "trainingsubcatmodifiedby",
        headerName: "Modified By",
        width: 150,
        sortable: true,
        renderCell: (params) =>
          params?.row
            ? isNaN(params.row.trainingsubcatmodifiedby)
              ? params.row.trainingsubcatmodifiedby
              : "Admin"
            : "Admin",
      },
      {
        field: "trainingsubcatmodifiedtime",
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
              width: 200, // Increased width to accommodate 3 buttons
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;

                const isCurrentlyEnabled =
                  params.row.trainingsubcatadminstate === 1;

                return (
                  <Box>
                    {/* Toggle Status Button */}
                    {/* <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.trainingsubcatid] ||
                        isToggling[params.row.trainingsubcatid]
                      }
                      title={isCurrentlyEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling[params.row.trainingsubcatid] ? (
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
                        isSaving || isDeleting[params.row.trainingsubcatid]
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
    ]
  );

  const exportConfig = useMemo(
    () => ({
      filename: "training_subcategories",
      sheetName: "Training Subcategories",
    }),
    []
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((subcat, index) => ({
        "S.No": index + 1,
        Category: subcat.trainingcatname || "N/A",
        "Subcategory Name": subcat.trainingsubcatname || "",
        Description: subcat.trainingsubcatdescription || "",
        Status:
          subcat.trainingsubcatadminstate === 1 ? "Active" : "Inactive",
        "Created By": isNaN(subcat.trainingsubcatcreatedby)
          ? subcat.trainingsubcatcreatedby
          : "Admin",
        "Created Time": formatDate(subcat.trainingsubcatcreatedtime),
        "Modified By": isNaN(subcat.trainingsubcatmodifiedby)
          ? subcat.trainingsubcatmodifiedby
          : "Admin",
        "Modified Time": formatDate(subcat.trainingsubcatmodifiedtime),
      })),
    []
  );

  // --- 4. EFFECTS ---
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
        <Typography variant="h4">🎓 Training Subcategories</Typography>
        {hasWriteAccess && (
          <Button variant="contained" onClick={openAddModal} disabled={isSaving}>
            + Add Subcategory
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
        data={trainingSubcats}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search subcategories..."
        searchFields={[
          "trainingcatname",
          "trainingsubcatname",
          "trainingsubcatdescription",
        ]}
        uniqueIdField="trainingsubcatid"
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
          {editSubCat ? "Edit Subcategory" : "Add Subcategory"}
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
            <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
              <InputLabel id="category-select-label">Category *</InputLabel>
              <Select
                labelId="category-select-label"
                name="trainingsubcatcatid"
                value={formData.trainingsubcatcatid}
                onChange={handleChange}
                required
                disabled={isSaving}
                label="Category *"
              >
                <MenuItem value="">Select Category</MenuItem>
                {trainingCats.map((cat) => (
                  <MenuItem key={cat.trainingcatid} value={cat.trainingcatid}>
                    {cat.trainingcatname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              autoFocus
              margin="dense"
              name="trainingsubcatname"
              label="Subcategory Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.trainingsubcatname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="trainingsubcatdescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.trainingsubcatdescription}
              onChange={handleChange}
              required
              disabled={isSaving}
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
              {editSubCat ? "Update" : "Save"}
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
              : editSubCat
              ? "Updating subcategory..."
              : "Saving subcategory..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}