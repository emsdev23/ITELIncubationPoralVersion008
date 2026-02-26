import React, { useEffect, useState, useMemo, useContext } from "react";
import Swal from "sweetalert2";
import { FaEdit, FaPlus, FaSpinner, FaFilter, FaTimes } from "react-icons/fa";
import { Download } from "lucide-react";
import "./UserTable.css";
import { IPAdress } from "../Datafetching/IPAdrees";
import * as XLSX from "xlsx";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess";
import { DataContext } from "../Datafetching/DataProvider"; // Import Context

// Material UI imports
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import {
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Backdrop,
  Tooltip,
  Popover,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import EditIcon from "@mui/icons-material/Edit";

import ToggleOnIcon from "@mui/icons-material/ToggleOn";
import ToggleOffIcon from "@mui/icons-material/ToggleOff";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

// Styled components
const StyledPaper = styled(Paper)(({ theme }) => ({
  width: "100%",
  marginBottom: theme.spacing(2),
}));

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
          : color === "disable"
            ? theme.palette.grey[500]
            : theme.palette.success.main,
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit"
        ? theme.palette.primary.dark
        : color === "on"
          ? theme.palette.success.dark
          : color === "off"
            ? theme.palette.grey[700]
            : color === "disable"
              ? theme.palette.grey[700]
              : theme.palette.success.dark,
  },
  "&.disabled": {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[500],
    cursor: "not-allowed",
  },
}));

// ─────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────
const VALIDATION_STYLES = `
  .swal-form-container { display: flex; flex-direction: column; gap: 4px; }
  .swal-form-row { width: 100%; margin-bottom: 8px; }
  .swal2-input, .swal2-select { width: 100% !important; margin: 0 !important; }
  .swal2-select { padding: 0.75em !important; }
  input[readonly] { background-color: #f8f9fa; cursor: not-allowed; opacity: 0.8; }
  select:disabled { background-color: #f8f9fa; cursor: not-allowed; opacity: 0.8; }
  .field-error {
    color: #d32f2f;
    font-size: 12px;
    margin-top: 4px;
    display: none;
    align-items: center;
    gap: 4px;
  }
  .field-error.visible { display: flex; }
  .swal2-input.invalid { border-color: #d32f2f !important; box-shadow: 0 0 0 2px rgba(211,47,47,0.2) !important; }
  .swal2-input.valid { border-color: #2e7d32 !important; box-shadow: 0 0 0 2px rgba(46,125,50,0.2) !important; }
`;

const validators = {
  usersname: (val) => {
    if (!val || !val.trim()) return "Name is required.";
    if (val.trim().length < 3) return "Name must be at least 3 characters.";
    if (/[^a-zA-Z0-9 _-]/.test(val))
      return "Name cannot contain special characters (allowed: letters, numbers, space, _ -)";
    return "";
  },
  usersemail: (val) => {
    if (!val || !val.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()))
      return "Please enter a valid email address.";
    return "";
  },
  userspassword: (val) => {
    if (!val || !val.trim()) return "Password is required.";
    if (val.length < 8) return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(val))
      return "Password must contain at least one uppercase letter.";
    if (!/[0-9]/.test(val)) return "Password must contain at least one number.";
    return "";
  },
};

/**
 * Attach real-time validation to an input element.
 * @param {HTMLInputElement} input
 * @param {'usersname'|'usersemail'|'userspassword'} field
 */
function attachValidation(input, field) {
  if (!input) return;
  const errorEl = document.getElementById(`error-${field}`);

  const validate = () => {
    const msg = validators[field](input.value);
    if (msg) {
      input.classList.add("invalid");
      input.classList.remove("valid");
      if (errorEl) {
        errorEl.textContent = `⚠ ${msg}`;
        errorEl.classList.add("visible");
      }
    } else {
      input.classList.remove("invalid");
      input.classList.add("valid");
      if (errorEl) {
        errorEl.textContent = "";
        errorEl.classList.remove("visible");
      }
    }
  };

  input.addEventListener("input", validate);
  input.addEventListener("blur", validate);
}

/**
 * Returns true if ALL validated fields pass.
 */
function validateAllFields(fields) {
  let allValid = true;
  fields.forEach(({ id, field }) => {
    const input = document.getElementById(id);
    if (!input) return;
    const errorEl = document.getElementById(`error-${field}`);
    const msg = validators[field](input.value);
    if (msg) {
      allValid = false;
      input.classList.add("invalid");
      input.classList.remove("valid");
      if (errorEl) {
        errorEl.textContent = `⚠ ${msg}`;
        errorEl.classList.add("visible");
      }
    }
  });
  return allValid;
}

