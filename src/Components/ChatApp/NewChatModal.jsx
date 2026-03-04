import React, { useState, useEffect, useRef } from "react";
import "./NewChatModal.css";
import {
  getUsers,
  createChat,
  createChatGroup,
  getChatTypes,
} from "./chatService";
import api from "../Datafetching/api";
import { useNavigate } from "react-router-dom";

const NewChatModal = ({ onClose, onChatCreated, currentUser }) => {
  const navigate = useNavigate();
  const ROLE_IDS = {
    SUPERADMIN: 1,
    ADMIN: 2,
    ADMIN_OPERATOR: 3,
    INCUBATEE_ADMIN: 4,
    INCUBATEE_MANAGER: 5,
    INCUBATEE_OPERATOR: 6,
    MENTOR: 9,
  };

  const [chatType, setChatType] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [chatTypes, setChatTypes] = useState([]);

  // State for Mentor specific POCs
  const [mentorPocs, setMentorPocs] = useState([]);
  const [mentorPocsLoading, setMentorPocsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usersLoading, setUsersLoading] = useState(true);
  const [chatTypesLoading, setChatTypesLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchChatTypes();
    fetchUsers();

    // Fetch Mentor POCs if the current user is a Mentor
    if (parseInt(currentUser.roleid) === ROLE_IDS.MENTOR) {
      fetchMentorPocs();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // =======================================================================
  // NEW: Fetch Mentor POCs
  // =======================================================================
  const fetchMentorPocs = async () => {
    try {
      setMentorPocsLoading(true);
      const response = await api.post("/resources/generic/getmentorspoc", {
        userId: String(currentUser.id),
        userIncId: String(currentUser.incUserid),
      });

      const apiData = response.data;
      let finalData = [];

      // Check if the response is directly an array
      if (Array.isArray(apiData)) {
        finalData = apiData;
      }
      // Check if the response is an object containing a "data" array
      else if (apiData && Array.isArray(apiData.data)) {
        finalData = apiData.data;
      }

      setMentorPocs(finalData);
    } catch (error) {
      console.error("Error fetching mentor POCs:", error);
      // Ensure it is always an array, even on error
      setMentorPocs([]);
    } finally {
      setMentorPocsLoading(false);
    }
  };

  const fetchChatTypes = async () => {
    try {
      setChatTypesLoading(true);
      setError("");
      const data = await getChatTypes(currentUser.id, currentUser.incUserid);

      if (
        data.length === 0 &&
        parseInt(currentUser.roleid) === ROLE_IDS.SUPERADMIN
      ) {
        const defaultChatTypes = [
          {
            value: 1,
            // Updated text as requested: "Incubator <--> Incubatee"
            text: "Incubator <--> Incubatee",
            chattypedescription: "incubator to incubatee",
          },
          {
            value: 3,
            text: "broadcast without reply",
            chattypedescription: "broadcast without reply",
          },
          {
            value: 4,
            text: "broadcast with reply public",
            chattypedescription: "broadcast with reply public",
          },
          {
            value: 5,
            text: "broadcast with reply private",
            chattypedescription: "broadcast with reply private",
          },
        ];
        setChatTypes(defaultChatTypes);
      } else {
        setChatTypes(data);
      }
    } catch (error) {
      console.error("Error fetching chat types:", error);
      setError(`Failed to load chat types: ${error.message}`);
    } finally {
      setChatTypesLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setError("");
      const data = await getUsers(currentUser.id, currentUser.incUserid);
      let filteredUsers = data.filter(
        (user) => user.usersrecid != currentUser.id,
      );
      setUsers(filteredUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setError(`${error.message}`);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSelection = (userId) => {
    const selectedChatType = chatTypes.find(
      (type) => type.value.toString() === chatType,
    );
    const userRoleId = parseInt(currentUser.roleid);

    if (
      selectedChatType &&
      (selectedChatType.value === 3 ||
        selectedChatType.value === 4 ||
        selectedChatType.value === 5) &&
      (userRoleId === ROLE_IDS.SUPERADMIN ||
        userRoleId === ROLE_IDS.ADMIN ||
        userRoleId === ROLE_IDS.ADMIN_OPERATOR)
    ) {
      setSelectedUsers((prev) =>
        prev.includes(userId)
          ? prev.filter((id) => id !== userId)
          : [...prev, userId],
      );
    } else {
      // For Mentors and single-select scenarios
      setSelectedUsers([userId]);
      setDropdownOpen(false);
    }
  };

  // =======================================================================
  // MODIFICATION: Filter users based on Role ID logic (Mentor Added)
  // =======================================================================
  const getVisibleUsers = () => {
    const currentRoleId = parseInt(currentUser.roleid);

    // --- MENTOR LOGIC ---
    if (currentRoleId === ROLE_IDS.MENTOR) {
      const combinedList = [];

      // 1. Get users with Role ID 1 (Superadmin/Incubator Admin) from the main user list
      const role1Users = users.filter((user) => {
        const userRoleId = parseInt(user.usersrolesrecid);
        return userRoleId === ROLE_IDS.SUPERADMIN;
      });

      combinedList.push(...role1Users);

      // 2. Map and add users from the 'getmentorspoc' API response
      // Added safety check (Array.isArray) to prevent crash
      const mappedPocs = (Array.isArray(mentorPocs) ? mentorPocs : []).map(
        (poc) => ({
          usersrecid: poc.mentorincassnincuserrecid,
          usersname: poc.usersname,
          rolesname: "Incubatee Admin",
          usersrolesrecid: "MENTOR_POC",
        }),
      );

      // Combine and remove duplicates
      const allUsers = [...combinedList, ...mappedPocs];
      const uniqueUsers = Array.from(
        new Map(allUsers.map((item) => [item.usersrecid, item])).values(),
      );

      return uniqueUsers;
    }

    // --- INCUBATEE ADMIN LOGIC ---
    if (currentRoleId === ROLE_IDS.INCUBATEE_ADMIN) {
      return users.filter((user) => {
        const userRoleId = parseInt(user.usersrolesrecid);
        return (
          userRoleId === ROLE_IDS.SUPERADMIN || userRoleId === ROLE_IDS.ADMIN
        );
      });
    }

    // --- DEFAULT BEHAVIOR ---
    return users;
  };
  // =======================================================================

  // Updated to use getVisibleUsers
  const handleSelectAll = () => {
    const visibleUsers = getVisibleUsers();
    const visibleUserIds = visibleUsers.map((u) => u.usersrecid.toString());

    // Check if all visible users are currently selected
    const allVisibleSelected = visibleUserIds.every((id) =>
      selectedUsers.includes(id),
    );

    if (allVisibleSelected) {
      // If all visible users are selected, deselect only the visible ones
      setSelectedUsers((prev) =>
        prev.filter((id) => !visibleUserIds.includes(id)),
      );
    } else {
      // Otherwise, select all visible users
      setSelectedUsers((prev) => {
        const newSet = new Set(prev);
        visibleUserIds.forEach((id) => newSet.add(id));
        return Array.from(newSet);
      });
    }
  };

  const handleCheckboxChange = (e, userId) => {
    e.stopPropagation();
    handleUserSelection(userId);
  };

  const handleSelectAllCheckboxChange = (e) => {
    e.stopPropagation();
    handleSelectAll();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }

    if (selectedUsers.length === 0) {
      setError("Please select at least one recipient");
      return;
    }

    setLoading(true);

    try {
      const userRoleId = parseInt(currentUser.roleid);
      const isBroadcastType =
        chatType === "3" || chatType === "4" || chatType === "5";
      const isAdminUser =
        userRoleId === ROLE_IDS.SUPERADMIN ||
        userRoleId === ROLE_IDS.ADMIN ||
        userRoleId === ROLE_IDS.ADMIN_OPERATOR;

      if (isBroadcastType && isAdminUser) {
        const chatData = {
          chattype: parseInt(chatType),
          from: currentUser.id,
          subject: subject,
          isgroupchat: true,
          recipients: JSON.stringify(selectedUsers.map((id) => parseInt(id))),
        };
        const newChat = await createChatGroup(chatData);
        onChatCreated(newChat);
      } else {
        const chatData = {
          chattype: parseInt(chatType),
          from: currentUser.id,
          to: parseInt(selectedUsers[0]),
          subject: subject,
          isgroupchat: false,
          recipients: null,
        };
        const newChat = await createChat(chatData);
        onChatCreated(newChat);
      }

      // ✅ Navigate after successful creation
      navigate("/Incubation/Dashboard/Chats");
    } catch (error) {
      console.error("Error creating chat:", error);
      setError(`Failed to create chat: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // =======================================================================
  // KEY MODIFICATION: Filter chat types based on user role
  // =======================================================================
  const getAvailableChatTypes = () => {
    if (!currentUser) return [];

    const userRoleId = parseInt(currentUser.roleid);

    // If user is an ADMIN (SUPERADMIN, ADMIN, ADMIN_OPERATOR)
    if (
      userRoleId === ROLE_IDS.SUPERADMIN ||
      userRoleId === ROLE_IDS.ADMIN ||
      userRoleId === ROLE_IDS.ADMIN_OPERATOR
    ) {
      // Show all types EXCEPT "Incubatee -> Incubator" (value 2)
      return chatTypes.filter((type) => type.value !== 2);
    }

    // If user is an INCUBATEE (ADMIN, MANAGER, OPERATOR)
    if (
      userRoleId === ROLE_IDS.INCUBATEE_ADMIN ||
      userRoleId === ROLE_IDS.INCUBATEE_MANAGER ||
      userRoleId === ROLE_IDS.INCUBATEE_OPERATOR
    ) {
      // Show ONLY the "Incubatee -> Incubator" option (value 2)
      return chatTypes.filter((type) => type.value === 2);
    }

    // If user is a MENTOR
    if (userRoleId === ROLE_IDS.MENTOR) {
      // Show ONLY "Incubator <--> Incubatee" (value 1 based on default types)
      return chatTypes.filter((type) => type.value === 1);
    }

    // Fallback for any other role
    return [];
  };
  // =======================================================================

  const isMultiSelect = () => {
    const selectedChatType = chatTypes.find(
      (type) => type.value.toString() === chatType,
    );
    const userRoleId = parseInt(currentUser.roleid);
    if (
      userRoleId === ROLE_IDS.SUPERADMIN ||
      userRoleId === ROLE_IDS.ADMIN ||
      userRoleId === ROLE_IDS.ADMIN_OPERATOR
    ) {
      return (
        selectedChatType &&
        (selectedChatType.value === 3 ||
          selectedChatType.value === 4 ||
          selectedChatType.value === 5)
      );
    }
    return false;
  };

  const getSelectedUsersDisplay = () => {
    if (selectedUsers.length === 0)
      return isMultiSelect() ? "Select recipients" : "Select recipient";

    const visibleUsers = getVisibleUsers();
    const visibleIds = visibleUsers.map((u) => u.usersrecid.toString());

    // Helper to find name in either list
    const findUserName = (idStr) => {
      // Check main users list
      const mainUser = users.find((u) => u.usersrecid.toString() === idStr);
      if (mainUser) return mainUser.usersname;

      // Check mentor POCs list
      const pocUser = mentorPocs.find(
        (p) => p.mentorincassnincuserrecid.toString() === idStr,
      );
      if (pocUser) return pocUser.usersname;

      return null;
    };

    const selectedNames = selectedUsers
      .map((userId) => findUserName(userId))
      .filter(Boolean);

    if (selectedNames.length === 0)
      return isMultiSelect() ? "Select recipients" : "Select recipient";
    if (selectedNames.length === 1) return selectedNames[0];

    // Check if all visible users are selected
    if (
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedUsers.includes(id))
    ) {
      return `All users selected (${visibleIds.length})`;
    }
    return `${selectedNames.length} users selected`;
  };

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Set the default chat type after chat types are loaded
  useEffect(() => {
    if (chatTypes.length > 0) {
      const available = getAvailableChatTypes();
      if (available.length > 0) {
        setChatType(String(available[0].value));
      }
    }
  }, [chatTypes, currentUser]);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Chat</h3>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="new-chat-form">
          <div className="form-group">
            <label htmlFor="chat-type">Chat Type</label>
            {chatTypesLoading ? (
              <div className="loading-users">Loading chat types...</div>
            ) : (
              <>
                <select
                  id="chat-type"
                  value={chatType}
                  onChange={(e) => {
                    setChatType(e.target.value);
                    setSelectedUsers([]);
                  }}
                >
                  {getAvailableChatTypes().length > 0 ? (
                    getAvailableChatTypes().map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.text}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      No chat types available for your role
                    </option>
                  )}
                </select>
                {getAvailableChatTypes().length === 0 && !chatTypesLoading && (
                  <p
                    style={{
                      color: "red",
                      fontSize: "0.8em",
                      marginTop: "5px",
                    }}
                  >
                    Your role (ID: {currentUser.roleid}) does not have
                    permission to create chats.
                  </p>
                )}
              </>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter chat subject"
            />
          </div>
          <div className="form-group">
            <label>
              {isMultiSelect() ? "Select Recipients" : "Select Recipient"}
            </label>
            <div className="custom-dropdown" ref={dropdownRef}>
              <div
                className={`dropdown-header ${dropdownOpen ? "open" : ""}`}
                onClick={toggleDropdown}
              >
                {getSelectedUsersDisplay()}
                <span className="dropdown-arrow"></span>
              </div>
              {dropdownOpen && (
                <div className="dropdown-list">
                  {/* Add Select All option for multi-select scenarios */}
                  {isMultiSelect() && (
                    <div
                      className="dropdown-item select-all-option"
                      onClick={handleSelectAll}
                    >
                      <input
                        type="checkbox"
                        checked={(() => {
                          const visibleUsers = getVisibleUsers();
                          const visibleIds = visibleUsers.map((u) =>
                            u.usersrecid.toString(),
                          );
                          return (
                            visibleUsers.length > 0 &&
                            visibleIds.every((id) => selectedUsers.includes(id))
                          );
                        })()}
                        onChange={(e) => handleSelectAllCheckboxChange(e)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="user-info">
                        <span className="user-name">
                          {(() => {
                            const visibleUsers = getVisibleUsers();
                            const visibleIds = visibleUsers.map((u) =>
                              u.usersrecid.toString(),
                            );
                            return visibleUsers.length > 0 &&
                              visibleIds.every((id) =>
                                selectedUsers.includes(id),
                              )
                              ? "Deselect All"
                              : "Select All";
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                  {getVisibleUsers().map((user) => (
                    <div
                      key={user.usersrecid}
                      className={`dropdown-item ${selectedUsers.includes(user.usersrecid.toString()) ? "selected" : ""}`}
                      onClick={() =>
                        handleUserSelection(user.usersrecid.toString())
                      }
                    >
                      {isMultiSelect() && (
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(
                            user.usersrecid.toString(),
                          )}
                          onChange={(e) =>
                            handleCheckboxChange(e, user.usersrecid.toString())
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <div className="user-info">
                        <span className="user-name">{user.usersname}</span>
                        <span className="user-role">({user.rolesname})</span>
                      </div>
                    </div>
                  ))}
                  {getVisibleUsers().length === 0 &&
                    !usersLoading &&
                    !mentorPocsLoading && (
                      <div
                        className="dropdown-item"
                        style={{ cursor: "default", color: "#888" }}
                      >
                        No available users found.
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Chat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal;
