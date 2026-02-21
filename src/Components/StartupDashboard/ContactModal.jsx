import React, { useState, useEffect } from "react";
import styles from "./Modal.module.css";
import api from "../Datafetching/api";
import { Mail, User, X, Loader } from "lucide-react";

const ContactModal = ({ isOpen, onClose, userId, incuserid }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchContacts = async () => {
      if (!isOpen || !userId) return;
      setLoading(true);
      setError("");
      try {
        const response = await api.post(
          "resources/generic/getspocs",
          { userId, incUserId: incuserid },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (response.data.statusCode === 200) {
          setContacts(response.data.data || []);
        } else {
          setError(response.data.message || "Failed to fetch contacts");
        }
      } catch (err) {
        if (err.name === "CanceledError") return;
        setError(
          err.response?.data?.message || "Network error: " + err.message,
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchContacts();
    return () => controller.abort();
  }, [isOpen, userId, incuserid]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Contact SPOCs</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <Loader className={styles.spinner} size={32} />
              <p>Loading contacts...</p>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <p className={styles.error}>{error}</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No contacts available</p>
            </div>
          ) : (
            <div>
              {contacts.map((contact) => (
                <div key={contact.usersrecid} className={styles.card}>
                  <div className={styles.contactRow}>
                    <User size={18} className={styles.icon} />
                    <div>
                      <span className={styles.label}>Name</span>
                      <span className={styles.value}>{contact.usersname}</span>
                    </div>
                  </div>
                  <div className={styles.contactRow}>
                    <Mail size={18} className={styles.icon} />
                    <div>
                      <span className={styles.label}>Email</span>
                      <a
                        href={`mailto:${contact.usersemail}`}
                        className={styles.emailLink}
                      >
                        {contact.usersemail}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.actions}>
          <button type="button" onClick={onClose} className={styles.closeBtn}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
