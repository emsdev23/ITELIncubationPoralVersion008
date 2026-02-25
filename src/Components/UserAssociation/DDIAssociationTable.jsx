import React, { useState, useEffect, useMemo } from "react";
import {
  FaTrash,
  FaEdit,
  FaUsers,
  FaTimes,
  FaPlus,
  FaSpinner,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaFileExcel,
  FaFileCsv,
  FaFilter,
} from "react-icons/fa";
import Swal from "sweetalert2";
import "./UserAssociationTable.css";
import { IPAdress } from "../Datafetching/IPAdrees";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess"; // Import Hook

// Material-UI imports
import {
  Button,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Popover,
  Card,
  CardContent,
  CardActions,
} from "@mui/material";

// Export functionality imports
import { CSVLink } from "react-csv";
import * as XLSX from "xlsx";

export default function DDIAssociationTable() {
  const hasWriteAccess = useWriteAccess("/Incubation/Dashboard/Userassociation");

  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const IP = IPAdress;

  // Existing states
  const [associations, setAssociations] = useState([]);
  const [incubatees, setIncubatees] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [selectedIncubatees, setSelectedIncubatees] = useState([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [columnFilters, setColumnFilters] = useState({
    usersname: "",
    userscreatedby: "",
    incubateesname: "",
    usrincassncreatedbyname: "",
  });

  // Filter popover states
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Fetch functions
 const fetchAssociations = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await api.post("/resources/generic/getddiassdetails", {
      userId: userId || null,
      incUserId: incUserid,
    });

    if (response.data.statusCode === 200) {
      // --- FIX: Ensure the response data is an array before setting state ---
      const data = Array.isArray(response.data) ? response.data : 
                   (response.data.data && Array.isArray(response.data.data)) ? response.data.data : 
                   [];
      setAssociations(data);
    } else {
      throw new Error(response.data.message || "Failed to fetch DDI associations");
    }
  } catch (err) {
    console.error("Error fetching DDI associations:", err);
    const errorMessage = err.response?.data?.message || err.message || "Failed to load DDI associations. Please try again.";
    setError(errorMessage);
    // --- FIX: Reset associations to an empty array on error ---
    setAssociations([]);
  } finally {
    setLoading(false);
  }
};

  const fetchIncubatees = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("/resources/generic/getinclist", {
        userId: userId || null,
        incUserId: incUserid,
      });

      if (response.data.statusCode === 200) {
        // --- FIX: Ensure the response data is an array ---
        const data = Array.isArray(response.data) ? response.data : 
                     (response.data.data && Array.isArray(response.data.data)) ? response.data.data : 
                     [];
        setIncubatees(data);
      } else {
        throw new Error(response.data.message || "Failed to fetch incubatees");
      }
    } catch (err) {
      console.error("Error fetching incubatees:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load incubatees. Please try again.";
      setError(errorMessage);
      // --- FIX: Reset incubatees to an empty array on error ---
      setIncubatees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await api.post("/resources/generic/getusers", {
      userId: userId || null,
      userIncId: incUserid,
    });

    if (response.data.statusCode === 200) {
      const userData = response.data.data || [];
      setUsers(userData);
    } else {
      throw new Error(response.data.message || "Failed to fetch users");
    }
  } catch (err) {
    console.error("Error fetching users:", err);
    const errorMessage = err.response?.data?.message || err.message || "Failed to load users. Please try again.";
    setError(errorMessage);
    // --- FIX: Reset users to an empty array on error ---
    setUsers([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchAssociations();
    fetchIncubatees();
    fetchUsers();
  }, []);

  // Normalize associations data to handle both associated and unassociated users
  const normalizedData = useMemo(() => {
    // --- FIX: Add a defensive check to ensure 'associations' is an array ---
    if (!Array.isArray(associations)) {
      console.error("Associations state is not an array:", associations);
      return []; // Return an empty array to prevent the app from crashing
    }

    const userMap = {};

    associations.forEach((item) => {
      // Check if this is an associated user (has usrincassnrecid)
      if (item.usrincassnrecid) {
        const userId = item.usrincassnusersrecid;
        if (!userMap[userId]) {
          userMap[userId] = {
            usersrecid: userId,
            usersname: item.usersname,
            userscreatedby: item.userscreatedby,
            associations: [],
          };
        }
        userMap[userId].associations.push({
          usrincassnrecid: item.usrincassnrecid,
          incubateesname: item.incubateesname,
          usrincassncreatedtime: item.usrincassncreatedtime,
          usrincassncreatedbyname: item.usrincassncreatedby,
          usrincassnmodifiedtime: item.usrincassnmodifiedtime,
          usrincassnincubateesrecid: item.usrincassnincubateesrecid,
        });
      }
      // This is an unassociated user (only has usersrecid and usersname)
      else {
        const userId = item.usersrecid;
        if (!userMap[userId]) {
          userMap[userId] = {
            usersrecid: userId,
            usersname: item.usersname,
            userscreatedby: item.userscreatedby || "N/A",
            associations: [],
          };
        }
      }
    });

    return Object.values(userMap);
  }, [associations]);

  // Apply column filters and search query
  const filteredData = useMemo(() => {
    let filtered = [...normalizedData];

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) =>
        user.usersname.toLowerCase().includes(query)
      );
    }

    // Apply column filters
    if (columnFilters.usersname) {
      const nameQuery = columnFilters.usersname.toLowerCase();
      filtered = filtered.filter((user) =>
        user.usersname.toLowerCase().includes(nameQuery)
      );
    }

    if (columnFilters.userscreatedby) {
      const createdByQuery = columnFilters.userscreatedby.toLowerCase();
      filtered = filtered.filter((user) =>
        user.userscreatedby.toLowerCase().includes(createdByQuery)
      );
    }

    if (columnFilters.incubateesname || columnFilters.usrincassncreatedbyname) {
      filtered = filtered.map((user) => {
        const filteredAssociations = user.associations.filter((assoc) => {
          let matchesIncubatee = true;
          let matchesCreatedBy = true;

          if (columnFilters.incubateesname) {
            const incubateeQuery = columnFilters.incubateesname.toLowerCase();
            matchesIncubatee = assoc.incubateesname
              .toLowerCase()
              .includes(incubateeQuery);
          }

          if (columnFilters.usrincassncreatedbyname) {
            const createdByQuery =
              columnFilters.usrincassncreatedbyname.toLowerCase();
            matchesCreatedBy = (assoc.usrincassncreatedbyname || "N/A")
              .toLowerCase()
              .includes(createdByQuery);
          }

          return matchesIncubatee && matchesCreatedBy;
        });

        return {
          ...user,
          associations: filteredAssociations,
        };
      });

      // Remove users with no associations after filtering
      filtered = filtered.filter(
        (user) =>
          user.associations.length > 0 || user.usersname.includes(searchQuery)
      );
    }

    return filtered;
  }, [normalizedData, searchQuery, columnFilters]);

  // Prepare data for export
  const exportData = useMemo(() => {
    const exportArray = [];

    filteredData.forEach((user) => {
      if (user.associations.length > 0) {
        user.associations.forEach((assoc) => {
          exportArray.push({
            "DDI Name": user.usersname,
            "Created By": user.userscreatedby,
            Company: assoc.incubateesname,
            "Associated By": assoc.usrincassncreatedbyname || "N/A",
            "Association Date": formatDate(assoc.usrincassncreatedtime),
          });
        });
      } else {
        exportArray.push({
          "DDI Name": user.usersname,
          "Created By": user.userscreatedby,
          Company: "No companies associated",
          "Associated By": "N/A",
          "Association Date": "",
        });
      }
    });

    return exportArray;
  }, [filteredData]);

  // Export handlers
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DDI Associations");
    XLSX.writeFile(wb, "DDI_Associations.xlsx");
  };

  // Filter popover handlers
  const handleFilterClick = (event, column) => {
    setFilterAnchorEl(event.currentTarget);
    setFilterColumn(column);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
    setFilterColumn(null);
  };

  const handleFilterChange = (column, value) => {
    // Apply filter immediately as user types
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setPage(0); // Reset to first page when filtering
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
      userscreatedby: "",
      incubateesname: "",
      usrincassncreatedbyname: "",
    });
    setSearchQuery("");
    setPage(0);
  };

  // Existing functions
  const startEditing = (user) => {
    setEditingUserId(user.usersrecid);
    const userIncubatees = user.associations.map(
      (assoc) => assoc.usrincassnincubateesrecid
    );
    setSelectedIncubatees(userIncubatees);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setSelectedIncubatees([]);
  };

  const handleCheckboxChange = (incubateeId) => {
    setSelectedIncubatees((prev) => {
      if (prev.includes(incubateeId)) {
        return prev.filter((id) => id !== incubateeId);
      } else {
        return [...prev, incubateeId];
      }
    });
  };

    // Update user associations (Refactored to use the 'api' instance)
  const updateAssociations = () => {
    if (!editingUserId) return;

    setUpdateLoading(true);

    const currentUserAssociations = associations.filter(
      (assoc) => assoc.usrincassnusersrecid === editingUserId
    );

    const currentIncubateeIds = currentUserAssociations.map(
      (assoc) => assoc.usrincassnincubateesrecid
    );

    const toAdd = selectedIncubatees.filter(
      (id) => !currentIncubateeIds.includes(id)
    );
    const toRemove = currentUserAssociations.filter(
      (assoc) => !selectedIncubatees.includes(assoc.usrincassnincubateesrecid)
    );

    // --- REFACTORED: Use the 'api' instance for adding associations ---
    const addPromises = toAdd.map((incubateeId) => {
      return api.post("/addUserIncubationAssociation", null, {
        params: {
          usrincassnusersrecid: editingUserId,
          usrincassnincubateesrecid: incubateeId,
          usrincassncreatedby: userId || "1",
          usrincassnmodifiedby: userId || "1",
          usrincassnadminstate: 1,
        },
        headers: {
          // The Authorization token is typically handled by an interceptor in the 'api' instance.
          // We include the custom headers required by the backend.
          userid: userId || "1",
          "X-Module": "DDI User Association",
          "X-Action": "Add/Edit DDI user Association",
        },
      })
        .then((res) => {
          if (res.data.statusCode !== 200) {
            throw new Error(res.data.message || "Failed to add association");
          }
          return { success: true, incubateeId, action: "add" };
        })
        .catch((error) => {
          // Extract a more informative error message from the Axios error object
          const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
          return {
            success: false,
            incubateeId,
            action: "add",
            error: errorMessage,
          };
        });
    });

    // --- REFACTORED: Use the 'api' instance for removing associations ---
    const removePromises = toRemove.map((association) => {
      // Using the centralized 'api' instance for consistency and automatic auth handling.
      return api.post("/deleteUserIncubationAssociation", null, {
        // Using the 'params' object is the standard, clean way to send query parameters with Axios.
        params: {
          usrincassnmodifiedby: userId || "1",
          usrincassnrecid: association.usrincassnrecid,
        },
        // Custom headers required by the backend are included here.
        // The 'Authorization' header is likely added automatically by an interceptor in the 'api' instance.
        headers: {
          userid: userId || "1",
          "X-Module": "DDI User Association",
          "X-Action": "Delete DDI user Association",
        },
      })
        .then((res) => {
          // Check the status code from the response body, as is common with many APIs.
          if (res.data.statusCode !== 200) {
            // Throw an error to be caught by the .catch block, using the server's message if available.
            throw new Error(res.data.message || "Failed to remove association");
          }
          // Return a structured object for the Promise.all handler to process.
          return {
            success: true,
            associationId: association.usrincassnrecid,
            action: "remove",
          };
        })
        .catch((error) => {
          // Robustly extract the most informative error message possible.
          const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
          // Return a structured error object consistent with the success case.
          return {
            success: false,
            associationId: association.usrincassnrecid,
            action: "remove",
            error: errorMessage,
          };
        });
    });

    const allPromises = [...addPromises, ...removePromises];

    Promise.all(allPromises)
      .then((results) => {
        const successful = results.filter((r) => r.success);
        const failed = results.filter((r) => !r.success);

        if (failed.length === 0) {
          Swal.fire(
            "✅ Success",
            "DDI associations updated successfully!",
            "success"
          );
          fetchAssociations();
          cancelEditing();
        } else if (successful.length > 0) {
          const errorMessages = failed
            .map((f) => {
              if (f.action === "add") {
                return `Failed to add incubatee ${f.incubateeId}: ${f.error}`;
              } else {
                return `Failed to remove association ${f.associationId}: ${f.error}`;
              }
            })
            .join("<br>");

          Swal.fire({
            title: "⚠️ Partial Success",
            html: `${successful.length} operations succeeded, but ${failed.length} failed.<br><br>${errorMessages}`,
            icon: "warning",
          });
          fetchAssociations();
          cancelEditing();
        } else {
          const errorMessages = failed
            .map((f) => {
              if (f.action === "add") {
                return `Failed to add incubatee ${f.incubateeId}: ${f.error}`;
              } else {
                return `Failed to remove association ${f.associationId}: ${f.error}`;
              }
            })
            .join("<br>");

          Swal.fire({
            title: "❌ Error",
            html: `All operations failed.<br><br>${errorMessages}`,
            icon: "error",
          });
        }
      })
      .catch((err) => {
        console.error("Error updating DDI associations:", err);
        Swal.fire("❌ Error", "Failed to update DDI associations", "error");
      })
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  const handleDelete = (associationId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This association will be deleted permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      showLoaderOnConfirm: true,
      preConfirm: () => {
        setIsDeleting(true);
        const url = `${IP}/itelinc/deleteUserIncubationAssociation?usrincassnmodifiedby=${
          userId || "1"
        }&usrincassnrecid=${associationId}`;

        return fetch(url, {
          method: "POST",
          mode: "cors",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",

            userid: userId || "1",
            "X-Module": "DDI User Association",
            "X-Action": "Delete DDI user Association",
          },
          body: JSON.stringify({}),
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP error! Status: ${res.status}`);
            }
            return res.json();
          })
          .then((data) => {
            if (data.statusCode === 200) {
              return data;
            } else {
              throw new Error(data.message || "Failed to delete association");
            }
          })
          .catch((error) => {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
          })
          .finally(() => {
            setIsDeleting(false);
          });
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire("Deleted!", "Association deleted successfully!", "success");
        fetchAssociations();
      }
    });
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Paginated data
  const paginatedData = useMemo(() => {
    return filteredData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredData, page, rowsPerPage]);

  // Check if any column has an active filter
  const hasActiveFilters = Object.values(columnFilters).some(
    (value) => value !== ""
  );

  return (
    <div className="user-association-container">
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <FaUsers style={{ marginRight: "8px" }} />
          DDI-Incubatee Associations
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaSearch />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery("")}>
                    <FaTimes size={14} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            variant="outlined"
            size="small"
          />
          <Button variant="outlined" startIcon={<FaFileCsv />}>
            <CSVLink
              data={exportData}
              filename="DDI_Associations.csv"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              Export CSV
            </CSVLink>
          </Button>
          <Button
            variant="outlined"
            startIcon={<FaFileExcel />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Typography>Loading DDI associations...</Typography>
        </Box>
      ) : (
        <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: 800 }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>Name</Typography>
                      <Tooltip title="Filter">
                        <IconButton
                          size="small"
                          onClick={(e) => handleFilterClick(e, "usersname")}
                          color={
                            columnFilters.usersname ? "primary" : "default"
                          }
                        >
                          <FaFilter size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>Created By</Typography>
                      <Tooltip title="Filter">
                        <IconButton
                          size="small"
                          onClick={(e) =>
                            handleFilterClick(e, "userscreatedby")
                          }
                          color={
                            columnFilters.userscreatedby ? "primary" : "default"
                          }
                        >
                          <FaFilter size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>Companies</Typography>
                      <Tooltip title="Filter">
                        <IconButton
                          size="small"
                          onClick={(e) =>
                            handleFilterClick(e, "incubateesname")
                          }
                          color={
                            columnFilters.incubateesname ? "primary" : "default"
                          }
                        >
                          <FaFilter size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>Associated By</Typography>
                      <Tooltip title="Filter">
                        <IconButton
                          size="small"
                          onClick={(e) =>
                            handleFilterClick(e, "usrincassncreatedbyname")
                          }
                          color={
                            columnFilters.usrincassncreatedbyname
                              ? "primary"
                              : "default"
                          }
                        >
                          <FaFilter size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  {hasWriteAccess && (
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography>Actions</Typography>
                        {hasActiveFilters && (
                          <Tooltip title="Clear all filters">
                            <IconButton size="small" onClick={clearAllFilters}>
                              <FaTimes />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    )}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((user) => {
                  const hasAssociations = user.associations.length > 0;
                  const rowCount = Math.max(1, user.associations.length);

                  return (
                    <React.Fragment key={user.usersrecid}>
                      {Array.from({ length: rowCount }).map((_, index) => (
                        <TableRow
                          key={`${user.usersrecid}-${index}`}
                          hover
                          role="checkbox"
                          tabIndex={-1}
                        >
                          {index === 0 ? (
                            <>
                              <TableCell
                                rowSpan={rowCount}
                                sx={{
                                  verticalAlign: "middle",
                                  textAlign: "center",
                                  borderRight:
                                    "1px solid rgba(224, 224, 224, 1)",
                                  padding: "16px",
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body1"
                                    fontWeight="medium"
                                  >
                                    {user.usersname}
                                  </Typography>
                                  {hasWriteAccess && (
                                    <Tooltip title="Edit associations">
                                      <IconButton
                                        size="small"
                                        onClick={() => startEditing(user)}
                                      >
                                        <FaEdit size={16} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell
                                rowSpan={rowCount}
                                sx={{
                                  verticalAlign: "middle",
                                  textAlign: "center",
                                  borderRight:
                                    "1px solid rgba(224, 224, 224, 1)",
                                  padding: "16px",
                                }}
                              >
                                {user.userscreatedby}
                              </TableCell>
                            </>
                          ) : null}

                          {hasAssociations ? (
                            <>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">
                                    {user.associations[index].incubateesname}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    {formatDate(
                                      user.associations[index]
                                        .usrincassncreatedtime
                                    )}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {user.associations[index]
                                  .usrincassncreatedbyname || "N/A"}
                              </TableCell>
                              {hasWriteAccess && (
                                <TableCell>
                                  <Tooltip title="Remove association">
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleDelete(
                                          user.associations[index].usrincassnrecid
                                        )
                                      }
                                      disabled={isDeleting}
                                    >
                                      {isDeleting ? (
                                        <FaSpinner
                                          className="spinner"
                                          size={14}
                                        />
                                      ) : (
                                        <FaTrash size={14} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              )}
                            </>
                          ) : (
                            <TableCell colSpan={hasWriteAccess ? 3 : 2}>
                              <Typography color="textSecondary">
                                No companies associated
                              </Typography>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {!loading && filteredData.length === 0 && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Typography color="textSecondary">
            {searchQuery || hasActiveFilters
              ? "No DDI users found matching your filters"
              : "No DDI users found"}
          </Typography>
        </Box>
      )}

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Card sx={{ minWidth: 280, maxWidth: 400 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filter by {filterColumn === "usersname" && "Name"}
              {filterColumn === "userscreatedby" && "Created By"}
              {filterColumn === "incubateesname" && "Companies"}
              {filterColumn === "usrincassncreatedbyname" && "Associated By"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={`Enter ${filterColumn === "usersname" && "name"}
                ${filterColumn === "userscreatedby" && "created by"}
                ${filterColumn === "incubateesname" && "company"}
                ${
                  filterColumn === "usrincassncreatedbyname" && "associated by"
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

      {/* Edit Modal */}
      <Dialog
        open={Boolean(editingUserId)}
        onClose={cancelEditing}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit DDI Associations</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Select Incubatees:
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
              gap: 1,
              maxHeight: 300,
              overflow: "auto",
            }}
          >
            {incubatees.map((incubatee) => (
              <FormControlLabel
                key={incubatee.incubateesrecid}
                control={
                  <Checkbox
                    checked={selectedIncubatees.includes(
                      incubatee.incubateesrecid
                    )}
                    onChange={() =>
                      handleCheckboxChange(incubatee.incubateesrecid)
                    }
                    disabled={updateLoading}
                  />
                }
                label={incubatee.incubateesname}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEditing} disabled={updateLoading}>
            Cancel
          </Button>
          {hasWriteAccess && (
            <Button
              onClick={updateAssociations}
              variant="contained"
              disabled={updateLoading}
              startIcon={
                updateLoading && <FaSpinner className="spinner" size={14} />
              }
            >
              {updateLoading ? "Updating..." : "Save Changes"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </div>
  );
}