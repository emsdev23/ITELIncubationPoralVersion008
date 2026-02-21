import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import GroupApplicationDetails from "./GroupApplicationDetails";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";

// Material UI imports
import {
  Box,
  Typography,
  Button,
  Chip,
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

export default function GroupDetailsTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for detail view
  const [selectedGroup, setSelectedGroup] = useState({ id: null, name: "" });

  // State for Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [formData, setFormData] = useState({
    grpappsgroupname: "",
    grpappsdescription: "",
    grpappsadminstate: 1,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState({});

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  const fetchGroups = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "resources/generic/getgroupdetails",
        {
          userId: userId || 1,
          userIncId: incUserid || 0,
          groupId: "ALL",
        },
        {
          headers: {
            userid: userId || "1",
            "X-Module": "Application Management",
            "X-Action": "Fetching Application Group Details",
          },
        },
      );
      if (response.data.statusCode === 200) {
        setGroups(response.data.data || []);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch group details",
        );
      }
    } catch (err) {
      console.error("Error fetching group details:", err);
      setError("Failed to load group details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // --- Handlers for Modal ---
  const openAddModal = () => {
    setEditGroup(null);
    setFormData({
      grpappsgroupname: "",
      grpappsdescription: "",
      grpappsadminstate: 1,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const openEditModal = (group) => {
    setEditGroup(group);
    setFormData({
      grpappsgroupname: group.grpappsgroupname || "",
      grpappsdescription: group.grpappsdescription || "",
      grpappsadminstate: group.grpappsadminstate || 1,
    });
    setIsModalOpen(true);
    setError(null);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Handler for Detail View ---
  const handleGroupClick = (group) => {
    setSelectedGroup({ id: group.grpappsrecid, name: group.grpappsgroupname });
  };

  // --- Handler for Delete ---
  const handleDelete = (groupId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This group will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDeleting((prev) => ({ ...prev, [groupId]: true }));
        Swal.fire({
          title: "Deleting...",
          text: "Please wait while we delete the group",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        api
          .post(
            "itelinc/deleteGrpApps",
            {}, // Empty body
            {
              params: {
                grpappsrecid: groupId,
                grpappsmodifiedby: userId || 1,
              },
              headers: {
                "X-Module": "Application Management",
                "X-Action": "Delete Group",
              },
            },
          )
          .then((response) => {
            if (response.data.statusCode === 200) {
              Swal.fire("Deleted!", "Group deleted successfully!", "success");
              // Clear details view if the deleted group was selected
              if (selectedGroup.id === groupId) {
                setSelectedGroup({ id: null, name: "" });
              }
              fetchGroups();
            } else {
              throw new Error(
                response.data.message || "Failed to delete group",
              );
            }
          })
          .catch((err) => {
            console.error("Error deleting group:", err);
            Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
          })
          .finally(() => {
            setIsDeleting((prev) => ({ ...prev, [groupId]: false }));
          });
      }
    });
  };

  // --- Handler for Submit (Add/Edit) ---
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    if (
      !formData.grpappsgroupname.trim() ||
      !formData.grpappsdescription.trim()
    ) {
      setError("Group name and description are required");
      setIsSaving(false);
      return;
    }

    setIsModalOpen(false); // Close modal immediately to show loading state

    const isEdit = !!editGroup;
    const endpoint = isEdit ? "itelinc/updateGrpApps" : "itelinc/addGrpApps";
    const module = "Application Management";
    const action = isEdit ? "Edit Group" : "Add Group";

    api
      .post(
        endpoint,
        {}, // Empty body
        {
          params: {
            ...(isEdit && { grpappsrecid: editGroup.grpappsrecid }),
            grpappsgroupname: formData.grpappsgroupname.trim(),
            grpappsdescription: formData.grpappsdescription.trim(),
            grpappsadminstate: formData.grpappsadminstate,
            grpappscreatedby: isEdit ? undefined : userId || 1,
            grpappsmodifiedby: userId || 1,
          },
          headers: {
            "X-Module": module,
            "X-Action": action,
          },
        },
      )
      .then((response) => {
        if (response.data.statusCode === 200) {
          // Check for duplicate entry message if your API returns 200 for duplicates
          if (
            response.data.data &&
            typeof response.data.data === "string" &&
            response.data.data.includes("Duplicate entry")
          ) {
            setError("Group name already exists");
            Swal.fire(
              "Duplicate",
              "Group name already exists!",
              "warning",
            ).then(() => setIsModalOpen(true));
          } else {
            setEditGroup(null);
            setFormData({
              grpappsgroupname: "",
              grpappsdescription: "",
              grpappsadminstate: 1,
            });
            fetchGroups();
            Swal.fire(
              "Success",
              response.data.message || "Group saved successfully!",
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
        console.error("Error saving group:", err);
        setError(`Failed to save: ${err.message}`);
        Swal.fire(
          "Error",
          `Failed to save group: ${err.message}`,
          "error",
        ).then(() => setIsModalOpen(true));
      })
      .finally(() => setIsSaving(false));
  };

  // Define columns
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
        field: "grpappsgroupname",
        headerName: "Group Name",
        width: 200,
        sortable: true,
        renderCell: (params) => {
          return (
            <Button
              variant="text"
              color="primary"
              onClick={() => handleGroupClick(params.row)}
              sx={{ justifyContent: "flex-start", textTransform: "none" }}
            >
              {params.row.grpappsgroupname || ""}
            </Button>
          );
        },
      },
      {
        field: "grpappsdescription",
        headerName: "Description",
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
        field: "grpappsadminstate",
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
        field: "grpappscreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        renderCell: (params) => {
          return params.value?.replace("T", " ") || "-";
        },
      },
      {
        field: "grpappsmodifiedtime",
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
                disabled={isSaving || isDeleting[params.row.grpappsrecid]}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </ActionButton>
              <ActionButton
                color="delete"
                onClick={() => handleDelete(params.row.grpappsrecid)}
                disabled={isSaving || isDeleting[params.row.grpappsrecid]}
                title="Delete"
              >
                {isDeleting[params.row.grpappsrecid] ? (
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
      "Group Name": item.grpappsgroupname || "",
      Description: item.grpappsdescription || "",
      State: item.grpappsadminstate === 1 ? "Enabled" : "Disabled",
      "Created Time": item.grpappscreatedtime?.replace("T", " ") || "",
      "Modified Time": item.grpappsmodifiedtime?.replace("T", " ") || "",
    }));
  };

  const exportConfig = {
    filename: "application_groups",
    sheetName: "Application Groups",
  };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">📋 Application Group Details</Typography>
        <Button variant="contained" onClick={openAddModal} disabled={isSaving}>
          + Add Group
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
        data={groups}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search by name or description..."
        searchFields={["grpappsgroupname", "grpappsdescription"]}
        uniqueIdField="grpappsrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        className="group-details-table"
      />

      {/* Detail View Section */}
      {selectedGroup.id && (
        <Box sx={{ mt: 3 }}>
          <GroupApplicationDetails
            groupId={selectedGroup.id}
            groupName={selectedGroup.name}
            token={token}
            userId={userId}
            incUserid={incUserid}
          />
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editGroup ? "Edit Group" : "Add Group"}
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
              name="grpappsgroupname"
              label="Group Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.grpappsgroupname}
              onChange={handleChange}
              required
              disabled={isSaving}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="grpappsdescription"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.grpappsdescription}
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
              {editGroup ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Backdrop for loading states */}
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
            {editGroup ? "Updating group..." : "Saving group..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
