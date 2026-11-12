import React, { useState, useContext, useEffect, useMemo } from "react";
import styles from "../CompanyTable.module.css";
import api from "../Datafetching/api";
import Swal from "sweetalert2";
import style from "../StartupDashboard/StartupDashboard.module.css";
import * as XLSX from "xlsx";
import { IPAdress, normalizeFileUrl } from "../Datafetching/IPAdrees";
import { Download, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DataContext } from "../Datafetching/DataProvider";

// Import the ReusableDataGrid component
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";

// Material UI imports
import {
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  IconButton,
  Modal,
  CircularProgress,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled components for custom styling
const StyledChip = styled(Chip)(({ theme, stage }) => {
  const getStageColor = (stage) => {
    switch (stage) {
      case 1:
        return { backgroundColor: "#e0e7ff", color: "#4338ca" }; // Pre Seed
      case 2:
        return { backgroundColor: "#dbeafe", color: "#1e40af" }; // Seed
      case 3:
        return { backgroundColor: "#d1fae5", color: "#065f46" }; // Early
      case 4:
        return { backgroundColor: "#fef3c7", color: "#92400e" }; // Growth
      case 5:
        return { backgroundColor: "#ede9fe", color: "#5b21b6" }; // Expansion
      default:
        return { backgroundColor: "#f3f4f6", color: "#374151" };
    }
  };

  return {
    ...getStageColor(stage),
    fontWeight: 500,
    borderRadius: 4,
  };
});

const VisibilityButton = styled(Button)(({ theme, visible }) => ({
  padding: "0.4rem 0.8rem",
  borderRadius: "0.3rem",
  border: "none",
  cursor: "pointer",
  fontWeight: "500",
  fontSize: "0.875rem",
  transition: "all 0.2s",
  backgroundColor: visible ? "#10b981" : "#ef4444",
  color: "#fff",
  "&:hover": {
    backgroundColor: visible ? "#059669" : "#dc2626",
  },
}));

// Common date formatting function
const formatDate = (dateString) => {
  if (!dateString) return "-";

  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    console.error("Error parsing date:", error);
    return dateString;
  }
};

