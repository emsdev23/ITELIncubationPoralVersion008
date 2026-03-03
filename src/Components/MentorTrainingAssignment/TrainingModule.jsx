import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
} from "react";
import Swal from "sweetalert2";
import { IPAdress } from "../Datafetching/IPAdrees";
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
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ArticleIcon from "@mui/icons-material/Article";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

// Import your reusable component
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
    color === "edit" ? theme.palette.primary.main : theme.palette.error.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit" ? theme.palette.primary.dark : theme.palette.error.dark,
  },
}));

const FileUploadButton = styled(Button)(({ theme }) => ({
  position: "relative",
  overflow: "hidden",
  "& input[type=file]": {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: "100%",
    minHeight: "100%",
    fontSize: "100px",
    textAlign: "right",
    cursor: "pointer",
    opacity: 0,
    outline: "none",
    background: "white",
    display: "block",
  },
}));

const TrainingModule = forwardRef(
  ({ title = "🎓 Training Module", onAssignSuccess }, ref) => {
    const hasWriteAccess = useWriteAccess(
      "/Incubation/Dashboard/TrainingAssignment",
    );
    const userId = sessionStorage.getItem("userid");
    const token = sessionStorage.getItem("token");
    const roleid = sessionStorage.getItem("roleid");
    const incUserid = sessionStorage.getItem("incuserid");
    const incubateeId = sessionStorage.getItem("incubateeId");
    const IP = IPAdress;

    // STATE DECLARATIONS
    const [trainings, setTrainings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [materialTypes, setMaterialTypes] = useState([]);

    // State for Assignment
    const [users, setUsers] = useState([]);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedTrainingForAssign, setSelectedTrainingForAssign] =
      useState(null);

    const [assignFormData, setAssignFormData] = useState({
      trainingassnincusersid: "",
    });

    const [isAssigning, setIsAssigning] = useState(false);

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
    const [toast, setToast] = useState({
      open: false,
      message: "",
      severity: "success",
    });
    const [error, setError] = useState(null);

    // State to store existing assignments for duplicate check
    const [allAssignments, setAllAssignments] = useState([]);

    useImperativeHandle(ref, () => ({
      openAddModal,
    }));

    // --- API CALLS ---

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
          },
        );

        const filteredTrainings = (response.data.data || []).filter(
          (item) => item.trainingadminstate === 1,
        );

        setTrainings(filteredTrainings);
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
          },
        );
        setCategories(response.data.data || []);
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
          },
        );
        setSubCategories(response.data.data || []);
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
          },
        );
        setMaterialTypes(response.data.data || []);
      } catch (err) {
        console.error("Error fetching material types:", err);
      }
    }, [userId]);

    const fetchUsers = useCallback(async () => {
      try {
        const response = await api.post(
          "/resources/generic/getmentorspoc",
          {
            userId: userId || "90",
            userIncId: "1",
          },
          {
            headers: {
              "X-Module": "Training Management",
              "X-Action": "Fetch Mentors POC",
            },
          },
        );
        const mentors = response.data.data || [];
        setUsers(mentors);
      } catch (err) {
        console.error("Error fetching mentors:", err);
        setUsers([]);
      }
    }, [userId]);

    // --- NEW: Fetch Existing Assignments for Duplicate Check ---
    const fetchExistingAssignments = useCallback(async () => {
      try {
        const response = await api.post(
          "/resources/generic/gettrainingassndetails",
          {
            userId: "ALL",
            userIncId: incUserid || "1",
          },
        );
        setAllAssignments(response.data.data || []);
      } catch (err) {
        console.error("Error fetching assignments:", err);
        setAllAssignments([]);
      }
    }, [incUserid]);

    const refreshData = useCallback(() => {
      fetchTrainingList();
      fetchCategories();
      fetchSubCategories();
      fetchMaterialTypes();
      fetchUsers();
    }, [
      fetchTrainingList,
      fetchCategories,
      fetchSubCategories,
      fetchMaterialTypes,
      fetchUsers,
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
      [fieldErrors],
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
      [fieldErrors, validateField],
    );

    const getFilteredSubCategories = useCallback(() => {
      if (!formData.trainingcatid) return [];
      return subCategories.filter(
        (sub) =>
          String(sub.trainingsubcatcatid) === String(formData.trainingcatid),
      );
    }, [formData.trainingcatid, subCategories]);

    // --- ASSIGNMENT LOGIC ---

    const openAssignModal = useCallback(
      (training) => {
        setSelectedTrainingForAssign(training);
        setAssignFormData({
          trainingassnincusersid: "",
        });
        setIsAssignModalOpen(true);
        // Fetch assignments when opening the modal to check for duplicates
        fetchExistingAssignments();
      },
      [fetchExistingAssignments],
    );

    const handleAssignChange = useCallback((e) => {
      const { name, value } = e.target;
      setAssignFormData((prev) => ({ ...prev, [name]: value }));
    }, []);

    const handleAssignSubmit = useCallback(
      async (e) => {
        e.preventDefault();

        if (!assignFormData.trainingassnincusersid) {
          showToast("Please select a Mentor/POC", "error");
          return;
        }

        // --- DUPLICATE CHECK LOGIC ---
        const isDuplicate = allAssignments.find(
          (assignment) =>
            assignment.trainingassntrainingid ==
              selectedTrainingForAssign.trainingid &&
            assignment.trainingassnincusersid ==
              assignFormData.trainingassnincusersid,
        );

        if (isDuplicate) {
          // --- FIX: Close Dialog BEFORE showing Alert ---
          setIsAssignModalOpen(false);

          const result = await Swal.fire({
            title: "Already Assigned",
            text: "This training has already been assigned to this user. Do you want to assign it again?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d42",
            cancelButtonText: "Cancel",
          });

          if (result.isConfirmed) {
            // User confirmed -> Proceed to assignment
            setIsAssigning(true);
            try {
              const url = `${IP}/itelinc/addTrainingAssn`;

              const params = new URLSearchParams({
                trainingassntrainingid: selectedTrainingForAssign.trainingid,
                trainingassnincusersid: assignFormData.trainingassnincusersid,
                trainingassnmentorusersid: parseInt(userId) || 1,
                trainingassnadminstate: 1,
                trainingassncreatedby: parseInt(userId) || 1,
                trainingassnmodifiedby: parseInt(userId) || 1,
              });

              const response = await fetch(`${url}?${params.toString()}`, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                  userid: userId || "1",
                  "X-Module": "Training Management",
                  "X-Action": "Assign Training",
                },
              });

              const data = await response.json();

              if (
                response.ok ||
                data.statusCode === 200 ||
                data.status === "success"
              ) {
                // Close dialog before success message to ensure visibility
                setIsAssignModalOpen(false);

                Swal.fire(
                  "Assigned!",
                  "Training module assigned successfully.",
                  "success",
                );
                refreshData();

                if (onAssignSuccess) {
                  onAssignSuccess();
                }
              } else {
                throw new Error(data.message || "Operation failed");
              }
            } catch (err) {
              console.error("Error assigning training:", err);
              showToast("Failed to assign training", "error");
              Swal.fire(
                "Error",
                err?.message || "Failed to assign training",
                "error",
              );
            } finally {
              setIsAssigning(false);
            }
          } else {
            // User cancelled -> Re-open the Modal
            setIsAssignModalOpen(true);
          }
          return; // Stop execution here
        }

        // --- PROCEED WITH NORMAL ASSIGNMENT ---
        setIsAssigning(true);
        try {
          const url = `${IP}/itelinc/addTrainingAssn`;

          const params = new URLSearchParams({
            trainingassntrainingid: selectedTrainingForAssign.trainingid,
            trainingassnincusersid: assignFormData.trainingassnincusersid,
            trainingassnmentorusersid: parseInt(userId) || 1,
            trainingassnadminstate: 1,
            trainingassncreatedby: parseInt(userId) || 1,
            trainingassnmodifiedby: parseInt(userId) || 1,
          });

          const response = await fetch(`${url}?${params.toString()}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              userid: userId || "1",
              "X-Module": "Training Management",
              "X-Action": "Assign Training",
            },
          });

          const data = await response.json();

          if (
            response.ok ||
            data.statusCode === 200 ||
            data.status === "success"
          ) {
            // Close dialog BEFORE success message for cleaner UX
            setIsAssignModalOpen(false);

            Swal.fire(
              "Assigned!",
              "Training module assigned successfully.",
              "success",
            );
            refreshData();

            if (onAssignSuccess) {
              onAssignSuccess();
            }
          } else {
            throw new Error(data.message || "Operation failed");
          }
        } catch (err) {
          console.error("Error assigning training:", err);
          showToast("Failed to assign training", "error");
          Swal.fire(
            "Error",
            err?.message || "Failed to assign training",
            "error",
          );
        } finally {
          setIsAssigning(false);
        }
      },
      [
        IP,
        assignFormData,
        selectedTrainingForAssign,
        token,
        userId,
        refreshData,
        showToast,
        onAssignSuccess,
        allAssignments,
      ],
    );

    // --- EXISTING LOGIC (Add/Edit/Delete) ---

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
      [fetchCategories, fetchSubCategories, fetchMaterialTypes],
    );

    const createTraining = useCallback(async () => {
      try {
        const url = `${IP}/itelinc/addTraining`;
        const params = new URLSearchParams({
          trainingcatid: formData.trainingcatid,
          trainingsubcatid: formData.trainingsubcatid,
          trainingmattypeid: formData.trainingmattypeid,
          trainingmodulename: formData.trainingmodulename,
          trainingdescription: formData.trainingdescription,
          trainingmateriallink: formData.trainingmateriallink,
          trainingadminstate: 1,
          trainingcreatedby: parseInt(userId) || 1,
          trainingmodifiedby: parseInt(userId) || 1,
        });

        const response = await fetch(`${url}?${params.toString()}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            userid: userId || "1",
            "X-Module": "Training Management",
            "X-Action": "Add Training",
          },
        });

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error creating training:", error);
        throw error;
      }
    }, [IP, formData, token, userId]);

    const updateTraining = useCallback(async () => {
      try {
        const url = `${IP}/itelinc/updateTraining`;
        const params = new URLSearchParams({
          trainingid: editTraining.trainingid,
          trainingcatid: formData.trainingcatid,
          trainingsubcatid: formData.trainingsubcatid,
          trainingmattypeid: formData.trainingmattypeid,
          trainingmodulename: formData.trainingmodulename,
          trainingdescription: formData.trainingdescription,
          trainingmateriallink: formData.trainingmateriallink,
          trainingadminstate: 1,
          trainingmodifiedby: parseInt(userId) || 1,
        });

        const response = await fetch(`${url}?${params.toString()}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            userid: userId || "1",
            "X-Module": "Training Management",
            "X-Action": "Update Training",
          },
        });

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error updating training:", error);
        throw error;
      }
    }, [IP, formData, editTraining, token, userId]);

    const deleteTraining = useCallback(
      async (trainingId) => {
        try {
          const url = `${IP}/itelinc/deleteTraining`;
          const params = new URLSearchParams({
            trainingid: trainingId,
            trainingmodifiedby: parseInt(userId) || 1,
          });

          const response = await fetch(`${url}?${params.toString()}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              userid: userId || "1",
              "X-Module": "Training Management",
              "X-Action": "Delete Training",
            },
          });

          const data = await response.json();
          return data;
        } catch (error) {
          console.error("Error deleting training:", error);
          throw error;
        }
      },
      [IP, token, userId],
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
              "success",
            );
            refreshData();
          } else {
            throw new Error(response.message || "Operation failed");
          }
        } catch (err) {
          console.error("Error in handleSubmit:", err);
          showToast(`Failed to save: ${err?.response?.data?.data}`, "error");
          Swal.fire(
            "Error",
            err?.response?.data?.data || "Operation failed",
            "error",
          );
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
      ],
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
            setIsDeleting((prev) => ({ ...prev, [training.trainingid]: true }));

            try {
              const response = await deleteTraining(training.trainingid);

              if (
                response.statusCode === 200 ||
                response.status === "success"
              ) {
                Swal.fire(
                  "Deleted!",
                  "Training module has been deleted.",
                  "success",
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
      [deleteTraining, refreshData, showToast],
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
      ];

      console.log("write access:", hasWriteAccess, "roleid:", roleid);
      if (hasWriteAccess && Number(roleid) === 9) {
        baseColumns.push({
          field: "actions",
          headerName: "Assign",
          width: 120,
          sortable: false,
          filterable: false,
          renderCell: (params) => {
            if (!params?.row) return null;
            return (
              <Box>
                <Tooltip title="Assign to Mentor/POC" arrow>
                  <IconButton
                    color="primary"
                    onClick={() => openAssignModal(params.row)}
                  >
                    <PersonAddIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          },
        });
      }

      return baseColumns;
    }, [hasWriteAccess, roleid, openAssignModal]);

    const exportConfig = useMemo(
      () => ({
        filename: "training_modules",
        sheetName: "Training",
      }),
      [],
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
        }));
      },
      [],
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

        {/* Modal for Add/Edit */}
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
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
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
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
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
                      <Typography
                        variant="caption"
                        color="error"
                        sx={{ mt: 1 }}
                      >
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

        {/* Modal for Assign Training */}
        <Dialog
          open={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Assign Training Module
            <IconButton
              aria-label="close"
              onClick={() => setIsAssignModalOpen(false)}
              sx={{
                position: "absolute",
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
              disabled={isAssigning}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <form onSubmit={handleAssignSubmit}>
            <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Module:</strong>{" "}
                {selectedTrainingForAssign?.trainingmodulename}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl sx={{ width: "200px" }}>
                    <InputLabel>Select Incubatee *</InputLabel>
                    <Select
                      name="trainingassnincusersid"
                      value={assignFormData.trainingassnincusersid}
                      onChange={handleAssignChange}
                      label="Select Incubatee *"
                      disabled={isAssigning}
                    >
                      <MenuItem value="">Select Incubatee</MenuItem>
                      {users.map((user) => (
                        <MenuItem
                          key={user.mentorincassnincuserrecid}
                          value={user.mentorincassnincuserrecid}
                        >
                          {user.usersname}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => setIsAssignModalOpen(false)}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isAssigning || !assignFormData.trainingassnincusersid}
                startIcon={isAssigning ? <CircularProgress size={20} /> : null}
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Toast notification */}
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

        {/* Loading overlay for Add/Edit */}
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
              {editTraining ? "Updating training..." : "Creating training..."}
            </Typography>
          </Box>
        </StyledBackdrop>

        {/* Loading overlay for Assign */}
        <StyledBackdrop open={isAssigning}>
          <Box
            sx={{
              display: "openDialog, flexDirection: column",
              alignItems: "center",
            }}
          >
            <CircularProgress color="inherit" />
            <Typography sx={{ mt: 2 }}>Assigning training module...</Typography>
          </Box>
        </StyledBackdrop>
      </Box>
    );
  },
);

export default TrainingModule;
