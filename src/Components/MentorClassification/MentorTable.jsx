import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaChalkboardTeacher, FaPlus, FaEdit } from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess";

import {
  Button,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  styled,
} from "@mui/material";
import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";

import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import MentorForm from "./Mentorform";

// ─── Styled ───────────────────────────────────────────────────────────────────

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
            : theme.palette.error.dark,
  },
}));

// ─── MentorTable ─────────────────────────────────────────────────────────────

export default function MentorTable() {
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");

  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/MentorManagement",
  );

  // ── Data state ────────────────────────────────────────────────────────────
  const [mentors, setMentors] = useState([]);
  const [mentorTypes, setMentorTypes] = useState([]);
  const [classifications, setClassifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState("add"); // "add" | "edit"
  const [editingItem, setEditingItem] = useState(null); // full row object

  const [isToggling, setIsToggling] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // ── Fetch mentors ─────────────────────────────────────────────────────────
  const fetchMentors = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const res = await api.post(
        "/resources/generic/getmentordetails",
        { userId: "ALL", incUserId: incUserid || "1" },
        {
          headers: {
            "X-Module": "Mentor Management",
            "X-Action": "Get Mentor Details",
          },
        },
      );
      if (res.data.statusCode === 200) {
        setMentors(Array.isArray(res.data.data) ? res.data.data : []);
      } else {
        throw new Error(res.data.message || "Failed to fetch mentors");
      }
    } catch (err) {
      console.error("Error fetching mentors:", err);
      setPageError("Failed to load mentors. Please try again.");
      setMentors([]);
    } finally {
      setLoading(false);
    }
  }, [incUserid]);

  // ── Fetch dropdowns ───────────────────────────────────────────────────────
  const fetchDropdownOptions = useCallback(async () => {
    try {
      const [typeRes, classRes] = await Promise.all([
        api.post(
          "/resources/generic/getmentortypedetails",
          { userId: userId || "20", userIncId: incUserid || "1" },
          {
            headers: {
              "X-Module": "Mentor Management",
              "X-Action": "Get Mentor Type Details",
            },
          },
        ),
        api.post(
          "/resources/generic/getmentorclassificationdetails",
          { userId: userId || 39, userIncId: incUserid || "1" },
          {
            headers: {
              "X-Module": "Mentor Management",
              "X-Action": "Get Mentor Classification Details",
            },
          },
        ),
      ]);

      if (typeRes.data.statusCode === 200) {
        setMentorTypes(
          (typeRes.data.data || []).filter((t) => t.mentortypeadminstate === 1),
        );
      }
      if (classRes.data.statusCode === 200) {
        setClassifications(
          (classRes.data.data || []).filter(
            (c) => c.mentorclassetadminstate === 1,
          ),
        );
      }
    } catch (err) {
      console.error("Error fetching dropdown options:", err);
    }
  }, [userId, incUserid]);

  useEffect(() => {
    fetchMentors();
    fetchDropdownOptions();
  }, [fetchMentors, fetchDropdownOptions]);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  // ── Open modals ───────────────────────────────────────────────────────────
  const openAddModal = useCallback(() => {
    if (!hasWriteAccess) {
      Swal.fire(
        "Access Denied",
        "You do not have permission to add mentors.",
        "warning",
      );
      return;
    }
    setDialogType("add");
    setEditingItem(null);
    setOpenDialog(true);
  }, [hasWriteAccess]);

  const openEditModal = useCallback(
    (item) => {
      if (!hasWriteAccess) {
        Swal.fire(
          "Access Denied",
          "You do not have permission to edit mentors.",
          "warning",
        );
        return;
      }
      setDialogType("edit");
      setEditingItem(item);
      setOpenDialog(true);
    },
    [hasWriteAccess],
  );

  const handleClose = useCallback(() => setOpenDialog(false), []);

  // ── Save success callback from MentorForm ─────────────────────────────────
  const handleSaveSuccess = useCallback(
    (message, severity) => {
      showToast(message, severity);
      if (severity === "success") fetchMentors();
    },
    [fetchMentors, showToast],
  );

  // ── Toggle status ─────────────────────────────────────────────────────────
  const handleToggleStatus = useCallback(
    (mentor) => {
      const isEnabled = mentor.mentordetsadminstate === 1;
      const actionText = isEnabled ? "disable" : "enable";
      const newState = isEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} this mentor?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isEnabled ? "#d33" : "#3085d6",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText} it!`,
        cancelButtonText: "Cancel",
      }).then(async (result) => {
        if (!result.isConfirmed) return;

        setIsToggling((prev) => ({ ...prev, [mentor.mentordetsid]: true }));

        const bodyPayload = {
          mentordetsincubatorid: mentor.mentordetsincubatorid,
          mentordetsmnttypeid: mentor.mentordetsmnttypeid,
          mentordetsclasssetid: mentor.mentordetsclasssetid,
          mentordetsname: mentor.mentordetsname,
          mentordetsdesign: mentor.mentordetsdesign,
          mentordetsphone: mentor.mentordetsphone,
          mentordetsaddress: mentor.mentordetsaddress,
          mentordetsemail: mentor.mentordetsemail,
          mentordetsdomain: mentor.mentordetsdomain,
          mentordetspastexp: mentor.mentordetspastexp,
          mentordetslinkedin: mentor.mentordetslinkedin,
          mentordetswebsite: mentor.mentordetswebsite,
          mentordetsblog: mentor.mentordetsblog,
          mentordetsimagepath: mentor.mentordetsimagepath,
          mentordetstimecommitment: mentor.mentordetstimecommitment,
          mentordetsprevstupmentor: mentor.mentordetsprevstupmentor,
          mentordetscomment: mentor.mentordetscomment,
          mentordetsgender: mentor.mentordetsgender,
          mentordetsadminstate: newState,
          mentordetsid: mentor.mentordetsid,
          mentordetsmodifiedby: userId || "1",
        };

        try {
          const res = await api.post("/updateMentor", bodyPayload, {
            headers: {
              "X-Module": "Mentor Management",
              "X-Action": "Update Mentor Status",
            },
          });

          if (res.data.statusCode === 200) {
            // Also update linked user if exists
            if (mentor.usersrecid) {
              try {
                const usersRes = await api.post("/resources/generic/getusers", {
                  userId: userId || null,
                  userIncId: incUserid,
                });
                if (
                  usersRes.data.statusCode === 200 &&
                  Array.isArray(usersRes.data.data)
                ) {
                  const targetUser = usersRes.data.data.find(
                    (u) => u.usersrecid === mentor.usersrecid,
                  );
                  if (targetUser) {
                    await api.post("/updateUser", {
                      usersemail: targetUser.usersemail,
                      usersname: targetUser.usersname,
                      usersrolesrecid: targetUser.usersrolesrecid,
                      userspassword: targetUser.userspassword,
                      usersadminstate: newState.toString(),
                      usersmodifiedby: userId || "system",
                      usersrecid: targetUser.usersrecid,
                      usersincubationsrecid: targetUser.usersincubationsrecid,
                      usersmentorid: targetUser.usersmentorid ?? null,
                    });
                  }
                }
              } catch (userErr) {
                console.error("Error updating linked user status:", userErr);
              }
            }

            Swal.fire(
              "Success!",
              `Mentor ${actionText}d successfully!`,
              "success",
            );
            fetchMentors();
          } else {
            throw new Error(
              res.data.message || `Failed to ${actionText} mentor`,
            );
          }
        } catch (err) {
          console.error(`Error ${actionText}ing mentor:`, err);
          Swal.fire(
            "Error",
            `Failed to ${actionText}: ${err.message}`,
            "error",
          );
        } finally {
          setIsToggling((prev) => ({ ...prev, [mentor.mentordetsid]: false }));
        }
      });
    },
    [userId, incUserid, fetchMentors],
  );

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "mentordetsname",
        headerName: "Name",
        width: 200,
        sortable: true,
      },
      {
        field: "mentordetsdesign",
        headerName: "Designation",
        width: 200,
        sortable: true,
      },
      {
        field: "mentordetsdomain",
        headerName: "Domain",
        width: 180,
        sortable: true,
      },
      {
        field: "mentorclasssetname",
        headerName: "Mentor Classification",
        width: 250,
        sortable: true,
      },
      {
        field: "mentortypename",
        headerName: "Mentor Type",
        width: 250,
        sortable: true,
      },
      {
        field: "mentordetsemail",
        headerName: "Email",
        width: 220,
        sortable: true,
      },
      {
        field: "mentordetsphone",
        headerName: "Phone",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetspastexp",
        headerName: "Past Experience",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetslinkedin",
        headerName: "LinkedIn Profile",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetswebsite",
        headerName: "Website",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetsblog",
        headerName: "Blog",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetstimecommitment",
        headerName: "Time Commitment",
        width: 150,
        sortable: true,
      },
      {
        field: "mentordetsactivestate",
        headerName: "Status",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          const value = params.value;
          return (
            <span
              style={{
                fontWeight: 600,
                color: value === "Active" ? "green" : "red",
              }}
            >
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
        valueGetter: (params) =>
          params.row.createdname || params.row.mentordetscreatedby,
      },
      ...(hasWriteAccess
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 130,
              sortable: false,
              filterable: false,
              renderCell: (params) => {
                if (!params?.row) return null;
                const isEnabled = params.row.mentordetsadminstate === 1;
                return (
                  <Box>
                    <ActionButton
                      color={isEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={isToggling[params.row.mentordetsid]}
                      title={isEnabled ? "Disable" : "Enable"}
                    >
                      {isToggling[params.row.mentordetsid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : isEnabled ? (
                        <ToggleOnIcon fontSize="small" />
                      ) : (
                        <ToggleOffIcon fontSize="small" />
                      )}
                    </ActionButton>

                    <ActionButton
                      color="edit"
                      onClick={() => openEditModal(params.row)}
                      disabled={isToggling[params.row.mentordetsid]}
                      title="Edit"
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
    [hasWriteAccess, isToggling, openEditModal, handleToggleStatus],
  );

  // ── Export ────────────────────────────────────────────────────────────────
  const exportConfig = useMemo(
    () => ({ filename: "mentors_directory", sheetName: "Mentors" }),
    [],
  );

  const onExportData = useMemo(
    () => (data) =>
      data.map((item, index) => ({
        "S.No": index + 1,
        Name: item.mentordetsname || "",
        Designation: item.mentordetsdesign || "",
        Domain: item.mentordetsdomain || "",
        Email: item.mentordetsemail || "",
        Phone: item.mentordetsphone || "",
        Address: item.mentordetsaddress || "",
        "Time Commitment": item.mentordetstimecommitment || "",
        "Prev Startup Mentor": item.mentordetsprevstupmentor || "",
        Status: item.mentordetsadminstate === 1 ? "Active" : "Inactive",
      })),
    [],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
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
          Mentors Directory
        </Typography>
        {hasWriteAccess && (
          <Button
            variant="contained"
            startIcon={<FaPlus />}
            onClick={openAddModal}
          >
            Add Mentor
          </Button>
        )}
      </Box>

      {pageError && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{pageError}</Typography>
        </Box>
      )}

      {/* Table */}
      <ReusableDataGrid
        data={mentors}
        columns={columns}
        title=""
        enableExport
        enableColumnFilters
        searchPlaceholder="Search mentors..."
        searchFields={["mentordetsname", "mentordetsdomain", "mentordetsemail"]}
        uniqueIdField="mentordetsid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />

      {/* Form modal — completely separate component */}
      <MentorForm
        open={openDialog}
        onClose={handleClose}
        dialogType={dialogType}
        editingItem={editingItem}
        mentorTypes={mentorTypes}
        classifications={classifications}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Toast */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
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

      {/* Status-toggle overlay */}
      <StyledBackdrop open={Object.values(isToggling).some(Boolean)}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>Updating status...</Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