export default function UserTable() {
  // --- CONTEXT & ACCESS CONTROL ---
  const { menuItemsFromAPI } = useContext(DataContext);

  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/TrainingManagementPage",
  );

  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const roleId = sessionStorage.getItem("roleid");
  const IP = IPAdress;
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roles, setRoles] = useState([]);
  const [incubatees, setIncubatees] = useState([]);
  const [incubations, setIncubations] = useState([]);
  const [dropdownsLoading, setDropdownsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncubation, setSelectedIncubation] = useState(null);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const [columnFilters, setColumnFilters] = useState({
    usersname: "",
    usersemail: "",
    rolesname: "",
    userscreatedtime: "",
    usersmodifiedtime: "",
    userscreatedby: "",
    usersmodifiedby: "",
  });

  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);

  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(null);
  const [isToggling, setIsToggling] = useState(null);

  const isXLSXAvailable = !!XLSX;
  const INCUBATEE_ROLE_IDS = [4, 5, 6];
  const rolebaseincuserid = roleId === "0" ? 1 : incUserid;
  const canSelectIncubation = roleId === "0";
  const isIncubateeEnabled = selectedIncubation !== null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date
        .toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .replace(",", "");
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateStr;
    }
  };

  const filteredData = useMemo(() => {
    let result = users;

    if (searchQuery.trim() !== "") {
      result = result.filter((user) =>
        user.usersname.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    result = result.filter((user) => {
      const matchesName =
        !columnFilters.usersname ||
        (user.usersname || "")
          .toLowerCase()
          .includes(columnFilters.usersname.toLowerCase());

      const matchesEmail =
        !columnFilters.usersemail ||
        (user.usersemail || "")
          .toLowerCase()
          .includes(columnFilters.usersemail.toLowerCase());

      const matchesRole =
        !columnFilters.rolesname ||
        (user.rolesname || "")
          .toLowerCase()
          .includes(columnFilters.rolesname.toLowerCase());

      const matchesCreatedTime =
        !columnFilters.userscreatedtime ||
        formatDate(user.userscreatedtime)
          .toLowerCase()
          .includes(columnFilters.userscreatedtime.toLowerCase());

      const matchesModifiedTime =
        !columnFilters.usersmodifiedtime ||
        formatDate(user.usersmodifiedtime)
          .toLowerCase()
          .includes(columnFilters.usersmodifiedtime.toLowerCase());

      const matchesCreatedBy =
        !columnFilters.userscreatedby ||
        (user.userscreatedby || "")
          .toLowerCase()
          .includes(columnFilters.userscreatedby.toLowerCase());

      const matchesModifiedBy =
        !columnFilters.usersmodifiedby ||
        (user.usersmodifiedby || "")
          .toLowerCase()
          .includes(columnFilters.usersmodifiedby.toLowerCase());

      return (
        matchesName &&
        matchesEmail &&
        matchesRole &&
        matchesCreatedTime &&
        matchesModifiedTime &&
        matchesCreatedBy &&
        matchesModifiedBy
      );
    });

    return result;
  }, [users, searchQuery, columnFilters]);

  const clearSearch = () => setSearchQuery("");
  const handleIncubationSelect = (incubation) =>
    setSelectedIncubation(incubation);

  const exportToCSV = () => {
    const exportData = filteredData.map((user, index) => ({
      "S.No": index + 1,
      Name: user.usersname || "",
      Email: user.usersemail || "",
      Role: user.rolesname || "",
      Status: user.usersadminstate === 1 ? "Enabled" : "Disabled",
      "Created Time": formatDate(user.userscreatedtime),
      "Modified Time": formatDate(user.usersmodifiedtime),
      "Created By": user.userscreatedby || "",
      "Modified By": user.usersmodifiedby || "",
    }));

    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `users_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (!isXLSXAvailable) {
      console.error("XLSX library not available");
      alert("Excel export is not available. Please install the xlsx package.");
      return;
    }

    try {
      const exportData = filteredData.map((user, index) => ({
        "S.No": index + 1,
        Name: user.usersname || "",
        Email: user.usersemail || "",
        Role: user.rolesname || "",
        Status: user.usersadminstate === 1 ? "Enabled" : "Disabled",
        "Created Time": formatDate(user.userscreatedtime),
        "Modified Time": formatDate(user.usersmodifiedtime),
        "Created By": user.userscreatedby || "",
        "Modified By": user.usersmodifiedby || "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, "Users");
      XLSX.writeFile(wb, `users_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Error exporting to Excel. Falling back to CSV export.");
      exportToCSV();
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "usersname",
        headerName: "Name",
        width: 150,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Name</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "usersname")}
                color={columnFilters.usersname ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "usersemail",
        headerName: "Email",
        width: 230,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Email</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "usersemail")}
                color={columnFilters.usersemail ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "rolesname",
        headerName: "Role Name",
        width: 180,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Role Name</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "rolesname")}
                color={columnFilters.rolesname ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
        renderCell: (params) => {
          if (!params || !params.row)
            return <Chip label="Unknown Role" size="small" />;
          return (
            <Chip
              label={params.row.rolesname || "Unknown Role"}
              size="small"
              variant="outlined"
            />
          );
        },
      },
      {
        field: "usersactivestate",
        headerName: "Status",
        width: 150,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Status</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "usersactivestate")}
                color={columnFilters.usersactivestate ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
        renderCell: (params) => {
          const value = params.value;
          const color = value === "Active" ? "green" : "red";
          return <span style={{ fontWeight: 600, color }}>{value}</span>;
        },
      },
      {
        field: "userscreatedtime",
        headerName: "Created Time",
        width: 180,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Created Time</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "userscreatedtime")}
                color={columnFilters.userscreatedtime ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
        valueGetter: (params) => {
          if (!params || !params.row) return null;
          return params.row.userscreatedtime
            ? new Date(params.row.userscreatedtime)
            : null;
        },
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          return formatDate(params.row.userscreatedtime);
        },
        sortComparator: (v1, v2) => {
          const date1 = v1 || new Date(0);
          const date2 = v2 || new Date(0);
          return date1.getTime() - date2.getTime();
        },
      },
      {
        field: "usersmodifiedtime",
        headerName: "Modified Time",
        width: 180,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Modified Time</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "usersmodifiedtime")}
                color={columnFilters.usersmodifiedtime ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
        valueGetter: (params) => {
          if (!params || !params.row) return null;
          return params.row.usersmodifiedtime
            ? new Date(params.row.usersmodifiedtime)
            : null;
        },
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          return formatDate(params.row.usersmodifiedtime);
        },
        sortComparator: (v1, v2) => {
          const date1 = v1 || new Date(0);
          const date2 = v2 || new Date(0);
          return date1.getTime() - date2.getTime();
        },
      },
      {
        field: "userscreatedby",
        headerName: "Created By",
        width: 140,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Created By</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "userscreatedby")}
                color={columnFilters.userscreatedby ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "usersmodifiedby",
        headerName: "Modified By",
        width: 140,
        sortable: true,
        renderHeader: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography>Modified By</Typography>
            <Tooltip title="Filter">
              <IconButton
                size="small"
                onClick={(e) => handleFilterClick(e, "usersmodifiedby")}
                color={columnFilters.usersmodifiedby ? "primary" : "default"}
              >
                <FaFilter size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
      ...(hasWriteAccess
        ? [
            {
              field: "actions",
              headerName: "Actions",
              width: 150,
              sortable: false,
              renderCell: (params) => {
                if (!params || !params.row) return null;

                const isDisabled = params.row.usersadminstate === 0;
                const isCurrentlyEnabled = params.row.usersadminstate === 1;

                const protectedRoles = ["Incubatees Admin", "Incubator Admin"];
                const isProtectedRole = protectedRoles.includes(
                  params.row.rolesname,
                );

                return (
                  <Box>
                    <ActionButton
                      color={isCurrentlyEnabled ? "on" : "off"}
                      onClick={() => handleToggleStatus(params.row)}
                      disabled={
                        isUpdating === params.row.usersrecid ||
                        isToggling === params.row.usersrecid ||
                        (isCurrentlyEnabled && isProtectedRole)
                      }
                      title={
                        isProtectedRole && isCurrentlyEnabled
                          ? "This role cannot be disabled"
                          : isCurrentlyEnabled
                            ? "Disable User"
                            : "Enable User"
                      }
                    >
                      {isToggling === params.row.usersrecid ? (
                        <ToggleOnIcon fontSize="small" />
                      ) : (
                        <ToggleOffIcon fontSize="small" />
                      )}
                    </ActionButton>

                    <ActionButton
                      color="edit"
                      onClick={() => handleEdit(params.row)}
                      disabled={
                        isUpdating === params.row.usersrecid ||
                        isToggling === params.row.usersrecid ||
                        isDisabled
                      }
                      title={
                        isDisabled ? "Cannot edit disabled users" : "Edit User"
                      }
                      className={isDisabled ? "disabled" : ""}
                    >
                      {isUpdating === params.row.usersrecid ? (
                        <FaSpinner className="spinner" size={18} />
                      ) : (
                        <EditIcon fontSize="small" />
                      )}
                    </ActionButton>
                  </Box>
                );
              },
            },
          ]
        : []),
    ],
    [isUpdating, isToggling, columnFilters, hasWriteAccess],
  );

  const rowsWithId = useMemo(() => {
    return filteredData.map((user, index) => ({
      ...user,
      id: user.usersrecid || `user-${index}`,
    }));
  }, [filteredData]);

  const handleFilterClick = (event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setFilterColumn(column);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setFilterColumn(null);
  };

  const handleFilterChange = (column, value) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const clearFilter = () => {
    setColumnFilters((prev) => ({
      ...prev,
      [filterColumn]: "",
    }));
  };

  const clearAllFilters = () => {
    setColumnFilters({
      usersname: "",
      usersemail: "",
      rolesname: "",
      userscreatedtime: "",
      usersmodifiedtime: "",
      userscreatedby: "",
      usersmodifiedby: "",
    });
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  const hasActiveFilters = Object.values(columnFilters).some(
    (value) => value !== "",
  );

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/resources/generic/getusers", {
        userId: userId || null,
        userIncId: selectedIncubation
          ? selectedIncubation.incubationsrecid
          : incUserid,
      });

      if (response.data.statusCode === 200) {
        const userData = response.data.data || [];
        setUsers(userData);
        setFilteredUsers(userData);
      } else {
        throw new Error(response.data.message || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load users. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await api.post("/resources/generic/getrolelist", {
        userId: userId || null,
        incUserId: selectedIncubation
          ? selectedIncubation.incubationsrecid
          : incUserid,
      });

      if (response.data.statusCode === 200) {
        setRoles(response.data.data || []);
        return response.data.data || [];
      } else {
        throw new Error(response.data.message || "Failed to fetch roles");
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      const errorMessage =
        err.response?.data?.message || err.message || "Failed to load roles.";
      Swal.fire("❌ Error", errorMessage, "error");
      return [];
    }
  };

  const fetchIncubatees = async (incubationId = null) => {
    try {
      const targetIncubationId =
        incubationId ||
        (selectedIncubation ? selectedIncubation.incubationsrecid : incUserid);

      const response = await api.post("/resources/generic/getinclist", {
        userId: userId || null,
        incUserId: targetIncubationId,
      });

      if (response.data.statusCode === 200) {
        setIncubatees(response.data.data || []);
        return response.data.data || [];
      } else {
        throw new Error(response.data.message || "Failed to fetch incubatees");
      }
    } catch (err) {
      console.error("Error fetching incubatees:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load incubatees.";
      Swal.fire("❌ Error", errorMessage, "error");
      return [];
    }
  };

  const fetchIncubations = async () => {
    if (!canSelectIncubation) {
      return Promise.resolve([]);
    }

    try {
      const response = await api.post("/resources/generic/getincubationlist", {
        userId: userId || null,
        userIncId: "ALL",
      });

      if (response.data.statusCode === 200) {
        setIncubations(response.data.data || []);
        return response.data.data || [];
      } else {
        throw new Error(response.data.message || "Failed to fetch incubations");
      }
    } catch (err) {
      console.error("Error fetching incubations:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load incubations.";
      Swal.fire("❌ Error", errorMessage, "error");
      return [];
    }
  };

  useEffect(() => {
    fetchUsers();
    setDropdownsLoading(true);
    Promise.all([fetchRoles(), fetchIncubatees(), fetchIncubations()])
      .then(() => setDropdownsLoading(false))
      .catch(() => setDropdownsLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();

    if (selectedIncubation) {
      setDropdownsLoading(true);
      fetchIncubatees()
        .then(() => setDropdownsLoading(false))
        .catch(() => setDropdownsLoading(false));
    } else {
      setIncubatees([]);
    }
  }, [selectedIncubation]);

  const handleToggleStatus = (user) => {
    const isCurrentlyEnabled = user.usersadminstate === 1;
    const actionText = isCurrentlyEnabled ? "disable" : "enable";
    const newState = isCurrentlyEnabled ? 0 : 1;

    Swal.fire({
      title: "Are you sure?",
      text: `Do you want to ${actionText} ${user.usersname}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: isCurrentlyEnabled ? "#d33" : "#3085d6",
      cancelButtonColor: "#6c757d",
      confirmButtonText: `Yes, ${actionText} it!`,
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        setIsToggling(user.usersrecid);

        const bodyPayload = {
          usersemail: user.usersemail,
          usersname: user.usersname,
          usersrolesrecid: user.usersrolesrecid,
          userspassword: user.userspassword,
          usersadminstate: newState.toString(),
          usersmodifiedby: userId || "system",
          usersrecid: user.usersrecid,
          usersincubationsrecid: user.usersincubationsrecid,
          usersmentorid:
            user.usersmentorid !== undefined && user.usersmentorid !== null
              ? user.usersmentorid
              : null,
        };

        api
          .post("/updateUser", bodyPayload)
          .then(async (res) => {
            if (res.data.statusCode === 200) {
              if (user.usersmentorid) {
                try {
                  const mentorPayload = {
                    userId: "ALL",
                    incUserId: selectedIncubation
                      ? selectedIncubation.incubationsrecid
                      : incUserid,
                  };

                  const mentorsRes = await api.post(
                    "/resources/generic/getmentordetails",
                    mentorPayload,
                  );

                  if (
                    mentorsRes.data.statusCode === 200 &&
                    Array.isArray(mentorsRes.data.data)
                  ) {
                    const targetMentor = mentorsRes.data.data.find(
                      (m) => m.mentordetsid === user.usersmentorid,
                    );

                    if (targetMentor) {
                      const mentorUpdatePayload = {
                        mentordetsincubatorid:
                          targetMentor.mentordetsincubatorid,
                        mentordetsmnttypeid: targetMentor.mentordetsmnttypeid,
                        mentordetsclasssetid: targetMentor.mentordetsclasssetid,
                        mentordetsname: targetMentor.mentordetsname,
                        mentordetsdesign: targetMentor.mentordetsdesign,
                        mentordetsphone: targetMentor.mentordetsphone,
                        mentordetsaddress: targetMentor.mentordetsaddress,
                        mentordetsemail: targetMentor.mentordetsemail,
                        mentordetsdomain: targetMentor.mentordetsdomain,
                        mentordetspastexp: targetMentor.mentordetspastexp,
                        mentordetslinkedin: targetMentor.mentordetslinkedin,
                        mentordetswebsite: targetMentor.mentordetswebsite,
                        mentordetsblog: targetMentor.mentordetsblog,
                        mentordetsimagepath: targetMentor.mentordetsimagepath,
                        mentordetstimecommitment:
                          targetMentor.mentordetstimecommitment,
                        mentordetsprevstupmentor:
                          targetMentor.mentordetsprevstupmentor,
                        mentordetscomment: targetMentor.mentordetscomment,
                        mentordetsgender: targetMentor.mentordetsgender,
                        mentordetsadminstate: newState,
                        mentordetsid: targetMentor.mentordetsid,
                        mentordetsmodifiedby: userId || "1",
                      };

                      await api.post("/updateMentor", null, {
                        params: mentorUpdatePayload,
                        headers: {
                          "X-Module": "User Management",
                          "X-Action": "Update Linked Mentor Status",
                        },
                      });
                    }
                  }
                } catch (mentorErr) {
                  console.error(
                    "Error updating linked mentor status:",
                    mentorErr,
                  );
                }
              }

              Swal.fire(
                "Success!",
                `${user.usersname} has been ${actionText}d.`,
                "success",
              );
              fetchUsers();
            } else {
              throw new Error(
                res.data.message || `Failed to ${actionText} user`,
              );
            }
          })
          .catch((err) => {
            console.error(`Error ${actionText}ing user:`, err);
            Swal.fire(
              "Error",
              `Failed to ${actionText} ${user.usersname}: ${err.message}`,
              "error",
            );
          })
          .finally(() => {
            setIsToggling(null);
          });
      }
    });
  };

  // ─────────────────────────────────────────────
  // ADD USER
  // ─────────────────────────────────────────────
  const handleAddUser = async () => {
    if (
      dropdownsLoading ||
      roles.length === 0 ||
      (canSelectIncubation && incubations.length === 0)
    ) {
      Swal.fire({
        title: "Loading...",
        text: "Please wait while we load required data",
        icon: "info",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
      });

      try {
        await Promise.all([
          fetchRoles(),
          fetchIncubatees(),
          fetchIncubations(),
        ]);
        setDropdownsLoading(false);
        Swal.close();
      } catch (error) {
        Swal.close();
        Swal.fire("❌ Error", "Failed to load dropdown data", "error");
        return;
      }
    }

    const roleOptions = roles
      .map((role) => `<option value="${role.value}">${role.text}</option>`)
      .join("");
    const incubationOptions = canSelectIncubation
      ? [
          `<option value="" disabled selected>Select incubation</option>`,
          ...incubations.map(
            (incubation) =>
              `<option value="${incubation.incubationsrecid}">${incubation.incubationsshortname}</option>`,
          ),
        ].join("")
      : "";
    const incubateeOptions = [
      `<option value="" disabled selected>Select incubatee</option>`,
      ...incubatees.map(
        (incubatee) =>
          `<option value="${incubatee.incubateesrecid}">${incubatee.incubateesname}</option>`,
      ),
    ].join("");

    const result = await Swal.fire({
      title: "Add New User",
      html: `
        <div class="swal-form-container">
          <div class="swal-form-row">
            <input id="swal-name" class="swal2-input" placeholder="Name *" required>
            <div id="error-usersname" class="field-error"></div>
          </div>
          <div class="swal-form-row">
            <input id="swal-email" class="swal2-input" placeholder="Email *" required>
            <div id="error-usersemail" class="field-error"></div>
          </div>
          <div class="swal-form-row">
            <input id="swal-password" type="password" class="swal2-input" placeholder="Password *" required>
            <div id="error-userspassword" class="field-error"></div>
          </div>
          <div class="swal-form-row">
            <select id="swal-role" class="swal2-select" required>
              <option value="" disabled selected>Select a role</option>
              ${roleOptions}
            </select>
          </div>
          ${
            canSelectIncubation
              ? `<div class="swal-form-row">
                   <select id="swal-incubation" class="swal2-select" required>
                     ${incubationOptions}
                   </select>
                 </div>`
              : ""
          }
          <div class="swal-form-row">
            <select id="swal-incubatee" class="swal2-select" disabled>
              ${incubateeOptions}
            </select>
          </div>
        </div>
      `,
      width: "600px",
      focusConfirm: false,
      showCancelButton: true,
      // ── Validation on Confirm ──────────────────────────────────────────
      preConfirm: () => {
        const name = document.getElementById("swal-name");
        const email = document.getElementById("swal-email");
        const password = document.getElementById("swal-password");
        const role = document.getElementById("swal-role");
        const incubation = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;
        const incubatee = document.getElementById("swal-incubatee");

        if (
          !name ||
          !email ||
          !password ||
          !role ||
          !incubatee ||
          (canSelectIncubation && !incubation)
        ) {
          Swal.showValidationMessage("Form elements not found");
          return false;
        }

        // Run all field validators and block submit if any fail
        const fieldsToValidate = [
          { id: "swal-name", field: "usersname" },
          { id: "swal-email", field: "usersemail" },
          { id: "swal-password", field: "userspassword" },
        ];
        if (!validateAllFields(fieldsToValidate)) {
          Swal.showValidationMessage(
            "Please fix the errors above before submitting.",
          );
          return false;
        }

        if (!role.value || (canSelectIncubation && !incubation.value)) {
          Swal.showValidationMessage("Please fill all required fields");
          return false;
        }

        return {
          usersname: name.value,
          usersemail: email.value,
          userspassword: password.value,
          usersrolesrecid: role.value,
          usersincubationsrecid: canSelectIncubation
            ? incubation.value
            : selectedIncubation
              ? selectedIncubation.incubationsrecid
              : incUserid,
          usersincubateesrecid: incubatee.value || null,
        };
      },
      didOpen: () => {
        // Inject styles
        const style = document.createElement("style");
        style.id = "swal-validation-styles";
        style.textContent = VALIDATION_STYLES;
        document.head.appendChild(style);

        // Attach real-time validators
        attachValidation(document.getElementById("swal-name"), "usersname");
        attachValidation(document.getElementById("swal-email"), "usersemail");
        attachValidation(
          document.getElementById("swal-password"),
          "userspassword",
        );

        // ── Dropdown logic ─────────────────────────────────────────────
        const roleSelect = document.getElementById("swal-role");
        const incubateeSelect = document.getElementById("swal-incubatee");
        const incubationSelect = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;

        const updateIncubateeOptions = async (incubationId) => {
          incubateeSelect.innerHTML =
            '<option value="" disabled>Loading...</option>';
          try {
            const response = await api.post("/resources/generic/getinclist", {
              userId: userId || null,
              incUserId: incubationId,
            });
            if (response.data.statusCode === 200) {
              const options = [
                '<option value="" disabled selected>Select incubatee</option>',
                ...(response.data.data || []).map(
                  (incubatee) =>
                    `<option value="${incubatee.incubateesrecid}">${incubatee.incubateesname}</option>`,
                ),
              ].join("");
              incubateeSelect.innerHTML = options;
            } else {
              incubateeSelect.innerHTML =
                '<option value="" disabled>No incubatees found</option>';
            }
          } catch (err) {
            console.error("Error fetching incubatees:", err);
            incubateeSelect.innerHTML =
              '<option value="" disabled>Error loading incubatees</option>';
          }
        };

        const toggleIncubateeDropdown = () => {
          const selectedRole = parseInt(roleSelect.value);
          const shouldEnableIncubatee = canSelectIncubation
            ? incubationSelect && incubationSelect.value !== ""
            : INCUBATEE_ROLE_IDS.includes(selectedRole);

          if (shouldEnableIncubatee) {
            if (canSelectIncubation && incubationSelect) {
              updateIncubateeOptions(incubationSelect.value);
            } else {
              updateIncubateeOptions(incUserid);
            }
            incubateeSelect.disabled = false;
          } else {
            incubateeSelect.disabled = true;
            incubateeSelect.value = "";
          }
        };

        roleSelect.addEventListener("change", toggleIncubateeDropdown);
        if (incubationSelect) {
          incubationSelect.addEventListener("change", () => {
            const selectedRole = parseInt(roleSelect.value);
            if (INCUBATEE_ROLE_IDS.includes(selectedRole)) {
              updateIncubateeOptions(incubationSelect.value);
              incubateeSelect.disabled = false;
            }
          });
        }
        toggleIncubateeDropdown();
      },
      didDestroy: () => {
        // Clean up injected styles
        const style = document.getElementById("swal-validation-styles");
        if (style) style.remove();
      },
    });

    if (result.isConfirmed && result.value) {
      const formData = result.value;
      setIsAdding(true);

      try {
        const bodyPayload = {
          usersemail: formData.usersemail,
          userspassword: formData.userspassword,
          usersname: formData.usersname,
          usersrolesrecid: formData.usersrolesrecid,
          usersadminstate: "1",
          userscreatedby: userId || "system",
          usersmodifiedby: userId || "system",
          usersincubationsrecid: formData.usersincubationsrecid,
        };

        if (formData.usersincubateesrecid) {
          bodyPayload.usersincubateesrecid = formData.usersincubateesrecid;
        }

        const response = await api.post("/addUser", bodyPayload);

        if (response.data.statusCode === 200) {
          Swal.fire("✅ Success", "User added successfully", "success");
          fetchUsers();
        } else {
          Swal.fire(
            "❌ Error",
            response.data.message || "Failed to add user",
            "error",
          );
        }
      } catch (err) {
        console.error("Error adding user:", err);
        const errorMessage =
          err.response?.data?.message || err.message || "Something went wrong";
        Swal.fire("❌ Error", errorMessage, "error");
      } finally {
        setIsAdding(false);
      }
    }
  };

  // ─────────────────────────────────────────────
  // EDIT USER
  // ─────────────────────────────────────────────
  const handleEdit = async (user) => {
    if (user.usersadminstate === 0) {
      Swal.fire(
        "Restricted",
        "Cannot edit a disabled user. Please enable the user first.",
        "warning",
      );
      return;
    }

    const userIncubationId = user.usersincubationsrecid || incUserid;

    let specificRoles = [];
    try {
      const roleRes = await api.post("/resources/generic/getrolelist", {
        userId: userId || null,
        incUserId: userIncubationId,
      });
      if (roleRes.data.statusCode === 200) {
        specificRoles = roleRes.data.data || [];
      }
    } catch (err) {
      console.error("Error fetching specific roles:", err);
      specificRoles = roles;
    }

    let specificIncubatees = [];
    try {
      const incRes = await api.post("/resources/generic/getinclist", {
        userId: userId || null,
        incUserId: userIncubationId,
      });
      if (incRes.data.statusCode === 200) {
        specificIncubatees = incRes.data.data || [];
      }
    } catch (err) {
      console.error("Error fetching specific incubatees:", err);
      specificIncubatees = incubatees;
    }

    if (canSelectIncubation && incubations.length === 0) {
      try {
        const incubationsRes = await api.post(
          "/resources/generic/getincubationlist",
          { userId: userId || null, userIncId: "ALL" },
        );
        if (incubationsRes.data.statusCode === 200) {
          setIncubations(incubationsRes.data.data || []);
        }
      } catch (err) {
        console.error("Error fetching incubations:", err);
      }
    }

    const existingRoleIds = new Set(specificRoles.map((r) => r.value));
    let finalRoles = [...specificRoles];
    if (
      user.usersrolesrecid &&
      !existingRoleIds.has(String(user.usersrolesrecid)) &&
      !existingRoleIds.has(Number(user.usersrolesrecid))
    ) {
      finalRoles.unshift({
        value: user.usersrolesrecid,
        text: user.rolesname || "Unknown Role",
      });
    }

    const roleOptionsHTML = finalRoles
      .map(
        (role) =>
          `<option value="${role.value}" ${
            user.usersrolesrecid == role.value ? "selected" : ""
          }>${role.text}</option>`,
      )
      .join("");

    const incubationOptions = canSelectIncubation
      ? [
          `<option value="" ${!user.usersincubationsrecid ? "selected" : ""}>Select incubation</option>`,
          ...incubations.map(
            (incubation) =>
              `<option value="${incubation.incubationsrecid}" ${
                user.usersincubationsrecid == incubation.incubationsrecid
                  ? "selected"
                  : ""
              }>${incubation.incubationsshortname}</option>`,
          ),
        ].join("")
      : "";

    const existingIncubateeIds = new Set(
      specificIncubatees.map((i) => i.incubateesrecid),
    );
    let finalIncubatees = [...specificIncubatees];
    if (
      user.usersincubateesrecid &&
      !existingIncubateeIds.has(String(user.usersincubateesrecid)) &&
      !existingIncubateeIds.has(Number(user.usersincubateesrecid))
    ) {
      finalIncubatees.unshift({
        incubateesrecid: user.usersincubateesrecid,
        incubateesname: user.incubateesname || "Unknown Incubatee",
      });
    }

    const incubateeOptionsHTML = finalIncubatees
      .map(
        (incubatee) =>
          `<option value="${incubatee.incubateesrecid}" ${
            user.usersincubateesrecid == incubatee.incubateesrecid
              ? "selected"
              : ""
          }>${incubatee.incubateesname}</option>`,
      )
      .join("");

    const incubateeOptions = [
      `<option value="" ${!user.usersincubateesrecid ? "selected" : ""}>Select incubatee</option>`,
      incubateeOptionsHTML,
    ].join("");

    const result = await Swal.fire({
      title: "Edit User",
      html: `
        <div class="swal-form-container">
          <div class="swal-form-row">
            <input id="swal-name" class="swal2-input" placeholder="Name *" value="${user.usersname || ""}">
            <div id="error-usersname" class="field-error"></div>
          </div>
          <div class="swal-form-row">
            <input id="swal-email" class="swal2-input" placeholder="Email *" value="${user.usersemail || ""}">
            <div id="error-usersemail" class="field-error"></div>
          </div>
          <div class="swal-form-row">
            <input id="swal-password" type="password" class="swal2-input" placeholder="Password" value="${user.userspassword || ""}" readonly>
          </div>
          <div class="swal-form-row">
            <select id="swal-role" class="swal2-select">
              ${roleOptionsHTML}
            </select>
          </div>
          ${
            canSelectIncubation
              ? `<div class="swal-form-row">
                   <select id="swal-incubation" class="swal2-select">
                     ${incubationOptions}
                   </select>
                 </div>`
              : ""
          }
          <div class="swal-form-row">
            <select id="swal-incubatee" class="swal2-select" ${
              !INCUBATEE_ROLE_IDS.includes(parseInt(user.usersrolesrecid))
                ? "disabled"
                : ""
            }>
              ${incubateeOptions}
            </select>
          </div>
        </div>
      `,
      width: "600px",
      focusConfirm: false,
      showCancelButton: true,
      // ── Validation on Confirm ──────────────────────────────────────────
      preConfirm: () => {
        const name = document.getElementById("swal-name");
        const email = document.getElementById("swal-email");
        const password = document.getElementById("swal-password");
        const role = document.getElementById("swal-role");
        const incubation = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;
        const incubatee = document.getElementById("swal-incubatee");

        if (
          !name ||
          !email ||
          !password ||
          !role ||
          !incubatee ||
          (canSelectIncubation && !incubation)
        ) {
          Swal.showValidationMessage("Form elements not found");
          return false;
        }

        // Validate name and email (password is readonly in edit mode)
        const fieldsToValidate = [
          { id: "swal-name", field: "usersname" },
          { id: "swal-email", field: "usersemail" },
        ];
        if (!validateAllFields(fieldsToValidate)) {
          Swal.showValidationMessage(
            "Please fix the errors above before submitting.",
          );
          return false;
        }

        return {
          usersname: name.value,
          usersemail: email.value,
          userspassword: password.value,
          usersrolesrecid: role.value,
          usersincubationsrecid: canSelectIncubation
            ? incubation.value
            : selectedIncubation
              ? selectedIncubation.incubationsrecid
              : incUserid,
          usersincubateesrecid: incubatee.value || null,
          usersmentorid: user.usersmentorid,
        };
      },
      didOpen: () => {
        // Inject styles
        const style = document.createElement("style");
        style.id = "swal-validation-styles";
        style.textContent = VALIDATION_STYLES;
        document.head.appendChild(style);

        // Attach real-time validators (name + email only; password is readonly)
        attachValidation(document.getElementById("swal-name"), "usersname");
        attachValidation(document.getElementById("swal-email"), "usersemail");

        // ── Dropdown logic ─────────────────────────────────────────────
        const roleSelect = document.getElementById("swal-role");
        const incubateeSelect = document.getElementById("swal-incubatee");
        const incubationSelect = canSelectIncubation
          ? document.getElementById("swal-incubation")
          : null;

        const updateIncubateeOptions = async (incubationId) => {
          if (!incubationId) {
            incubateeSelect.innerHTML =
              '<option value="" disabled selected>Select incubatee</option>';
            return;
          }
          incubateeSelect.innerHTML =
            '<option value="" disabled>Loading incubatees...</option>';
          incubateeSelect.disabled = true;
          try {
            const response = await api.post("/resources/generic/getinclist", {
              userId: userId || null,
              incUserId: incubationId,
            });
            if (response.data.statusCode === 200) {
              const fetchedList = response.data.data || [];
              let optionsHtml = fetchedList
                .map(
                  (incubatee) =>
                    `<option value="${incubatee.incubateesrecid}">${incubatee.incubateesname}</option>`,
                )
                .join("");
              const currentUserIncubatee = user.usersincubateesrecid;
              incubateeSelect.innerHTML = [
                '<option value="">Select incubatee</option>',
                optionsHtml,
              ].join("");
              if (currentUserIncubatee) {
                incubateeSelect.value = currentUserIncubatee;
              }
            } else {
              incubateeSelect.innerHTML =
                '<option value="" disabled>No incubatees found</option>';
            }
          } catch (err) {
            console.error("Error fetching incubatees:", err);
            incubateeSelect.innerHTML =
              '<option value="" disabled>Error loading incubatees</option>';
          } finally {
            incubateeSelect.disabled = false;
          }
        };

        const toggleIncubateeDropdown = () => {
          const selectedRole = parseInt(roleSelect.value);
          const shouldEnableIncubatee = canSelectIncubation
            ? incubationSelect && incubationSelect.value !== ""
            : INCUBATEE_ROLE_IDS.includes(selectedRole);
          if (shouldEnableIncubatee) {
            if (canSelectIncubation && incubationSelect) {
              updateIncubateeOptions(incubationSelect.value);
            } else {
              updateIncubateeOptions(incUserid);
            }
            incubateeSelect.disabled = false;
          } else {
            incubateeSelect.disabled = true;
            incubateeSelect.value = "";
          }
        };

        roleSelect.addEventListener("change", toggleIncubateeDropdown);
        if (incubationSelect) {
          incubationSelect.addEventListener("change", () => {
            const selectedRole = parseInt(roleSelect.value);
            if (INCUBATEE_ROLE_IDS.includes(selectedRole)) {
              updateIncubateeOptions(incubationSelect.value);
              incubateeSelect.disabled = false;
            }
          });
        }
        toggleIncubateeDropdown();
      },
      didDestroy: () => {
        const style = document.getElementById("swal-validation-styles");
        if (style) style.remove();
      },
    });

    if (result.isConfirmed && result.value) {
      const formData = result.value;
      setIsUpdating(user.usersrecid);

      try {
        const bodyPayload = {
          usersemail: formData.usersemail,
          usersname: formData.usersname,
          usersrolesrecid: formData.usersrolesrecid,
          userspassword: formData.userspassword,
          usersadminstate: "1",
          usersmodifiedby: userId,
          usersrecid: user.usersrecid,
          usersincubationsrecid: formData.usersincubationsrecid,
          usersmentorid: formData.usersmentorid || null,
        };

        if (formData.usersincubateesrecid) {
          bodyPayload.usersincubateesrecid = formData.usersincubateesrecid;
        }

        const response = await api.post("/updateUser", bodyPayload);

        if (response.data.statusCode === 200) {
          Swal.fire("✅ Success", "User updated successfully", "success");
          fetchUsers();
        } else {
          Swal.fire(
            "❌ Error",
            response.data.message || "Failed to update user",
            "error",
          );
        }
      } catch (err) {
        console.error("Error updating user:", err);
        const errorMessage =
          err.response?.data?.message || err.message || "Something went wrong";
        Swal.fire("❌ Error", errorMessage, "error");
      } finally {
        setIsUpdating(null);
      }
    }
  };

  return (
    <Box className="doccat-container" sx={{ p: 2 }}>
      <Box
        className="doccat-header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">👤 Users</Typography>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <TextField
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
              endAdornment: searchQuery && (
                <IconButton size="small" onClick={clearSearch}>
                  <ClearIcon />
                </IconButton>
              ),
            }}
          />
          {hasWriteAccess && (
            <Button
              variant="contained"
              startIcon={
                isAdding ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <FaPlus />
                )
              }
              onClick={handleAddUser}
              disabled={isAdding}
            >
              {isAdding ? "Adding..." : "Add User"}
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            onClick={exportToCSV}
            title="Export as CSV"
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download size={16} />}
            onClick={exportToExcel}
            title="Export as Excel"
            disabled={!isXLSXAvailable}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {error && (
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}

      <Box sx={{ mb: 1, color: "text.secondary" }}>
        Showing {paginationModel.page * paginationModel.pageSize + 1} to{" "}
        {Math.min(
          (paginationModel.page + 1) * paginationModel.pageSize,
          filteredData.length,
        )}{" "}
        of {filteredData.length} entries
      </Box>

      {hasActiveFilters && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FaTimes />}
            onClick={clearAllFilters}
          >
            Clear All Filters
          </Button>
        </Box>
      )}

      <StyledPaper>
        <DataGrid
          rows={rowsWithId}
          columns={columns}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[5, 10, 25, 50]}
          disableRowSelectionOnClick
          sx={{ border: 0 }}
          loading={loading}
          autoHeight
          disableColumnMenu
        />
      </StyledPaper>

      {filteredData.length === 0 && !loading && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          {searchQuery
            ? "No users found matching your search"
            : "No users found"}
        </Box>
      )}

      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Card sx={{ minWidth: 280, maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filter by {filterColumn === "usersname" && "Name"}
              {filterColumn === "usersemail" && "Email"}
              {filterColumn === "rolesname" && "Role"}
              {filterColumn === "userscreatedtime" && "Created Time"}
              {filterColumn === "usersmodifiedtime" && "Modified Time"}
              {filterColumn === "userscreatedby" && "Created By"}
              {filterColumn === "usersmodifiedby" && "Modified By"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={`Enter ${
                filterColumn === "usersname"
                  ? "name"
                  : filterColumn === "usersemail"
                    ? "email"
                    : filterColumn === "rolesname"
                      ? "role"
                      : filterColumn === "userscreatedtime"
                        ? "created time"
                        : filterColumn === "usersmodifiedtime"
                          ? "modified time"
                          : filterColumn === "userscreatedby"
                            ? "created by"
                            : filterColumn === "usersmodifiedby"
                              ? "modified by"
                              : ""
              }...`}
              value={columnFilters[filterColumn] || ""}
              onChange={(e) => handleFilterChange(filterColumn, e.target.value)}
              variant="outlined"
              margin="normal"
            />
          </CardContent>
          <CardActions sx={{ justifyContent: "flex-end" }}>
            <Button size="small" onClick={clearFilter}>
              Clear
            </Button>
            <Button size="small" onClick={handleFilterClose}>
              Close
            </Button>
          </CardActions>
        </Card>
      </Popover>

      <StyledBackdrop
        open={isAdding || isUpdating !== null || isToggling !== null}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {isAdding
              ? "Adding user..."
              : isUpdating !== null
                ? "Updating user..."
                : isToggling !== null
                  ? "Updating status..."
                  : "Processing..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
}
