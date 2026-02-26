import React, {
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
  useCallback,
  useContext,
} from "react";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import { FaPowerOff } from "react-icons/fa";

// Material UI imports
import {
  Button,
  Box,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Backdrop,
  Snackbar,
  Alert,
  Grid,
  Tooltip,
  LinearProgress,
  Popover,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  FormGroup,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import UndoIcon from "@mui/icons-material/Undo";
import ToggleOnIcon from "@mui/icons-material/ToggleOn"; // ON Icon (Green Pill)
import ToggleOffIcon from "@mui/icons-material/ToggleOff"; // OFF Icon (Grey Pill)
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // Status Active
import CancelIcon from "@mui/icons-material/Cancel"; // Status Inactive

// Import your reusable component and API instance
import ReusableDataGrid from "../Datafetching/ReusableDataGrid";
import api from "../Datafetching/api";
import { useWriteAccess } from "../Datafetching/useWriteAccess";
import { DataContext } from "../Datafetching/DataProvider";

// Styled components
const StyledBackdrop = styled(Backdrop)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
  color: "#fff",
}));

// UPDATED: Styled ActionButton to match TrainingModule logic
const ActionButton = styled(IconButton)(({ theme, color }) => ({
  margin: theme.spacing(0.5),
  backgroundColor:
    color === "edit"
      ? theme.palette.primary.main
      : color === "on" // ON State -> Green
      ? theme.palette.success.main
      : color === "off" // OFF State -> Grey (The requested change)
      ? theme.palette.grey[500]
      : theme.palette.error.main, // Fallback / Delete
  color: "white",
  "&:hover": {
    backgroundColor:
      color === "edit"
        ? theme.palette.primary.dark
        : color === "on"
        ? theme.palette.success.dark
        : color === "off" // OFF Hover -> Darker Grey
        ? theme.palette.grey[700]
        : theme.palette.error.dark,
  },
  "&.disabled": {
    backgroundColor: theme.palette.grey[300],
    color: theme.palette.grey[500],
    cursor: "not-allowed",
  },
}));

const ApplyButton = styled(Button)(({ theme, disabled }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: disabled
    ? theme.palette.grey[300]
    : theme.palette.success.main,
  color: disabled ? theme.palette.text.disabled : "white",
  "&:hover": {
    backgroundColor: disabled
      ? theme.palette.grey[300]
      : theme.palette.success.dark,
  },
}));

const UnmarkButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(0.5),
  backgroundColor: theme.palette.warning.main,
  color: "white",
  "&:hover": {
    backgroundColor: theme.palette.warning.dark,
  },
}));

const FileUploadButton = styled(Button)(({ theme }) => ({
  position: "relative",
  overflow: "hidden",
  "& input[type=file]": {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: "100%",
    minHeight: "100%",
    fontSize: "100px",
    textAlign: "right",
    cursor: "pointer",
    opacity: 0,
    outline: "none",
    background: "white",
    display: "block",
  },
}));

const FileIcon = ({ fileName }) => {
  if (!fileName) return <InsertDriveFileIcon />;

  const extension = fileName.split(".").pop().toLowerCase();

  switch (extension) {
    case "pdf":
      return <PictureAsPdfIcon sx={{ color: "#dc2626" }} />;
    case "doc":
    case "docx":
      return <DescriptionIcon sx={{ color: "#2563eb" }} />;
    case "xls":
    case "xlsx":
      return <ArticleIcon sx={{ color: "#16a34a" }} />;
    default:
      return <InsertDriveFileIcon sx={{ color: "#6b7280" }} />;
  }
};

// Common date formatting function
const formatDate = (dateStr) => {
  if (!dateStr) return "-";

  try {
    if (Array.isArray(dateStr) && dateStr.length >= 6) {
      const [year, month, day, hour, minute, second] = dateStr;
      const date = new Date(year, month - 1, day, hour, minute, second);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    if (
      typeof dateStr === "string" &&
      dateStr.length === 14 &&
      /^\d+$/.test(dateStr)
    ) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(8, 10);
      const minute = dateStr.substring(10, 12);
      const second = dateStr.substring(12, 14);
      const isoDateStr = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
      const date = new Date(isoDateStr);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    }

    const normalizedDate = dateStr.replace("?", " ");
    const date = new Date(normalizedDate);

    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateStr;
  }
};

