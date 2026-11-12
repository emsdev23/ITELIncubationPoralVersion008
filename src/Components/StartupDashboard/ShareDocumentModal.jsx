import React, { useState } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import Swal from "sweetalert2";
import api from "../Datafetching/api";
import { normalizeFileUrl } from "../Datafetching/IPAdrees";

const ShareDocumentModal = ({
  isOpen,
  onClose,
  document,
  incubateesname,
  IPAdress,
}) => {
  const [shareEmail, setShareEmail] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  const handleShareDocument = async () => {
    if (!document || !shareEmail) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Please provide an email address",
      });
      return;
    }

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail)) {
      Swal.fire({
        icon: "error",
        title: "Invalid Email",
        text: "Please enter a valid email address",
      });
      return;
    }

    try {
      setIsSharing(true);
      const token = sessionStorage.getItem("token");
      const userId = sessionStorage.getItem("userid");

      // Get the file URL for the selected document using your encrypted api
      const fileResponse = await api.post(
        "/resources/generic/getfileurl",
        {
          userid: userId,
          url: document.filepath,
        },
        {
          headers: {
            "X-Module": "Incubatee Documents",
            "X-Action": "Get File URL",
          },
        }
      );

      if (fileResponse.data.statusCode !== 200) {
        throw new Error("Failed to get file URL");
      }

      const fileUrl = normalizeFileUrl(fileResponse.data.data);

      // Share the document using your encrypted api
      const shareResponse = await api.post(
        "/resources/generic/sharedoc",
        {
          email: shareEmail,
          fileUrl: fileUrl,
          fileName: document.documentname,
          username: incubateesname,
        },
        {
          headers: {
            "X-Module": "Share Document",
            "X-Action": "Share Document via Email By Incubatee",
          },
        }
      );

      if (shareResponse.data.statusCode === 200) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Document shared successfully!",
        });
        onClose();
        setShareEmail("");
      } else {
        throw new Error(
          shareResponse.data.message || "Failed to share document"
        );
      }
    } catch (error) {
      console.error("Error sharing document:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "Failed to share document",
      });
    } finally {
      setIsSharing(false);
    }
  };
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="share-document-modal"
      aria-describedby="modal for sharing document"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" component="h2" mb={2}>
          Share Document
        </Typography>

        {document && (
          <Typography variant="body2" mb={2}>
            Document: <strong>{document.documentname}</strong>
          </Typography>
        )}

        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={shareEmail}
          onChange={(e) => setShareEmail(e.target.value)}
          margin="normal"
          required
          helperText="Enter the email address to share this document with"
        />

        <Box
          sx={{ display: "flex", justifyContent: "flex-end", mt: 3, gap: 1 }}
        >
          <Button variant="outlined" onClick={onClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleShareDocument}
            disabled={!shareEmail || isSharing}
            startIcon={isSharing ? <CircularProgress size={20} /> : null}
          >
            {isSharing ? "Sharing..." : "Share"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ShareDocumentModal;
