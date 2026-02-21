import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Download, Trash2, Eye, Edit, Shield } from "lucide-react";
import * as XLSX from "xlsx";
import { IPAdress } from "../Datafetching/IPAdrees";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import api from "../Datafetching/api";

// Material UI imports
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  TextField,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

// Styled components for custom styling
const StyledChip = styled(Chip)(({ theme, category }) => {
  const getCategoryColor = (category) => {
    switch (category) {
      case "Financial":
        return { backgroundColor: "#e8f5e9", color: "#2e7d32" };
      case "Legal":
        return { backgroundColor: "#e3f2fd", color: "#1565c0" };
      case "Secretarial":
        return { backgroundColor: "#fff3e0", color: "#e65100" };
      default:
        return { backgroundColor: "#f3e5f5", color: "#6a1b9a" };
    }
  };

  return {
    ...getCategoryColor(category),
    fontWeight: 500,
    borderRadius: 4,
  };
});

// Configure SweetAlert2 to ensure it appears above modals
Swal.mixin({
  customClass: {
    popup: "swal2-popup-high-zindex",
  },
});

export default function CollectedDocumentsTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const incubateeId = sessionStorage.getItem("incubateeId");

  const API_BASE_URL = IPAdress;
  const isXLSXAvailable = !!XLSX;

  // --- STATE VARIABLES ---
  const [allDocuments, setAllDocuments] = useState([]);
  const [allDocumentsLoading, setAllDocumentsLoading] = useState(true);
  const [allDocumentsError, setAllDocumentsError] = useState(null);
  const [documentsWithAccess, setDocumentsWithAccess] = useState([]);
  const [documentsWithAccessLoading, setDocumentsWithAccessLoading] =
    useState(true);
  const [documentsWithAccessError, setDocumentsWithAccessError] =
    useState(null);
  const [isDeleting, setIsDeleting] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [grantAccessModalOpen, setGrantAccessModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [isSubmittingAccess, setIsSubmittingAccess] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editAccessModalOpen, setEditAccessModalOpen] = useState(false);
  const [selectedAccessRecord, setSelectedAccessRecord] = useState(null);
  const [editRoles, setEditRoles] = useState([]);
  const [editUsers, setEditUsers] = useState([]);
  const [editSelectedRole, setEditSelectedRole] = useState("");
  const [editSelectedUser, setEditSelectedUser] = useState("");
  const [editFromDate, setEditFromDate] = useState(new Date());
  const [editToDate, setEditToDate] = useState(new Date());
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editRolesLoading, setEditRolesLoading] = useState(false);
  const [editUsersLoading, setEditUsersLoading] = useState(false);

  // --- API CALLING FUNCTIONS ---

  const fetchDocuments = async () => {
    setAllDocumentsLoading(true);
    setDocumentsWithAccessLoading(true);
    setAllDocumentsError(null);
    setDocumentsWithAccessError(null);

    try {
      const collectedDocsResponse = api.post(
        "/resources/generic/getcollecteddocuments",
        { userId: userId || "8", incUserId: incUserid || "35" },
        {
          headers: {
            userid: userId || "8",
            "X-Module": "Document Management",
            "X-Action": "Fetching All Documents",
          },
        }
      );

      const accessDetailsResponse = api.post(
        "/resources/generic/getdocaccessdetails",
        { userId: userId || "1", incUserId: incUserid || "1" },
        {
          headers: {
            userid: userId || "1",
            "X-Module": "Document Management",
            "X-Action": "Fetching Document Access Details",
          },
        }
      );

      const [collectedData, accessData] = await Promise.all([
        collectedDocsResponse,
        accessDetailsResponse,
      ]);

      if (
        collectedData.data.statusCode !== 200 ||
        accessData.data.statusCode !== 200
      ) {
        throw new Error("Failed to fetch data from one or more endpoints.");
      }

      const collectedDocs = collectedData.data.data || [];
      const accessDetails = accessData.data.data || [];

      setAllDocuments(collectedDocs);

      const documentsWithAccessMerged = collectedDocs
        .map((doc) => {
          const accessDetail = accessDetails.find(
            (access) =>
              access.docaccessdocid ===
              doc.collecteddocdocumentsrecid.toString()
          );
          return { ...doc, accessDetails: accessDetail || null };
        })
        .filter((doc) => doc.accessDetails !== null);

      setDocumentsWithAccess(documentsWithAccessMerged);
    } catch (err) {
      console.error("Error fetching documents:", err);
      const errorMessage =
        err.message || "Failed to load documents. Please try again.";
      setAllDocumentsError(errorMessage);
      setDocumentsWithAccessError(errorMessage);
    } finally {
      setAllDocumentsLoading(false);
      setDocumentsWithAccessLoading(false);
    }
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const response = await api.post(
        "/resources/generic/getroledetails",
        { userId: userId || "1", userIncId: "ALL" },
        {
          headers: {
            "X-Module": "Role Management",
            "X-Action": "Fetching Roles",
          },
        }
      );
      if (response.data.statusCode === 200) {
        const filteredRoles = response.data.data.filter((role) =>
          [1, 2, 7].includes(role.rolesrecid)
        );
        setRoles(filteredRoles);
      } else {
        throw new Error(response.data.message || "Failed to fetch roles");
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch roles. Please try again.",
        icon: "error",
      });
    } finally {
      setRolesLoading(false);
    }
  };

  const fetchUsers = async (roleId) => {
    if (!roleId) return;
    setUsersLoading(true);
    try {
      const response = await api.post(
        "/resources/generic/getusers",
        { userId: userId || "1", userIncId: "1" },
        {
          headers: {
            "X-Module": "User Management",
            "X-Action": "Fetching Users",
          },
        }
      );
      if (response.data.statusCode === 200) {
        const filteredUsers = response.data.data.filter(
          (user) => user.usersrolesrecid === parseInt(roleId)
        );
        setUsers(filteredUsers);
      } else {
        throw new Error(response.data.message || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch users. Please try again.",
        icon: "error",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchEditRoles = async (currentRoleId = null) => {
    setEditRolesLoading(true);
    try {
      const response = await api.post(
        "/resources/generic/getroledetails",
        { userId: userId || "1", userIncId: "ALL" },
        {
          headers: {
            "X-Module": "Role Management",
            "X-Action": "Fetching Edit Roles",
          },
        }
      );
      if (response.data.statusCode === 200) {
        // Standard filter
        let filteredRoles = response.data.data.filter((role) =>
          [1, 2, 4, 7].includes(role.rolesrecid)
        );

        // FIX: If the role attached to the document is not in the filtered list (e.g. ID 0 or 12),
        // add it back manually so the dropdown shows the current value.
        if (currentRoleId) {
          const exists = filteredRoles.find(
            (r) => r.rolesrecid.toString() === currentRoleId.toString()
          );
          if (!exists) {
            const orphanRole = response.data.data.find(
              (r) => r.rolesrecid.toString() === currentRoleId.toString()
            );
            if (orphanRole) {
              filteredRoles.push(orphanRole);
            }
          }
        }

        setEditRoles(filteredRoles);
      } else {
        throw new Error(response.data.message || "Failed to fetch roles");
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch roles. Please try again.",
        icon: "error",
      });
    } finally {
      setEditRolesLoading(false);
    }
  };

  const fetchEditUsers = async (roleId, currentUserId = null) => {
    if (!roleId) return;
    setEditUsersLoading(true);
    try {
      const response = await api.post(
        "/resources/generic/getusers",
        { userId: userId || "1", userIncId: "1" },
        {
          headers: {
            "X-Module": "User Management",
            "X-Action": "Fetching Edit Users",
          },
        }
      );
      if (response.data.statusCode === 200) {
        // Filter by role
        let filteredUsers = response.data.data.filter(
          (user) => user.usersrolesrecid === parseInt(roleId)
        );

        // FIX: If the user attached to the document is not in this filtered list
        // (e.g. they changed roles, or the user object role ID is a string),
        // add them back manually so the dropdown shows the current user.
        if (currentUserId) {
          const exists = filteredUsers.find(
            (u) => u.usersrecid.toString() === currentUserId.toString()
          );
          if (!exists) {
            const orphanUser = response.data.data.find(
              (u) => u.usersrecid.toString() === currentUserId.toString()
            );
            if (orphanUser) {
              filteredUsers.push(orphanUser);
            }
          }
        }

        setEditUsers(filteredUsers);
      } else {
        throw new Error(response.data.message || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      Swal.fire({
        title: "Error",
        text: "Failed to fetch users. Please try again.",
        icon: "error",
      });
    } finally {
      setEditUsersLoading(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!selectedDocument || !selectedRole || !selectedUser) {
      Swal.fire({
        title: "Error",
        text: "Please fill all required fields",
        icon: "error",
      });
      return;
    }

    const currentDocument = selectedDocument;
    const currentRole = selectedRole;
    const currentUser = selectedUser;
    const currentFromDate = fromDate;
    const currentToDate = toDate;

    setGrantAccessModalOpen(false);

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Grant access to "${currentDocument.documentname}" for selected user?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, grant access!",
    });

    if (result.isConfirmed) {
      setIsSubmittingAccess(true);
      try {
        const response = await api.post(
          "/resources/generic/setdocaccess",
          {
            userid: userId || "1",
            userincid: incubateeId || "19",
            categoryid: currentDocument.collecteddoccatrecid.toString(),
            roleid: currentRole,
            userrecid: currentUser,
            docaccessdocsubcatid:
              currentDocument.collecteddocsubcatrecid.toString(),
            docaccessdocid:
              currentDocument.collecteddocdocumentsrecid.toString(),
            fromdate: currentFromDate.toISOString().split("T")[0],
            todate: currentToDate.toISOString().split("T")[0],
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Granting Document Access",
            },
          }
        );
        if (response.data.statusCode === 200) {
          Swal.fire("Success!", "Access has been granted.", "success");
          fetchDocuments();
        } else {
          throw new Error(response.data.message || "Failed to grant access");
        }
      } catch (err) {
        console.error("Error granting access:", err);
        Swal.fire(
          "Error",
          "Failed to grant access. Please try again.",
          "error"
        );
      } finally {
        setIsSubmittingAccess(false);
      }
    } else {
      setSelectedDocument(currentDocument);
      setSelectedRole(currentRole);
      setSelectedUser(currentUser);
      setFromDate(currentFromDate);
      setToDate(currentToDate);
      setGrantAccessModalOpen(true);
    }
  };

  const handleUpdateAccess = async () => {
    if (!selectedAccessRecord || !editSelectedRole || !editSelectedUser) {
      Swal.fire({
        title: "Error",
        text: "Please fill all required fields",
        icon: "error",
      });
      return;
    }

    const currentAccessRecord = selectedAccessRecord;
    const currentRole = editSelectedRole;
    const currentUser = editSelectedUser;
    const currentFromDate = editFromDate;
    const currentToDate = editToDate;

    setEditAccessModalOpen(false);

    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Update access for "${currentAccessRecord.documentname}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, update access!",
    });

    if (result.isConfirmed) {
      setIsSubmittingEdit(true);
      try {
        const response = await api.post(
          "/updateDocAccess",
          {
            docaccessrecid: currentAccessRecord.accessDetails.docaccessrecid,
            docaccessincubateesrecid: incubateeId || "35",
            // Mapping the state (which came from usersrolesrecid) back to the expected backend key
            docaccessrolerecid: currentRole,
            docaccesscatrecid: currentAccessRecord.collecteddoccatrecid,
            docaccessexpirydate: currentToDate.toISOString().split("T")[0],
            docaccessadminstate: "1",
            docaccessuserrecid: currentUser,
            docaccessdocsubcatid: currentAccessRecord.collecteddocsubcatrecid,
            docaccessfromdate: currentFromDate.toISOString().split("T")[0],
            docaccesstodate: currentToDate.toISOString().split("T")[0],
            docaccessdocid: currentAccessRecord.collecteddocdocumentsrecid,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Updating Document Access",
            },
          }
        );
        if (response.data.statusCode === 200) {
          Swal.fire("Success!", "Access has been updated.", "success");
          fetchDocuments();
        } else {
          throw new Error(response.data.message || "Failed to update access");
        }
      } catch (err) {
        console.error("Error updating access:", err);
        Swal.fire(
          "Error",
          "Failed to update access. Please try again.",
          "error"
        );
      } finally {
        setIsSubmittingEdit(false);
      }
    } else {
      setSelectedAccessRecord(currentAccessRecord);
      setEditSelectedRole(currentRole);
      setEditSelectedUser(currentUser);
      setEditFromDate(currentFromDate);
      setEditToDate(currentToDate);
      setEditAccessModalOpen(true);
    }
  };

  const handleDelete = async (row) => {
    const accessRecId = row.accessDetails?.docaccessrecid;
    if (!accessRecId) {
      Swal.fire("Error", "Cannot find access record ID to delete.", "error");
      return;
    }
    const currentRow = row;
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Delete access for "${row.documentname}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });
    if (result.isConfirmed) {
      setIsDeleting(accessRecId);
      try {
        const response = await api.post(
          "/deleteDocAccess",
          {
            docaccessrecid: accessRecId,
            docaccessmodifiedby: userId || "1",
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Deleting Document Access",
            },
          }
        );
        if (response.data.statusCode === 200) {
          Swal.fire(
            "Deleted!",
            `Access for "${row.documentname}" has been removed.`,
            "success"
          );
          setDocumentsWithAccess((prev) =>
            prev.filter(
              (doc) => doc.collecteddocrecid !== row.collecteddocrecid
            )
          );
        } else {
          throw new Error(response.data.message || "Failed to delete access");
        }
      } catch (err) {
        console.error("Error deleting access:", err);
        Swal.fire(
          "Error",
          "Failed to delete access. Please try again.",
          "error"
        );
      } finally {
        setIsDeleting(null);
      }
    }
  };

  // --- EVENT HANDLER FUNCTIONS ---
  const handleRoleChange = (event) => {
    const roleId = event.target.value;
    setSelectedRole(roleId);
    setSelectedUser("");
    fetchUsers(roleId);
  };

  const handleEditRoleChange = (event) => {
    const roleId = event.target.value;
    setEditSelectedRole(roleId);
    setEditSelectedUser("");
    fetchEditUsers(roleId, editSelectedUser);
  };

  const handleOpenGrantAccessModal = (document) => {
    setSelectedDocument(document);
    setGrantAccessModalOpen(true);
    if (roles.length === 0) {
      fetchRoles();
    }
  };

  const handleCloseGrantAccessModal = () => {
    setGrantAccessModalOpen(false);
    setSelectedDocument(null);
    setSelectedRole("");
    setSelectedUser("");
    setFromDate(new Date());
    setToDate(new Date());
  };

  // --- CRITICAL FIX: Mapping correct API fields to State ---
  const handleOpenEditAccessModal = (document) => {
    setSelectedAccessRecord(document);
    setEditAccessModalOpen(true);

    // 1. CORRECTED: Read 'usersrolesrecid' instead of 'docaccessrolerecid'
    // From JSON: "usersrolesrecid": 1
    const roleId = document.accessDetails?.usersrolesrecid?.toString() || "";
    
    // From JSON: "docaccessuserrecid": "39"
    const userId = document.accessDetails?.docaccessuserrecid?.toString() || "";
    
    setEditSelectedRole(roleId);
    setEditSelectedUser(userId);

    // 2. Parse Dates
    const fromDateStr = document.accessDetails?.docaccessfromdate;
    const toDateStr = document.accessDetails?.docaccesstodate;

    setEditFromDate(fromDateStr ? new Date(fromDateStr) : new Date());
    setEditToDate(toDateStr ? new Date(toDateStr) : new Date());

    // 3. Fetch Roles & Users
    // We pass the roleId to ensure if it's not in the standard filter, we add it back.
    if (editRoles.length === 0) {
      fetchEditRoles(roleId); 
    } else {
      const exists = editRoles.find(r => r.rolesrecid.toString() === roleId);
      if(!exists) fetchEditRoles(roleId);
    }
    
    // We pass userId to ensure "arun admin" (ID 39) appears even if role filtering hides him.
    if (roleId) {
      fetchEditUsers(roleId, userId);
    }
  };

  const handleCloseEditAccessModal = () => {
    setEditAccessModalOpen(false);
    setSelectedAccessRecord(null);
    setEditSelectedRole("");
    setEditSelectedUser("");
    setEditFromDate(new Date());
    setEditToDate(new Date());
  };

  const handleMenuOpen = (event, row) => {
    setAnchorEl(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRow(null);
  };

  const handleView = (row) => {
    if (!row) return;
    Swal.fire({
      title: row.documentname,
      html: `<div style="text-align:left;">
        <p><strong>Document Name:</strong> ${row.documentname}</p>
        <p><strong>Category:</strong> ${row.doccatname}</p>
        <p><strong>Sub-Category:</strong> ${row.docsubcatname}</p>
        <p><strong>Periodicity:</strong> ${row.docperiodicityname}</p>
        <p><strong>Upload Date:</strong> ${
          row.collecteddocuploaddate?.replace("T", " ") || "-"
        }</p>
        ${
          row.accessDetails
            ? `
          <p><strong>Access User:</strong> ${row.accessDetails.docaccessusername}</p>
          <p><strong>Access To Date:</strong> ${
            row.accessDetails.docaccesstodate || "-"
          }</p>
        `
            : ""
        }
      </div>`,
      icon: "info",
      width: "600px",
    });
  };

  const handleEdit = (row) => {
    Swal.fire({
      title: "Edit",
      text: `Editing "${row.documentname}"`,
      icon: "info",
    });
  };

  // --- USE EFFECT ---
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Define columns for ALL Documents table
  const allDocumentsColumns = [
    {
      field: "sno",
      headerName: "S.No",
      width: 80,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.api || !params.row) return "1";

        const rowIndex = params.api.getRowIndexRelativeToVisibleRows(
          params.row.id
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
      field: "documentname",
      headerName: "Document Name",
      width: 250,
      sortable: true,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: "primary.main" }}
        >
          {params.row.documentname}
        </Typography>
      ),
    },
    {
      field: "doccatname",
      headerName: "Category",
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <StyledChip
          label={params.row.doccatname}
          size="small"
          category={params.row.doccatname}
        />
      ),
    },
    {
      field: "docsubcatname",
      headerName: "Sub-Category",
      width: 280,
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2">{params.row.docsubcatname}</Typography>
      ),
    },
    {
      field: "docperiodicityname",
      headerName: "Periodicity",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Chip
          label={params.row.docperiodicityname}
          size="small"
          variant="outlined"
          color="primary"
        />
      ),
    },
    {
      field: "collecteddocuploaddate",
      headerName: "Upload Date",
      width: 180,
      sortable: true,
      renderCell: (params) =>
        params.row.collecteddocuploaddate
          ? new Date(params.row.collecteddocuploaddate).toLocaleString()
          : "-",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Grant Access">
            <IconButton
              color="primary"
              onClick={() => handleOpenGrantAccessModal(params.row)}
            >
              <Shield size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Define columns for Documents WITH ACCESS table
  const documentsWithAccessColumns = [
    {
      field: "sno",
      headerName: "S.No",
      width: 80,
      sortable: true,
      renderCell: (params) => {
        if (!params || !params.api || !params.row) return "1";

        const rowIndex = params.api.getRowIndexRelativeToVisibleRows(
          params.row.id
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
      field: "documentname",
      headerName: "Document Name",
      width: 200,
      sortable: true,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: "primary.main" }}
        >
          {params.row.documentname}
        </Typography>
      ),
    },
    {
      field: "doccatname",
      headerName: "Category",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <StyledChip
          label={params.row.doccatname}
          size="small"
          category={params.row.doccatname}
        />
      ),
    },
    {
      field: "accessDetails.usersname",
      headerName: "Access User",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.accessDetails?.docaccessusername || "-"}
        </Typography>
      ),
    },
    {
      field: "accessDetails.docaccessexpirydate",
      headerName: "Access To Date",
      width: 120,
      sortable: true,
      renderCell: (params) =>
        params.row.accessDetails?.docaccesstodate
          ? new Date(
              params.row.accessDetails.docaccesstodate
            ).toLocaleDateString()
          : "-",
    },
    {
      field: "accessDetails.createdby",
      headerName: "Created By",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Typography variant="body2">
          {params.row.accessDetails?.docaccesscreatedname || "-"}
        </Typography>
      ),
    },
    {
      field: "accessDetails.createdtime",
      headerName: "Created Time",
      width: 150,
      sortable: true,
      renderCell: (params) =>
        params.row.accessDetails?.docaccesscreatedtime
          ? new Date(
              params.row.accessDetails.docaccesscreatedtime
            ).toLocaleString()
          : "-",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Edit Access">
            <IconButton
              color="primary"
              onClick={() => handleOpenEditAccessModal(params.row)}
            >
              <Edit size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              color="error"
              onClick={() => handleDelete(params.row)}
              disabled={isDeleting === params.row.accessDetails?.docaccessrecid}
            >
              {isDeleting === params.row.accessDetails?.docaccessrecid ? (
                <CircularProgress size={20} />
              ) : (
                <Trash2 size={18} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  // Custom export function for ALL documents
  const onExportAllDocumentsData = (data) => {
    return data.map((item) => ({
      "Document Name": item.documentname || "",
      Category: item.doccatname || "",
      "Sub-Category": item.docsubcatname || "",
      Periodicity: item.docperiodicityname || "",
      "Upload Date": item.collecteddocuploaddate?.replace("T", " ") || "",
    }));
  };

  // Custom export function for documents WITH ACCESS
  const onExportDocumentsWithAccessData = (data) => {
    return data.map((item) => ({
      "Document Name": item.documentname || "",
      Category: item.doccatname || "",
      "Access User": item.accessDetails?.docaccessusername || "",
      "Access To Date": item.accessDetails?.docaccesstodate || "",
      "Upload Date": item.collecteddocuploaddate?.replace("T", " ") || "",
    }));
  };

  // Export configurations
  const allDocumentsExportConfig = {
    filename: "all_documents",
    sheetName: "All Documents",
  };

  const documentsWithAccessExportConfig = {
    filename: "documents_with_access",
    sheetName: "Documents With Access",
  };

  // Add IDs to rows if they don't have them
  const rowsWithIdForAll = allDocuments.map((item) => ({
    ...item,
    id: item.collecteddocrecid || Math.random().toString(36).substr(2, 9),
  }));

  const rowsWithIdForAccess = documentsWithAccess.map((item) => ({
    ...item,
    id: item.collecteddocrecid || Math.random().toString(36).substr(2, 9),
  }));

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <style jsx global>{`
        .swal2-popup-high-zindex {
          z-index: 99999 !important;
        }
      `}</style>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          📄 Uploaded Documents
        </Typography>
        <Button
          variant="contained"
          onClick={fetchDocuments}
          disabled={allDocumentsLoading || documentsWithAccessLoading}
          startIcon={
            allDocumentsLoading || documentsWithAccessLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : null
          }
        >
          {allDocumentsLoading || documentsWithAccessLoading
            ? "Loading..."
            : "Refresh Data"}
        </Button>
      </Box>

      {/* --- TABLE 1: ALL UPLOADED DOCUMENTS --- */}
      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        ></Box>

        {allDocumentsError && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: "error.light",
              color: "error.contrastText",
              borderRadius: 1,
            }}
          >
            {allDocumentsError}
          </Box>
        )}

        <ReusableDataGrid
          data={rowsWithIdForAll}
          columns={allDocumentsColumns}
          title=""
          enableExport={true}
          enableColumnFilters={true}
          searchPlaceholder="Search by name, category, sub-category..."
          searchFields={["documentname", "doccatname", "docsubcatname"]}
          uniqueIdField="collecteddocrecid"
          onExportData={onExportAllDocumentsData}
          exportConfig={allDocumentsExportConfig}
          className="all-documents-table"
        />

        <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Total: ${allDocuments.length} documents`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Financial: ${
              allDocuments.filter((d) => d.doccatname === "Financial").length
            }`}
            sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
          />
          <Chip
            label={`Legal: ${
              allDocuments.filter((d) => d.doccatname === "Legal").length
            }`}
            sx={{ backgroundColor: "#e3f2fd", color: "#1565c0" }}
          />
          <Chip
            label={`Secretarial: ${
              allDocuments.filter((d) => d.doccatname === "Secretarial").length
            }`}
            sx={{ backgroundColor: "#fff3e0", color: "#e65100" }}
          />
        </Box>
      </Box>

      {/* --- TABLE 2: DOCUMENTS WITH ACCESS DETAILS --- */}
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h5" component="h2">
            🔐 Documents with Access Details
          </Typography>
        </Box>

        {documentsWithAccessError && (
          <Box
            sx={{
              mb: 2,
              p: 2,
              bgcolor: "error.light",
              color: "error.contrastText",
              borderRadius: 1,
            }}
          >
            {documentsWithAccessError}
          </Box>
        )}

        <ReusableDataGrid
          data={rowsWithIdForAccess}
          columns={documentsWithAccessColumns}
          title=""
          enableExport={true}
          enableColumnFilters={true}
          searchPlaceholder="Search by name, category, user..."
          searchFields={[
            "documentname",
            "doccatname",
            "accessDetails.docaccessusername",
          ]}
          uniqueIdField="collecteddocrecid"
          onExportData={onExportDocumentsWithAccessData}
          exportConfig={documentsWithAccessExportConfig}
          className="documents-with-access-table"
        />

        <Box sx={{ mt: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Chip
            label={`Total: ${documentsWithAccess.length} documents`}
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`Financial: ${
              documentsWithAccess.filter((d) => d.doccatname === "Financial")
                .length
            }`}
            sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32" }}
          />
          <Chip
            label={`Legal: ${
              documentsWithAccess.filter((d) => d.doccatname === "Legal").length
            }`}
            sx={{ backgroundColor: "#e3f2fd", color: "#1565c0" }}
          />
          <Chip
            label={`Secretarial: ${
              documentsWithAccess.filter((d) => d.doccatname === "Secretarial")
                .length
            }`}
            sx={{ backgroundColor: "#fff3e0", color: "#e65100" }}
          />
        </Box>
      </Box>

      {/* Grant Access Modal */}
      <Dialog
        open={grantAccessModalOpen}
        onClose={handleCloseGrantAccessModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Grant Document Access</DialogTitle>
        <DialogContent>
          {selectedDocument && (
            <Box
              sx={{ mb: 3, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Document Details
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {selectedDocument.documentname}
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> {selectedDocument.doccatname}
              </Typography>
              <Typography variant="body2">
                <strong>Sub-Category:</strong> {selectedDocument.docsubcatname}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={selectedRole}
                label="Role"
                onChange={handleRoleChange}
                disabled={rolesLoading}
              >
                {roles.map((role) => (
                  <MenuItem key={role.rolesrecid} value={role.rolesrecid.toString()}>
                    {role.rolesname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="user-select-label">User</InputLabel>
              <Select
                labelId="user-select-label"
                id="user-select"
                value={selectedUser}
                label="User"
                onChange={(e) => setSelectedUser(e.target.value)}
                disabled={!selectedRole || usersLoading}
              >
                {users.map((user) => (
                  <MenuItem key={user.usersrecid} value={user.usersrecid.toString()}>
                    {user.usersname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={fromDate}
                onChange={(newValue) => setFromDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />

              <DatePicker
                label="To Date"
                value={toDate}
                onChange={(newValue) => setToDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseGrantAccessModal}>Cancel</Button>
          <Button
            onClick={handleGrantAccess}
            variant="contained"
            disabled={isSubmittingAccess || !selectedRole || !selectedUser}
            startIcon={
              isSubmittingAccess ? <CircularProgress size={20} /> : null
            }
          >
            {isSubmittingAccess ? "Granting..." : "Grant Access"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Access Modal */}
      <Dialog
        open={editAccessModalOpen}
        onClose={handleCloseEditAccessModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Document Access</DialogTitle>
        <DialogContent>
          {selectedAccessRecord && (
            <Box
              sx={{ mb: 3, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Document Details
              </Typography>
              <Typography variant="body2">
                <strong>Name:</strong> {selectedAccessRecord.documentname}
              </Typography>
              <Typography variant="body2">
                <strong>Category:</strong> {selectedAccessRecord.doccatname}
              </Typography>
              <Typography variant="body2">
                <strong>Sub-Category:</strong>{" "}
                {selectedAccessRecord.docsubcatname}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="edit-role-select-label">Role</InputLabel>
              <Select
                labelId="edit-role-select-label"
                id="edit-role-select"
                value={editSelectedRole}
                label="Role"
                onChange={handleEditRoleChange}
                disabled={editRolesLoading}
              >
                {editRoles.map((role) => (
                  <MenuItem key={role.rolesrecid} value={role.rolesrecid.toString()}>
                    {role.rolesname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="edit-user-select-label">User</InputLabel>
              <Select
                labelId="edit-user-select-label"
                id="edit-user-select"
                value={editSelectedUser}
                label="User"
                onChange={(e) => setEditSelectedUser(e.target.value)}
                disabled={!editSelectedRole || editUsersLoading}
              >
                {editUsers.map((user) => (
                  <MenuItem key={user.usersrecid} value={user.usersrecid.toString()}>
                    {user.usersname}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={editFromDate}
                onChange={(newValue) => setEditFromDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />

              <DatePicker
                label="To Date (Expiry)"
                value={editToDate}
                onChange={(newValue) => setEditToDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditAccessModal}>Cancel</Button>
          <Button
            onClick={handleUpdateAccess}
            variant="contained"
            disabled={
              isSubmittingEdit || !editSelectedRole || !editSelectedUser
            }
            startIcon={isSubmittingEdit ? <CircularProgress size={20} /> : null}
          >
            {isSubmittingEdit ? "Updating..." : "Update Access"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}