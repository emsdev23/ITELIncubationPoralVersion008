import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import { IPAdress } from "../Datafetching/IPAdrees";

// Material UI imports
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
  TextField,
  Button,
  Backdrop,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import api from "../Datafetching/api";

// Styled components
const StyledChip = styled(Chip)(({ theme, status }) => {
  const getStatusColor = (status) => {
    return status === 1
      ? { backgroundColor: "#e8f5e9", color: "#2e7d32" }
      : { backgroundColor: "#ffebee", color: "#c62828" };
  };

  return {
    ...getStatusColor(status),
    fontWeight: 500,
    borderRadius: 4,
  };
});

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

export default function GroupApplicationDetails({
  groupId,
  groupName,
  token,
  userId,
  incUserid,
}) {
  const API_BASE_URL = IPAdress;

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [formData, setFormData] = useState({
    guiappsappname: "",
    guiappspath: "",
    guiappsappicon: "",
    guiappsadminstate: 1,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  const fetchApplications = async () => {
    if (!groupId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "/resources/generic/getapplicationdetails",
        {
          userId: userId || 1,
          incUserId: incUserid || 0,
          groupId: groupId.toString(),
        },
        {
          headers: {
            userid: userId || "1",
            "X-Module": "Application Management",
            "X-Action": "Fetching Application Details List",
          },
        },
      );
      if (response.data.statusCode === 200) {
        setApps(response.data.data || []);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch application details",
        );
      }
    } catch (err) {
      console.error("Error fetching application details:", err);
      setError("Failed to load application details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [groupId, token, userId, incUserid]);

  // --- Handlers for Modal ---
  const openAddModal = () => {
    setEditApp(null);
    setFormData({
      guiappsappname: "",
      guiappspath: "",
      guiappsappicon: "",
      guiappsadminstate: 1,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (app) => {
    setEditApp(app);
    setFormData({
      guiappsappname: app.guiappsappname || "",
      guiappspath: app.guiappspath || "",
      guiappsappicon: app.guiappsappicon || "",
      guiappsadminstate: app.guiappsadminstate || 1,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Handler for Delete ---
  const handleDelete = (appId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This application will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDeleting((prev) => ({ ...prev, [appId]: true }));
        Swal.fire({
          title: "Deleting...",
          text: "Please wait...",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        api
          .post(
            "/deleteGuiApps",
            {},
            {
              params: {
                guiappsrecid: appId,
                guiappsmodifiedby: userId || 1,
              },
              headers: {
                "X-Module": "Application Management",
                "X-Action": "Delete Application",
              },
            },
          )
          .then((response) => {
            if (response.data.statusCode === 200) {
              Swal.fire(
                "Deleted!",
                "Application deleted successfully!",
                "success",
              );
              fetchApplications();
            } else {
              throw new Error(response.data.message || "Failed to delete");
            }
          })
          .catch((err) => {
            console.error("Error deleting app:", err);
            Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
          })
          .finally(() => {
            setIsDeleting((prev) => ({ ...prev, [appId]: false }));
          });
      }
    });
  };

  // --- Handler for Submit (Add/Edit) ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (!formData.guiappsappname.trim() || !formData.guiappspath.trim()) {
      setError("App Name and Path are required");
      setIsSaving(false);
      return;
    }

    setIsModalOpen(false);

    const isEdit = !!editApp;
    const endpoint = isEdit ? "updateGuiApps" : "addGuiApps";
    const action = isEdit ? "Edit Application" : "Add Application";

    // Prepare params
    // Note: For Add, guiappsgrpid comes from the current component prop 'groupId'
    // For Edit, it usually stays in the same group, but we can send the existing or current groupId.
    // The API for edit takes guiappsgrpid as well.
    const params = {
      guiappsappname: formData.guiappsappname.trim(),
      guiappspath: formData.guiappspath.trim(),
      guiappsappicon: formData.guiappsappicon.trim(),
      guiappsadminstate: formData.guiappsadminstate,
      guiappsmodifiedby: userId || 1,
      // Include groupId for both add and edit to ensure association
      guiappsgrpid: groupId,
    };

    if (isEdit) {
      params.guiappsrecid = editApp.guiappsrecid;
    } else {
      params.guiappscreatedby = userId || 1;
    }

    api
      .post(
        endpoint,
        {},
        {
          params,
          headers: { "X-Module": "Application Management", "X-Action": action },
        },
      )
      .then((response) => {
        if (response.data.statusCode === 200) {
          if (
            response.data.data &&
            typeof response.data.data === "string" &&
            response.data.data.includes("Duplicate entry")
          ) {
            setError("Application name already exists");
            Swal.fire(
              "Duplicate",
              "Application name already exists!",
              "warning",
            ).then(() => setIsModalOpen(true));
          } else {
            setEditApp(null);
            setFormData({
              guiappsappname: "",
              guiappspath: "",
              guiappsappicon: "",
              guiappsadminstate: 1,
            });
            fetchApplications();
            Swal.fire(
              "Success",
              response.data.message || "Application saved successfully!",
              "success",
            );
          }
        } else {
          throw new Error(response.data.message || "Operation failed");
        }
      })
      .catch((err) => {
        console.error("Error saving app:", err);
        setError(`Failed to save: ${err.message}`);
        Swal.fire(
          "Error",
          `Failed to save application: ${err.message}`,
          "error",
        ).then(() => setIsModalOpen(true));
      })
      .finally(() => setIsSaving(false));
  };

  // Define columns for ReusableDataGrid
  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "S.No",
        width: 80,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.api || !params.row) return "1";
          const rowIndex = params.api.getRowIndexRelativeToVisibleRows(
            params.row.id,
          );
          const pageSize = params.api.state.pagination.pageSize;
          const currentPage = params.api.state.pagination.page;
          const validRowIndex = isNaN(rowIndex) ? 0 : rowIndex;
          const validPageSize = isNaN(pageSize) ? 10 : pageSize;
          const validCurrentPage = isNaN(currentPage) ? 0 : currentPage;
          return (
            validRowIndex +
            1 +
            validCurrentPage * validPageSize
          ).toString();
        },
      },
      {
        field: "guiappsappname",
        headerName: "App Name",
        width: 200,
        sortable: true,
      },
      {
        field: "guiappspath",
        headerName: "Path",
        width: 300,
        sortable: true,
        renderCell: (params) => (
          <Box
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
            title={params.value || ""}
          >
            {params.value || ""}
          </Box>
        ),
      },
      {
        field: "grpappsgroupname",
        headerName: "Group",
        width: 150,
        sortable: true,
      },
      {
        field: "guiappsadminstate",
        headerName: "State",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          return (
            <StyledChip
              label={params.value === 1 ? "Enabled" : "Disabled"}
              size="small"
              status={params.value}
            />
          );
        },
      },
      {
        field: "guiappscreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        renderCell: (params) => {
          return params.value?.replace("T", " ") || "-";
        },
      },
      {
        field: "guiappsmodifiedtime",
        headerName: "Modified Time",
        width: 180,
        sortable: true,
        renderCell: (params) => {
          return params.value?.replace("T", " ") || "-";
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
                disabled={isSaving || isDeleting[params.row.guiappsrecid]}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </ActionButton>
              <ActionButton
                color="delete"
                onClick={() => handleDelete(params.row.guiappsrecid)}
                disabled={isSaving || isDeleting[params.row.guiappsrecid]}
                title="Delete"
              >
                {isDeleting[params.row.guiappsrecid] ? (
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
    [isSaving, isDeleting],
  );

  // Custom export function
  const onExportData = (data) => {
    return data.map((item) => ({
      "App Name": item.guiappsappname || "",
      Path: item.guiappspath || "",
      Group: item.grpappsgroupname || "",
      State: item.guiappsadminstate === 1 ? "Enabled" : "Disabled",
      "Created Time": item.guiappscreatedtime?.replace("T", " ") || "",
      "Modified Time": item.guiappsmodifiedtime?.replace("T", " ") || "",
    }));
  };

  const exportConfig = {
    filename: `group_${groupName}_apps`,
    sheetName: "Applications",
  };

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">📱 Applications for: {groupName}</Typography>
        <Button variant="contained" onClick={openAddModal} disabled={isSaving}>
          + Add App
        </Button>
      </Box>

      {error && !isModalOpen && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}

      <ReusableDataGrid
        data={apps}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search by name or path..."
        searchFields={["guiappsappname", "guiappspath"]}
        uniqueIdField="guiappsrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        className="group-applications-grid"
      />

      {/* Add/Edit Dialog */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editApp ? "Edit Application" : "Add Application to " + groupName}
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
              name="guiappsappname"
              label="App Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.guiappsappname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="guiappspath"
              label="Path"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.guiappspath}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="guiappsappicon"
              label="Icon Path"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.guiappsappicon}
              onChange={handleChange}
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth margin="dense" disabled={isSaving}>
              <InputLabel>Admin State</InputLabel>
              <Select
                name="guiappsadminstate"
                value={formData.guiappsadminstate}
                onChange={handleChange}
                label="Admin State"
              >
                <MenuItem value={1}>Enabled</MenuItem>
                <MenuItem value={0}>Disabled</MenuItem>
              </Select>
            </FormControl>
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
              {editApp ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Backdrop */}
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
            {editApp ? "Updating application..." : "Saving application..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
