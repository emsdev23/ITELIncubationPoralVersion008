import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Download } from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  TextField,
  Box,
  Button,
  Paper,
  Typography,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import ReusableDataGrid from "./Datafetching/ReusableDataGrid";
import api from "./Datafetching/api"; // Import the reusable component
import * as XLSX from "xlsx";

// Styled components
const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiDialog-paper": {
    maxWidth: "1200px",
    width: "100%",
    maxHeight: "90vh",
  },
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

const StatusChip = styled("div")(({ theme, status }) => ({
  backgroundColor:
    status === 200 ? theme.palette.success.light : theme.palette.error.light,
  color: status === 200 ? theme.palette.success.dark : theme.palette.error.dark,
  fontWeight: 600,
  padding: "4px 8px",
  borderRadius: "4px",
  display: "inline-block",
}));

// Date formatting function to handle "2025-11-11T07:32:53Z[UTC]" format
const formatDate = (dateString) => {
  if (!dateString) return "-";

  try {
    // Handle Z[UTC] format by removing [UTC] and parsing rest
    const cleanTimestamp = dateString.replace("[UTC]", "");
    const date = new Date(cleanTimestamp);

    // Check if the date is valid before formatting
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return dateString; // Return original string as a fallback
  }
};

// Get today's date in YYYY-MM-DD format
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const AuditLogsModal = ({ isOpen, onClose, IPAddress, token, userid }) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch logs function
  const fetchLogs = async () => {
    if (!isOpen) return;

    setLoading(true);
    setError("");

    try {
      const start = startDate || getTodayString();
      const end = endDate || getTodayString();

      const response = await api.post(
        "/resources/generic/getauditlogs",
        {
          startDate: `${start} 00:00:00`,
          endDate: `${end} 23:59:59`,
          userId: "userid",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = response.data;
      // setLogs(result.data);
      // const data = response.data;
      if (result.data) {
        setLogs(result.data);
      } else {
        setError(result.message || "Failed to fetch logs");
      }
    } catch (err) {
      setError("Error fetching logs: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refetch logs when date or modal open state changes
  useEffect(() => {
    fetchLogs();
  }, [IPAddress, token, userid, startDate, endDate, isOpen]);

  // Define columns for ReusableDataGrid
  const columns = [
    {
      field: "usersname",
      headerName: "User Name",
      width: 200,
      sortable: true,
    },
    {
      field: "auditlogModule",
      headerName: "Module",
      width: 180,
      sortable: true,
    },
    {
      field: "auditlogAction",
      headerName: "Action",
      width: 200,
      sortable: true,
    },
    {
      field: "auditlogMessage",
      headerName: "Status Message",
      width: 200,
      sortable: true,
    },
    {
      field: "auditlogTimestampEnd",
      headerName: "Time Stamp",
      width: 200,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.row) return "-";
        return formatDate(params.row.auditlogTimestampEnd);
      },
    },
  ];

  // Define dropdown filters for status
  const dropdownFilters = [
    {
      field: "auditlogStatus",
      label: "Status",
      width: 150,
      options: [
        { value: "all", label: "All Status" },
        { value: "200", label: "Success" },
        { value: "400", label: "Client Error" },
        { value: "500", label: "Server Error" },
      ],
    },
  ];

  // Custom export function to format data properly
  const onExportData = (data) => {
    return data.map((log) => ({
      "User Name": log.usersname || "",
      Module: log.auditlogModule || "",
      Action: log.auditlogAction || "",
      "Status Message": log.auditlogMessage || "",
      Status: log.auditlogStatus || "",
      "Duration (ms)": log.auditlogDurationMs || "",
      "Start Time": formatDate(log.auditlogTimestampStart),
      "End Time": formatDate(log.auditlogTimestampEnd),
    }));
  };

  // Export configuration
  const exportConfig = {
    filename: `audit-logs-${getTodayString()}`,
    sheetName: "Audit Logs",
  };

  return (
    <StyledDialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h5" component="div">
          Audit Logs
        </Typography>
        <IconButton edge="end" onClick={onClose}>
          <X />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Filters */}
        <StyledPaper elevation={1} sx={{ p: 2 }}>
          <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
            <TextField
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 200 }}
            />

            <TextField
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: startDate }}
              sx={{ minWidth: 200 }}
            />

            <Button
              variant="contained"
              startIcon={
                loading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <Search size={18} />
                )
              }
              disabled={loading}
              onClick={fetchLogs}
            >
              {loading ? "Loading..." : "Fetch Logs"}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </StyledPaper>

        {/* Use the ReusableDataGrid component */}
        <ReusableDataGrid
          data={logs}
          columns={columns}
          title=""
          enableExport={true}
          enableColumnFilters={true}
          searchPlaceholder="Search by user, module, or action..."
          searchFields={["usersname", "auditlogModule", "auditlogAction"]}
          dropdownFilters={dropdownFilters}
          uniqueIdField="auditlogId"
          onExportData={onExportData}
          exportConfig={exportConfig}
          className="audit-logs-grid"
          loading={loading}
        />

        {logs.length === 0 && !loading && (
          <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
            No logs found matching your criteria.
          </Box>
        )}
      </DialogContent>
    </StyledDialog>
  );
};

export default AuditLogsModal;
