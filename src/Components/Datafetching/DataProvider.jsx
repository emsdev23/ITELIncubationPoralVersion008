import React, {
  createContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import api from "./api";

export const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [stats, setStats] = useState(null);
  const [byField, setByField] = useState([]);
  const [byStage, setByStage] = useState([]);
  const [companyDoc, setCompanyDoc] = useState([]);
  const [listOfIncubatees, setListOfIncubatees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startupcompanyDoc, setstartupcompanyDoc] = useState([]);
  const [startupdetails, setstartupdetails] = useState([]);
  const [currentCompanyDetails, setCurrentCompanyDetails] = useState(null);

  // Add new state for admin viewing specific startup
  const [adminViewingStartupId, setAdminViewingStartupId] = useState(null);
  const [adminStartupLoading, setAdminStartupLoading] = useState(false);

  // =================================================================
  // NEW: State for Chat functionality
  // =================================================================
  const [chatList, setChatList] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponseStatus, setChatResponseStatus] = useState(0);

  // FIX: Use a ref to track fetching state to avoid race conditions
  // and prevent useCallback dependencies from changing constantly.
  const isChatFetching = useRef(false);

  // Initialize state from sessionStorage
  const [userid, setUseridState] = useState(
    sessionStorage.getItem("userid") || null,
  );

  const [roleid, setroleidState] = useState(
    sessionStorage.getItem("roleid") || null,
  );

  const [incuserid, setincuseridstate] = useState(
    sessionStorage.getItem("incuserid") || null,
  );

  // NEW: State for incubation list and selected incubation
  const [incubationList, setIncubationList] = useState([]);
  const [selectedIncubation, setSelectedIncubation] = useState(null);
  const [incubationDetails, setIncubationDetails] = useState(null);
  const [incubationLoading, setIncubationLoading] = useState(false);

  // NEW: State for menu items from API
  const [menuItemsFromAPI, setMenuItemsFromAPI] = useState([]);
  const [menuItemsLoading, setMenuItemsLoading] = useState(true);

  // Create proper setters that update sessionStorage
  const setUserid = (id) => {
    const idString = id ? String(id) : null;
    sessionStorage.setItem("userid", idString);
    setUseridState(idString);
  };

  const setroleid = (id) => {
    const idString = id ? String(id) : null;
    sessionStorage.setItem("roleid", idString);
    setroleidState(idString);
  };

  // Updated to handle roleid 0 and 1
  const setincuserid = (id) => {
    let idString;
    if (roleid === "0") {
      idString = "ALL";
    } else if (roleid === "1") {
      idString = id ? String(id) : "ALL";
    } else {
      idString = id ? String(id) : null;
    }
    sessionStorage.setItem("incuserid", idString);
    setincuseridstate(idString);
  };

  // State for date range filtering
  const [fromYear, setFromYear] = useState("2025-04-01");
  const [toYear, setToYear] = useState("2026-03-01");
  const [dateFilterLoading, setDateFilterLoading] = useState(false);

  // Helper function to safely extract data from API response
  const extractData = (response, fallback = []) => {
    if (!response) {
      console.warn("Response is undefined or null");
      return fallback;
    }
    if (response.data) {
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data.data) {
        return response.data.data;
      }
      if (response.data.result) {
        return response.data.result;
      }
    }
    console.warn("Unexpected response structure:", response);
    return fallback;
  };

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    if (!date) return "";
    return new Date(date).toISOString().split("T")[0];
  };

  // =================================================================
  // NEW: Chat List Functionality
  // =================================================================

  // Helper to calculate the specific status requested
  const calculateChatStatus = (data, currentUserId) => {
    if (!data || !currentUserId) return 0;
    const hasCondition = data.some(
      (item) =>
        String(item.chatlistto) === String(currentUserId) &&
        item.chatlistreadstate === 1,
    );
    return hasCondition ? 1 : 0;
  };

  // FIX: Updated getChatLists to handle "ALL", invalid IDs, and Ref locking
  const getChatLists = useCallback(async () => {
    // 1. Check if User ID is present
    if (!userid) {
      return;
    }

    // 2. Validate IncUserID
    // If incuserid is "ALL" (Admin view), "null", or empty, we cannot fetch chats.
    // parseInt("ALL") returns NaN, which causes the API 400 error.
    if (!incuserid || incuserid === "ALL" || incuserid === "null") {
      return;
    }

    // 3. Prevent spamming the API using the Ref lock
    if (isChatFetching.current) return;

    isChatFetching.current = true;
    setChatLoading(true);

    try {
      const response = await api.post("/resources/generic/getchatlist", {
        userId: parseInt(userid),
        incUserId: parseInt(incuserid), // Safe to parse now
      });

      const data = extractData(response, []);
      setChatList(data);

      const status = calculateChatStatus(data, userid);
      setChatResponseStatus(status);

      return data;
    } catch (error) {
      console.error("Error fetching chat lists:", error);
      setChatList([]);
      setChatResponseStatus(0);
      throw error;
    } finally {
      setChatLoading(false);
      isChatFetching.current = false;
    }
    // Note: We removed 'chatLoading' from dependencies to keep this function stable.
    // We rely on the 'isChatFetching' ref for the lock.
  }, [userid, incuserid]);
  // ================================================================

  // NEW: Function to fetch documents by date range
  const fetchDocumentsByDateRange = async (startDate, endDate) => {
    setDateFilterLoading(true);
    try {
      // Determine the correct userId and incUserId to use for the API call
      let targetUserId;
      let targetIncUserId;

      if (Number(roleid) === 0) {
        // For roleid 0: userId is "ALL" and incUserId is "ALL"
        targetUserId = "ALL";
        targetIncUserId = "ALL";
      } else if (Number(roleid) === 1) {
        // For roleid 1: userId is "ALL" and incUserId is from session
        targetUserId = adminViewingStartupId || "ALL";
        targetIncUserId = incuserid;
      } else {
        // For other roles: use their own ID
        targetUserId = adminViewingStartupId || userid;
        targetIncUserId = incuserid;
      }

      const response = await api.post(
        "resources/generic/getcollecteddocsdash",
        {
          userId: targetUserId,
          incUserId: targetIncUserId,
          startDate: startDate ? formatDateForAPI(startDate) : null,
          endDate: endDate ? formatDateForAPI(endDate) : null,
        },
      );

      const data = extractData(response, []);

      // Determine which state to update with the fetched data
      if (Number(roleid) === 1 && adminViewingStartupId) {
        // Admin is viewing a specific company, so update the specific company's documents.
        setstartupcompanyDoc(data);
      } else {
        // This is for the main dashboard view (for admins or other roles).
        setCompanyDoc(data);
        // Also update startupcompanyDoc for non-admins, as they only see their own data.
        if (Number(roleid) !== 1) {
          setstartupcompanyDoc(data);
        }
      }

      return data;
    } catch (err) {
      console.error("Error fetching documents by date range:", err);

      // Clear the relevant state on error
      if (Number(roleid) === 1 && adminViewingStartupId) {
        setstartupcompanyDoc([]);
      } else {
        setCompanyDoc([]);
        if (Number(roleid) !== 1) {
          setstartupcompanyDoc([]);
        }
      }

      alert(
        `Error fetching documents: ${err.message || "Unknown error occurred"}`,
      );
    } finally {
      setDateFilterLoading(false);
    }
  };

  // NEW: Function to fetch incubation list
  const fetchIncubationList = async () => {
    try {
      const response = await api.post("resources/generic/getincubationlist", {
        userId: userid,
        userIncId: "ALL",
      });
      const data = extractData(response, []);
      setIncubationList(data);
      if (incuserid && incuserid !== "ALL") {
        const defaultIncubation = data.find(
          (item) => item.incubationsrecid === parseInt(incuserid),
        );
        if (defaultIncubation) {
          setSelectedIncubation(defaultIncubation);
        }
      }
      return data;
    } catch (error) {
      console.error("Error fetching incubation list:", error);
      return [];
    }
  };

  // NEW: Function to fetch incubation details by ID
  const fetchIncubationDetails = async (incubationId) => {
    if (!incubationId) return null;
    setIncubationLoading(true);
    try {
      const response = await api.post(
        "resources/generic/getincubationdetails",
        {
          userId: userid,
          userIncId: incubationId,
        },
      );
      const data = extractData(response, []);
      const details = data.find(
        (item) => item.incubationsrecid === parseInt(incubationId),
      );
      setIncubationDetails(details);
      return details;
    } catch (error) {
      console.error("Error fetching incubation details:", error);
      return null;
    } finally {
      setIncubationLoading(false);
    }
  };

  // NEW: Function to handle incubation selection
  const handleIncubationSelect = async (incubation) => {
    setSelectedIncubation(incubation);
    setincuserid(incubation.incubationsrecid.toString());
    await fetchIncubationDetails(incubation.incubationsrecid);
  };

  // NEW: Function to reset incubation selection
  const resetIncubationSelection = () => {
    setSelectedIncubation(null);
    setIncubationDetails(null);
    if (roleid === "0" || roleid === "1") {
      setincuserid("ALL");
    } else {
      setincuserid(null);
    }
  };

  // NEW: Function to fetch menu items from API
  const fetchMenuItems = async () => {
    if (!userid || !roleid) {
      console.error("User ID or Role ID is missing. Cannot fetch menu items.");
      setMenuItemsLoading(false);
      return;
    }

    try {
      setMenuItemsLoading(true);
      const response = await api.post("resources/generic/getapplist", {
        userId: Number(userid),
        roleId: Number(roleid),
      });

      if (response.data && response.data.data) {
        setMenuItemsFromAPI(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching menu items:", error);
      setMenuItemsFromAPI([]);
    } finally {
      setMenuItemsLoading(false);
    }
  };

  // NEW: Fetch menu items when user logs in or role changes
  useEffect(() => {
    if (userid && roleid) {
      fetchMenuItems();
    } else {
      setMenuItemsFromAPI([]);
      setMenuItemsLoading(false);
    }
  }, [userid, roleid]);

  const refreshCompanyDocuments = async () => {
    try {
      let apiUserId;
      let apiIncUserId;

      if (Number(roleid) === 0) {
        // For roleid 0: userId is "ALL" and incUserId is "ALL"
        apiUserId = "ALL";
        apiIncUserId = "ALL";
      } else if (Number(roleid) === 1) {
        // For roleid 1: userId is "ALL" and incUserId is from session
        apiUserId = adminViewingStartupId || "ALL";
        apiIncUserId = incuserid;
      } else {
        // For other roles: use their own ID
        apiUserId = adminViewingStartupId || userid;
        apiIncUserId = incuserid;
      }

      const response = await api.post(
        "resources/generic/getcollecteddocsdash",
        {
          userId: apiUserId,
          incUserId: apiIncUserId,
          startDate: fromYear,
          endDate: toYear,
        },
      );
      const data = extractData(response, []);
      setCompanyDoc(data);
      setstartupcompanyDoc(data);
      return data;
    } catch (error) {
      console.error("Error refreshing company documents:", error);
      throw error;
    }
  };

  const [adminviewData, setadminviewData] = useState(null);

  const fetchStartupDataById = async (userId) => {
    if (!userId) return;
    setAdminStartupLoading(true);
    setAdminViewingStartupId(userId);
    try {
      let apiUserId;
      let apiIncUserId;

      if (Number(roleid) === 0) {
        // For roleid 0: userId is "ALL" and incUserId is "ALL"
        apiUserId = "ALL";
        apiIncUserId = "ALL";
      } else if (Number(roleid) === 1) {
        // For roleid 1: userId is "ALL" and incUserId is from session
        apiUserId = userId;
        apiIncUserId = incuserid;
      } else {
        // For other roles: use their own ID
        apiUserId = userId;
        apiIncUserId = incuserid;
      }

      const documentsResponse = await api.post(
        "resources/generic/getcollecteddocsdash",
        {
          userId: apiUserId,
          startDate: fromYear,
          endDate: toYear,
          incUserId: apiIncUserId,
        },
      );
      const incubateesResponse = await api.post(
        "resources/generic/getincubatessdash",
        {
          userId: apiUserId,
          incUserId: apiIncUserId,
        },
      );
      const documentsData = extractData(documentsResponse, []);
      setstartupcompanyDoc(documentsData);
      const incubateesData = extractData(incubateesResponse, []);
      setstartupdetails(incubateesData);
    } catch (error) {
      console.error("Error fetching startup data by ID:", error);
      setstartupcompanyDoc([]);
      setstartupdetails([]);
    } finally {
      setAdminStartupLoading(false);
    }
  };

  useEffect(() => {
    if (adminviewData) {
      fetchStartupDataById(adminviewData);
    }
  }, [adminviewData, fromYear, toYear]);

  const fetchStartupDataForAdmin = async (startupUserId) => {
    if (Number(roleid) !== 1) {
      console.warn("Only admin can view other startup data");
      return;
    }
    fetchStartupDataById(startupUserId);
  };

  const resetAdminView = () => {
    setAdminViewingStartupId(null);
    setadminviewData(null);
    setstartupcompanyDoc([]);
    setstartupdetails([]);
  };

  const clearAllData = () => {
    setStats(null);
    setByField([]);
    setByStage([]);
    setCompanyDoc([]);
    setListOfIncubatees([]);
    setstartupcompanyDoc([]);
    setstartupdetails([]);
    setCurrentCompanyDetails(null);
    setAdminViewingStartupId(null);
    setadminviewData(null);
    setLoading(false);
  };

  useEffect(() => {
    if (!userid || !roleid) {
      clearAllData();
      return;
    }
    if ([4, 5].includes(Number(roleid)) && (adminViewingStartupId || adminviewData)) {
      resetAdminView();
    }
  }, [userid, roleid, incuserid]);

  useEffect(() => {
    const handleStorageChange = () => {
      const sessionUserid = sessionStorage.getItem("userid");
      const sessionRoleid = sessionStorage.getItem("roleid");
      const sessionIncuserid = sessionStorage.getItem("incuserid");
      if (sessionUserid !== userid) setUseridState(sessionUserid);
      if (sessionRoleid !== roleid) setroleidState(sessionRoleid);
      if (sessionRoleid === "0" || sessionRoleid === "1") {
        if (incuserid !== "ALL") setincuseridstate("ALL");
      } else {
        if (sessionIncuserid !== incuserid) setincuseridstate(sessionIncuserid);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    handleStorageChange();
    const intervalId = setInterval(handleStorageChange, 500);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [userid, roleid, incuserid]);

  useEffect(() => {
    if (userid) {
      fetchIncubationList();
    }
  }, [userid]);

  useEffect(() => {
    if (selectedIncubation) {
      fetchIncubationDetails(selectedIncubation.incubationsrecid);
    }
  }, [selectedIncubation]);

  // General data fetch (for admin/users)
  useEffect(() => {
    if (!userid || !roleid) return;
    if (adminViewingStartupId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let userIncId;
        let apiUserId;

        if (Number(roleid) === 0) {
          // For roleid 0: userId is "ALL" and incUserId is "ALL"
          apiUserId = "ALL";
          userIncId = "ALL";
        } else if (Number(roleid) === 1) {
          // For roleid 1: userId is "ALL" and incUserId is from session
          apiUserId = "ALL";
          userIncId = selectedIncubation
            ? selectedIncubation.incubationsrecid.toString()
            : incuserid;
        } else {
          // For other roles: use their own ID
          apiUserId = userid;
          userIncId = selectedIncubation
            ? selectedIncubation.incubationsrecid.toString()
            : incuserid;
        }

        // =================================================================
        // ROLE-BASED API CALL LOGIC
        // =================================================================

        // DEFINE which roles can see STATISTICS. Only add roles to this array.
        // Currently, ONLY Admin (roleid 1) is allowed.
        const rolesAllowedForStats = [0, 1, 12];

        let apiCalls = [];

        // CONDITIONALLY ADD stats APIs based on whitelist.
        // If the current user's role is NOT in the list, this block is skipped.
        if (rolesAllowedForStats.includes(Number(roleid))) {
          // This block will ONLY run for roleid 1.
          // It will be SKIPPED for roleid 0 and roleid 4 and roleid 7.
          apiCalls = [
            ...apiCalls,
            {
              name: "stats",
              call: () =>
                api.post("resources/generic/getstatscom", {
                  userId: apiUserId,
                  userIncId: userIncId,
                }),
            },
            {
              name: "field",
              call: () =>
                api.post("resources/generic/getcombyfield", {
                  userId: apiUserId,
                  userIncId: userIncId,
                }),
            },
            {
              name: "stage",
              call: () =>
                api.post("resources/generic/getcombystage", {
                  userId: apiUserId,
                  userIncId: userIncId,
                }),
            },
          ];
        }

        // ALWAYS ADD list/document APIs for any logged-in user.
        // This runs for roleid 0, 1, 4, and 7.
        const userIdForListApis =
          Number(roleid) === 0 || Number(roleid) === 1 || Number(roleid) === 12
            ? "ALL"
            : userid;
        apiCalls = [
          ...apiCalls,
          {
            name: "documents",
            call: () =>
              api.post("resources/generic/getcollecteddocsdash", {
                userId: userIdForListApis,
                incUserId: userIncId,
                startDate: fromYear,
                endDate: toYear,
              }),
          },
          {
            name: "incubatees",
            call: () =>
              api.post("resources/generic/getincubatessdash", {
                userId: userIdForListApis,
                incUserId: userIncId,
              }),
          },
        ];

        // =================================================================

        const results = await Promise.allSettled(
          apiCalls.map(({ call }) => call()),
        );

        results.forEach((result, index) => {
          const { name } = apiCalls[index];
          if (result.status === "fulfilled") {
            const data = extractData(result.value, []);
            switch (name) {
              case "stats":
                setStats(data);
                break;
              case "field":
                setByField(data);
                break;
              case "stage":
                setByStage(data);
                break;
              case "documents":
                setCompanyDoc(data);
                if (Number(roleid) !== 1) setstartupcompanyDoc(data);
                break;
              case "incubatees":
                setListOfIncubatees(data);
                if (Number(roleid) !== 1) setstartupdetails(data);
                break;
              default:
                break;
            }
          } else {
            console.error(`Error fetching ${name}:`, result.reason);
            switch (name) {
              case "stats":
                setStats(null);
                break;
              case "field":
                setByField([]);
                break;
              case "stage":
                setByStage([]);
                break;
              case "documents":
                setCompanyDoc([]);
                if (Number(roleid) !== 1) setstartupcompanyDoc([]);
                break;
              case "incubatees":
                setListOfIncubatees([]);
                if (Number(roleid) !== 1) setstartupdetails([]);
                break;
              default:
                break;
            }
          }
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setStats(null);
        setByField([]);
        setByStage([]);
        setCompanyDoc([]);
        setListOfIncubatees([]);
        if (Number(roleid) !== 1) {
          setstartupcompanyDoc([]);
          setstartupdetails([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    userid,
    roleid,
    fromYear,
    toYear,
    adminViewingStartupId,
    selectedIncubation,
  ]);

  return (
    <DataContext.Provider
      value={{
        /* ... all your context values ... */
        stats,
        byField,
        byStage,
        companyDoc,
        setCompanyDoc,
        listOfIncubatees,
        setListOfIncubatees,
        loading,
        userid,
        setUserid,
        setroleid,
        fromYear,
        setFromYear,
        toYear,
        setToYear,
        roleid,
        startupcompanyDoc,
        setstartupcompanyDoc,
        startupdetails,
        setstartupdetails,
        currentCompanyDetails,
        setCurrentCompanyDetails,
        refreshCompanyDocuments,
        fetchStartupDataForAdmin,
        fetchStartupDataById,
        resetAdminView,
        clearAllData,
        adminViewingStartupId,
        adminStartupLoading,
        adminviewData,
        setadminviewData,
        incuserid,
        setincuserid,
        incubationList,
        selectedIncubation,
        incubationDetails,
        incubationLoading,
        fetchIncubationList,
        fetchIncubationDetails,
        handleIncubationSelect,
        resetIncubationSelection,
        fetchDocumentsByDateRange, // NEW: Add this to the context
        dateFilterLoading, // NEW: Add this to the context

        menuItemsFromAPI,
        menuItemsLoading,
        fetchMenuItems,

        /* NEW: Chat values */
        chatList,
        getChatLists,
        chatLoading,
        chatResponseStatus,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
