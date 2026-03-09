import React, { useEffect, useState, useRef, useContext } from "react";
import styles from "./Navbar.module.css";
import {
  UserRound,
  X,
  LogOut,
  CircleUserRound,
  FolderDown,
  MessageSquare,
  FileBadge,
  FileText,
  MoreHorizontal,
  Home,
  ChevronsLeft,
  ChevronsRight,
  ArrowLeft,
  History,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  FolderRoot,
  FileSliders,
  FileUser,
  WifiOff,
  Wifi,
  ScrollText,
  SquareM,
  CopyPlus,
  UserPlus,
  BookCopy,
} from "lucide-react";
import ITELLogo from "../assets/ITEL_Logo.png";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import AuditLogsModal from "../Components/AuditLogsModal ";
import api from "./Datafetching/api";
import { DataContext } from "../Components/Datafetching/DataProvider";
import { IPAdress } from "./Datafetching/IPAdrees";
import { AuthContext } from "../App";
import ChangePasswordModal from "../Components/StartupDashboard/ChangePasswordModal";
import ContactModal from "../Components/StartupDashboard/ContactModal";
import NewChatModal from "../Components/ChatApp/NewChatModal";

// Custom hook for network status
const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showNotification, setShowNotification] = useState(false);
  const previousStatusRef = useRef(navigator.onLine);
  const checkTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const updateNetworkStatus = (status, source) => {
      const wasOnline = previousStatusRef.current;
      if (wasOnline !== status) {
        setIsOnline(status);
        setShowNotification(true);
        previousStatusRef.current = status;
        if (status) {
          setTimeout(() => setShowNotification(false), 3000);
        }
      }
    };

    const checkConnectivity = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        await Promise.race([
          fetch("https://www.google.com/generate_204", {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-cache",
            signal: controller.signal,
          }),
          fetch("https://cloudflare.com/cdn-cgi/trace", {
            method: "HEAD",
            mode: "no-cors",
            cache: "no-cache",
            signal: controller.signal,
          }),
        ]);
        clearTimeout(timeoutId);
        updateNetworkStatus(true, "connectivity-check");
      } catch (error) {
        updateNetworkStatus(false, "connectivity-check");
      }
    };

    const handleOffline = () =>
      updateNetworkStatus(false, "browser-offline-event");
    const handleOnline = () => {
      updateNetworkStatus(true, "browser-online-event");
      checkConnectivity();
    };
    const handleConnectionChange = () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      checkTimeoutRef.current = setTimeout(checkConnectivity, 100);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkConnectivity();
    };
    const handleUserInteraction = () => {
      if (!previousStatusRef.current) {
        if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = setTimeout(checkConnectivity, 200);
      }
    };

    checkConnectivity();
    intervalRef.current = setInterval(checkConnectivity, 3000);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mousemove", handleUserInteraction, {
      passive: true,
      once: true,
    });
    window.addEventListener("keydown", handleUserInteraction, {
      passive: true,
      once: true,
    });
    window.addEventListener("click", handleUserInteraction, {
      passive: true,
      once: true,
    });
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (connection)
      connection.addEventListener("change", handleConnectionChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mousemove", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      if (connection)
        connection.removeEventListener("change", handleConnectionChange);
    };
  }, []);

  return { isOnline, showNotification };
};