// Using forwardRef to allow parent components to access methods
  const DocumentsTable = forwardRef(({ title = "📄 Documents" }, ref) => {  
  const hasWriteAccess = useWriteAccess("/Incubation/Dashboard/AddDocuments");

  const userId = sessionStorage.getItem("userid");
  const token = sessionStorage.getItem("token");
  const roleid = sessionStorage.getItem("roleid");
  const incUserid = sessionStorage.getItem("incuserid");
  const incubateeId = sessionStorage.getItem("incubateeId");

  // STATE DECLARATIONS
  const [documents, setDocuments] = useState([]);
  const [cats, setCats] = useState([]);
  const [subcats, setSubcats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [editDoc, setEditDoc] = useState(null);
  const [formData, setFormData] = useState({
    documentname: "",
    documentdescription: "",
    documentcatrecid: "",
    documentsubcatrecid: "",
    documentperiodicityrecid: "",
    documentremarks: "",
    sampleDocName: "",
    sampleDocBase64: "",
    templateDocName: "",
    templateDocBase64: "",
    documentapplystatus: 1,
    documentreferencelink: "",
    documentreferencevideo: "",
    documentapplicability: "",
  });
  const [originalFileNames, setOriginalFileNames] = useState({
    sample: "",
    template: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isUploading, setIsUploading] = useState({
    sample: false,
    template: false,
  });
  const [isDeleting, setIsDeleting] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApplying, setIsApplying] = useState({});
  const [isUnmarking, setIsUnmarking] = useState({});
  const [isToggling, setIsToggling] = useState(null);
  const [appliedDocuments, setAppliedDocuments] = useState(new Set());
  const [appliedDocumentDetails, setAppliedDocumentDetails] = useState({});
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [error, setError] = useState(null);

  const [showAdditionalCategories, setShowAdditionalCategories] =
    useState(false);
  const [selectedAdditionalCategories, setSelectedAdditionalCategories] =
    useState({});

  const isXLSXAvailable = !!XLSX;

  useImperativeHandle(ref, () => ({
    openAddModal,
  }));

  // HANDLER FUNCTIONS
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/api/documents/getDocumentsAll?incuserid=${incUserid}`,
        {
          headers: {
            "X-Module": "Document Management",
            "X-Action": "fetch All Documents",
          },
        },
      );
      setDocuments(response.data.data || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [incUserid]);

  const fetchSubCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/getDocsubcatAll?incuserid=${encodeURIComponent(incUserid)}`,
        {
          headers: {
            "X-Module": "Document Management",
            "X-Action": "Fetch Document SubCategories",
          },
        },
      );
      setSubcats(response.data.data || []);
    } catch (err) {
      console.error("Error fetching subcategories:", err);
      setError("Failed to load subcategories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [incUserid]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/getDoccatAll?incuserid=${incUserid}`, {
        headers: {
          "X-Module": "Document Management",
          "X-Action": "Fetch Document Categories",
        },
      });
      setCats(response.data.data || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [incUserid]);

  const fetchApplicabilityDetails = useCallback(() => {
    if (Number(roleid) !== 4) return;

    api
      .post(
        "/resources/generic/getapplicabilitydetails",
        {
          userId: userId,
          roleId: roleid,
        },
        {
          headers: {
            "X-Module": "Document Management",
            "X-Action": "fetch Applicability Details",
          },
        },
      )
      .then((response) => {
        const data = response.data;
        if (data.statusCode === 200 && data.data) {
          let appliedDocs = [];
          if (Array.isArray(data.data)) {
            appliedDocs = data.data;
          } else if (data.data.incdocapplydocumentid) {
            appliedDocs = [data.data];
          }

          const appliedIds = new Set(
            appliedDocs.map((doc) => doc.incdocapplydocumentid),
          );
          setAppliedDocuments(appliedIds);

          const docDetails = {};
          appliedDocs.forEach((doc) => {
            docDetails[doc.incdocapplydocumentid] = doc.incdocapplyrecid;
          });
          setAppliedDocumentDetails(docDetails);
        }
      })
      .catch((err) => {
        console.error("Error fetching applicability details:", err);
      });
  }, [userId, roleid]);

  const fetchLinkedDocuments = useCallback(async (documentId) => {
    try {
      const response = await api.post(
        "/getLinkedDocuments",
        {
          documentid: documentId,
        },
        {
          headers: {
            "X-Module": "Document Management",
            "X-Action": "Fetch Linked Documents",
          },
        },
      );

      const data = response.data;
      console.log("Linked documents response:", data);

      if (data.statusCode === 200 && data.data) {
        return Array.isArray(data.data) ? data.data : [data.data];
      }
      return [];
    } catch (error) {
      console.error("Error fetching linked documents:", error);
      return [];
    }
  }, []);

  const extractCategoryIdFromLinkedDoc = useCallback((linkedDoc) => {
    const possibleFields = [
      "docsubcatscatrecid",
      "doccatid",
      "doccatrecid",
      "linkeddoccatrecid",
      "categoryid",
      "cat_id",
      "categoryId",
    ];

    for (const field of possibleFields) {
      if (linkedDoc[field] !== undefined && linkedDoc[field] !== null) {
        return String(linkedDoc[field]);
      }
    }

    if (linkedDoc.category && linkedDoc.category.id) {
      return String(linkedDoc.category.id);
    }
    if (linkedDoc.doccat && linkedDoc.doccat.doccatrecid) {
      return String(linkedDoc.doccat.doccatrecid);
    }

    return null;
  }, []);

  const getFileBase64 = useCallback(
    async (filePath) => {
      if (!filePath) return null;

      try {
        const fileUrlResponse = await api.post(
          "/resources/generic/getfileurl",
          {
            userid: userId || "39",
            url: filePath,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Get File URL",
            },
          },
        );

        if (
          fileUrlResponse.data.statusCode !== 200 ||
          !fileUrlResponse.data.data
        ) {
          throw new Error(
            fileUrlResponse.data.message || "Invalid response format",
          );
        }

        const fileUrl = fileUrlResponse.data.data;

        let fileResponse;
        try {
          fileResponse = await fetch(fileUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (error) {
          fileResponse = await fetch(fileUrl, {
            method: "GET",
          });
        }

        if (!fileResponse.ok) {
          throw new Error(
            `Failed to fetch file. Status: ${fileResponse.status}`,
          );
        }

        const blob = await fileResponse.blob();

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const base64Data = result.split(",")[1];
            resolve(base64Data);
          };
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.error("Error fetching file as base64:", error);
        throw error;
      }
    },
    [token, userId],
  );

  const refreshData = useCallback(() => {
    fetchDocuments();
    fetchCategories();
    fetchSubCategories();
    fetchApplicabilityDetails();
  }, [
    fetchDocuments,
    fetchCategories,
    fetchSubCategories,
    fetchApplicabilityDetails,
  ]);

  const refreshDropdownData = useCallback(() => {
    return Promise.all([fetchCategories(), fetchSubCategories()]);
  }, [fetchCategories, fetchSubCategories]);

  const showToast = useCallback((message, severity = "success") => {
    setToast({ open: true, message, severity });
  }, []);

  const validateField = useCallback(
    (name, value) => {
      const errors = { ...fieldErrors };
      switch (name) {
        case "documentname":
          if (!value || value.trim() === "") {
            errors[name] = "Document name is required";
          } else if (value.length < 3) {
            errors[name] = "Document name must be at least 3 characters";
          } else if (value.length > 100) {
            errors[name] = "Document name must be less than 100 characters";
          } else {
            delete errors[name];
          }
          break;
        case "documentdescription":
          if (!value || value.trim() === "") {
            errors[name] = "Description is required";
          } else if (value.length < 10) {
            errors[name] = "Description must be at least 10 characters";
          } else if (value.length > 500) {
            errors[name] = "Description must be less than 500 characters";
          } else {
            delete errors[name];
          }
          break;
        case "documentcatrecid":
          if (!value) {
            errors[name] = "Please select a category";
          } else {
            delete errors[name];
          }
          break;
        case "documentsubcatrecid":
          if (!value) {
            errors[name] = "Please select a subcategory";
          } else {
            delete errors[name];
          }
          break;
        case "documentperiodicityrecid":
          if (!value) {
            errors[name] = "Please select periodicity";
          } else {
            delete errors[name];
          }
          break;
        case "documentapplystatus":
          if (value === "" || value === null || value === undefined) {
            errors[name] = "Please select document applicability status";
          } else {
            delete errors[name];
          }
          break;
        case "documentreferencelink":
          if (value && !/^https?:\/\/.+/i.test(value)) {
            errors[name] = "Please enter a valid URL (http:// or https://)";
          } else {
            delete errors[name];
          }
          break;
        case "documentreferencevideo":
          if (value && !/^https?:\/\/.+/i.test(value)) {
            errors[name] = "Please enter a valid URL (http:// or https://)";
          } else {
            delete errors[name];
          }
          break;
        default:
          break;
      }
      setFieldErrors(errors);
      return !errors[name];
    },
    [fieldErrors],
  );

  const validateForm = useCallback(() => {
    const isValid =
      validateField("documentname", formData.documentname) &&
      validateField("documentdescription", formData.documentdescription) &&
      validateField("documentcatrecid", formData.documentcatrecid) &&
      validateField("documentsubcatrecid", formData.documentsubcatrecid) &&
      validateField(
        "documentperiodicityrecid",
        formData.documentperiodicityrecid,
      ) &&
      validateField("documentapplystatus", formData.documentapplystatus) &&
      validateField("documentreferencelink", formData.documentreferencelink) &&
      validateField("documentreferencevideo", formData.documentreferencevideo);

    return isValid;
  }, [formData, validateField]);

  const validateAdditionalCategories = useCallback(() => {
    return true;
  }, []);

  const convertFileToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const getFileUrl = useCallback(
    async (path) => {
      try {
        const response = await api.post(
          "/resources/generic/getfileurl",
          {
            userid: userId || "39",
            url: path,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Document Preview Fetch",
            },
          },
        );

        if (response.data.statusCode === 200 && response.data.data) {
          return response.data.data;
        } else {
          throw new Error(response.data.message || "Invalid response format");
        }
      } catch (error) {
        console.error("Error getting file URL:", error);
        throw error;
      }
    },
    [userId],
  );

  const downloadDocument = useCallback(
    async (docPath, docName) => {
      if (!docPath) {
        showToast("Document not available", "warning");
        return null;
      }

      setIsDownloading(true);
      showToast(`Preparing download for ${docName}...`, "info");

      try {
        const response = await api.post(
          "/resources/generic/getfileurl",
          {
            userid: userId || "39",
            url: docPath,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Document Preview Fetch",
            },
          },
        );

        if (response.data.statusCode === 200 && response.data.data) {
          const fileUrl = response.data.data;

          let fileResponse;

          try {
            fileResponse = await fetch(fileUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
          } catch (error) {
            fileResponse = await fetch(fileUrl, {
              method: "GET",
            });
          }

          if (!fileResponse.ok) {
            throw new Error(
              `Failed to fetch file. Status: ${fileResponse.status}`,
            );
          }

          const blob = await fileResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = docName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          showToast(`Downloaded ${docName}`, "success");
        } else {
          throw new Error(
            response.data.message || "Failed to get download URL",
          );
        }
      } catch (error) {
        console.error("Error downloading document:", error);
        showToast(
          `Failed to download: ${error.response?.data?.message || error.message}`,
          "error",
        );
      } finally {
        setIsDownloading(false);
      }
    },
    [userId, token, showToast],
  );

  const previewDocument = useCallback(
    async (docPath, docName) => {
      if (!docPath) {
        showToast("Document not available", "warning");
        return;
      }

      setPreviewLoading(true);
      setIsPreviewModalOpen(true);
      setPreviewDoc({
        name: docName,
        url: null,
        type: null,
        originalPath: docPath,
      });
      setPreviewContent(null);

      try {
        const fileUrl = await getFileUrl(docPath);
        const extension = docName.split(".").pop().toLowerCase();
        let type = "unknown";

        switch (extension) {
          case "pdf":
            type = "pdf";
            break;
          case "doc":
          case "docx":
            type = "word";
            break;
          case "xls":
          case "xlsx":
            type = "excel";
            break;
          case "txt":
          case "csv":
          case "json":
          case "xml":
          case "html":
          case "css":
          case "js":
          case "md":
            type = "text";
            break;
          case "jpg":
          case "jpeg":
          case "png":
          case "gif":
          case "bmp":
          case "webp":
            type = "image";
            break;
          default:
            type = "unknown";
        }

        let content = null;

        if (type === "image") {
          content = { type: "image", url: fileUrl };
        } else if (type === "pdf") {
          content = { type: "pdf", url: fileUrl };
        } else if (type === "text") {
          try {
            const response = await fetch(fileUrl, {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
              const responseNoAuth = await fetch(fileUrl);
              if (!responseNoAuth.ok) {
                throw new Error("Failed to fetch text content");
              }
              const text = await responseNoAuth.text();
              content = { type: "text", content: text };
            } else {
              const text = await response.text();
              content = { type: "text", content: text };
            }
          } catch (error) {
            content = { type: "error", message: "Failed to load text content" };
          }
        } else {
          content = { type: "file", url: fileUrl, fileName: docName };
        }

        setPreviewDoc({
          name: docName,
          url: fileUrl,
          type: type,
          originalPath: docPath,
        });
        setPreviewContent(content);
      } catch (error) {
        console.error("Error previewing document:", error);
        showToast(`Failed to preview: ${error.response?.data?.message || error.message}`, "error");
        setPreviewContent({
          type: "error",
          message: `Failed to load preview: ${error.response?.data?.message || error.message}`,
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    [getFileUrl, showToast, token],
  );

  const openAddModal = useCallback(() => {
    setEditDoc(null);
    setOriginalFileNames({ sample: "", template: "" });
    setFormData({
      documentname: "",
      documentdescription: "",
      documentcatrecid: "",
      documentsubcatrecid: "",
      documentperiodicityrecid: "",
      documentremarks: "",
      sampleDocName: "",
      sampleDocBase64: "",
      templateDocName: "",
      templateDocBase64: "",
      documentapplystatus: 1,
      documentreferencelink: "",
      documentapplicability: "",
      documentreferencevideo: "",
    });
    setFieldErrors({});
    setShowAdditionalCategories(false);
    setSelectedAdditionalCategories({});
    refreshDropdownData().then(() => {
      setIsModalOpen(true);
    });
  }, [refreshDropdownData]);

  const openEditModal = useCallback(
    async (doc) => {
      if (doc.documentadminstate === 0) {
        Swal.fire(
          "Restricted",
          "Cannot edit a disabled document. Please enable it first.",
          "warning"
        );
        return;
      }

      await refreshDropdownData();

      setEditDoc(doc);
      setOriginalFileNames({
        sample: doc.documentsampledocname || "",
        template: doc.documenttemplatedocname || "",
      });

      let primaryCategoryId = "";
      if (doc.doccatname) {
        const category = cats.find((cat) => cat.doccatname === doc.doccatname);
        if (category) {
          primaryCategoryId = category.doccatrecid;
        }
      }

      let primarySubcategoryId = "";
      if (doc.docsubcatname && primaryCategoryId) {
        const subcategory = subcats.find(
          (sc) =>
            sc.docsubcatname === doc.docsubcatname &&
            String(sc.docsubcatscatrecid) === String(primaryCategoryId),
        );
        if (subcategory) {
          primarySubcategoryId = subcategory.docsubcatrecid;
        }
      }

      setFormData({
        documentname: doc.documentname || "",
        documentdescription: doc.documentdescription || "",
        documentcatrecid: primaryCategoryId,
        documentsubcatrecid: primarySubcategoryId,
        documentperiodicityrecid: doc.documentperiodicityrecid || "",
        documentremarks: doc.documentremarks || "",
        sampleDocName: doc.documentsampledocname || "",
        sampleDocBase64: "",
        templateDocName: doc.documenttemplatedocname || "",
        templateDocBase64: "",
        documentapplystatus:
          doc.documentapplystatus !== undefined ? doc.documentapplystatus : 1,
        documentreferencelink: doc.documentreferencelink || "",
        documentapplicability: doc.documentapplicability || "",
        documentreferencevideo: doc.documentreferencevideo || "",
      });
      setFieldErrors({});

      setIsModalOpen(true);
    },
    [refreshDropdownData, cats, subcats],
  );

  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;

      if (fieldErrors[name]) {
        validateField(name, value);
      }

      setFormData((prev) => ({ ...prev, [name]: value }));

      if (name === "documentcatrecid") {
        setFormData((prev) => ({ ...prev, documentsubcatrecid: "" }));
        setSelectedAdditionalCategories({});
      }
    },
    [fieldErrors, validateField],
  );

  const handleSampleDocChange = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (file) {
        setIsUploading((prev) => ({ ...prev, sample: true }));

        try {
          if (file.size > 10 * 1024 * 1024) {
            showToast(
              `File size ${(file.size / (1024 * 1024)).toFixed(
                2,
              )}MB exceeds 10MB limit`,
              "error",
            );
            e.target.value = "";
            return;
          }

          const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
          ];
          if (!allowedTypes.includes(file.type)) {
            showToast(
              "Invalid file type. Please select PDF, DOC, DOCX, XLS, XLSX, or TXT files.",
              "error",
            );
            e.target.value = "";
            return;
          }

          const base64 = await convertFileToBase64(file);
          setFormData((prev) => ({
            ...prev,
            sampleDocName: file.name,
            sampleDocBase64: base64,
          }));
          showToast("Sample document uploaded successfully", "success");
        } catch (error) {
          console.error("Error converting file to base64:", error);
          showToast("Failed to process sample document", "error");
          e.target.value = "";
        } finally {
          setIsUploading((prev) => ({ ...prev, sample: false }));
        }
      }
    },
    [convertFileToBase64, showToast],
  );

  const handleTemplateDocChange = useCallback(
    async (e) => {
      const file = e.target.files[0];
      if (file) {
        setIsUploading((prev) => ({ ...prev, template: true }));

        try {
          if (file.size > 10 * 1024 * 1024) {
            showToast(
              `File size ${(file.size / (1024 * 1024)).toFixed(
                2,
              )}MB exceeds 10MB limit`,
              "error",
            );
            e.target.value = "";
            return;
          }

          const allowedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
          ];
          if (!allowedTypes.includes(file.type)) {
            showToast(
              "Invalid file type. Please select PDF, DOC, DOCX, XLS, XLSX, or TXT files.",
              "error",
            );
            e.target.value = "";
            return;
          }

          const base64 = await convertFileToBase64(file);
          setFormData((prev) => ({
            ...prev,
            templateDocName: file.name,
            templateDocBase64: base64,
          }));
          showToast("Template document uploaded successfully", "success");
        } catch (error) {
          console.error("Error converting file to base64:", error);
          showToast("Failed to process template document", "error");
          e.target.value = "";
        } finally {
          setIsUploading((prev) => ({ ...prev, template: false }));
        }
      }
    },
    [convertFileToBase64, showToast],
  );

  const getFilteredSubcategories = useCallback(() => {
    if (!formData.documentcatrecid || subcats.length === 0) {
      return [];
    }

    const filtered = subcats.filter((sc) => {
      const catId = String(formData.documentcatrecid);
      return sc.docsubcatscatrecid && String(sc.docsubcatscatrecid) === catId;
    });

    return filtered;
  }, [formData.documentcatrecid, subcats]);

  const handleCategoryCheckboxChange = useCallback((categoryId, isChecked) => {
    setSelectedAdditionalCategories((prev) => ({
      ...prev,
      [categoryId]: isChecked,
    }));
  }, []);

  const addLinkedDocument = useCallback(
    async (documentId, subcategoryId) => {
      try {
        const response = await api.post(
          "/addLinkedDocument",
          {
            linkeddocdocumentid: documentId,
            linkeddocdocsubcatid: subcategoryId,
            linkeddocadminstate: 1,
            linkeddoccreatedby: parseInt(userId) || 1,
            linkeddocmodifiedby: parseInt(userId) || 1,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Add Linked Document",
            },
          },
        );

        return response.data;
      } catch (error) {
        console.error("Error adding linked document:", error);
        throw error;
      }
    },
    [userId],
  );

  const createDocument = useCallback(async (documentData) => {
    try {
      const response = await api.post(
        "/api/documents/addDocumentDetails",
        documentData,
        {
          headers: {
            "X-Module": "Document Management",
            "X-Action": "Add Document",
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error creating document:", error);
      throw error;
    }
  }, []);

  const updateDocument = useCallback(async (documentData) => {
    try {
      const response = await api.post(
        "/api/documents/updateDocumentDetails",
        documentData,
        {
          headers: {
            "X-Module": "Document Management",
            "X-Action": "Update Document",
          },
        },
      );

      return response.data;
    } catch (error) {
      console.error("Error updating document:", error);
      throw error;
    }
  }, []);

  const extractDocumentId = useCallback((response) => {
    let documentId = null;

    if (response.data) {
      if (typeof response.data === "string") {
        const idMatch = response.data.match(/(\d+)/);
        if (idMatch) {
          documentId = parseInt(idMatch[1]);
        } else if (!isNaN(response.data)) {
          documentId = parseInt(response.data);
        }
      } else if (response.data.documentsrecid) {
        documentId = response.data.documentsrecid;
      } else if (response.data.id) {
        documentId = response.data.id;
      }
    } else if (response.documentsrecid) {
      documentId = response.documentsrecid;
    }

    if (!documentId) {
      console.error(
        "Could not extract document ID from response. Full response:",
        response,
      );
    }

    return documentId;
  }, []);

  const getDocumentIdFromTable = useCallback(
    (docName, docCatId, docSubcatId) => {
      const doc = documents.find(
        (d) =>
          d.documentname === docName &&
          d.documentcatrecid === docCatId &&
          d.documentsubcatrecid === docSubcatId,
      );
      return doc ? doc.documentsrecid : null;
    },
    [documents],
  );

  const applyForDocument = useCallback(
    async (documentId, reason) => {
      setIsApplying((prev) => ({ ...prev, [documentId]: true }));

      try {
        const response = await api.post(
          "/addIncubateeApplicability",
          {
            incdocapplyincubateeid: incubateeId,
            incdocapplydocumentid: documentId,
            incdocapplyadminstate: 1,
            incdocapplycreatedby: userId,
            incdocapplymodifiedby: userId,
            incdocapplyreason: reason,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Apply for Document",
            },
          },
        );

        const data = response.data;

        if (data.statusCode === 200) {
          showToast("Application submitted successfully!", "success");
          setAppliedDocuments((prev) => new Set([...prev, documentId]));

          await fetchApplicabilityDetails();
          fetchDocuments();
        } else {
          throw new Error(
            data.response?.data?.message || data.message || "Failed to apply for document",
          );
        }
      } catch (error) {
        console.error("Error applying for document:", error);
        showToast(`Failed to apply: ${error.response?.data?.message || error.message}`, "error");
      } finally {
        setIsApplying((prev) => ({ ...prev, [documentId]: false }));
      }
    },
    [incubateeId, userId, showToast, fetchDocuments, fetchApplicabilityDetails],
  );

  const handleApplyForDocument = useCallback(
    (doc) => {
      Swal.fire({
        title: "Mark Applicability status for Document",
        text: `Please provide a reason for marking "${doc.documentname}" as not applicable`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Submit",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#28a745",
        input: "text",
        inputLabel: "Reason",
        inputPlaceholder: "Enter reason for marking as not applicable",
        inputValidator: (value) => {
          if (!value || value.trim() === "") {
            return "You need to provide a reason!";
          }
        },
      }).then((result) => {
        if (result.isConfirmed) {
          applyForDocument(doc.documentsrecid, result.value);
        }
      });
    },
    [applyForDocument],
  );

  const unmarkDocument = useCallback(
    async (documentId) => {
      setIsUnmarking((prev) => ({ ...prev, [documentId]: true }));

      try {
        const applicabilityRecordId = appliedDocumentDetails[documentId];

        if (!applicabilityRecordId) {
          throw new Error("Applicability record ID not found");
        }

        const response = await api.post(
          "/deleteIncubateeApplicability",
          {
            incdocapplyrecid: applicabilityRecordId,
            incdocapplymodifiedby: userId,
          },
          {
            headers: {
              "X-Module": "Document Management",
              "X-Action": "Unmark Document",
            },
          },
        );

        const data = response.data;

        if (data.statusCode === 200) {
          showToast("Document unmarked successfully!", "success");
          setAppliedDocuments((prev) => {
            const newSet = new Set(prev);
            newSet.delete(documentId);
            return newSet;
          });

          setAppliedDocumentDetails((prev) => {
            const newDetails = { ...prev };
            delete newDetails[documentId];
            return newDetails;
          });

          await fetchApplicabilityDetails();
          fetchDocuments();
        } else {
          throw new Error(
            data.response?.data?.message || data.message || "Failed to unmark document",
          );
        }
      } catch (error) {
        console.error("Error unmarking document:", error);
        showToast(`Failed to unmark: ${error.response?.data?.message || error.message}`, "error");
      } finally {
        setIsUnmarking((prev) => ({ ...prev, [documentId]: false }));
      }
    },
    [
      userId,
      showToast,
      fetchDocuments,
      fetchApplicabilityDetails,
      appliedDocumentDetails,
    ],
  );

  const handleUnmarkDocument = useCallback(
    (doc) => {
      Swal.fire({
        title: "Unmark Document",
        text: `Are you sure you want to unmark "${doc.documentname}" as not applicable?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, unmark it!",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#f8bb86",
      }).then((result) => {
        if (result.isConfirmed) {
          unmarkDocument(doc.documentsrecid);
        }
      });
    },
    [unmarkDocument],
  );

  // =======================================================================
  // START: Handle Toggle Status - JSON STRUCTURE UPDATE
  // =======================================================================
  const handleToggleStatus = useCallback(
    (doc) => {
      const isCurrentlyEnabled = doc.documentadminstate === 1;
      const actionText = isCurrentlyEnabled ? "disable" : "enable";
      const newState = isCurrentlyEnabled ? 0 : 1;

      Swal.fire({
        title: "Are you sure?",
        text: `Do you want to ${actionText} ${doc.documentname}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: isCurrentlyEnabled ? "#d33" : "#3085d6",
        cancelButtonColor: "#6c757d",
        confirmButtonText: `Yes, ${actionText} it!`,
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          setIsToggling(doc.documentsrecid);

          // Constructing the payload to match the requested structure exactly
          const bodyPayload = {
            userid: parseInt(userId) || 39,
            documentsrecid: doc.documentsrecid,
            
            // IDs - Mapped from doc object
            doccatid: doc.documentcatrecid, 
            docsubcatid: doc.documentsubcatrecid,
            
            // Core Document Details
            documentperiodicityrecid: doc.documentperiodicityrecid,
            documentname: doc.documentname,
            documentdescription: doc.documentdescription,
            documentremarks: doc.documentremarks || "",
            documentapplystatus: doc.documentapplystatus,
            documentreferencelink: doc.documentreferencelink || "",
            documentreferencevideo: doc.documentreferencevideo || "",
            documentapplicability: doc.documentapplicability || "",
            
            // File Names
            sampleDocName: doc.documentsampledocname || "",
            templateDocName: doc.documenttemplatedocname || "",
            
            // The field being updated (String "1" or "0" as per example)
            documentadminstate: newState.toString(), 
            
            // Modifier
            documentmodifiedby: parseInt(userId) || 39,
          };

          api
            .post("/api/documents/updateDocumentDetails", bodyPayload, {
              headers: {
                "X-Module": "Document Management",
                "X-Action": "Update Document Status",
              },
            })
            .then((response) => {
              if (response.data.statusCode === 200) {
                Swal.fire(
                  "Success!",
                  `${doc.documentname} has been ${actionText}d.`,
                  "success"
                );
                refreshData();
              } else {
                throw new Error(
                  response.data.message || `Failed to ${actionText} document`
                );
              }
            })
            .catch((err) => {
              console.error(`Error ${actionText}ing document:`, err);
              Swal.fire(
                "Error",
                `Failed to ${actionText} ${doc.documentname}: ${err.message}`,
                "error"
              );
            })
            .finally(() => {
              setIsToggling(null);
            });
        }
      });
    },
    [userId, refreshData]
  );
  // =======================================================================
  // END: Handle Toggle Status
  // =======================================================================

  const handleDelete = useCallback(
    (doc) => {
      const documentIdsToDelete = doc.all_documentsrecids
        ? doc.all_documentsrecids.split(",").map((id) => parseInt(id.trim()))
        : [doc.documentsrecid];

      const isMultipleDelete = documentIdsToDelete.length > 1;
      const deleteCount = documentIdsToDelete.length;

      Swal.fire({
        title: "Are you sure?",
        text: isMultipleDelete
          ? `This will delete ${deleteCount} related documents permanently.`
          : "This document will be deleted permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, delete it!",
        cancelButtonText: "Cancel",
      }).then((result) => {
        if (result.isConfirmed) {
          const newDeletingState = {};
          documentIdsToDelete.forEach((id) => {
            newDeletingState[id] = true;
          });
          setIsDeleting((prev) => ({ ...prev, ...newDeletingState }));

          Swal.fire({
            title: "Deleting...",
            text: isMultipleDelete
              ? `Please wait while we delete ${deleteCount} documents.`
              : "Please wait while we delete document.",
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
              Swal.showLoading();
            },
          });

          const deletePromises = documentIdsToDelete.map((documentId) => {
            const requestBody = {
              documentsrecid: documentId,
              documentmodifiedby: parseInt(userId) || 39,
            };

            return api
              .post("/api/documents/deleteDocumentDetails", requestBody, {
                headers: {
                  "X-Module": "Document Management",
                  "X-Action": "Delete Document",
                },
              })
              .then((res) => res.data);
          });

          Promise.allSettled(deletePromises)
            .then((results) => {
              const successfulDeletes = results.filter(
                (result) =>
                  result.status === "fulfilled" &&
                  result.value.statusCode === 200,
              ).length;

              const failedDeletes = results.length - successfulDeletes;

              if (successfulDeletes === documentIdsToDelete.length) {
                Swal.fire(
                  "Deleted!",
                  isMultipleDelete
                    ? `${deleteCount} documents deleted successfully!`
                    : "Document deleted successfully!",
                  "success",
                );
              } else if (successfulDeletes > 0) {
                Swal.fire(
                  "Partial Success",
                  `${successfulDeletes} of ${deleteCount} documents deleted successfully. ${failedDeletes} failed.`,
                  "warning",
                );
              } else {
                Swal.fire(
                  "Error",
                  "Failed to delete documents. Please try again.",
                  "error",
                );
              }

              refreshData();
            })
            .catch((err) => {
              console.error("Error deleting document(s):", err);
              showToast(`Failed to delete: ${err.message}`, "error");
              Swal.close();
            })
            .finally(() => {
              const resetDeletingState = {};
              documentIdsToDelete.forEach((id) => {
                resetDeletingState[id] = false;
              });
              setIsDeleting((prev) => ({ ...prev, ...resetDeletingState }));
            });
        }
      });
    },
    [userId, refreshData, showToast],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        showToast("Please fix errors in form", "error");
        return;
      }

      if (!editDoc && !validateAdditionalCategories()) {
        showToast("Please select at least one category", "error");
        return;
      }

      setIsSaving(true);
      setIsModalOpen(false);

      try {
        let subcatId = formData.documentsubcatrecid;

        if (isNaN(formData.documentsubcatrecid)) {
          const subcatByName = subcats.find(
            (sc) => sc.docsubcatname === formData.documentsubcatrecid,
          );
          if (subcatByName) {
            subcatId = subcatByName.docsubcatrecid;
          } else {
            showToast("Invalid subcategory selected", "error");
            setIsSaving(false);
            return;
          }
        } else {
          if (typeof subcatId === "string" && subcatId !== "") {
            subcatId = parseInt(subcatId);
          }
        }

        if (!subcatId || isNaN(subcatId)) {
          showToast("Please select a valid subcategory", "error");
          setIsSaving(false);
          return;
        }

        if (editDoc) {
          // =================================================================
          // UPDATE PAYLOAD - MATCHING REQUESTED STRUCTURE
          // =================================================================
          const updateDocumentData = {
            userid: parseInt(userId) || 39,
            documentsrecid: editDoc.documentsrecid,
            doccatid: parseInt(formData.documentcatrecid),
            docsubcatid: subcatId,
            documentperiodicityrecid: parseInt(
              formData.documentperiodicityrecid,
            ),
            documentname: formData.documentname.trim(),
            documentdescription: formData.documentdescription.trim(),
            documentremarks: formData.documentremarks || "",
            
            // File Names - ensure empty strings if null, to match example
            sampleDocName: subcatId
              ? (formData.sampleDocName || originalFileNames.sample || "")
              : "",
            templateDocName: subcatId
              ? (formData.templateDocName || originalFileNames.template || "")
              : "",
            
            documentapplystatus: parseInt(formData.documentapplystatus),
            documentreferencelink: formData.documentreferencelink || "",
            documentreferencevideo: formData.documentreferencevideo || "",
            documentapplicability: formData.documentapplicability || "",
            
            // Included to ensure state is preserved/updated
            documentadminstate: String(editDoc.documentadminstate),
            
            documentmodifiedby: parseInt(userId) || 39,
          };

          try {
            // Only fetch/add base64 if new files are provided
            if (
              subcatId &&
              !formData.sampleDocBase64 &&
              editDoc.documentsampledoc
            ) {
              updateDocumentData.sampleDocBase64 = await getFileBase64(
                editDoc.documentsampledoc,
              );
            } else if (subcatId && formData.sampleDocBase64) {
              updateDocumentData.sampleDocBase64 = formData.sampleDocBase64;
            }

            if (
              subcatId &&
              !formData.templateDocBase64 &&
              editDoc.documenttemplatedoc
            ) {
              updateDocumentData.templateDocBase64 = await getFileBase64(
                editDoc.documenttemplatedoc,
              );
            } else if (subcatId && formData.templateDocBase64) {
              updateDocumentData.templateDocBase64 = formData.templateDocBase64;
            }
          } catch (error) {
            console.error("Error fetching file base64 data:", error);
            showToast(
              "Warning: Could not retrieve existing file data. Update may not include all files.",
              "warning",
            );
          }

          const response = await updateDocument(updateDocumentData);

          if (response.statusCode === 200) {
            setEditDoc(null);
            refreshData();
            Swal.fire(
              "Success",
              response.message || "Document updated successfully!",
              "success",
            );
          } else {
            throw new Error(response.message || "Operation failed");
          }
        } else {
          // Create logic remains mostly the same...
          const baseDocumentData = {
            userid: parseInt(userId) || 39,
            doccatid: parseInt(formData.documentcatrecid),
            docsubcatid: subcatId,
            documentperiodicityrecid: parseInt(
              formData.documentperiodicityrecid,
            ),
            documentname: formData.documentname.trim(),
            documentdescription: formData.documentdescription.trim(),
            documentremarks: formData.documentremarks || "",
            sampleDocName: subcatId
              ? formData.sampleDocName || originalFileNames.sample
              : null,
            templateDocName: subcatId
              ? formData.templateDocName || originalFileNames.template
              : null,
            documentcreatedby: parseInt(userId) || 39,
            documentmodifiedby: parseInt(userId) || 39,
            documentapplystatus: parseInt(formData.documentapplystatus),
            documentreferencelink: formData.documentreferencelink,
            documentreferencevideo: formData.documentreferencevideo,
            documentapplicability: formData.documentapplicability,
          };

          if (subcatId && formData.sampleDocBase64) {
            baseDocumentData.sampleDocBase64 = formData.sampleDocBase64;
          }
          if (subcatId && formData.templateDocBase64) {
            baseDocumentData.templateDocBase64 = formData.templateDocBase64;
          }

          const allCategories = [];

          allCategories.push({
            catId: parseInt(formData.documentcatrecid),
            subcatId: subcatId,
          });

          Object.keys(selectedAdditionalCategories).forEach((catId) => {
            if (
              selectedAdditionalCategories[catId] &&
              catId !== formData.documentcatrecid
            ) {
              allCategories.push({
                catId: parseInt(catId),
                subcatId: null,
              });
            }
          });

          const documentCreationPromises = allCategories.map(
            async (catInfo, index) => {
              const documentData = {
                ...baseDocumentData,
                doccatid: catInfo.catId,
                docsubcatid: catInfo.subcatId,
              };

              if (!catInfo.subcatId) {
                documentData.sampleDocBase64 = null;
                documentData.templateDocBase64 = null;
                documentData.sampleDocName = null;
                documentData.templateDocName = null;
              }

              try {
                const result = await createDocument(documentData);

                if (result.statusCode === 200) {
                  const documentId = extractDocumentId(result);
                  return {
                    success: true,
                    documentResult: result,
                    documentId,
                    catId: catInfo.catId,
                    subcatId: catInfo.subcatId,
                  };
                } else {
                  throw new Error(
                    result.message || "Failed to create document",
                  );
                }
              } catch (error) {
                console.error(
                  `Error creating document for category ${catInfo.catId}:`,
                  error,
                );
                return {
                  success: false,
                  error,
                  catId: catInfo.catId,
                  subcatId: catInfo.subcatId,
                };
              }
            },
          );

          const results = await Promise.allSettled(documentCreationPromises);

          const successfulDocuments = [];
          const failedDocuments = [];

          results.forEach((result) => {
            if (result.status === "fulfilled" && result.value.success) {
              successfulDocuments.push(result.value);
            } else {
              failedDocuments.push(result.value || { error: result.reason });
            }
          });

          await refreshData();
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const documentsWithSubcategories = successfulDocuments.filter(
            (doc) => doc.subcatId !== null,
          );

          if (documentsWithSubcategories.length > 1) {
            const linkPromises = [];

            for (let i = 1; i < documentsWithSubcategories.length; i++) {
              linkPromises.push(
                addLinkedDocument(
                  documentsWithSubcategories[i].documentId,
                  documentsWithSubcategories[0].subcatId,
                ),
              );
            }

            for (let i = 1; i < documentsWithSubcategories.length; i++) {
              linkPromises.push(
                addLinkedDocument(
                  documentsWithSubcategories[0].documentId,
                  documentsWithSubcategories[i].subcatId,
                ),
              );
            }

            await Promise.allSettled(linkPromises);
          }

          let summaryMessage = "";
          if (successfulDocuments.length > 0) {
            summaryMessage += `Successfully created ${successfulDocuments.length} document(s). `;
          }
          if (failedDocuments.length > 0) {
            summaryMessage += `Failed to create ${failedDocuments.length} document(s). `;
          }

          if (successfulDocuments.length > 0) {
            showToast(
              `Operation completed: ${successfulDocuments.length} documents created`,
              "success",
            );
          } else {
            showToast("Failed to create any documents", "error");
          }

          setEditDoc(null);
          refreshData();
          Swal.fire(
            "Operation Complete",
            summaryMessage || "Operation completed",
            successfulDocuments.length > 0 ? "success" : "error",
          );
        }
      } catch (err) {
        console.error("Error in handleSubmit:", err);
        showToast(`Failed to save: ${err.message}`, "error");
        Swal.close();
        setIsModalOpen(true);
      } finally {
        setIsSaving(false);
      }
    },
    [
      formData,
      editDoc,
      originalFileNames,
      subcats,
      userId,
      refreshData,
      showToast,
      validateForm,
      validateAdditionalCategories,
      selectedAdditionalCategories,
      createDocument,
      updateDocument,
      extractDocumentId,
      addLinkedDocument,
      getFileBase64,
    ],
  );

  const isFormValid = useCallback(() => {
    return (
      formData.documentname &&
      formData.documentdescription &&
      formData.documentcatrecid &&
      formData.documentsubcatrecid &&
      formData.documentperiodicityrecid &&
      formData.documentapplystatus !== undefined &&
      formData.documentapplystatus !== null &&
      Object.keys(fieldErrors).length === 0
    );
  }, [formData, fieldErrors]);

  // MEMOIZED VALUES
  const columns = useMemo(() => {
    const baseColumns = [
      {
        field: "doccatname",
        headerName: "Category",
        width: 150,
        sortable: true,
      },
      {
        field: "docsubcatname",
        headerName: "Subcategory",
        width: 150,
        sortable: true,
      },
      {
        field: "documentname",
        headerName: "Document Name",
        width: 200,
        sortable: true,
      },
      {
        field: "documentdescription",
        headerName: "Description",
        width: 250,
        sortable: true,
      },
      {
        field: "docperiodicityname",
        headerName: "Periodicity",
        width: 120,
        sortable: true,
      },
      {
        field: "documentactivestate",
        headerName: "Status",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          const value = params.value; // "Active" or "Inactive"
          const color = value === "Active" ? "green" : "red";

          return (
            <span style={{ fontWeight: 600, color }}>
              {value}
            </span>
          );
        },
      },
      {
        field: "documentapplystatus",
        headerName: "Applicability",
        width: 120,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const status = params.row.documentapplystatus;
          return status === 1 ? "Mandatory" : status === 0 ? "Selective" : "-";
        },
      },
      {
        field: "documentreferencelink",
        headerName: "Reference Link",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row || !params.row.documentreferencelink)
            return "-";
          return (
            <Tooltip title={params.row.documentreferencelink} arrow>
              <Button
                size="small"
                onClick={() =>
                  window.open(params.row.documentreferencelink, "_blank")
                }
                sx={{ textTransform: "none" }}
              >
                {params.row.documentreferencelink.length > 20
                  ? `${params.row.documentreferencelink.substring(0, 20)}...`
                  : params.row.documentreferencelink}
              </Button>
            </Tooltip>
          );
        },
      },
      {
        field: "documentvideoreference",
        headerName: "Reference Video Link",
        width: 200,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row || !params.row.documentreferencevideo)
            return "-";
          return (
            <Tooltip title={params.row.documentreferencevideo} arrow>
              <Button
                size="small"
                onClick={() =>
                  window.open(params.row.documentreferencevideo, "_blank")
                }
                sx={{ textTransform: "none" }}
              >
                {params.row.documentreferencevideo.length > 20
                  ? `${params.row.documentreferencevideo.substring(0, 20)}...`
                  : params.row.documentreferencevideo}
              </Button>
            </Tooltip>
          );
        },
      },
      {
        field: "documentapplicability",
        headerName: "Note for Applicability",
        width: 180,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row || !params.row.documentapplicability)
            return "-";
          return (
            <Tooltip title={params.row.documentapplicability} arrow>
              <span>
                {params.row.documentapplicability.length > 30
                  ? `${params.row.documentapplicability.substring(0, 30)}...`
                  : params.row.documentapplicability}
              </span>
            </Tooltip>
          );
        },
      },
      {
        field: "documentremarks",
        headerName: "Remarks",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const remarks = params.row.documentremarks;
          return remarks ? (
            <Tooltip title={remarks} arrow>
              <span>
                {remarks.length > 20
                  ? `${remarks.substring(0, 20)}...`
                  : remarks}
              </span>
            </Tooltip>
          ) : (
            "-"
          );
        },
      },
      {
        field: "linkeddoccat",
        headerName: "Linked Category",
        width: 150,
        sortable: true,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const linkedCategory = params.row.linkeddoccat;
          return linkedCategory ? (
            <Tooltip title={linkedCategory} arrow>
              <Chip label={linkedCategory} size="small" color="secondary" />
            </Tooltip>
          ) : (
            "-"
          );
        },
      },
      {
        field: "documentsampledocname",
        headerName: "Sample Document",
        width: 180,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const docName = params.row.documentsampledocname;
          const docPath = params.row.documentsampledoc;
          return docName ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={`Click to preview ${docName}`} arrow>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => previewDocument(docPath, docName)}
                >
                  {docName.length > 15
                    ? `${docName.substring(0, 15)}...`
                    : docName}
                </Button>
              </Tooltip>
            </Box>
          ) : (
            "-"
          );
        },
      },
      {
        field: "documenttemplatedocname",
        headerName: "Template Document",
        width: 180,
        sortable: false,
        renderCell: (params) => {
          if (!params || !params.row) return "-";
          const docName = params.row.documenttemplatedocname;
          const docPath = params.row.documenttemplatedoc;
          return docName ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Tooltip title={`Click to preview ${docName}`} arrow>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => previewDocument(docPath, docName)}
                >
                  {docName.length > 15
                    ? `${docName.substring(0, 15)}...`
                    : docName}
                </Button>
              </Tooltip>
            </Box>
          ) : (
            "-"
          );
        },
      },
    ];

    if (Number(roleid) !== 4) {
      baseColumns.push(
        {
          field: "documentcreatedby",
          headerName: "Created By",
          width: 120,
          sortable: true,
          renderCell: (params) => {
            if (!params || !params.row) return "Admin";
            return isNaN(params.row.documentcreatedby)
              ? params.row.documentcreatedby
              : "Admin";
          },
        },
        {
          field: "documentcreatedtime",
          headerName: "Created Time",
          width: 180,
          sortable: true,
          type: "date",
        },
        {
          field: "documentmodifiedby",
          headerName: "Modified By",
          width: 120,
          sortable: true,
          renderCell: (params) => {
            if (!params || !params.row) return "Admin";
            return isNaN(params.row.documentmodifiedby)
              ? params.row.documentmodifiedby
              : "Admin";
          },
        },
        {
          field: "documentmodifiedtime",
          headerName: "Modified Time",
          width: 180,
          sortable: true,
          type: "date",
        },
      );
    }

    if (hasWriteAccess) {
      baseColumns.push({
        field: "actions",
        headerName: "Actions",
        width: 180,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (!params || !params.row) return null;
          const isDisabled = params.row.documentadminstate === 0;
          const isCurrentlyEnabled = params.row.documentadminstate === 1;

          return (
            <Box>
              {/* UPDATED: Toggle Status Button Logic */}
              <ActionButton
                color={isCurrentlyEnabled ? "on" : "off"}
                onClick={() => handleToggleStatus(params.row)}
                disabled={
                  isSaving ||
                  isDeleting[params.row.documentsrecid] ||
                  isToggling === params.row.documentsrecid
                }
                title={isCurrentlyEnabled ? "Disable" : "Enable"}
              >
                {isToggling === params.row.documentsrecid ? (
                  <CircularProgress size={16} color="inherit" />
                ) : isCurrentlyEnabled ? (
                  <ToggleOnIcon fontSize="small" />
                ) : (
                  <ToggleOffIcon fontSize="small" />
                )}
              </ActionButton>

              <ActionButton
                color="edit"
                onClick={() => openEditModal(params.row)}
                disabled={
                  isSaving ||
                  isDeleting[params.row.documentsrecid] ||
                  isDisabled || 
                  isToggling === params.row.documentsrecid
                }
                title="Edit"
                className={isDisabled ? "disabled" : ""}
              >
                <EditIcon fontSize="small" />
              </ActionButton>
            </Box>
          );
        },
      });
    }

    if (Number(roleid) === 4) {
      baseColumns.push({
        field: "applicability",
        headerName: "Action",
        width: 250,
        sortable: false,
        filterable: false,
        renderCell: (params) => {
          if (!params || !params.row) return null;

          const isMandatory = params.row.documentapplystatus === 1;
          const isApplied = appliedDocuments.has(params.row.documentsrecid);

          return (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              {isApplied ? (
                <>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Marked (N/A)"
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                  <UnmarkButton
                    variant="contained"
                    size="small"
                    onClick={() => handleUnmarkDocument(params.row)}
                    disabled={isUnmarking[params.row.documentsrecid]}
                    startIcon={
                      isUnmarking[params.row.documentsrecid] ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <UndoIcon />
                      )
                    }
                  >
                    {isUnmarking[params.row.documentsrecid]
                      ? "Unmarking..."
                      : "Unmark"}
                  </UnmarkButton>
                </>
              ) : (
                <ApplyButton
                  variant="contained"
                  disabled={
                    isMandatory || isApplying[params.row.documentsrecid]
                  }
                  onClick={() => handleApplyForDocument(params.row)}
                  startIcon={
                    isApplying[params.row.documentsrecid] ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <HowToRegIcon />
                    )
                  }
                >
                  {isApplying[params.row.documentsrecid]
                    ? "Applying..."
                    : isMandatory
                      ? "Mandatory"
                      : "Mark (N/A)"}
                </ApplyButton>
              )}
            </Box>
          );
        },
      });
    }

    return baseColumns;
  }, [
    roleid,
    hasWriteAccess,
    isSaving,
    isDeleting,
    isToggling,
    isApplying,
    isUnmarking,
    appliedDocuments,
    previewDocument,
    openEditModal,
    handleDelete,
    handleApplyForDocument,
    handleUnmarkDocument,
    handleToggleStatus,
  ]);

  const exportConfig = useMemo(
    () => ({
      filename: "documents",
      sheetName: "Documents",
    }),
    [],
  );

  const onExportData = useMemo(
    () => (data) => {
      return data.map((doc, index) => ({
        "S.No": index + 1,
        Category: doc.doccatname || "",
        Subcategory: doc.docsubcatname || "",
        "Document Name": doc.documentname || "",
        Description: doc.documentdescription || "",
        Periodicity: doc.docperiodicityname || "",
        Status: doc.documentadminstate === 1 ? "Enabled" : "Disabled",
        Applicability:
          doc.documentapplystatus === 1
            ? "Mandatory"
            : doc.documentapplystatus === 0
              ? "Selective"
              : "",
        "Reference Link": doc.documentreferencelink || "",
        "Note for Applicability": doc.documentapplicability || "",
        Remarks: doc.documentremarks || "",
        "Sample Document": doc.documentsampledocname || "",
        "Template Document": doc.documenttemplatedocname || "",
        "Created By": isNaN(doc.documentcreatedby)
          ? doc.documentcreatedby
          : "Admin",
        "Created Time": formatDate(doc.documentcreatedtime),
        "Modified By": isNaN(doc.documentmodifiedby)
          ? doc.documentmodifiedby
          : "Admin",
        "Modified Time": formatDate(doc.documentmodifiedtime),
      }));
    },
    [],
  );

  // EFFECTS
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // RENDER (JSX)
  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4">{title}</Typography>
        {hasWriteAccess && (
          <Button
            variant="contained"
            onClick={openAddModal}
            disabled={isSaving}
          >
            + Add Document
          </Button>
        )}
      </Box>

      <ReusableDataGrid
        data={documents}
        columns={columns}
        title=""
        enableExport={true}
        enableColumnFilters={true}
        searchPlaceholder="Search documents..."
        searchFields={[
          "doccatname",
          "docsubcatname",
          "documentname",
          "documentdescription",
        ]}
        uniqueIdField="documentsrecid"
        onExportData={onExportData}
        exportConfig={exportConfig}
        loading={loading}
      />

      {/* Modal for Add/Edit */}
      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editDoc ? "Edit Document" : "Add Document"}
          <IconButton
            aria-label="close"
            onClick={() => setIsModalOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
            disabled={isSaving}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} direction="column">
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentcatrecid}
                >
                  <InputLabel>Primary Category *</InputLabel>
                  <Select
                    name="documentcatrecid"
                    value={formData.documentcatrecid}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    label="Primary Category *"
                  >
                    <MenuItem value="">Select Primary Category</MenuItem>
                    {cats.map((cat) => (
                      <MenuItem key={cat.doccatrecid} value={cat.doccatrecid}>
                        {cat.doccatname}
                      </MenuItem>
                    ))}
                  </Select>
                  {fieldErrors.documentcatrecid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentcatrecid}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: "block", color: "text.secondary" }}
                  >
                    This will be primary category for document
                  </Typography>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentsubcatrecid}
                >
                  <InputLabel>Primary Subcategory *</InputLabel>
                  <Select
                    name="documentsubcatrecid"
                    value={formData.documentsubcatrecid}
                    onChange={handleChange}
                    required
                    disabled={!formData.documentcatrecid || isSaving}
                    label="Primary Subcategory *"
                  >
                    <MenuItem value="">Select Primary Subcategory</MenuItem>
                    {getFilteredSubcategories().length > 0 ? (
                      getFilteredSubcategories().map((sc) => (
                        <MenuItem
                          key={sc.docsubcatrecid}
                          value={sc.docsubcatrecid}
                        >
                          {sc.docsubcatname}
                        </MenuItem>
                      ))
                    ) : formData.documentcatrecid ? (
                      <MenuItem value="" disabled>
                        No subcategories available for this category
                      </MenuItem>
                    ) : (
                      <MenuItem value="" disabled>
                        Please select a category first
                      </MenuItem>
                    )}
                  </Select>
                  {fieldErrors.documentsubcatrecid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentsubcatrecid}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{ mt: 1, display: "block", color: "text.secondary" }}
                  >
                    This will be primary subcategory for document
                  </Typography>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentperiodicityrecid}
                >
                  <InputLabel>Periodicity *</InputLabel>
                  <Select
                    name="documentperiodicityrecid"
                    value={formData.documentperiodicityrecid}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    label="Periodicity *"
                  >
                    <MenuItem value="">Select Periodicity</MenuItem>
                    <MenuItem value="1">One-time</MenuItem>
                    <MenuItem value="2">Monthly</MenuItem>
                    <MenuItem value="3">Quarterly</MenuItem>
                    <MenuItem value="4">Yearly</MenuItem>
                    <MenuItem value="6">Ad Hoc</MenuItem>
                  </Select>
                  {fieldErrors.documentperiodicityrecid && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentperiodicityrecid}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentname"
                  label="Document Name *"
                  type="text"
                  variant="outlined"
                  value={formData.documentname}
                  onChange={handleChange}
                  onBlur={(e) => validateField("documentname", e.target.value)}
                  required
                  disabled={isSaving}
                  error={!!fieldErrors.documentname}
                  helperText={fieldErrors.documentname}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  margin="dense"
                  error={!!fieldErrors.documentapplystatus}
                >
                  <InputLabel>Document Applicability Status *</InputLabel>
                  <Select
                    name="documentapplystatus"
                    value={formData.documentapplystatus}
                    onChange={handleChange}
                    required
                    disabled={isSaving}
                    label="Document Applicability Status *"
                  >
                    <MenuItem value="">Select Applicability Status</MenuItem>
                    <MenuItem value={1}>Mandatory</MenuItem>
                    <MenuItem value={0}>Selective Applicability</MenuItem>
                  </Select>
                  {fieldErrors.documentapplystatus && (
                    <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                      {fieldErrors.documentapplystatus}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              {formData.documentapplystatus === 0 && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    margin="dense"
                    name="documentapplicability"
                    label="Note for Applicability *"
                    multiline
                    rows={2}
                    variant="outlined"
                    value={formData.documentapplicability}
                    onChange={handleChange}
                    disabled={isSaving}
                    required={formData.documentapplystatus === 0}
                    helperText={
                      formData.documentapplystatus === 0
                        ? "Please provide details about the selective applicability"
                        : ""
                    }
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentdescription"
                  label="Description *"
                  multiline
                  rows={3}
                  variant="outlined"
                  value={formData.documentdescription}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("documentdescription", e.target.value)
                  }
                  required
                  disabled={isSaving}
                  error={!!fieldErrors.documentdescription}
                  helperText={fieldErrors.documentdescription}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentreferencevideo"
                  label="Reference Video Link"
                  type="url"
                  variant="outlined"
                  value={formData.documentreferencevideo}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("documentreferencevideo", e.target.value)
                  }
                  disabled={isSaving}
                  error={!!fieldErrors.documentreferencevideo}
                  helperText={
                    fieldErrors.documentreferencevideo ||
                    "Enter a valid URL (http:// or https://)"
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentreferencelink"
                  label="Reference Link"
                  type="url"
                  variant="outlined"
                  value={formData.documentreferencelink}
                  onChange={handleChange}
                  onBlur={(e) =>
                    validateField("documentreferencelink", e.target.value)
                  }
                  disabled={isSaving}
                  error={!!fieldErrors.documentreferencelink}
                  helperText={
                    fieldErrors.documentreferencelink ||
                    "Enter a valid URL (http:// or https://)"
                  }
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="dense"
                  name="documentremarks"
                  label="Remarks"
                  variant="outlined"
                  value={formData.documentremarks}
                  onChange={handleChange}
                  disabled={isSaving}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {editDoc ? "Replace Sample Document" : "Sample Document"}
                </Typography>
                <FileUploadButton
                  variant="outlined"
                  component="label"
                  disabled={isSaving || isUploading.sample}
                  fullWidth
                >
                  {isUploading.sample ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ mr: 1 }} />
                      Choose File
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleSampleDocChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </FileUploadButton>
                <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                  {formData.sampleDocName || "No file chosen"}
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {editDoc ? "Replace Template Document" : "Template Document"}
                </Typography>
                <FileUploadButton
                  variant="outlined"
                  component="label"
                  disabled={isSaving || isUploading.template}
                  fullWidth
                >
                  {isUploading.template ? (
                    <>
                      <CircularProgress size={20} sx={{ mr: 1 }} />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <CloudUploadIcon sx={{ mr: 1 }} />
                      Choose File
                    </>
                  )}
                  <input
                    type="file"
                    onChange={handleTemplateDocChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  />
                </FileUploadButton>
                <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                  {formData.templateDocName || "No file chosen"}
                </Typography>
              </Grid>

              {!editDoc && (
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Button
                      variant="outlined"
                      onClick={() =>
                        setShowAdditionalCategories(!showAdditionalCategories)
                      }
                      startIcon={<ExpandMoreIcon />}
                      sx={{ mb: 1 }}
                    >
                      Add to Multiple Categories
                    </Button>
                    {showAdditionalCategories && (
                      <Box
                        sx={{
                          mt: 2,
                          p: 2,
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ mb: 2 }}>
                          Select additional categories. A separate document will
                          be created for each selected category with null
                          subcategory:
                        </Typography>

                        <FormGroup>
                          {cats.map((cat) => {
                            const catId = String(cat.doccatrecid);
                            const isSelected =
                              selectedAdditionalCategories[catId] || false;
                            const isPrimaryCategory =
                              catId === String(formData.documentcatrecid);

                            return (
                              <FormControlLabel
                                key={cat.doccatrecid}
                                control={
                                  <Checkbox
                                    checked={isSelected || isPrimaryCategory}
                                    onChange={(e) =>
                                      handleCategoryCheckboxChange(
                                        catId,
                                        e.target.checked,
                                      )
                                    }
                                    disabled={isPrimaryCategory || isSaving}
                                  />
                                }
                                label={
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    {cat.doccatname}
                                    {isPrimaryCategory && (
                                      <Chip
                                        label="Primary"
                                        size="small"
                                        sx={{
                                          ml: 1,
                                          bgcolor: "primary.main",
                                          color: "white",
                                        }}
                                      />
                                    )}
                                  </Box>
                                }
                              />
                            );
                          })}
                        </FormGroup>

                        <Typography
                          variant="caption"
                          sx={{
                            mt: 2,
                            display: "block",
                            color: "text.secondary",
                          }}
                        >
                          Note: For additional categories, subcategory will be
                          set to null
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Grid>
              )}

              {editDoc && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Existing Documents
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Sample Document
                    </Typography>
                    {editDoc.documentsampledocname ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FileIcon fileName={editDoc.documentsampledocname} />
                        <Typography variant="body2">
                          {editDoc.documentsampledocname}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() =>
                            previewDocument(
                              editDoc.documentsampledoc,
                              editDoc.documentsampledocname,
                            )
                          }
                        >
                          Preview
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No sample document
                      </Typography>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Template Document
                    </Typography>
                    {editDoc.documenttemplatedocname ? (
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FileIcon fileName={editDoc.documenttemplatedocname} />
                        <Typography variant="body2">
                          {editDoc.documenttemplatedocname}
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() =>
                            previewDocument(
                              editDoc.documenttemplatedoc,
                              editDoc.documenttemplatedocname,
                            )
                          }
                        >
                          Preview
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No template document
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving || !isFormValid()}
              startIcon={isSaving ? <CircularProgress size={20} /> : null}
            >
              {isSaving ? "Saving..." : editDoc ? "Update" : "Save"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Preview Modal */}
      <Dialog
        open={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          {previewDoc?.name}
          <IconButton
            aria-label="close"
            onClick={() => setIsPreviewModalOpen(false)}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ minHeight: 500 }}>
          {previewLoading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: 300,
              }}
            >
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>
                Loading document preview...
              </Typography>
            </Box>
          ) : (
            <>
              {previewContent && previewContent.type === "image" && (
                <Box sx={{ textAlign: "center" }}>
                  <img
                    src={previewContent.url}
                    alt="Preview"
                    style={{ maxWidth: "100%", maxHeight: "500px" }}
                  />
                </Box>
              )}

              {previewContent && previewContent.type === "pdf" && (
                <iframe
                  src={`${previewContent.url}#view=FitH`}
                  style={{ width: "100%", height: "500px", border: "none" }}
                  title="PDF Preview"
                />
              )}

              {previewContent && previewContent.type === "text" && (
                <Box
                  sx={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: "14px",
                  }}
                >
                  {previewContent.content}
                </Box>
              )}

              {previewContent && previewContent.type === "file" && (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <FileIcon
                    fileName={previewDoc?.name}
                    sx={{ fontSize: 64, mb: 2 }}
                  />
                  <Typography>
                    Preview not available for this file type.
                  </Typography>
                  <Typography>
                    Click download button to view this file.
                  </Typography>
                </Box>
              )}

              {previewContent && previewContent.type === "error" && (
                <Box sx={{ textAlign: "center", py: 4, color: "error.main" }}>
                  <Typography>{previewContent.message}</Typography>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPreviewModalOpen(false)}>Close</Button>
          {previewDoc?.originalPath && (
            <Button
              variant="contained"
              onClick={() =>
                downloadDocument(previewDoc.originalPath, previewDoc.name)
              }
              disabled={isDownloading}
              startIcon={
                isDownloading ? (
                  <CircularProgress size={20} />
                ) : (
                  <Download size={16} />
                )
              }
            >
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Toast notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      {/* Loading overlay for operations */}
      <StyledBackdrop open={isSaving || isToggling !== null}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2 }}>
            {isToggling !== null
              ? "Updating status..."
              : editDoc
              ? "Updating document..."
              : "Creating documents..."}
          </Typography>
        </Box>
      </StyledBackdrop>
    </Box>
  );
});

DocumentsTable.displayName = "DocumentsTable";

export default DocumentsTable;