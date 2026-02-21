import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ChatWindow from "../components/ChatWindow"; // Adjust path as needed
import { getChatDetails } from "../path/to/your/api"; // Import the function you provided
import api from "../Datafetching/api"; // Your standard API instance

const ChatsPage = () => {
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get("id");
  const fileInputRef = useRef(null);

  // States
  const [selectedChat, setSelectedChat] = useState(null); // Holds metadata (subject, type, etc.)
  const [messages, setMessages] = useState([]);          // Holds the message array
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // User Context
  const userId = sessionStorage.getItem("userid");
  const incUserid = sessionStorage.getItem("incuserid");
  const currentUser = { id: userId };

  // 1. Fetch Chat List to find metadata for the specific ID
  // We need this because getChatDetails only returns messages, not the Subject or Chat Type
  const fetchChatMetadata = useCallback(async () => {
    if (!chatId) return;
    
    try {
      // Re-using the logic found in your Table to get the list
      const response = await api.post("/resources/generic/getchatlist", {
        userId: parseInt(userId),
        incUserId: parseInt(incUserid),
      });

      const chatList = response.data?.data || [];
      // Find the specific chat object that matches the ID in the URL
      const chat = chatList.find((c) => c.chatlistrecid === parseInt(chatId));
      
      setSelectedChat(chat || null);
    } catch (err) {
      console.error("Error fetching chat list:", err);
      setError("Failed to load chat info.");
    }
  }, [chatId, userId, incUserid]);

  // 2. Fetch Messages using the API you provided
  const fetchChatMessages = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    setError(null);

    try {
      // Using the getChatDetails function you provided
      const data = await getChatDetails(userId, chatId, incUserid);
      setMessages(data);
    } catch (err) {
      console.error("Error fetching chat details:", err);
      setError("Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, [chatId, userId, incUserid]);

  // Run effects when chatId changes
  useEffect(() => {
    if (chatId) {
      fetchChatMetadata();
      fetchChatMessages();
    }
  }, [chatId, fetchChatMetadata, fetchChatMessages]);

  // Handle Sending Messages (Placeholder implementation)
  const handleSendMessage = async (messageContent, attachment, replyToId) => {
    if (!messageContent && !attachment) return;

    // Optimistic UI Update (optional): Add message immediately to state
    // Then call API to send
    
    try {
        // Example API call structure (adjust endpoint as needed)
        /*
        await api.post("/resources/chat/sendmessage", {
            chatlistid: parseInt(chatId),
            message: messageContent,
            from: parseInt(userId),
            replyto: replyToId || 0
        });
        */
       
       // Refetch messages after sending to ensure sync
       await fetchChatMessages();
    } catch (error) {
        console.error("Error sending message:", error);
    }
  };

  if (!chatId) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h3>No Chat Selected</h3>
        <p>Please select a chat from the list or navigate via a link.</p>
      </div>
    );
  }

  if (loading && !selectedChat) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>Loading chat...</div>
    );
  }

  if (error && !selectedChat) {
     return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>{error}</div>
    );
  }

  return (
    <div className="chats-page-container" style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {selectedChat ? (
        <ChatWindow
          chat={selectedChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          currentUser={currentUser}
          fileInputRef={fileInputRef}
          // Determine if chat is closed based on state
          activeTab={selectedChat.chatlistchatstate === 0 ? "closed" : "open"}
        />
      ) : (
        <div style={{ padding: "20px" }}>Chat not found or access denied.</div>
      )}
    </div>
  );
};

export default ChatsPage;