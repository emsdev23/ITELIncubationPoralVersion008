import React, { useState, useEffect, useMemo, useContext } from "react";
import {
  FaTrash,
  FaEdit,
  FaUsers,
  FaTimes,
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
import { DataContext } from "../Datafetching/DataProvider"; // Import Context
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

export default function UserAssociationTable() {
  // --- CONTEXT & ACCESS CONTROL ---
  const { menuItemsFromAPI } = useContext(DataContext);
  
  // Check write access for this specific route
  const hasWriteAccess = useWriteAccess("/Incubation/Dashboard/Userassociation");

  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const IP = IPAdress;

  // Existing states
  const [associations, setAssociations] = useState([]);
  const [incubatees, setIncubatees] = useState([]);
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

  // Sorting states
  const [sortColumn, setSortColumn] = useState("usersname");
  const [sortDirection, setSortDirection] = useState("asc");

  // Fetch user associations
  const fetchAssociations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post("resources/generic/getuserasslist", {
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
        throw new Error(response.data.message || "Failed to fetch user associations");
      }
    } catch (err) {
      console.error("Error fetching user associations:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to load user associations. Please try again.";
      setError(errorMessage);
      setAssociations([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch incubatees list
  const fetchIncubatees = async () => {
      try {
        const response = await api.post("/resources/generic/getinclist", {
          userId: userId || null,
          incUserId: incUserid,
        });

        if (response.data.statusCode === 200) {
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
        Swal.fire("❌ Error", errorMessage, "error");
        setIncubatees([]);
      }
    };

  useEffect(() => {
    fetchAssociations();
    fetchIncubatees();
  }, []);

  // Normalize the associations data to handle both associated and unassociated users
  const normalizedData = useMemo(() => {
    if (!Array.isArray(associations)) {
      console.error("Associations state is not an array:", associations);
      return []; 
    }

    const userMap = {};

    associations.forEach((item) => {
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
      } else {
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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user) =>
        user.usersname.toLowerCase().includes(query)
      );
    }

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

      filtered = filtered.filter(
        (user) =>
          user.associations.length > 0 || user.usersname.includes(searchQuery)
      );
    }

    return filtered;
  }, [normalizedData, searchQuery, columnFilters]);

  // Sort the filtered data based on the current sort column and direction
  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case "usersname":
          aValue = a.usersname || "";
          bValue = b.usersname || "";
          break;
        case "userscreatedby":
          aValue = a.userscreatedby || "";
          bValue = b.userscreatedby || "";
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Prepare data for export
  const exportData = useMemo(() => {
    const exportArray = [];

    sortedData.forEach((user) => {
      if (user.associations.length > 0) {
        user.associations.forEach((assoc) => {
          exportArray.push({
            "Operator Name": user.usersname,
            "Created By": user.userscreatedby,
            Company: assoc.incubateesname,
            "Associated By": assoc.usrincassncreatedbyname || "N/A",
            "Association Date": formatDate(assoc.usrincassncreatedtime),
          });
        });
      } else {
        exportArray.push({
          "Operator Name": user.usersname,
          "Created By": user.userscreatedby,
          Company: "No companies associated",
          "Associated By": "N/A",
          "Association Date": "",
        });
      }
    });

    return exportArray;
  }, [sortedData]);

  // Export handlers
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operator Associations");
    XLSX.writeFile(wb, "Operator_Associations.xlsx");
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
    setColumnFilters((prev) => ({
      ...prev,
      [column]: value,
    }));
    setPage(0); 
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

  // Function to handle sorting
  const handleSort = (column) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Function to get the appropriate sort icon for a column
  const getSortIcon = (column) => {
    if (sortColumn !== column) {
      return <FaSort className="sort-icon" />;
    }
    return sortDirection === "asc" ? (
      <FaSortUp className="sort-icon active" />
    ) : (
      <FaSortDown className="sort-icon active" />
    );
  };

  // Start editing a user's incubatees
  const startEditing = (user) => {
    setEditingUserId(user.usersrecid);
    const userIncubatees = user.associations.map(
      (assoc) => assoc.usrincassnincubateesrecid
    );
    setSelectedIncubatees(userIncubatees);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingUserId(null);
    setSelectedIncubatees([]);
  };

  // Handle checkbox change for edit modal
  const handleCheckboxChange = (incubateeId) => {
    setSelectedIncubatees((prev) => {
      if (prev.includes(incubateeId)) {
        return prev.filter((id) => id !== incubateeId);
      } else {
        return [...prev, incubateeId];
      }
    });
  };

  // Update user associations
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
          const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
          return {
            success: false,
            incubateeId,
            action: "add",
            error: errorMessage,
          };
        });
    });

    const removePromises = toRemove.map((association) => {
      return api.post("/deleteUserIncubationAssociation", null, {
        params: {
          usrincassnmodifiedby: userId || "1",
          usrincassnrecid: association.usrincassnrecid,
        },
        headers: {
          userid: userId || "1",
          "X-Module": "DDI User Association",
          "X-Action": "Delete DDI user Association",
        },
      })
        .then((res) => {
          if (res.data.statusCode !== 200) {
            throw new Error(res.data.message || "Failed to remove association");
          }
          return {
            success: true,
            associationId: association.usrincassnrecid,
            action: "remove",
          };
        })
        .catch((error) => {
          const errorMessage = error.response?.data?.message || error.message || "An unknown error occurred";
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
            "User associations updated successfully!",
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
        console.error("Error updating user associations:", err);
        Swal.fire("❌ Error", "Failed to update user associations", "error");
      })
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  // Delete association
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
            "X-Module": "user Association",
            "X-Action": "Delete  Operator user Association",
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
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [sortedData, page, rowsPerPage]);

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
          Operator–Incubatee Associations
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
              filename="Operator_Associations.csv"
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
          <Typography>Loading user associations...</Typography>
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
                      <Tooltip title="Sort">
                        <IconButton
                          size="small"
                          onClick={() => handleSort("usersname")}
                        >
                          {getSortIcon("usersname")}
                        </IconButton>
                      </Tooltip>
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
                      <Tooltip title="Sort">
                        <IconButton
                          size="small"
                          onClick={() => handleSort("userscreatedby")}
                        >
                          {getSortIcon("userscreatedby")}
                        </IconButton>
                      </Tooltip>
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
                  {/* Only show Actions Header if user has Write Access */}
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
                                  {/* Conditionally Render Edit Button */}
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
                              {/* Only Render Actions Cell if user has Write Access */}
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
                            // If no associations, and no write access, we don't need an empty cell spanning 3 columns
                            // But if there IS write access, we might want to show "No companies associated" in the Companies col,
                            // and empty actions col. 
                            // The original code spanned 3 columns (Companies, Associated By, Actions).
                            // We need to adjust colSpan based on access.
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
            count={sortedData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      )}

      {sortedData.length === 0 && !loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Typography color="textSecondary">
            {searchQuery || hasActiveFilters
              ? "No users found matching your filters"
              : "No users found"}
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
      {/* The modal can only be opened via the Edit button, which is hidden if !hasWriteAccess. 
          However, good practice ensures the Save button also checks access. */}
      <Dialog
        open={Boolean(editingUserId)}
        onClose={cancelEditing}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit User Associations</DialogTitle>
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