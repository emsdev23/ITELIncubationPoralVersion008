import React, { useState, useEffect, useCallback } from "react";
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, CircularProgress, Grid, FormControl, InputLabel, 
  Select, MenuItem, Alert, FormControlLabel, Switch 
} from "@mui/material";
import { FaChalkboardTeacher } from "react-icons/fa";
import api from "../Datafetching/api"; 
import ReusableDataGrid from "../Datafetching/ReusableDataGrid"; 
import { useWriteAccess } from "../Datafetching/useWriteAccess"; 

const IncubeeAssignmentTable = () => {
  const [incubatees, setIncubatees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Dialog State
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIncubatee, setSelectedIncubatee] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Training & Validation State
  const [trainingList, setTrainingList] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]); 
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  
  // NEW: State for Admin Status (Active/Inactive)
  const [adminState, setAdminState] = useState(true);
  
  // Confirmation State
  const [showConfirmReassign, setShowConfirmReassign] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");
  const hasWriteAccess = useWriteAccess("/Incubation/Dashboard/TrainingAssignment");

  // 1. FETCH INCUBATEE LIST
  const fetchIncubatees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "/resources/generic/getincubateebymentor", 
        {
          userId: userId || "0",
          userIncId: incUserid || "0",
        }
      );
      if (response.data && Array.isArray(response.data.data)) {
        setIncubatees(response.data.data);
      } else {
        setIncubatees(response.data || []);
      }
    } catch (err) {
      console.error("Error fetching incubatees:", err);
      setError("Failed to load incubatee data.");
      setIncubatees([]);
    } finally {
      setLoading(false);
    }
  }, [userId, incUserid]);

  // 2. FETCH TRAINING OPTIONS & EXISTING ASSIGNMENTS
  const fetchTrainingData = useCallback(async () => {
    setLoadingTrainings(true);
    try {
      // A. Fetch Training List
      const listRes = await api.post("/resources/generic/gettraininglist", {
        userId: userId,
        userIncId: "ALL",
      });
      setTrainingList(listRes.data?.data || []);

      // B. Fetch Existing Assignments
      const assignRes = await api.post("/resources/generic/gettrainingassndetails", {
        userId: "ALL",
        userIncId: incUserid || "1",
      });
      setAllAssignments(assignRes.data?.data || []);

    } catch (err) {
      console.error("Error fetching training data:", err);
    } finally {
      setLoadingTrainings(false);
    }
  }, [userId, incUserid]);

  useEffect(() => {
    fetchIncubatees();
  }, [fetchIncubatees]);

  // --- HANDLERS ---

  const handleOpenAssign = async (row) => {
    if (!hasWriteAccess) {
      alert("You do not have permission to assign trainings.");
      return;
    }
    setSelectedIncubatee(row);
    setSelectedTrainingId("");
    setAdminState(true); // Reset to default
    setOpenDialog(true);
    await fetchTrainingData();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedIncubatee(null);
    setSelectedTrainingId("");
    setShowConfirmReassign(false);
    setAdminState(true);
  };

  const handleTrainingChange = (event) => {
    const newTrainingId = event.target.value;
    setSelectedTrainingId(newTrainingId);

    if (!selectedIncubatee || !newTrainingId) return;

    const isDuplicate = allAssignments.find(
      (assignment) =>
        assignment.trainingassnincusersid === selectedIncubatee.mentorincassnincuserrecid &&
        assignment.trainingassntrainingid == newTrainingId
    );

    if (isDuplicate) {
      setDuplicateInfo({
        moduleName: isDuplicate.trainingmodulename,
        status: isDuplicate.trainingassnstatus
      });
      setShowConfirmReassign(true);
    } else {
      setShowConfirmReassign(false);
      setDuplicateInfo(null);
    }
  };

  const handleConfirmReassign = () => {
    setShowConfirmReassign(false);
    proceedWithAssignment();
  };

  const handleCancelReassign = () => {
    setShowConfirmReassign(false);
    setSelectedTrainingId("");
  };

  // --- UPDATED ASSIGNMENT LOGIC ---
  const proceedWithAssignment = async () => {
    setIsAssigning(true);
    
    try {
      // Constructing the payload based on the user's provided snippet
      const payload = {
        trainingassntrainingid: selectedTrainingId, // From Dropdown
        trainingassnincusersid: selectedIncubatee.mentorincassnincuserrecid, // Incubatee ID
        trainingassnmentorusersid: userId, // Current User (Mentor)
        trainingassnadminstate: adminState ? 1 : 0,
        trainingassncreatedby: userId || "1",
        trainingassnmodifiedby: userId || "1",
      };

      // API Call using the provided structure
      const response = await api.post("/addTrainingAssn", null, {
        params: payload,
        headers: {
          "X-Module": "Training Association",
          "X-Action": "Add",
        },
      });

      if (response.data.statusCode === 200) {
        alert(`Training successfully assigned to ${selectedIncubatee.incubateename}`);
        handleCloseDialog();
        // Optional: Refresh lists if needed
        // fetchIncubatees(); 
      } else {
        throw new Error(response.data.message || "Failed to assign training");
      }

    } catch (err) {
      console.error("Assignment failed:", err);
      const errorMsg = err.response?.data?.message || err.message || "An unknown error occurred";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignSubmit = () => {
    if (!showConfirmReassign) {
      proceedWithAssignment();
    }
  };

  // --- COLUMNS ---
  const columns = [
    { field: "incubateename", headerName: "Incubatee Name", width: 200, sortable: true },
    { field: "incubateeusername", headerName: "Username", width: 150, sortable: true },
    { field: "incubateesshortname", headerName: "Short Name", width: 120, sortable: true },
    { field: "fieldofworkname", headerName: "Field of Work", width: 180, sortable: true },
    { field: "startupstagesname", headerName: "Stage", width: 150, sortable: true },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          startIcon={<FaChalkboardTeacher />}
          onClick={() => handleOpenAssign(params.row)}
          sx={{
            backgroundColor: "#1976d2",
            "&:hover": { backgroundColor: "#115293" },
          }}
        >
          Assign
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h2">
          Assign Training to Incubatees
        </Typography>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

      <ReusableDataGrid
        data={incubatees}
        columns={columns}
        title=""
        enableExport={true}
        searchPlaceholder="Search incubatees..."
        searchFields={["incubateename", "incubateeusername", "fieldofworkname"]}
        uniqueIdField="mentorincassnid"
        loading={loading}
      />

      {/* --- MAIN ASSIGNMENT DIALOG --- */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Training</DialogTitle>
        <DialogContent>
          {selectedIncubatee && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1">
                <strong>Incubatee:</strong> {selectedIncubatee.incubateename}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                ({selectedIncubatee.incubateesshortname})
              </Typography>
              
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="training-select-label">Select Training Module</InputLabel>
                <Select
                  labelId="training-select-label"
                  value={selectedTrainingId}
                  label="Select Training Module"
                  onChange={handleTrainingChange}
                  disabled={loadingTrainings || isAssigning}
                >
                  {loadingTrainings ? (
                    <MenuItem value=""><CircularProgress size={20} /></MenuItem>
                  ) : (
                    trainingList.map((t) => (
                      <MenuItem key={t.trainingid} value={t.trainingid}>
                        {t.trainingcatname} | {t.trainingsubcatname} | {t.trainingmodulename}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              {showConfirmReassign && !isAssigning && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This training has already been assigned to this user.
                  <br/>
                  Please confirm below if you wish to assign it again.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isAssigning}>
            Cancel
          </Button>
          {!showConfirmReassign && (
            <Button 
              onClick={handleAssignSubmit} 
              variant="contained" 
              disabled={!selectedTrainingId || isAssigning}
              startIcon={isAssigning ? <CircularProgress size={20} /> : null}
            >
              {isAssigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* --- RE-ASSIGN CONFIRMATION DIALOG --- */}
      <Dialog
        open={showConfirmReassign}
        onClose={handleCancelReassign}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Already Assigned"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            The training <strong>{duplicateInfo?.moduleName}</strong> has already been assigned to <strong>{selectedIncubatee?.incubateename}</strong>.
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Do you want to assign it again?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelReassign}>No, Cancel</Button>
          <Button onClick={handleConfirmReassign} variant="contained" autoFocus>
            Yes, Assign Again
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default IncubeeAssignmentTable;