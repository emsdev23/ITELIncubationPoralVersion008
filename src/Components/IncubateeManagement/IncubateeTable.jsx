import React, { useEffect, useState, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import {
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Chip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import api from "../Datafetching/api";
import IncubateeForm from "./IncubateeForm";

// ─── Styled ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr.replace("?", " "));
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return dateStr;
  }
};

// ─── IncubateeTable ───────────────────────────────────────────────────────────

export default function IncubateeTable() {
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");

  // ── State ─────────────────────────────────────────────────────────────────
  const [incubatees, setIncubatees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editIncubatee, setEditIncubatee] = useState(null);

  const [isDeleting, setIsDeleting] = useState({});

  const [fieldOfWorkOptions, setFieldOfWorkOptions] = useState([]);
  const [stageLevelOptions, setStageLevelOptions] = useState([]);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ── Fetch dropdown options ────────────────────────────────────────────────
  const fetchDropdownOptions = useCallback(() => {
    const headers = { "X-Module": "Incubatee Management" };
    const body = { userId: parseInt(userId) || 1, userIncId: incUserid };

    api
      .post("/resources/generic/getincfield", body, {
        headers: { ...headers, "X-Action": "Fetch Field of Work Options" },
      })
      .then((res) => {
        if (res.data.statusCode === 200)
          setFieldOfWorkOptions(res.data.data || []);
      })
      .catch(console.error);

    api
      .post("/resources/generic/getincstage", body, {
        headers: { ...headers, "X-Action": "Fetch Stage Level Options" },
      })
      .then((res) => {
        if (res.data.statusCode === 200)
          setStageLevelOptions(res.data.data || []);
      })
      .catch(console.error);
  }, [userId, incUserid]);

  // ── Fetch table data ──────────────────────────────────────────────────────
  const fetchIncubatees = useCallback(() => {
    setLoading(true);
    setPageError(null);
    api
      .post(
        "/resources/generic/getincubatee",
        { userId: parseInt(userId) || 1, userIncId: incUserid },
        {
          headers: {
            "X-Module": "Incubatee Management",
            "X-Action": "Fetch Incubatees",
          },
        },
      )
      .then((res) => {
        setIncubatees(res.data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPageError("Failed to load incubatees. Please try again.");
        setLoading(false);
      });
  }, [userId, incUserid]);

  useEffect(() => {
    fetchIncubatees();
    fetchDropdownOptions();
  }, [fetchIncubatees, fetchDropdownOptions]);

  // ── Modal handlers ────────────────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    setEditIncubatee(null);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((row) => {
    setEditIncubatee(row);
    setIsModalOpen(true);
  }, []);

  // Called by IncubateeForm on successful save
  const handleSaveSuccess = useCallback(
    (message) => {
      fetchIncubatees();
      setToast({ open: true, message, severity: "success" });
    },
    [fetchIncubatees],
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(
    (incubateeId) => {
      Swal.fire({
        title: "Are you sure?",
        text: "This incubatee will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (!result.isConfirmed) return;

        setIsDeleting((prev) => ({ ...prev, [incubateeId]: true }));
        Swal.fire({
          title: "Deleting...",
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => Swal.showLoading(),
        });

        api
          .post(
            "/deleteIncubatee",
            {},
            {
              params: {
                incubateesrecid: incubateeId,
                incubateesmodifiedby: userId || 1,
              },
              headers: {
                "X-Module": "Incubatee Management",
                "X-Action": "Delete Incubatee",
              },
            },
          )
          .then((res) => {
            if (res.data.statusCode === 200) {
              Swal.fire(
                "Deleted!",
                "Incubatee deleted successfully!",
                "success",
              );
              fetchIncubatees();
            } else {
              throw new Error(res.data.message || "Failed to delete");
            }
          })
          .catch((err) => {
            Swal.fire("Error", `Failed to delete: ${err.message}`, "error");
          })
          .finally(() =>
            setIsDeleting((prev) => ({ ...prev, [incubateeId]: false })),
          );
      });
    },
    [userId, fetchIncubatees],
  );

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "incubateesname",
        headerName: "Incubatee Name",
        width: 200,
        sortable: true,
      },
      {
        field: "incubateesemail",
        headerName: "Email",
        width: 200,
        sortable: true,
      },
      {
        field: "incubateesshortname",
        headerName: "Short Name",
        width: 120,
        sortable: true,
      },
      {
        field: "fieldofworkname",
        headerName: "Field of Work",
        width: 150,
        sortable: true,
      },
      {
        field: "startupstagesname",
        headerName: "Stage Level",
        width: 120,
        sortable: true,
      },
      {
        field: "incubateesincubatorname",
        headerName: "Incubator Name",
        width: 180,
        sortable: true,
      },
      {
        field: "incubateesdateofincubation",
        headerName: "Date of Incubation",
        width: 180,
        sortable: true,
        type: "date",
        valueFormatter: (params) => formatDate(params.value),
      },
      // {
      //   field: "incubateesadminstate",
      //   headerName: "Status",
      //   width: 120,
      //   sortable: true,
      //   renderCell: (params) =>
      //     params?.row ? (
      //       <Chip
      //         label={params.value === 1 ? "Active" : "Inactive"}
      //         color={params.value === 1 ? "success" : "default"}
      //         variant={params.value === 1 ? "filled" : "outlined"}
      //         size="small"
      //       />
      //     ) : null,
      // },
      {
        field: "actions",
        headerName: "Actions",
        width: 150,
        sortable: false,
        filterable: false,
        renderCell: (params) =>
          params?.row ? (
            <Box>
              <ActionButton
                color="edit"
                onClick={() => openEditModal(params.row)}
                disabled={isDeleting[params.row.incubateesrecid]}
                title="Edit"
              >
                <EditIcon fontSize="small" />
              </ActionButton>
              <ActionButton
                color="delete"
                onClick={() => handleDelete(params.row.incubateesrecid)}
                disabled={isDeleting[params.row.incubateesrecid]}
                title="Delete"
              >
                {isDeleting[params.row.incubateesrecid] ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DeleteIcon fontSize="small" />
                )}
              </ActionButton>
            </Box>
          ) : null,
      },
    ],
    [isDeleting, openEditModal, handleDelete],
  );

  // ── Export ────────────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({ filename: "incubatees", sheetName: "Incubatees" }),
    [],
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((inc, idx) => ({
        "S.No": idx + 1,
        "Incubatee Name": inc.incubateesname || "",
        Email: inc.incubateesemail || "",
        "Short Name": inc.incubateesshortname || "",
        "Field of Work": inc.fieldofworkname || "",
        "Stage Level": inc.startupstagesname || "",
        "Incubator Name": inc.incubateesincubatorname || "",
        "Date of Incubation": formatDate(inc.incubateesdateofincubation),
        "Date of Incorporation": formatDate(inc.incubateesdateofincorporation),
        "Admin State": inc.incubateesadminstate === 1 ? "Active" : "Inactive",
        Website: inc.incubateeswebsite || "",
      })),
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }} style={{ marginTop: "100px" }}>
      {/* Page header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          🚀 Incubatees Management
        </Typography>
        <Button
          variant="contained"
          onClick={openAddModal}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          + Add Incubatee
        </Button>
      </Box>

      {/* Page-level error (fetch failure etc.) */}
      {pageError && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}
        >
          {pageError}
        </Box>
      )}

      {/* Data table */}
      <ReusableDataGrid
        data={incubatees}
        columns={columns}
        title="Incubatees"
        enableExport
        enableColumnFilters
        searchPlaceholder="Search incubatees..."
        searchFields={[
          "incubateesname",
          "incubateesemail",
          "incubateesshortname",
        ]}
        uniqueIdField="incubateesrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />

      {/* Form modal — completely separate component */}
      <IncubateeForm
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        editIncubatee={editIncubatee}
        fieldOfWorkOptions={fieldOfWorkOptions}
        stageLevelOptions={stageLevelOptions}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Success / error toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
