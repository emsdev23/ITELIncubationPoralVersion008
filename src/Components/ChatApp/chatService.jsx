// src/services/chatService.js
import { IPAdress } from "../Datafetching/IPAdrees";
import api from "../Datafetching/api";
const API_BASE_URL = `${IPAdress}/itelinc`;
import Swal from "sweetalert2";

export const getChatLists = async (userId, incUserid) => {
  try {
    console.log("Fetching chat lists for user:", userId, incUserid);

    const response = await api.post("/resources/generic/getchatlist", {
      userId: parseInt(userId),
      incUserId: parseInt(incUserid),
    });

    // Log the response to see its structure
    console.log("API response:", response);

    // Most API clients return data directly in response.data
    // Adjust this based on your API client's response structure
    const data = response.data || response;

    // Log the data to verify it has the expected structure
    console.log("Chat lists data:", data);

    return data.data || data || [];
  } catch (error) {
    console.error("Error fetching chat lists:", error);
    throw error;
  }
};

// src/components/chatService.js

// ... (other functions)

export const createChat = async (chatData) => {
  try {
    const token = sessionStorage.getItem("token");

    // The 'chatData' object is passed in DIRECTLY.
    // Do not modify it here.
    console.log("Payload being sent to API:", chatData); // Add this log

    const response = await api.post(
      '/resources/chat/initiate', // Your backend endpoint
      chatData, // Send the entire object
      {
        headers: {
          Authorization: `Bearer ${token}`,
          userid: chatData.from,
          "X-Module": "Chat Module",
          "X-Action": "Creating new chat",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};


export const createChatGroup = async (chatData) => {
  try {
    const token = sessionStorage.getItem("token");

    // The 'chatData' object is passed in DIRECTLY.
    // Do not modify it here.
    console.log("Payload being sent to API:", chatData); // Add this log

    const response = await api.post(
      '/resources/chat/broadcastinitiate', // Your backend endpoint
      chatData, // Send the entire object
      {
        headers: {
          Authorization: `Bearer ${token}`,
          userid: chatData.from,
          "X-Module": "Chat Module",
          "X-Action": "Creating new chat",
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error("Error creating chat:", error);
    throw error;
  }
};

export const getChatDetails = async (userId, chatId, incUserid) => {
  try {
    const response = await api.post("/resources/generic/getchatdetails", {
      userId: parseInt(userId),
      chatId: parseInt(chatId),
      incuserid: parseInt(incUserid), // Keeping the lowercase as in the original
      
    });

    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching chat details:", error);
    throw error;
  }
};

export const sendMessage = async (messageData) => {
  try {
    const requestBody = {
      chatdetailstypeid: messageData.chatdetailstypeid,
      chatdetailslistid: messageData.chatdetailslistid,
      chatdetailsfrom: messageData.chatdetailsfrom,
      chatdetailsto: messageData.chatdetailsto,
      chatdetailsmessage: messageData.chatdetailsmessage,
      chatdetailsattachmentpath: messageData.chatdetailsattachmentpath || "",
      chatdetailsattachmentname: messageData.filename || "",
    };

    if (messageData.chatdetailsreplyfor) {
      requestBody.chatdetailsreplyfor = messageData.chatdetailsreplyfor;
    }

    const response = await api.post("/resources/chat/send", requestBody);

    // Adjust based on your API client's response structure
    // Most API clients return data directly in response.data
    return response.data || response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

export const getUsers = async (userId, incUserid) => {
  try {
    const response = await api.post("/resources/generic/getusers", {
      userId: userId || null,
      userIncId: parseInt(incUserid) || null,
    });

    if (response.data.statusCode === 200) {
      const users = response.data.data || [];

      // ✅ Filter only active users (usersadminstate === 1)
      const activeUsers = users.filter(
        (user) => Number(user.usersadminstate) === 1
      );

      return activeUsers;
    } else {
      throw new Error(response.data.message || "Failed to fetch users");
    }
  } catch (error) {
    console.error("Error fetching users:", error);
    Swal.fire(
      "❌ Error",
      error.message || "Failed to load users. Please try again.",
      "error"
    );
    throw error;
  }
};

export const getChatTypes = async (userId, incUserid) => {
  try {
    // --- FIX: Use the secure 'api' instance ---
    // The baseURL is already configured, so we only need to provide the endpoint path.
    // The interceptor will automatically add headers and encrypt the payload.
    const response = await api.post("/resources/generic/getchattype", {
      userId: parseInt(userId),
      incUserId: parseInt(incUserid),
    });

    // --- FIX: Check the response object returned by the api instance ---
    // The interceptor decrypts the response, so we can directly access the parsed data.
    if (response.data.statusCode === 200) {
      return response.data.data || []; // The decrypted data is in response.data
    } else {
      throw new Error(response.data.message || "Failed to fetch chat types");
    }
  } catch (error) {
    console.error("Error fetching chat types:", error);
    // --- FIX: Use consistent error handling with Swal ---
    Swal.fire("❌ Error", error.message || "Failed to load chat types. Please try again.", "error");
    throw error; // Re-throw the error for the calling component to handle
  }
};

// UPDATED: Function to get chat history (all chat details) - uses userId parameter
export const getChatHistory = async (userId, incuserid) => {
  try {
    // --- FIX: Use the secure 'api' instance ---
    // The baseURL is already configured, so we only need to provide the endpoint path.
    // The interceptor will automatically add headers and encrypt the payload.
    const response = await api.post("/resources/generic/getchatdetails", {
      userId: parseInt(userId),
      incuserid: parseInt(incuserid),
      chatId: "ALL", // Get all chat details for the user
    });

    // --- FIX: Check the response object returned by the api instance ---
    // The interceptor decrypts the response, so we can directly access the parsed data.
    if (response.data.statusCode === 200) {
      return response.data.data || []; // The decrypted data is in response.data
    } else {
      throw new Error(response.data.message || "Failed to fetch chat history");
    }
  } catch (error) {
    console.error("Error fetching chat history:", error);
    // --- FIX: Use consistent error handling with Swal ---
    Swal.fire("❌ Error", error.message || "Failed to load chat history. Please try again.", "error");
    throw error; // Re-throw the error for the calling component to handle
  }
};

// In src/components/chatService.js

// ... other existing functions

/**
 * Creates the main details for a broadcast message.
 * @param {number} chatType - The ID of the broadcast chat type (e.g., 3, 4, 5).
 * @param {string} subject - The subject of the broadcast.
 * @param {number} createdBy - The user ID creating the broadcast.
 * @param {number} modifiedBy - The user ID modifying the broadcast.
 * @returns {Promise<object>} The API response, which should include broadcastdetsrecid.
 */
export const addBroadcastDetails = async (
  chatType,
  subject,
  createdBy,
  modifiedBy
) => {
  try {
    const token = sessionStorage.getItem("token");
    // The api.post method handles JSON serialization and headers.
    const response = await api.post(
      "/addBroadcastDets",
      {
        broadcastdetschattype: chatType,
        broadcastdetssubject: subject,
        broadcastdetsadminstate: 1,
        broadcastdetscreatedby: createdBy,
        broadcastdetsmodifiedby: modifiedBy,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          userid: createdBy,
          "X-Module": "Chat Module",
          "X-Action": "Creating broadcast details",
        },
      }
    );
    // The actual data is usually nested in response.data
    return response.data;
  } catch (error) {
    console.error("Error adding broadcast details:", error);
    throw error;
  }
};

/**
 * Adds a single user to an existing broadcast list.
 * @param {number} userId - The ID of the user to add.
 * @param {number} broadcastDetId - The ID of the broadcast details (from addBroadcastDetails).
 * @param {number} createdBy - The user ID performing the action.
 * @param {number} modifiedBy - The user ID performing the action.
 * @returns {Promise<object>} The API response.
 */
export const addBroadcastUser = async (
  userId,
  broadcastDetId,
  createdBy,
  modifiedBy
) => {
  try {
    const token = sessionStorage.getItem("token");
    const response = await api.post(
      "/addBroadcastList",
      {
        broadcastlistuserid: userId,
        broadcastlistdetid: broadcastDetId,
        broadcastlistadminstate: 1,
        broadcastlistcreatedby: createdBy,
        broadcastlistmodifiedby: modifiedBy,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          userid: createdBy,
          "X-Module": "Chat Module",
          "X-Action": "Adding user to broadcast list",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding user to broadcast list:", error);
    throw error;
  }
};


export const getUserAssociationList = async (userId, incUserid) => {
  try {
    // Using the endpoint and payload structure provided
    const response = await api.post("/resources/generic/getuserasslist", {
      userId: String(userId),
      incUserId: String(incUserid),
    });

    // Assuming standard response structure based on your previous code
    if (response.data.statusCode === 200) {
      return response.data.data || [];
    } else {
      throw new Error(response.data.message || "Failed to fetch user associations");
    }
  } catch (error) {
    console.error("Error fetching user associations:", error);
    throw error;
  }
};


export const getIncubateeRecipients = async (userId, userIncId) => {
  try {
    console.log("Fetching incubatee recipients for user:", userId, "inc:", userIncId);
    
    const response = await api.post("/resources/generic/getincubateerecipients", {
      userId: String(userId),
      userIncId: String(userIncId),
    });

    if (response.data.statusCode === 200) {
      return response.data.data || [];
    } else {
      throw new Error(response.data.message || "Failed to fetch incubatee recipients");
    }
  } catch (error) {
    console.error("Error fetching incubatee recipients:", error);
    Swal.fire("❌ Error", error.message || "Failed to load recipients. Please try again.", "error");
    throw error;
  }
};