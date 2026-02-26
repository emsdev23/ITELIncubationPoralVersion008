import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import { FaTimes, FaPowerOff } from "react-icons/fa";
import { DataContext } from "../Datafetching/DataProvider";
import { useWriteAccess } from "../Datafetching/useWriteAccess";

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
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ToggleOnIcon from "@mui/icons-material/ToggleOn"; // ON Icon
import ToggleOffIcon from "@mui/icons-material/ToggleOff"; // OFF Icon
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Status Active
import CancelIcon from "@mui/icons-material/Cancel"; // Status Inactive

// Import your reusable component and API instance
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import api from "../Datafetching/api";

// Styled components
const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

// UPDATED: Styled ActionButton to support "on" (Green) and "off" (Grey) like TrainingModule
const ActionButton = styled(IconButton)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  backgroundColor:
    color === "edit"
      ? theme.palette.primary.main
      : color === "on" // Active/Enabled State -> Green
      ? theme.palette.success.main
      : color === "off" // Inactive/Disabled State -> Grey
      ? theme.palette.grey[500]
      : color === "delete" // Delete -> Red
      ? theme.palette.error.main
      : theme.palette.error.main, // Fallback
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit"
        ? theme.palette.primary.dark
        : color === "on"
        ? theme.palette.success.dark
        : color === "off"
        ? theme.palette.grey[700] // Grey Hover
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

