import React, { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { FaTrash, FaEdit, FaPlus } from "react-icons/fa";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";
import RoleAppList from "./RoleAppList";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid"; // Import the reusable component
import { IPAdress } from "../Datafetching/IPAdrees";
import api from "../Datafetching/api";

// Material UI imports
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled components for custom styling
const StyledChip = styled("div")(({ theme, status }) => {
  const getStatusColor = (status) => {
    return status === "Enabled"
      ? { backgroundColor: "#e8f5e9", color: "#2e7d32" }
      : { backgroundColor: "#ffebee", color: "#c62828" };
  };

  return {
    ...getStatusColor(status),
    fontWeight: 500,
    borderRadius: 4,
    padding: "4px 8px",
    display: "inline-block",
  };
});

export default function RolesTable() {
  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const incUserid = sessionStorage.getItem("incuserid");
  const roleId = sessionStorage.getItem("roleid");

  const API_BASE_URL = IPAdress;

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State to manage the selected role for the detail view
  const [selectedRole, setSelectedRole] = useState({ id: null, name: "" });

  // Loading states for operations
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(null);
  const [isDeleting, setIsDeleting] = useState(null);

  // Check if XLSX is available
  const isXLSXAvailable = !!XLSX;

  // Fetch all roles using the specific API endpoint
  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        "/resources/generic/getroledetails",
        {
          userId: userId || 1,
          userIncId: "ALL",
        },
        {
          headers: {
            userid: userId || "1",
            "X-Module": "Roles Management",
            "X-Action": "Fetching Roles Details List",
          },
        },
      );

      const result = response.data;
      // setLogs(result.data);
      // const data = response.data;
      if (result.data) {
        setRoles(result.data);
      } else {
        setError(result.message || "Failed to fetch logs");
      }
    } catch (err) {
      console.error("Error fetching roles:", err);
      setError("Failed to load roles. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Delete role - Updated to use the specific API endpoint
  const handleDelete = (role) => {
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete ${role.rolesname}. This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsDeleting(role.rolesrecid);

        // Use your api instance instead of fetch
        api
          .post(
            "/deleteRole",
            {
              rolesrecid: role.rolesrecid,
              rolesmodifiedby: userId || "39",
            },
            {
              headers: {
                "X-Module": "Role Management",
                "X-Action": "Deleting Role",
              },
            },
          )
          .then((response) => {
            const data = response.data;
            if (data.statusCode === 200) {
              Swal.fire(
                "Deleted!",
                `${role.rolesname} has been deleted successfully.`,
                "success",
              );
              fetchRoles(); // Refresh the role list
            } else {
              throw new Error(data.message || "Failed to delete role");
            }
          })
          .catch((err) => {
            console.error("Error deleting role:", err);
            Swal.fire(
              "Error",
              `Failed to delete ${role.rolesname}: ${err.message}`,
              "error",
            );
          })
          .finally(() => {
            setIsDeleting(null);
          });
      }
    });
  };

  // Add new role

  const handleAddRole = () => {
    Swal.fire({
      title: "Add New Role",
      html: `
      <div class="swal-form-container">
        <div class="swal-form-row">
          <input id="swal-name" class="swal2-input" placeholder="Role Name" required>
        </div>
        <div class="swal-form-row">
          <select id="swal-state" class="swal2-select" required>
            <option value="" disabled selected>Select state</option>
            <option value="Enabled">Enabled</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>
        <div class="swal-form-row">
          <textarea id="swal-description" class="swal2-textarea" placeholder="Description" rows="4" required></textarea>
        </div>
      </div>
    `,
      width: "600px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById("swal-name");
        const state = document.getElementById("swal-state");
        const description = document.getElementById("swal-description");

        if (!name || !state || !description) {
          Swal.showValidationMessage("Form elements not found");
          return false;
        }

        if (!name.value || !state.value || !description.value) {
          Swal.showValidationMessage("Please fill all required fields");
          return false;
        }

        return {
          rolesname: name.value,
          rolesadminstate: state.value,
          rolesdescription: description.value,
        };
      },
      didOpen: () => {
        const style = document.createElement("style");
        style.textContent = `
        .swal-form-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .swal-form-row {
          width: 100%;
        }
        .swal2-input, .swal2-select, .swal2-textarea {
          width: 100% !important;
          margin: 0 !important;
        }
        .swal2-select, .swal2-textarea {
          padding: 0.75em !important;
        }
      `;
        document.head.appendChild(style);
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const formData = result.value;
        setIsAdding(true);

        // Use your api instance instead of fetch
        api
          .post(
            "/addRole",
            {
              rolesname: formData.rolesname,
              rolesadminstate:
                formData.rolesadminstate === "Enabled" ? "1" : "0",
              rolesdescription: formData.rolesdescription,
              rolescreatedby: userId || "system",
              rolesmodifiedby: userId || "system",
            },
            {
              headers: {
                "X-Module": "Role Management",
                "X-Action": "Adding New Role",
              },
            },
          )
          .then((response) => {
            const data = response.data;
            if (data.statusCode === 200) {
              Swal.fire("✅ Success", "Role added successfully", "success");
              fetchRoles();
            } else {
              Swal.fire(
                "❌ Error",
                data.message || "Failed to add role",
                "error",
              );
            }
          })
          .catch((err) => {
            console.error("Error adding role:", err);
            if (
              err.name === "TypeError" &&
              err.message.includes("Failed to fetch")
            ) {
              Swal.fire(
                "❌ CORS Error",
                "Unable to connect to the server. This might be a CORS issue. Please contact your system administrator.",
                "error",
              );
            } else {
              Swal.fire(
                "❌ Error",
                err.message || "Something went wrong",
                "error",
              );
            }
          })
          .finally(() => {
            setIsAdding(false);
          });
      }
    });
  };

  // Edit role with popup form - Updated to use the specific API endpoint
  const handleEdit = (role) => {
    Swal.fire({
      title: "Edit Role",
      html: `
      <div class="swal-form-container">
        <div class="swal-form-row">
          <input id="swal-name" class="swal2-input" placeholder="Role Name" value="${
            role.rolesname || ""
          }">
        </div>
        <div class="swal-form-row">
          <select id="swal-state" class="swal2-select">
            <option value="Enabled" ${
              role.rolesadminstate === "Enabled" ? "selected" : ""
            }>Enabled</option>
            <option value="Disabled" ${
              role.rolesadminstate === "Disabled" ? "selected" : ""
            }>Disabled</option>
          </select>
        </div>
        <div class="swal-form-row">
          <textarea id="swal-description" class="swal2-textarea" placeholder="Description" rows="4">${
            role.rolesdescription || ""
          }</textarea>
        </div>
      </div>
    `,
      width: "600px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById("swal-name");
        const state = document.getElementById("swal-state");
        const description = document.getElementById("swal-description");

        if (!name || !state || !description) {
          Swal.showValidationMessage("Form elements not found");
          return false;
        }

        return {
          rolesname: name.value,
          rolesadminstate: state.value,
          rolesdescription: description.value,
        };
      },
      didOpen: () => {
        const style = document.createElement("style");
        style.textContent = `
        .swal-form-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .swal-form-row {
          width: 100%;
        }
        .swal2-input, .swal2-select, .swal2-textarea {
          width: 100% !important;
          margin: 0 !important;
        }
        .swal2-select, .swal2-textarea {
          padding: 0.75em !important;
        }
      `;
        document.head.appendChild(style);
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const formData = result.value;
        setIsUpdating(role.rolesrecid);

        // Use your api instance instead of fetch
        api
          .post(
            "/updateRole",
            {
              rolesrecid: role.rolesrecid,
              rolesname: formData.rolesname,
              rolesadminstate:
                formData.rolesadminstate === "Enabled" ? "1" : "0",
              rolesdescription: formData.rolesdescription,
              rolesmodifiedby: userId || "0",
            },
            {
              headers: {
                "X-Module": "Role Management",
                "X-Action": "Updating Role",
              },
            },
          )
          .then((response) => {
            const data = response.data;
            if (data.statusCode === 200) {
              Swal.fire("✅ Success", "Role updated successfully", "success");
              fetchRoles();
            } else {
              Swal.fire(
                "❌ Error",
                data.message || "Failed to update role",
                "error",
              );
            }
          })
          .catch((err) => {
            console.error("Error updating role:", err);
            if (
              err.name === "TypeError" &&
              err.message.includes("Failed to fetch")
            ) {
              Swal.fire(
                "❌ CORS Error",
                "Unable to connect to the server. This might be a CORS issue. Please contact your system administrator.",
                "error",
              );
            } else {
              Swal.fire("❌ Error", "Something went wrong", "error");
            }
          })
          .finally(() => {
            setIsUpdating(null);
          });
      }
    });
  };

  // Function to check if delete should be disabled for a role
  const shouldDisableDelete = (role) => {
    return role.rolesrecid === 0 || role.rolesrecid === 1;
  };

  // Handler for when a role is clicked
  const handleRoleClick = (role) => {
    setSelectedRole({ id: role.rolesrecid, name: role.rolesname });
  };

  // Define columns for ReusableDataGrid
  const columns = [
    {
      field: "rolesrecid",
      headerName: "S.No",
      width: 80,
      sortable: true,
      renderCell: (params) => {
        // Ensure we have valid params and row
        if (!params || !params.api || !params.row) return "1";

        const rowIndex = params.api.getRowIndexRelativeToVisibleRows(
          params.row.id,
        );
        const pageSize = params.api.state.pagination.pageSize;
        const currentPage = params.api.state.pagination.page;

        // Ensure we have valid numbers
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
      field: "rolesname",
      headerName: "Role Name",
      width: 200,
      sortable: true,
      renderCell: (params) => {
        return (
          <Button
            variant="text"
            color="primary"
            onClick={() => handleRoleClick(params.row)}
            sx={{ justifyContent: "flex-start", textTransform: "none" }}
          >
            {params.row.rolesname || ""}
          </Button>
        );
      },
    },
    {
      field: "rolesadminstate",
      headerName: "State",
      width: 120,
      sortable: true,
      renderCell: (params) => {
        return (
          <StyledChip status={params.row.rolesadminstate}>
            {params.row.rolesadminstate || ""}
          </StyledChip>
        );
      },
    },
    {
      field: "rolesdescription",
      headerName: "Description",
      width: 250,
      sortable: true,
    },
    {
      field: "rolescreatedtime",
      headerName: "Created Time",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        return params.row.rolescreatedtime?.replace("T", " ") || "-";
      },
    },
    {
      field: "rolesmodifiedtime",
      headerName: "Modified Time",
      width: 180,
      sortable: true,
      renderCell: (params) => {
        return params.row.rolesmodifiedtime?.replace("T", " ") || "-";
      },
    },
    {
      field: "rolescreatedby",
      headerName: "Created By",
      width: 120,
      sortable: true,
    },
    {
      field: "rolesmodifiedby",
      headerName: "Modified By",
      width: 120,
      sortable: true,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      sortable: false,
      renderCell: (params) => {
        return (
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              color="primary"
              onClick={() => handleEdit(params.row)}
              disabled={
                isUpdating === params.row.rolesrecid ||
                isDeleting === params.row.rolesrecid
              }
            >
              {isUpdating === params.row.rolesrecid ? (
                <CircularProgress size={20} />
              ) : (
                <FaEdit size={18} />
              )}
            </IconButton>
            <IconButton
              color="error"
              onClick={() => handleDelete(params.row)}
              disabled={
                isDeleting === params.row.rolesrecid ||
                isUpdating === params.row.rolesrecid ||
                shouldDisableDelete(params.row)
              }
              title={
                shouldDisableDelete(params.row)
                  ? "Cannot delete system roles (superadmin or incubator admin)"
                  : ""
              }
            >
              {isDeleting === params.row.rolesrecid ? (
                <CircularProgress size={20} />
              ) : (
                <FaTrash size={18} />
              )}
            </IconButton>
          </Box>
        );
      },
    },
  ];

  // Custom export function to format data properly
  const onExportData = (data) => {
    return data.map((item) => ({
      "Role ID": item.rolesrecid || "",
      "Role Name": item.rolesname || "",
      State: item.rolesadminstate || "",
      Description: item.rolesdescription || "",
      "Created Time": item.rolescreatedtime?.replace("T", " ") || "",
      "Modified Time": item.rolesmodifiedtime?.replace("T", " ") || "",
      "Created By": item.rolescreatedby || "",
      "Modified By": item.rolesmodifiedby || "",
    }));
  };

  // Export configuration
  const exportConfig = {
    filename: "roles",
    sheetName: "Roles",
  };

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">🔐 Roles</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            startIcon={
              isAdding ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <FaPlus />
              )
            }
            onClick={handleAddRole}
            disabled={isAdding}
          >
            {isAdding ? "Adding..." : "Add Role"}
          </Button>
        </Box>
      </Box>

      {error && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: "error.light",
            color: "error.contrastText",
            borderRadius: 1,
          }}
        >
          {error}
        </Box>
      )}

      {/* Use the ReusableDataGrid component */}
      <ReusableDataGrid
        data={roles}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search by name or description..."
        searchFields={["rolesname", "rolesdescription"]}
        uniqueIdField="rolesrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        className="roles-table"
      />

      {/* Render the detail component below */}
      {selectedRole.id !== null && (
        <Box sx={{ mt: 3 }}>
          <RoleAppList
            roleId={selectedRole.id}
            roleName={selectedRole.name}
            token={token}
            userId={userId}
            onClose={() => setSelectedRole({ id: null, name: "" })}
          />
        </Box>
      )}

      {/* Loading overlay for operations */}
      {(isAdding || isUpdating !== null || isDeleting !== null) && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 9999,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 3,
              bgcolor: "background.paper",
              borderRadius: 1,
            }}
          >
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>
              {isAdding
                ? "Adding role..."
                : isUpdating !== null
                  ? "Updating role..."
                  : "Deleting role..."}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