export default function DDIDocumentsTable({ userRecID = "ALL" }) {
  const navigate = useNavigate();
  const { roleid, incuserid, userid } = useContext(DataContext);

  const usersrecid = roleid === 7 ? "ALL" : userRecID;
  console.log("User Rec ID:", usersrecid);
  console.log(userRecID);

  // Condition check to visibility state
  const isAdminRole =
    Number(roleid) === 1 || Number(roleid) === 3 || Number(roleid) === 7;
  const isStartupDashboard = location.pathname === "/startup/Dashboard";
  const shouldShowVisibilityColumn = isAdminRole && !isStartupDashboard;

  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // NEW: Add state for preview document details
  const [previewDocumentName, setPreviewDocumentName] = useState("");
  const [previewFilepath, setPreviewFilepath] = useState("");

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasFetchedData, setHasFetchedData] = useState(false);

  // Filters & Pagination
  const [togglingDoc, setTogglingDoc] = useState(null);

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Fetch DDI Documents from API
  useEffect(() => {
    const fetchDDIDocuments = async () => {
      try {
        setLoading(true);
        setError("");
        setHasFetchedData(false);

        const response = await api.post(
          "resources/generic/getddidocs",
          { userId: usersrecid, incUserId: incuserid },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              userid: usersrecid || "1",
              "X-Module": "DDI Documents",
              "X-Action": "Fetching DDI Documents List",
            },
          },
        );

        if (response.data?.statusCode === 200) {
          // Normalize API data so visibility is consistent
          const normalized = response.data.data.map((doc) => ({
            ...doc,
            ddidocumentsvisibility: doc.ddidocumentsvisibilitystate,
          }));
          setDocuments(normalized);
          setHasFetchedData(true);
        } else {
          if (
            response.data?.statusCode === 404 ||
            (response.data?.message &&
              response.data.message.toLowerCase().includes("no documents"))
          ) {
            setDocuments([]);
            setHasFetchedData(true);
          } else {
            setError(response.data?.message || "Failed to fetch documents");
          }
        }
      } catch (error) {
        console.error("Error fetching DDI documents:", error);
        if (error.response && error.response.status === 404) {
          setDocuments([]);
          setHasFetchedData(true);
        } else {
          setError("Error fetching documents. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDDIDocuments();
  }, [usersrecid, incuserid]);

  // Unique Companies for filter
  const uniqueCompanies = useMemo(() => {
    return Array.from(
      new Map(documents.map((doc) => [doc.incubateesname, doc])).values(),
    );
  }, [documents]);

  // Define dropdown filters for ReusableDataGrid
  const dropdownFilters = [
    {
      field: "ddidocumentsstartupstagesrecid",
      label: "Stage",
      width: 150,
      options: [
        { value: "all", label: "All Stages" },
        { value: "1", label: "Pre Seed" },
        { value: "2", label: "Seed Stage" },
        { value: "3", label: "Early Stage" },
        { value: "4", label: "Growth Stage" },
        { value: "5", label: "Expansion Stage" },
      ],
    },
    {
      field: "incubateesname",
      label: "Company",
      width: 200,
      options: [
        { value: "all", label: "All Companies" },
        ...uniqueCompanies.map((company) => ({
          value: company.incubateesname,
          label: company.incubateesname,
        })),
      ],
    },
  ];

  const allowedRolesForActions = [7, 4];
  // Define columns for ReusableDataGrid
  const columns = [
    {
      field: "ddidocumentsname",
      headerName: "Document Name",
      width: 250,
      sortable: true,
      renderCell: (params) => {
        return (
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <span style={{ marginRight: "8px" }}>📄</span>
            {params.value}
          </Box>
        );
      },
    },
    {
      field: "incubateesname",
      headerName: "Company",
      width: 200,
      sortable: true,
    },
    {
      field: "startupstagesname", // Use the stage name field for both display and search
      headerName: "Stage",
      width: 150,
      sortable: true,
      type: "chip",
      chipColors: {
        "Pre Seed": { backgroundColor: "#e0e7ff", color: "#4338ca" },
        "Seed Stage": { backgroundColor: "#dbeafe", color: "#1e40af" },
        "Early Stage": { backgroundColor: "#d1fae5", color: "#065f46" },
        "Growth Stage": { backgroundColor: "#fef3c7", color: "#92400e" },
        "Expansion Stage": { backgroundColor: "#ede9fe", color: "#5b21b6" },
      },
    },
    {
      field: "uploadedbyname",
      headerName: "Uploaded By",
      width: 180,
      sortable: true,
    },
    {
      field: "ddidocumentscreatedtime",
      headerName: "Upload Date",
      width: 150,
      sortable: true,
      type: "date",
    },
    ...(shouldShowVisibilityColumn
      ? [
          {
            field: "ddidocumentsvisibility",
            headerName: "Incubatee Visibility",
            width: 180,
            sortable: true,
            renderCell: (params) => {
              if (!params || !params.row) return null;
              return (
                <VisibilityButton
                  visible={params.row.ddidocumentsvisibility === 1}
                  disabled={togglingDoc === params.row.ddidocumentsrecid}
                >
                  {params.row.ddidocumentsvisibility === 1 ? "OK" : "NO"}
                </VisibilityButton>
              );
            },
          },
        ]
      : []),

    {
      // --- THIS IS THE CORRECTED PART ---
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      type: "actions",
      // Use the 'hidden' property to control visibility
      hidden: !allowedRolesForActions.includes(Number(roleid)),
      actions: [
        {
          label: "View Document",
          onClick: (row) =>
            handleViewDocument(row.ddidocumentsfilepath, row.ddidocumentsname),
          color: "primary",
          size: "small",
        },
      ],
    },
  ];

  // Helper function to download file with proper name
  const downloadFile = async (fileUrl, documentName, originalFilepath) => {
    try {
      const response = await fetch(fileUrl, { mode: "cors" });
      const blob = await response.blob();

      const fileExtension = originalFilepath.split(".").pop().toLowerCase();

      const now = new Date();
      const timestamp = `${now.getFullYear()}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours(),
      ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(
        now.getSeconds(),
      ).padStart(2, "0")}`;

      const newFileName = `${documentName}_${timestamp}.${fileExtension}`;

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading file:", err);
      Swal.fire({
        icon: "error",
        title: "Download Failed",
        text: "Unable to download file. Please try again.",
      });
    }
  };

  // View/Download Document
  const handleViewDocument = async (filepath, documentName) => {
    try {
      const token = sessionStorage.getItem("token");

      const response = await api.post(
        "/resources/generic/getfileurl",

        {
          // 2. The data object (will be encrypted by the interceptor)
          userid: userid,
          incUserid: incuserid,
          url: filepath,
        },
        {
          // 3. The config object for custom headers
          headers: {
            "X-Module": "DDI Documents",
            "X-Action": "DDI Document preview",
          },
        },
      );

      // if (!response.ok)
      //   throw new Error(`HTTP error! status: ${response.status}`);

      const data = response.data;

      if (data.statusCode === 200 && data.data) {
        const fileUrl = normalizeFileUrl(data.data);
        const fileExtension = filepath.split(".").pop().toLowerCase();
        const previewable = ["pdf", "png", "jpeg", "jpg"];

        // Store all necessary information for preview and download
        setPreviewUrl(fileUrl);
        setPreviewDocumentName(documentName);
        setPreviewFilepath(filepath);

        if (previewable.includes(fileExtension)) {
          setIsPreviewOpen(true);
        } else {
          Swal.fire({
            icon: "info",
            title: "No Preview Available",
            text: "This document cannot be previewed. Click download to get the file.",
            showCancelButton: true,
            confirmButtonText: "Download",
            cancelButtonText: "Cancel",
          }).then((result) => {
            if (result.isConfirmed) {
              downloadFile(fileUrl, documentName, filepath);
            }
          });
        }
      } else {
        throw new Error(
          data.response.data.message || "Failed to fetch document",
        );
      }
    } catch (error) {
      console.error("Error fetching file:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Unable to load document: " + error.response.data.message,
      });
    }
  };

  // Custom export function for DDI documents
  const onExportData = (data) => {
    return data.map((item) => ({
      "Document Name": item.ddidocumentsname || "",
      Company: item.incubateesname || "",
      Stage: item.startupstagesname || "",
      "Uploaded By": item.uploadedbyname || "",
      "Upload Date": formatDate(item.ddidocumentscreatedtime),
      Visibility: item.ddidocumentsvisibility === 1 ? "Enabled" : "Disabled",
    }));
  };

  // Export configuration
  const exportConfig = {
    filename: "ddi_documents",
    sheetName: "DDI Documents",
  };

  // Loading & Error states
  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>DDI Documents</h2>
        </div>
        <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
          <CircularProgress />
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>DDI Documents</h2>
        </div>
        <Box sx={{ p: 2, color: "error.main" }}>{error}</Box>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <Typography variant="h5">Due Diligence Document Submission</Typography>
      </div>

      {/* Use the ReusableDataGrid component */}
      <ReusableDataGrid
        data={documents}
        columns={columns}
        title=""
        searchPlaceholder="Search documents, companies, or uploaders..."
        searchFields={[
          "incubateesname",
          "ddidocumentsname",
          "uploadedbyname",
          "startupstagesname",
        ]}
        uniqueIdField="ddidocumentsrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        enableExport={true}
        enableColumnFilters={true}
        dropdownFilters={dropdownFilters}
      />

      {hasFetchedData && documents.length === 0 && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          No documents uploaded
        </Box>
      )}

      {/* Preview Modal with Download Button */}
      <Modal
        open={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        aria-labelledby="document-preview-modal"
        aria-describedby="modal for document preview"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            maxHeight: "90vh",
            overflow: "auto",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">
              Document Preview: {previewDocumentName}
            </Typography>
            <Box>
              <Button
                variant="contained"
                startIcon={<Download />}
                onClick={() => {
                  if (previewUrl && previewDocumentName && previewFilepath) {
                    downloadFile(
                      previewUrl,
                      previewDocumentName,
                      previewFilepath,
                    );
                  }
                }}
                sx={{ mr: 2 }}
              >
                Download
              </Button>
              <IconButton onClick={() => setIsPreviewOpen(false)}>
                <span style={{ fontSize: "24px" }}>✖</span>
              </IconButton>
            </Box>
          </Box>
          <Box
            sx={{
              height: "500px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {previewUrl && (
              <>
                {previewUrl.endsWith(".pdf") ? (
                  <iframe
                    src={previewUrl}
                    title="Document Preview"
                    width="100%"
                    height="100%"
                    style={{ border: "none" }}
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt={previewDocumentName}
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                )}
              </>
            )}
          </Box>
        </Box>
      </Modal>
    </div>
  );
}