export default function DocCatTable() {
  const { menuItemsFromAPI } = useContext(DataContext);

  // Find the current path in menu items to check write access
  const currentPath = "/Incubation/Dashboard/AddDocuments";
  const menuItem = menuItemsFromAPI.find(
    (item) => item.guiappspath === currentPath
  );

  const hasWriteAccess = useWriteAccess(
      "/Incubation/Dashboard/AddDocuments"
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
    doccatname: "",
    doccatdescription: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(null); // Tracks which ID is being toggled

  // --- 2. HANDLER FUNCTIONS ---

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/getDoccatAll?incuserid=${incUserid}`, {
        headers: {
          "X-Module": "Document Management",
          "X-Action": "Fetch Document Categories",
        },
      });

      setCats(response.data.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [incUserid]);

  const openAddModal = useCallback(() => {
    setEditCat(null);
    setFormData({ doccatname: "", doccatdescription: "" });
    setIsModalOpen(true);
    setError(null);
  }, []);

  const openEditModal = useCallback(
    (cat) => {
      // Prevent editing if the category is disabled
      // if (cat.doccatadminstate === 0) {
      //   Swal.fire(
      //     "Restricted",
      //     "Cannot edit a disabled category. Please enable it first.",
      //     "warning"
      //   );
      //   return;
      // }

      setEditCat(cat);
      setFormData({
        doccatname: cat.doccatname || "",
        doccatdescription: cat.doccatdescription || "",
      });
      setIsModalOpen(true);
      setError(null);
    },
    []
  );

  const handleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }, []);

  // --- NEW: Handle Toggle Status (Enable/Disable) ---
  const handleToggleStatus = useCallback(
    (cat) => {
      const isCurrentlyEnabled = cat.doccatadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} ${cat.doccatname}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isCurrentlyEnabled ? "#d33" : "#3085d6",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText} it!`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsToggling(cat.doccatrecid);

          // Payload structure mirroring the Edit submit logic
          const bodyPayload = {
            doccatrecid: cat.doccatrecid,
            doccatname: cat.doccatname,
            doccatdescription: cat.doccatdescription,
            doccatadminstate: newState.toString(), // 1 or 0
            doccatmodifiedby: userId,
          };

          api
            .post("/updateDoccat", bodyPayload, {
              headers: {
                "X-Module": "Document Management",
                "X-Action": "Update Document Category Status",
              },
            })
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `${cat.doccatname} has been ${actionText}d.`,
                  "success"
                );
                fetchCategories();
              } else {
                throw new Error(
                  response.data.message || `Failed to ${actionText} category`
                );
              }
            })
            .catch((err) => {
              console.error(`Error ${actionText}ing category:`, err);
              Swal.fire(
                "Error",
                `Failed to ${actionText} ${cat.doccatname}: ${err.message}`,
                "error"
              );
            })
            .finally(() => {
              setIsToggling(null);
            });
        }
      });
    },
    [userId, fetchCategories]
  );

  const handleDelete = useCallback(
    (catId) => {
      Swal.fire({
        title: "Are you sure?",
        text: "This category will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsDeleting((prev) => ({ ...prev, [catId]: true }));
          Swal.fire({
            title: "Deleting...",
            text: "Please wait while we delete the category",
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
          });
          api
            .post(
              "/deletedoccat",
              {},
              {
                params: {
                  doccatrecid: catId,
                  doccatmodifiedby: userId,
                },
                headers: {
                  "X-Module": "Document Management",
                  "X-Action": "Delete Document Category",
                },
              }
            )
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire("Deleted!", "Category deleted successfully!", "success");
                fetchCategories();
              } else {
                throw new Error(
                  response.data.message || "Failed to delete category"
                );
              }
            })
            .catch((err) => {
              console.error("Error deleting category:", err);
              Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
            })
            .finally(() => {
              setIsDeleting((prev) => ({ ...prev, [catId]: false }));
            });
        }
      });
    },
    [userId, fetchCategories]
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      setIsSaving(true);
      setError(null);
      if (!formData.doccatname.trim() || !formData.doccatdescription.trim()) {
        setError("Category name and description are required");
        setIsSaving(false);
        return;
      }
      setIsModalOpen(false);

      const isEdit = !!editCat;
      const endpoint = isEdit ? "/updateDoccat" : "/addDoccat";
      const action = isEdit
        ? "Edit Document Category"
        : "Add Document Category";

      api
        .post(
          endpoint,
          {
            doccatname: formData.doccatname.trim(),
            doccatdescription: formData.doccatdescription.trim(),
            ...(isEdit
              ? { doccatrecid: editCat.doccatrecid, doccatmodifiedby: userId }
              : { doccatcreatedby: userId, doccatmodifiedby: userId }),
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": action,
            },
          }
        )
        .then((response) => {
          if (response.data.statusCode === 200) {
            if (
              response.data.data &&
              typeof response.data.data === "string" &&
              response.data.data.includes("Duplicate entry")
            ) {
              setError("Category name already exists");
              Swal.fire(
                "Duplicate",
                "Category name already exists!",
                "warning"
              ).then(() => setIsModalOpen(true));
            } else {
              setEditCat(null);
              setFormData({ doccatname: "", doccatdescription: "" });
              fetchCategories();
              Swal.fire(
                "Success",
                response.data.message || "Category saved successfully!",
                "success"
              );
            }
          } else {
            throw new Error(
              response.data.message ||
                `Operation failed with status: ${response.data.statusCode}`
            );
          }
        })
        .catch((err) => {
          console.error("Error saving category:", err);
          setError(`Failed to save: ${err.message}`);
          Swal.fire(
            "Error",
            `Failed to save category: ${err.message}`,
            "error"
          ).then(() => setIsModalOpen(true));
        })
        .finally(() => setIsSaving(false));
    },
    [formData, editCat, userId, fetchCategories]
  );

  // --- 3. MEMOIZED VALUES ---
  const columns = useMemo(
    () => [
      {
        field: "doccatname",
        headerName: "Category Name",
        width: 200,
        sortable: true,
      },
      {
        field: "doccatdescription",
        headerName: "Description",
        width: 300,
        sortable: true,
      },
      // {
      //   field: "doccatadminstate",
      //   headerName: "Status",
      //   width: 120,
      //   sortable: true,
      //   renderCell: (params) => {
      //     if (!params?.row) return "-";
      //     const status = params.row.doccatadminstate;
      //     const isActive = status === 1 || status === undefined;

      //     return (
      //       <Box sx={{ display: "flex", alignItems: "center" }}>
      //         <IconButton
      //           size="small"
      //           sx={{
      //             mr: 0.5,
      //             color: isActive ? "success.main" : "error.main",
      //             cursor: "default",
      //           }}
      //         >
      //           {isActive ? <CheckCircleIcon fontSize="small" /> : <CancelIcon fontSize="small" />}
      //         </IconButton>
      //         <Typography variant="body2" sx={{ fontWeight: 500 }}>
      //           {isActive ? "Active" : "Inactive"}
      //         </Typography>
      //       </Box>
      //     );
      //   },
      // },
      {
        field: "doccatcreatedby",
        headerName: "Created By",
        width: 150,
        sortable: true,
        renderCell: (params) =>
          params?.row
            ? isNaN(params.row.doccatcreatedby)
              ? params.row.doccatcreatedby
              : "Admin"
            : "Admin",
      },
      {
        field: "doccatcreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        type: "date",
        valueGetter: (params) => {
           if (!params || !params.row) return null;
           return formatDate(params.row.doccatcreatedtime);
        }
      },
      {
        field: "doccatmodifiedby",
        headerName: "Modified By",
        width: 150,
        sortable: true,
        renderCell: (params) =>
          params?.row
            ? isNaN(params.row.doccatmodifiedby)
              ? params.row.doccatmodifiedby
              : "Admin"
            : "Admin",
      },
      {
        field: "doccatmodifiedtime",
        headerName: "Modified Time",
        width: 180,
        sortable: true,
        type: "date",
        valueGetter: (params) => {
            if (!params || !params.row) return null;
            return formatDate(params.row.doccatmodifiedtime);
         }
      },
      ...(hasWriteAccess
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 180, // Increased width to accommodate 3 buttons
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                const isDisabled = params.row.doccatadminstate === 0;
                const isCurrentlyEnabled = params.row.doccatadminstate === 1;

                return (
                  <Box>
                    {/* Toggle Status Button */}
                    {/* <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isSaving ||
                        isDeleting[params.row.doccatrecid] || // Fixed typo here
                        isToggling === params.row.doccatrecid
                      }
                      title={isCurrentlyEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling === params.row.doccatrecid ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isCurrentlyEnabled ? (
                        <ToggleOnIcon fontSize="small" />
                      ) : (
                        <ToggleOffIcon fontSize="small" />
                      )}
                    </ActionButton> */}

                    {/* Edit Button */}
                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      // disabled={
                      //   isSaving ||
                      //   isDeleting[params.row.doccatrecid] ||
                      //   isDisabled || // Disabled if state is 0
                      //   isToggling === params.row.doccatrecid
                      // }
                      title="Edit"
                      // className={isDisabled ? "disabled" : ""}
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
    [hasWriteAccess, isSaving, isDeleting, isToggling, openEditModal, handleDelete, handleToggleStatus]
  );

  const exportConfig = useMemo(
    () => ({
      filename: "document_categories",
      sheetName: "Document Categories",
    }),
    []
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((cat, index) => ({
        "S.No": index + 1,
        "Category Name": cat.doccatname || "",
        Description: cat.doccatdescription || "",
        Status: cat.doccatadminstate === 1 ? "Enabled" : "Disabled",
        "Created By": isNaN(cat.doccatcreatedby)
          ? cat.doccatcreatedby
          : "Admin",
        "Created Time": formatDate(cat.doccatcreatedtime),
        "Modified By": isNaN(cat.doccatmodifiedby)
          ? cat.doccatmodifiedby
          : "Admin",
        "Modified Time": formatDate(cat.doccatmodifiedtime),
      })),
    []
  );

  // --- 4. EFFECTS ---
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // --- 5. RENDER ---
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
        <Typography variant="h4">📂 Document Categories</Typography>
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
        title="Document Categories"
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search categories..."
        searchFields={["doccatname", "doccatdescription"]}
        uniqueIdField="doccatrecid"
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
          {editCat ? "Edit Category" : "Add Category"}
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
              name="doccatname"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.doccatname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="doccatdescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.doccatdescription}
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
              {editCat ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <StyledBackdrop open={isSaving || isToggling !== null}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {isToggling !== null
              ? "Updating status..."
              : editCat
              ? "Updating category..."
              : "Saving category..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}