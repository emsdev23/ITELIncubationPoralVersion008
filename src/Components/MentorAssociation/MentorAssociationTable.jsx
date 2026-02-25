import React, { useState, useEffect, useMemo } from "react";
import {
  FaTrash,
  FaEdit,
  FaUserTie,
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
import "./UserAssociationTable.css"; // Reusing existing CSS
import { IPAdress } from "../Datafetching/IPAdrees";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess"; // Import the custom hook

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

export default function MentorAssociationTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const IP = IPAdress;

  // Use the custom hook to check write access
  const hasWriteAccess = useWriteAccess(
    "/Incubation/Dashboard/MentorAssociation",
  );

  // States
  const [associations, setAssociations] = useState([]); // Stores the links/associations
  const [allMentors, setAllMentors] = useState([]); // Stores the list of all mentors (Role 12)

  // NOTE: 'incubatees' state variable is used to hold the 'Users' list for selection,
  // to maintain consistency with existing column headers and logic.
  const [incubatees, setIncubatees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMentorId, setEditingMentorId] = useState(null);
  const [selectedIncubatees, setSelectedIncubatees] = useState([]);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Column filters
  const [columnFilters, setColumnFilters] = useState({
    mentorname: "",
    mentorcreatedby: "",
    incubateesname: "",
    mentorincassncreatedbyname: "",
  });

  // Filter popover states
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterColumn, setFilterColumn] = useState(null);

  // Sorting states
  const [sortColumn, setSortColumn] = useState("mentorname");
  const [sortDirection, setSortDirection] = useState("asc");

  // --- 1. Fetch Mentor Associations (The Links) ---
  const fetchAssociations = async () => {
    try {
      const response = await api.post(
        "resources/generic/getmentorincassndetails",
        {
          userId: parseInt(userId) || 1,
          userIncId: incUserid,
          headers: {
            "X-Module": "Mentor Association",
            "X-Action": "Fetch Mentor Associations",
          },
        },
      );

      if (response.data.statusCode === 200) {
        const data = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data && Array.isArray(response.data.data)
            ? response.data.data
            : [];
        setAssociations(data);
      } else {
        throw new Error(
          response.data.message || "Failed to fetch mentor associations",
        );
      }
    } catch (err) {
      console.error("Error fetching mentor associations:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load mentor associations. Please try again.";
      setError(errorMessage);
      setAssociations([]);
    }
  };

  // --- 2. Fetch All Mentors (Role 12) ---
  const fetchAllMentors = async () => {
    try {
      const response = await api.post("resources/generic/getusers", {
        userId: parseInt(userId) || 1,
        userIncId: incUserid,
        headers: {
          "X-Module": "Mentor Association",
          "X-Action": "Fetch All Mentors",
        },
      });

      if (response.data.statusCode === 200) {
        const rawData = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data && Array.isArray(response.data.data)
            ? response.data.data
            : [];

        // FILTER: Keep only users where usersrolesrecid is 12
        const mentorsOnly = rawData.filter(
          (user) => user.usersrolesrecid === 12,
        );

        setAllMentors(mentorsOnly);
      } else {
        console.warn("Failed to fetch full mentor list", response.data.message);
      }
    } catch (err) {
      console.warn("Error fetching all mentors:", err);
    }
  };

  // --- 3. Fetch Users (Roles 4, 5, 6) for Selection ---
  const fetchIncubatees = async () => {
    try {
      const response = await api.post("resources/generic/getusers", {
        userId: parseInt(userId) || 1,
        userIncId: incUserid,
        headers: {
          "X-Module": "Mentor Association",
          "X-Action": "Fetch Users List",
        },
      });

      if (response.data.statusCode === 200) {
        const rawData = Array.isArray(response.data.data)
          ? response.data.data
          : response.data.data && Array.isArray(response.data.data)
            ? response.data.data
            : [];

        // FILTER: Keep only users where usersrolesrecid is 4, 5, or 6
        const allowedRoles = [4, 5, 6];
        const filteredUsers = rawData.filter((user) =>
          allowedRoles.includes(user.usersrolesrecid),
        );

        setIncubatees(filteredUsers);
      } else {
        throw new Error(response.data.message || "Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        "Failed to load users. Please try again.";
      Swal.fire("❌ Error", errorMessage, "error");
      setIncubatees([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    // Fetch all data in parallel
    Promise.all([
      fetchAssociations(),
      fetchAllMentors(),
      fetchIncubatees(),
    ]).finally(() => {
      setLoading(false);
    });
  }, []);

  // Normalize Data Logic:
  // We start with the full list of Mentors (Role 12) so they appear even with 0 associations.
  // Then we merge in the association details.
  const normalizedData = useMemo(() => {
    const mentorMap = {};

    // 1. Seed map with ALL mentors (Role 12) from fetchAllMentors
    allMentors.forEach((user) => {
      if (user.usersrecid) {
        mentorMap[user.usersrecid] = {
          mentorrecid: user.usersrecid,
          mentorname: user.usersname || "Unknown Mentor",
          mentorcreatedby: user.userscreatedby || "N/A",
          associations: [], // Initialize empty
        };
      }
    });

    // 2. Merge in active associations
    associations.forEach((item) => {
      if (item.mentorincassnid) {
        const mentorId = item.mentorincassnuserrecid;

        // If mentor exists in our list (should), add the association
        if (mentorMap[mentorId]) {
          mentorMap[mentorId].associations.push({
            mentorincassnid: item.mentorincassnid,
            incubateesname: item.incubateeusername || "Unknown User", // This is the name of the associated user
            incubationsrecid: item.mentorincassnincubationid,
            mentorincassnincuserrecid: item.mentorincassnincuserrecid, // This is the ID of the associated user
            mentorincassncreatedtime: item.mentorincassncreatedtime,
            mentorincassncreatedbyname: item.createdname || "N/A",
            mentorincassnmodifiedtime: item.mentorincassnmodifiedtime,
          });
        }
      }
    });

    return Object.values(mentorMap);
  }, [associations, allMentors]);

  // Apply column filters and search query
  const filteredData = useMemo(() => {
    let filtered = [...normalizedData];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((mentor) =>
        mentor.mentorname.toLowerCase().includes(query),
      );
    }

    if (columnFilters.mentorname) {
      const nameQuery = columnFilters.mentorname.toLowerCase();
      filtered = filtered.filter((mentor) =>
        mentor.mentorname.toLowerCase().includes(nameQuery),
      );
    }

    if (columnFilters.mentorcreatedby) {
      const createdByQuery = columnFilters.mentorcreatedby.toLowerCase();
      filtered = filtered.filter((mentor) =>
        mentor.mentorcreatedby.toLowerCase().includes(createdByQuery),
      );
    }

    if (
      columnFilters.incubateesname ||
      columnFilters.mentorincassncreatedbyname
    ) {
      filtered = filtered.map((mentor) => {
        const filteredAssociations = mentor.associations.filter((assoc) => {
          let matchesIncubatee = true;
          let matchesCreatedBy = true;

          if (columnFilters.incubateesname) {
            const incubateeQuery = columnFilters.incubateesname.toLowerCase();
            matchesIncubatee = assoc.incubateesname
              .toLowerCase()
              .includes(incubateeQuery);
          }

          if (columnFilters.mentorincassncreatedbyname) {
            const createdByQuery =
              columnFilters.mentorincassncreatedbyname.toLowerCase();
            matchesCreatedBy = (assoc.mentorincassncreatedbyname || "N/A")
              .toLowerCase()
              .includes(createdByQuery);
          }

          return matchesIncubatee && matchesCreatedBy;
        });

        return {
          ...mentor,
          associations: filteredAssociations,
        };
      });

      // Filter out mentors who have no associations left after the specific incubatee filter
      filtered = filtered.filter((mentor) => mentor.associations.length > 0);
    }

    return filtered;
  }, [normalizedData, searchQuery, columnFilters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!filteredData.length) return [];

    return [...filteredData].sort((a, b) => {
      let aValue, bValue;

      switch (sortColumn) {
        case "mentorname":
          aValue = a.mentorname || "";
          bValue = b.mentorname || "";
          break;
        case "mentorcreatedby":
          aValue = a.mentorcreatedby || "";
          bValue = b.mentorcreatedby || "";
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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Export Data
  const exportData = useMemo(() => {
    const exportArray = [];

    sortedData.forEach((mentor) => {
      if (mentor.associations.length > 0) {
        mentor.associations.forEach((assoc) => {
          exportArray.push({
            "Mentor Name": mentor.mentorname,
            "Created By": mentor.mentorcreatedby,
            User: assoc.incubateesname, // Changed from "Incubatee"
            "Associated By": assoc.mentorincassncreatedbyname || "N/A",
            "Association Date": formatDate(assoc.mentorincassncreatedtime),
          });
        });
      } else {
        exportArray.push({
          "Mentor Name": mentor.mentorname,
          "Created By": mentor.mentorcreatedby,
          User: "No users associated",
          "Associated By": "N/A",
          "Association Date": "",
        });
      }
    });

    return exportArray;
  }, [sortedData]);

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mentor Associations");
    XLSX.writeFile(wb, "Mentor_Associations.xlsx");
  };

  // Filter handlers
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
      mentorname: "",
      mentorcreatedby: "",
      incubateesname: "",
      mentorincassncreatedbyname: "",
    });
    setSearchQuery("");
    setPage(0);
  };

  const handleSort = (column) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

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

  // Edit handlers
  const startEditing = (mentor) => {
    if (!hasWriteAccess) {
      Swal.fire(
        "Access Denied",
        "You do not have permission to edit associations.",
        "warning",
      );
      return;
    }
    setEditingMentorId(mentor.mentorrecid);
    // Map associations to get the list of selected usersrecid
    const mentorUsers = mentor.associations.map(
      (assoc) => assoc.mentorincassnincuserrecid,
    );
    setSelectedIncubatees(mentorUsers);
  };

  const cancelEditing = () => {
    setEditingMentorId(null);
    setSelectedIncubatees([]);
  };

  const handleCheckboxChange = (usersrecid) => {
    setSelectedIncubatees((prev) => {
      if (prev.includes(usersrecid)) {
        return prev.filter((id) => id !== usersrecid);
      } else {
        return [...prev, usersrecid];
      }
    });
  };

  // Update Associations (Add/Remove Logic)
  const updateAssociations = () => {
    if (!editingMentorId) return;

    if (!hasWriteAccess) {
      Swal.fire(
        "Access Denied",
        "You do not have permission to modify associations.",
        "warning",
      );
      return;
    }

    setUpdateLoading(true);

    const currentMentorAssociations = associations.filter(
      (assoc) => assoc.mentorincassnuserrecid === editingMentorId,
    );

    const currentIncubateeIds = currentMentorAssociations.map(
      (assoc) => assoc.mentorincassnincuserrecid,
    );

    const toAdd = selectedIncubatees.filter(
      (id) => !currentIncubateeIds.includes(id),
    );

    const toRemove = currentMentorAssociations.filter(
      (assoc) => !selectedIncubatees.includes(assoc.mentorincassnincuserrecid),
    );

    // --- ADD Promises ---
    const addPromises = toAdd.map((usersrecid) => {
      // Find the user object from the list to get incubation ID
      const user = incubatees.find((u) => u.usersrecid === usersrecid);
      const incubationId = user ? user.usersincubationsrecid : null;

      return api
        .post("/addMentorIncAssn", null, {
          params: {
            mentorincassnuserrecid: editingMentorId,
            mentorincassnincuserrecid: usersrecid, // Using usersrecid directly as requested
            mentorincassnincubationid: incubationId || incUserid,
            mentorincassnadminstate: 1,
            mentorincassncreatedby: userId || "1",
            mentorincassnmodifiedby: userId || "1",
          },
          headers: {
            userid: userId || "1",
            "X-Module": "DDI Mentor Association",
            "X-Action": "Add Mentor Association",
          },
        })
        .then((res) => {
          if (res.data.statusCode !== 200) {
            throw new Error(res.data.message || "Failed to add association");
          }
          return { success: true, usersrecid, action: "add" };
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "An unknown error occurred";
          return {
            success: false,
            usersrecid,
            action: "add",
            error: errorMessage,
          };
        });
    });

    // --- REMOVE Promises ---
    const removePromises = toRemove.map((association) => {
      return api
        .post("/deleteMentorIncAssn", null, {
          params: {
            mentorincassnid: association.mentorincassnid,
            mentorincassnmodifiedby: userId || "1",
          },
          headers: {
            userid: userId || "1",
            "X-Module": "DDI Mentor Association",
            "X-Action": "Delete Mentor Association",
          },
        })
        .then((res) => {
          if (res.data.statusCode !== 200) {
            throw new Error(res.data.message || "Failed to remove association");
          }
          return {
            success: true,
            associationId: association.mentorincassnid,
            action: "remove",
          };
        })
        .catch((error) => {
          const errorMessage =
            error.response?.data?.message ||
            error.message ||
            "An unknown error occurred";
          return {
            success: false,
            associationId: association.mentorincassnid,
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
            "Mentor associations updated successfully!",
            "success",
          );
          fetchAssociations();
          cancelEditing();
        } else if (successful.length > 0) {
          const errorMessages = failed
            .map((f) => {
              if (f.action === "add") {
                return `Failed to add user ${f.usersrecid}: ${f.error}`;
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
                return `Failed to add user ${f.usersrecid}: ${f.error}`;
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
        console.error("Error updating mentor associations:", err);
        Swal.fire("❌ Error", "Failed to update mentor associations", "error");
      })
      .finally(() => {
        setUpdateLoading(false);
      });
  };

  // Delete Association
  const handleDelete = (associationId) => {
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
      preConfirm: () => {
        setIsDeleting(true);
        // Using api.post for consistency
        return api
          .post("/deleteMentorIncAssn", null, {
            params: {
              mentorincassnmodifiedby: userId || "1",
              mentorincassnid: associationId,
            },
            headers: {
              "X-Module": "Mentor Association",
              "X-Action": "Delete Mentor Association",
            },
          })
          .then((res) => {
            if (res.data.statusCode !== 200) {
              throw new Error(
                res.data.message || "Failed to delete association",
              );
            }
            return res.data;
          })
          .catch((error) => {
            Swal.showValidationMessage(`Request failed: ${error.message}`);
            throw error;
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

  const paginatedData = useMemo(() => {
    return sortedData.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage,
    );
  }, [sortedData, page, rowsPerPage]);

  const hasActiveFilters = Object.values(columnFilters).some(
    (value) => value !== "",
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
          <FaUserTie style={{ marginRight: "8px" }} />
          Mentor–User Associations
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            placeholder="Search mentors..."
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
              filename="mentor_Associations.csv"
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
          <Typography>Loading mentor associations...</Typography>
        </Box>
      ) : (
        <Paper elevation={2} sx={{ width: "100%", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: 800 }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>Mentor Name</Typography>
                      <Tooltip title="Sort">
                        <IconButton
                          size="small"
                          onClick={() => handleSort("mentorname")}
                        >
                          {getSortIcon("mentorname")}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Filter">
                        <IconButton
                          size="small"
                          onClick={(e) => handleFilterClick(e, "mentorname")}
                          color={
                            columnFilters.mentorname ? "primary" : "default"
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
                          onClick={() => handleSort("mentorcreatedby")}
                        >
                          {getSortIcon("mentorcreatedby")}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Filter">
                        <IconButton
                          size="small"
                          onClick={(e) =>
                            handleFilterClick(e, "mentorcreatedby")
                          }
                          color={
                            columnFilters.mentorcreatedby
                              ? "primary"
                              : "default"
                          }
                        >
                          <FaFilter size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography>Users</Typography>
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
                            handleFilterClick(e, "mentorincassncreatedbyname")
                          }
                          color={
                            columnFilters.mentorincassncreatedbyname
                              ? "primary"
                              : "default"
                          }
                        >
                          <FaFilter size={14} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
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
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedData.map((mentor) => {
                  const hasAssociations = mentor.associations.length > 0;
                  const rowCount = Math.max(1, mentor.associations.length);

                  return (
                    <React.Fragment key={mentor.mentorrecid}>
                      {Array.from({ length: rowCount }).map((_, index) => (
                        <TableRow
                          key={`${mentor.mentorrecid}-${index}`}
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
                                    {mentor.mentorname}
                                  </Typography>
                                  {hasWriteAccess && (
                                  <Tooltip title="Edit associations">
                                    <IconButton
                                      size="small"
                                      onClick={() => startEditing(mentor)}
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
                                {mentor.mentorcreatedby}
                              </TableCell>
                            </>
                          ) : null}

                          {hasAssociations ? (
                            <>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">
                                    {mentor.associations[index].incubateesname}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="textSecondary"
                                  >
                                    {formatDate(
                                      mentor.associations[index]
                                        .mentorincassncreatedtime,
                                    )}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                {mentor.associations[index]
                                  .mentorincassncreatedbyname || "N/A"}
                              </TableCell>
                              {hasWriteAccess && (
                              <TableCell>
                                <Tooltip title="Remove association">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDelete(
                                        mentor.associations[index]
                                          .mentorincassnid,
                                      )
                                    }
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
                            <TableCell colSpan={3}>
                              <Typography color="textSecondary">
                                No users associated
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
              ? "No mentors found matching your filters"
              : "No mentors found"}
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
              Filter by {filterColumn === "mentorname" && "Mentor Name"}
              {filterColumn === "mentorcreatedby" && "Created By"}
              {filterColumn === "incubateesname" && "Users"}
              {filterColumn === "mentorincassncreatedbyname" && "Associated By"}
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder={`Enter ${filterColumn === "mentorname" && "name"}
                ${filterColumn === "mentorcreatedby" && "created by"}
                ${filterColumn === "incubateesname" && "user name"}
                ${
                  filterColumn === "mentorincassncreatedbyname" &&
                  "associated by"
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
        open={Boolean(editingMentorId)}
        onClose={cancelEditing}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Mentor Associations</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Select Users:
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
            {incubatees.map((user) => (
              <FormControlLabel
                key={user.usersrecid} // Key is usersrecid
                control={
                  <Checkbox
                    checked={selectedIncubatees.includes(
                      user.usersrecid, // Check uses usersrecid
                    )}
                    onChange={
                      () => handleCheckboxChange(user.usersrecid) // Change uses usersrecid
                    }
                    disabled={updateLoading}
                  />
                }
                label={`${user.usersname} (${user.incubateesname})`}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelEditing} disabled={updateLoading}>
            Cancel
          </Button>
          <Button
            onClick={updateAssociations}
            variant="contained"
            disabled={updateLoading || !hasWriteAccess}
            startIcon={
              updateLoading && <FaSpinner className="spinner" size={14} />
            }
          >
            {updateLoading ? "Updating..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
