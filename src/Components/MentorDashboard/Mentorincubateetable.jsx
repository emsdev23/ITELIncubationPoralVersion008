import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataContext } from "../Datafetching/DataProvider";
import api from "../Datafetching/api";
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";

export default function MentorIncubateeTable() {
  const navigate = useNavigate();
  const { roleid, setadminviewData, userid, incuserid } =
    useContext(DataContext);
  const [incubateeList, setIncubateeList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncubatees = async () => {
      try {
        setLoading(true);
        const response = await api.post(
          "/resources/generic/getincubateebymentor",
          { userId: userid, userIncId: incuserid },
          { headers: { userid: userid } },
        );
        if (response.data?.statusCode === 200) {
          setIncubateeList(response.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching assigned incubatees:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchIncubatees();
  }, [userid, incuserid]);

  const stageColors = {
    1: { backgroundColor: "#e0e7ff", color: "#4338ca" },
    2: { backgroundColor: "#dbeafe", color: "#1e40af" },
    3: { backgroundColor: "#d1fae5", color: "#065f46" },
    4: { backgroundColor: "#fef3c7", color: "#92400e" },
    5: { backgroundColor: "#ede9fe", color: "#5b21b6" },
  };

  const columns = [
    {
      field: "incubateename",
      headerName: "Company",
      width: 200,
      sortable: true,
      filterable: true,
    },
    {
      field: "incubateesshortname",
      headerName: "Short Name",
      width: 130,
      sortable: true,
      filterable: true,
    },
    {
      field: "fieldofworkname",
      headerName: "Field of Work",
      width: 180,
      sortable: true,
      filterable: true,
    },
    {
      field: "incubateesstagelevel",
      headerName: "Stage",
      width: 150,
      sortable: true,
      filterable: true,
      type: "chip",
      displayField: "startupstagesname",
      chipColors: stageColors,
    },
    {
      field: "incubateeusername",
      headerName: "Username",
      width: 160,
      sortable: true,
      filterable: true,
    },
    // ── New columns ──────────────────────────────────────────────────────────
    {
      field: "incubateesnooffounders",
      headerName: "No. of Founders",
      width: 140,
      sortable: true,
      filterable: true,
    },
    {
      field: "incubateesdateofincubation",
      headerName: "Date of Incubation",
      width: 160,
      sortable: true,
      filterable: true,
    },
    {
      field: "incubateesdateofincorporation",
      headerName: "Date of Incorporation",
      width: 170,
      sortable: true,
      filterable: true,
    },
    {
      field: "incubateeswebsite",
      headerName: "Website",
      width: 180,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const url = params?.row?.incubateeswebsite;
        if (!url) return "—";
        const href = url.startsWith("http") ? url : `https://${url}`;
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#1976d2",
              textDecoration: "none",
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
          >
            {url.replace(/^https?:\/\//, "")}
          </a>
        );
      },
    },
  ];

  if ([1, 3, 7].includes(Number(roleid))) {
    columns.push({
      field: "actions",
      headerName: "Actions",
      width: 150,
      type: "actions",
      actions: [
        {
          label: "View Details",
          variant: "contained",
          size: "small",
          onClick: (row) => {
            setadminviewData(row.mentorincassnincuserrecid);
            navigate("/startup/Dashboard", {
              state: {
                usersrecid: row.mentorincassnincuserrecid,
                companyName: row.incubateename,
              },
            });
          },
        },
      ],
    });
  }

  const dropdownFilters = [
    {
      field: "incubateesstagelevel",
      label: "Stage",
      width: 150,
      options: [
        { value: "1", label: "Pre Seed" },
        { value: "2", label: "Seed Stage" },
        { value: "3", label: "Early Stage" },
        { value: "4", label: "Growth Stage" },
        { value: "5", label: "Expansion Stage" },
      ],
    },
    {
      field: "fieldofworkname",
      label: "Field of Work",
      width: 200,
      options: [
        ...new Map(
          incubateeList.map((item) => [
            item.fieldofworkname,
            { value: item.fieldofworkname, label: item.fieldofworkname },
          ]),
        ).values(),
      ],
    },
  ];

  const handleExportData = (data) =>
    data.map((item) => ({
      "Company Name": item.incubateename || "",
      "Short Name": item.incubateesshortname || "",
      "Field of Work": item.fieldofworkname || "",
      Stage: item.startupstagesname || "",
      Username: item.incubateeusername || "",
      "No. of Founders": item.incubateesnooffounders ?? "",
      "Date of Incubation": item.incubateesdateofincubation || "",
      "Date of Incorporation": item.incubateesdateofincorporation || "",
      Website: item.incubateeswebsite || "",
    }));

  return (
    <ReusableDataGrid
      data={incubateeList}
      columns={columns}
      title="Assigned Incubatees"
      dropdownFilters={dropdownFilters}
      searchPlaceholder="Search companies or fields..."
      searchFields={["incubateename", "fieldofworkname", "incubateesshortname"]}
      uniqueIdField="mentorincassnid"
      enableExport={true}
      onExportData={handleExportData}
      exportConfig={{
        filename: "assigned-incubatees",
        sheetName: "Assigned Incubatees",
      }}
      enableColumnFilters={true}
      loading={loading}
      shimmerRowCount={5}
    />
  );
}
