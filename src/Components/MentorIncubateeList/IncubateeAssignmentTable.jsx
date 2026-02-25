import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { FaChalkboardTeacher } from "react-icons/fa";
import Swal from "sweetalert2";
import api from "../Datafetching/api";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import { useWriteAccess } from "../Datafetching/useWriteAccess";

const IncubeeAssignmentTable = () => {
  const [incubatees, setIncubatees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedIncubatee, setSelectedIncubatee] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const [trainingList, setTrainingList] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [loadingTrainings, setLoadingTrainings] = useState(false);

  const [adminState] = useState(true);

  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");
  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/TrainingAssignment"
  );

  // =============================
  // FETCH INCUBATEES
  // =============================
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

      setIncubatees(response.data?.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load incubatee data.");
      setIncubatees([]);
    } finally {
      setLoading(false);
    }
  }, [userId, incUserid]);

  useEffect(() => {
    fetchIncubatees();
  }, [fetchIncubatees]);

  // =============================
  // FETCH TRAININGS + ASSIGNMENTS
  // =============================
  const fetchTrainingData = useCallback(async () => {
    setLoadingTrainings(true);
    try {
      const listRes = await api.post(
        "/resources/generic/gettraininglist",
        {
          userId,
          userIncId: "ALL",
        }
      );

      const filteredTrainings = (listRes.data?.data || []).filter(
        (t) => t.trainingadminstate === 1
      );

      setTrainingList(filteredTrainings);

      const assignRes = await api.post(
        "/resources/generic/gettrainingassndetails",
        {
          userId: "ALL",
          userIncId: incUserid || "1",
        }
      );

      setAllAssignments(assignRes.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTrainings(false);
    }
  }, [userId, incUserid]);

  // =============================
  // OPEN / CLOSE DIALOG
  // =============================
  const handleOpenAssign = async (row) => {
    if (!hasWriteAccess) {
      await Swal.fire({
        icon: "warning",
        title: "Access Denied",
        text: "You do not have permission to assign trainings.",
      });
      return;
    }

    setSelectedIncubatee(row);
    setSelectedTrainingId("");
    setOpenDialog(true);
    await fetchTrainingData();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedIncubatee(null);
    setSelectedTrainingId("");
  };

  // =============================
  // DUPLICATE CHECK (SAFE FIX)
  // =============================
  const handleTrainingChange = async (event) => {
    const newTrainingId = event.target.value;

    if (!selectedIncubatee) return;

    const isDuplicate = allAssignments.find(
      (a) =>
        a.trainingassnincusersid ===
          selectedIncubatee.mentorincassnincuserrecid &&
        a.trainingassntrainingid == newTrainingId
    );

    if (isDuplicate) {
      // CLOSE dialog before showing alert
      setOpenDialog(false);

      const result = await Swal.fire({
        title: "Already Assigned",
        text: "This training is already assigned. Assign again?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Assign Again",
      });

      if (result.isConfirmed) {
        setSelectedTrainingId(newTrainingId);

        setTimeout(() => {
          setOpenDialog(true);
          proceedWithAssignment(newTrainingId);
        }, 150);
      } else {
        setOpenDialog(true);
        setSelectedTrainingId("");
      }
    } else {
      setSelectedTrainingId(newTrainingId);
    }
  };

  // =============================
  // ASSIGNMENT LOGIC
  // =============================
  const proceedWithAssignment = async (trainingOverride = null) => {
    const trainingId = trainingOverride || selectedTrainingId;

    if (!trainingId) {
      await Swal.fire({
        icon: "warning",
        title: "Select Training",
        text: "Please select a training module.",
      });
      return;
    }

    setIsAssigning(true);

    try {
      const incubateeName = selectedIncubatee?.incubateename;

      const payload = {
        trainingassntrainingid: trainingId,
        trainingassnincusersid:
          selectedIncubatee.mentorincassnincuserrecid,
        trainingassnmentorusersid: userId,
        trainingassnadminstate: 1,
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

      if (response.data.statusCode === 200) {
        // CLOSE dialog BEFORE success popup
        handleCloseDialog();

        await Swal.fire({
          title: "Success!",
          text: `Training successfully assigned to ${incubateeName}`,
          icon: "success",
        });

        fetchTrainingData();
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text:
          err.response?.data?.message ||
          err.message ||
          "Assignment failed",
        icon: "error",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    proceedWithAssignment();
  };

  // =============================
  // COLUMNS
  // =============================
  const columns = [
    { field: "incubateename", headerName: "Incubatee Name", width: 200 },
    { field: "incubateeusername", headerName: "Username", width: 150 },
    { field: "incubateesshortname", headerName: "Short Name", width: 120 },
    { field: "fieldofworkname", headerName: "Field of Work", width: 180 },
    { field: "startupstagesname", headerName: "Stage", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      renderCell: (params) => (
        <Button
          variant="contained"
          size="small"
          startIcon={<FaChalkboardTeacher />}
          onClick={() => handleOpenAssign(params.row)}
        >
          Assign
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Assign Training to Incubatees
      </Typography>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <ReusableDataGrid
        data={incubatees}
        columns={columns}
        loading={loading}
        uniqueIdField="mentorincassnid"
      />

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Assign Training</DialogTitle>
        <DialogContent>
          {selectedIncubatee && (
            <>
              <Typography>
                <strong>Incubatee:</strong>{" "}
                {selectedIncubatee.incubateename}
              </Typography>

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Select Training</InputLabel>
                <Select
                  value={selectedTrainingId}
                  label="Select Training"
                  onChange={handleTrainingChange}
                  disabled={loadingTrainings || isAssigning}
                >
                  {loadingTrainings ? (
                    <MenuItem value="">
                      <CircularProgress size={20} />
                    </MenuItem>
                  ) : (
                    trainingList.map((t) => (
                      <MenuItem
                        key={t.trainingid}
                        value={t.trainingid}
                      >
                        {t.trainingcatname} |{" "}
                        {t.trainingsubcatname} |{" "}
                        {t.trainingmodulename}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAssignSubmit}
            disabled={!selectedTrainingId || isAssigning}
          >
            {isAssigning ? "Assigning..." : "Confirm Assignment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IncubeeAssignmentTable;