const Navbar = () => {
  const {
    stats,
    byField,
    byStage,
    loading,
    companyDoc,
    listOfIncubatees,
    clearAllData,
    roleid,
    selectedIncubation,
    founderName,
    adminviewData,
    menuItemsFromAPI,
    menuItemsLoading,
    chatResponseStatus,
    chatList,
  } = useContext(DataContext);
  const { setIsAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { isOnline, showNotification } = useNetworkStatus();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isChatDropdownOpen, setIsChatDropdownOpen] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  // Track which groups are expanded in sidebar
  const [expandedGroups, setExpandedGroups] = useState({});
  // Track tooltip vertical position for collapsed sidebar
  const [tooltipTop, setTooltipTop] = useState({});

  const actionsRef = useRef(null);
  const chatDropdownRef = useRef(null);
  const profileDropdownRef = useRef(null);

  const currentUser = {
    id: sessionStorage.getItem("userid") || "1",
    name: sessionStorage.getItem("username") || "User",
    role: sessionStorage.getItem("userrole") || "incubatee",
    roleid: sessionStorage.getItem("roleid") || null,
    incUserid: sessionStorage.getItem("incuserid") || null,
  };

  const userid =
    roleid === "0"
      ? sessionStorage.getItem("userid")
      : JSON.parse(sessionStorage.getItem("userid"));
  const sessionRoleid = sessionStorage.getItem("roleid");
  const token = sessionStorage.getItem("token");
  const incuserid = sessionStorage.getItem("incuserid");

  const isOperator = Number(roleid) === 3 || Number(sessionRoleid) === 3;
  const isDueDeeligence = Number(roleid) === 7 || Number(sessionRoleid) === 7;
  const SuperAdmin = Number(roleid) === 0 || Number(sessionRoleid) === 0;
  const isIncubatee = Number(roleid) === 4 || Number(sessionRoleid) === 4;
  const isMentor = Number(roleid) === 9 || Number(sessionRoleid) === 9;

  const logedinProfile =
    roleid === "1"
      ? "Incubator"
      : roleid === "3"
        ? "Incubator Operator"
        : roleid === "7"
          ? "Due Deligence Inspector"
          : roleid === "4"
            ? "Incubatee"
            : roleid === "9"
              ? "Mentor"
              : "Admin";

  const getIconComponent = (iconName) => {
    const iconMap = {
      Home: <Home size={18} />,
      UserRound: <UserRound size={18} />,
      FolderDown: <FolderDown size={18} />,
      FileBadge: <FileBadge size={18} />,
      MessageSquare: <MessageSquare size={18} />,
      FileText: <FileText size={18} />,
      History: <History size={18} />,
      FolderKanban: <FolderKanban size={18} />,
      FolderRoot: <FolderRoot size={18} />,
      FileUser: <FileUser size={18} />,
      FileSliders: <FileSliders size={18} />,
      ScrollText: <ScrollText size={18} />,
      SquareM: <SquareM size={18} />,
      CopyPlus: <CopyPlus size={18} />,
      UserPlus: <UserPlus size={18} />,
      BookCopy: <BookCopy size={18} />,
    };
    return iconMap[iconName] || <Home size={18} />;
  };

  // Group icon mapping
  const getGroupIcon = (groupName) => {
    const groupIconMap = {
      Dashboard: <Home size={18} />,
      "Chat Management": <MessageSquare size={18} />,
      "User Management": <UserRound size={18} />,
      "User Association Management": <UserPlus size={18} />,
      "Document Management": <FolderDown size={18} />,
      "Incubation Management": <FileBadge size={18} />,
      "Training Management": <FileSliders size={18} />,
      "Mentor Management": <SquareM size={18} />,
    };
    return groupIconMap[groupName] || <FolderKanban size={18} />;
  };

  useEffect(() => {
    document.body.classList.add("sidebar-collapsed");
    document.body.classList.remove("sidebar-expanded");
    return () => {
      document.body.classList.remove("sidebar-collapsed", "sidebar-expanded");
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isChatDropdownOpen &&
        chatDropdownRef.current &&
        !chatDropdownRef.current.contains(event.target)
      )
        setIsChatDropdownOpen(false);
      if (
        isProfileDropdownOpen &&
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target)
      )
        setIsProfileDropdownOpen(false);
    };
    if (isChatDropdownOpen || isProfileDropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isChatDropdownOpen, isProfileDropdownOpen]);

  // Auto-expand group that contains the active route
  useEffect(() => {
    if (menuItemsFromAPI.length === 0) return;
    const topNavPaths = [
      "/Incubation/Dashboard/Chats",
      "/Incubation/Dashboard/ChatHistory",
    ];
    const grouped = groupMenuItems(menuItemsFromAPI, topNavPaths);
    const newExpanded = {};
    Object.entries(grouped).forEach(([groupName, items]) => {
      const hasActive = items.some((item) => location.pathname === item.path);
      if (hasActive) newExpanded[groupName] = true;
    });
    setExpandedGroups((prev) => ({ ...prev, ...newExpanded }));
  }, [location.pathname, menuItemsFromAPI]);

  const handleLogout = async () => {
    const confirmResult = await Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout",
      cancelButtonText: "Cancel",
    });
    if (!confirmResult.isConfirmed) return;
    try {
      Swal.fire({
        title: "Logging out...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const logoutUserId =
        roleid === "0" ? "32" : sessionStorage.getItem("userid");
      const currentTime = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
      await api.post("resources/auth/logout", {
        userid: logoutUserId,
        reason: `Manual Logout at ${currentTime}`,
      });
      Swal.close();
      clearAllData();
      sessionStorage.clear();
      document.body.classList.remove("sidebar-expanded", "sidebar-collapsed");
      setIsAuthenticated(false);
      Swal.fire({
        icon: "success",
        title: "Logged Out",
        text: "You have been successfully logged out.",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => navigate("/", { replace: true }));
    } catch (error) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Logout Failed",
        text: error.response?.data?.message || "Something went wrong.",
      });
    }
  };

  const getLogoUrl = () => {
    if (selectedIncubation && selectedIncubation.incubationslogopath) {
      if (selectedIncubation.incubationslogopath.startsWith("http"))
        return selectedIncubation.incubationslogopath;
      return `${IPAdress}${selectedIncubation.incubationslogopath}`;
    }
    return ITELLogo;
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      document.body.classList.add("sidebar-expanded");
      document.body.classList.remove("sidebar-collapsed");
    } else {
      document.body.classList.add("sidebar-collapsed");
      document.body.classList.remove("sidebar-expanded");
    }
  };

  const toggleGroup = (groupName) => {
    // If sidebar is collapsed, expand it first
    if (!isExpanded) {
      setIsExpanded(true);
      document.body.classList.add("sidebar-expanded");
      document.body.classList.remove("sidebar-collapsed");
    }
    setExpandedGroups((prev) => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const handleHistory = () => {
    setIsChatDropdownOpen(false);
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
    navigate("/Incubation/Dashboard/ChatHistory");
  };

  const handleChatCreated = async (newChat) => {
    setShowNewChatModal(false);
    if (newChat && newChat.chatlistrecid)
      navigate(`/Incubation/Dashboard/Chats?chatId=${newChat.chatlistrecid}`);
  };

  // Helper: group menu items by grpappsgroupname
  const groupMenuItems = (items, topNavPaths) => {
    const groups = {};
    items
      .filter((item) => {
        if (topNavPaths.includes(item.guiappspath)) return false;
        if (item.guiappspath === "/startup/Dashboard")
          return Number(roleid) === 4 || Number(sessionRoleid) === 4;
        return item.appsreadaccess === 1;
      })
      .forEach((item) => {
        const groupName = item.grpappsgroupname || "Other";
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push({
          ...item,
          label: item.guiappsappname,
          icon: getIconComponent(item.guiappsappicon),
          path: item.guiappspath,
          exact:
            item.guiappspath === "/Incubation/Dashboard" ||
            item.guiappspath === "/startup/Dashboard",
        });
      });
    return groups;
  };

  const topNavPaths = [
    "/Incubation/Dashboard/Chats",
    "/Incubation/Dashboard/ChatHistory",
  ];
  const groupedMenuItems = groupMenuItems(menuItemsFromAPI, topNavPaths);
  const groupNames = Object.keys(groupedMenuItems);

  // Single-item groups render directly (no dropdown wrapper)
  // Multi-item groups render as collapsible group

  const hasChatAccess = menuItemsFromAPI.some(
    (item) =>
      item.guiappspath === "/Incubation/Dashboard/Chats" &&
      item.appsreadaccess === 1,
  );
  const hasChatHistoryAccess = menuItemsFromAPI.some(
    (item) =>
      item.guiappspath === "/Incubation/Dashboard/ChatHistory" &&
      item.appsreadaccess === 1,
  );

  const isGroupActive = (items) =>
    items.some((item) => location.pathname === item.path);

  return (
    <>
      {/* Top Navigation Bar */}
      <div className={styles.topNavbar}>
        <div className={styles.topNavbarLeft}>
          <img
            src={getLogoUrl()}
            className={styles.topLogo}
            alt="Incubator Logo"
          />
          <div className={styles.topTitle}>
            <h1>ITEL Incubation Portal</h1>
            {showNotification && (
              <div
                className={
                  isOnline ? styles.networkOnline : styles.networkOffline
                }
              >
                {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
                <span>
                  {isOnline ? "Back Online" : "No Internet Connection"}
                </span>
              </div>
            )}
            <p>
              {Number(roleid) === 1
                ? "Admin Dashboard"
                : Number(roleid) === 9
                  ? "Mentor Dashboard"
                  : "Startup Management Dashboard"}
            </p>
          </div>
        </div>
        <div className={styles.topNavbarRight}>
          {/* Chat Dropdown */}
          {hasChatAccess && !isDueDeeligence && !SuperAdmin && (
            <div className={styles.chatDropdown} ref={chatDropdownRef}>
              <button
                className={`${styles.chatButton} ${location.pathname === "/Incubation/Dashboard/Chats" ? styles.active : ""}`}
                onClick={() => setIsChatDropdownOpen(!isChatDropdownOpen)}
              >
                <MessageSquare size={20} />
                <span>Chat</span>
                <ChevronDown size={16} />
              </button>
              {isChatDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <NavLink
                    to="/Incubation/Dashboard/Chats"
                    className={({ isActive }) =>
                      `${styles.dropdownItem} ${isActive ? styles.active : ""}`
                    }
                    onClick={() => setIsChatDropdownOpen(false)}
                  >
                    <MessageSquare size={16} /> Open Chat
                  </NavLink>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setShowNewChatModal(true);
                      setIsChatDropdownOpen(false);
                    }}
                  >
                    <MessageSquare size={16} /> New Chat
                  </button>
                  {hasChatHistoryAccess && Number(roleid) === 1 && (
                    <button
                      className={styles.dropdownItem}
                      onClick={handleHistory}
                    >
                      <History size={16} /> Chat History
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile Dropdown for incubatees */}
          {Number(roleid) === 4 && (
            <div className={styles.profileDropdown} ref={profileDropdownRef}>
              <button
                className={styles.profileButton}
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              >
                <CircleUserRound size={20} />
                <span>
                  {listOfIncubatees && listOfIncubatees.length > 0
                    ? listOfIncubatees[0].incubateesfoundername || "Incubatee"
                    : "Incubatee"}
                </span>
              </button>
              {isProfileDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => {
                      setIsChangePasswordOpen(true);
                      setIsProfileDropdownOpen(false);
                    }}
                  >
                    Change Password
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Profile for non-incubatees */}
          {Number(roleid) !== 4 && (
            <div className={styles.profileInfo}>
              <CircleUserRound size={20} />
              <span>{logedinProfile}</span>
            </div>
          )}

          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`${styles.sidebar} ${isExpanded ? styles.expanded : styles.collapsed}`}
      >
        <nav className={styles.navMenu}>
          {menuItemsLoading ? (
            Array(5)
              .fill(0)
              .map((_, index) => (
                <div key={`shimmer-${index}`} className={styles.navItemWrapper}>
                  <div className={styles.navItem}>
                    <div className={styles.iconContainer}>
                      <div className={styles.shimmerIcon}></div>
                    </div>
                    {isExpanded && (
                      <div className={styles.navLabel}>
                        <div className={styles.shimmerText}></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <>
              {groupNames.map((groupName) => {
                const items = groupedMenuItems[groupName];
                const isOpen = expandedGroups[groupName];
                const groupActive = isGroupActive(items);

                // If only 1 item in group, render directly without grouping
                if (items.length === 1) {
                  const item = items[0];
                  return (
                    <div
                      key={`single-${groupName}`}
                      className={styles.navItemWrapper}
                    >
                      <NavLink
                        to={item.path}
                        end={item.exact}
                        className={({ isActive }) =>
                          `${styles.navItem} ${isActive ? styles.active : ""}`
                        }
                      >
                        <div className={styles.iconContainer}>{item.icon}</div>
                        {isExpanded && (
                          <span className={styles.navLabel}>{item.label}</span>
                        )}
                      </NavLink>
                      {!isExpanded && (
                        <div className={styles.tooltip}>{item.label}</div>
                      )}
                    </div>
                  );
                }

                // Multiple items — render as collapsible group
                return (
                  <div
                    key={`group-${groupName}`}
                    className={styles.groupWrapper}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // Clamp so tooltip never goes above topbar (70px)
                      const top = Math.max(75, rect.top);
                      setTooltipTop((prev) => ({ ...prev, [groupName]: top }));
                    }}
                  >
                    {/* Group Header */}
                    <button
                      className={`${styles.groupHeader} ${groupActive ? styles.groupHeaderActive : ""}`}
                      onClick={() => toggleGroup(groupName)}
                      title={!isExpanded ? groupName : ""}
                    >
                      <div className={styles.groupHeaderLeft}>
                        <div
                          className={`${styles.groupIcon} ${groupActive ? styles.groupIconActive : ""}`}
                        >
                          {getGroupIcon(groupName)}
                        </div>
                        {isExpanded && (
                          <span className={styles.groupLabel}>{groupName}</span>
                        )}
                      </div>
                      {isExpanded && (
                        <div
                          className={`${styles.groupChevron} ${isOpen ? styles.groupChevronOpen : ""}`}
                        >
                          <ChevronRight size={14} />
                        </div>
                      )}
                    </button>

                    {/* Tooltip for collapsed sidebar */}
                    {!isExpanded && (
                      <div
                        className={styles.groupTooltip}
                        style={{ top: tooltipTop[groupName] ?? 75 }}
                      >
                        <span className={styles.groupTooltipTitle}>
                          {groupName}
                        </span>
                        {items.map((item) => (
                          <NavLink
                            key={item.guiappsrecid}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) =>
                              `${styles.groupTooltipItem} ${isActive ? styles.active : ""}`
                            }
                          >
                            {item.icon}
                            <span>{item.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}

                    {/* Expanded group items */}
                    {isExpanded && isOpen && (
                      <div className={styles.groupItems}>
                        {items.map((item) => (
                          <div
                            key={item.guiappsrecid}
                            className={styles.navItemWrapper}
                          >
                            <NavLink
                              to={item.path}
                              end={item.exact}
                              className={({ isActive }) =>
                                `${styles.navItem} ${styles.subNavItem} ${isActive ? styles.active : ""}`
                              }
                            >
                              <div className={styles.subItemDot}></div>
                              <div className={styles.iconContainer}>
                                {item.icon}
                              </div>
                              <span className={styles.navLabel}>
                                {item.label}
                              </span>
                            </NavLink>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Audit Logs — always at bottom */}
              <div className={styles.navItemWrapper}>
                <button
                  className={`${styles.navItem} ${isLogsModalOpen ? styles.active : ""}`}
                  onClick={() => setIsLogsModalOpen(true)}
                >
                  <div className={styles.iconContainer}>
                    <FileText size={18} />
                  </div>
                  {isExpanded && (
                    <span className={styles.navLabel}>Audit Logs</span>
                  )}
                </button>
                {!isExpanded && (
                  <div className={styles.tooltip}>Audit Logs</div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Toggle Button — moves with sidebar */}
      <button
        className={styles.toggleButton}
        onClick={toggleSidebar}
        style={{
          left: isExpanded ? "calc(260px - 15px)" : "calc(70px - 15px)",
        }}
      >
        {isExpanded ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
      </button>

      <div className={styles.mainContentWrapper}></div>

      {/* Modals */}
      <AuditLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        IPAddress={api}
        token={token}
        userid={userid}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen && Number(roleid) === 4}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      <ContactModal
        isOpen={isContactModalOpen && Number(roleid) === 4}
        onClose={() => setIsContactModalOpen(false)}
        userId={Number(userid)}
        incuserid={incuserid}
      />
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={handleChatCreated}
          currentUser={currentUser}
        />
      )}
    </>
  );
};

export default Navbar;
