// src/components/ChatApp.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";
import NewChatModal from "./NewChatModal";
import styles from "../Navbar.module.css";
import { getChatLists, getChatDetails, sendMessage } from "./chatService";
import "./ChatApp.css";
import ITELLogo from "../../assets/ITEL_Logo.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MessageSquare, MoveLeft, History } from "lucide-react";

const ChatApp = () => {
  const [chatLists, setChatLists] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [messagePolling, setMessagePolling] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: sessionStorage.getItem("userid"),
    name: sessionStorage.getItem("username") || "User",
    role: sessionStorage.getItem("userrole") || "incubatee",
    roleid: sessionStorage.getItem("roleid") || null,
    incUserid: sessionStorage.getItem("incuserid") || null,
  });
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const chatListIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);
  const messageIdsRef = useRef(new Map());
  const [newChatId, setNewChatId] = useState(null);

  // Helper function to sort chats by time (most recent first)
  const sortChatsByTime = (chats) => {
    return [...chats].sort((a, b) => {
      const dateA = new Date(a.chatlistmodifiedtime || a.chatlistcreatedtime).getTime();
      const dateB = new Date(b.chatlistmodifiedtime || b.chatlistcreatedtime).getTime();
      return dateB - dateA;
    });
  };

  // Fetch chat lists
  const fetchChatLists = useCallback(async () => {
    try {
      const data = await getChatLists(currentUser.id, currentUser.incUserid);
      // Sort chats immediately after fetching
      const sortedData = sortChatsByTime(data);
      setChatLists(sortedData);
      return sortedData;
    } catch (error) {
      console.error("Error fetching chat lists:", error);
      return [];
    }
  }, [currentUser.id, currentUser.incUserid]);

  // Fetch messages for a specific chat
  const fetchMessages = useCallback(
    async (chatId) => {
      try {
        console.log("Fetching messages for chatId:", chatId);
        const data = await getChatDetails(
          currentUser.id,
          chatId,
          currentUser.incUserid
        );
        
        const newMessageIds = new Set(data.map((msg) => msg.chatdetailsrecid));
        messageIdsRef.current.set(chatId, newMessageIds);

        setMessages((prev) => ({
          ...prev,
          [chatId]: data,
        }));
        return data;
      } catch (error) {
        console.error("Error fetching messages:", error);
        return [];
      }
    },
    [currentUser.id, currentUser.incUserid]
  );

  // Function to handle message read status updates
  const handleMessageRead = useCallback(
    (messageId) => {
      if (!selectedChat) return;

      setMessages((prev) => ({
        ...prev,
        [selectedChat.chatlistrecid]: prev[selectedChat.chatlistrecid].map(
          (msg) =>
            msg.chatdetailsrecid === messageId
              ? { ...msg, chatdetailsreadstatus: 1 }
              : msg
        ),
      }));
    },
    [selectedChat]
  );

  // Check for new messages
  const checkForNewMessages = useCallback(
    async (chatId) => {
      if (messagePolling) return;

      setMessagePolling(true);
      try {
        const data = await getChatDetails(
          currentUser.id,
          chatId,
          currentUser.incUserid
        );
        const storedMessageIds = messageIdsRef.current.get(chatId) || new Set();

        const newMessages = data.filter(
          (msg) => !storedMessageIds.has(msg.chatdetailsrecid)
        );

        if (newMessages.length > 0) {
          const updatedMessageIds = new Set([
            ...storedMessageIds,
            ...newMessages.map((msg) => msg.chatdetailsrecid),
          ]);
          messageIdsRef.current.set(chatId, updatedMessageIds);

          setMessages((prev) => ({
            ...prev,
            [chatId]: data,
          }));

          const latestMessage = newMessages[newMessages.length - 1];
          
          setChatLists((prev) => {
            const updatedList = prev.map((chat) =>
              chat.chatlistrecid === chatId
                ? {
                    ...chat,
                    chatlistmodifiedtime: latestMessage.chatdetailscreatedtime,
                    lastMessage: latestMessage.chatdetailsmessage,
                  }
                : chat
            );
            return sortChatsByTime(updatedList);
          });
        }
      } catch (error) {
        console.error("Error checking for new messages:", error);
      } finally {
        setMessagePolling(false);
      }
    },
    [currentUser.id, messagePolling]
  );

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchChatLists();
      setLoading(false);
    };
    fetchData();
  }, [fetchChatLists]);

  // Set up auto-refresh for chat lists every 3 seconds
  useEffect(() => {
    chatListIntervalRef.current = setInterval(() => {
      fetchChatLists();
    }, 3000);

    return () => {
      if (chatListIntervalRef.current) {
        clearInterval(chatListIntervalRef.current);
      }
    };
  }, [fetchChatLists]);

  // Set up message polling for the selected chat
  useEffect(() => {
    if (selectedChat) {
      // Initial fetch
      fetchMessages(selectedChat.chatlistrecid);

      // Polling: Call getChatDetails every 3 seconds (Changed from 5000000)
      messageIntervalRef.current = setInterval(() => {
        checkForNewMessages(selectedChat.chatlistrecid);
      }, 3000); 

      return () => {
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current);
        }
      };
    }
  }, [selectedChat, fetchMessages, checkForNewMessages]);

  // Check for new chat and select it if it's the one we just created
  useEffect(() => {
    if (newChatId && chatLists.length > 0) {
      const newChat = chatLists.find(
        (chat) => chat.chatlistrecid === newChatId
      );
      if (newChat) {
        setSelectedChat(newChat);
        setNewChatId(null);
      }
    }
  }, [chatLists, newChatId]);

  // ============================================================
  // FIX: HANDLE ROUTING FROM TRAINING TABLE & PREVENT SNAP-BACK
  // ============================================================
  useEffect(() => {
    const urlChatId = searchParams.get("id");

    if (urlChatId) {
      // Ensure we have the list to search
      if (chatLists.length > 0) {
        const foundChat = chatLists.find(
          (chat) => chat.chatlistrecid == urlChatId
        );

        if (foundChat) {
          setSelectedChat(foundChat);
          
          // CRITICAL FIX: Navigate to the clean URL immediately.
          // This removes '?id=...' so that future list refreshes 
          // do NOT force the user back to this chat.
          navigate("/Incubation/Dashboard/Chats", { replace: true });
        } else {
          // If not found (maybe new chat), refresh list to try again
          fetchChatLists(); 
        }
      } else {
        fetchChatLists();
      }
    }
  }, [chatLists, searchParams, fetchChatLists, navigate]);
  // ============================================================


  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchChatLists();
      if (selectedChat) {
        await fetchMessages(selectedChat.chatlistrecid);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleHistory = () => {
    sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
    navigate("/Incubation/Dashboard/ChatHistory");
  };

  const handleSendMessage = async (messageContent, attachment, replyToId) => {
    try {
      let attachmentBase64 = null;
      let fileName = "";

      if (attachment) {
        attachmentBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64Data = reader.result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(attachment);
        });
        fileName = attachment.name;
      }

      const userId = currentUser.id;
      const chatListFrom = selectedChat.chatlistfrom;
      const chatListTo = selectedChat.chatlistto;
      let messageFrom, messageTo;

      if (userId == chatListFrom) {
        messageFrom = userId;
        messageTo = chatListTo;
      } else if (userId == chatListTo) {
        messageFrom = userId;
        messageTo = chatListFrom;
      } else {
        console.error("Current user is not a participant in this chat");
        alert("Error: You are not a participant in this chat.");
        return;
      }

      const messageData = {
        chatdetailstypeid: selectedChat.chatlistchattypeid,
        chatdetailslistid: selectedChat.chatlistrecid,
        chatdetailsfrom: messageFrom,
        incUserId: currentUser.incUserid,
        chatdetailsto: messageTo,
        chatdetailsmessage: messageContent,
        chatdetailsattachmentpath: attachmentBase64 || "",
        filename: fileName,
      };

      if (replyToId) {
        messageData.chatdetailsreplyfor = replyToId;
      }

      const newMessage = await sendMessage(messageData);

      setMessages((prev) => ({
        ...prev,
        [selectedChat.chatlistrecid]: [
          ...(prev[selectedChat.chatlistrecid] || []),
          newMessage,
        ],
      }));

      const currentIds =
        messageIdsRef.current.get(selectedChat.chatlistrecid) || new Set();
      currentIds.add(newMessage.chatdetailsrecid);
      messageIdsRef.current.set(selectedChat.chatlistrecid, currentIds);

      setChatLists((prev) => {
        const updatedList = prev.map((chat) =>
          chat.chatlistrecid === selectedChat.chatlistrecid
            ? {
                ...chat,
                chatlistmodifiedtime: newMessage.chatdetailscreatedtime,
                lastMessage: newMessage.chatdetailsmessage,
              }
            : chat
        );
        return sortChatsByTime(updatedList);
      });

      setTimeout(() => {
        fetchMessages(selectedChat.chatlistrecid);
      }, 1000);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleChatCreated = async (newChat) => {
    setShowNewChatModal(false);
    if (newChat && newChat.chatlistrecid) {
      setNewChatId(newChat.chatlistrecid);
    }
    await fetchChatLists();
  };

  const handleBackToPortal = () => {
    const roleId = Number(currentUser.roleid);
    const id = Number(currentUser.id);

    if (roleId === 1 || roleId == 2 || roleId === 3) {
      navigate("/Incubation/Dashboard");
    } else if (roleId === 4 || roleId === 5 || roleId === 6) {
      if (id) {
        navigate("/startup/Dashboard/");
      } else {
        navigate("/startup/Dashboard/");
      }
    }
  };

  return (
    <div className="chat-app-page">
      <header className={styles.header}>
        <div className={styles.container}>
          <div className={styles.actions}>
            {/* History button for all users */}
            {/* {Number(currentUser.roleid) === 1 && (
              <button
                className={styles.btnPrimary}
                onClick={handleHistory}
                title="View chat history"
              >
                <History className={styles.icon} />
                Chat History
              </button>
            )} */}
          </div>
        </div>
      </header>

      <main className="chat-app-main" style={{ paddingTop: "100px" }}>
        <div className="chat-container">
          <ChatList
            chatLists={chatLists}
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
            loading={loading}
            currentUser={currentUser}
            refreshing={refreshing}
          />

          {selectedChat ? (
            <ChatWindow
              chat={selectedChat}
              messages={messages[selectedChat.chatlistrecid] || []}
              onSendMessage={handleSendMessage}
              currentUser={currentUser}
              fileInputRef={fileInputRef}
              chatLists={chatLists}
              onMessageRead={handleMessageRead}
            />
          ) : (
            <div className="no-chat-selected">
              <p>Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </main>

      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onChatCreated={handleChatCreated}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default ChatApp;