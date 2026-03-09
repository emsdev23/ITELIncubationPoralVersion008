import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import { FaEdit, FaTrash, FaLayerGroup, FaComments } from "react-icons/fa";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "./TrainingAssociationTable.css";
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
    color === "edit"
      ? theme.palette.primary.main
      : color === "delete"
        ? theme.palette.error.main
        : color === "chat"
          ? theme.palette.info.main
          : theme.palette.grey[500],
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit"
        ? theme.palette.primary.dark
        : color === "delete"
          ? theme.palette.error.dark
          : color === "chat"
            ? theme.palette.info.dark
            : theme.palette.grey[700],
  },
}));

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

// Wrapped in forwardRef
const TrainingAssociationTable = forwardRef(
  ({ title = "🔗 Training Associations" }, ref) => {
    const navigate = useNavigate();
    const userId = sessionStorage.getItem("userid");
    const incUserid = sessionStorage.getItem("incuserid");

    const hasWriteAccess = useWriteAccess(
      "/Incubation/Dashboard/TrainingAssignment",
    );

    // States
    const [associations, setAssociations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [dialogType, setDialogType] = useState("add");
    const [editingId, setEditingId] = useState(null);

    const [isChatting, setIsChatting] = useState({});

    const [formData, setFormData] = useState({
      trainingId: "",
      incUserId: "",
      mentorUserId: "",
      adminState: true,
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState({});
    const [toast, setToast] = useState({
      open: false,
      message: "",
      severity: "success",
    });

    // Expose the refresh function to the parent
    useImperativeHandle(ref, () => ({
      refresh: fetchAssociations,
    }));

    // --- HELPER FUNCTIONS FOR CHAT ---

    const createChat = async (chatData) => {
      try {
        const token = sessionStorage.getItem("token");
        console.log("Payload being sent to API:", chatData);

        const response = await api.post("/resources/chat/initiate", chatData, {
          headers: {
            Authorization: `Bearer ${token}`,
            userid: chatData.from,
            "X-Module": "Chat Module",
            "X-Action": "Creating new chat",
          },
        });

        return response.data;
      } catch (error) {
        console.error("Error creating chat:", error);
        throw error;
      }
    };

    // Helper function to get the list of chats
    const getChatLists = async (userId, incUserid) => {
      try {
        console.log("Fetching chat lists for user:", userId, incUserid);

        const response = await api.post("/resources/generic/getchatlist", {
          userId: parseInt(userId),
          incUserId: parseInt(incUserid),
        });

        const data = response.data || response;
        console.log("Chat lists data:", data);

        return data.data || data || [];
      } catch (error) {
        console.error("Error fetching chat lists:", error);
        throw error;
      }
    };

    // --- API CALLS ---

    const fetchAssociations = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const cacheBuster = Date.now();

        const response = await api.post(
          "/resources/generic/gettrainingassndetails",
          {
            userId:
              sessionStorage.getItem("roleid") === "1" ? "ALL" : userId || "1",
            userIncId: incUserid || "1",
            _t: cacheBuster,
          },
        );

        if (response.data.statusCode === 200) {
          const data = Array.isArray(response.data.data)
            ? response.data.data
            : [];
          setAssociations(data);
          console.log("Associations refreshed:", data.length);
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
      const isMentorValid = validateField(
        "mentorUserId",
        formData.mentorUserId,
      );
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

    // --- CHAT HANDLER ---
    const handleChat = useCallback(
      async (row) => {
        const recId = row.trainingassnrecid;
        setIsChatting((prev) => ({ ...prev, [recId]: true }));

        try {
          const currentUserId = parseInt(userId, 10);
          const mentorId = parseInt(row.trainingassnmentorusersid, 10);
          const incUserId = parseInt(row.trainingassnincusersid, 10);
          const courseName = row.trainingmodulename || "Course";
          const expectedSubject = `Course: ${courseName}`;

          // 1. Fetch chat lists using getChatLists
          const userChats = await getChatLists(currentUserId, incUserid);

          // 2. Check for existing chat
          const existingChat = userChats.find((chat) => {
            // Check Subject
            if (chat.chatlistsubject !== expectedSubject) return false;

            // Check State (1 = Open)
            if (chat.chatlistchatstate !== 1) return false;

            // Check Users: chatlistfrom/to must match mentorId/incUserId (or vice-versa)
            const chatFrom = parseInt(chat.chatlistfrom, 10);
            const chatTo = parseInt(chat.chatlistto, 10);

            const usersMatch =
              (chatFrom === mentorId && chatTo === incUserId) ||
              (chatFrom === incUserId && chatTo === mentorId);

            return usersMatch;
          });

          if (existingChat) {
            // 3. If exists, Route to this exact chat using the chatlistid (chatlistrecid)
            const chatListId = existingChat.chatlistrecid;

            navigate(`/Incubation/Dashboard/Chats?id=${chatListId}`);
            showToast("Opening existing chat", "info");
          } else {
            // 4. Else, Create new chat
            const toId = currentUserId !== incUserId ? incUserId : mentorId;
            const chatType = toId === mentorId ? 1 : 2; // 1 for Mentor, 2 for Incubatee

            const chatData = {
              chattype: parseInt(chatType),
              from: currentUserId,
              to: toId,
              subject: expectedSubject,
              isgroupchat: false,
              recipients: null,
            };

            await createChat(chatData);

            // Route to general chat page (without ID)
            navigate(`/Incubation/Dashboard/Chats`);
            showToast("Chat created successfully", "success");
          }
        } catch (err) {
          console.error("Error in chat operation:", err);
          showToast("Failed to prepare chat", "error");
        } finally {
          setIsChatting((prev) => ({ ...prev, [recId]: false }));
        }
      },
      [userId, incUserid, navigate, showToast],
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
            Swal.fire(
              "Deleted!",
              "Association deleted successfully!",
              "success",
            );
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
        // {
        //   field: "traineename",
        //   headerName: "Trainee Name",
        //   width: 150,
        //   sortable: true,
        // },
        {
          field: "incubateename",
          headerName: "Assigned To",
          width: 180,
          sortable: true,
        },
        {
          field: "mentorname",
          headerName: "Assigned By",
          width: 150,
          sortable: true,
        },
        {
          field: "trainingassnstatus",
          headerName: "Training Status",
          width: 180,
          sortable: true,
          renderCell: (params) => {
            const statusMap = {
              1: { label: "Assigned", color: "gray" },
              2: { label: "In Progress", color: "orange" },
              3: { label: "Completed", color: "green" },
            };

            const status = statusMap[params.value] || {
              label: "Unknown",
              color: "red",
            };

            return (
              <span style={{ fontWeight: 600, color: status.color }}>
                {status.label}
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
                field: "chatAction",
                headerName: "Chat",
                width: 80,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  if (!params?.row) return null;
                  return (
                    <ActionButton
                      color="chat"
                      onClick={() => handleChat(params.row)}
                      disabled={isChatting[params.row.trainingassnrecid]}
                      title="Initiate Chat"
                    >
                      {isChatting[params.row.trainingassnrecid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <FaComments />
                      )}
                    </ActionButton>
                  );
                },
              },
              {
                field: "deleteAction",
                headerName: "Delete",
                width: 100,
                sortable: false,
                filterable: false,
                renderCell: (params) => {
                  if (!params?.row) return null;
                  return (
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
        isChatting,
        handleChat,
        handleDelete,
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
            {title}
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
                    onBlur={(e) =>
                      validateField("mentorUserId", e.target.value)
                    }
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
  },
);

export default TrainingAssociationTable;
