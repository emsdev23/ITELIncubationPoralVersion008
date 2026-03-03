import React, { useEffect, useState, useMemo, useContext } from "react";
import { FaSpinner, FaSave, FaTimes } from "react-icons/fa";
import { Download } from "lucide-react";
import Swal from "sweetalert2";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid"; // Import the reusable component

import api from "../Datafetching/api";
// Material UI imports
import { IPAdress } from "../Datafetching/IPAdrees";
import { DataContext } from "../Datafetching/DataProvider";
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import { styled } from "@mui/material/styles";

// Styled components for custom styling
const PermissionLabel = styled(Box)(({ theme, enabled }) => ({
  marginLeft: theme.spacing(1),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: enabled ? "#e8f5e9" : "#ffebee",
  color: enabled ? "#2e7d32" : "#c62828",
  fontSize: "0.75rem",
  fontWeight: 500,
}));

export default function RoleAppList({
  roleId,
  roleName,
  token,
  userId,
  onClose,
  onSaveSuccess,
}) {
  const API_BASE_URL = IPAdress;

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { fetchMenuItems } = useContext(DataContext);

  // Fetch applications whenever the roleId prop changes
  // Fetch logs function
  const Applications = async () => {
    if (roleId === null || roleId === undefined) return;
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        "/resources/generic/getapplist",
        {
          userId: userId || 35,
          roleId: roleId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            userid: userId || "1",
          },
        },
      );

      const result = response.data;
      if (result.statusCode === 200 && result.data) {
        // Process the data to add appId and isAssigned fields
        const processedData = result.data.map((app) => ({
          ...app,
          // Use appsinrolesguiid as the app ID
          appId: app.appsinrolesguiid,
          // Check if the app is assigned to the current role
          isAssigned: app.appsinrolesroleid === roleId,
        }));

        setApps(processedData);
      } else {
        setError(result.message || "Failed to fetch applications");
      }
    } catch (err) {
      setError("Error fetching applications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Refetch logs when date or modal open state changes
  useEffect(() => {
    Applications();
  }, [roleId, token, userId]);

  console.log("Applications Data:", apps);
  // Handle checkbox changes for permissions
  const handlePermissionChange = (appId, accessType, isChecked) => {
    const updatedApps = apps.map((app) => {
      if (app.appId === appId) {
        return {
          ...app,
          [accessType]: isChecked ? 1 : 0,
        };
      }
      return app;
    });

    setApps(updatedApps);
    setHasChanges(true);
  };

  // Handle assignment checkbox changes
  const handleAssignmentChange = (appId, isChecked) => {
    const updatedApps = apps.map((app) => {
      if (app.appId === appId) {
        return {
          ...app,
          isAssigned: isChecked,
          // When unassigning, reset permissions
          appsreadaccess: isChecked ? app.appsreadaccess : 0,
          appswriteaccess: isChecked ? app.appswriteaccess : 0,
        };
      }
      return app;
    });

    setApps(updatedApps);
    setHasChanges(true);
  };

  // Save changes to the API
  const saveChanges = async () => {
    setIsSaving(true);

    const updatePromises = apps.map((app) => {
      return api.post(
        "/addAppsInRoles",
        {
          appsinrolesroleid: app.isAssigned ? roleId : 0,
          appsinrolesguiid: app.appsinrolesguiid,
          appsreadaccess: app.isAssigned ? app.appsreadaccess : 0,
          appswriteaccess: app.isAssigned ? app.appswriteaccess : 0,
          appsinrolesadminstate: "1",
          appsinrolescreatedby: userId || "system",
          appsinrolesmodifiedby: userId || "system",
        },
        {
          headers: {
            "X-Module": "Role Management",
            "X-Action": "Updating App Permissions",
          },
        },
      );
    });

    try {
      const responses = await Promise.all(updatePromises);
      console.log("Update responses:", responses);

      const allSuccessful = responses.every(
        (response) => response.data.statusCode === 200,
      );

      if (allSuccessful) {
        setHasChanges(false);
        if (onSaveSuccess) onSaveSuccess();
        await fetchMenuItems(); // re-fetches sidebar instantly
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Applications and permissions updated successfully!",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "OK",
        });
      } else {
        throw new Error("Some updates failed");
      }
    } catch (err) {
      console.error("Error updating permissions:", err);
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "Failed to update applications and permissions. Please try again.",
        confirmButtonColor: "#d33",
        confirmButtonText: "OK",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel changes
  const cancelChanges = () => {
    Applications(); // reset data
    if (onClose) onClose(); // close the tab
  };

  // Define columns for ReusableDataGrid
  const columns = [
    {
      field: "id",
      headerName: "S.No",
      width: 80,
      sortable: false,
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
      field: "guiappsappname",
      headerName: "App Name",
      width: 200,
      sortable: true,
    },
    {
      field: "guiappspath",
      headerName: "Path",
      width: 300,
      sortable: true,
      renderCell: (params) => (
        <Box
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: "100%",
          }}
          title={params.value || ""}
        >
          {params.value || ""}
        </Box>
      ),
    },
    {
      field: "isAssigned",
      headerName: "Assigned",
      width: 120,
      sortable: true,
      renderCell: (params) => (
        <Checkbox
          checked={params.row.isAssigned || false}
          onChange={(e) =>
            handleAssignmentChange(params.row.appId, e.target.checked)
          }
        />
      ),
    },
    {
      field: "appsreadaccess",
      headerName: "Read Access",
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Checkbox
            checked={params.row.appsreadaccess === 1}
            onChange={(e) =>
              handlePermissionChange(
                params.row.appId,
                "appsreadaccess",
                e.target.checked,
              )
            }
            disabled={!params.row.isAssigned}
          />
          <PermissionLabel enabled={params.row.appsreadaccess === 1}>
            {params.row.appsreadaccess === 1 ? "Enabled" : "Disabled"}
          </PermissionLabel>
        </Box>
      ),
    },
    {
      field: "appswriteaccess",
      headerName: "Write Access",
      width: 150,
      sortable: true,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Checkbox
            checked={params.row.appswriteaccess === 1}
            onChange={(e) =>
              handlePermissionChange(
                params.row.appId,
                "appswriteaccess",
                e.target.checked,
              )
            }
            disabled={!params.row.isAssigned}
          />
          <PermissionLabel enabled={params.row.appswriteaccess === 1}>
            {params.row.appswriteaccess === 1 ? "Enabled" : "Disabled"}
          </PermissionLabel>
        </Box>
      ),
    },
  ];

  // Custom export function to format data properly
  const onExportData = (data) => {
    return data.map((item) => ({
      "App Name": item.guiappsappname || "",
      Path: item.guiappspath || "",
      Assigned: item.isAssigned ? "Yes" : "No",
      "Read Access": item.appsreadaccess === 1 ? "Enabled" : "Disabled",
      "Write Access": item.appswriteaccess === 1 ? "Enabled" : "Disabled",
    }));
  };

  // Export configuration
  const exportConfig = {
    filename: `role_${roleName}_apps`,
    sheetName: "Applications",
  };

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h5">
          📱 Applications for Role: {roleName}
        </Typography>
        {/* Sticky Save/Cancel Bar */}
        {hasChanges && (
          <Box
            sx={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1200,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
              px: 4,
              py: 2,
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <Typography variant="body2" sx={{ color: "#64748b", mr: "auto" }}>
              ⚠️ You have unsaved changes
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<FaTimes />}
              onClick={cancelChanges}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={
                isSaving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <FaSave />
                )
              }
              onClick={saveChanges}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        )}
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
        data={apps}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search by name or path..."
        searchFields={["guiappsappname", "guiappspath"]}
        uniqueIdField="appId"
        onExportData={onExportData}
        exportConfig={exportConfig}
        className="role-apps-grid"
      />

      {/* Loading overlay for operations */}
      {isSaving && (
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
            <Typography>Saving changes...</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
